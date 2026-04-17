import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabaseClient.js";
import { checkAdmin } from "../middleware/auth.js";
import { queueService } from "../services/queueService.js";
import { logAuditAction } from "../middleware/auditLog.js";
import rateLimit from "express-rate-limit";
import { execSync } from "child_process";

// Rate limiter para endpoints admin: 5 req/min por IP

// Rate limiter para endpoints admin: 5 req/min por IP
const adminRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Too many admin requests — try again in 1 minute" },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || "unknown",
});

const router = Router();

// Aplicar rate limiter em TODAS as rotas admin
router.use(adminRateLimit);

// Helpers (referenciados pelas rotas)
declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string };
  }
}

function cacheInvalidate(pattern?: string) {
  // Re-export simplificado — o cache vive no server.ts
  // Aqui apenas sinalizamos via broadcast
}

function broadcastWsUpdate(_data: any) {
  // Placeholder — será chamado via server.ts
}

// GET /api/admin/posts
router.get("/posts", checkAdmin, async (req, res) => {
  const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/admin/process-batch
router.post("/process-batch", checkAdmin, async (req, res) => {
  const { data: pending } = await supabase.from("posts").select("id").eq("status", "pending").limit(50);
  if (!pending?.length) return res.json({ message: "No pending posts" });

  queueService.addTasks(pending.map(p => p.id));
  logAuditAction((req as any).user.id, "PROCESS_BATCH_MANUAL", req, { count: pending.length });
  res.json({ message: `Queueing ${pending.length} posts` });
});

// POST /api/admin/feeds
router.post("/feeds", checkAdmin, async (req, res) => {
  const { name, url, category } = req.body;
  const { data, error } = await supabase.from("feeds").insert({ name, url, category }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  logAuditAction((req as any).user.id, "ADD_FEED", req, { name, url });
  res.json(data);
});

// GET /api/admin/feeds/summary
router.get("/feeds/summary", checkAdmin, async (req, res) => {
  try {
    const { data: feeds } = await supabase.from("feeds").select("id, name, url, category").order("category");
    const { data: posts } = await supabase.from("posts").select("category, status").eq("status", "published");

    const feedByCategory: Record<string, number> = {};
    feeds?.forEach(f => { const cat = f.category || "Uncategorized"; feedByCategory[cat] = (feedByCategory[cat] || 0) + 1; });

    const postByCategory: Record<string, number> = {};
    posts?.forEach(p => { const cat = p.category || "Uncategorized"; postByCategory[cat] = (postByCategory[cat] || 0) + 1; });

    res.json({
      total_feeds: feeds?.length || 0,
      total_published_posts: posts?.length || 0,
      feeds_by_category: feedByCategory,
      posts_by_category: postByCategory,
      feeds: feeds || []
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/feeds/health - Health de todos os feeds
router.get("/feeds/health", checkAdmin, async (req, res) => {
  try {
    const { data: feeds } = await supabase.from("feeds").select("*");
    const { data: health } = await supabase.from("feed_health").select("*");

    const healthMap = new Map((health || []).map((h: any) => [h.feed_id, h]));

    const enrichedFeeds = (feeds || []).map((feed: any) => {
      const h = healthMap.get(feed.id);
      return {
        ...feed,
        health_score: h?.health_score ?? 50,
        last_status: h?.last_status ?? "unknown",
        last_latency_ms: h?.last_latency_ms,
        last_error: h?.last_error,
        last_checked_at: h?.last_checked_at,
        consecutive_errors: h?.consecutive_errors ?? 0,
        success_count: h?.success_count ?? 0,
        error_count: h?.error_count ?? 0
      };
    }).sort((a: any, b: any) => a.health_score - b.health_score);

    const failed = enrichedFeeds.filter((f: any) => f.last_status === "error" || !f.last_status);
    const healthy = enrichedFeeds.filter((f: any) => f.last_status === "success");
    const unhealthy = enrichedFeeds.filter((f: any) => f.health_score < 50);

    res.json({
      feeds: enrichedFeeds,
      summary: {
        total: enrichedFeeds.length,
        healthy: healthy.length,
        failed: failed.length,
        unhealthy: unhealthy.length
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/feeds/:id
router.patch("/feeds/:id", checkAdmin, async (req, res) => {
  const { category } = req.body;
  const validCategories = ["Tech", "Finance", "Science", "Health", "General"];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: "Categoria inválida", valid: validCategories });
  }

  const { data, error } = await supabase.from("feeds").update({ category }).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  logAuditAction((req as any).user.id, "UPDATE_FEED_CATEGORY", req, { feed_id: req.params.id, category });
  res.json(data);
});

function getAiKey(): string {
  const key = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;
  if (!key) throw new Error("MISSING REQUIRED ENV: OPENAI_API_KEY or GROQ_API_KEY");
  return key;
}

// POST /api/admin/skills/generate
router.post("/skills/generate", checkAdmin, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || prompt.trim().length < 10) {
      return res.status(400).json({ error: "Prompt deve ter pelo menos 10 caracteres" });
    }

    console.log(`[SkillGen] Gerando skill com prompt: ${prompt.substring(0, 100)}...`);

    const userPrompt = `Create a NEW skill for: "${prompt}"

Current timestamp: ${Date.now()}

Return ONLY this JSON object with ALL fields (no markdown, no extra text):
{"id":"snake_case","name":"Title","slug":"kebab","desc":"short","long_desc":"medium","category":"analysis","tags":["a","b","c"],"risk":"low","install":"npx aifeast x","run":"npx aifeast run x"}`;

    const AI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.groq.com/openai/v1";
    const AI_API_KEY = getAiKey();

    const groqResponse = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.LOCAL_MODEL || "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a JSON API. Return ONLY valid JSON." },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1024
      })
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error(`[SkillGen] Groq error: ${groqResponse.status} - ${errorText}`);
      return res.status(500).json({ error: "Erro ao gerar skill com IA", details: errorText });
    }

    const groqData = await groqResponse.json();
    let responseText = groqData.choices[0]?.message?.content || "";

    responseText = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/^[\s\S]*?(\{)/, '$1')
      .replace(/(\})[\s\S]*$/, '$1')
      .trim();

    let skillJson;
    try {
      skillJson = JSON.parse(responseText);
    } catch (parseError: any) {
      let fixed = responseText.replace(/,\s*([}\]])/g, '$1');
      const openB = (fixed.match(/{/g) || []).length;
      const closeB = (fixed.match(/}/g) || []).length;
      for (let i = 0; i < openB - closeB; i++) fixed += '}';
      try {
        skillJson = JSON.parse(fixed);
      } catch {
        return res.status(500).json({ error: "IA gerou JSON inválido", raw: responseText.substring(0, 500) });
      }
    }

    if (!skillJson.output_schema) skillJson.output_schema = { type: "object", properties: { result: { type: "string" } } };
    if (!skillJson.input_schema) skillJson.input_schema = { type: "object", properties: { input: { type: "string" } } };
    if (!skillJson.code) skillJson.code = `// TODO: Implement ${skillJson.id || 'skill'}`;

    const desc = skillJson.desc || skillJson.description;
    const longDesc = skillJson.long_desc || skillJson.long_description;
    const risk = skillJson.risk || skillJson.risk_level;

    if (!skillJson.id || !skillJson.name || !skillJson.slug) {
      return res.status(422).json({ error: "Skill gerada está incompleta", received_fields: Object.keys(skillJson) });
    }

    const validCategories = ['development', 'content', 'automation', 'analysis', 'security'];
    const category = validCategories.includes(skillJson.category) ? skillJson.category : 'analysis';
    const validRisks = ['low', 'medium', 'high'];
    const riskLevel = validRisks.includes(risk) ? risk : 'low';

    const skill = {
      id: skillJson.id,
      name: skillJson.name,
      slug: skillJson.slug,
      description: desc || 'No description',
      long_description: longDesc || desc || 'No detailed description',
      category,
      tags: Array.isArray(skillJson.tags) ? skillJson.tags.slice(0, 3) : ['skill'],
      input_schema: skillJson.input_schema,
      output_schema: skillJson.output_schema,
      code: skillJson.code,
      install_command: `npx aifeast ${skillJson.slug}`,
      run_command: `npx aifeast run ${skillJson.slug}`,
      risk_level: riskLevel,
      verified: false,
      is_active: true
    };

    const { data: savedSkill, error: dbError } = await supabase.from("skills").insert(skill).select().single();
    if (dbError) {
      if (dbError.code === '23505') return res.status(409).json({ error: "Skill com este id ou slug já existe" });
      return res.status(500).json({ error: "Erro ao salvar skill no banco" });
    }

    res.status(201).json({ message: "Skill gerada e salva com sucesso!", skill: savedSkill });
  } catch (err: any) {
    console.error("[SkillGen] Erro inesperado:", err.message);
    res.status(500).json({ error: "Erro interno ao gerar skill" });
  }
});

// GET /api/admin/skills/discover - Descoberta automática de skills (dry run)
// IMPORTANTE: Rota literal DEVE vir antes de rotas com :id
router.get("/skills/discover", checkAdmin, async (_req, res) => {
  try {
    const { discoverRepos } = await import("../services/githubDiscovery.js");
    const { extractSkillsFromRepo } = await import("../services/skillExtractor.js");

    console.log("[Discovery] Starting dry run...");
    const repos = await discoverRepos();

    const results = [];
    for (const repo of repos.slice(0, 3)) {
      const skills = await extractSkillsFromRepo(repo);
      results.push({
        repo: repo.full_name,
        stars: repo.stars,
        skills_found: skills.length,
        sample: skills.slice(0, 2)
      });
      await new Promise(r => setTimeout(r, 500));
    }

    res.json({
      message: "Dry run completo — nada salvo no banco",
      repos_analyzed: results.length,
      results
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/skills/validate-batch - Normalizar + validar (dry run)
// IMPORTANTE: Rota literal DEVE vir antes de rotas com :id
// Aceita body opcional { repos?: string[] } para processar repos específicos
router.post("/skills/validate-batch", checkAdmin, async (req, res) => {
  try {
    const { discoverRepos } = await import("../services/githubDiscovery.js");
    const { extractSkillsFromRepo } = await import("../services/skillExtractor.js");
    const { normalizeSkill } = await import("../services/skillNormalizer.js");
    const { validateSkill } = await import("../services/skillValidator.js");

    const groqApiKey = getAiKey();
    const requestedRepos = (req.body as any)?.repos as string[] | undefined;

    let repos: any[];
    if (requestedRepos && requestedRepos.length > 0) {
      // Processar repos específicos fornecidos pelo admin
      console.log(`[ValidateBatch] Processing ${requestedRepos.length} specific repos...`);
      repos = requestedRepos.map(fullName => ({
        name: fullName.split("/")[1] || "",
        full_name: fullName,
        description: "",
        html_url: `https://github.com/${fullName}`,
        stars: 0
      }));
    } else {
      // Discovery automático
      console.log("[ValidateBatch] Starting auto-discovery...");
      repos = await discoverRepos();
    }

    const approved: any[] = [];
    const rejected: any[] = [];

    for (const repo of repos.slice(0, 5)) {
      const rawSkills = await extractSkillsFromRepo(repo);

      for (const raw of rawSkills.slice(0, 3)) {
        const normalized = normalizeSkill(raw);
        const result = await validateSkill(normalized, groqApiKey);

        if (result.approved) {
          approved.push(result.skill);
        } else {
          rejected.push({
            name: result.skill.name,
            reason: result.warnings
          });
        }

        await new Promise(r => setTimeout(r, 300));
      }
    }

    res.json({
      message: "Validação concluída — nada salvo no banco ainda",
      approved: approved.length,
      rejected: rejected.length,
      approved_skills: approved.slice(0, 5),
      rejected_skills: rejected
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/skills/import - Pipeline completo: discover → extract → normalize → validate → import
// IMPORTANTE: Rota literal DEVE vir antes de rotas com :id
router.post("/skills/import", checkAdmin, async (req, res) => {
  try {
    const dryRun = (req.body as any)?.dryRun === true;

    const { discoverRepos } = await import("../services/githubDiscovery.js");
    const { extractSkillsFromRepo } = await import("../services/skillExtractor.js");
    const { normalizeSkill } = await import("../services/skillNormalizer.js");
    const { validateSkill } = await import("../services/skillValidator.js");
    const { importSkills } = await import("../services/skillImporter.js");

    const groqApiKey = getAiKey();

    console.log(`[Import] Starting pipeline${dryRun ? " (DRY RUN)" : ""}...`);

    // Timeout de segurança: 5 minutos para todo o pipeline
    const pipelineTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Pipeline timeout after 5 minutes — GitHub API may be down")), 5 * 60 * 1000)
    );

    const result = await Promise.race([
      (async () => {
        // 1. Discovery
        const repos = await discoverRepos();
        console.log(`[Import] Discovered ${repos.length} repos`);

        // 2. Extract + Normalize + Validate
        const validatedSkills: any[] = [];
        let extractedCount = 0;

        for (const repo of repos.slice(0, 5)) {
          const rawSkills = await extractSkillsFromRepo(repo);
          extractedCount += rawSkills.length;

          for (const raw of rawSkills.slice(0, 3)) {
            const normalized = normalizeSkill(raw);
            const result = await validateSkill(normalized, groqApiKey);
            validatedSkills.push(result);

            await new Promise(r => setTimeout(r, 300));
          }
        }

        const approved = validatedSkills.filter(s => s.approved);
        console.log(`[Import] ${approved.length} skills approved out of ${validatedSkills.length} validated`);

        // 3. Import (ou dry run)
        let report;
        if (dryRun) {
          report = {
            inserted: approved.length,
            updated: 0,
            skipped: validatedSkills.length - approved.length,
            errors: [],
            details: {
              inserted: approved.map(s => s.skill.name),
              updated: [],
              skipped: validatedSkills.filter(s => !s.approved).map(s => ({
                name: s.skill.name,
                reason: `score: ${s.score}, approved: ${s.approved}`
              }))
            }
          };
        } else {
          report = await importSkills(approved, { discovered: repos.length, extracted: extractedCount });
        }

        return {
          dry_run: dryRun,
          discovered: repos.length,
          extracted: extractedCount,
          approved: approved.length,
          inserted: report.inserted,
          updated: report.updated,
          skipped: report.skipped,
          errors: report.errors,
          details: report.details
        };
      })(),
      pipelineTimeout
    ]);

    res.json(result);

  } catch (err: any) {
    if (err.message.includes("Pipeline timeout")) {
      res.status(504).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// POST /api/admin/skills/import/manual - Trigger pipeline manualmente
// IMPORTANTE: Rota literal DEVE vir antes de rotas com :id
router.post("/skills/import/manual", checkAdmin, async (req, res) => {
  try {
    const { runImportPipeline, isPipelineRunning } = await import("../services/skillScheduler.js");
    const dryRun = (req.body as any)?.dryRun === true;

    // Proteção contra execução simultânea
    if (isPipelineRunning() && !dryRun) {
      return res.status(409).json({ error: "Import already in progress" });
    }

    const log = await runImportPipeline("manual", dryRun);

    res.json({
      message: dryRun ? "Dry run completo — nada salvo" : "Import concluído",
      log
    });

  } catch (err: any) {
    if (err.message.includes("already in progress")) {
      res.status(409).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// GET /api/admin/skills/import/logs - Últimos 20 logs de importação
// IMPORTANTE: Rota literal DEVE vir antes de rotas com :id
router.get("/skills/import/logs", checkAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("skill_import_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ logs: data || [] });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/skills/:id/toggle
router.post("/skills/:id/toggle", checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (id === "skill_evaluator") return res.status(403).json({ error: "Skill Evaluator cannot be deactivated" });

    const { data: skill, error: fetchError } = await supabase.from("skills").select("is_active").eq("id", id).single();
    if (fetchError || !skill) return res.status(404).json({ error: "Skill não encontrada" });

    const { data: updatedSkill, error: updateError } = await supabase.from("skills").update({ is_active: !skill.is_active }).eq("id", id).select().single();
    if (updateError) return res.status(500).json({ error: "Erro ao atualizar skill" });

    res.json({ message: `Skill ${updatedSkill.is_active ? 'ativada' : 'desativada'}`, skill: updatedSkill });
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /api/admin/skills/:id
router.delete("/skills/:id", checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (id === "skill_evaluator") return res.status(403).json({ error: "Skill Evaluator cannot be deleted" });

    const { error } = await supabase.from("skills").delete().eq("id", id);
    if (error) return res.status(500).json({ error: "Erro ao deletar skill" });

    res.json({ message: "Skill deletada com sucesso" });
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// ==========================================
// FASE 11: SYSTEM DASHBOARD ENDPOINTS
// ==========================================

// GET /api/admin/system/status - Status geral do sistema autônomo
router.get("/system/status", checkAdmin, async (_req, res) => {
  try {
    const { isLoopActive, getLoopStatus, getCircuitBreakerStatus } = await import("../autonomous/index.js");

    const loopActive = isLoopActive();
    const loopStatus = getLoopStatus();
    const circuitBreaker = getCircuitBreakerStatus();

    // Buscar última execução do loop (audit log ou system_errors recente)
    const { data: recentErrors } = await supabase
      .from("system_errors")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    const lastLoopExecution = recentErrors?.[0]?.created_at || null;

    // Buscar últimas correções aplicadas
    const { count: totalFixes } = await supabase
      .from("auto_fixes")
      .select("*", { count: "exact", head: true })
      .eq("status", "applied");

    // Contar erros nas últimas 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentErrorCount } = await supabase
      .from("system_errors")
      .select("*", { count: "exact", head: true })
      .gte("created_at", twentyFourHoursAgo);

    res.json({
      loop_status: {
        is_running: loopActive,
        can_execute: loopStatus.canExecute,
        message: loopStatus.message
      },
      circuit_breaker: {
        is_active: circuitBreaker.isActive,
        consecutive_failures: circuitBreaker.consecutiveFailures,
        threshold: circuitBreaker.threshold,
        cooldown_ends_at: circuitBreaker.cooldownEndsAt,
        message: circuitBreaker.message
      },
      last_loop_execution: lastLoopExecution,
      total_fixes_applied: totalFixes || 0,
      errors_last_24h: recentErrorCount || 0,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("[Admin/System] Error fetching status:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/system/errors - Últimos erros do sistema
router.get("/system/errors", checkAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    const severity = req.query.severity as string;

    let query = supabase
      .from("system_errors")
      .select("id, error_type, source, message, stack_trace, severity, endpoint, http_status, created_at")
      .order("created_at", { ascending: false });

    if (severity) {
      query = query.eq("severity", severity);
    }

    const { data, error, count } = await supabase
      .from("system_errors")
      .select("id, error_type, source, message, stack_trace, severity, endpoint, http_status, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      errors: data || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (err: any) {
    console.error("[Admin/System] Error fetching errors:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/system/fixes - Histórico de correções automáticas
router.get("/system/fixes", checkAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string;

    let query = supabase
      .from("auto_fixes")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await supabase
      .from("auto_fixes")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      fixes: data || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (err: any) {
    console.error("[Admin/System] Error fetching fixes:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/system/decisions - Decisões de risco recentes
router.get("/system/decisions", checkAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const riskLevel = req.query.risk_level as string;
    const decision = req.query.decision as string;

    let query = supabase
      .from("risk_decisions")
      .select("*")
      .order("created_at", { ascending: false });

    if (riskLevel) {
      query = query.eq("risk_level", riskLevel);
    }

    if (decision) {
      query = query.eq("decision", decision);
    }

    const { data, error, count } = await supabase
      .from("risk_decisions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      decisions: data || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (err: any) {
    console.error("[Admin/System] Error fetching decisions:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/system/metrics - Métricas rápidas do dia
router.get("/system/metrics", checkAdmin, async (_req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayISO = startOfDay.toISOString();

    const startOfYesterday = new Date(Date.now() - 48 * 60 * 60 * 1000);
    startOfYesterday.setHours(0, 0, 0, 0);
    const startOfYesterdayISO = startOfYesterday.toISOString();

    // Métricas de hoje
    const [errorsToday, fixesToday, decisionsToday, postsPublished] = await Promise.all([
      supabase.from("system_errors").select("*", { count: "exact", head: true }).gte("created_at", startOfDayISO),
      supabase.from("auto_fixes").select("*", { count: "exact", head: true }).gte("created_at", startOfDayISO),
      supabase.from("risk_decisions").select("*", { count: "exact", head: true }).gte("created_at", startOfDayISO),
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published").gte("created_at", startOfDayISO)
    ]);

    // Métricas de ontem (para comparação)
    const [errorsYesterday, fixesYesterday] = await Promise.all([
      supabase.from("system_errors").select("*", { count: "exact", head: true }).gte("created_at", startOfYesterdayISO).lt("created_at", startOfDayISO),
      supabase.from("auto_fixes").select("*", { count: "exact", head: true }).gte("created_at", startOfYesterdayISO).lt("created_at", startOfDayISO)
    ]);

    res.json({
      today: {
        errors_detected: errorsToday.count || 0,
        fixes_applied: fixesToday.count || 0,
        risk_decisions: decisionsToday.count || 0,
        posts_published: postsPublished.count || 0
      },
      yesterday: {
        errors_detected: errorsYesterday.count || 0,
        fixes_applied: fixesYesterday.count || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("[Admin/System] Error fetching metrics:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/feeds - Lista todos os feeds
router.get("/feeds", checkAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const { data, error, count } = await supabase
      .from("feeds")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      feeds: data || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (err: any) {
    console.error("[Admin/Feeds] Error fetching feeds:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users - Lista todos os usuários
router.get("/users", checkAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const plan = req.query.plan as string;

    let query = supabase
      .from("users")
      .select("id, email, plan, usage_count, role, created_at", { count: "exact" })
      .order("created_at", { ascending: false });

    if (plan) {
      query = query.eq("plan", plan);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      users: data || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (err: any) {
    console.error("[Admin/Users] Error fetching users:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/audit-logs - Logs de auditoria
router.get("/audit-logs", checkAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const userId = req.query.user_id as string;

    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      logs: data || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (err: any) {
    console.error("[Admin/AuditLogs] Error fetching audit logs:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SYSTEM BACKUP & ROLLBACK (GIT WRAPPER)
// ==========================================

// GET /api/admin/backups - Listar snapshots
router.get("/backups", checkAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("system_snapshots")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/backups/snapshot - Criar novo ponto de restauração
router.post("/backups/snapshot", checkAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    const msg = message || `Automatic Snapshot - ${new Date().toISOString()}`;

    // 1. Git Add + Commit
    execSync('git add .');
    try {
        execSync(`git commit -m "${msg}"`);
    } catch (e: any) {
        if (e.message.includes("nothing to commit")) {
            return res.status(400).json({ error: "No changes to backup" });
        }
        throw e;
    }
    
    const hash = execSync('git rev-parse --short HEAD').toString().trim();

    // 2. Salvar no Banco
    const { data, error } = await supabase
      .from("system_snapshots")
      .insert({
        hash,
        message: msg,
        type: message ? 'manual' : 'push'
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    logAuditAction((req as any).user.id, "CREATE_SNAPSHOT", req, { hash, message: msg });
    res.json({ message: "Snapshot created successfully", snapshot: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/backups/restore - Restaurar sistema para um hash
router.post("/backups/restore", checkAdmin, async (req, res) => {
  try {
    const { hash } = req.body;
    if (!hash) return res.status(400).json({ error: "Hash required" });

    console.log(`>>> [ROLLBACK] Restoring system to: ${hash}`);

    // Git Reset
    execSync(`git reset --hard ${hash}`);
    
    logAuditAction((req as any).user.id, "RESTORE_SYSTEM", req, { hash });
    
    // Opcional: Reiniciar o servidor se estiver em modo monitorado (ex: PM2)
    // process.exit(0);

    res.json({ message: `System restored to ${hash}.` });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
