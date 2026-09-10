-- Recuperación de jobs IA sin doble claim concurrente.

ALTER TABLE public.document_analyses
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lease_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_analyses_recovery
  ON public.document_analyses (status, lease_until, next_retry_at);

CREATE OR REPLACE FUNCTION public.claim_analysis_job(
  p_analysis_id UUID,
  p_lease_seconds INTEGER DEFAULT 300
)
RETURNS TABLE(
  analysis_id UUID,
  document_id UUID,
  organization_id UUID,
  storage_path TEXT,
  attempt_count INTEGER
)
LANGUAGE sql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
  WITH claimed AS (
    UPDATE public.document_analyses da
    SET
      status = 'processing',
      attempt_count = da.attempt_count + 1,
      last_attempt_at = now(),
      lease_until = now() + make_interval(
        secs => GREATEST(60, LEAST(p_lease_seconds, 900))
      ),
      next_retry_at = NULL,
      error_message = NULL
    FROM public.documents d
    WHERE da.id = p_analysis_id
      AND da.document_id = d.id
      AND da.attempt_count < 3
      AND (
        da.status = 'pending'
        OR (
          da.status = 'failed'
          AND da.attempt_count < 3
          AND (
            da.next_retry_at IS NULL
            OR da.next_retry_at <= now()
          )
        )
        OR (
          da.status = 'processing'
          AND (
            da.lease_until IS NULL
            OR da.lease_until < now()
          )
        )
      )
    RETURNING
      da.id,
      da.document_id,
      da.organization_id,
      da.attempt_count
  )
  SELECT
    c.id,
    c.document_id,
    c.organization_id,
    d.storage_path,
    c.attempt_count
  FROM claimed c
  JOIN public.documents d ON d.id = c.document_id;
$$;

REVOKE ALL ON FUNCTION public.claim_analysis_job(UUID, INTEGER)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_analysis_job(UUID, INTEGER)
  TO service_role;

CREATE OR REPLACE FUNCTION public.renew_analysis_job(
  p_analysis_id UUID,
  p_lease_seconds INTEGER DEFAULT 300
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
  WITH renewed AS (
    UPDATE public.document_analyses
    SET lease_until = now() + make_interval(
      secs => GREATEST(60, LEAST(p_lease_seconds, 900))
    )
    WHERE id = p_analysis_id
      AND status = 'processing'
      AND lease_until > now()
    RETURNING id
  )
  SELECT EXISTS (SELECT 1 FROM renewed);
$$;

REVOKE ALL ON FUNCTION public.renew_analysis_job(UUID, INTEGER)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.renew_analysis_job(UUID, INTEGER)
  TO service_role;
