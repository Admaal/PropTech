---
id: web-perf-images-docker
status: approved
confirmed: true
---

# Spec: Fotos WebP, navegación percibida, Docker Cloud Run y SEO crawler

## Contexto y problema

La web carga fotos de Unsplash sin formato moderno en el mapa, cada ruta remonta el
shell y espera al API, y las imágenes Docker de Cloud Run arrastran un install de
producción innecesario. `/robots.txt` no existe y el middleware lo redirige a `/login`
(HTML), así que Lighthouse marca robots.txt inválido.

## Resultado deseado

Fotos servidas en AVIF/WebP a tamaño de viewport. Al cambiar de ruta autenticada, el
chrome se mantiene y hay skeleton inmediato. Las imágenes `server` y `mcp-ai` en
Artifact Registry son más pequeñas que ahora, sin cambiar el comportamiento de la API.
Los crawlers reciben un `robots.txt` de texto plano válido y un sitemap de rutas
públicas.

## Historia de usuario

Como visitante de la demo, quiero ver inmuebles rápido y cambiar de pantalla sin
esperas largas, para que el portfolio se sienta profesional. Como crawler, quiero
instrucciones de indexación reales, no la página de login.

## Alcance

- Incluido: normalizar URLs de foto, `next/image` + formatos AVIF/WebP, layout
  autenticado + `loading.tsx`, Dockerfiles de `server`/`mcp-ai` más pequeños.
- Incluido: medir tamaño Docker antes/después y documentar el delta.
- Incluido: `robots.txt` y `sitemap.xml` públicos, sin Open Graph/Twitter Cards ni
  rediseño de metadatos de marketing.

## Criterios de aceptación (EARS)

- [ ] **AC-01:** WHEN el navegador pide una foto de inmueble vía `next/image` THE
  system SHALL negociar AVIF o WebP.
- [ ] **AC-02:** WHEN se muestra una miniatura (mapa) THE system SHALL pedir un ancho
  claramente menor que el del carrusel de detalle.
- [ ] **AC-03:** WHEN una URL de Unsplash se renderiza THE system SHALL añadir
  parámetros de formato/calidad/ancho sin romper URLs que ya no sean Unsplash.
- [ ] **AC-04:** WHEN el usuario navega entre rutas autenticadas THE system SHALL
  mantener el chrome (logo, nav, logout) sin remount completo.
- [ ] **AC-05:** WHILE una ruta autenticada carga datos THE system SHALL mostrar un
  skeleton de página.
- [ ] **AC-06:** IF `next/image` no puede optimizar un origen THE system SHALL
  degradar a la URL original sin romper el layout.
- [ ] **AC-07:** THE system SHALL construir imágenes Docker de `server` y `mcp-ai` con
  un stage final que no reinstale el monorepo completo.
- [ ] **AC-08:** THE system SHALL documentar el tamaño de imagen Docker antes y después.
- [ ] **AC-09:** WHEN un cliente pide `GET /robots.txt` THE system SHALL responder
  `text/plain` con sintaxis robots.txt válida (User-agent, Allow/Disallow), nunca
  HTML.
- [ ] **AC-10:** IF el visitante no está autenticado THEN THE system SHALL NO
  redirigir `/robots.txt` ni `/sitemap.xml` a `/login`.
- [ ] **AC-11:** THE system SHALL publicar un sitemap con las URLs públicas (`/` al
  menos) y referenciarlo desde `robots.txt`. Las rutas autenticadas (`/dashboard`,
  `/admin`, `/analyses`, `/properties`, `/api/`) SHALL aparecer como Disallow.

## Casos límite y errores

- URL no-Unsplash o rota → no se muta de forma inválida; el carrusel ya marca fallos.
- Prefetch de ruta dinámica → skeleton visible, no pantalla en blanco.
- Build Docker sin lockfile → sigue fallando (`frozen-lockfile`).
- Petición a `/robots.txt` con o sin sesión → siempre texto plano, nunca login.
- Host de sitemap: usar `metadataBase` / URL canónica (env de Vercel o
  `NEXT_PUBLIC_SITE_URL` si hace falta), no un dominio inventado en duro si se puede
  evitar.

## Fuera de alcance

- Kubernetes / GKE.
- Subir `min_instance_count` de Cloud Run (coste).
- CDN propio, migración de `image_urls` en Postgres, fotos de usuario, cambiar Vercel.
- Rediseño visual o imágenes en las property cards.
- Open Graph, Twitter Cards, schema.org o campaña SEO amplia.

## Riesgos nuevos de esta fase

- **¿Toca datos personales de alguien que no sea el propio usuario?** No. Test de
  aislamiento: no aplica. Gate: no aplica.
- **¿Escribe algo que pueda repetirse por reintento, reconexión o doble tap?** No. Test
  de idempotencia: no aplica. Gate: no aplica.
- **¿Introduce un rol o permiso nuevo?** No. Test de lo que ese rol no puede hacer: no
  aplica. Gate: no aplica.
- **¿Toca dinero, cupos o algo limitado?** No. Validación en servidor: no aplica. Gate:
  no aplica.
- **¿Acepta contenido que vaya a ver otra persona?** No. Saneado: no aplica. Gate: no
  aplica.
- **¿Cambia el esquema de datos de algo que ya tiene usuarios reales?** No. Migración:
  no aplica. Gate: no aplica.
- **¿Añade un secreto o credencial nueva?** No. Comprobación: no aplica. Gate: no aplica.
- **¿Añade tests, un gate nuevo o más trabajo a uno existente?** Sí. Tests unitarios del
  helper de URLs y de `isPublicPath` (robots/sitemap) en `afterFileEdit`. No se añade
  job CI de tamaño Docker ni Lighthouse en CI salvo confirmación. Medir impacto de
  esos tests al añadirlos.

## Trazabilidad

- Plan: `rendimiento_web_docker_4e128caa.plan.md`
- Tests por criterio: helper de URLs (AC-02/03/06); `isPublicPath` (AC-10).
- Evidencia adicional: navegador y requests a `/robots.txt`/`/sitemap.xml` (AC-01,
  AC-04/05, AC-09/11); tamaño Docker (AC-07/08).
