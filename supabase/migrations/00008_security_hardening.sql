-- Endurecimiento Security Advisor (PostGIS + helpers internos)

-- spatial_ref_sys es catálogo EPSG de PostGIS (sin datos de tenant).
-- No somos owner (supabase_admin) → no podemos ENABLE RLS; revocamos acceso API.
REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated, PUBLIC;

DO $$
BEGIN
  IF to_regclass('public.geometry_columns') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON TABLE public.geometry_columns FROM anon, authenticated, PUBLIC';
  END IF;
  IF to_regclass('public.geography_columns') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON TABLE public.geography_columns FROM anon, authenticated, PUBLIC';
  END IF;
END $$;

-- Lint 0011: search_path fijo en trigger PostGIS
CREATE OR REPLACE FUNCTION sync_property_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Lint 0028/0029: helpers internos no deben ser RPC públicas (anon/PUBLIC).
-- authenticated conserva EXECUTE: lo exigen las políticas RLS (ver 00009 si se revoca por error).
REVOKE EXECUTE ON FUNCTION public.user_organization_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- PostGIS: funciones no usadas por la app vía REST
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text, boolean) FROM PUBLIC, anon, authenticated;
