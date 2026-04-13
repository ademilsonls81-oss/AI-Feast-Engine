-- ==========================================
-- CLEANUP: Deletar skills inválidas importadas do GitHub
-- Critérios: título é lixo (emoji, HTML, repo name, blacklist)
-- PRESERVA: skills manuais (source='manual') e seeds originais
-- ==========================================

-- 1. Deletar skills do GitHub com títulos suspeitos
DELETE FROM public.skills
WHERE source = 'github'
  AND (
    -- Título igual ao nome do repo
    LOWER(REPLACE(REPLACE(REPLACE(REPLACE(slug, '-', ''), '_', ''), '.', ''), ' ', '')) =
    LOWER(REPLACE(REPLACE(REPLACE(REPLACE(SPLIT_PART(repo_url, '/', 5), '-', ''), '_', ''), '.', ''), ' ', ''))
    -- OU título muito curto/longo
    OR LENGTH(name) < 5
    OR LENGTH(name) > 60
    -- OU título contém caracteres HTML
    OR name ~ '[<>[\]()]'
    -- OU título sem pelo menos 3 letras alfabéticas
    OR LENGTH(REGEXP_REPLACE(name, '[^a-zA-Z]', '', 'g')) < 3
  );

-- 2. Deletar skills do GitHub com score muito baixo (provavelmente lixo)
DELETE FROM public.skills
WHERE source = 'github'
  AND is_active = false
  AND validation_score < 0.5;

-- 3. Relatório do que sobrou
SELECT
  source,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active = true) as active,
  COUNT(*) FILTER (WHERE verified = true) as verified,
  category,
  COUNT(*) FILTER (WHERE category = s.category) as per_category
FROM public.skills s
GROUP BY source, category
ORDER BY source, category;
