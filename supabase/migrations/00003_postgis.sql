-- PostGIS vive fuera de public para no exponer sus tablas y funciones internas.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS location extensions.geography(POINT, 4326);

UPDATE public.properties
SET location = extensions.ST_SetSRID(
  extensions.ST_MakePoint(longitude, latitude),
  4326
)::extensions.geography
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND location IS NULL;

CREATE INDEX IF NOT EXISTS idx_properties_location
  ON public.properties USING GIST (location);

-- Sincronizar location cuando se actualizan lat/lng
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

DROP TRIGGER IF EXISTS properties_sync_location ON properties;
CREATE TRIGGER properties_sync_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON properties
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_property_location();
