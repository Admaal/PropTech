-- Tabla mínima para pings de keep-alive (GitHub Actions → PostgREST).
-- Solo lectura pública; sin datos sensibles.

CREATE TABLE IF NOT EXISTS public.keep_alive (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1)
);

INSERT INTO public.keep_alive (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.keep_alive ENABLE ROW LEVEL SECURITY;

CREATE POLICY keep_alive_select_public ON public.keep_alive
  FOR SELECT TO anon, authenticated
  USING (true);
