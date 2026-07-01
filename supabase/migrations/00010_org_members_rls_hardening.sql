-- C1: org_members_insert permitía a cualquier member insertar admins o user_ids arbitrarios.
-- Signup sigue vía handle_new_user (SECURITY DEFINER); invitaciones solo admin → member.

DROP POLICY IF EXISTS org_members_insert ON organization_members;

CREATE POLICY org_members_insert ON organization_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
    AND role = 'member'
    AND user_id <> auth.uid()
  );

CREATE POLICY org_members_update ON organization_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  )
  WITH CHECK (
    role IN ('admin', 'member')
    AND EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  );

CREATE POLICY org_members_delete ON organization_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  );
