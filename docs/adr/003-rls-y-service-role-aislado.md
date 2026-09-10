# ADR-003: RLS como frontera de tenancy y service role aislado

## Contexto

La aplicación es multi-tenant: cada organización debe acceder únicamente a sus
propiedades, documentos y análisis. El procesamiento IA necesita actualizar el
estado de un análisis después de ejecutarse, pero ese worker no recibe la sesión
interactiva del usuario.

Supabase `service_role` puede omitir RLS. Exponerlo al navegador o al API
transaccional convertiría un error de autorización en acceso entre tenants.

## Decisión

- `apps/server` accede a Supabase con el JWT del usuario y la clave pública
  correspondiente; las operaciones de usuario quedan sujetas a RLS.
- Las políticas de Supabase son la frontera principal de aislamiento, no filtros
  opcionales aplicados únicamente en JavaScript.
- `services/mcp-ai` es el único componente que usa
  `SUPABASE_SERVICE_ROLE_KEY`, exclusivamente en servidor, para completar o
  fallar análisis ya validados.
- El endpoint interno de análisis exige la autenticación servicio-a-servicio
  configurada (`X-Internal-Key` y, cuando aplica, identidad de Cloud Run).
- Los tests de aislamiento verifican tanto el acceso permitido del tenant como
  los accesos cruzados y las mutaciones de estados protegidos.

## Alternativas consideradas

- **Aplicar el aislamiento solo en la API:** rechazada porque una consulta
  incorrecta o un nuevo endpoint podría saltarse el filtro.
- **Entregar `service_role` al API o al cliente:** rechazada porque amplía el
  alcance de una credencial que omite RLS.
- **Crear una identidad de base de datos por tenant:** descartada para el MVP por
  complejidad operativa innecesaria.

## Consecuencias

- Las claves `service_role` y de comunicación interna nunca pueden llegar al
  cliente ni versionarse.
- Los cambios de políticas RLS requieren tests de aislamiento con identidades
  distintas.
- El worker IA tiene privilegios elevados y debe mantener validación de jobs,
  autenticación interna y logging controlado.
