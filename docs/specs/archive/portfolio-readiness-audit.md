---
id: "portfolio-readiness-audit"
status: approved
confirmed: true
---

# Spec: Auditoría y preparación para publicación del portfolio

## Contexto y problema

El repositorio contiene una plataforma PropTech funcional, pero antes de publicarlo
debe demostrarse que no expone secretos, que sus límites de autorización y cuota se
aplican en servidor, que sus dependencias y gates CI son confiables y que un clon
limpio puede instalarse, probarse y construirse.

La auditoría cubrirá el repositorio local y su superficie pública. No incluye acceso
directo ni cambios en Render, Supabase, Vercel o GCP.

## Resultado deseado

El repositorio queda preparado para publicación pública con:

- ningún secreto real versionado o incluido accidentalmente en artefactos públicos;
- dependencias sin vulnerabilidades de severidad alta conocidas;
- aislamiento correcto entre organizaciones y roles;
- uploads, cuotas y trabajos IA protegidos frente a reintentos y carreras;
- separación efectiva de `service_role`;
- CI con gates explícitos y no silenciosamente omitibles;
- documentación, Docker y configuración reproducibles desde un clon limpio;
- evidencia verificable de los controles críticos.

## Historia de usuario

Como propietario de un portfolio técnico, quiero publicar el repositorio con
seguridad y calidad demostrables para que un reclutador pueda ejecutarlo y revisar
su arquitectura sin encontrar secretos, documentación rota o controles ficticios.

## Alcance

- **ADDED:** auditoría de secretos, dependencias, autorización, RLS, Storage,
  uploads, jobs IA, contratos runtime, Docker, CI y documentación pública.
- **MODIFIED:** aislamiento de secretos entre `apps/server` y `services/mcp-ai`.
- **MODIFIED:** idempotencia de uploads, reservas de cuota y procesamiento IA.
- **MODIFIED:** políticas y tests negativos de permisos cuando sea necesario.
- **MODIFIED:** validación runtime de entradas, respuestas externas y configuración.
- **MODIFIED:** CI para que los gates críticos sean explícitos y verificables.
- **MODIFIED:** documentación pública, instrucciones de clon limpio y referencias
  rotas.
- **ADDED:** evidencia de auditoría y checklist de publicación.
- **PRESERVED:** arquitectura funcional PropTech, GCP/Cloud Build, Supabase,
  Vercel y el monorepo salvo correcciones necesarias para cumplir los criterios.

## Criterios de aceptación

- [ ] **AC-01:** THE system SHALL not include high-confidence secrets in tracked
  files, examples, build contexts, Docker images or published history checks.
- [ ] **AC-02:** IF local credentials are present THEN THE system SHALL block the
  publication checklist until they are rotated or confirmed invalid.
- [ ] **AC-03:** THE system SHALL pass `pnpm audit --audit-level high`.
- [ ] **AC-04:** THE system SHALL not expose `SUPABASE_SERVICE_ROLE_KEY` or
  `GEMINI_API_KEY` to the API, browser, public Docker environment or frontend build.
- [ ] **AC-05:** WHEN an upload request is retried or submitted twice THE system
  SHALL not create duplicate documents, analyses or quota consumption.
- [ ] **AC-06:** THE system SHALL enforce analysis quotas atomically on the server
  and SHALL test concurrent requests at the quota boundary.
- [ ] **AC-07:** WHILE an AI job is pending or processing THE system SHALL prevent
  duplicate Gemini execution and SHALL resolve failed or abandoned jobs explicitly.
- [ ] **AC-08:** THE system SHALL validate external HTTP responses, database results
  and runtime configuration before using them.
- [ ] **AC-09:** WHEN two different identities access tenant resources THE system
  SHALL prevent cross-organization reads, writes, deletes and Storage access.
- [ ] **AC-10:** WHEN a non-admin organization member attempts a restricted
  destructive operation THE system SHALL reject it.
- [ ] **AC-11:** THE system SHALL keep platform-admin operations separated from
  ordinary tenant permissions and SHALL test forbidden actions.
- [ ] **AC-12:** THE system SHALL not persist or return raw provider/database errors
  that expose sensitive implementation details.
- [ ] **AC-13:** THE system SHALL make critical security and isolation tests
  explicit in CI rather than silently passing when credentials are absent.
- [ ] **AC-14:** WHEN a clean clone follows the documented setup THE system SHALL
  install, typecheck, lint, test and build without ignored local files.
- [ ] **AC-15:** THE system SHALL contain no broken public documentation links or
  references to removed portfolio artifacts.
- [ ] **AC-16:** THE system SHALL document that demo documents and property data are
  synthetic and SHALL describe the privacy boundary for documents sent to Gemini.
- [ ] **AC-17:** THE system SHALL preserve the intended deployment architecture and
  SHALL not introduce an unrequested platform migration.
- [ ] **AC-18:** THE system SHALL provide final evidence for each critical security,
  quality and reproducibility criterion before publication.

## Casos límite y errores

- Un secreto presente únicamente en `.env` local no debe entrar en Git, Docker ni
  logs, pero su posible validez exige rotación manual antes de publicar.
- Un reintento después de perder la respuesta HTTP no debe duplicar el upload.
- Dos requests concurrentes en el último cupo no deben superar el límite.
- Un job IA reintentado no debe facturar dos llamadas Gemini para el mismo análisis.
- Un miembro no debe borrar datos de su organización si la política final restringe
  esa operación a administradores.
- Un fallo de Supabase, Gemini o Storage debe producir un error público sanitizado.
- CI sin credenciales de aislamiento no debe presentarse como evidencia completa.
- Un clon sin `scripts/`, `public/` u otros archivos ignorados debe seguir siendo
  reproducible o la documentación debe declarar la dependencia explícita.

## Fuera de alcance

- Auditar o modificar directamente servicios desplegados en Render, Supabase,
  Vercel o GCP.
- Rotar credenciales mediante APIs externas desde este cambio.
- Migrar de Cloud Run, Vercel o Supabase.
- Añadir funcionalidades de producto no relacionadas con seguridad o calidad.
- Rediseñar la interfaz.
- Añadir observabilidad empresarial, WAF o una cola gestionada si una solución
  mínima verificable cubre el criterio.
- Reescribir todo el historial Git salvo que aparezca un secreto realmente
  versionado que lo requiera.

## Riesgos nuevos de esta fase

- **¿Toca datos personales de alguien que no sea el propio usuario?** Sí. Los PDF,
  análisis y datos inmobiliarios pueden representar información de terceros.
  Test: aislamiento RLS y Storage con dos identidades, además de prueba de
  minimización/privacidad. Gate: `stop` y `CI`.
- **¿Escribe algo que pueda repetirse por reintento, reconexión o doble tap?** Sí.
  Test: idempotencia de upload, cuota y job IA bajo concurrencia. Gate: `stop` y
  `CI`.
- **¿Introduce o modifica un rol o permiso?** Sí, si se restringen operaciones de
  `member` o platform admin. Test: permisos permitidos y prohibidos por rol. Gate:
  `CI`.
- **¿Toca dinero, cupos o algo limitado?** Sí. La cuota IA y las llamadas Gemini
  consumen un recurso limitado. Test: límite y carrera en servidor. Gate: `CI`.
- **¿Acepta contenido que verá otra persona?** Sí. Se aceptan PDFs, nombres y
  resultados visibles para usuarios. Test: validación, saneado y política de
  documentos sintéticos; no enviar secretos ni datos reales. Gate: `stop` y `CI`.
- **¿Cambia el esquema de datos usado por usuarios reales?** Posiblemente sí, si se
  añade idempotencia, leases o estados de job. Test: migración reversible y
  upgrade/downgrade. Gate: `CI`.
- **¿Añade un secreto o credencial nueva?** No. La rotación de credenciales
  existentes se realizará fuera del repositorio y no se añadirán valores nuevos.
- **¿Añade tests, gates o más trabajo a uno existente?** Sí. Hay que medir el
  impacto de los tests de aislamiento, concurrencia, contratos y escaneo de
  secretos. Gate: `CI`, reajustando timeouts si procede.

Las mitigaciones afirmativas requieren confirmación explícita antes de Build.

## Trazabilidad

- Plan: pendiente de crear.
- Tests: se definirán por cada `AC-*` en el plan.
- Evidencia: auditoría de Git, dependencias, CI, clon limpio, tests de seguridad,
  tests de concurrencia y checklist final de publicación.
