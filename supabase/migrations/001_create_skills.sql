-- ==========================================
-- SKILLS TABLE - AI FEAST ENGINE
-- Bloco 1: Banco de Dados + API
-- ==========================================

-- Tabela de Skills
CREATE TABLE IF NOT EXISTS public.skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  long_description TEXT,
  category TEXT CHECK (category IN ('development', 'content', 'automation', 'analysis', 'security')),
  tags TEXT[],
  input_schema JSONB,
  output_schema JSONB,
  code TEXT,
  install_command TEXT DEFAULT 'npx aifeast',
  run_command TEXT,
  risk_level TEXT DEFAULT 'low',
  verified BOOLEAN DEFAULT false,
  downloads INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para busca por tags (GIN index para arrays JSONB/TEXT[])
CREATE INDEX IF NOT EXISTS idx_skills_category ON public.skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_slug ON public.skills(slug);
CREATE INDEX IF NOT EXISTS idx_skills_tags ON public.skills USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_skills_active ON public.skills(is_active) WHERE is_active = true;

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- Leitura pública (qualquer um pode listar skills ativas)
CREATE POLICY "Anyone can read active skills" ON public.skills
  FOR SELECT USING (is_active = true);

-- Admin pode fazer tudo (será reforçado pelo backend com service_role_key)
CREATE POLICY "Admins can manage skills" ON public.skills
  FOR ALL USING (true);

-- ==========================================
-- FUNÇÃO: check_plan_limit (para referência)
-- A lógica real fica no backend (server.ts)
-- ==========================================

CREATE OR REPLACE FUNCTION get_user_plan_limit(user_plan TEXT)
RETURNS INTEGER AS $$
BEGIN
  CASE user_plan
    WHEN 'free' THEN RETURN 100;
    WHEN 'pro' THEN RETURN 10000;
    WHEN 'enterprise' THEN RETURN -1; -- ilimitado
    ELSE RETURN 100; -- default free
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==========================================
-- SKILLS INICIAIS (Exemplo)
-- ==========================================

INSERT INTO public.skills (id, name, slug, description, category, tags, input_schema, output_schema, risk_level, install_command, run_command, verified) VALUES
(
  'generate_rest_api',
  'Generate REST API',
  'generate-rest-api',
  'Gera endpoints REST completos com validação e documentação automática.',
  'development',
  ARRAY['api', 'rest', 'backend', 'node', 'express'],
  '{"type": "object", "properties": {"prompt": {"type": "string", "description": "Descreva os endpoints que deseja gerar"}}}',
  '{"type": "object", "properties": {"endpoints": {"type": "array"}}}',
  'low',
  'npx aifeast generate-rest-api',
  'npx aifeast run generate-rest-api',
  true
),
(
  'summarize_article',
  'Summarize Article',
  'summarize-article',
  'Resume artigos e notícias em português com suporte a 11 idiomas.',
  'content',
  ARRAY['summary', 'ai', 'translation', 'content'],
  '{"type": "object", "properties": {"url": {"type": "string", "description": "URL do artigo"}, "lang": {"type": "string", "default": "pt"}}}',
  '{"type": "object", "properties": {"summary": {"type": "string"}, "translations": {"type": "object"}}}',
  'low',
  'npx aifeast summarize-article',
  'npx aifeast run summarize-article',
  true
),
(
  'analyze_sentiment',
  'Analyze Sentiment',
  'analyze-sentiment',
  'Analisa sentimento de textos em português e retorna score de positividade.',
  'analysis',
  ARRAY['sentiment', 'analysis', 'nlp', 'ai'],
  '{"type": "object", "properties": {"text": {"type": "string", "description": "Texto para analisar"}}}',
  '{"type": "object", "properties": {"score": {"type": "number"}, "label": {"type": "string"}}}',
  'low',
  'npx aifeast analyze-sentiment',
  'npx aifeast run analyze-sentiment',
  false
)
ON CONFLICT (id) DO NOTHING;
