-- ==========================================
-- FASE C: Adicionar campos para skills do GitHub
-- ==========================================
-- Aplicar no Supabase SQL Editor antes de subir o código.

ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS repo_url TEXT,
  ADD COLUMN IF NOT EXISTS stars INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS validation_score NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Índice único por repo_url (quando não nulo) — para deduplicação
CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_repo_url
  ON public.skills (repo_url)
  WHERE repo_url IS NOT NULL;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_skills_updated_at ON public.skills;
CREATE TRIGGER set_skills_updated_at
  BEFORE UPDATE ON public.skills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
