-- ==========================================
-- FIX: Row Level Security (RLS) para tabela skills
-- Fase 2 — Alto
-- ==========================================
-- Executar no Supabase SQL Editor para garantir que
-- a tabela skills tenha políticas de acesso seguras.

-- 1. Ativar RLS na tabela skills
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

-- 2. Policy: leitura pública apenas de skills ativas
-- Qualquer pessoa (autenticada ou não) pode ler skills ativas
CREATE POLICY IF NOT EXISTS "Public can read active skills"
ON skills FOR SELECT
USING (is_active = true);

-- 3. Policy: apenas service_role pode inserir/atualizar/deletar
-- Protege contra escrita direta por clientes não autorizados
CREATE POLICY IF NOT EXISTS "Service role full access"
ON skills FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
