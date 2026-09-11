# ADR-001: IA asíncrona vía servicio MCP separado

## Contexto

El análisis de PDFs con Gemini tarda varios segundos. Si se ejecutara dentro del request HTTP del upload, bloquearía el servidor transaccional y degradaría la experiencia de usuario.

## Decisión

1. El **gateway** (`apps/server`) recibe el PDF, lo guarda en Storage, crea `document_analyses` con `status=pending` y responde **202** de inmediato.
2. Dispara un job **fire-and-forget** al servicio **`services/mcp-ai`** vía HTTP interno (`POST /analyze`).
3. **mcp-ai** descarga el PDF con `service_role`, llama a Gemini Flash, valida el JSON con Zod y actualiza Supabase.
4. El frontend hace **polling** a `GET /api/v1/analyses/:id` hasta `completed` o `failed`.
5. La herramienta `analyze_financial_document` también está registrada en el servidor MCP stdio (`pnpm dev:mcp`) para integración con clientes MCP.

## Alternativas consideradas

- **Llamar Gemini desde Express directamente**: más simple pero mezcla IA con lógica transaccional; peor historia para portfolio.
- **Cola Redis/BullMQ**: correcto en producción a escala; YAGNI para MVP.
- **WebSockets**: innecesario con polling cada 2s en demo.

## Consecuencias

- `mcp-ai` requiere `SUPABASE_SERVICE_ROLE_KEY` y `GEMINI_API_KEY`.
- Comunicación interna protegida con `INTERNAL_SERVICE_KEY`.
- Si mcp-ai cae, los análisis quedan en `pending`; reintento manual posible en v2.
