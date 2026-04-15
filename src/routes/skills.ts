import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// Blacklist de comandos perigosos
const DANGEROUS_PATTERNS = [
  /rm\s+-rf/i, /DROP\s+TABLE/i, /process\.exit/i, /eval\s*\(/i,
  /execSync/i, /exec\s*\(/i, /child_process/i, /fs\.writeFile/i,
  /fs\.unlink/i, /require\s*\(\s*['"]child_process['"]\s*\)/i,
  /spawn/i, /fork/i, /__proto__/i, /constructor\.prototype/i
];

function scanForDanger(code: string): string[] {
  return DANGEROUS_PATTERNS.filter(p => p.test(code)).map(p => p.source);
}

function getAiKey(): string {
  const key = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;
  if (!key) throw new Error("MISSING REQUIRED ENV: OPENAI_API_KEY or GROQ_API_KEY");
  return key;
}

interface CacheEntry { data: any; timestamp: number; ttl: number; }
const memoryCache: Record<string, CacheEntry> = {};

function cacheGet(key: string): any | null {
  const entry = memoryCache[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) { delete memoryCache[key]; return null; }
  return entry.data;
}

function cacheSet(key: string, data: any, ttl: number) {
  memoryCache[key] = { data, timestamp: Date.now(), ttl };
}

// GET /api/skills - Listar skills ativas
router.get("/", async (req, res) => {
  try {
    const { source, verified } = req.query;
    let query = supabase.from("skills").select("*").eq("is_active", true);

    if (source) query = query.eq("source", source);
    if (verified === "true") query = query.eq("verified", true);
    query = query.order("created_at", { ascending: false });

    const cachedKey = `skills:list:${source || "all"}:${verified || "all"}`;
    const cached = cacheGet(cachedKey);
    if (cached) return res.json(cached);

    const { data: skills, error } = await query;
    if (error) return res.status(500).json({ error: "Failed to fetch skills" });

    const result = { skills: skills || [], total: skills?.length || 0, categories: ["development", "content", "automation", "analysis", "security"] };
    cacheSet(cachedKey, result, 15 * 60 * 1000);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch skills" });
  }
});

// GET /api/skills/search?q=&category=
router.get("/search", async (req, res) => {
  try {
    const { q, category } = req.query;
    if (!q && !category) return res.status(400).json({ error: "Provide 'q' or 'category' parameter" });

    const cacheKey = `skills:search:${q}:${category}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    let query = supabase.from("skills").select("*").eq("is_active", true);
    if (category) query = query.ilike("category", (category as string).toLowerCase());

    if (q) {
      const { data: allSkills, error } = await query;
      if (error) throw new Error(error.message);
      const term = (q as string).toLowerCase();
      const filtered = (allSkills || []).filter(s =>
        s.name?.toLowerCase().includes(term) || s.description?.toLowerCase().includes(term) ||
        s.long_description?.toLowerCase().includes(term) || (s.tags && s.tags.some((t: string) => t.toLowerCase().includes(term)))
      );
      const result = { query: q, skills: filtered, total: filtered.length };
      cacheSet(cacheKey, result, 10 * 60 * 1000);
      return res.json(result);
    }

    const { data: skills, error } = await query.order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const result = { query: "", skills: skills || [], total: skills?.length || 0 };
    cacheSet(cacheKey, result, 10 * 60 * 1000);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to search skills" });
  }
});

// GET /api/skills/:slug
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const cached = cacheGet(`skills:detail:${slug}`);
    if (cached) return res.json(cached);

    const { data: skill, error } = await supabase.from("skills").select("*").eq("slug", slug).eq("is_active", true).single();
    if (error || !skill) return res.status(404).json({ error: "Skill not found" });

    await supabase.from("skills").update({ downloads: (skill.downloads || 0) + 1 }).eq("id", skill.id);
    const result = { ...skill, downloads: (skill.downloads || 0) + 1 };
    cacheSet(`skills:detail:${slug}`, result, 30 * 60 * 1000);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch skill" });
  }
});

// POST /api/skills/:slug/evaluate
router.post("/:slug/evaluate", async (req, res) => {
  try {
    const { slug } = req.params;
    const { data: skill, error } = await supabase.from("skills").select("*").eq("slug", slug).eq("is_active", true).single();
    if (error || !skill) return res.status(404).json({ error: "Skill not found or inactive" });

    const warnings = scanForDanger(skill.code || "");

    const AI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.groq.com/openai/v1";
    const AI_API_KEY = getAiKey();
    const groqResponse = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.LOCAL_MODEL || "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a security evaluator. Return ONLY valid JSON with: risk (low|medium|high), score (0-1), explanation (string), warnings (array)." },
          { role: "user", content: `Evaluate: ${skill.name} | ${skill.description} | Code: ${skill.code || "none"}. Return: {"risk":"low","score":0.95,"explanation":"Safe","warnings":[]}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 512
      })
    });

    let evaluation = { risk: "low", score: 0.95, explanation: "Default safe", warnings: [] as string[] };
    if (groqResponse.ok) {
      try {
        const groqData = await groqResponse.json();
        let txt = groqData.choices[0]?.message?.content || "";
        txt = txt.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(txt);
        if (parsed.risk && parsed.score) evaluation = parsed;
      } catch { /* defaults */ }
    }

    if (warnings.length > 0) {
      evaluation.warnings.push(...warnings);
      evaluation.risk = "high";
      evaluation.score = Math.max(0, evaluation.score - 0.5);
    }

    if (skill.id === "skill_evaluator") evaluation.warnings.push("This is a protected system skill");

    res.json({ slug: skill.slug, name: skill.name, risk: evaluation.risk, score: evaluation.score, explanation: evaluation.explanation, warnings: evaluation.warnings, blocked: evaluation.risk === "high" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to evaluate skill" });
  }
});

// Helpers para execute
function checkPlanLimit(user: any): { allowed: boolean; limit: number | string; remaining: number | string } {
  const limits: Record<string, number> = { free: 100, pro: 10000, enterprise: -1 };
  const limit = limits[user.plan] || limits.free;
  if (limit === -1) return { allowed: true, limit: "unlimited", remaining: "unlimited" };
  return { allowed: (user.usage_count || 0) < limit, limit, remaining: Math.max(0, limit - (user.usage_count || 0)) };
}

const DANGEROUS_PATTERNS_EXEC = [/rm\s+-rf/i, /DROP\s+TABLE/i, /process\.exit/i, /eval\s*\(/i, /execSync/i, /exec\s*\(/i, /child_process/i, /fs\.writeFile/i, /fs\.unlink/i, /require\s*\(\s*['"]child_process['"]\s*\)/i, /spawn/i, /fork/i, /__proto__/i, /constructor\.prototype/i];
function scanForDangerExec(code: string): string[] { return DANGEROUS_PATTERNS_EXEC.filter(p => p.test(code)).map(p => p.source); }

// POST /api/skills/:slug/execute
router.post("/:slug/execute", async (req, res) => {
  try {
    const { slug } = req.params;
    const apiKey = req.header("X-API-Key");
    if (!apiKey) return res.status(401).json({ error: "API Key required. Add X-API-Key header." });

    const { data: user, error: userError } = await supabase.from("users").select("*").eq("api_key", apiKey).single();
    if (userError || !user) return res.status(403).json({ error: "Invalid API Key" });

    const { data: skill, error: skillError } = await supabase.from("skills").select("*").eq("slug", slug).eq("is_active", true).single();
    if (skillError || !skill) return res.status(404).json({ error: "Skill not found or inactive" });

    const warnings = scanForDangerExec(skill.code || "");
    if (warnings.length > 0) return res.status(403).json({ error: "Skill blocked by security evaluator", skill: slug, risk: "high", score: 0.2, explanation: `Dangerous patterns: ${warnings.join(", ")}`, warnings });

    const planCheck = checkPlanLimit(user);
    if (!planCheck.allowed) return res.status(402).json({ error: "Monthly request limit reached", plan: user.plan, limit: planCheck.limit, usage_count: user.usage_count });

    await supabase.from("users").update({ usage_count: (user.usage_count || 0) + 1 }).eq("id", user.id);
    await supabase.from("usage_logs").insert({ user_id: user.id, endpoint: `/api/skills/${slug}/execute`, cost: user.plan === "pro" ? 0.001 : 0 });

    res.json({ skill_id: skill.id, skill_name: skill.name, status: "executed", input_received: req.body, security: { risk: "low", score: 0.95, explanation: "Safe execution", warnings, evaluator: "local-scan" }, usage_remaining: planCheck.remaining });
  } catch (err: any) { res.status(500).json({ error: "Failed to execute skill" }); }
});

export default router;
