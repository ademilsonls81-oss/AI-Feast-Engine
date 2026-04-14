-- ==========================================
-- AUTONOMOUS SYSTEM v2 — FASE 5
-- Melhorias em auto_fixes para Auto-Fixer
-- ==========================================
-- Purpose: Add execution tracking fields for the auto-fixer phase.
-- Adds backup_path, fix_pattern, and validation_status columns.

-- Add new columns to auto_fixes
ALTER TABLE public.auto_fixes ADD COLUMN IF NOT EXISTS backup_path TEXT;
ALTER TABLE public.auto_fixes ADD COLUMN IF NOT EXISTS fix_pattern TEXT;
ALTER TABLE public.auto_fixes ADD COLUMN IF NOT EXISTS validation_status TEXT CHECK (validation_status IN ('passed', 'failed', 'skipped'));
ALTER TABLE public.auto_fixes ADD COLUMN IF NOT EXISTS build_output TEXT;
ALTER TABLE public.auto_fixes ADD COLUMN IF NOT EXISTS test_output TEXT;

-- Add index for new columns
CREATE INDEX IF NOT EXISTS idx_auto_fixes_validation_status ON public.auto_fixes(validation_status);
CREATE INDEX IF NOT EXISTS idx_auto_fixes_fix_pattern ON public.auto_fixes(fix_pattern);

-- Comment
COMMENT ON COLUMN public.auto_fixes.backup_path IS 'Path to the backup file created before auto-fix';
COMMENT ON COLUMN public.auto_fixes.fix_pattern IS 'Name of the fix pattern that was applied';
COMMENT ON COLUMN public.auto_fixes.validation_status IS 'Result of build+test validation after auto-fix';
COMMENT ON COLUMN public.auto_fixes.build_output IS 'Build output after applying the fix';
COMMENT ON COLUMN public.auto_fixes.test_output IS 'Test output after applying the fix';
