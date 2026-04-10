export interface UserProfile {
  id: string;
  email: string;
  api_key: string;
  stripe_customer_id?: string;
  plan: 'free' | 'pro';
  usage_count: number;
  rate_limit: number;
  role: 'user' | 'admin';
  created_at: string;
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
  pub_date: string;
  summary: string;
  translations: Record<string, string>;
  source_id: string;
  category: string;
  status: 'pending' | 'processing' | 'published' | 'error' | 'failed';
  error_message?: string;
  retry_count?: number;
  created_at: string;
  content_raw?: string;
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
