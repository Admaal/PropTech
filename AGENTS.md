# AGENTS.md

This repository contains a production-grade PropTech SaaS platform with AI-powered document analysis, multi-tenancy, and cloud infrastructure.

The goal is to build a system that is simple, maintainable, secure, and scalable without unnecessary complexity.

---

# 1. Project Overview

System components:

- Frontend: Next.js 15 (App Router, TypeScript, Tailwind, shadcn/ui)
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

- Follow DESIGN.md for all UI: colors, typography, spacing, components, and layout.
- Maintain a professional SaaS UI (light mode per DESIGN.md, clean layout).
- Use Tailwind CSS and shadcn/ui components mapped to DESIGN.md tokens.
- Use semantic tokens (e.g. `bg-background`, `text-primary`) — never raw hex in components.
- Keep components reusable but not over-abstracted.
- Use skeleton loaders for async states.
- Ensure responsive design by default.
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
- Do NOT test trivial functions or getters.
- Avoid excessive mocking.
- Prefer real dependencies when feasible (e.g., test DB via Docker).

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
- architecture.md (system diagram and explanation)
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
