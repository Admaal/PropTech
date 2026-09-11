# ADR-006: Operaciones destructivas reservadas a admins

## Contexto

La lectura y creación forman parte del flujo normal de una organización, pero
borrar una propiedad puede afectar metadata, análisis y objetos Storage. Las
políticas anteriores permitían que cualquier miembro de la organización ejecutara
operaciones destructivas.

## Decisión

- `member` conserva lectura y las inserciones necesarias para el flujo de
  documentos.
- `admin` de la organización y `platform_admin` pueden actualizar o eliminar
  datos destructivos mediante `private.user_is_org_admin`.
- La eliminación desde el panel admin pasa por el API, que limpia PDFs antes de
  eliminar metadata y propiedad.
- Storage mantiene rutas por UUID y valida que la propiedad pertenezca a la
  organización antes de aceptar un objeto.

## Alternativas consideradas

- **Confiar solo en controles de la interfaz:** rechazada porque cualquier cliente
  puede llamar directamente a Supabase.
- **Permitir delete a todos los miembros del tenant:** rechazada por el impacto
  irreversible sobre documentos y análisis.
- **Usar `service_role` para todas las eliminaciones:** rechazada porque ampliaría
  el alcance de una credencial privilegiada.

## Consecuencias

- Las políticas RLS y Storage son parte del contrato de autorización y requieren
  tests negativos con una identidad `member`.
- El rollback de las migraciones está documentado y exige copia de seguridad y
  ventana de mantenimiento.
- La limpieza de Storage y PostgreSQL debe mantenerse coordinada en el servicio
  admin.
