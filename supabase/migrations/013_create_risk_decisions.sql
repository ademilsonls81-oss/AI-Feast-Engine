-- ==========================================
-- AUTONOMOUS SYSTEM v2 — FASE 4
-- Tabela de Decisões de Risco (Risk Decisions)
-- ==========================================
-- Purpose: Stores risk classification decisions for auto-fixes.
-- Used by riskAnalyzer.ts to evaluate whether a fix should be auto-applied
-- or requires human review based on risk level.

CREATE TABLE IF NOT EXISTS public.risk_decisions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auto_fix_id UUID NOT NULL REFERENCES public.auto_fixes(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_score NUMERIC(3, 2) NOT NULL DEFAULT 0,  -- 0.00 - 1.00 composite risk score
  
  -- Risk factors (what contributed to the risk level)
  risk_factors JSONB DEFAULT '{}',  -- { confidence_low: bool, affects_critical_path: bool, has_side_effects: bool, error_frequency: str, rollback_available: bool }
  
  -- Decision
  decision TEXT NOT NULL CHECK (decision IN ('auto_apply', 'require_review', 'block')),
  reasoning TEXT NOT NULL,           -- Why this risk level was assigned
  model_used TEXT DEFAULT 'risk-classifier-v1',
  
  -- Execution tracking
  executed BOOLEAN DEFAULT false,    -- Whether the decision was executed
  executed_at TIMESTAMP WITH TIME ZONE,
  execution_result JSONB,            -- Result of applying/rejecting the fix
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_risk_decisions_auto_fix_id ON public.risk_decisions(auto_fix_id);
CREATE INDEX IF NOT EXISTS idx_risk_decisions_risk_level ON public.risk_decisions(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_decisions_decision ON public.risk_decisions(decision);
CREATE INDEX IF NOT EXISTS idx_risk_decisions_risk_score ON public.risk_decisions(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_risk_decisions_executed ON public.risk_decisions(executed);
CREATE INDEX IF NOT EXISTS idx_risk_decisions_created_at ON public.risk_decisions(created_at DESC);

-- Row Level Security
ALTER TABLE public.risk_decisions ENABLE ROW LEVEL SECURITY;

-- Admins can read
CREATE POLICY "Admins can read risk_decisions" ON public.risk_decisions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Admins can update (review execution results)
CREATE POLICY "Admins can update risk_decisions" ON public.risk_decisions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Service role can insert (autonomous system)
-- No policy needed — service role bypasses RLS

-- Updated_at trigger
CREATE TRIGGER risk_decisions_updated_at
  BEFORE UPDATE ON public.risk_decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comment
COMMENT ON TABLE public.risk_decisions IS 'Risk classification decisions for auto-fixes. Determines whether a fix should be auto-applied, requires review, or is blocked.';
