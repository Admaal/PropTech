# Changelog

Cambios desde que el repositorio es público. Cada entrada enlaza a su pull request.
El historial anterior es privado y no se reconstruye aquí.

## 2026-11-15

### Infraestructura y operación
- **Estado remoto, alerta de DLQ y quota project:** el estado de Terraform vive en un bucket
  privado y versionado, hay una alerta por email cuando un análisis llega a la DLQ, y el
  `terraform plan` completo ya funciona. [#66](https://github.com/Admaal/PropTech/pull/66)
- **Corte a Pub/Sub:** el server publica los análisis en el topic y mcp-ai los recibe por push
  autenticado con OIDC; el permiso HTTP de la cuenta del server se retira.
  [#65](https://github.com/Admaal/PropTech/pull/65)
- **Transporte de análisis por Pub/Sub con DLQ:** topics, suscripción push, reintentos y
  resultados `2xx`/`5xx` según el tipo de fallo. [ADR-008](adr/008-transporte-analisis-pubsub.md).
  [#64](https://github.com/Admaal/PropTech/pull/64)
- **Tope diario de peticiones a Gemini** por modelo y tier, aplicado con preferencias de
  Cloud Quotas. [#61](https://github.com/Admaal/PropTech/pull/61),
  [#62](https://github.com/Admaal/PropTech/pull/62),
  [#63](https://github.com/Admaal/PropTech/pull/63)

## 2026-11-14

### Funcionalidad
- **Correlación de `requestId`** entre server y mcp-ai, con logs JSON de lista cerrada de
  campos. [#60](https://github.com/Admaal/PropTech/pull/60)

### Correcciones
- **IDs del seed con zod v4:** `z.string().uuid()` rechazaba los IDs de la demo y el dashboard
  se quedaba cargando; se usa `z.guid()`. [#58](https://github.com/Admaal/PropTech/pull/58)
- **Cuota diaria configurada:** el servicio de subidas usa `DAILY_ANALYSIS_QUOTA` en lugar de
  un mínimo fijo de 3. [#57](https://github.com/Admaal/PropTech/pull/57)
- **CI:** advisories de severidad alta y crítica, y migración a zod v4.
  [#53](https://github.com/Admaal/PropTech/pull/53)

### Documentación
- **README para revisores**, tabla de decisiones y renumeración del ADR de capas a 007.
  [#59](https://github.com/Admaal/PropTech/pull/59)
