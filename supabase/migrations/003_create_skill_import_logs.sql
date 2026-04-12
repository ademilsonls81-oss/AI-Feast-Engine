-- ==========================================
-- FASE D: Tabela de logs de importação de skills
-- ==========================================
-- Aplicar no Supabase SQL Editor antes do deploy.

CREATE TABLE IF NOT EXISTS public.skill_import_logs (
  id           SERIAL PRIMARY KEY,
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  finished_at  TIMESTAMPTZ,
  discovered   INTEGER DEFAULT 0,
  extracted    INTEGER DEFAULT 0,
  approved     INTEGER DEFAULT 0,
  inserted     INTEGER DEFAULT 0,
  updated      INTEGER DEFAULT 0,
  skipped      INTEGER DEFAULT 0,
  errors       JSONB DEFAULT '[]',
  triggered_by TEXT DEFAULT 'cron' CHECK (triggered_by IN ('cron', 'manual'))
);

-- RLS: apenas service_role pode acessar
ALTER TABLE public.skill_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on import logs"
  ON public.skill_import_logs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
