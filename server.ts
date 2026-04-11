import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import Parser from "rss-parser";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { queueService } from "./src/services/queueService.js";
import { NextFunction, Request, Response } from "express";
import { globalIpLimit, apiKeyRateLimit } from "./src/middleware/rateLimit.js";
import { logAuditAction } from "./src/middleware/auditLog.js";
import crypto from "crypto";
import { WebSocketServer, WebSocket } from "ws";
import * as Sentry from "@sentry/node";

console.log(">>> AI FEAST ENGINE SERVER STARTING...");
console.log(">>> QueueService imported successfully");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("CRITICAL: Supabase credentials missing in .env");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Sentry initialization
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.5 : 1.0,
  });
  console.log(">>> Sentry initialized");
} else {
  console.log(">>> Sentry DSN not configured, error tracking disabled");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock", {
  apiVersion: "2025-01-27.acacia" as any,
});

// ==========================================
// CACHE LAYER (Em memória)
// ==========================================
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

const memoryCache: Record<string, CacheEntry> = {};
const CACHE_TTL = {
  stats: 5 * 60 * 1000,       // 5 min
  feed: 10 * 60 * 1000,       // 10 min
  verified: 15 * 60 * 1000,   // 15 min
  search: 30 * 60 * 1000,     // 30 min
};

function cacheGet(key: string): any | null {
  const entry = memoryCache[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    delete memoryCache[key];
    return null;
  }
  console.log(`[Cache] HIT: ${key}`);
  return entry.data;
}

function cacheSet(key: string, data: any, ttl: number) {
  memoryCache[key] = { data, timestamp: Date.now(), ttl };
  console.log(`[Cache] SET: ${key} (TTL: ${ttl/1000}s)`);
}

function cacheInvalidate(pattern?: string) {
  if (pattern) {
    Object.keys(memoryCache).forEach(key => {
      if (key.includes(pattern)) delete memoryCache[key];
    });
  } else {
    Object.keys(memoryCache).forEach(key => delete memoryCache[key]);
  }
  console.log(`[Cache] INVALIDATED${pattern ? `: ${pattern}` : " (ALL)"}`);
}

// Stats WebSocket para updates em tempo real
let wss: WebSocketServer | null = null;
const wsClients = new Set<WebSocket>();

function broadcastWsUpdate(data: any) {
  const message = JSON.stringify(data);
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

const parser = new Parser({
  customFields: {
    item: [["content:encoded", "contentEncoded"]],
  }
});

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.set("trust proxy", 1);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://aifeastengine.com",
  "https://www.aifeastengine.com",
  "https://api.aifeastengine.com",
  /\.aifeastengine\.com$/,
  /\.onrender\.com$/
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(ao => (typeof ao === 'string' ? ao === origin : ao.test(origin)))) {
      return callback(null, true);
    }
    console.log(`[CORS] Blocked origin: ${origin}`);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

app.use(express.json());
app.use(globalIpLimit);

// Sentry está habilitado apenas se SENTRY_DSN estiver configurado
// A instrumentação automática do Express já funciona com Sentry.init()

// Stripe Webhook
app.post("/api/stripe-webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.log("⚠️ Stripe Webhook Secret is not set. Webhook skipped.");
    return res.status(200).json({ received: true });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as any;
      const userId = session.client_reference_id;
      const customerId = session.customer;
      console.log(`💰 Payment success: User ${userId}, Customer ${customerId}`);
      await supabase.from("users").update({ 
        plan: "pro", 
        stripe_customer_id: customerId,
        rate_limit: 100
      }).eq("id", userId);
      break;
    case "customer.subscription.deleted":
      const subscription = event.data.object as any;
      const { data: userToDowngrade } = await supabase
        .from("users")
        .select("id")
        .eq("stripe_customer_id", subscription.customer)
        .single();
      if (userToDowngrade) {
        await supabase.from("users").update({ 
          plan: "free", 
          rate_limit: 10 
        }).eq("id", userToDowngrade.id);
        console.log(`📉 User ${userToDowngrade.id} downgraded to Free.`);
      }
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  res.json({ received: true });
});

async function checkAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("Authorization");
  const userId = req.header("X-User-Id");
  
  try {
    let internalId = userId;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) throw new Error("Unauthorized");
      internalId = user.id;
    }

    if (!internalId) return res.status(401).json({ error: "Unauthorized" });

    const { data: userData } = await supabase.from("users").select("role").eq("id", internalId).single();
    if (userData?.role !== "admin") return res.status(403).json({ error: "Admin access required" });

    (req as any).user = { id: internalId };
    next();
  } catch (err) {
    res.status(401).json({ error: "Authentication failed" });
  }
}

async function runIngestion() {
  console.log(">>> [RSS] Starting Ingestion at " + new Date().toISOString());
  try {
    const { data: feeds } = await supabase.from("feeds").select("*");
    if (!feeds) return;

    // Balancear categorias: verificar quantos posts cada categoria tem
    const { data: categoryCounts } = await supabase
      .from("posts")
      .select("category")
      .then(result => {
        if (!result.data) return {};
        const counts: Record<string, number> = {};
        result.data.forEach((p: any) => {
          const cat = p.category || "General";
          counts[cat] = (counts[cat] || 0) + 1;
        });
        return counts;
      });

    // Configurar limites por categoria
    const MAX_POSTS_PER_CATEGORY = 200; // Teto por categoria
    const MIN_POSTS_PER_CATEGORY = 30; // Mínimo ideal
    const TARGET_PER_CYCLE = 5; // Target de novos posts por feed por ciclo

    console.log(`>>> [RSS] Category counts:`, categoryCounts);

    // Agrupar feeds por categoria para balancear
    const feedsByCategory: Record<string, typeof feeds> = {};
    feeds.forEach(f => {
      const cat = f.category || "General";
      if (!feedsByCategory[cat]) feedsByCategory[cat] = [];
      feedsByCategory[cat].push(f);
    });

    // Processar categorias com menos posts primeiro
    const sortedCategories = Object.keys(feedsByCategory).sort((a, b) => {
      const countA = categoryCounts[a] || 0;
      const countB = categoryCounts[b] || 0;
      return countA - countB; // Categorias com menos posts vêm primeiro
    });

    console.log(`>>> [RSS] Processing order: ${sortedCategories.join(', ')}`);

    let totalIngested = 0;

    for (const category of sortedCategories) {
      const currentCount = categoryCounts[category] || 0;
      const categoryFeeds = feedsByCategory[category];

      // Se categoria já atingiu o teto, pular
      if (currentCount >= MAX_POSTS_PER_CATEGORY) {
        console.log(`>>> [RSS] ${category}: ${currentCount} posts (MAX reached, skipping)`);
        continue;
      }

      // Calcular quantos items pegar por feed
      let itemsPerFeed = TARGET_PER_CYCLE;
      if (currentCount < MIN_POSTS_PER_CATEGORY) {
        itemsPerFeed = 15; // Categoria precisa de mais conteúdo
      } else if (currentCount > MAX_POSTS_PER_CATEGORY * 0.75) {
        itemsPerFeed = 2; // Categoria quase cheia, pegar menos
      }

      console.log(`>>> [RSS] ${category}: ${currentCount} posts, ${itemsPerFeed} items/feed`);

      for (const feed of categoryFeeds) {
        try {
          const feedData = await parser.parseURL(feed.url);
          let ingestedThisFeed = 0;

          for (const item of feedData.items.slice(0, itemsPerFeed)) {
            // Verificar se post já existe
            const { data: exists } = await supabase
              .from("posts")
              .select("id")
              .eq("link", item.link)
              .single();

            if (exists) continue;

            const rawContent = (item as any).contentEncoded || item.content || item.contentSnippet || "";

            const { error } = await supabase.from("posts").insert({
              title: item.title,
              link: item.link,
              pub_date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
              content_raw: rawContent,
              source_id: feed.id,
              category: category, // Usa a categoria do feed
              status: "pending"
            });

            if (error) {
              console.error(`Error inserting post: ${item.title}`, error.message);
            } else {
              ingestedThisFeed++;
              totalIngested++;
            }
          }

          if (ingestedThisFeed > 0) {
            console.log(`>>> [RSS] Ingested ${ingestedThisFeed} posts from ${feed.name} [${category}]`);
          }
        } catch (err: any) {
          console.error(`Failed to parse feed ${feed.url}: ${err.message}`);
        }
      }
    }

    console.log(`>>> [RSS] Ingestion complete. Total new posts: ${totalIngested}`);
  } catch (err: any) {
    console.error("Ingestion Loop Error:", err.message);
  }
}

setInterval(runIngestion, 30 * 60 * 1000);

// Heartbeat para monitoramento (a cada 5 min)
setInterval(async () => {
  try {
    const { count: pendingCount } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: publishedCount } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "published");

    console.log(`>>> [Heartbeat] ${new Date().toISOString()} | Published: ${publishedCount} | Pending: ${pendingCount} | Queue processing: active`);
  } catch (err: any) {
    console.error(`>>> [Heartbeat] Error: ${err.message}`);
  }
}, 5 * 60 * 1000);

console.log(">>> [AutoQueue] Starting interval...");
setInterval(async () => {
  console.log(">>> [AutoQueue] Verificando posts pendentes...");
  try {
    const { data: pending, error } = await supabase.from("posts").select("id").eq("status", "pending").limit(20);
    if (error) {
      console.error(">>> [AutoQueue] Erro ao buscar posts:", error.message);
      return;
    }
    console.log(`>>> [AutoQueue] Posts pendentes encontrados: ${pending?.length || 0}`);
    if (pending && pending.length > 0) {
      console.log(">>> [AutoQueue] Chamando queueService.addTasks...");
      queueService.addTasks(pending.map(p => p.id));
    }
  } catch (err: any) {
    console.error(">>> [AutoQueue] Erro:", err.message);
  }
}, 5 * 60 * 1000);

console.log(">>> [RetryHandler] Starting interval...");
setInterval(async () => {
  console.log(">>> [RetryHandler] Verificando posts com erro...");
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: errorPosts, error } = await supabase
      .from("posts")
      .select("id, retry_count")
      .eq("status", "error")
      .lt("updated_at", oneHourAgo)
      .lt("retry_count", 3)
      .limit(10);
    
    if (error) {
      console.error(">>> [RetryHandler] Erro ao buscar posts:", error.message);
      return;
    }
    
    console.log(`>>> [RetryHandler] Posts com erro para retry: ${errorPosts?.length || 0}`);
    
    if (errorPosts && errorPosts.length > 0) {
      const idsToRetry = errorPosts.map(p => p.id);
      await supabase.from("posts").update({ status: "pending" }).in("id", idsToRetry);
      console.log(`>>> [RetryHandler] Posts resetados para pending: ${idsToRetry.length}`);
    }
  } catch (err: any) {
    console.error(">>> [RetryHandler] Erro:", err.message);
  }
}, 30 * 60 * 1000);

app.get("/api/health", (req, res) => res.json({ status: "alive" }));

app.get("/api/stats", async (req, res) => {
  const [{ count: postsCount }, { count: feedsCount }] = await Promise.all([
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("feeds").select("*", { count: "exact", head: true })
  ]);
  res.json({ 
    postsCount: postsCount || 0, 
    feedsCount: feedsCount || 0, 
    languages: 11 
  });
});

app.get("/api/feed", apiKeyRateLimit, async (req, res) => {
  const apiKey = req.header("X-API-Key") || req.query.key;
  if (!apiKey) return res.status(401).json({ error: "API Key required" });

  const { data: user } = await supabase.from("users").select("*").eq("api_key", apiKey).single();
  if (!user) return res.status(403).json({ error: "Invalid API Key" });

  if (user.plan === "free" && user.usage_count >= 100) {
    return res.status(429).json({ error: "Free limit reached (100/mo)" });
  }

  await supabase.from("users").update({ usage_count: user.usage_count + 1 }).eq("id", user.id);
  await supabase.from("usage_logs").insert({
    user_id: user.id,
    endpoint: "/api/feed",
    cost: user.plan === "pro" ? 0.001 : 0
  });

  const { data: posts } = await supabase.from("posts").select("*").eq("status", "published").order("created_at", { ascending: false }).limit(20);
  res.json({ posts: posts || [] });
});

app.post("/api/user/rotate-key", async (req, res) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    console.error("Rotate key auth error:", authError?.message);
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Gera nova chave
  const newKey = "af_" + crypto.randomBytes(24).toString("hex");
  
  // Verifica se o usuário existe na tabela users
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .single();
  
  let updateError;
  
  if (existingUser) {
    // Usuário existe, só atualiza a chave
    const { error } = await supabase
      .from("users")
      .update({ api_key: newKey })
      .eq("id", user.id);
    updateError = error;
  } else {
    // Usuário não existe, cria registro
    const { error } = await supabase
      .from("users")
      .insert({
        id: user.id,
        email: user.email,
        api_key: newKey,
        plan: "free",
        usage_count: 0
      });
    updateError = error;
  }

  if (updateError) {
    console.error("Rotate key DB error:", updateError.message);
    return res.status(500).json({ error: "Failed to generate API key: " + updateError.message });
  }
  
  console.log(`API key generated/rotated for user ${user.email}`);
  res.json({ api_key: newKey });
});

app.get("/api/admin/posts", checkAdmin, async (req, res) => {
  const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/admin/process-batch", checkAdmin, async (req, res) => {
  const { data: pending } = await supabase.from("posts").select("id").eq("status", "pending").limit(50);
  if (!pending?.length) return res.json({ message: "No pending posts" });

  queueService.addTasks(pending.map(p => p.id));
  logAuditAction((req as any).user.id, "PROCESS_BATCH_MANUAL", req, { count: pending.length });
  cacheInvalidate("feed"); // Invalida cache de feed
  broadcastWsUpdate({ type: "queue_update", pending_count: pending.length });
  res.json({ message: `Queueing ${pending.length} posts` });
});

app.post("/api/admin/feeds", checkAdmin, async (req, res) => {
  const { name, url, category } = req.body;
  const { data, error } = await supabase.from("feeds").insert({ name, url, category }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  logAuditAction((req as any).user.id, "ADD_FEED", req, { name, url });
  res.json(data);
});

// GET /api/admin/feeds/summary - Ver feeds por categoria (diagnóstico)
app.get("/api/admin/feeds/summary", checkAdmin, async (req, res) => {
  try {
    const { data: feeds } = await supabase
      .from("feeds")
      .select("id, name, url, category")
      .order("category");

    const { data: posts } = await supabase
      .from("posts")
      .select("category, status")
      .eq("status", "published");

    // Contar feeds por categoria
    const feedByCategory: Record<string, number> = {};
    feeds?.forEach(f => {
      const cat = f.category || "Uncategorized";
      feedByCategory[cat] = (feedByCategory[cat] || 0) + 1;
    });

    // Contar posts por categoria
    const postByCategory: Record<string, number> = {};
    posts?.forEach(p => {
      const cat = p.category || "Uncategorized";
      postByCategory[cat] = (postByCategory[cat] || 0) + 1;
    });

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

// PATCH /api/admin/feeds/:id - Atualizar categoria de um feed
app.patch("/api/admin/feeds/:id", checkAdmin, async (req, res) => {
  const { category } = req.body;
  const validCategories = ["Tech", "Finance", "Science", "Health", "General"];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: "Categoria inválida", valid: validCategories });
  }

  const { data, error } = await supabase
    .from("feeds")
    .update({ category })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  logAuditAction((req as any).user.id, "UPDATE_FEED_CATEGORY", req, { feed_id: req.params.id, category });
  res.json(data);
});

// ==========================================
// BLOCO 2: ADMIN SKILLS GENERATOR
// ==========================================

// Middleware: verificar ADMIN_SECRET no header
async function checkAdminSecret(req: Request, res: Response, next: NextFunction) {
  const adminSecret = req.header("X-Admin-Secret");
  const expectedSecret = process.env.ADMIN_SECRET;

  if (!expectedSecret) {
    return res.status(500).json({ error: "Admin secret not configured" });
  }

  if (!adminSecret || adminSecret !== expectedSecret) {
    return res.status(403).json({ error: "Invalid admin secret" });
  }

  next();
}

// POST /api/admin/skills/generate - Gerar skill com IA
app.post("/api/admin/skills/generate", checkAdminSecret, async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || prompt.trim().length < 10) {
      return res.status(400).json({ error: "Prompt deve ter pelo menos 10 caracteres" });
    }

    console.log(`[SkillGen] Gerando skill com prompt: ${prompt.substring(0, 100)}...`);

    const systemPrompt = `Você é um gerador de skills para agentes de IA. Sua tarefa é criar um objeto JSON válido representando uma skill.

Regras:
1. Retorne APENAS JSON válido, sem markdown, sem explicações, sem texto antes ou depois.
2. Todos os campos são obrigatórios exceto long_description.
3. category deve ser uma destas: "development", "content", "automation", "analysis", "security"
4. risk_level deve ser: "low", "medium", ou "high"
5. tags deve ser um array de 3-6 palavras-chave relevantes
6. input_schema e output_schema devem seguir JSON Schema
7. code deve ser um template do código que a skill executaria (Node.js/TypeScript)
8. install_command e run_command devem seguir o padrão: npx aifeast <skill-slug>

Estrutura obrigatória do JSON:
{
  "id": "snake_case_unique_id",
  "name": "Nome Legivel da Skill",
  "slug": "nome-legivel-da-skill",
  "description": "Descricao curta em 1 frase",
  "long_description": "Descricao detalhada de 2-3 frases",
  "category": "uma das categorias validas",
  "tags": ["tag1", "tag2", "tag3"],
  "input_schema": {"type": "object", "properties": {}},
  "output_schema": {"type": "object", "properties": {}},
  "code": "// codigo template da skill",
  "install_command": "npx aifeast <slug>",
  "run_command": "npx aifeast run <slug>",
  "risk_level": "low"
}

Exemplo de boa resposta:
{"id":"generate_typescript_types","name":"Generate TypeScript Types","slug":"generate-typescript-types","description":"Gera tipos TypeScript a partir de um schema JSON","long_description":"Analisa um schema JSON e gera interfaces TypeScript correspondentes automaticamente.","category":"development","tags":["typescript","types","schema","codegen"],"input_schema":{"type":"object","properties":{"schema":{"type":"string","description":"JSON Schema de entrada"}}},"output_schema":{"type":"object","properties":{"types":{"type":"string","description":"Codigo TypeScript gerado"}}},"code":"export function generateTypes(schema: string): string {\\n  // Parse schema and generate TypeScript interfaces\\n  return generatedCode;\\n}","install_command":"npx aifeast generate-typescript-types","run_command":"npx aifeast run generate-typescript-types","risk_level":"low"}`;

    const userPrompt = `Crie uma skill com base nesta descrição:

${prompt}

Retorne APENAS o JSON válido, sem markdown ou explicações.`;

    // Chamar Groq
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 2048
      })
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error(`[SkillGen] Groq error: ${groqResponse.status} - ${errorText}`);
      return res.status(500).json({ error: "Erro ao gerar skill com IA", details: errorText });
    }

    const groqData = await groqResponse.json();
    let responseText = groqData.choices[0]?.message?.content || "";

    // Limpar response de markup
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
      console.error(`[SkillGen] JSON parse error: ${parseError.message}`);
      console.error(`[SkillGen] Raw response: ${responseText.substring(0, 500)}`);
      return res.status(500).json({ error: "IA gerou JSON inválido", raw: responseText.substring(0, 500) });
    }

    // Validar campos obrigatórios
    const requiredFields = ['id', 'name', 'slug', 'description', 'category', 'tags', 'input_schema', 'output_schema', 'risk_level'];
    const missingFields = requiredFields.filter(f => !skillJson[f]);

    if (missingFields.length > 0) {
      return res.status(422).json({
        error: "Skill gerada está incompleta",
        missing: missingFields,
        raw: responseText.substring(0, 500)
      });
    }

    // Validar categoria
    const validCategories = ['development', 'content', 'automation', 'analysis', 'security'];
    if (!validCategories.includes(skillJson.category)) {
      return res.status(422).json({ error: "Categoria inválida", valid: validCategories });
    }

    // Validar risk_level
    const validRisks = ['low', 'medium', 'high'];
    if (!validRisks.includes(skillJson.risk_level)) {
      return res.status(422).json({ error: "Risk level inválido", valid: validRisks });
    }

    // Gerar slug se não existir
    if (!skillJson.slug) {
      skillJson.slug = skillJson.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    // Salvar no banco
    const { data: savedSkill, error: dbError } = await supabase
      .from("skills")
      .insert({
        id: skillJson.id,
        name: skillJson.name,
        slug: skillJson.slug,
        description: skillJson.description,
        long_description: skillJson.long_description || skillJson.description,
        category: skillJson.category,
        tags: skillJson.tags,
        input_schema: skillJson.input_schema,
        output_schema: skillJson.output_schema,
        code: skillJson.code || '',
        install_command: skillJson.install_command || `npx aifeast ${skillJson.slug}`,
        run_command: skillJson.run_command || `npx aifeast run ${skillJson.slug}`,
        risk_level: skillJson.risk_level,
        verified: false,
        is_active: true
      })
      .select()
      .single();

    if (dbError) {
      if (dbError.code === '23505') { // unique violation
        return res.status(409).json({ error: "Skill com este id ou slug já existe", details: dbError.message });
      }
      return res.status(500).json({ error: "Erro ao salvar skill no banco", details: dbError.message });
    }

    // Invalidar cache
    cacheInvalidate("skills");

    console.log(`[SkillGen] Skill criada com sucesso: ${savedSkill.name} (${savedSkill.slug})`);

    res.status(201).json({
      message: "Skill gerada e salva com sucesso!",
      skill: savedSkill
    });
  } catch (err: any) {
    console.error("[SkillGen] Erro inesperado:", err.message);
    res.status(500).json({ error: "Erro interno ao gerar skill" });
  }
});

// POST /api/admin/skills/:id/toggle - Ativar/desativar skill
app.post("/api/admin/skills/:id/toggle", checkAdminSecret, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: skill, error: fetchError } = await supabase
      .from("skills")
      .select("is_active")
      .eq("id", id)
      .single();

    if (fetchError || !skill) {
      return res.status(404).json({ error: "Skill não encontrada" });
    }

    const { data: updatedSkill, error: updateError } = await supabase
      .from("skills")
      .update({ is_active: !skill.is_active })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: "Erro ao atualizar skill" });
    }

    cacheInvalidate("skills");

    res.json({
      message: `Skill ${updatedSkill.is_active ? 'ativada' : 'desativada'}`,
      skill: updatedSkill
    });
  } catch (err: any) {
    res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /api/admin/skills/:id - Deletar skill
app.delete("/api/admin/skills/:id", checkAdminSecret, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from("skills").delete().eq("id", id);
    if (error) {
      return res.status(500).json({ error: "Erro ao deletar skill" });
    }

    cacheInvalidate("skills");
    res.json({ message: "Skill deletada com sucesso" });
  } catch (err: any) {
    res.status(500).json({ error: "Erro interno" });
  }
});

app.post("/api/create-checkout-session", async (req, res) => {
  const { userId, email } = req.body;
  if (!userId || !email) return res.status(400).json({ error: "Missing data" });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
      mode: "subscription",
      success_url: `${req.headers.origin}/dashboard?success=true`,
      cancel_url: `${req.headers.origin}/dashboard?canceled=true`,
      customer_email: email,
      client_reference_id: userId,
      metadata: { userId }
    });
    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// NEW: Sitemap.xml (Dinâmico)
// ==========================================
app.get("/sitemap.xml", async (req, res) => {
  try {
    const cached = cacheGet("sitemap");
    if (cached) {
      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Cache-Control", "public, max-age=300");
      return res.send(cached);
    }

    const { data: posts } = await supabase
      .from("posts")
      .select("link, created_at, title")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(5000);

    const baseUrl = process.env.APP_URL || "https://www.aifeastengine.com";
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/feed</loc>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/docs</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/dashboard</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;

    if (posts) {
      posts.forEach(post => {
        const safeUrl = post.link?.replace(/[<>&"']/g, "");
        if (safeUrl && safeUrl.startsWith("http")) {
          xml += `
  <url>
    <loc>${safeUrl}</loc>
    <lastmod>${new Date(post.created_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
        }
      });
    }

    xml += `\n</urlset>`;

    cacheSet("sitemap", xml, 60 * 60 * 1000); // Cache 1h
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err: any) {
    console.error("Sitemap error:", err.message);
    res.status(500).json({ error: "Failed to generate sitemap" });
  }
});

// ==========================================
// NEW: Verified Score Endpoint
// ==========================================
app.get("/api/verified", apiKeyRateLimit, async (req, res) => {
  const apiKey = req.header("X-API-Key") || req.query.key;
  if (!apiKey) return res.status(401).json({ error: "API Key required" });

  const { data: user } = await supabase.from("users").select("*").eq("api_key", apiKey).single();
  if (!user) return res.status(403).json({ error: "Invalid API Key" });

  if (user.plan === "free" && user.usage_count >= 100) {
    return res.status(429).json({ error: "Free limit reached (100/mo)" });
  }

  await supabase.from("users").update({ usage_count: user.usage_count + 1 }).eq("id", user.id);
  await supabase.from("usage_logs").insert({
    user_id: user.id,
    endpoint: "/api/verified",
    cost: user.plan === "pro" ? 0.001 : 0
  });

  // Retorna apenas posts com score de verificação alto
  const { data: verifiedPosts } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "published")
    .not("summary", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);

  // Adiciona verified_score baseado na qualidade do conteúdo
  const scoredPosts = (verifiedPosts || []).map(post => ({
    ...post,
    verified_score: calculateVerifiedScore(post),
    is_verified: post.summary && post.translations && Object.keys(post.translations || {}).length >= 8
  }));

  const filteredPosts = scoredPosts.filter(p => p.is_verified);

  res.json({
    posts: filteredPosts,
    total_verified: filteredPosts.length,
    verified_percentage: verifiedPosts?.length ? Math.round((filteredPosts.length / verifiedPosts.length) * 100) : 0
  });
});

function calculateVerifiedScore(post: any): number {
  let score = 0;

  // Tem título? (+20)
  if (post.title && post.title.length > 10) score += 20;

  // Tem summary? (+30)
  if (post.summary && post.summary.length > 50) score += 30;

  // Tem traduções completas? (+30)
  if (post.translations) {
    const translationCount = Object.keys(post.translations).length;
    score += Math.min(30, (translationCount / 10) * 30);
  }

  // Tem conteúdo raw? (+20)
  if (post.content_raw && post.content_raw.length > 200) score += 20;

  return Math.round(score);
}

// ==========================================
// NEW: Search Endpoint
// ==========================================
app.get("/api/search", apiKeyRateLimit, async (req, res) => {
  const { q, lang, category, limit = 20, offset = 0 } = req.query;
  const apiKey = req.header("X-API-Key");

  if (apiKey) {
    const { data: user } = await supabase.from("users").select("*").eq("api_key", apiKey).single();
    if (!user) return res.status(403).json({ error: "Invalid API Key" });
    if (user.plan === "free" && user.usage_count >= 100) {
      return res.status(429).json({ error: "Free limit reached (100/mo)" });
    }
    await supabase.from("users").update({ usage_count: user.usage_count + 1 }).eq("id", user.id);
    await supabase.from("usage_logs").insert({
      user_id: user.id,
      endpoint: "/api/search",
      cost: user.plan === "pro" ? 0.001 : 0
    });
  }

  const cacheKey = `search:${q}:${lang}:${category}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.json(cached);

  let query = supabase
    .from("posts")
    .select("*", { count: "exact" })
    .eq("status", "published");

  // Busca por título ou summary
  if (q) {
    query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%`);
  }

  // Filtro por idioma (nas traduções)
  if (lang) {
    // Supabase não suporta filtro JSONB nativo simples, então filtramos depois
  }

  // Filtro por categoria
  if (category) {
    query = query.eq("category", category);
  }

  // Paginação
  const limitNum = Math.min(Number(limit), 50);
  const offsetNum = Number(offset);
  query = query.range(offsetNum, offsetNum + limitNum - 1);

  const { data: posts, error, count } = await query.order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Filtra por idioma se necessário
  let filteredPosts = posts || [];
  if (lang) {
    filteredPosts = filteredPosts.filter(post => {
      if (lang === "pt") return !!post.summary;
      return post.translations?.[lang as string];
    }).map(post => {
      if (lang === "pt") return post;
      return {
        ...post,
        title: post.translations?.[lang as string] || post.title,
        summary: post.translations?.[lang as string] || post.summary,
        language: lang
      };
    });
  }

  const result = {
    query: q,
    total: count || 0,
    limit: limitNum,
    offset: offsetNum,
    posts: filteredPosts,
    has_more: (offsetNum + limitNum) < (count || 0)
  };

  cacheSet(cacheKey, result, CACHE_TTL.search);
  res.json(result);
});

// ==========================================
// UPDATED: Feed endpoint com Cache + Pagination + Filtros
// ==========================================
app.get("/api/feed", apiKeyRateLimit, async (req, res) => {
  const apiKey = req.header("X-API-Key") || req.query.key;
  if (!apiKey) return res.status(401).json({ error: "API Key required" });

  const { data: user } = await supabase.from("users").select("*").eq("api_key", apiKey).single();
  if (!user) return res.status(403).json({ error: "Invalid API Key" });

  if (user.plan === "free" && user.usage_count >= 100) {
    return res.status(429).json({ error: "Free limit reached (100/mo)" });
  }

  const { lang, category, limit = 20, offset = 0 } = req.query;

  // Cache key baseado nos parâmetros
  const cacheKey = `feed:${apiKey}:${lang}:${category}:${limit}:${offset}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    await supabase.from("users").update({ usage_count: user.usage_count + 1 }).eq("id", user.id);
    await supabase.from("usage_logs").insert({
      user_id: user.id,
      endpoint: "/api/feed",
      cost: user.plan === "pro" ? 0.001 : 0
    });
    return res.json(cached);
  }

  await supabase.from("users").update({ usage_count: user.usage_count + 1 }).eq("id", user.id);
  await supabase.from("usage_logs").insert({
    user_id: user.id,
    endpoint: "/api/feed",
    cost: user.plan === "pro" ? 0.001 : 0
  });

  let query = supabase
    .from("posts")
    .select("*", { count: "exact" })
    .eq("status", "published");

  if (category) {
    query = query.eq("category", category);
  }

  const limitNum = Math.min(Number(limit), 50);
  const offsetNum = Number(offset);
  query = query.range(offsetNum, offsetNum + limitNum - 1);

  const { data: posts, count } = await query.order("created_at", { ascending: false });

  let filteredPosts = posts || [];

  // Filtra/seleciona idioma
  if (lang && lang !== "pt") {
    filteredPosts = filteredPosts
      .filter(post => post.translations?.[lang as string])
      .map(post => ({
        ...post,
        title: post.translations?.[lang as string] || post.title,
        summary: post.translations?.[lang as string] || post.summary,
        language: lang
      }));
  } else if (lang === "pt") {
    filteredPosts = filteredPosts.filter(post => post.summary);
  }

  const result = {
    total: count || 0,
    limit: limitNum,
    offset: offsetNum,
    posts: filteredPosts,
    has_more: (offsetNum + limitNum) < (count || 0),
    user_plan: user.plan,
    remaining_requests: user.plan === "free" ? Math.max(0, 100 - user.usage_count) : "unlimited"
  };

  cacheSet(cacheKey, result, CACHE_TTL.feed);
  res.json(result);
});

// ==========================================
// NEW: Stats endpoint com Cache
// ==========================================
app.get("/api/stats", async (req, res) => {
  const cached = cacheGet("stats");
  if (cached) return res.json(cached);

  const [{ count: postsCount }, { count: feedsCount }] = await Promise.all([
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("feeds").select("*", { count: "exact", head: true })
  ]);

  const stats = {
    postsCount: postsCount || 0,
    feedsCount: feedsCount || 0,
    languages: 11,
    cache_enabled: true
  };

  cacheSet("stats", stats, CACHE_TTL.stats);
  res.json(stats);
});

// ==========================================
// SKILLS SYSTEM - Bloco 1: API Pública
// ==========================================

// Helper: Verificar limite do plano
function checkPlanLimit(user: any): { allowed: boolean; limit: number | string; remaining: number | string } {
  const limits: Record<string, number> = {
    free: 100,
    pro: 10000,
    enterprise: -1 // ilimitado
  };

  const limit = limits[user.plan] || limits.free;
  const usageCount = user.usage_count || 0;

  if (limit === -1) {
    return { allowed: true, limit: "unlimited", remaining: "unlimited" };
  }

  const remaining = Math.max(0, limit - usageCount);
  return {
    allowed: usageCount < limit,
    limit,
    remaining
  };
}

// GET /api/skills - Listar skills ativas (público)
app.get("/api/skills", async (req, res) => {
  try {
    const cached = cacheGet("skills:list");
    if (cached) return res.json(cached);

    const { data: skills, error } = await supabase
      .from("skills")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Skills list error:", error.message);
      return res.status(500).json({ error: "Failed to fetch skills" });
    }

    const result = {
      skills: skills || [],
      total: skills?.length || 0,
      categories: ["development", "content", "automation", "analysis", "security"]
    };

    cacheSet("skills:list", result, 15 * 60 * 1000); // Cache 15 min
    res.json(result);
  } catch (err: any) {
    console.error("Skills list error:", err.message);
    res.status(500).json({ error: "Failed to fetch skills" });
  }
});

// GET /api/skills/search?q= - Buscar skills (público)
app.get("/api/skills/search", async (req, res) => {
  try {
    const { q, category } = req.query;

    if (!q && !category) {
      return res.status(400).json({ error: "Provide 'q' or 'category' parameter" });
    }

    const cacheKey = `skills:search:${q}:${category}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    let query = supabase
      .from("skills")
      .select("*")
      .eq("is_active", true);

    if (category) {
      query = query.eq("category", category);
    }

    if (q) {
      // Supabase não suporta busca full-text em array diretamente, filtramos depois
      const { data: allSkills, error } = await query;
      if (error) throw new Error(error.message);

      const searchTerm = (q as string).toLowerCase();
      const filtered = (allSkills || []).filter(skill =>
        skill.name?.toLowerCase().includes(searchTerm) ||
        skill.description?.toLowerCase().includes(searchTerm) ||
        skill.long_description?.toLowerCase().includes(searchTerm) ||
        (skill.tags && skill.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm)))
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
    console.error("Skills search error:", err.message);
    res.status(500).json({ error: "Failed to search skills" });
  }
});

// GET /api/skills/:slug - Detalhe da skill (público)
app.get("/api/skills/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const cached = cacheGet(`skills:detail:${slug}`);
    if (cached) return res.json(cached);

    const { data: skill, error } = await supabase
      .from("skills")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error || !skill) {
      return res.status(404).json({ error: "Skill not found" });
    }

    // Incrementar downloads
    await supabase
      .from("skills")
      .update({ downloads: (skill.downloads || 0) + 1 })
      .eq("id", skill.id);

    const result = { ...skill, downloads: (skill.downloads || 0) + 1 };
    cacheSet(`skills:detail:${slug}`, result, 30 * 60 * 1000); // Cache 30 min
    res.json(result);
  } catch (err: any) {
    console.error("Skill detail error:", err.message);
    res.status(500).json({ error: "Failed to fetch skill" });
  }
});

// POST /api/skills/:slug/execute - Executar skill (requer API Key)
app.post("/api/skills/:slug/execute", apiKeyRateLimit, async (req, res) => {
  try {
    const { slug } = req.params;
    const apiKey = req.header("X-API-Key");
    const userInput = req.body;

    if (!apiKey) {
      return res.status(401).json({ error: "API Key required. Add X-API-Key header." });
    }

    // Buscar usuário
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("api_key", apiKey)
      .single();

    if (userError || !user) {
      return res.status(403).json({ error: "Invalid API Key" });
    }

    // Buscar skill
    const { data: skill, error: skillError } = await supabase
      .from("skills")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (skillError || !skill) {
      return res.status(404).json({ error: "Skill not found or inactive" });
    }

    // Verificar limite do plano
    const planCheck = checkPlanLimit(user);
    if (!planCheck.allowed) {
      return res.status(402).json({
        error: "Monthly request limit reached",
        plan: user.plan,
        limit: planCheck.limit,
        usage_count: user.usage_count,
        message: "Upgrade to Pro for more requests or wait for next month reset"
      });
    }

    // Incrementar usage_count do usuário
    await supabase
      .from("users")
      .update({ usage_count: (user.usage_count || 0) + 1 })
      .eq("id", user.id);

    // Log de uso
    await supabase
      .from("usage_logs")
      .insert({
        user_id: user.id,
        endpoint: `/api/skills/${slug}/execute`,
        cost: user.plan === "pro" ? 0.001 : 0
      });

    // Executar skill (Bloco 2: aqui chamará a IA, Bloco 3: executará código)
    // Por enquanto, retorna a descrição da skill com os inputs
    const executionResult = {
      skill_id: skill.id,
      skill_name: skill.name,
      status: "executed",
      input_received: userInput,
      message: "Skill execution simulated (full execution in Bloco 2-3)",
      risk_level: skill.risk_level,
      usage_remaining: planCheck.remaining
    };

    res.json(executionResult);
  } catch (err: any) {
    console.error("Skill execution error:", err.message);
    res.status(500).json({ error: "Failed to execute skill" });
  }
});

// ==========================================
// Global Error Handlers
// ==========================================
process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION:", error.message);
  if (process.env.SENTRY_DSN) Sentry.captureException(error);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
  if (process.env.SENTRY_DSN && reason instanceof Error) Sentry.captureException(reason);
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> Server running at http://localhost:${PORT}`);
    console.log(`>>> WebSocket server starting on ws://localhost:${PORT}`);
    runIngestion();
  });

  // WebSocket setup para updates em tempo real
  wss = new WebSocketServer({ server, path: "/ws/stats" });
  wss.on("connection", (ws) => {
    console.log("[WebSocket] Client connected");
    wsClients.add(ws);

    // Envia stats iniciais
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published").then(({ count }) => {
      ws.send(JSON.stringify({ type: "stats", postsCount: count }));
    });

    ws.on("close", () => {
      console.log("[WebSocket] Client disconnected");
      wsClients.delete(ws);
    });

    ws.on("error", (err) => {
      console.error("[WebSocket] Error:", err.message);
      wsClients.delete(ws);
    });
  });
}

startServer();