---
id: "cloud-build-trigger"
status: draft
confirmed: true
---

# Spec: Activador de Cloud Build para Cloud Run

> `confirmed` permanece en `false` hasta que el usuario apruebe esta spec concreta
> en el chat. Solo se cambia a `true` en un turno posterior a ese «sí».

## Contexto y problema

La repository de PropTech ya está vinculada a Cloud Build, pero el backend todavía
se actualiza manualmente: hay que construir y publicar las imágenes de `server` y
`mcp-ai` y después actualizar Cloud Run. GitHub Actions ya valida el código, por
lo que el nuevo flujo no debe duplicar todos los tests ni ejecutar builds caros en
cada pull request.

## Resultado deseado

Cada push aceptado en `main` debe construir las dos imágenes backend, publicarlas
con una etiqueta identificable por commit y actualizar únicamente los servicios
existentes `proptech-server` y `proptech-mcp-ai` en Cloud Run. Los reintentos deben
ser seguros, no deben guardar credenciales en el repositorio y el flujo debe
mantenerse limitado para controlar el coste.

## Historia de usuario

Como **mantenedor del proyecto**, quiero **desplegar automáticamente el backend
después de integrar cambios en `main`**, para **no tener que publicar imágenes y
actualizar Cloud Run manualmente**.

## Alcance

- **ADDED:** configuración versionada de Cloud Build para construir `server` y
  `mcp-ai` desde sus Dockerfiles, publicar imágenes etiquetadas con el commit y
  actualizar Cloud Run.
- **ADDED:** un trigger de Cloud Build asociado al repositorio conectado, limitado
  a pushes sobre `main`, con las sustituciones de proyecto, región y repositorio de
  Artifact Registry necesarias.
- **ADDED:** permisos mínimos para la identidad que ejecuta el trigger: publicar
  en el repositorio de imágenes y actualizar los dos servicios de Cloud Run.
- **MODIFIED:** documentación de despliegue para distinguir el flujo automático de
  cambios de aplicación del flujo manual de Terraform.
- El despliegue actualizará las imágenes de servicios ya existentes y conservará
  su configuración administrada por Terraform, incluidos secretos y variables.

## Criterios de aceptación (EARS)

Cada criterio expresa una sola afirmación comprobable y se identifica para poder
trazarlo al plan y a los tests.

- [ ] **AC-01:** WHEN se completa un push en `main` THE system SHALL iniciar
  exactamente un build mediante el trigger de Cloud Build.
- [ ] **AC-02:** WHEN el build se inicia THE system SHALL construir las imágenes de
  `server` y `mcp-ai` usando los Dockerfiles versionados del repositorio.
- [ ] **AC-03:** WHEN ambas imágenes se construyen correctamente THE system SHALL
  publicarlas en Artifact Registry con una etiqueta derivada del commit.
- [ ] **AC-04:** IF falla la construcción o publicación de cualquiera de las
  imágenes THEN THE system SHALL marcar el build como fallido y no actualizar
  ningún servicio de Cloud Run.
- [ ] **AC-05:** WHEN las imágenes se publican correctamente THE system SHALL
  actualizar `proptech-server` y `proptech-mcp-ai` en la región configurada,
  apuntándolos a las imágenes del commit.
- [ ] **AC-06:** IF el evento procede de una pull request o de una rama distinta de
  `main` THEN THE system SHALL not iniciar este trigger de despliegue.
- [ ] **AC-07:** WHEN se reintenta el mismo commit THE system SHALL conservar un
  único repositorio y una única etiqueta de imagen para ese commit, y los dos
  servicios SHALL terminar apuntando a esa misma versión.
- [ ] **AC-08:** THE system SHALL ejecutar el trigger con una identidad que pueda
  publicar únicamente en el repositorio de Artifact Registry previsto y actualizar
  únicamente los dos servicios de Cloud Run previstos.
- [ ] **AC-09:** THE system SHALL not almacenar claves, tokens ni valores de secretos
  en el repositorio, en la configuración del trigger ni en los logs del build.
- [ ] **AC-10:** IF cambia Terraform, la topología de servicios o la configuración
  de secretos THEN THE system SHALL require un `terraform plan/apply` manual y no
  aplicar esos cambios implícitamente desde este trigger.
- [ ] **AC-11:** THE system SHALL registrar la duración y el resultado de cada build,
  y SHALL limitar la ejecución automática a `main` para evitar builds de cada PR.

## Casos límite y errores

- Repositorio o conexión de Cloud Build no disponible → el trigger queda fallido y
  no se despliega nada.
- Proyecto, región o repositorio de Artifact Registry inválido → el build falla
  antes de actualizar Cloud Run.
- Fallo al construir una de las imágenes → no se publica ninguna imagen ni se
  actualiza ningún servicio.
- Fallo al publicar una imagen → Cloud Run conserva la revisión anterior y el
  build termina con error.
- Servicio de Cloud Run inexistente o permisos insuficientes → el build termina
  con error sin crear servicios nuevos ni leer secretos.
- Reintento del mismo commit → se reutilizan la etiqueta y la versión esperadas;
  no se crean servicios ni repositorios duplicados.
- Cambio que solo afecta a Terraform o a secretos → requiere el procedimiento
  manual documentado y no se despliega automáticamente por este trigger.

## Fuera de alcance

- Ejecutar el trigger en pull requests o en ramas que no sean `main`.
- Sustituir los tests de GitHub Actions o convertir Cloud Build en un segundo CI
  completo.
- Aplicar Terraform automáticamente, crear un backend remoto de estado o ejecutar
  migraciones de base de datos.
- Desplegar el frontend de Vercel.
- Crear secretos, copiar valores de `.env` o cambiar permisos de usuarios finales.
- Migrar a GKE o modificar recursos, cuotas y políticas de escalado de Cloud Run.

## Riesgos nuevos de esta fase

Completa todas las preguntas. Un «no» también se deja escrito. Por cada «sí», propone
el test, el gate (`afterFileEdit`, `stop` o `CI`) y espera confirmación del usuario antes
de implementar esa mitigación junto con la feature.

Las mitigaciones afirmativas de esta fase fueron confirmadas antes de aplicar la
infraestructura y quedan evidenciadas en las comprobaciones descritas abajo.

- **¿Toca datos personales de alguien que no sea el propio usuario?** No. El trigger
  construye artefactos y actualiza servicios; no consulta datos de Supabase.
  Test de aislamiento: no aplica. Gate: no aplica.
- **¿Escribe algo que pueda repetirse por reintento, reconexión o doble tap?** Sí.
  Test de idempotencia: ejecutar dos veces el mismo commit en un entorno controlado
  y verificar que no aparecen repositorios/servicios duplicados y que ambos servicios
  apuntan a la misma imagen. Gate: `CI` o `stop`.
- **¿Introduce un rol o permiso nuevo?** Sí. Se conceden permisos a la identidad de
  Cloud Build. Test negativo: verificar que esa identidad no puede leer valores de
  Secret Manager, desplegar otros servicios ni actuar en otro proyecto. Gate: `CI`.
- **¿Toca dinero, cupos o algo limitado?** Sí. Añade minutos de Cloud Build,
  almacenamiento de imágenes y despliegues de Cloud Run. Test: comprobar que una PR
  o una rama distinta de `main` no dispara el trigger y que un push a `main` dispara
  solo un build; configurar presupuesto y alertas de GCP. Gate: `CI` y revisión de
  facturación.
- **¿Acepta contenido que vaya a ver otra persona?** No. No se incorpora contenido
  generado por usuarios. Saneado/moderación y test: no aplica. Gate: no aplica.
- **¿Cambia el esquema de datos de algo que ya tiene usuarios reales?** No. No hay
  migraciones ni cambios de esquema. Migración reversible y test: no aplica. Gate:
  no aplica.
- **¿Añade un secreto o credencial nueva?** No. Usa la conexión y la identidad de
  Cloud Build gestionadas por GCP; no se añade ninguna credencial al repositorio.
  Comprobación: no aplica como secreto nuevo, pero AC-09 exige revisar repositorio y
  logs. Gate: `CI`.
- **¿Añade tests, un gate nuevo o más trabajo a uno existente?** Sí. Añade un flujo
  de build/deploy y medición de duración. Medición: registrar 3 ejecuciones frías y
  3 calientes, comparar p95 con el presupuesto y revisar el coste mensual antes de
  ampliar el trigger. Gate: `CI`.

## Trazabilidad

- Plan: `activador_cloud_build_733562e0.plan.md` (plan de Cursor aprobado).
- Tests por criterio: `infra/cloudbuild-config.test.mjs` y
  `infra/terraform/cloudbuild-trigger.test.mjs`; validaciones Terraform con
  `terraform validate` y `terraform plan`.
- Evidencia adicional: trigger `proptech-deploy-main`, cuenta dedicada IAM,
  presupuesto de GCP y revisión negativa de permisos aplicados; la ejecución
  end-to-end y el reintento del mismo commit quedan pendientes de publicar estos
  cambios en `main`.
