/**
 * Script para rodar a migration da tabela skills no Supabase
 * Usa a REST API do Supabase com service_role_key
 * 
 * Uso: node scripts/run-skills-migration.js
 * 
 * As credenciais devem estar no .env ou nas variaveis de ambiente:
 * - VITE_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

require('dotenv').config({ path: '.env' });

const https = require('https');
const { URL } = require('url');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || SERVICE_KEY === '<PREENCHA_AQUI>') {
  console.error('❌ Erro: Credenciais do Supabase faltando no .env');
  console.error('');
  console.error('Abra o arquivo .env e preencha:');
  console.error('  VITE_SUPABASE_URL=https://seu-projeto.supabase.co');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=sua-chave-aqui');
  console.error('');
  console.error('Ou rode as variaveis de ambiente diretamente:');
  console.error('  set VITE_SUPABASE_URL=...');
  console.error('  set SUPABASE_SERVICE_ROLE_KEY=...');
  process.exit(1);
}

const SQL = `
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

CREATE INDEX IF NOT EXISTS idx_skills_category ON public.skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_slug ON public.skills(slug);
CREATE INDEX IF NOT EXISTS idx_skills_tags ON public.skills USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_skills_active ON public.skills(is_active) WHERE is_active = true;

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active skills" ON public.skills;
CREATE POLICY "Anyone can read active skills" ON public.skills
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage skills" ON public.skills;
CREATE POLICY "Admins can manage skills" ON public.skills
  FOR ALL USING (true);

CREATE OR REPLACE FUNCTION get_user_plan_limit(user_plan TEXT)
RETURNS INTEGER AS $$
BEGIN
  CASE user_plan
    WHEN 'free' THEN RETURN 100;
    WHEN 'pro' THEN RETURN 10000;
    WHEN 'enterprise' THEN RETURN -1;
    ELSE RETURN 100;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

INSERT INTO public.skills (id, name, slug, description, category, tags, input_schema, output_schema, risk_level, install_command, run_command, verified) VALUES
(
  'generate_rest_api',
  'Generate REST API',
  'generate-rest-api',
  'Gera endpoints REST completos com validacao e documentacao automatica.',
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
  'Resume artigos e noticias em portugues com suporte a 11 idiomas.',
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
  'Analisa sentimento de textos em portugues e retorna score de positividade.',
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
`;

function runMigration() {
  console.log('🔄 Executando migration da tabela skills...');
  console.log(`📡 URL: ${SUPABASE_URL}`);

  const url = new URL(`${SUPABASE_URL}/rest/v1/`);
  const body = JSON.stringify({ query: SQL });

  const options = {
    hostname: url.hostname,
    path: '/rest/v1/rpc/exec_sql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'params=single-object'
    }
  };

  // Supabase nao tem endpoint exec_sql direto, vamos usar a approach alternativa:
  // Criar cada recurso via REST API individualmente

  console.log('');
  console.log('⚠️  Supabase REST API nao suporta SQL direto.');
  console.log('');
  console.log('📋 OPCOES PARA CRIAR A TABELA:');
  console.log('');
  console.log('OPCAO 1 - Via Dashboard (Recomendado):');
  console.log('  1. Acesse: https://app.supabase.com');
  console.log('  2. Selecione o projeto: liqutcjzzrqstivvfele');
  console.log('  3. Vá para: SQL Editor');
  console.log('  4. Cole o conteudo de: supabase/migrations/001_create_skills.sql');
  console.log('  5. Clique em RUN');
  console.log('');
  console.log('OPCAO 2 - Via Supabase CLI (se instalado):');
  console.log('  supabase db push');
  console.log('');
  console.log('O arquivo SQL esta pronto em:');
  console.log('  supabase/migrations/001_create_skills.sql');
  console.log('');
  console.log('Apos rodar o SQL, os endpoints estarao disponiveis.');
}

runMigration();
