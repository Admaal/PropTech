-- PostGIS para búsqueda geográfica (mapa en semana 4)
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);

UPDATE properties
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND location IS NULL;

CREATE INDEX IF NOT EXISTS idx_properties_location
  ON properties USING GIST (location);

-- Sincronizar location cuando se actualizan lat/lng
CREATE OR REPLACE FUNCTION sync_property_location()
RETURNS TRIGGER
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS properties_sync_location ON properties;
CREATE TRIGGER properties_sync_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON properties
  FOR EACH ROW
  EXECUTE FUNCTION sync_property_location();
