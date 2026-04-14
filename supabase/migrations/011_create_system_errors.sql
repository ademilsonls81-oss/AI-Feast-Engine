-- ==========================================
-- AUTONOMOUS SYSTEM v2 — FASE 0
-- Tabela de Erros do Sistema (System Errors)
-- ==========================================
-- Purpose: Centralized error logging for autonomous monitoring.
-- All errors (API failures, DB timeouts, webhook failures, etc.)
-- are logged here for threshold analysis and auto-diagnosis.

CREATE TABLE IF NOT EXISTS public.system_errors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  error_type TEXT NOT NULL,           -- 'api_error', 'db_error', 'webhook_error', 'timeout', 'rate_limit', 'auth_error', 'unknown'
  source TEXT NOT NULL,               -- 'server', 'cron', 'webhook', 'skill_import', 'stripe', 'queue'
  message TEXT NOT NULL,              -- Human-readable error message
  stack_trace TEXT,                   -- Full stack trace (if available)
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  endpoint TEXT,                      -- API endpoint where error occurred (if applicable)
  http_status INTEGER,                -- HTTP status code (if applicable)
  retry_count INTEGER DEFAULT 0,      -- Number of retries attempted
  resolved BOOLEAN DEFAULT false,     -- Whether the error has been investigated/resolved
  metadata JSONB DEFAULT '{}',        -- Additional context (request body, user_id, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_errors_created_at ON public.system_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_errors_type ON public.system_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_system_errors_severity ON public.system_errors(severity);
CREATE INDEX IF NOT EXISTS idx_system_errors_resolved ON public.system_errors(resolved);
CREATE INDEX IF NOT EXISTS idx_system_errors_source ON public.system_errors(source);

-- Composite index for the monitor's hourly query
CREATE INDEX IF NOT EXISTS idx_system_errors_hourly ON public.system_errors(created_at, severity) WHERE severity IN ('error', 'critical');

-- Row Level Security
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;

-- Allow service role (backend) full access
-- No RLS policies needed for service_role key — it bypasses RLS automatically.
-- For admin users to read errors:
CREATE POLICY "Admins can read system_errors" ON public.system_errors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- For admin users to resolve errors:
CREATE POLICY "Admins can update system_errors" ON public.system_errors
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Comment
COMMENT ON TABLE public.system_errors IS 'Centralized error log for autonomous system monitoring. Used by monitor.ts for threshold detection.';
