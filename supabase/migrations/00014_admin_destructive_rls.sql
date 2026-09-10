-- Restringe operaciones destructivas a admins de organización o platform admins.
-- Los miembros conservan lectura y las inserciones necesarias para el flujo de
-- documentos, pero no pueden borrar ni modificar datos de toda la organización.

CREATE OR REPLACE FUNCTION private.user_is_org_admin(target_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = target_organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM public.platform_admins pa
    WHERE pa.user_id = auth.uid()
  )
$$;

REVOKE ALL ON FUNCTION private.user_is_org_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.user_is_org_admin(UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS properties_update ON properties;
DROP POLICY IF EXISTS properties_delete ON properties;

CREATE POLICY properties_update ON properties
  FOR UPDATE
  USING (private.user_is_org_admin(organization_id))
  WITH CHECK (private.user_is_org_admin(organization_id));

CREATE POLICY properties_delete ON properties
  FOR DELETE
  USING (private.user_is_org_admin(organization_id));

DROP POLICY IF EXISTS candidates_all ON candidates;

CREATE POLICY candidates_select ON candidates
  FOR SELECT USING (organization_id IN (SELECT private.user_organization_ids()));

CREATE POLICY candidates_insert ON candidates
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT private.user_organization_ids())
  );

CREATE POLICY candidates_update ON candidates
  FOR UPDATE
  USING (private.user_is_org_admin(organization_id))
  WITH CHECK (private.user_is_org_admin(organization_id));

CREATE POLICY candidates_delete ON candidates
  FOR DELETE
  USING (private.user_is_org_admin(organization_id));

DROP POLICY IF EXISTS documents_delete ON documents;

CREATE POLICY documents_delete ON documents
  FOR DELETE
  USING (private.user_is_org_admin(organization_id));

DROP POLICY IF EXISTS analyses_delete ON document_analyses;

CREATE POLICY analyses_delete ON document_analyses
  FOR DELETE
  USING (private.user_is_org_admin(organization_id));

DROP POLICY IF EXISTS documents_storage_delete ON storage.objects;

DROP POLICY IF EXISTS documents_storage_insert ON storage.objects;

CREATE POLICY documents_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1]::UUID IN (
      SELECT private.user_organization_ids()
    )
    AND EXISTS (
      SELECT 1
      FROM public.properties p
      WHERE p.id = (storage.foldername(name))[2]::UUID
        AND p.organization_id = (storage.foldername(name))[1]::UUID
    )
    AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
  );

CREATE POLICY documents_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND private.user_is_org_admin((storage.foldername(name))[1]::UUID)
    AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
  );
