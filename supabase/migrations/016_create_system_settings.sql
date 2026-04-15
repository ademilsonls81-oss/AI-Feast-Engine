-- ==========================================
-- SYSTEM SETTINGS TABLE
-- Key-value store for autonomous system configuration
-- Used by Admin panel to toggle features on/off
-- ==========================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- RLS: Only authenticated users can read, only admins can write
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Anyone with a user account can read settings
CREATE POLICY "Users can read system_settings" ON public.system_settings
  FOR SELECT USING (true);

-- Only service role (backend) can insert/update - for security
-- This bypasses RLS for the backend API

-- Initialize default values
INSERT INTO public.system_settings (key, value, description) VALUES
  ('autonomous_enabled', true, 'Master kill switch for autonomous ingestion and auto-fix system'),
  ('error_threshold_count', 10, 'Number of errors in 1 hour before triggering auto-diagnosis'),
  ('error_threshold_severity', 'error', 'Minimum severity to trigger diagnosis (info|warning|error|critical)')
ON CONFLICT (key) DO NOTHING;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_settings_updated_at();