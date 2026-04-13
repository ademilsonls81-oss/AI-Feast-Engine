-- Adiciona coluna onboarding_done à tabela users
-- Default false para usuários existentes (eles verão o modal uma vez)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN DEFAULT false;

-- Usuários com api_key já gerada podem ter onboarding como feito
UPDATE users SET onboarding_done = true WHERE api_key IS NOT NULL AND api_key != '';
