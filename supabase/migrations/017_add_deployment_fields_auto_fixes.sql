-- ==========================================
-- AUTO_FIXES DEPLOYMENT FIELDS
-- Add CI/CD and deployment tracking fields
-- ==========================================

ALTER TABLE public.auto_fixes 
ADD COLUMN IF NOT EXISTS backup_path TEXT,
ADD COLUMN IF NOT EXISTS fix_pattern TEXT,
ADD COLUMN IF NOT EXISTS validation_status TEXT CHECK (validation_status IN ('passed', 'failed', 'skipped')),
ADD COLUMN IF NOT EXISTS build_output TEXT,
ADD COLUMN IF NOT EXISTS test_output TEXT,
ADD COLUMN IF NOT EXISTS commit_hash TEXT,
ADD COLUMN IF NOT EXISTS deploy_status TEXT CHECK (deploy_status IN ('pending', 'deployed', 'failed', 'skipped')),
ADD COLUMN IF NOT EXISTS deployed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deployed_branch TEXT,
ADD COLUMN IF NOT EXISTS deploy_error TEXT;

-- Indexes for deployment queries
CREATE INDEX IF NOT EXISTS idx_auto_fixes_deploy_status ON public.auto_fixes(deploy_status);
CREATE INDEX IF NOT EXISTS idx_auto_fixes_validation_status ON public.auto_fixes(validation_status);
CREATE INDEX IF NOT EXISTS idx_auto_fixes_deployed_at ON public.auto_fixes(deployed_at DESC);

COMMENT ON COLUMN public.auto_fixes.backup_path IS 'Path to backup before applying fix';
COMMENT ON COLUMN public.auto_fixes.fix_pattern IS 'Pattern used to generate the fix (e.g., regex, ai, manual)';
COMMENT ON COLUMN public.auto_fixes.validation_status IS 'Validation result after fix application';
COMMENT ON COLUMN public.auto_fixes.build_output IS 'Build tool output after applying fix';
COMMENT ON COLUMN public.auto_fixes.test_output IS 'Test suite output after applying fix';
COMMENT ON COLUMN public.auto_fixes.commit_hash IS 'Git commit hash if auto-committed';
COMMENT ON COLUMN public.auto_fixes.deploy_status IS 'Deployment status (pending, deployed, failed, skipped)';
COMMENT ON COLUMN public.auto_fixes.deployed_at IS 'Timestamp when fix was deployed';
COMMENT ON COLUMN public.auto_fixes.deployed_branch IS 'Git branch where fix was deployed';
COMMENT ON COLUMN public.auto_fixes.deploy_error IS 'Deployment error message if failed';