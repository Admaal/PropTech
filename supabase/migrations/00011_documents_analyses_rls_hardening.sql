-- Fase A: integridad de documents + document_analyses
-- mcp-ai usa service_role (bypass RLS) para processing/completed/failed por IA.
-- API Express usa JWT de usuario para INSERT pending y UPDATE → failed al encolar.

DROP POLICY IF EXISTS documents_all ON documents;
DROP POLICY IF EXISTS analyses_all ON document_analyses;

-- ── documents ───────────────────────────────────────────────────────────────

CREATE POLICY documents_select ON documents
  FOR SELECT USING (organization_id IN (SELECT private.user_organization_ids()));

CREATE POLICY documents_insert ON documents
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT private.user_organization_ids())
    AND property_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM properties p
      WHERE p.id = documents.property_id
        AND p.organization_id = documents.organization_id
    )
  );

CREATE POLICY documents_delete ON documents
  FOR DELETE USING (organization_id IN (SELECT private.user_organization_ids()));

-- ── document_analyses ───────────────────────────────────────────────────────

CREATE POLICY analyses_select ON document_analyses
  FOR SELECT USING (organization_id IN (SELECT private.user_organization_ids()));

CREATE POLICY analyses_insert ON document_analyses
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
      FROM documents d
      WHERE d.id = document_analyses.document_id
        AND d.organization_id = document_analyses.organization_id
    )
  );

-- Solo pending/processing → failed (encolado MCP); sin falsificar resultados IA.
CREATE POLICY analyses_update_enqueue_fail ON document_analyses
  FOR UPDATE
  USING (
    organization_id IN (SELECT private.user_organization_ids())
    AND status IN ('pending', 'processing')
  )
  WITH CHECK (
    organization_id IN (SELECT private.user_organization_ids())
    AND status = 'failed'
    AND risk_level IS NULL
    AND solvency_score IS NULL
    AND extracted_data IS NULL
    AND report_markdown IS NULL
    AND tokens_used IS NULL
    AND duration_ms IS NULL
  );

CREATE POLICY analyses_delete ON document_analyses
  FOR DELETE USING (organization_id IN (SELECT private.user_organization_ids()));
