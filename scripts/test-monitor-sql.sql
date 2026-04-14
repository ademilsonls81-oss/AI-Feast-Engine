-- ==========================================
-- AUTONOMOUS SYSTEM v2 — FASE 2 TEST
-- Execute este script no SQL Editor do Supabase
-- ==========================================

-- Passo 1: Inserir 5 erros de teste
INSERT INTO system_errors (error_type, source, message, severity, endpoint, http_status, metadata)
VALUES 
  ('api_error', 'server', 'Test error 1 — Monitor validation', 'error', '/api/feed', 500, '{"test": true}'::jsonb),
  ('api_error', 'server', 'Test error 2 — Monitor validation', 'error', '/api/stripe-webhook', 503, '{"test": true}'::jsonb),
  ('db_error', 'webhook', 'Test error 3 — Monitor validation', 'error', '/api/feed', 500, '{"test": true}'::jsonb),
  ('timeout', 'stripe', 'Test error 4 — Monitor validation', 'error', '/api/create-checkout-session', 500, '{"test": true}'::jsonb),
  ('webhook_error', 'server', 'Test error 5 — Monitor validation (CRITICAL)', 'critical', '/api/stripe-webhook', 400, '{"test": true}'::jsonb);

-- Passo 2: Verificar inserção
SELECT id, error_type, source, severity, message, created_at
FROM system_errors
WHERE metadata->>'test' = 'true'
ORDER BY created_at DESC;

-- Passo 3: Contar erros na última hora (deve retornar 5)
SELECT COUNT(*) AS error_count
FROM system_errors
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Passo 4: Limpar erros de teste (após validação)
-- DELETE FROM system_errors WHERE metadata->>'test' = 'true';
