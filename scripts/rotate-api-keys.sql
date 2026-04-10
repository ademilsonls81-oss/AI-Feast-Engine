-- =====================================================
-- AI FEAST ENGINE - Security: Rotate All API Keys
-- =====================================================
-- Execute este SQL no Supabase SQL Editor para rotacionar
-- todas as chaves de API dos usuários.
-- 
-- IMPORTANTE: Execute em horário de baixa demanda!
-- Todos os usuários precisarão atualizar suas chaves.
-- =====================================================

-- 1. Backup das chaves atuais (opcional - para auditoria)
-- Descomente se quiser manter um backup temporário
-- CREATE TABLE IF NOT EXISTS api_keys_backup AS 
-- SELECT id, api_key, updated_at FROM users WHERE api_key IS NOT NULL;

-- 2. Gerar novas chaves para todos os usuários
-- Formato: af_<64 caracteres hex>
UPDATE users 
SET 
  api_key = 'af_' || encode(gen_random_bytes(32), 'hex'),
  updated_at = NOW()
WHERE api_key IS NOT NULL;

-- 3. Gerar chaves para usuários sem chave
UPDATE users 
SET 
  api_key = 'af_' || encode(gen_random_bytes(32), 'hex'),
  updated_at = NOW()
WHERE api_key IS NULL;

-- 4. Verificar se todas as chaves foram atualizadas
SELECT 
  COUNT(*) as total_users,
  COUNT(api_key) as users_with_key,
  COUNT(*) - COUNT(api_key) as users_without_key
FROM users;

-- 5. Verificar chaves duplicadas (deve retornar 0)
SELECT api_key, COUNT(*) as duplicate_count
FROM users
GROUP BY api_key
HAVING COUNT(*) > 1;

-- =====================================================
-- ROTAÇÃO DE CHAVES SUPABASE (Service Role & Anon)
-- =====================================================
-- Para rotacionar as chaves do Supabase:
-- 1. Acesse: https://app.supabase.com/project/_/settings/api
-- 2. Em "Project API keys", clique em "Regenerate" na Service Role Key
-- 3. Copie a NOVA chave e atualize imediatamente:
--    - Render Dashboard → Environment Variables
--    - SUPABASE_SERVICE_ROLE_KEY=<nova_chave>
-- 4. A Anon Key (VITE_SUPABASE_ANON_KEY) pode ser regenerada
--    da mesma forma, mas requer redeploy do Frontend (Vercel)
-- =====================================================

-- =====================================================
-- ÍNDICES DE PERFORMANCE (se ainda não existirem)
-- =====================================================
-- Criar índices para melhorar performance das queries
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
-- Mostrar estatísticas do banco
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM users WHERE plan = 'pro') as pro_users,
  (SELECT COUNT(*) FROM users WHERE plan = 'free') as free_users,
  (SELECT COUNT(*) FROM posts WHERE status = 'published') as published_posts,
  (SELECT COUNT(*) FROM posts WHERE status = 'pending') as pending_posts,
  (SELECT COUNT(*) FROM posts WHERE status = 'error') as error_posts,
  (SELECT COUNT(*) FROM feeds) as total_feeds;
