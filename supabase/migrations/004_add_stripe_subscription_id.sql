-- Migration: Add stripe_subscription_id to users table
-- Date: 2026-04-14

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Index for faster lookups by subscription ID
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON public.users(stripe_subscription_id);
