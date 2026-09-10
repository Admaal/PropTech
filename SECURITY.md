# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| `main`  | ✅        |

## Reporting a vulnerability

**Do not open public GitHub issues for security problems.**

If you discover a vulnerability in PropTech:

1. Email the maintainer privately (contact via GitHub profile **Admaal** or the email associated with the repository owner).
2. Include steps to reproduce, impact assessment, and affected components (web, API, Supabase, mcp-ai).
3. Allow up to **90 days** for a fix before public disclosure.

We will acknowledge receipt within **5 business days**.

## Scope

In scope:

- Authentication and authorization (Supabase Auth, RLS, platform admin)
- Multi-tenant data isolation
- PDF upload and document storage
- API (`apps/server`) and internal mcp-ai service
- Demo deployment configuration

Out of scope:

- Denial-of-service against the public demo (rate limits are intentional)
- Social engineering of demo account credentials
- Issues in third-party services (Supabase, Vercel, GCP, Google Gemini) unless caused by our misconfiguration

## Security architecture (summary)

- **Multi-tenancy:** PostgreSQL Row Level Security on tenant tables; organization membership enforced in policies.
- **Roles:** `member` can read and create the operations required by uploads; destructive
  property, document, analysis, and Storage operations require an organization/platform admin.
- **API:** Bearer JWT validated with Supabase on every request; business logic in services.
- **Storage:** Private bucket; PDF-only; paths are scoped by organization/property/document UUIDs.
- **Uploads:** `Idempotency-Key` plus an atomic database reservation prevents duplicate
  metadata and concurrent quota over-consumption; the database caps ordinary users
  at three analyses per day instead of trusting a client-supplied limit.
- **AI:** Async processing via mcp-ai; service-role access is isolated there, jobs use
  database claims and leases, and Gemini output is validated with Zod before persistence.
- **Secrets:** Never commit `.env`; production secrets in GCP Secret Manager, Vercel env vars, and GitHub Actions secrets.
- **Platform admin:** `/admin` gated in middleware + RLS; use a dedicated account with strong password (not demo users).
- **Demo privacy:** Demo fixtures are synthetic; never upload real personal or financial
  documents to the hosted demo (see [demo privacy](docs/demo-privacy.md)).

## Before deploying or forking

- Rotate all secrets if the repository was ever private with real credentials in local files.
- Set `DAILY_ANALYSIS_QUOTA` > 0 in production.
- Use a strong random `INTERNAL_SERVICE_KEY` (not `dev-internal-key`).
- Disable public signup in Supabase Auth if running a public demo.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` to the browser.
- Demo login uses server-only `DEMO_USER_PASSWORD` via `/api/demo-login` (never `NEXT_PUBLIC_*`).
- Configure the same demo password in Vercel environment variables for production.

## Secret scanning

Run the repository scan before making the repository public:

```bash
pnpm scan:secrets
```

The scan checks tracked files, local `.env` files (including ignored ones), and
all reachable Git history without printing secret values. If anything is found,
rotate the exposed credentials and consider rewriting history before publication.

## License

See [LICENSE](LICENSE) (MIT).
