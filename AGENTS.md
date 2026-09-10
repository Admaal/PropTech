# AGENTS.md

This repository contains a production-grade PropTech SaaS platform with AI-powered document analysis, multi-tenancy, and cloud infrastructure.

The goal is to build a system that is simple, maintainable, secure, and scalable without unnecessary complexity.

---

# 1. Project Overview

System components:

- Frontend: Next.js 16 (App Router, TypeScript, Tailwind CSS, componentes propios)
- Backend: Node.js (`apps/server`, Express + TypeScript + Zod)
- Database: Supabase PostgreSQL with Row Level Security (RLS)
- AI Layer: MCP server (Model Context Protocol) using Google Gemini
- Infrastructure: Docker + Terraform + Google Cloud Run
- CI/CD: GitHub Actions

---

# 2. Core Principles (Ponytail+)

- Prefer the simplest maintainable solution.
- Avoid unnecessary abstractions.
- Reuse existing code before creating new code.
- Do not add dependencies without strong justification.
- Keep diffs small and understandable.
- Prefer readability over cleverness.
- Do not implement speculative features.

The system is optimized for maintainability, not theoretical elegance.

---

# 3. Decision Ladder (Strict Order)

Before writing code, evaluate in order:

1. Does this need to exist at all? (YAGNI)
2. Does it already exist in the codebase? Reuse it.
3. Does the standard library solve it?
4. Does the platform provide it?
5. Does an existing dependency solve it?
6. Can it be simpler without losing clarity?
7. Only then implement minimal code.

---

# 4. TypeScript Rules

- Use strict mode.
- Avoid `any`.
- Prefer `unknown` when type is uncertain.
- Use inference when obvious.
- Prefer discriminated unions over boolean flags.
- Avoid unnecessary type exports.
- Avoid unsafe type assertions.

---

# 5. Backend Rules

- All external input must be validated using Zod.
- Route handlers must be thin.
- Business logic must be in service layer.
- Never trust client input.
- Return consistent error structures.
- Avoid mixing database logic with route handlers.

---

# 6. Database Rules (Supabase)

- Enforce multi-tenancy using Row Level Security (RLS).
- Never bypass RLS in application logic.
- Push filtering, sorting, and aggregation to SQL when possible.
- Avoid N+1 queries.
- Use indexes for performance-critical queries.

---

# 7. AI / MCP Rules

- AI outputs are untrusted input.
- Always validate AI responses before using them.
- AI processing must never block API requests.
- MCP server must be isolated from transactional backend logic.
- Prefer asynchronous processing for AI tasks.

---

# 8. Frontend Rules

- Follow the semantic design tokens defined in `apps/web/src/app/globals.css` for
  colors, typography, spacing, components, and layout.
- Maintain a professional SaaS UI with a clean, responsive light-mode default.
- Use Tailwind CSS and semantic design tokens (e.g. `bg-background`, `text-primary`)
  — never raw hex in components.
- UI built with custom components (no shadcn/ui dependency).
- Keep components reusable but not over-abstracted.
- Use skeleton loaders for async states.
- Ensure responsive design by default.
- Dark mode via `theme-toggle` is supported alongside the light-mode defaults.
- Avoid premature UI abstraction layers.

---

# 9. Infrastructure Rules

- Use Docker multi-stage builds.
- Keep images minimal.
- Use Terraform for all infrastructure definitions.
- Avoid manual cloud configuration when possible.
- Prefer declarative infrastructure over imperative scripts.

---

# 10. Testing Strategy

- Test business logic, not frameworks.
- Add tests for:
  - critical business rules
  - regressions
  - complex logic
  - Zod schemas in `packages/shared`
  - Gemini response validation in `services/mcp-ai`
- Do NOT test trivial functions or getters.
- Avoid excessive mocking.
- Prefer real dependencies when feasible (e.g., RLS tests against Supabase in CI).

---

# 11. Performance Rules

- Do not optimize prematurely.
- Prefer correct design over micro-optimizations.
- Push computation to database when appropriate.
- Use indexes instead of application-level filtering.
- Use pagination for large datasets.

---

# 12. Security Rules

- Validate all inputs at trust boundaries.
- Apply least privilege principles.
- Treat all external data as unsafe.
- Never expose secrets or sensitive configuration.
- Enforce authentication and authorization consistently.

---

# 13. Documentation Rules

Documentation is part of the system.

Always update documentation when:

- Architecture changes
- Infrastructure changes
- New services are added
- Data models change significantly

Maintain:

- README.md (high-level overview)
- docs/architecture.md (system diagram and explanation)
- ADRs for significant decisions

---

# 14. Architecture Decision Records (ADR)

Store ADRs in:

docs/adr/

Create an ADR when a decision affects:

- Architecture
- Infrastructure
- Database design
- Authentication or authorization
- AI/MCP design
- Deployment strategy
- External dependencies
- Caching strategy
- Communication protocols

Do NOT create ADRs for:

- UI changes
- Bug fixes
- Refactoring
- Small features
- Variable renames

Each ADR must include:

- Context
- Decision
- Alternatives considered
- Consequences

---

# 15. Definition of Done

A task is only complete when:

- Code compiles without errors
- Lint passes
- TypeScript strict mode passes
- Tests pass (if applicable)
- No unnecessary dependencies were added
- Documentation is updated if needed
- ADR created if required
- Implementation follows project rules

---

# 16. Communication Behavior

If a request is overly complex or ambiguous:

Ask:
"Do you actually need X, or would a simpler Y solve the problem?"

When multiple solutions exist:

- Choose the simplest maintainable option
- Briefly explain trade-offs
- Avoid speculative implementations

Do not over-engineer.

Do not implement future requirements.

Implement only what is requested.

---

# 17. Specification-Driven Development (SDD)

- For a feature or non-trivial change, create a short spec in `docs/specs/` using
  `docs/specs/_template.md`. Describe behavior with EARS criteria, edge cases,
  out-of-scope items, and complete `New risks in this phase`.
- The spec starts with `confirmed: false`. Paste it in full in the chat and stop:
  do not enter Plan Mode, write tests, or code until the user gives an explicit
  "yes" to that specific spec. If the user corrects it, update it, set
  `confirmed: false` again, paste it, and stop.
- Only in the turn after the "yes" change `confirmed: true`, enter Plan Mode, and
  create tasks that trace each `AC-*` criterion.
- Before Build, each affirmative risk must have a test, a gate (`afterFileEdit`,
  `stop`, or `CI`), and user confirmation. Record "No" answers as well.
- TDD starts with a real test derived from an `AC-*` criterion, run and shown
  failing before touching production code. Then implement the minimum GREEN
  solution and REFACTOR without weakening the test.
- For existing changes, use `ADDED`, `MODIFIED`, and `REMOVED` deltas when they
  clarify the scope. A typo, obvious mechanical change, or disposable spike does
  not need a spec.

---

# 18. Current Project Phase

- The MVP and the portfolio-readiness hardening phase are implemented.
- The public repository must pass `pnpm scan:secrets`, `pnpm check:docs`,
  `pnpm test:contracts`, `pnpm audit --audit-level high`, lint, typecheck,
  tests, builds, Terraform validation, and the three Docker image builds.
- Supabase integration tests are mandatory on protected `main`/`master` pushes
  and require two demo identities plus the negative `member` identity.
- Real credential rotation/revocation remains a manual publication prerequisite;
  it is never performed automatically by repository scripts.
- Local measurements on 2026-09-08 (Windows, warm dependency cache) were
  approximately 6 seconds for contract tests, 5 seconds for documentation
  links, 9 seconds for the tree/history secret scan, and 14 seconds for the
  full build. Re-measure these gates if the repository grows materially.
