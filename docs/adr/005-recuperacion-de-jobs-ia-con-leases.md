# ADR-005: Recuperación de jobs IA con claim y leases

## Contexto

El API responde rápido y dispara el análisis IA de forma asíncrona. Un proceso
puede caer después de aceptar el job, o dos entregas pueden intentar procesar el
mismo análisis. Una cola gestionada no forma parte del alcance de este portfolio.

## Decisión

- mcp-ai reclama el análisis mediante una actualización condicional atómica:
  `pending`, un `failed` reintentable o un `processing` cuyo lease expiró.
- El claim incrementa `attempt_count` y devuelve el documento y la organización
  autoritativos desde PostgreSQL; no se confía en la ruta enviada por el cliente.
- El worker renueva el lease durante la llamada a Gemini y permite como máximo
  tres intentos con backoff acotado.
- Un reconciliador periódico vuelve a intentar jobs pendientes, fallidos
  reintentables o abandonados.
- Solo se persiste una respuesta que pasa los schemas Zod existentes.

## Alternativas consideradas

- **Dejar el estado en `processing` sin recuperación:** rechazada porque una caída
  dejaría análisis bloqueados para siempre.
- **Permitir que cada entrega llame directamente a Gemini:** rechazada porque
  duplica llamadas y coste.
- **Introducir Pub/Sub, Redis o una cola externa:** descartada hasta que el volumen
  justifique la infraestructura.

## Consecuencias

- La tabla de análisis contiene estado operativo adicional y necesita una
  migración reversible.
- Un lease expirado representa una recuperación de un worker probablemente caído;
  el heartbeat reduce el riesgo de reclamar un proceso vivo.
- Los tests unitarios cubren claim exclusivo, backoff y marcado recuperable; el
  contrato de migración verifica también la función de renovación del lease.
