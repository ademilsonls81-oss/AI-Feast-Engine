-- Create system_snapshots table for the Backup/Rollback system
CREATE TABLE IF NOT EXISTS public.system_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hash TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'push',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.system_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow only admins to manage snapshots
CREATE POLICY "Admins can manage snapshots" 
ON public.system_snapshots 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);
