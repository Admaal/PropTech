-- Endurecimiento Security Advisor (PostGIS + helpers internos)
-- PostGIS se instala en extensions, fuera del esquema expuesto por PostgREST.

-- Lint 0011: search_path fijo en trigger PostGIS
CREATE OR REPLACE FUNCTION public.sync_property_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = extensions, public
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := extensions.ST_SetSRID(
      extensions.ST_MakePoint(NEW.longitude, NEW.latitude),
      4326
    )::extensions.geography;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- El helper RLS es privado; authenticated lo necesita al evaluar las policies.
REVOKE EXECUTE ON FUNCTION private.user_organization_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.user_organization_ids() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
