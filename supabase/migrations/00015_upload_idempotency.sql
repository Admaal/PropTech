-- Atomicidad de uploads: la cuota y la creación de metadata/análisis se
-- resuelven dentro de una única transacción protegida por organización.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_org_idempotency
  ON public.documents (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

DROP POLICY IF EXISTS documents_insert ON public.documents;
DROP POLICY IF EXISTS analyses_insert ON public.document_analyses;

CREATE POLICY documents_insert ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT private.user_organization_ids())
    AND property_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.properties p
      WHERE p.id = documents.property_id
        AND p.organization_id = documents.organization_id
    )
  );

CREATE POLICY analyses_insert ON public.document_analyses
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT private.user_organization_ids())
    AND status = 'pending'
    AND risk_level IS NULL
    AND solvency_score IS NULL
    AND extracted_data IS NULL
    AND report_markdown IS NULL
    AND tokens_used IS NULL
    AND duration_ms IS NULL
    AND error_message IS NULL
    AND completed_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.id = document_analyses.document_id
        AND d.organization_id = document_analyses.organization_id
    )
  );

CREATE OR REPLACE FUNCTION public.create_pending_document(
  p_document_id UUID,
  p_organization_id UUID,
  p_property_id UUID,
  p_storage_path TEXT,
  p_filename TEXT,
  p_mime_type TEXT,
  p_idempotency_key TEXT,
  p_daily_limit INTEGER
)
RETURNS TABLE(document_id UUID, analysis_id UUID, created BOOLEAN)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  existing_document_id UUID;
  existing_property_id UUID;
  existing_analysis_id UUID;
  new_analysis_id UUID;
  effective_daily_limit INTEGER;
BEGIN
  IF p_idempotency_key IS NULL
    OR length(p_idempotency_key) < 16
    OR length(p_idempotency_key) > 128
  THEN
    RAISE EXCEPTION 'IDEMPOTENCY_KEY_INVALID';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = p_property_id
      AND p.organization_id = p_organization_id
      AND p_organization_id IN (
        SELECT private.user_organization_ids()
      )
  ) THEN
    RAISE EXCEPTION 'PROPERTY_NOT_FOUND';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_organization_id::TEXT, 0)
  );

  SELECT d.id, d.property_id, da.id
  INTO existing_document_id, existing_property_id, existing_analysis_id
  FROM public.documents d
  JOIN public.document_analyses da ON da.document_id = d.id
  WHERE d.organization_id = p_organization_id
    AND d.idempotency_key = p_idempotency_key
  LIMIT 1;

  IF existing_document_id IS NOT NULL THEN
    IF existing_property_id IS DISTINCT FROM p_property_id THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_CONFLICT';
    END IF;

    RETURN QUERY
    SELECT existing_document_id, existing_analysis_id, FALSE;
    RETURN;
  END IF;

  -- This RPC is callable by authenticated clients, so never trust the quota
  -- supplied by the API caller. Non-platform users are capped at the public
  -- portfolio limit; platform-admin status comes from the database.
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.platform_admins
      WHERE user_id = auth.uid()
    ) THEN 0
    WHEN p_daily_limit > 0 THEN LEAST(p_daily_limit, 3)
    ELSE 3
  END
  INTO effective_daily_limit;

  IF effective_daily_limit > 0
    AND (
      SELECT count(*)
      FROM public.document_analyses da
      WHERE da.organization_id = p_organization_id
        AND da.created_at >= date_trunc('day', now())
    ) >= effective_daily_limit
  THEN
    RAISE EXCEPTION 'QUOTA_EXCEEDED';
  END IF;

  INSERT INTO public.documents (
    id,
    organization_id,
    property_id,
    storage_path,
    filename,
    mime_type,
    idempotency_key
  )
  VALUES (
    p_document_id,
    p_organization_id,
    p_property_id,
    p_storage_path,
    p_filename,
    p_mime_type,
    p_idempotency_key
  );

  INSERT INTO public.document_analyses (
    document_id,
    organization_id,
    status
  )
  VALUES (
    p_document_id,
    p_organization_id,
    'pending'
  )
  RETURNING id INTO new_analysis_id;

  RETURN QUERY
  SELECT p_document_id, new_analysis_id, TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.create_pending_document(
  UUID,
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_pending_document(
  UUID,
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER
) TO authenticated, service_role;
