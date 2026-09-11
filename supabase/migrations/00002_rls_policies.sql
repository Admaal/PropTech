-- RLS: habilitar en todas las tablas sensibles
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_analyses ENABLE ROW LEVEL SECURITY;

-- organizations: ver solo las propias
CREATE POLICY org_select ON organizations
  FOR SELECT USING (id IN (SELECT private.user_organization_ids()));

-- organization_members
CREATE POLICY org_members_select ON organization_members
  FOR SELECT USING (organization_id IN (SELECT private.user_organization_ids()));

CREATE POLICY org_members_insert ON organization_members
  FOR INSERT WITH CHECK (organization_id IN (SELECT private.user_organization_ids()));

-- properties
CREATE POLICY properties_select ON properties
  FOR SELECT USING (organization_id IN (SELECT private.user_organization_ids()));

CREATE POLICY properties_insert ON properties
  FOR INSERT WITH CHECK (organization_id IN (SELECT private.user_organization_ids()));

CREATE POLICY properties_update ON properties
  FOR UPDATE USING (organization_id IN (SELECT private.user_organization_ids()));

CREATE POLICY properties_delete ON properties
  FOR DELETE USING (organization_id IN (SELECT private.user_organization_ids()));

-- candidates
CREATE POLICY candidates_all ON candidates
  FOR ALL USING (organization_id IN (SELECT private.user_organization_ids()));

-- documents
CREATE POLICY documents_all ON documents
  FOR ALL USING (organization_id IN (SELECT private.user_organization_ids()));

-- document_analyses
CREATE POLICY analyses_all ON document_analyses
  FOR ALL USING (organization_id IN (SELECT private.user_organization_ids()));
