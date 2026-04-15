export interface UserProfile {
  id: string;
  email: string;
  api_key: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  plan: 'free' | 'pro';
  usage_count: number;
  rate_limit: number;
  role: 'user' | 'admin';
  created_at: string;
  onboarding_done?: boolean;
}

export interface FeedSource {
  id: string;
  name: string;
  url: string;
  category: string;
  created_at: string;
}

export interface Post {
  id: string;
  title: string;
  link: string;
  pub_date?: string;
  summary?: string;
  translations?: Record<string, string>;
  source_id?: string;
  category?: string;
  status: 'pending' | 'processing' | 'published' | 'error';
  error_message?: string;
  retry_count: number;
  content_raw?: string;
  created_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string;
  endpoint: string;
  cost: number;
  timestamp: string;
}

export interface AppStats {
  postsCount: number;
  feedsCount: number;
  languages: number;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  description?: string;
  long_description?: string;
  category: 'development' | 'content' | 'automation' | 'analysis' | 'security';
  tags?: string[];
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  code?: string;
  install_command?: string;
  run_command?: string;
  risk_level?: string;
  verified: boolean;
  downloads: number;
  is_active: boolean;
  source?: string;
  repo_url?: string;
  stars?: number;
  validation_score?: number;
  created_at: string;
  updated_at?: string;
}

export interface RiskDecision {
  id: string;
  auto_fix_id: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  risk_factors?: Record<string, unknown>;
  decision: 'auto_apply' | 'require_review' | 'block';
  reasoning?: string;
  model_used?: string;
  executed: boolean;
  executed_at?: string;
  execution_result?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
