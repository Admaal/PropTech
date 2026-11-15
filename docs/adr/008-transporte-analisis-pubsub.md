# ADR-008: Transporte de análisis por Pub/Sub con DLQ

## Contexto

`apps/server` envía cada análisis a `services/mcp-ai` con un `POST /analyze` HTTP. mcp-ai
responde `202` antes de analizar, y `runAnalysis` captura los errores y marca el análisis
como `failed`. Con ese diseño, un fallo de transporte o de infraestructura no se reintenta
ni llega a una cola de mensajes fallidos: solo lo recupera el lease y el reconciliador
(ADR-005).

El servicio de suscripciones de la empresa ya publica en Pub/Sub con reintentos y DLQ, y
queremos el mismo patrón en PropTech, sin que el análisis dependa de que la petición HTTP
llegue.

## Decisión

- El server publica cada `AnalyzeJob` en el topic `analysis-jobs` con el `requestId` como
  atributo, **antes de responder `202`**. Si la publicación falla, el análisis queda
  `failed` con el mensaje de encolado.
- mcp-ai recibe el push en `/pubsub/analyze`, autenticado por OIDC: firma, audiencia, cuenta
  de la suscripción y email verificado. Sin autorización válida responde `401`. Si falta la
  configuración de audiencia o cuenta, rechaza todo.
- El push espera al resultado de `runAnalysis`:
  - `completed`, `failed` y `skipped` responden `2xx`. `skipped` cubre entregas duplicadas
    y leases vigentes, sin llamar a Gemini.
  - `transient` (Supabase no responde al reclamar o al marcar el fallo) responde `5xx`, y
    Pub/Sub reintenta.
- Los fallos de negocio (cuota, modelo no disponible, respuesta inválida) siguen la política
  de ADR-005 y responden `2xx`: no se reintentan por Pub/Sub.
- La suscripción tiene `max_delivery_attempts = 5`, backoff de 10 s a 600 s, y una DLQ
  `analysis-jobs-dlq`.
- Permisos mínimos: el server solo publica en el topic; la cuenta de push solo invoca
  mcp-ai; el agente de Pub/Sub firma tokens para la cuenta de push y gestiona la DLQ.
- En local se mantiene el transporte HTTP (`ANALYSIS_TRANSPORT=http`, por defecto).

## Alternativas consideradas

- **Mantener HTTP y añadir reintentos propios:** duplica la lógica de reintento que ya
  ofrece Pub/Sub, sin DLQ.
- **Cloud Tasks:** válido para colas con reintento, pero añade otro servicio para un único
  flujo; Pub/Sub ya lo usa la empresa.
- **BullMQ/Redis:** requiere un servicio gestionado nuevo y no encaja con Cloud Run sin
  coste fijo.
- **Publicar sin esperar al push:** el `202` no garantizaría que el job exista en la cola.

## Consecuencias

- El análisis ya no depende de que la petición HTTP llegue: si mcp-ai no responde, Pub/Sub
  reintenta hasta la DLQ.
- El push ocupa la petición de mcp-ai durante el análisis completo. El timeout de Cloud Run
  de mcp-ai sube a 600 s, y el `ack_deadline` de la suscripción también.
- Una entrega duplicada no duplica llamadas a Gemini: `skipped` lo evita.
- Fuera de alcance: exactly-once, orden de entrega, Pub/Sub en local, sustituir el
  reconciliador (ADR-005) y métricas o trazas.
- Riesgo conocido: un fallo de red hacia Gemini cuenta como fallo de negocio y no se
  reintenta por Pub/Sub; queda cubierto por la política de ADR-005.

## Verificación

Comprobado en producción el 2026-11-15:

- **Camino feliz:** una subida con `X-Request-ID` propio devolvió `202`, el análisis terminó en
  `completed`, y los logs de mcp-ai muestran el `POST 204` del push con ese mismo `requestId`.
- **DLQ:** apuntando temporalmente la suscripción a una ruta inexistente, un mensaje llegó a
  `analysis-jobs-dlq` tras 5 entregas en 108 s, conservando su `requestId`. Eso prueba también los
  permisos del agente de Pub/Sub sobre la DLQ. La suscripción se restauró idéntica y
  `terraform plan` no mostró cambios.
- **Alerta:** la política abrió un incidente y el aviso por email llegó al destinatario. La prueba destapó que no se cerraba sola, y un
  segundo mensaje no habría avisado; se corrigió con `evaluation_missing_data` y `auto_close`.
- **No probado:** una caída real de Supabase. Que `transient` responde `5xx` lo cubre un test
  unitario, pero el fallo real no se ha provocado.
