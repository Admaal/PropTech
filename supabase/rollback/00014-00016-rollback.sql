-- Rollback manual de las migraciones 00014, 00015 y 00016.
-- Ejecutar únicamente con una copia de seguridad y una ventana de mantenimiento.
-- El rollback 00015 elimina las claves de idempotencia y desactiva la cuota
-- atómica; no debe ejecutarse después de aceptar uploads nuevos.

BEGIN;

DROP FUNCTION IF EXISTS public.renew_analysis_job(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.claim_analysis_job(UUID, INTEGER);
ALTER TABLE public.document_analyses
  DROP COLUMN IF EXISTS last_attempt_at,
  DROP COLUMN IF EXISTS next_retry_at,
  DROP COLUMN IF EXISTS lease_until,
  DROP COLUMN IF EXISTS attempt_count;

DROP FUNCTION IF EXISTS public.create_pending_document(
  UUID,
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER
);
DROP INDEX IF EXISTS public.idx_documents_org_idempotency;
ALTER TABLE public.documents
  DROP COLUMN IF EXISTS idempotency_key;

CREATE POLICY documents_insert ON public.documents
  FOR INSERT WITH CHECK (
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
  FOR INSERT WITH CHECK (
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

DROP POLICY IF EXISTS properties_update ON public.properties;
DROP POLICY IF EXISTS properties_delete ON public.properties;
CREATE POLICY properties_update ON public.properties
  FOR UPDATE USING (
    organization_id IN (SELECT private.user_organization_ids())
  );
CREATE POLICY properties_delete ON public.properties
  FOR DELETE USING (
    organization_id IN (SELECT private.user_organization_ids())
  );

DROP POLICY IF EXISTS candidates_select ON public.candidates;
DROP POLICY IF EXISTS candidates_insert ON public.candidates;
DROP POLICY IF EXISTS candidates_update ON public.candidates;
DROP POLICY IF EXISTS candidates_delete ON public.candidates;
CREATE POLICY candidates_all ON public.candidates
  FOR ALL USING (
    organization_id IN (SELECT private.user_organization_ids())
  );

DROP POLICY IF EXISTS documents_delete ON public.documents;
CREATE POLICY documents_delete ON public.documents
  FOR DELETE USING (
    organization_id IN (SELECT private.user_organization_ids())
  );

DROP POLICY IF EXISTS analyses_delete ON public.document_analyses;
CREATE POLICY analyses_delete ON public.document_analyses
  FOR DELETE USING (
    organization_id IN (SELECT private.user_organization_ids())
  );

DROP POLICY IF EXISTS documents_storage_insert ON storage.objects;
DROP POLICY IF EXISTS documents_storage_delete ON storage.objects;
CREATE POLICY documents_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1]::UUID IN (
      SELECT private.user_organization_ids()
    )
    AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
  );

CREATE POLICY documents_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1]::UUID IN (
      SELECT private.user_organization_ids()
    )
    AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
  );

DROP FUNCTION IF EXISTS private.user_is_org_admin(UUID);

COMMIT;
