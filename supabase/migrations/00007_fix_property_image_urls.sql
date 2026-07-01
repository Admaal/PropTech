-- Corrige URLs Unsplash que devolvían 404
UPDATE properties SET
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=80',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=900&q=80',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&q=80'
  ]
WHERE title = 'Piso luminoso en Malasaña';

UPDATE properties SET
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=900&q=80',
    'https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=900&q=80'
  ]
WHERE title = 'Piso exterior Retiro';

UPDATE properties SET
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=900&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80',
    'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=900&q=80'
  ]
WHERE title = 'Piso familiar Tetuán';

UPDATE properties SET
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=900&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80'
  ]
WHERE title = 'Piso céntrico Sol';

UPDATE properties SET
  image_urls = ARRAY[
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=900&q=80',
    'https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=900&q=80'
  ]
WHERE title = 'Piso en Moncloa';
