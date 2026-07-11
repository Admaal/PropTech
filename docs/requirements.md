# Requisitos — PropTech

## Requisitos funcionales

| ID    | Descripción                                           | Estado |
| ----- | ----------------------------------------------------- | ------ |
| RF-01 | Auth Supabase + multi-tenancy por organización (RLS)  | ✅     |
| RF-02 | Buscador con filtros precio/m²/riesgo + mapa Leaflet  | ✅     |
| RF-03 | Upload PDF drag-and-drop a Storage privado            | ✅     |
| RF-04 | Análisis IA async vía MCP/Gemini                      | ✅     |
| RF-05 | Historial de análisis (estado, duración, tokens)      | ✅     |
| RF-06 | Ficha de propiedad con fotos (carrusel) y descripción | ✅     |
| RF-07 | Popup del mapa con foto y descripción del inmueble    | ✅     |
| RF-08 | Listado global de análisis con enlace al inmueble     | ✅     |
| RF-09 | Panel admin cross-org (borrar inmuebles e historial)  | ✅     |
| RF-10 | Modo oscuro según preferencia del sistema             | ✅     |

## Requisitos no funcionales

| ID     | Descripción                                                            | Estado |
| ------ | ---------------------------------------------------------------------- | ------ |
| RNF-01 | API transaccional <200ms; búsquedas indexadas rápidas en demo          | ✅     |
| RNF-02 | RLS en tablas sensibles + Storage privado                              | ✅     |
| RNF-03 | IA en servicio separado; upload devuelve 202                           | ✅     |
| RNF-04 | Zod en inputs/outputs; schemas en `packages/shared`                    | ✅     |
| RNF-05 | Tests de aislamiento RLS cross-org                                     | ✅     |
| RNF-06 | Cuotas y rate limits en demo; platform admin exento                    | ✅     |
| RNF-07 | E2E Playwright: smoke en CI; upload mockeado; full-stack admin semanal | ✅     |

## Demo pública

- **URL:** https://proptech-web-kappa.vercel.app
- **Cuentas demo públicas:** `demo-a@test.com`, `demo-b@test.com` (contraseña vía variables de entorno, no en el repo)
- **Platform admin:** cuenta interna creada con script local; no forma parte de la demo pública
- **Límites demo:** 3 análisis/día/org, 5 subidas/hora/usuario (platform admin exento de cuota y límite de subida)

## Fuera de alcance MVP

- NestJS, tRPC
- Dashboard de monitorización del Event Loop
- Tres roles de negocio (Inversor/Arrendador/Agencia)
- Testcontainers en CI (post-MVP)
- Billing / suscripciones
- Notificaciones por email al completar análisis
