-- Seed demo: 2 organizaciones y propiedades en Madrid
-- NOTA: Los usuarios demo deben crearse vía Auth; este seed asume orgs fijas.
-- Ejecutar después de crear usuarios demo en Supabase o adaptar user_ids.

-- Organizaciones demo (IDs fijos para reproducibilidad)
INSERT INTO organizations (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Inmobiliaria Centro'),
  ('22222222-2222-2222-2222-222222222222', 'Gestión Norte')
ON CONFLICT (id) DO NOTHING;

-- Propiedades Org A - Inmobiliaria Centro (12)
-- ponytail: risk_level es etiqueta DEMO para el mapa/filtros, no scoring real.
-- Criterio simplificado del seed: bajo = alquiler alto; alto = alquiler bajo (~700-900€).
-- Coincide a menudo con barrios periféricos porque allí el alquiler es más barato.
INSERT INTO properties (organization_id, title, address, city, price_monthly, sqm, bedrooms, risk_level, latitude, longitude) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Piso luminoso en Malasaña', 'Calle Pez 12, 3ºB', 'Madrid', 1200, 65, 2, 'low', 40.4268, -3.7038),
  ('11111111-1111-1111-1111-111111111111', 'Estudio moderno Chueca', 'Calle Hortaleza 45', 'Madrid', 950, 42, 1, 'medium', 40.4220, -3.6975),
  ('11111111-1111-1111-1111-111111111111', 'Ático con terraza', 'Calle Fuencarral 88', 'Madrid', 1850, 95, 3, 'low', 40.4285, -3.7012),
  ('11111111-1111-1111-1111-111111111111', 'Piso reformado Lavapiés', 'Calle Embajadores 34', 'Madrid', 1100, 58, 2, 'medium', 40.4089, -3.7025),
  ('11111111-1111-1111-1111-111111111111', 'Dúplex en Chamberí', 'Calle Génova 15', 'Madrid', 2100, 110, 3, 'low', 40.4310, -3.6920),
  ('11111111-1111-1111-1111-111111111111', 'Piso exterior Retiro', 'Calle Alcalá 210', 'Madrid', 1650, 78, 2, 'low', 40.4200, -3.6750),
  ('11111111-1111-1111-1111-111111111111', 'Estudio económico Usera', 'Av. Rafaela Ybarra 8', 'Madrid', 750, 38, 1, 'high', 40.3850, -3.7100),
  ('11111111-1111-1111-1111-111111111111', 'Piso familiar Tetuán', 'Calle Bravo Murillo 180', 'Madrid', 1400, 85, 3, 'medium', 40.4580, -3.6980),
  ('11111111-1111-1111-1111-111111111111', 'Loft industrial en Argüelles', 'Calle Princesa 72', 'Madrid', 1750, 70, 2, 'low', 40.4290, -3.7150),
  ('11111111-1111-1111-1111-111111111111', 'Piso céntrico Sol', 'Calle Mayor 25, 2ºA', 'Madrid', 1500, 60, 1, 'medium', 40.4168, -3.7038),
  ('11111111-1111-1111-1111-111111111111', 'Apartamento Salamanca', 'Calle Serrano 45', 'Madrid', 2200, 90, 2, 'low', 40.4250, -3.6850),
  ('11111111-1111-1111-1111-111111111111', 'Piso Vallecas', 'Calle Puerto de Navacerrada 12', 'Madrid', 900, 55, 2, 'high', 40.3900, -3.6550);

-- Propiedades Org B - Gestión Norte (8)
INSERT INTO properties (organization_id, title, address, city, price_monthly, sqm, bedrooms, risk_level, latitude, longitude) VALUES
  ('22222222-2222-2222-2222-222222222222', 'Piso en Moncloa', 'Calle Hilarión Eslava 5', 'Madrid', 1300, 72, 2, 'low', 40.4350, -3.7180),
  ('22222222-2222-2222-2222-222222222222', 'Estudio Universidad', 'Calle Isaac Peral 22', 'Madrid', 850, 40, 1, 'medium', 40.4380, -3.7200),
  ('22222222-2222-2222-2222-222222222222', 'Piso amplio Cuatro Caminos', 'Calle Orense 34', 'Madrid', 1550, 88, 3, 'low', 40.4450, -3.6950),
  ('22222222-2222-2222-2222-222222222222', 'Bajo con patio', 'Calle Ponzano 18', 'Madrid', 1900, 95, 2, 'low', 40.4400, -3.6980),
  ('22222222-2222-2222-2222-222222222222', 'Piso económico Carabanchel', 'Calle General Ricardos 90', 'Madrid', 700, 50, 2, 'high', 40.3800, -3.7400),
  ('22222222-2222-2222-2222-222222222222', 'Ático en Nuevos Ministerios', 'Paseo de la Castellana 120', 'Madrid', 2500, 105, 3, 'low', 40.4450, -3.6920),
  ('22222222-2222-2222-2222-222222222222', 'Piso Chamberí norte', 'Calle García de Paredes 28', 'Madrid', 1450, 68, 2, 'medium', 40.4320, -3.6980),
  ('22222222-2222-2222-2222-222222222222', 'Estudio Malasaña', 'Calle Manuela Malasaña 10', 'Madrid', 1000, 45, 1, 'medium', 40.4270, -3.7050);
