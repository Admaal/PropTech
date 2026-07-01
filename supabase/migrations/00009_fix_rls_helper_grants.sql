-- 00008 revocó EXECUTE a authenticated en user_organization_ids().
-- Las políticas RLS invocan esa función con el rol de sesión; sin EXECUTE
-- authenticated no ve filas (dashboard vacío, E2E falla).
-- anon sigue sin EXECUTE → no es RPC pública vía PostgREST.
GRANT EXECUTE ON FUNCTION public.user_organization_ids() TO authenticated;
