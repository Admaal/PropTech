-- Platform admins: acceso cross-tenant (demo / soporte)
CREATE TABLE platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_admins_select ON platform_admins
  FOR SELECT USING (user_id = auth.uid());

-- Reutiliza user_organization_ids() en todas las políticas RLS existentes.
CREATE OR REPLACE FUNCTION user_organization_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id
  FROM organization_members
  WHERE user_id = auth.uid()
  UNION
  SELECT o.id
  FROM organizations o
  WHERE EXISTS (
    SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid()
  )
$$;
