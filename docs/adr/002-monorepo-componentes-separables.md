# ADR-002: Monorepo con componentes separables

## Contexto

El proyecto reúne una aplicación web, una API transaccional, un servicio de
análisis IA y schemas compartidos. El frontend, la API y el servicio IA tienen
ciclos de ejecución y despliegue distintos, pero sus cambios suelen coordinarse
y deben compartir contratos TypeScript.

## Decisión

Mantener un único monorepo con estos límites explícitos:

- `apps/web` contiene el frontend.
- `apps/server` contiene la API transaccional.
- `services/mcp-ai` contiene el procesamiento IA.
- `packages/shared` contiene schemas y tipos compartidos.
- `infra/` contiene la infraestructura y configuración de despliegue.

Cada aplicación o servicio conserva sus propios comandos de build, typecheck,
lint y test. El monorepo coordina cambios y contratos, pero no obliga a ejecutar
todos los componentes como un único proceso ni impide desplegarlos por separado.

## Alternativas consideradas

- **Repositorios separados:** ofrecen aislamiento de permisos y ciclos, pero
  complican los cambios coordinados y la evolución de los contratos compartidos.
- **Monolito de proceso único:** simplifica el despliegue inicial, pero mezcla el
  tráfico transaccional con el procesamiento IA y limita su escalado independiente.

## Consecuencias

- Las revisiones de una feature pueden incluir frontend, API, schemas e
  infraestructura en un mismo cambio trazable.
- El CI debe respetar los límites de cada paquete y evitar dependencias
  implícitas entre servicios.
- La separación de despliegue sigue siendo una decisión operativa independiente
  de la organización del código.
