-- ==========================================
-- SCHEMA INITIALIZATION FOR AI-FEAST-ENGINE
-- ==========================================

-- Enable the uuid-ossp extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabelas

-- Tabela de Usuários (Estendendo a tabela auth.users do Supabase)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  usage_count INTEGER DEFAULT 0,
  rate_limit INTEGER DEFAULT 10,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Feeds (Fontes RSS)
CREATE TABLE public.feeds (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  category TEXT DEFAULT 'General',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Posts (Notícias processadas)
CREATE TABLE public.posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  link TEXT NOT NULL UNIQUE,
  pub_date TEXT,
  summary TEXT,
  translations JSONB,
  source_id UUID REFERENCES public.feeds(id),
  category TEXT DEFAULT 'General',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'published', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for status to speed up queries
CREATE INDEX idx_posts_status ON public.posts(status);


-- Tabela de Logs de Uso da API
CREATE TABLE public.usage_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  endpoint TEXT NOT NULL,
  cost NUMERIC DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Regras para `users`
-- O usuário pode ler o próprio perfil, e admins podem ler tudo.
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Para inserção, o backend via trigger ou requisição de service_role será responsável. 
-- Mas podemos permitir que o próprio usuário insira o perfil dele (no primeiro login).
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Regras para `feeds`
-- Leitura pública ou autenticada, apenas admin pode escrever
CREATE POLICY "Anyone can read feeds" ON public.feeds
  FOR SELECT USING (true); -- Depende do negócio, aqui abrimos para selects

-- Regras para `posts`
-- Leitura pública para listar na API
CREATE POLICY "Anyone can read posts" ON public.posts
  FOR SELECT USING (true);

-- Regras para `usage_logs`
-- Usuários podem ler seus próprios logs
CREATE POLICY "Users can read own logs" ON public.usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Notas:
-- 1. O backend usando a "Service Role Key" (segredo de serviço) fará bypass nas políticas de RLS e será responsável
--    por inserir os posts, feeds via admin e gravar usage_logs.
-- 2. No caso dos feeds e outras configurações administrativas, você pode reforçar o RLS de admin checando o 'role' da tabela users.

-- Função utilitária: Trigger para auto-criar 'usuario' na tabela publica quando alguém cadastra no auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, api_key)
  VALUES (
    new.id, 
    new.email, 
    'af_' || md5(random()::text || clock_timestamp()::text) -- Gera api_key baseada no UUID
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tabela de Logs de Auditoria [NOVA]
CREATE TABLE public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
