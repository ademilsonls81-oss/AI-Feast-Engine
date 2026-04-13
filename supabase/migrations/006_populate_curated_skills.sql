-- ==========================================
-- POPULATE HIGH-QUALITY CURATED SKILLS
-- 10 skills manuais cobrindo todas as 5 categorias
-- Todas: verified=true, is_active=true, source='manual'
-- ==========================================

INSERT INTO public.skills (id, name, slug, description, long_description, category, tags, source, verified, is_active, risk_level, install_command, run_command, validation_score) VALUES

-- DEVELOPMENT (2 skills)
(
  'generate_rest_api_v2',
  'Generate REST API',
  'generate-rest-api-v2',
  'Gera endpoints REST completos com validação Zod, documentação OpenAPI e testes automatizados.',
  'Cria uma API REST completa com validação de entrada usando Zod, documentação automática no formato OpenAPI 3.0, e suite de testes com Jest. Suporta TypeScript, Express, Fastify. Inclui middleware de autenticação, rate limiting e logging estruturado.',
  'development',
  ARRAY['api', 'rest', 'backend', 'typescript', 'openapi', 'zod'],
  'manual', true, true, 'low',
  'npx aifeast generate-rest-api-v2',
  'npx aifeast run generate-rest-api-v2',
  0.95
),
(
  'code_reviewer',
  'Code Reviewer',
  'code-reviewer',
  'Revisão automática de código com detecção de bugs, security issues e sugestões de performance.',
  'Analisa trechos de código em Python, JavaScript, TypeScript, Java e Go. Detecta bugs potenciais, vulnerabilidades de segurança (OWASP Top 10), code smells e sugere refatorações. Gera relatório com severidade e prioridade.',
  'development',
  ARRAY['review', 'security', 'code-quality', 'python', 'javascript'],
  'manual', true, true, 'low',
  'npx aifeast code-reviewer',
  'npx aifeast run code-reviewer',
  0.92
),

-- CONTENT (2 skills)
(
  'summarize_article_v2',
  'Summarize Article',
  'summarize-article-v2',
  'Resume artigos e notícias em português com suporte a 11 idiomas e detecção de viés.',
  'Extrai conteúdo de URLs, remove boilerplate e gera resumos concisos em português. Suporta tradução para 11 idiomas simultaneamente. Inclui detecção de viés editorial e classificação de tom (neutro, positivo, negativo). Ideal para curadoria de conteúdo e monitoramento de mídia.',
  'content',
  ARRAY['summary', 'translation', 'bias-detection', 'multilingual', 'news'],
  'manual', true, true, 'low',
  'npx aifeast summarize-article-v2',
  'npx aifeast run summarize-article-v2',
  0.93
),
(
  'blog_post_generator',
  'Blog Post Generator',
  'blog-post-generator',
  'Gera posts de blog completos com SEO optimization, meta tags e estrutura de headings.',
  'Cria posts de blog profissionais baseados em um tópico. Inclui: título otimizado para SEO, meta description, estrutura H1/H2/H3, parágrafos bem organizados, call-to-action e sugestões de tags. Suporta tom formal, informal e técnico.',
  'content',
  ARRAY['blog', 'seo', 'writing', 'marketing', 'content'],
  'manual', true, true, 'low',
  'npx aifeast blog-post-generator',
  'npx aifeast run blog-post-generator',
  0.90
),

-- AUTOMATION (2 skills)
(
  'workflow_automator',
  'Workflow Automator',
  'workflow-automator',
  'Cria workflows automatizados conectando APIs, webhooks e triggers cron.',
  'Monta pipelines de automação conectando múltiplos serviços: APIs REST, webhooks, agendamentos cron, filas de mensagens. Suporta condições, loops, retry com backoff exponencial e notificações. Exporta como YAML ou JSON para versionamento.',
  'automation',
  ARRAY['workflow', 'cron', 'webhook', 'pipeline', 'integration'],
  'manual', true, true, 'low',
  'npx aifeast workflow-automator',
  'npx aifeast run workflow-automator',
  0.88
),
(
  'data_pipeline_builder',
  'Data Pipeline Builder',
  'data-pipeline-builder',
  'Constrói pipelines ETL com extração, transformação e carregamento em múltiplos formatos.',
  'Cria pipelines ETL completos: extrai dados de APIs, CSV, JSON, bancos SQL/NoSQL; transforma com filtros, joins, agregações; carrega em destino final com validação de schema. Inclui monitoring, alertas e retry automático.',
  'automation',
  ARRAY['etl', 'data', 'pipeline', 'csv', 'json', 'sql'],
  'manual', true, true, 'low',
  'npx aifeast data-pipeline-builder',
  'npx aifeast run data-pipeline-builder',
  0.87
),

-- ANALYSIS (2 skills)
(
  'analyze_sentiment_v2',
  'Analyze Sentiment',
  'analyze-sentiment-v2',
  'Analisa sentimento de textos em português com score de positividade e detecção de emoções.',
  'Classifica sentimento em 5 níveis: muito negativo, negativo, neutro, positivo, muito positivo. Detecta emoções específicas (alegria, raiva, medo, surpresa, tristeza). Suporta análise de documentos longos com segmentação por parágrafo. Retorna score numérico e explicação.',
  'analysis',
  ARRAY['sentiment', 'emotion', 'nlp', 'portuguese', 'text-analysis'],
  'manual', true, true, 'low',
  'npx aifeast analyze-sentiment-v2',
  'npx aifeast run analyze-sentiment-v2',
  0.91
),
(
  'trend_analyzer',
  'Trend Analyzer',
  'trend-analyzer',
  'Analisa tendências em séries temporais e dados estruturados com projeções.',
  'Identifica padrões em dados temporais: tendências, sazonalidade, anomalias. Gera projeções com intervalos de confiança. Suporta dados de vendas, tráfego web, métricas de redes sociais. Exporta gráficos em SVG e PNG.',
  'analysis',
  ARRAY['trends', 'timeseries', 'forecast', 'anomaly-detection', 'statistics'],
  'manual', true, true, 'low',
  'npx aifeast trend-analyzer',
  'npx aifeast run trend-analyzer',
  0.89
),

-- SECURITY (2 skills)
(
  'dependency_auditor',
  'Dependency Auditor',
  'dependency-auditor',
  'Audita dependências de projetos buscando vulnerabilidades conhecidas (CVEs) e sugestões de atualização.',
  'Escaneia package.json, requirements.txt, Gemfile, go.mod em busca de dependências com vulnerabilidades CVE conhecidas. Classifica por severidade (critical, high, medium, low). Sugere versões seguras e alternativas. Gera relatório em JSON e markdown.',
  'security',
  ARRAY['dependencies', 'cve', 'vulnerability', 'npm', 'python', 'audit'],
  'manual', true, true, 'low',
  'npx aifeast dependency-auditor',
  'npx aifeast run dependency-auditor',
  0.94
),
(
  'secret_scanner',
  'Secret Scanner',
  'secret-scanner',
  'Escaneia código-fonte em busca de secrets expostos: API keys, tokens, senhas e certificados.',
  'Detecta mais de 50 tipos de secrets: AWS keys, GitHub tokens, Stripe keys, Slack webhooks, passwords hardcoded, JWT secrets, certificates. Suporta Git history scan. Classifica por tipo e severidade. Gera relatório com localização exata no código.',
  'security',
  ARRAY['secrets', 'api-keys', 'tokens', 'scan', 'leak-prevention'],
  'manual', true, true, 'low',
  'npx aifeast secret-scanner',
  'npx aifeast run secret-scanner',
  0.96
)

ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- Ativar skills do GitHub com score >= 0.7 que estejam inativas
-- ==========================================

UPDATE public.skills
SET is_active = true
WHERE source = 'github'
  AND is_active = false
  AND validation_score >= 0.7;

-- ==========================================
-- Relatório de ativação
-- ==========================================

SELECT 
  COUNT(*) as total_active,
  COUNT(*) FILTER (WHERE verified = true) as verified_count,
  COUNT(*) FILTER (WHERE source = 'github') as github_count,
  COUNT(*) FILTER (WHERE source = 'manual') as manual_count,
  category,
  COUNT(*) FILTER (WHERE category = cat.category) as per_category
FROM public.skills cat
WHERE is_active = true
GROUP BY category
ORDER BY category;
