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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock", {
  apiVersion: "2025-01-27.acacia" as any,
});

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

    for (const feed of feeds) {
      try {
        const feedData = await parser.parseURL(feed.url);
        for (const item of feedData.items.slice(0, 10)) {
          const { data: exists } = await supabase.from("posts").select("id").eq("link", item.link).single();
          if (exists) continue;

          const rawContent = (item as any).contentEncoded || item.content || item.contentSnippet || "";

          const { error } = await supabase.from("posts").insert({
            title: item.title,
            link: item.link,
            pub_date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            content_raw: rawContent,
            source_id: feed.id,
            category: feed.category || "General",
            status: "pending"
          });

          if (error) console.error(`Error inserting post: ${item.title}`, error.message);
          else console.log(`Ingested: ${item.title}`);
        }
      } catch (err: any) {
        console.error(`Failed to parse feed ${feed.url}: ${err.message}`);
      }
    }
  } catch (err: any) {
    console.error("Ingestion Loop Error:", err.message);
  }
}

setInterval(runIngestion, 30 * 60 * 1000);

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
  res.json({ message: `Queueing ${pending.length} posts` });
});

app.post("/api/admin/feeds", checkAdmin, async (req, res) => {
  const { name, url, category } = req.body;
  const { data, error } = await supabase.from("feeds").insert({ name, url, category }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  logAuditAction((req as any).user.id, "ADD_FEED", req, { name, url });
  res.json(data);
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

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> Server running at http://localhost:${PORT}`);
    runIngestion();
  });
}

startServer();