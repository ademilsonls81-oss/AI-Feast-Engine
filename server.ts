import "dotenv/config";
import OpenAI from "openai";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import Parser from "rss-parser";
import Stripe from "stripe";
import crypto from "crypto";
import { WebSocketServer, WebSocket } from "ws";
import * as Sentry from "@sentry/node";

import { supabase } from "./src/lib/supabase.js";
import { queueService } from "./src/services/queueService.js";
import { globalIpLimit, apiKeyRateLimit } from "./src/middleware/rateLimit.js";
import adminRouter from "./src/routes/admin.js";
import skillsRouter from "./src/routes/skills.js";
import publicRouter from "./src/routes/public.js";
import { startCronJob } from "./src/services/skillScheduler.js";
import { startMonthlyResetJob } from "./src/services/monthlyReset.js";
import { startMonitor } from "./src/autonomous/monitor.js";

// ==========================================
// SECURITY: Timing-safe string comparison
// ==========================================
function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

console.log(">>> AI FEAST ENGINE SERVER STARTING...");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock", { apiVersion: "2026-03-25.dahlia" as any });

// ==========================================
// CACHE LAYER (Em memória)
// ==========================================
interface CacheEntry { data: any; timestamp: number; ttl: number; }
const memoryCache: Record<string, CacheEntry> = {};

function cacheGet(key: string): any | null {
  const entry = memoryCache[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) { delete memoryCache[key]; return null; }
  console.log(`[Cache] HIT: ${key}`);
  return entry.data;
}

function cacheSet(key: string, data: any, ttl: number) {
  memoryCache[key] = { data, timestamp: Date.now(), ttl };
  console.log(`[Cache] SET: ${key} (TTL: ${ttl/1000}s)`);
}

export function cacheInvalidate(pattern?: string) {
  if (pattern) {
    Object.keys(memoryCache).forEach(key => { if (key.includes(pattern)) delete memoryCache[key]; });
  } else {
    Object.keys(memoryCache).forEach(key => delete memoryCache[key]);
  }
  console.log(`[Cache] INVALIDATED${pattern ? `: ${pattern}` : " (ALL)"}`);
}

// Stats WebSocket para updates em tempo real
export let wss: WebSocketServer | null = null;
const wsClients = new Set<WebSocket>();

export function broadcastWsUpdate(data: any) {
  const message = JSON.stringify(data);
  wsClients.forEach(client => { if (client.readyState === WebSocket.OPEN) client.send(message); });
}

const parser = new Parser({ customFields: { item: [["content:encoded", "contentEncoded"]] } });

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
app.set("trust proxy", 1);

const allowedOrigins = ["http://localhost:5173", "http://localhost:3000", "https://aifeastengine.com", "https://www.aifeastengine.com", "https://api.aifeastengine.com", /\.aifeastengine\.com$/, /\.onrender\.com$/];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(ao => (typeof ao === 'string' ? ao === origin : ao.test(origin)))) return callback(null, true);
    console.log(`[CORS] Blocked origin: ${origin}`);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

app.use(globalIpLimit);

// Stripe Webhook — DEVE vir ANTES do express.json() para preservar raw body
app.post("/api/stripe-webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.log("⚠️ Stripe Webhook Secret is not set.");
    return res.status(200).json({ received: true });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
    console.log(`📥 Webhook received: ${event.type} (ID: ${event.id})`);
  } catch (err: any) {
    console.error(`❌ Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;
      const userId = session.client_reference_id;
      console.log(`💰 Payment success: User ${userId}`);
      console.log(`   Customer: ${session.customer}`);
      console.log(`   Subscription: ${session.subscription}`);

      if (!userId) {
        console.error("❌ client_reference_id is missing in session!");
        return res.json({ received: true, error: "missing client_reference_id" });
      }

      const { error } = await supabase.from("users").update({
        plan: "pro",
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        rate_limit: 100
      }).eq("id", userId);

      if (error) {
        console.error(`❌ Failed to update user ${userId}: ${error.message}`);
      } else {
        console.log(`✅ User ${userId} upgraded to PRO successfully`);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as any;
      const { data: u, error } = await supabase.from("users").select("id").eq("stripe_customer_id", subscription.customer).single();
      if (error) { console.error(`❌ Error finding user: ${error.message}`); break; }
      if (u) {
        await supabase.from("users").update({ plan: "free", rate_limit: 10, stripe_subscription_id: null }).eq("id", u.id);
        console.log(`📉 User ${u.id} downgraded.`);
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as any;
      const customerId = invoice.customer;
      const { data: u, error } = await supabase.from("users").select("id").eq("stripe_customer_id", customerId).single();
      if (error) { console.error(`❌ Error finding user for failed invoice: ${error.message}`); break; }
      if (u) {
        await supabase.from("users").update({ plan: "free", rate_limit: 10, stripe_subscription_id: null }).eq("id", u.id);
        console.log(`💳 Payment failed: User ${u.id} downgraded to free.`);
      }
      break;
    }
  }
  res.json({ received: true });
});

// JSON parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Hard limit: rejeitar payloads > 10MB
app.use((req, res, next) => {
  const cl = parseInt(req.headers["content-length"] || "0");
  if (cl > 10 * 1024 * 1024) return res.status(413).json({ error: "Payload too large — max 10MB" });
  next();
});

// ==========================================
// REGISTER MODULAR ROUTERS
// ==========================================
app.use("/api/admin", adminRouter);
app.use("/api/skills", skillsRouter);
app.use("/api", publicRouter); // /api/verified, /api/search, /api/feed, /api/stats

// ==========================================
// HEALTH
// ==========================================
app.get("/api/health", (req, res) => res.json({ status: "alive" }));

// ==========================================
// CHAT
// ==========================================
const chatClients: Record<string, OpenAI> = {};
function getChatClient(model: string): OpenAI {
  const useGroq = process.env.OPENAI_BASE_URL?.includes("groq");
  const key = useGroq ? process.env.OPENAI_API_KEY! : process.env.OPENAI_API_KEY || "local";
  const baseUrl = useGroq ? "https://api.groq.com/openai/v1" : process.env.OPENAI_BASE_URL || "https://api.groq.com/openai/v1";
  const cacheKey = `${model}-${baseUrl}`;
  if (!chatClients[cacheKey]) chatClients[cacheKey] = new OpenAI({ apiKey: key, baseURL: baseUrl });
  return chatClients[cacheKey];
}

app.post("/api/chat", apiKeyRateLimit, async (req, res) => {
  const apiKey = req.header("X-API-Key");
  if (!apiKey) return res.status(401).json({ error: "API Key required — use header X-API-Key" });

  const { data: user } = await supabase.from("users").select("*").eq("api_key", apiKey).single();
  if (!user) return res.status(403).json({ error: "Invalid API Key" });
  if (user.plan === "free" && user.usage_count >= 100) return res.status(429).json({ error: "Free limit reached (100/mo)" });

  const { model, messages, temperature = 0.7 } = req.body;
  if (!model || !messages) return res.status(400).json({ error: "model and messages required" });

  try {
    const client = getChatClient(model);
    const response = await client.chat.completions.create({ model, messages, temperature });
    await supabase.from("users").update({ usage_count: user.usage_count + 1 }).eq("api_key", apiKey);
    res.json({ model: response.model, choices: response.choices, usage: response.usage });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// USER ROTATE KEY
// ==========================================
app.post("/api/user/rotate-key", async (req, res) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

  const newKey = "af_" + crypto.randomBytes(24).toString("hex");
  const { data: existingUser } = await supabase.from("users").select("id").eq("id", user.id).single();

  let updateError;
  if (existingUser) {
    const { error } = await supabase.from("users").update({ api_key: newKey }).eq("id", user.id);
    updateError = error;
  } else {
    const { error } = await supabase.from("users").insert({ id: user.id, email: user.email, api_key: newKey, plan: "free", usage_count: 0 });
    updateError = error;
  }

  if (updateError) return res.status(500).json({ error: "Failed to generate API key: " + updateError.message });
  console.log(`API key generated for user ${user.email}`);
  res.json({ api_key: newKey });
});

// ==========================================
// STRIPE CHECKOUT
// ==========================================
app.post("/api/create-checkout-session", async (req, res) => {
  const { userId, email } = req.body;
  if (!userId || !email) return res.status(400).json({ error: "Missing data" });
  if (process.env.STRIPE_ENABLED !== "true") return res.status(503).json({ error: "Stripe not enabled" });
  try {
    const baseUrl = req.headers.origin || process.env.APP_URL || "https://www.aifeastengine.com";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}/dashboard?success=true`,
      cancel_url: `${baseUrl}/dashboard?canceled=true`,
      customer_email: email,
      client_reference_id: userId,
      metadata: { userId }
    });
    res.json({ url: session.url });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// STRIPE CUSTOMER PORTAL
// ==========================================
app.post("/api/create-portal-session", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });
  if (process.env.STRIPE_ENABLED !== "true") return res.status(503).json({ error: "Stripe not enabled" });
  try {
    const { data: user, error } = await supabase.from("users").select("stripe_customer_id, plan").eq("id", userId).single();
    if (error || !user) return res.status(404).json({ error: "User not found" });
    if (user.plan !== "pro" || !user.stripe_customer_id) return res.status(400).json({ error: "Only Pro users can manage subscriptions" });
    const baseUrl = req.headers.origin || process.env.APP_URL || "https://www.aifeastengine.com";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${baseUrl}/dashboard`
    });
    res.json({ url: portalSession.url });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// SITEMAP
// ==========================================
app.get("/sitemap.xml", async (req, res) => {
  try {
    const cached = cacheGet("sitemap");
    if (cached) { res.setHeader("Content-Type", "application/xml"); res.setHeader("Cache-Control", "public, max-age=300"); return res.send(cached); }

    const { data: posts } = await supabase.from("posts").select("link, created_at, title").eq("status", "published").order("created_at", { ascending: false }).limit(5000);
    const baseUrl = process.env.APP_URL || "https://www.aifeastengine.com";
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${baseUrl}/feed</loc><changefreq>hourly</changefreq><priority>0.9</priority></url>
  <url><loc>${baseUrl}/docs</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>${baseUrl}/dashboard</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`;

    if (posts) posts.forEach(post => {
      const safeUrl = post.link?.replace(/[<>&"']/g, "");
      if (safeUrl && safeUrl.startsWith("http")) xml += `\n  <url><loc>${safeUrl}</loc><lastmod>${new Date(post.created_at).toISOString().split('T')[0]}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`;
    });
    xml += "\n</urlset>";

    cacheSet("sitemap", xml, 60*60*1000);
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err: any) { res.status(500).json({ error: "Failed to generate sitemap" }); }
});

// ==========================================
// RSS INGESTION LOOP
// ==========================================
async function runIngestion() {
  console.log(">>> [RSS] Starting Ingestion at " + new Date().toISOString());
  try {
    const { data: feeds } = await supabase.from("feeds").select("*");
    if (!feeds) return;

    const { data: postsData } = await supabase.from("posts").select("category");
    const categoryCounts: Record<string, number> = {};
    if (postsData) postsData.forEach((p: any) => { const cat = (p.category || "General").toLowerCase(); categoryCounts[cat] = (categoryCounts[cat] || 0) + 1; });

    const MAX_POSTS_PER_CATEGORY = 200;
    const MIN_POSTS_PER_CATEGORY = 30;
    const feedsByCategory: Record<string, typeof feeds> = {};
    feeds.forEach(f => { const cat = f.category || "General"; if (!feedsByCategory[cat]) feedsByCategory[cat] = []; feedsByCategory[cat].push(f); });

    const sortedCategories = Object.keys(feedsByCategory).sort((a, b) => (categoryCounts[a] || 0) - (categoryCounts[b] || 0));
    let totalIngested = 0;

    for (const category of sortedCategories) {
      const currentCount = categoryCounts[category] || 0;
      if (currentCount >= MAX_POSTS_PER_CATEGORY) continue;

      let itemsPerFeed = 5;
      if (currentCount < MIN_POSTS_PER_CATEGORY) itemsPerFeed = 15;
      else if (currentCount > MAX_POSTS_PER_CATEGORY * 0.75) itemsPerFeed = 2;

      for (const feed of (feedsByCategory[category] || [])) {
        try {
          const feedData = await parser.parseURL(feed.url);
          for (const item of feedData.items.slice(0, itemsPerFeed)) {
            const { data: exists } = await supabase.from("posts").select("id").eq("link", item.link).single();
            if (exists) continue;
            const rawContent = (item as any).contentEncoded || item.content || item.contentSnippet || "";
            const { error } = await supabase.from("posts").insert({ title: item.title, link: item.link, pub_date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(), content_raw: rawContent, source_id: feed.id, category, status: "pending" });
            if (!error) totalIngested++;
          }
        } catch (err: any) { console.error(`Failed to parse feed ${feed.url}: ${err.message}`); }
      }
    }
    console.log(`>>> [RSS] Ingestion complete. Total new posts: ${totalIngested}`);
  } catch (err: any) { console.error("Ingestion Loop Error:", err.message); }
}

setInterval(runIngestion, 30*60*1000);

// Heartbeat
setInterval(async () => {
  try {
    const [{ count: pendingCount }, { count: publishedCount }] = await Promise.all([
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published")
    ]);
    console.log(`>>> [Heartbeat] ${new Date().toISOString()} | Published: ${publishedCount} | Pending: ${pendingCount}`);
  } catch (err: any) { console.error(`>>> [Heartbeat] Error: ${err.message}`); }
}, 5*60*1000);

// AutoQueue
console.log(">>> [AutoQueue] Starting interval...");
setInterval(async () => {
  try {
    const { data: pending, error } = await supabase.from("posts").select("id").eq("status", "pending").limit(20);
    if (!error && pending?.length) queueService.addTasks(pending.map(p => p.id));
  } catch (err: any) { console.error(">>> [AutoQueue] Error:", err.message); }
}, 5*60*1000);

// RetryHandler
setInterval(async () => {
  try {
    const oneHourAgo = new Date(Date.now() - 60*60*1000).toISOString();
    const { data: errorPosts } = await supabase.from("posts").select("id, retry_count").eq("status", "error").lt("updated_at", oneHourAgo).lt("retry_count", 3).limit(10);
    if (errorPosts?.length) {
      const idsToRetry = errorPosts.map(p => p.id);
      await supabase.from("posts").update({ status: "pending" }).in("id", idsToRetry);
    }
  } catch (err: any) { console.error(">>> [RetryHandler] Error:", err.message); }
}, 30*60*1000);

// ==========================================
// Global Error Handlers
// ==========================================
process.on("uncaughtException", (error) => { console.error("UNCAUGHT EXCEPTION:", error.message); if (process.env.SENTRY_DSN) Sentry.captureException(error); });
process.on("unhandledRejection", (reason) => { console.error("UNHANDLED REJECTION:", reason); if (process.env.SENTRY_DSN && reason instanceof Error) Sentry.captureException(reason); });

// ==========================================
// START SERVER
// ==========================================
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
    runIngestion();
  });

  wss = new WebSocketServer({ server, path: "/ws/stats" });
  wss.on("connection", (ws) => {
    wsClients.add(ws);
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published").then(({ count }) => { ws.send(JSON.stringify({ type: "stats", postsCount: count })); });
    ws.on("close", () => wsClients.delete(ws));
    ws.on("error", () => wsClients.delete(ws));
  });
}

startServer();

// Start cron jobs (production only)
if (process.env.NODE_ENV === "production") {
  try {
    startCronJob();
  } catch (err: any) {
    console.error(`[Scheduler] Failed to start cron job: ${err.message}`);
  }
  try {
    startMonthlyResetJob();
  } catch (err: any) {
    console.error(`[Scheduler] Failed to start monthly reset: ${err.message}`);
  }
  try {
    startMonitor();
  } catch (err: any) {
    console.error(`[Scheduler] Failed to start autonomous monitor: ${err.message}`);
  }
} else {
  // In dev, initialize monitor but keep it paused
  startMonitor();
}
