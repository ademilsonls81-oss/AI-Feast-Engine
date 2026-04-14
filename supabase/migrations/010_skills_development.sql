-- ==========================================
-- SKILL SEED: Bloco 1/5 — DEVELOPMENT (50 skills)
-- ==========================================

INSERT INTO public.skills (id, name, slug, description, long_description, category, tags, source, verified, is_active, risk_level, validation_score, install_command, run_command) VALUES

-- 1. AI Engineer
('ai_engineer', 'AI Engineer', 'ai-engineer',
'Implementa features de IA/ML, integra LLMs e constrói sistemas de recomendação.',
'Agente especializado em implementar funcionalidades de IA e machine learning em aplicações. Integra modelos LLM via APIs (OpenAI, Groq, Anthropic), constrói sistemas de recomendação, pipelines de dados e automação inteligente. Foca em otimização de custos, boas práticas de produção e monitoramento de modelos.',
'development', ARRAY['ai', 'ml', 'llm', 'recommendation', 'pipeline'],
'manual', true, true, 'low', 0.97,
'npx aifeast ai-engineer', 'npx aifeast run ai-engineer'),

-- 2. Backend Architect
('backend_architect', 'Backend Architect', 'backend-architect',
'Design de APIs RESTful, GraphQL, lógica server-side e arquitetura de microsserviços.',
'Especialista em arquitetura de sistemas backend. Projeta APIs RESTful e GraphQL, define estruturas de banco de dados relacionais e NoSQL, implementa padrões de microsserviços, circuit breakers, message queues e event sourcing. Prioriza segurança, performance e escalabilidade horizontal.',
'development', ARRAY['api', 'backend', 'microservices', 'graphql', 'database'],
'manual', true, true, 'low', 0.96,
'npx aifeast backend-architect', 'npx aifeast run backend-architect'),

-- 3. Frontend Developer
('frontend_developer', 'Frontend Developer', 'frontend-developer',
'Construção de interfaces com React, Vue, Angular e otimização de performance web.',
'Desenvolvedor frontend especializado em frameworks modernos (React, Vue, Angular, Svelte). Constrói componentes reutilizáveis, gerencia estado global, implementa SSR/SSG, otimiza Core Web Vitals, garante acessibilidade WCAG e cria experiências responsivas e performáticas.',
'development', ARRAY['react', 'vue', 'angular', 'frontend', 'ui'],
'manual', true, true, 'low', 0.95,
'npx aifeast frontend-developer', 'npx aifeast run frontend-developer'),

-- 4. Mobile App Builder
('mobile_app_builder', 'Mobile App Builder', 'mobile-app-builder',
'Desenvolvimento nativo iOS/Android e cross-platform com React Native e Flutter.',
'Especialista em desenvolvimento mobile nativo (Swift, Kotlin) e cross-platform (React Native, Flutter). Cria interfaces nativas, integra APIs do dispositivo (câmera, GPS, push notifications), otimiza performance e prepara apps para publicação nas stores.',
'development', ARRAY['mobile', 'ios', 'android', 'react-native', 'flutter'],
'manual', true, true, 'low', 0.94,
'npx aifeast mobile-app-builder', 'npx aifeast run mobile-app-builder'),

-- 5. DevOps Automator
('devops_automator', 'DevOps Automator', 'devops-automator',
'Configura pipelines CI/CD, IaC com Terraform, Docker e monitoramento de infraestrutura.',
'Engenheiro DevOps para automatizar todo o ciclo de vida de deploy. Configura pipelines CI/CD (GitHub Actions, GitLab CI, Jenkins), infraestrutura como código (Terraform, Pulumi), orquestração de containers (Docker, Kubernetes), monitoring (Prometheus, Grafana) e alertas.',
'development', ARRAY['devops', 'cicd', 'docker', 'terraform', 'kubernetes'],
'manual', true, true, 'low', 0.96,
'npx aifeast devops-automator', 'npx aifeast run devops-automator'),

-- 6. Code Reviewer
('code_reviewer_pro', 'Code Reviewer Pro', 'code-reviewer-pro',
'Revisão profunda de código com detecção de bugs, security issues e code smells.',
'Revisor de código automatizado que analisa trechos em Python, JavaScript, TypeScript, Java, Go e Rust. Detecta bugs potenciais, vulnerabilidades OWASP Top 10, code smells, complexidade ciclomática e sugere refatorações. Gera relatório com severidade, prioridade e exemplos de correção.',
'development', ARRAY['review', 'security', 'code-quality', 'bugs', 'refactoring'],
'manual', true, true, 'low', 0.97,
'npx aifeast code-reviewer-pro', 'npx aifeast run code-reviewer-pro'),

-- 7. Test Automation Expert
('test_automation_expert', 'Test Automation Expert', 'test-automation-expert',
'Escreve, executa e analisa testes unitários, integração e E2E com cobertura total.',
'Especialista em automação de testes para JavaScript, Python, Java e Go. Escreve testes unitários (Jest, pytest, JUnit), testes de integração, testes E2E (Playwright, Cypress, Selenium), configura cobertura de código mínima, analisa falhas e corrige suites de teste automaticamente.',
'development', ARRAY['testing', 'jest', 'pytest', 'e2e', 'coverage'],
'manual', true, true, 'low', 0.95,
'npx aifeast test-automation-expert', 'npx aifeast run test-automation-expert'),

-- 8. Database Designer
('database_designer', 'Database Designer', 'database-designer',
'Design de schemas SQL/NoSQL, otimização de queries e modelagem de dados.',
'Arquiteto de bancos de dados que projeta schemas relacionais (PostgreSQL, MySQL) e NoSQL (MongoDB, Redis). Otimiza queries com EXPLAIN ANALYZE, cria índices estratégicos, define constraints, normaliza/desnormaliza conforme caso de uso e planeja estratégias de migração e backup.',
'development', ARRAY['database', 'sql', 'nosql', 'optimization', 'schema'],
'manual', true, true, 'low', 0.94,
'npx aifeast database-designer', 'npx aifeast run database-designer'),

-- 9. API Designer
('api_designer', 'API Designer', 'api-designer',
'Design de APIs RESTful com OpenAPI/Swagger, versionamento e documentação.',
'Designer de APIs que cria especificações OpenAPI 3.0 completas, define endpoints, schemas de request/response, códigos de status, versionamento (URL, header), paginação, filtros, rate limiting e gera documentação interativa com Swagger UI e redoc.',
'development', ARRAY['api', 'rest', 'openapi', 'swagger', 'documentation'],
'manual', true, true, 'low', 0.95,
'npx aifeast api-designer', 'npx aifeast run api-designer'),

-- 10. Rapid Prototyper
('rapid_prototyper', 'Rapid Prototyper', 'rapid-prototyper',
'Cria MVPs e provas de conceito em ciclos curtos com scaffolding automático.',
'Prototipador rápido que gera scaffolding de projetos completos (frontend + backend + DB) em minutos. Cria MVPs funcionais com autenticação, CRUD básico, deploy configurado e documentação. Ideal para validação de mercado e demonstração de conceitos para stakeholders.',
'development', ARRAY['mvp', 'prototype', 'scaffolding', 'boilerplate', 'starter'],
'manual', true, true, 'low', 0.93,
'npx aifeast rapid-prototyper', 'npx aifeast run rapid-prototyper'),

-- 11. Regex Expert
('regex_expert', 'Regex Expert', 'regex-expert',
'Cria, testa e otimiza expressões regulares complexas para validação e extração.',
'Especialista em expressões regulares que cria patterns para validação de email, telefone, CPF, URLs, extração de dados de texto log, parsing de HTML/XML, tokenização e transformação de strings. Fornece explicações detalhadas de cada grupo e testes automatizados.',
'development', ARRAY['regex', 'validation', 'parsing', 'patterns', 'extraction'],
'manual', true, true, 'low', 0.92,
'npx aifeast regex-expert', 'npx aifeast run regex-expert'),

-- 12. Git Conventional Commits
('git_conventional_commits', 'Git Conventional Commits', 'git-conventional-commits',
'Padroniza mensagens de commit com Conventional Commits e gera changelogs.',
'Especialista em versionamento semântico e Conventional Commits. Padroniza mensagens de commit (feat, fix, docs, style, refactor, test, chore), gera changelogs automáticos, configura commit hooks (husky, commitlint) e integra com CI/CD para versionamento automático.',
'development', ARRAY['git', 'commits', 'changelog', 'semver', 'versioning'],
'manual', true, true, 'low', 0.93,
'npx aifeast git-conventional-commits', 'npx aifeast run git-conventional-commits'),

-- 13. Cloud Architect
('cloud_architect', 'Cloud Architect', 'cloud-architect',
'Arquitetura de soluções em AWS, GCP e Azure com foco em custo e escalabilidade.',
'Arquiteto de cloud que projeta soluções escaláveis em AWS, GCP e Azure. Define estratégias de deploy (blue-green, canary), configura auto-scaling, load balancing, CDN, storage otimizado e estima custos mensais. Aplica well-architected frameworks de cada provedor.',
'development', ARRAY['aws', 'gcp', 'azure', 'cloud', 'architecture'],
'manual', true, true, 'low', 0.95,
'npx aifeast cloud-architect', 'npx aifeast run cloud-architect'),

-- 14. Performance Optimizer
('performance_optimizer', 'Performance Optimizer', 'performance-optimizer',
'Identifica gargalos de performance e aplica otimizações em código e infraestrutura.',
'Analisa performance de aplicações web e backend. Identifica gargalos com profiling (CPU, memory, I/O), otimiza queries de banco, implementa caching (Redis, CDN), lazy loading, code splitting, compressão de assets e monitora métricas de performance em produção.',
'development', ARRAY['performance', 'profiling', 'caching', 'optimization', 'metrics'],
'manual', true, true, 'low', 0.94,
'npx aifeast performance-optimizer', 'npx aifeast run performance-optimizer'),

-- 15. System Designer
('system_designer', 'System Designer', 'system-designer',
'Design de sistemas distribuídos com padrões arquiteturais e trade-offs.',
'Designer de sistemas distribuídos que aplica padrões como CQRS, Event Sourcing, Saga, Circuit Breaker e Bulkhead. Define estratégias de consistência (strong vs eventual), particionamento, replicação, message brokers e avalia trade-offs entre disponibilidade, consistência e tolerância a partições.',
'development', ARRAY['distributed-systems', 'architecture', 'cqrs', 'patterns', 'scalability'],
'manual', true, true, 'low', 0.96,
'npx aifeast system-designer', 'npx aifeast run system-designer'),

-- 16. Security Engineer
('security_engineer', 'Security Engineer', 'security-engineer',
'Implementa segurança em aplicações: auth, encryption, headers e boas práticas OWASP.',
'Engenheiro de segurança que implementa autenticação (OAuth2, JWT, MFA), criptografia de dados em trânsito e repouso, security headers (CSP, HSTS, X-Frame-Options), proteção contra XSS, CSRF, SQL injection e aplica checklists OWASP Top 10 em cada release.',
'development', ARRAY['security', 'auth', 'encryption', 'owasp', 'headers'],
'manual', true, true, 'low', 0.97,
'npx aifeast security-engineer', 'npx aifeast run security-engineer'),

-- 17. Microservices Expert
('microservices_expert', 'Microservices Expert', 'microservices-expert',
'Design e implementação de microsserviços com service mesh, gRPC e event-driven.',
'Especialista em arquiteturas de microsserviços. Define boundaries com DDD (bounded contexts), implementa comunicação síncrona (REST, gRPC) e assíncrona (Kafka, RabbitMQ), configura service mesh (Istio, Linkerd), API gateways e padrões de resiliência.',
'development', ARRAY['microservices', 'grpc', 'kafka', 'ddd', 'service-mesh'],
'manual', true, true, 'low', 0.95,
'npx aifeast microservices-expert', 'npx aifeast run microservices-expert'),

-- 18. GraphQL Specialist
('graphql_specialist', 'GraphQL Specialist', 'graphql-specialist',
'Design de schemas GraphQL, resolvers, federation e otimização de queries.',
'Especialista em GraphQL que projeta schemas tipados, implementa resolvers eficientes, configura DataLoader para evitar N+1 queries, implementa subscriptions em tempo real, federation para multi-graph e otimiza queries com query complexity analysis e persisted queries.',
'development', ARRAY['graphql', 'resolvers', 'federation', 'subscriptions', 'optimization'],
'manual', true, true, 'low', 0.94,
'npx aifeast graphql-specialist', 'npx aifeast run graphql-specialist'),

-- 19. TypeScript Type Wizard
('typescript_type_wizard', 'TypeScript Type Wizard', 'typescript-type-wizard',
'Cria tipos avançados em TypeScript: generics, conditional types, utility types.',
'Mago de tipos TypeScript que cria generic types, conditional types, mapped types, template literal types, utility types avançados e branded types. Garante type safety completo, elimina any e cria APIs com inferência automática de tipos.',
'development', ARRAY['typescript', 'types', 'generics', 'type-safety', 'advanced'],
'manual', true, true, 'low', 0.93,
'npx aifeast typescript-type-wizard', 'npx aifeast run typescript-type-wizard'),

-- 20. Python Packaging Expert
('python_packaging_expert', 'Python Packaging Expert', 'python-packaging-expert',
'Empacota projetos Python com pyproject.toml, publica no PyPI e gerencia dependências.',
'Especialista em empacotamento Python que configura pyproject.toml, poetry ou uv, cria wheels, publica no PyPI, gerencia dependências com lock files, configura CI para releases automatizados, gera documentação com Sphinx e aplica type hints com mypy.',
'development', ARRAY['python', 'packaging', 'pypi', 'poetry', 'type-hints'],
'manual', true, true, 'low', 0.94,
'npx aifeast python-packaging-expert', 'npx aifeast run python-packaging-expert'),

-- 21. React Component Architect
('react_component_architect', 'React Component Architect', 'react-component-architect',
'Design de componentes React reutilizáveis com hooks avançados e patterns.',
'Arquiteto de componentes React que cria componentes headless, compound components, render props, custom hooks avançados, context optimization com useReducer, lazy loading com React.lazy e Suspense, e aplica patterns como state machines (XState) e signal-based reactivity.',
'development', ARRAY['react', 'hooks', 'components', 'patterns', 'state-management'],
'manual', true, true, 'low', 0.95,
'npx aifeast react-component-architect', 'npx aifeast run react-component-architect'),

-- 22. CSS Architecture Designer
('css_architecture_designer', 'CSS Architecture Designer', 'css-architecture-designer',
'Organiza CSS com BEM, Tailwind, CSS Modules e design tokens escaláveis.',
'Arquiteto CSS que organiza estilos com metodologias BEM, Tailwind CSS utility-first, CSS Modules e CSS-in-JS. Cria design tokens sistemáticos (cores, espaçamentos, tipografia), configura dark mode, responsividade mobile-first e garante consistência visual em grandes codebases.',
'development', ARRAY['css', 'tailwind', 'design-tokens', 'architecture', 'responsive'],
'manual', true, true, 'low', 0.92,
'npx aifeast css-architecture-designer', 'npx aifeast run css-architecture-designer'),

-- 23. Web Accessibility Auditor
('web_accessibility_auditor', 'Web Accessibility Auditor', 'web-accessibility-auditor',
'Audita e corrige acessibilidade web conforme WCAG 2.2 AA e seção 508.',
'Auditor de acessibilidade que verifica conformidade com WCAG 2.2 nível AA, testa com leitores de tela (NVDA, VoiceOver), corrige contraste de cores, navegação por teclado, ARIA labels, foco management, skip links e gera relatórios de conformidade detalhados.',
'development', ARRAY['accessibility', 'wcag', 'aria', 'a11y', 'audit'],
'manual', true, true, 'low', 0.93,
'npx aifeast web-accessibility-auditor', 'npx aifeast run web-accessibility-auditor'),

-- 24. Docker Compose Builder
('docker_compose_builder', 'Docker Compose Builder', 'docker-compose-builder',
'Cria stacks Docker Compose multi-container com networking e volumes.',
'Construtor de stacks Docker Compose que configura multi-container applications com networking customizado, volumes persistentes, health checks, environment variables, secrets management, multi-stage builds e profiles para ambientes dev/staging/prod.',
'development', ARRAY['docker', 'compose', 'containers', 'multi-stage', 'networking'],
'manual', true, true, 'low', 0.94,
'npx aifeast docker-compose-builder', 'npx aifeast run docker-compose-builder'),

-- 25. Kubernetes Manifest Generator
('k8s_manifest_generator', 'Kubernetes Manifest Generator', 'k8s-manifest-generator',
'Gera manifests Kubernetes: Deployments, Services, Ingress, ConfigMaps e HPA.',
'Gerador de manifests Kubernetes que cria Deployments com rolling updates, Services (ClusterIP, NodePort, LoadBalancer), Ingress com TLS, ConfigMaps, Secrets, Horizontal Pod Autoscalers, Network Policies e Helm charts para deploy automatizado.',
'development', ARRAY['kubernetes', 'helm', 'manifests', 'deployments', 'autoscaling'],
'manual', true, true, 'low', 0.95,
'npx aifeast k8s-manifest-generator', 'npx aifeast run k8s-manifest-generator'),

-- 26. Terraform Module Creator
('terraform_module_creator', 'Terraform Module Creator', 'terraform-module-creator',
'Cria módulos Terraform reutilizáveis com variáveis, outputs e state remoto.',
'Criador de módulos Terraform que define infraestrutura como código reutilizável com variáveis tipadas, outputs, locals, workspaces, state remoto (S3 + DynamoDB), policy as code com OPA/Sentinel e integração com CI/CD para plan/apply automatizados.',
'development', ARRAY['terraform', 'iac', 'modules', 'state', 'aws'],
'manual', true, true, 'low', 0.94,
'npx aifeast terraform-module-creator', 'npx aifeast run terraform-module-creator'),

-- 27. CI/CD Pipeline Designer
('cicd_pipeline_designer', 'CI/CD Pipeline Designer', 'cicd-pipeline-designer',
'Desenha pipelines CI/CD com GitHub Actions, testes, linting e deploy automatizado.',
'Designer de pipelines CI/CD que configura GitHub Actions, GitLab CI ou Jenkins com stages de linting, testes unitários, testes de integração, build de containers, scan de segurança, deploy em staging com approval manual e promotion para produção com rollback automático.',
'development', ARRAY['cicd', 'github-actions', 'jenkins', 'automation', 'deploy'],
'manual', true, true, 'low', 0.95,
'npx aifeast cicd-pipeline-designer', 'npx aifeast run cicd-pipeline-designer'),

-- 28. Shell Script Automator
('shell_script_automator', 'Shell Script Automator', 'shell-script-automator',
'Cria scripts Bash robustos com error handling, logging e validação de input.',
'Automatizador de shell scripts que cria scripts Bash com set -euo pipefail, error handling com traps, logging estruturado, validação de argumentos, progress bars, parallel processing com xargs e integração com APIs via curl/jq.',
'development', ARRAY['bash', 'shell', 'scripting', 'automation', 'cli'],
'manual', true, true, 'low', 0.92,
'npx aifeast shell-script-automator', 'npx aifeast run shell-script-automator'),

-- 29. API Rate Limiter
('api_rate_limiter', 'API Rate Limiter', 'api-rate-limiter',
'Implementa rate limiting com token bucket, sliding window e quotas por usuário.',
'Implementador de rate limiting que configura algoritmos de token bucket, sliding window log e fixed window. Define quotas por usuário/plano, retorna headers padrão (X-RateLimit-Remaining), configura throttling progressivo e integra com Redis para state distribuído.',
'development', ARRAY['rate-limiting', 'throttling', 'redis', 'api', 'quotas'],
'manual', true, true, 'low', 0.93,
'npx aifeast api-rate-limiter', 'npx aifeast run api-rate-limiter'),

-- 30. Webhook Handler Builder
('webhook_handler_builder', 'Webhook Handler Builder', 'webhook-handler-builder',
'Constrói handlers de webhook com verificação de assinatura, retry e idempotência.',
'Construtor de handlers de webhook que verifica assinaturas HMAC, implementa idempotência com chaves únicas, configura retry com exponential backoff, dead letter queues, logging estruturado e geração de eventos para sistemas downstream.',
'development', ARRAY['webhooks', 'hmac', 'retry', 'idempotency', 'events'],
'manual', true, true, 'low', 0.94,
'npx aifeast webhook-handler-builder', 'npx aifeast run webhook-handler-builder'),

-- 31. JWT Token Manager
('jwt_token_manager', 'JWT Token Manager', 'jwt-token-manager',
'Gera, valida e gerencia JWT tokens com refresh, blacklist e rotação de chaves.',
'Gerenciador de JWT tokens que gera access tokens de curta duração e refresh tokens de longa duração, implementa token blacklist para logout, rotação automática de signing keys, validação de claims exp/iat/nbf e proteção contra token replay attacks.',
'development', ARRAY['jwt', 'auth', 'tokens', 'security', 'oauth2'],
'manual', true, true, 'low', 0.95,
'npx aifeast jwt-token-manager', 'npx aifeast run jwt-token-manager'),

-- 32. OAuth2 Integration Specialist
('oauth2_specialist', 'OAuth2 Integration Specialist', 'oauth2-specialist',
'Integra OAuth2/Social Login com Google, GitHub, Microsoft e provedores SAML.',
'Especialista em OAuth2 que integra social login (Google, GitHub, Microsoft, Apple), configura PKCE para SPAs, implementa flows de authorization code, client credentials e device code, gerencia escopos e integra com provedores SAML para enterprise SSO.',
'development', ARRAY['oauth2', 'sso', 'google', 'github', 'saml'],
'manual', true, true, 'low', 0.94,
'npx aifeast oauth2-specialist', 'npx aifeast run oauth2-specialist'),

-- 33. Email Template Engine
('email_template_engine', 'Email Template Engine', 'email-template-engine',
'Gera templates de email responsivos compatíveis com Gmail, Outlook e Apple Mail.',
'Engine de templates de email que gera HTML compatível com clientes de email antigos (Gmail, Outlook, Apple Mail), usa MJML ou table-based layouts, inlines CSS automaticamente, suporta variáveis, condicionais e gera previews de texto alternativo.',
'development', ARRAY['email', 'templates', 'mjml', 'responsive', 'compatibility'],
'manual', true, true, 'low', 0.92,
'npx aifeast email-template-engine', 'npx aifeast run email-template-engine'),

-- 34. Cron Job Scheduler
('cron_job_scheduler', 'Cron Job Scheduler', 'cron-job-scheduler',
'Configura jobs agendados com cron expressions, monitoring e alertas de falha.',
'Agendador de jobs que converte cron expressions humanas em schedules executáveis, configura retry automático, logging de execução, alertas de falha via Slack/email, overlapping prevention, distributed locking e histórico de execuções com métricas de duração.',
'development', ARRAY['cron', 'scheduling', 'monitoring', 'alerts', 'retry'],
'manual', true, true, 'low', 0.93,
'npx aifeast cron-job-scheduler', 'npx aifeast run cron-job-scheduler'),

-- 35. Log Analyzer
('log_analyzer', 'Log Analyzer', 'log-analyzer',
'Analisa logs de aplicação com parsing, filtros, agregações e detecção de anomalias.',
'Analisador de logs que parseia formatos estruturados (JSON, Apache, syslog), aplica filtros por severidade/tempo, agrega métricas por endpoint/status, detecta anomalias com statistical analysis, gera dashboards e alerta sobre padrões de erro recorrentes.',
'development', ARRAY['logging', 'analysis', 'monitoring', 'anomalies', 'parsing'],
'manual', true, true, 'low', 0.94,
'npx aifeast log-analyzer', 'npx aifeast run log-analyzer'),

-- 36. Error Tracking Setup
('error_tracking_setup', 'Error Tracking Setup', 'error-tracking-setup',
'Configura Sentry, Bugsnag ou Rollbar com source maps e alertas inteligentes.',
'Configurador de error tracking que integra Sentry, Bugsnag ou Rollbar em aplicações web e backend, configura source maps para stack traces legíveis, define alertas por frequência de erro, agrupa problemas similares e gera relatórios semanais de estabilidade.',
'development', ARRAY['sentry', 'error-tracking', 'monitoring', 'alerts', 'debugging'],
'manual', true, true, 'low', 0.93,
'npx aifeast error-tracking-setup', 'npx aifeast run error-tracking-setup'),

-- 37. Database Migration Manager
('db_migration_manager', 'Database Migration Manager', 'db-migration-manager',
'Gerencia migrações de banco com versionamento, rollback e verificação de integridade.',
'Gerenciador de migrações de banco que versiona schemas, cria migrações idempotentes, implementa rollback seguro, verifica integridade de dados pós-migração, gera diffs de schema e integra com CI/CD para validação antes do deploy em produção.',
'development', ARRAY['migrations', 'database', 'versioning', 'rollback', 'integrity'],
'manual', true, true, 'low', 0.94,
'npx aifeast db-migration-manager', 'npx aifeast run db-migration-manager'),

-- 38. Feature Flag Manager
('feature_flag_manager', 'Feature Flag Manager', 'feature-flag-manager',
'Implementa feature flags com targeting, rollout progressivo e A/B testing.',
'Gerenciador de feature flags que implementa toggles por usuário, grupo, percentual de rollout ou contexto geográfico. Suporta rollout progressivo, A/B testing, kill switches instantâneos, audit log de mudanças e integração com launch darkly ou solução customizada.',
'development', ARRAY['feature-flags', 'ab-testing', 'rollout', 'targeting', 'toggles'],
'manual', true, true, 'low', 0.93,
'npx aifeast feature-flag-manager', 'npx aifeast run feature-flag-manager'),

-- 39. Code Documentation Generator
('code_doc_generator', 'Code Documentation Generator', 'code-doc-generator',
'Gera documentação de código com JSDoc, TypeDoc, Sphinx ou Swagger automaticamente.',
'Gerador de documentação que extrai JSDoc/TypeDoc de TypeScript, docstrings de Python, Javadoc de Java e gera documentação navegável. Integra com Swagger/OpenAPI para docs de REST, gera diagramas de classe e inclui exemplos de uso em cada função pública.',
'development', ARRAY['documentation', 'jsdoc', 'typedoc', 'sphinx', 'swagger'],
'manual', true, true, 'low', 0.92,
'npx aifeast code-doc-generator', 'npx aifeast run code-doc-generator'),

-- 40. Dependency Updater
('dependency_updater', 'Dependency Updater', 'dependency-updater',
'Atualiza dependências automaticamente com verificação de breaking changes.',
'Atualizador de dependências que verifica versões mais recentes de pacotes npm, pip, Maven, Gradle, identifica breaking changes via changelogs, gera PRs com migration guides, testa compatibilidade antes do merge e alerta sobre pacotes abandonados ou com vulnerabilidades.',
'development', ARRAY['dependencies', 'updates', 'breaking-changes', 'npm', 'pip'],
'manual', true, true, 'low', 0.93,
'npx aifeast dependency-updater', 'npx aifeast run dependency-updater'),

-- 41. Monorepo Manager
('monorepo_manager', 'Monorepo Manager', 'monorepo-manager',
'Configura monorepos com Turborepo, Nx ou pnpm workspaces e build caching.',
'Gerenciador de monorepos que configura Turborepo, Nx ou pnpm workspaces com build caching distribuído, task pipelines, affected analysis, versionamento independente de pacotes, code sharing com import aliases e CI otimizado para alterações incrementais.',
'development', ARRAY['monorepo', 'turborepo', 'nx', 'pnpm', 'caching'],
'manual', true, true, 'low', 0.94,
'npx aifeast monorepo-manager', 'npx aifeast run monorepo-manager'),

-- 42. Scaffolding Generator
('scaffolding_generator', 'Scaffolding Generator', 'scaffolding-generator',
'Gera estruturas de projeto padronizadas com templates para diferentes stacks.',
'Gerador de scaffolding que cria estruturas de projeto padronizadas para diferentes stacks (React + Express + PostgreSQL, Next.js + Prisma, FastAPI + SQLAlchemy). Inclui linting, testing, CI/CD, Docker, README template e variáveis de ambiente configuradas.',
'development', ARRAY['scaffolding', 'templates', 'generator', 'boilerplate', 'stacks'],
'manual', true, true, 'low', 0.92,
'npx aifeast scaffolding-generator', 'npx aifeast run scaffolding-generator'),

-- 43. Linter Configurator
('linter_configurator', 'Linter Configurator', 'linter-configurator',
'Configura ESLint, Prettier, Black, Ruff com regras customizadas por projeto.',
'Configurador de linters que define ESLint + Prettier para JavaScript/TypeScript, Black + Ruff para Python, gofmt para Go, com regras customizadas por tipo de projeto. Configura husky hooks pre-commit, editor configs e CI checks para code style consistente.',
'development', ARRAY['linting', 'eslint', 'prettier', 'ruff', 'code-style'],
'manual', true, true, 'low', 0.93,
'npx aifeast linter-configurator', 'npx aifeast run linter-configurator'),

-- 44. Git Bisect Assistant
('git_bisect_assistant', 'Git Bisect Assistant', 'git-bisect-assistant',
'Usa git bisect para encontrar o commit que introduziu um bug automaticamente.',
'Assistente de git bisect que automatiza a busca binária pelo commit que introduziu um bug. Configura git bisect run com script de teste, analisa o histórico de mudanças, identifica o PR causador e sugere o fix baseado no diff do commit problemático.',
'development', ARRAY['git', 'bisect', 'debugging', 'regression', 'commits'],
'manual', true, true, 'low', 0.91,
'npx aifeast git-bisect-assistant', 'npx aifeast run git-bisect-assistant'),

-- 45. SQL Query Optimizer
('sql_query_optimizer', 'SQL Query Optimizer', 'sql-query-optimizer',
'Otimiza queries SQL com EXPLAIN ANALYZE, índices e reescrita de queries.',
'Otimizador de queries SQL que analisa EXPLAIN ANALYZE, identifica full table scans, sugere índices compostos, reescreve subqueries como JOINs, aplica materialized views para queries frequentes e estima o impacto de cada otimização no tempo de execução.',
'development', ARRAY['sql', 'optimization', 'indexes', 'explain', 'performance'],
'manual', true, true, 'low', 0.95,
'npx aifeast sql-query-optimizer', 'npx aifeast run sql-query-optimizer'),

-- 46. API Mock Server
('api_mock_server', 'API Mock Server', 'api-mock-server',
'Gera mock servers de APIs com respostas realistas e simulação de erros.',
'Gerador de mock servers que cria endpoints fake com respostas realistas baseadas em OpenAPI specs, simula latência de rede, retorna erros aleatórios (4xx, 5xx) para testar resiliência, suporta stateful responses e persistência de dados entre requests.',
'development', ARRAY['mocking', 'api', 'testing', 'openapi', 'simulation'],
'manual', true, true, 'low', 0.92,
'npx aifeast api-mock-server', 'npx aifeast run api-mock-server'),

-- 47. WebAssembly Compiler
('wasm_compiler', 'WebAssembly Compiler', 'wasm-compiler',
'Compila código Rust/C++ para WebAssembly com bindings JS automáticos.',
'Compilador WebAssembly que compila código Rust e C++ para WASM com bindings JavaScript automáticos via wasm-bindgen, configura toolchain (wasm-pack, emscripten), otimiza tamanho do binary com wasm-opt e integra com bundlers (Vite, Webpack) para uso no browser.',
'development', ARRAY['wasm', 'webassembly', 'rust', 'compiler', 'bindings'],
'manual', true, true, 'low', 0.94,
'npx aifeast wasm-compiler', 'npx aifeast run wasm-compiler'),

-- 48. ETL Pipeline Builder
('etl_pipeline_builder', 'ETL Pipeline Builder', 'etl-pipeline-builder',
'Constrói pipelines ETL para extração, transformação e carregamento de dados.',
'Construtor de pipelines ETL que extrai dados de APIs, bancos SQL, CSVs e logs, transforma com filtros, joins e agregações, carrega em data warehouses (BigQuery, Snowflake, Redshift). Inclui monitoring, alertas de falha, retry automático e versionamento de dados.',
'development', ARRAY['etl', 'data', 'pipeline', 'warehouse', 'transformation'],
'manual', true, true, 'low', 0.95,
'npx aifeast etl-pipeline-builder', 'npx aifeast run etl-pipeline-builder'),

-- 49. Smart Contract Auditor
('smart_contract_auditor', 'Smart Contract Auditor', 'smart-contract-auditor',
'Audita smart contracts Solidity com detecção de reentrancy, overflow e gas opt.',
'Auditor de smart contracts que analisa código Solidity para vulnerabilidades (reentrancy, integer overflow/underflow, front-running, unchecked call returns), otimiza consumo de gas, verifica conformidade com padrões ERC-20/721 e gera relatório de segurança detalhado.',
'development', ARRAY['solidity', 'smart-contracts', 'blockchain', 'security', 'gas'],
'manual', true, true, 'low', 0.96,
'npx aifeast smart-contract-auditor', 'npx aifeast run smart-contract-auditor'),

-- 50. CLI Tool Builder
('cli_tool_builder', 'CLI Tool Builder', 'cli-tool-builder',
'Constrói ferramentas CLI interativas com argparse, Commander ou Click.',
'Construtor de ferramentas CLI que cria comandos com parsing de argumentos (argparse, Commander, Click), autocomplete com shell completions, output colorido com chalk/colorette, spinners de progresso, prompts interativos (inquirer), pipes e redirecionamento de output.',
'development', ARRAY['cli', 'commander', 'argparse', 'interactive', 'terminal'],
'manual', true, true, 'low', 0.93,
'npx aifeast cli-tool-builder', 'npx aifeast run cli-tool-builder')

ON CONFLICT (id) DO NOTHING;
