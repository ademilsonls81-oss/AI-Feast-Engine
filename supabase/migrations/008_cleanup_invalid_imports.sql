-- ==========================================
-- CLEANUP: Remover skills inválidas identificadas no diagnóstico
-- ==========================================

-- 1. DELETE skills com slug começando com '-' (emojis/chars especiais não removidos)
DELETE FROM public.skills
WHERE slug LIKE '-%';

-- 2. DELETE skills com nome 'How it works' (seção de README, não skill)
DELETE FROM public.skills
WHERE lower(name) = 'how it works';

-- 3. DELETE skills do repositório JavaGuide (tutorial genérico, não skill)
DELETE FROM public.skills
WHERE repo_url LIKE '%JavaGuide%' OR repo_url LIKE '%Snailclimb%';

-- 4. DELETE skills com nome 'Challenges in Agent Development' (seção genérica do OpenViking)
DELETE FROM public.skills
WHERE lower(name) = 'challenges in agent development';

-- 5. DELETE skills com nome 'AI Agent' do JavaGuide
DELETE FROM public.skills
WHERE lower(name) = 'ai agent' AND repo_url LIKE '%JavaGuide%';

-- Relatório
SELECT
  'Skills removidas' as metric,
  COUNT(*)::text as value
FROM public.skills
WHERE source = 'github' AND slug LIKE '-%' OR lower(name) = 'how it works'
UNION ALL
SELECT 'Total skills restantes', COUNT(*)::text FROM public.skills
UNION ALL
SELECT 'Skills ativas', COUNT(*)::text FROM public.skills WHERE is_active = true
UNION ALL
SELECT 'Skills GitHub ativas', COUNT(*)::text FROM public.skills WHERE is_active = true AND source = 'github'
UNION ALL
SELECT 'Skills manuais ativas', COUNT(*)::text FROM public.skills WHERE is_active = true AND source = 'manual';
