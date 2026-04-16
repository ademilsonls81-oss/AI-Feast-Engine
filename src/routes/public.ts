import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabaseClient";
import { apiKeyRateLimit } from "../middleware/rateLimit.js";

const router = Router();

// Cache helpers (compartilhados)
const memoryCache: Record<string, any> = {};
const CACHE_TTL = { feed: 10*60*1000, verified: 15*60*1000, search: 30*60*1000, stats: 5*60*1000 };
function cacheGet(key: string): any | null {
  const e = memoryCache[key];
  if (!e) return null;
  if (Date.now() - e.timestamp > e.ttl) { delete memoryCache[key]; return null; }
  return e.data;
}
function cacheSet(key: string, data: any, ttl: number) { memoryCache[key] = { data, timestamp: Date.now(), ttl }; }

// ==========================================
// VERIFIED SCORE
// ==========================================
router.get("/verified", apiKeyRateLimit, async (req, res) => {
  const apiKey = req.header("X-API-Key");
  if (!apiKey) return res.status(401).json({ error: "API Key required — use header X-API-Key" });

  const { data: user } = await supabase.from("users").select("*").eq("api_key", apiKey).single();
  if (!user) return res.status(403).json({ error: "Invalid API Key" });
  if (user.plan === "free" && user.usage_count >= 100) return res.status(429).json({ error: "Free limit reached (100/mo)" });

  await supabase.from("users").update({ usage_count: user.usage_count + 1 }).eq("id", user.id);
  await supabase.from("usage_logs").insert({ user_id: user.id, endpoint: "/api/verified", cost: user.plan === "pro" ? 0.001 : 0 });

  const { data: verifiedPosts } = await supabase.from("posts").select("*").eq("status", "published").not("summary", "is", null).order("created_at", { ascending: false }).limit(20);
  const scoredPosts = (verifiedPosts || []).map((p: any) => ({ ...p, verified_score: calcScore(p), is_verified: p.summary && p.translations && Object.keys(p.translations || {}).length >= 8 }));
  const filtered = scoredPosts.filter((p: any) => p.is_verified);

  res.json({ posts: filtered, total_verified: filtered.length, verified_percentage: verifiedPosts?.length ? Math.round((filtered.length / verifiedPosts.length) * 100) : 0 });
});

function calcScore(post: any): number {
  let s = 0;
  if (post.title && post.title.length > 10) s += 20;
  if (post.summary && post.summary.length > 50) s += 30;
  if (post.translations) s += Math.min(30, (Object.keys(post.translations).length / 10) * 30);
  if (post.content_raw && post.content_raw.length > 200) s += 20;
  return Math.round(s);
}

// ==========================================
// SEARCH
// ==========================================
router.get("/search", apiKeyRateLimit, async (req, res) => {
  const { q, lang, category, limit = 20, offset = 0 } = req.query;
  const apiKey = req.header("X-API-Key");

  if (apiKey) {
    const { data: user } = await supabase.from("users").select("*").eq("api_key", apiKey).single();
    if (!user) return res.status(403).json({ error: "Invalid API Key" });
    if (user.plan === "free" && user.usage_count >= 100) return res.status(429).json({ error: "Free limit reached (100/mo)" });
    await supabase.from("users").update({ usage_count: user.usage_count + 1 }).eq("id", user.id);
    await supabase.from("usage_logs").insert({ user_id: user.id, endpoint: "/api/search", cost: user.plan === "pro" ? 0.001 : 0 });
  }

  const cacheKey = `search:${q}:${lang}:${category}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.json(cached);

  let query = supabase.from("posts").select("*", { count: "exact" }).eq("status", "published");
  if (q) query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%`);
  if (category) query = query.ilike("category", (category as string).toLowerCase());

  const limitNum = Math.min(Number(limit), 50);
  const offsetNum = Number(offset);
  query = query.range(offsetNum, offsetNum + limitNum - 1);
  const { data: posts, error, count } = await query.order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  let filteredPosts = posts || [];
  if (lang) {
    filteredPosts = filteredPosts.filter((p: any) => lang === "pt" ? !!p.summary : p.translations?.[lang as string])
      .map((p: any) => lang === "pt" ? p : { ...p, title: p.translations?.[lang as string] || p.title, summary: p.translations?.[lang as string] || p.summary, language: lang });
  }

  const result = { query: q, total: count || 0, limit: limitNum, offset: offsetNum, posts: filteredPosts, has_more: (offsetNum + limitNum) < (count || 0) };
  cacheSet(cacheKey, result, CACHE_TTL.search);
  res.json(result);
});

// ==========================================
// FEED
// ==========================================
router.get("/feed", apiKeyRateLimit, async (req, res) => {
  const apiKey = req.header("X-API-Key");
  if (!apiKey) return res.status(401).json({ error: "API Key required — use header X-API-Key" });

  const { data: user } = await supabase.from("users").select("*").eq("api_key", apiKey).single();
  if (!user) return res.status(403).json({ error: "Invalid API Key" });
  if (user.plan === "free" && user.usage_count >= 100) return res.status(429).json({ error: "Free limit reached (100/mo)" });

  await supabase.from("users").update({ usage_count: user.usage_count + 1 }).eq("id", user.id);
  await supabase.from("usage_logs").insert({ user_id: user.id, endpoint: "/api/feed", cost: user.plan === "pro" ? 0.001 : 0 });

  const { lang, category, limit = 20, offset = 0 } = req.query;
  const cacheKey = `feed:${apiKey}:${lang}:${category}:${limit}:${offset}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.json(cached);

  let query = supabase.from("posts").select("*", { count: "exact" }).eq("status", "published");
  if (category) query = query.ilike("category", (category as string).toLowerCase());

  const limitNum = Math.min(Number(limit), 50);
  const offsetNum = Number(offset);
  query = query.range(offsetNum, offsetNum + limitNum - 1);
  const { data: posts, count } = await query.order("created_at", { ascending: false });

  let filteredPosts = posts || [];
  if (lang && lang !== "pt") {
    filteredPosts = filteredPosts.filter((p: any) => p.translations?.[lang as string]).map((p: any) => ({ ...p, title: p.translations?.[lang as string] || p.title, summary: p.translations?.[lang as string] || p.summary, language: lang }));
  } else if (lang === "pt") {
    filteredPosts = filteredPosts.filter((p: any) => p.summary);
  }

  const result = { total: count || 0, limit: limitNum, offset: offsetNum, posts: filteredPosts, has_more: (offsetNum + limitNum) < (count || 0), user_plan: user.plan, remaining_requests: user.plan === "free" ? Math.max(0, 100 - user.usage_count) : "unlimited" };
  cacheSet(cacheKey, result, CACHE_TTL.feed);
  res.json(result);
});

// ==========================================
// STATS
// ==========================================
router.get("/stats", async (_req, res) => {
  const cached = cacheGet("stats");
  if (cached) return res.json(cached);

  const [{ count: postsCount }, { count: feedsCount }] = await Promise.all([
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("feeds").select("*", { count: "exact", head: true })
  ]);

  const stats = { postsCount: postsCount || 0, feedsCount: feedsCount || 0, languages: 11, cache_enabled: true };
  cacheSet("stats", stats, CACHE_TTL.stats);
  res.json(stats);
});

export default router;
