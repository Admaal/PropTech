---
id: "pubsub-analysis"
status: implemented
confirmed: true
---

# Spec: transporte de análisis por Pub/Sub con DLQ

> `confirmed` permanece en `false` hasta que el usuario apruebe esta spec concreta
> en el chat. Solo se cambia a `true` en un turno posterior a ese «sí».

## Contexto y problema

Hoy `apps/server` envía cada análisis a `services/mcp-ai` con un `POST /analyze` HTTP
(`clients/mcp.client.ts`). mcp-ai responde `202` antes de analizar y `runAnalysis` captura
todos los errores y marca el análisis como `failed`. Por eso no hay reintento de transporte
ni cola de mensajes fallidos: si mcp-ai no procesa un job, solo lo recupera el lease y el
reconciliador (ADR 005). Queremos el mismo patrón que en el servicio de suscripciones:
publicar en Pub/Sub con reintentos y dead-letter, sin que el análisis dependa de que la
petición HTTP llegue.

## Resultado deseado

Un upload aceptado deja el análisis en cola en Pub/Sub. mcp-ai lo procesa al recibir el
push autenticado. Los fallos de infraestructura se reintentan y, si persisten, acaban en una
DLQ visible. Los fallos de negocio se reintentan con la política actual de ADR 005.

## Historia de usuario

Como **responsable de la plataforma**, quiero **que un análisis aceptado no se pierda aunque
mcp-ai esté caído un momento**, para **poder revisar en la DLQ los trabajos que no se pudieron
completar**.

## Alcance

- Incluido: publicación en topic desde `apps/server`.
- Incluido: endpoint push autenticado por OIDC en `services/mcp-ai`.
- Incluido: idempotencia por `analysisId` frente a entregas duplicadas.
- Incluido: topic de DLQ y suscripción push en Terraform, con test de contrato.
- Incluido: `ANALYSIS_TRANSPORT=http|pubsub`, con `http` como valor por defecto en local.

## Criterios de aceptación (EARS)

- [x] **AC-01:** WHEN el server acepta un upload THE system SHALL publicar el `AnalyzeJob`
  en el topic `analysis-jobs` con el atributo `requestId` antes de responder `202`.
- [x] **AC-02:** IF la publicación falla THEN THE system SHALL marcar el análisis como
  `failed` con el mensaje de encolado, como hoy en `markEnqueueFailed`.
- [x] **AC-03:** WHEN mcp-ai recibe un push en `/pubsub/analyze` THE system SHALL verificar
  el token OIDC (audiencia y cuenta de servicio de la suscripción) y responder `401` sin
  procesar si no es válido.
- [x] **AC-04:** WHEN el push es válido THE system SHALL procesar el análisis dentro de la
  petición y responder `2xx` solo cuando el análisis termine en `completed` o `failed`.
- [x] **AC-05:** IF el análisis ya está `completed` o tiene un lease vigente de otro worker
  THEN THE system SHALL responder `2xx` sin llamar a Gemini.
- [x] **AC-06:** IF el fallo es de infraestructura (Supabase o red no disponibles) THEN THE
  system SHALL responder `5xx` para que Pub/Sub reintente.
- [x] **AC-07:** IF el fallo es de negocio (cuota 429, modelo no disponible, respuesta
  inválida) THEN THE system SHALL aplicar la política de ADR 005 y responder `2xx`, sin
  reintento de Pub/Sub.
- [x] **AC-08:** IF el payload no cumple `AnalyzeJobSchema` THEN THE system SHALL responder
  `2xx`, registrar el error sin datos del documento y no reintentar.
- [x] **AC-09:** WHERE `ANALYSIS_TRANSPORT=http` THE system SHALL mantener el envío HTTP
  actual sin cambios de comportamiento.
- [x] **AC-10:** THE infrastructure SHALL crear el topic `analysis-jobs`, el topic
  `analysis-jobs-dlq`, la suscripción push con OIDC y `max_delivery_attempts` configurado, y
  SHALL conceder `roles/pubsub.publisher` solo a la cuenta del server.

## Evidencia de verificación

Verificado el 2026-11-15.

| Criterio | Cómo se comprobó |
|----------|------------------|
| AC-01, AC-02 | Tests de `pubsub.client` y `mcp.client`. En producción: una subida con `X-Request-ID` propio devolvió `202` y el análisis terminó en `completed`. |
| AC-03 | Tests de `makePushAuthorizer`. En local, el push sin autorización y con un token falso responde `401`. |
| AC-04, AC-05 | Tests del handler y de `runAnalysis`. En producción, los logs de mcp-ai muestran el `POST 204` del push tras completar el análisis. |
| AC-06 | Test unitario (`transient` responde `5xx`). **No se ha provocado una caída real de Supabase.** La mecánica de reintento y DLQ se verificó inyectando un fallo de entrega: con el endpoint de la suscripción apuntando a una ruta inexistente, un mensaje llegó a la DLQ tras 5 entregas en 108 s. |
| AC-07, AC-08 | Tests del handler y de `runAnalysis`. |
| AC-09 | Test de configuración: `http` por defecto. |
| AC-10 | Test de contrato de Terraform y recursos comprobados en GCP. Los permisos de la DLQ quedaron probados por la propia prueba de fallo. La cuenta del server ya no figura entre los invokers de mcp-ai. |

Hallazgo de la prueba: la alerta de DLQ abría un incidente que no se cerraba solo, así que un
segundo mensaje no avisaría. Se corrigió con `evaluation_missing_data` y `auto_close`.

## Casos límite y errores

- Entrega duplicada (at-least-once) → AC-05: no hay doble llamada a Gemini.
- Push que supera el deadline de la suscripción → Pub/Sub reentrega; AC-05 cubre el duplicado
  y el lease evita dos workers sobre el mismo análisis.
- Server cae entre la inserción y la publicación → el reconciliador vuelve a encolar jobs
  `pending` sin lease, como red de seguridad.
- Análisis lento (Gemini con backoff) → el timeout de Cloud Run y de la suscripción deben
  cubrir el peor caso de ADR 005; se mide antes de fijar valores.

## Fuera de alcance

- Garantía de exactly-once o de orden de entrega.
- Reemplazar el reconciliador o el lease de ADR 005.
- Pub/Sub en local (se usa el transporte HTTP).
- Métricas y trazas (van en otra fase).
- Cambios de esquema de base de datos.

## Decisiones

1. **Reintentos.** Pub/Sub con DLQ reintenta solo fallos de infraestructura (AC-06). Los
   fallos de negocio siguen la política de ADR 005 y no se reintentan por Pub/Sub (AC-07).
   El reconciliador queda como red de seguridad para jobs `pending` sin mensaje.
2. **Transporte en producción.** Solo Pub/Sub. HTTP queda para desarrollo (AC-09).
3. **Timeouts (provisional).** Cloud Run `timeout` de 600 s y `ack_deadline` de la
   suscripción de 600 s, el máximo de Pub/Sub para push. Motivo: las muestras de producción
   de demo-a (3 análisis) van de 1,9 s a 63 s; el backoff de Gemini puede alargar el peor
   caso más allá de 300 s, que es el valor por defecto de Cloud Run al no fijar ninguno.
   Se revisa con la duración real de los análisis tras el primer despliegue.
   `max_delivery_attempts` = 5, backoff mínimo 10 s y máximo 600 s.

## Riesgos nuevos de esta fase

- **¿Toca datos personales de alguien que no sea el propio usuario?** No. El mensaje solo
  lleva IDs y la ruta de Storage; el PDF sigue en Storage. Test de aislamiento: no aplica.
- **¿Escribe algo que pueda repetirse por reintento, reconexión o doble tap?** Sí.
  Entregas duplicadas. Test de idempotencia: AC-05 con dos entregas del mismo `analysisId`.
  Gate: `CI`.
- **¿Introduce un rol o permiso nuevo?** Sí. `roles/pubsub.publisher` para el server y
  OIDC para la suscripción. Prueba de lo que no puede hacer: la cuenta del server no puede
  invocar `/analyze` directamente. Gate: `CI` (test de contrato de Terraform).
- **¿Toca dinero, cupos o un recurso limitado?** No. La cuota se cuenta al crear el upload,
  antes de publicar; un reintento no vuelve a contar.
- **¿Acepta contenido que verá otra persona?** No hay contenido nuevo: el `requestId` ya se
  valida (PR 4).
- **¿Cambia el esquema usado por usuarios reales?** No.
- **¿Añade un secreto o credencial?** No. La autenticación es OIDC, sin claves.
- **¿Añade tests, un gate o trabajo a un gate existente?** Sí: un test de contrato de
  Terraform y tests de idempotencia. Hay que medir el impacto en el tiempo de `CI`.
