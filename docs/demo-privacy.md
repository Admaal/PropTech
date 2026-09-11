# Demo data and privacy

The public demo uses synthetic organizations, users, properties, and documents.
It must not be used with real tenant, applicant, payroll, identity, or financial
data.

Uploaded PDFs are stored in a private Supabase Storage bucket and processed by
the asynchronous AI service through the configured Gemini provider. Do not upload
personal data to the hosted demo. Local development should use generated or
redacted fixtures only.

Tenant isolation is enforced by Supabase Row Level Security. A `member` can read
and create the operations required by the upload flow, while destructive
operations are restricted to organization/platform admins. The admin deletion
flow removes document metadata, analyses, and associated PDFs when cleanup
succeeds.

Never commit `.env`, `.env.local`, service-role keys, Gemini keys, demo
passwords, or production credentials.
