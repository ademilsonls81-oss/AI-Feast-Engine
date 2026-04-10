-- =====================================================
-- AI FEAST ENGINE - Fix Health & Finance RSS Feeds
-- Executar no Supabase SQL Editor
-- =====================================================

-- Remover feeds quebrados
DELETE FROM feeds WHERE url IN (
  'https://feeds.reuters.com/reuters/businessNews',
  'https://www.cdc.gov/rss/news/latest.xml',
  'https://www.medicalnewstoday.com/rss/medical_all.xml',
  'https://www.who.int/rss-feeds/news-releases.xml'
);

-- Adicionar feeds de HEALTH funcionais
INSERT INTO feeds (name, url, category) VALUES
('NPR Health', 'https://feeds.npr.org/1057/rss.xml', 'Health'),
('Science Daily Health', 'https://www.sciencedaily.com/rss/health_medicine.xml', 'Health'),
('WebMD Health', 'https://rssfeeds.webmd.com/rss/rss.aspx?RSSSource=RSS_PUBLIC', 'Health')
ON CONFLICT DO NOTHING;

-- Adicionar mais feeds de FINANCE funcionais
INSERT INTO feeds (name, url, category) VALUES
('Yahoo Finance', 'https://finance.yahoo.com/news/rssindex', 'Finance'),
('Forbes Business', 'https://www.forbes.com/business/feed/', 'Finance')
ON CONFLICT DO NOTHING;

-- Verificar distribuição final de feeds
SELECT 
  category,
  COUNT(*) as feed_count,
  string_agg(name, ', ') as sources
FROM feeds
GROUP BY category
ORDER BY feed_count DESC;
