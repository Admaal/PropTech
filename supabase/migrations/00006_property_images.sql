-- Fotos y descripción para fichas de inmueble (URLs Unsplash, uso libre)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

-- Org A
UPDATE properties SET
  description = 'Piso exterior muy luminoso en el corazón de Malasaña. Cocina equipada, suelos de madera y excelente comunicación con metro Noviciado.',
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=80',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=900&q=80',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&q=80'
  ]
WHERE title = 'Piso luminoso en Malasaña';

UPDATE properties SET
  description = 'Estudio compacto y funcional en Chueca, ideal para profesional joven. Amueblado y listo para entrar a vivir.',
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&q=80',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&q=80'
  ]
WHERE title = 'Estudio moderno Chueca';

UPDATE properties SET
  description = 'Ático dúplex con terraza privada y vistas despejadas sobre Fuencarral. Dos plantas, mucha luz natural y acabados de calidad.',
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900&q=80'
  ]
WHERE title = 'Ático con terraza';

UPDATE properties SET
  description = 'Piso recién reformado en Lavapiés, ambiente multicultural y vida de barrio. Distribución abierta salón-cocina.',
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900&q=80',
    'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=900&q=80'
  ]
WHERE title = 'Piso reformado Lavapiés';

UPDATE properties SET
  description = 'Dúplex señorial en Chamberí con techos altos y zona de trabajo independiente. Barrio tranquilo y bien comunicado.',
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=900&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80',
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&q=80'
  ]
WHERE title = 'Dúplex en Chamberí';

UPDATE properties SET
  description = 'Piso exterior con vistas al Retiro. Salón amplio, dos dormitorios dobles y parking opcional en el edificio.',
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=900&q=80',
    'https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=900&q=80'
  ]
WHERE title = 'Piso exterior Retiro';

UPDATE properties SET
  description = 'Estudio económico en Usera, perfecto como primera vivienda. Transporte público a menos de 5 minutos.',
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=900&q=80',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=900&q=80'
  ]
WHERE title = 'Estudio económico Usera';

UPDATE properties SET
  description = 'Piso familiar en Tetuán con tres dormitorios y cocina independiente. Colegios y zonas verdes cercanas.',
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=900&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80',
    'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=900&q=80'
  ]
WHERE title = 'Piso familiar Tetuán';

UPDATE properties SET
  description = 'Loft de estilo industrial en Argüelles, vigas vistas y ventanales orientados al oeste. Ideal para pareja creativa.',
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=900&q=80',
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=900&q=80'
  ]
WHERE title = 'Loft industrial en Argüelles';

UPDATE properties SET
  description = 'Piso céntrico a dos minutos de la Puerta del Sol. Ubicación premium para quien busca vivir en el epicentro de Madrid.',
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=900&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80'
  ]
WHERE title = 'Piso céntrico Sol';

UPDATE properties SET
  description = 'Apartamento de lujo en el barrio de Salamanca. Finca clásica rehabilitada, portero y ascensor.',
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=80',
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=900&q=80',
    'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=900&q=80'
  ]
WHERE title = 'Apartamento Salamanca';

UPDATE properties SET
  description = 'Piso económico en Vallecas con buena conexión a la M-40. Dos habitaciones y trastero incluido.',
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1560184897-ae75f418493e?w=900&q=80',
    'https://images.unsplash.com/photo-1560448075-bb485b067938?w=900&q=80'
  ]
WHERE title = 'Piso Vallecas';

-- Org B
UPDATE properties SET
  description = 'Piso amplio en Moncloa, junto a la Ciudad Universitaria. Zona tranquila con comercios de proximidad.',
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=900&q=80',
    'https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=900&q=80'
  ]
WHERE title = 'Piso en Moncloa';

UPDATE properties SET
  description = 'Estudio cerca del campus, ideal para estudiantes o investigadores. Amueblado y con fibra óptica.',
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=900&q=80',
    'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=900&q=80'
  ]
WHERE title = 'Estudio Universidad';

UPDATE properties SET
  description = 'Piso espacioso en Cuatro Caminos con tres dormitorios. Perfecto para familias que buscan zona bien conectada.',
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900&q=80',
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&q=80'
  ]
WHERE title = 'Piso amplio Cuatro Caminos';

UPDATE properties SET
  description = 'Bajo con patio privado en Chamberí-Ponzano. Acceso directo desde calle y zona de barbacoa.',
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=900&q=80',
    'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=900&q=80'
  ]
WHERE title = 'Bajo con patio';

UPDATE properties SET
  description = 'Piso económico en Carabanchel, reformado y con buena relación calidad-precio. Metro Eugenia de Montijo.',
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1560184897-ae75f418493e?w=900&q=80',
    'https://images.unsplash.com/photo-1560448075-bb485b067938?w=900&q=80'
  ]
WHERE title = 'Piso económico Carabanchel';

UPDATE properties SET
  description = 'Ático premium en Nuevos Ministerios con vistas a la Castellana. Tres dormitorios en suite y domótica.',
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=80',
    'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=900&q=80'
  ]
WHERE title = 'Ático en Nuevos Ministerios';

UPDATE properties SET
  description = 'Piso en Chamberí norte, zona residencial con ambiente de barrio. Dos dormitorios y salón con balcón.',
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900&q=80',
    'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=900&q=80'
  ]
WHERE title = 'Piso Chamberí norte';

UPDATE properties SET
  description = 'Estudio en Malasaña con encanto de barrio. Calle peatonal, bares y vida nocturna a la vuelta de la esquina.',
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&q=80',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&q=80'
  ]
WHERE title = 'Estudio Malasaña';
