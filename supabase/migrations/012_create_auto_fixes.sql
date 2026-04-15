-- ==========================================
-- AUTONOMOUS SYSTEM v2 — FASE 3
-- Tabela de Diagnósticos Automáticos (Auto Fixes)
-- ==========================================
-- Purpose: Stores AI-generated diagnosis results and auto-fix suggestions.
-- Used by diagnostician.ts to persist diagnosis outcomes.

CREATE TABLE IF NOT EXISTS public.auto_fixes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  error_ids UUID[],                       -- IDs of the system_errors that triggered this diagnosis
  cause TEXT NOT NULL,                     -- Root cause analysis from IA
  fix TEXT NOT NULL,                       -- Suggested code fix
  confidence NUMERIC(3, 2) DEFAULT 0,     -- IA confidence level (0.00 - 1.00)
  affected_files TEXT[] DEFAULT '{}',      -- Probable files where the error occurs
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'applied', 'rejected', 'auto_applied')),
  applied_by TEXT,                         -- Who/what applied the fix (user email or 'autonomous-system')
  applied_at TIMESTAMP WITH TIME ZONE,     -- When the fix was applied
  review_notes TEXT,                       -- Notes from human reviewer
  raw_ia_response TEXT,                    -- Full IA response (for debugging)
  model_used TEXT DEFAULT 'llama-3.1-8b-instant',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_auto_fixes_status ON public.auto_fixes(status);
CREATE INDEX IF NOT EXISTS idx_auto_fixes_confidence ON public.auto_fixes(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_auto_fixes_created_at ON public.auto_fixes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_fixes_error_ids ON public.auto_fixes USING GIN(error_ids);

-- Row Level Security
ALTER TABLE public.auto_fixes ENABLE ROW LEVEL SECURITY;

-- Admins can read
CREATE POLICY "Admins can read auto_fixes" ON public.auto_fixes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Admins can update (review, apply, reject)
CREATE POLICY "Admins can update auto_fixes" ON public.auto_fixes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_fixes_updated_at
  BEFORE UPDATE ON public.auto_fixes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comment
COMMENT ON TABLE public.auto_fixes IS 'AI-generated diagnosis results and auto-fix suggestions. Created by diagnostician.ts when error threshold is exceeded.';
