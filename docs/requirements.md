# Requisitos — PropTech MVP

## Requisitos funcionales

| ID | Descripción | Estado |
|----|-------------|--------|
| RF-01 | Auth Supabase + multi-tenancy por organización (RLS) | Semana 1 |
| RF-02 | Buscador con filtros precio/m²/riesgo + mapa Leaflet | ✅ |
| RF-03 | Upload PDF drag-and-drop a Storage privado | Semana 2 ✅ |
| RF-04 | Análisis IA async vía MCP/Gemini | Semana 3 ✅ |
| RF-05 | Historial de análisis (estado, duración, tokens) | Semana 3 ✅ |

## Requisitos no funcionales

| ID | Descripción |
|----|-------------|
| RNF-01 | API transaccional <200ms; búsquedas indexadas rápidas en demo |
| RNF-02 | RLS en tablas sensibles + Storage privado |
| RNF-03 | IA en servicio separado; upload devuelve 202 |
| RNF-04 | Zod en inputs/outputs; schemas en `packages/shared` |
| RNF-05 | Tests de aislamiento RLS cross-org |

## Fuera de alcance MVP

- NestJS, tRPC
- Dashboard de monitorización del Event Loop
- Tres roles de negocio (Inversor/Arrendador/Agencia)
- Testcontainers en CI (post-MVP)
