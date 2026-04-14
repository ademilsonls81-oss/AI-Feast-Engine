-- ==========================================
-- AUTONOMOUS SYSTEM v2 — FASE 8
-- Deploy tracking fields for auto_fixes
-- ==========================================
-- Purpose: Add deployment tracking fields for the auto-deploy phase.
-- Adds commit_hash, deploy_status, deployed_at, and deployed_branch columns.

-- Add new columns to auto_fixes
ALTER TABLE public.auto_fixes ADD COLUMN IF NOT EXISTS commit_hash TEXT;
ALTER TABLE public.auto_fixes ADD COLUMN IF NOT EXISTS deploy_status TEXT CHECK (deploy_status IN ('pending', 'deployed', 'failed', 'skipped'));
ALTER TABLE public.auto_fixes ADD COLUMN IF NOT EXISTS deployed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.auto_fixes ADD COLUMN IF NOT EXISTS deployed_branch TEXT;
ALTER TABLE public.auto_fixes ADD COLUMN IF NOT EXISTS deploy_error TEXT;

-- Add index for new columns
CREATE INDEX IF NOT EXISTS idx_auto_fixes_deploy_status ON public.auto_fixes(deploy_status);
CREATE INDEX IF NOT EXISTS idx_auto_fixes_commit_hash ON public.auto_fixes(commit_hash);

-- Comment
COMMENT ON COLUMN public.auto_fixes.commit_hash IS 'Git commit hash of the deployed fix';
COMMENT ON COLUMN public.auto_fixes.deploy_status IS 'Status of the automatic deployment';
COMMENT ON COLUMN public.auto_fixes.deployed_at IS 'Timestamp when the fix was deployed';
COMMENT ON COLUMN public.auto_fixes.deployed_branch IS 'Branch where the fix was deployed';
COMMENT ON COLUMN public.auto_fixes.deploy_error IS 'Error message if deployment failed';
