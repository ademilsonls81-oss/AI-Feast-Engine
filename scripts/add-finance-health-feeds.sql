-- =====================================================
-- AI FEAST ENGINE - Add Finance & Health RSS Feeds
-- Executar no Supabase SQL Editor
-- =====================================================

-- Adicionar feeds de FINANCE
INSERT INTO feeds (name, url, category, created_at) VALUES
('Reuters Business', 'https://feeds.reuters.com/reuters/businessNews', 'Finance', NOW()),
('CNBC Top News', 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114', 'Finance', NOW()),
('Bloomberg Markets', 'https://feeds.bloomberg.com/markets/news.rss', 'Finance', NOW()),
('Financial Times', 'https://www.ft.com/rss/home', 'Finance', NOW()),
('Wall Street Journal', 'https://feeds.a.net/rss/WBOP3000', 'Finance', NOW())
ON CONFLICT DO NOTHING;

-- Adicionar feeds de HEALTH
INSERT INTO feeds (name, url, category, created_at) VALUES
('Medical News Today', 'https://www.medicalnewstoday.com/rss/medical_all.xml', 'Health', NOW()),
('WHO News', 'https://www.who.int/rss-feeds/news-releases.xml', 'Health', NOW()),
('CDC News', 'https://www.cdc.gov/rss/news/latest.xml', 'Health', NOW()),
('Healthline', 'https://www.healthline.com/rss/all', 'Health', NOW()),
('NHS News', 'https://www.nhs.uk/news/rss/', 'Health', NOW())
ON CONFLICT DO NOTHING;

-- Verificar distribuição atual de feeds
SELECT 
  category,
  COUNT(*) as feed_count,
  string_agg(name, ', ') as sources
FROM feeds
GROUP BY category
ORDER BY feed_count DESC;

-- Verificar distribuição de posts por categoria
SELECT 
  category,
  COUNT(*) as total_posts,
  COUNT(*) FILTER (WHERE status = 'published') as published,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'error') as error,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM posts) * 100, 1) as percentage
FROM posts
GROUP BY category
ORDER BY total_posts DESC;
