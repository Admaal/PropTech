# ADR-004: Idempotencia y cuota atómica de uploads

## Contexto

Un upload combina una escritura en Supabase Storage con la creación de metadata y
un análisis pendiente en PostgreSQL. Un timeout después de Storage puede provocar
reintentos duplicados, y una comprobación de cuota seguida de un `INSERT`
separado permite que dos peticiones consuman el último cupo simultáneamente.

## Decisión

- El endpoint exige `Idempotency-Key`; el cliente reutiliza la misma clave cuando
  reintenta una petición.
- `documents` mantiene una clave única parcial por organización.
- La función `public.create_pending_document` valida la propiedad, toma un
  advisory lock por organización, aplica la cuota y crea metadata + análisis en
  una única transacción.
- La función no confía en el límite recibido del cliente: los usuarios normales
  quedan limitados a tres análisis diarios y solo un `platform_admin` puede
  omitir esa cuota según la tabla de autorización.
- Si una carrera devuelve un upload existente, el servidor elimina el objeto
  temporal que acaba de subir y devuelve el resultado original.
- El servidor valida tipo, cabecera PDF, tamaño y nombre antes de persistir.

## Alternativas consideradas

- **Contar en JavaScript y después insertar:** rechazada por carreras de cuota.
- **Redis o una cola gestionada:** descartada por complejidad operativa no
  necesaria para el MVP.
- **Reintentar `POST` sin clave:** rechazado porque no permite distinguir un
  reintento de una operación nueva.

## Consecuencias

- Las migraciones y el endpoint deben desplegarse coordinadamente.
- La unicidad se mantiene en PostgreSQL, no en memoria del proceso.
- Los tests de integración cubren doble envío, respuesta perdida simulada y dos
  claves compitiendo por el último cupo.
