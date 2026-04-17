-- ==========================================
-- MIGRATION: Add missing columns and tables
-- Run this in Supabase SQL editor
-- ==========================================

-- 1. Add usage_limit to users table (was missing from schema)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS usage_limit INTEGER DEFAULT 100;

-- Set Pro users to 10000 limit
UPDATE public.users SET usage_limit = 10000 WHERE plan = 'pro';

-- 2. Ensure skills table has all required columns
ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS validation_score NUMERIC DEFAULT 0.85,
  ADD COLUMN IF NOT EXISTS downloads INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS long_description TEXT,
  ADD COLUMN IF NOT EXISTS install_command TEXT,
  ADD COLUMN IF NOT EXISTS run_command TEXT,
  ADD COLUMN IF NOT EXISTS input_schema JSONB,
  ADD COLUMN IF NOT EXISTS output_schema JSONB,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_skills_is_active ON public.skills(is_active);
CREATE INDEX IF NOT EXISTS idx_skills_category ON public.skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_verified ON public.skills(verified);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON public.users(api_key);

-- 3. RLS for skills table (if not existing)  
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can read active skills" ON public.skills
  FOR SELECT USING (is_active = true);

-- 4. system_errors table (referenced in server but may be missing)
CREATE TABLE IF NOT EXISTS public.system_errors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  error_type TEXT NOT NULL,
  source TEXT,
  message TEXT NOT NULL,
  stack_trace TEXT,
  severity TEXT DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  endpoint TEXT,
  http_status INTEGER,
  retry_count INTEGER DEFAULT 0,
  resolved BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admins can read system errors" ON public.system_errors
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- 5. auto_fixes table
CREATE TABLE IF NOT EXISTS public.auto_fixes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  error_id UUID REFERENCES public.system_errors(id),
  fix_type TEXT NOT NULL,
  description TEXT,
  before_state JSONB,
  after_state JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'failed', 'rolled_back')),
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.auto_fixes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admins can read auto fixes" ON public.auto_fixes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- 6. risk_decisions table
CREATE TABLE IF NOT EXISTS public.risk_decisions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  context TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  decision TEXT NOT NULL CHECK (decision IN ('proceed', 'warn', 'block', 'escalate')),
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.risk_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admins can read risk decisions" ON public.risk_decisions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- 7. skill_import_logs table
CREATE TABLE IF NOT EXISTS public.skill_import_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trigger TEXT DEFAULT 'manual',
  dry_run BOOLEAN DEFAULT false,
  discovered INTEGER DEFAULT 0,
  extracted INTEGER DEFAULT 0,
  approved INTEGER DEFAULT 0,
  inserted INTEGER DEFAULT 0,
  updated INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  errors JSONB,
  details JSONB,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.skill_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admins can read import logs" ON public.skill_import_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- 8. Update handle_new_user trigger to include usage_limit
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, api_key, usage_limit)
  VALUES (
    new.id,
    new.email,
    'af_' || encode(gen_random_bytes(24), 'hex'),
    100
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
