# Capturas para portfolio

Generadas con `node scripts/capture-screenshots.mjs` (Playwright + cuenta demo A).

| Archivo | Contenido |
|---------|-----------|
| `dashboard-mapa.png` | Dashboard con mapa Leaflet y listado de propiedades |
| `propiedad-analisis.png` | Ficha con carrusel de fotos y badge de evaluación IA |
| `upload-pdf.png` | Upload PDF y resultado del análisis en el historial |

Para regenerar:

```bash
pnpm exec playwright install chromium
node scripts/capture-screenshots.mjs
```

Variables: `DEMO_USER_PASSWORD` en `.env`; opcional `E2E_BASE_URL` (default: demo en Vercel).
