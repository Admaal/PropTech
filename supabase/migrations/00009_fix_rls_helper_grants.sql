-- Las políticas RLS invocan el helper privado con el rol de sesión.
-- authenticated necesita EXECUTE; anon no debe poder llamarlo por RPC.
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.user_organization_ids() TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION private.user_organization_ids() FROM PUBLIC, anon;
