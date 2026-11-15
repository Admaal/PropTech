---
id: "portfolio-docs-cleanup"
status: approved
confirmed: true
---

# Spec: Limpieza documental y reglas locales del portfolio

> Spec aprobada por el usuario después de revisión en el chat.

## Contexto y problema

El repositorio es un portfolio técnico, pero `AGENTS.md` contiene al final
instrucciones genéricas para proyectos nuevos que no aplican a este proyecto.
Además, las reglas locales de Cursor no deben formar parte del repositorio.

La carpeta `docs/adr/` contiene decisiones válidas, pero falta documentar algunas
decisiones arquitectónicas importantes. `docs/gcp-setup.md`,
`docs/specs/cloud-build-trigger.md` y la infraestructura GCP se conservan porque
forman parte del diseño actual del repositorio.

## Resultado deseado

El repositorio debe mostrar una documentación técnica curada y coherente:

- `AGENTS.md` solo contiene instrucciones aplicables a este proyecto.
- `.cursor/` queda excluido de Git.
- Los ADRs documentan las decisiones arquitectónicas relevantes, sin convertirse
  en un registro de cada feature.
- `docs/requirements.md` permanece como alcance del MVP, pero sin parecer un
  backlog personal de ideas.
- La documentación GCP existente no se elimina ni queda referenciada de forma rota.

## Historia de usuario

Como reclutador técnico, quiero leer una documentación coherente y específica del
proyecto para entender sus decisiones sin encontrar instrucciones internas o
backlog sin filtrar.

## Alcance

- **MODIFIED:** eliminar de `AGENTS.md` el párrafo final genérico sobre crear
  `AGENTS.md` en proyectos nuevos. Se conserva la sección SDD aplicable al repo.
- **MODIFIED:** hacer que `.gitignore` ignore todo `.cursor/`, eliminando sus
  excepciones. La regla local `sdd-tdd.mdc` dejará de estar versionada.
- **REVIEWED:** conservar `docs/adr/001-async-ai-via-mcp.md` y
  `docs/adr/007-layered-over-hexagonal.md`.
- **ADDED:** documentar mediante ADR las decisiones actuales sobre el monorepo y
  la frontera de seguridad entre RLS y el uso controlado de `service_role`,
  siempre que la revisión confirme que no están cubiertas suficientemente.
- **MODIFIED:** conservar y pulir `docs/requirements.md` como alcance del MVP,
  retirando el aspecto de lista de ideas futuras sin eliminar requisitos
  implementados.
- **PRESERVED:** `docs/gcp-setup.md`, `docs/specs/cloud-build-trigger.md`,
  `cloudbuild.yaml` e `infra/terraform/`.
- **PRESERVED:** comportamiento de aplicación, despliegues, tests, CI y esquema
  de datos.

## Criterios de aceptación

- [x] **AC-01:** WHEN se lee `AGENTS.md` THE system SHALL encontrar únicamente
  instrucciones aplicables al repositorio actual, sin instrucciones de bootstrap
  para proyectos nuevos.
- [x] **AC-02:** THE system SHALL ignorear cualquier archivo dentro de `.cursor/`
  y ningún archivo de esa carpeta SHALL permanecer versionado.
- [x] **AC-03:** WHEN se revisa `docs/adr/` THE system SHALL encontrar las
  decisiones arquitectónicas actuales y no un registro de features menores.
- [x] **AC-04:** WHEN se lee `docs/requirements.md` THE system SHALL mostrar el
  alcance implementado del MVP y sus restricciones principales, sin una lista
  informal de ideas futuras.
- [x] **AC-05:** THE system SHALL conservar `docs/gcp-setup.md`,
  `docs/specs/cloud-build-trigger.md`, `cloudbuild.yaml` e
  `infra/terraform/`.
- [x] **AC-06:** THE system SHALL conservar válidos los enlaces documentales
  existentes después de la limpieza.
- [x] **AC-07:** THE system SHALL not cambiar el comportamiento de runtime ni la
  configuración funcional de los despliegues.

## Casos límite y errores

- Un archivo `.cursor/` ya trackeado debe dejar de estar versionado sin convertirlo
  en un archivo público del proyecto.
- Las reglas esenciales que antes estaban en `.cursor/` deben seguir reflejadas en
  `AGENTS.md` o en las reglas globales aplicables.
- Los ADRs existentes no deben reescribirse como si fueran decisiones nuevas.
- La documentación GCP no debe borrarse ni quedar con enlaces rotos.
- Si una decisión ya está suficientemente documentada, no se crea un ADR duplicado.

## Fuera de alcance

- Eliminar GCP, Cloud Build, Terraform o Cloud Run.
- Cambiar Render, Supabase, Vercel o la arquitectura de ejecución.
- Añadir hooks, CI, dependencias o nuevos gates.
- Reescribir toda la documentación del proyecto.
- Documentar cada feature, endpoint o cambio menor como ADR.

## Riesgos nuevos de esta fase

- **¿Toca datos personales de alguien que no sea el propio usuario?** No.
  Test de aislamiento: no aplica. Gate: no aplica.
- **¿Escribe algo que pueda repetirse por reintento, reconexión o doble tap?** No.
  Test de idempotencia: no aplica. Gate: no aplica.
- **¿Introduce un rol o permiso nuevo?** No. Test negativo: no aplica. Gate: no aplica.
- **¿Toca dinero, cupos o algo limitado?** No. Test de límites: no aplica. Gate:
  no aplica.
- **¿Acepta contenido que vaya a ver otra persona?** No. Saneado/moderación: no
  aplica. Gate: no aplica.
- **¿Cambia el esquema de datos existente?** No. Migración reversible: no aplica.
  Gate: no aplica.
- **¿Añade un secreto o credencial nueva?** No. Comprobación: no aplica. Gate:
  no aplica.
- **¿Añade tests, un gate nuevo o más trabajo a uno existente?** No. Se harán
  únicamente comprobaciones documentales y de Git durante la validación.

### Riesgo adicional

Ignorar `.cursor/` hará que las reglas locales no se compartan mediante Git. La
mitigación fue confirmada antes de Build: las instrucciones esenciales permanecen
en `AGENTS.md` y se verificó con `git check-ignore` y `git ls-files` que la carpeta
no queda versionada. Gate ejecutado: `stop`.

## Trazabilidad

- Plan: `limpieza_documental_portfolio_3710531c.plan.md` (plan de Cursor aprobado).
- Tests: `node --test infra/cloudbuild-config.test.mjs
  infra/terraform/cloudbuild-trigger.test.mjs`.
- Evidencia: `git diff --check`, `git check-ignore -v
  .cursor/rules/sdd-tdd.mdc`, `git ls-files -- .cursor` y comprobación de
  preservación de GCP/Cloud Build.
