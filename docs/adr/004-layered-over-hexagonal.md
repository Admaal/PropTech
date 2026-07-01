# ADR-004: Capas ligeras en lugar de hexagonal completa

## Contexto

El backend (`apps/server`) necesita separar HTTP, lógica de negocio y acceso a datos. La arquitectura hexagonal (ports & adapters) es un patrón válido pero añade interfaces y carpetas por cada puerto.

## Decisión

Usar arquitectura en **capas ligeras**:

- `routes/` — HTTP delgado
- `services/` — orquestación
- `repositories/` — Supabase
- `clients/` — servicios externos (MCP)

Sin interfaces abstractas hasta que exista un segundo adaptador real (ej. segundo proveedor de IA).

## Alternativas consideradas

- **Hexagonal pura**: rechazada por overhead en MVP de portfolio.
- **Todo en routes**: rechazada por dificultad de testear y mantener.

## Consecuencias

- Código más legible y rápido de implementar.
- Si se añade un segundo proveedor de IA, extraer `IAnalysisEngine` en ese punto concreto.
- Los tests se centran en `services/` y políticas RLS.
