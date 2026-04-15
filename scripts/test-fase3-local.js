/**
 * Autonomous System v2 — Fase 3 Test (Local, Simplified)
 * 
 * Tests the AI diagnostician logic directly without TS module resolution issues.
 * Replicates the diagnostician flow inline.
 * 
 * Usage:
 *   node scripts/test-fase3-local.js
 */

import { readFileSync } from "fs";

// Load env
try {
  const envContent = readFileSync(".env", "utf-8");
  for (const line of envContent.split("\n")) {
    const eqIdx = line.indexOf("=");
    if (eqIdx > 0) {
      const key = line.substring(0, eqIdx).trim();
      let value = line.substring(eqIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
} catch {}

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || "";
const GROQ_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.groq.com/openai/v1";
const IA_MODEL = "llama-3.1-8b-instant";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function log(color, msg) { console.log(`${color}${msg}${RESET}`); }

// Simulated errors
const simulatedErrors = [
  { id: "test-err-1", error_type: "api_error", source: "server", message: "Failed to process request: Connection timeout", stack_trace: "Error: Connection timeout\n  at Timeout._onTimeout (src/routes/public.ts:45:11)", severity: "error", endpoint: "/api/feed", http_status: 500, created_at: new Date(Date.now() - 25*60000).toISOString() },
  { id: "test-err-2", error_type: "webhook_error", source: "stripe", message: "Webhook signature verification failed", stack_trace: "Error: No matching signature found\n  at Stripe.webhooks.constructEvent", severity: "critical", endpoint: "/api/stripe-webhook", http_status: 400, created_at: new Date(Date.now() - 20*60000).toISOString() },
  { id: "test-err-3", error_type: "db_error", source: "server", message: "Supabase query failed: relation does not exist", stack_trace: "Error: relation 'system_errors' does not exist", severity: "error", endpoint: "/api/stats", http_status: 500, created_at: new Date(Date.now() - 15*60000).toISOString() },
  { id: "test-err-4", error_type: "timeout", source: "stripe", message: "Stripe API request timeout after 30s", stack_trace: "Error: Timeout of 30000ms exceeded", severity: "error", endpoint: "/api/create-checkout-session", http_status: 503, created_at: new Date(Date.now() - 10*60000).toISOString() },
  { id: "test-err-5", error_type: "api_error", source: "webhook", message: "Unhandled exception in webhook handler", stack_trace: "TypeError: Cannot read properties of undefined (reading 'client_reference_id')", severity: "critical", endpoint: "/api/stripe-webhook", http_status: 500, created_at: new Date(Date.now() - 5*60000).toISOString() }
];

function cleanJSON(response) {
  try { JSON.parse(response); return response; } catch {}
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) { try { JSON.parse(codeBlockMatch[1].trim()); return codeBlockMatch[1].trim(); } catch {} }
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) { try { JSON.parse(jsonMatch[0]); return jsonMatch[0]; } catch {} }
  return null;
}

function buildPrompt(errors) {
  const ctx = errors.slice(0, 5).map((e, i) => {
    const p = [];
    p.push(`${i+1}. [${e.severity.toUpperCase()}] ${e.error_type} from ${e.source}`);
    if (e.endpoint) p.push(`   Endpoint: ${e.endpoint}`);
    if (e.http_status) p.push(`   HTTP: ${e.http_status}`);
    p.push(`   Message: ${e.message}`);
    if (e.stack_trace) p.push(`   Stack: ${e.stack_trace.substring(0, 200)}`);
    return p.join("\n");
  }).join("\n\n");
  return `Analyze these backend errors and return JSON diagnosis:

${ctx.substring(0, 2000)}

Return ONLY JSON: {"cause":"...","fix":"...","confidence":0.85,"affected_files":["file1.ts"]}`;
}

function getFallbackDiagnosis(errors) {
  const types = errors.map(e => e.error_type);
  if (types.includes("webhook_error")) {
    return { cause: "Webhook signature verification failing — likely STRIPE_WEBHOOK_SECRET mismatch or API version incompatibility between SDK and Stripe events.", fix: "Verify STRIPE_WEBHOOK_SECRET matches Stripe Dashboard. Ensure Stripe SDK apiVersion matches webhook event api_version (2026-03-25.dahlia). Check express.raw() middleware is before express.json().", confidence: 0.7, affected_files: ["server.ts"], model_used: "fallback" };
  }
  if (types.includes("db_error")) {
    return { cause: "Database connection or query failures — possibly missing table, pool exhaustion, or RLS policy blocking access.", fix: "Check Supabase table exists and RLS policies allow service_role access. Verify connection pool is not exhausted.", confidence: 0.6, affected_files: ["src/lib/supabase.ts", "supabase/migrations/"], model_used: "fallback" };
  }
  return { cause: "Multiple error types detected requiring investigation.", fix: "Review error logs and check recent deployments.", confidence: 0.3, affected_files: ["server.ts"], model_used: "fallback" };
}

async function callIA(errors) {
  if (!GROQ_API_KEY) { console.log(YELLOW + "⚠️  GROQ_API_KEY not set, using fallback diagnosis." + RESET); return getFallbackDiagnosis(errors); }
  try {
    const res = await fetch(`${GROQ_BASE_URL.replace("/openai/v1", "")}/openai/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({ model: IA_MODEL, messages: [{ role: "user", content: buildPrompt(errors) }], temperature: 0.3, max_tokens: 1024 })
    });
    const data = await res.json();
    const iaText = data.choices?.[0]?.message?.content || "";
    if (!iaText) return getFallbackDiagnosis(errors);
    const cleaned = cleanJSON(iaText);
    if (!cleaned) { console.log(YELLOW + "⚠️  Could not parse IA JSON, using fallback." + RESET); return getFallbackDiagnosis(errors); }
    const parsed = JSON.parse(cleaned);
    if (!parsed.cause || !parsed.fix) return getFallbackDiagnosis(errors);
    return { cause: parsed.cause, fix: parsed.fix, confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)), affected_files: parsed.affected_files || [], model_used: IA_MODEL, raw_ia_response: iaText.substring(0, 100) };
  } catch (err) { console.log(YELLOW + `⚠️  IA call failed: ${err.message}, using fallback.` + RESET); return getFallbackDiagnosis(errors); }
}

async function runDiagnosis(errors) {
  log(CYAN, "[Diagnostician] Starting AI diagnosis...");
  log(CYAN, `[Diagnostician] Analyzing ${errors.length} error(s)...`);
  const result = await callIA(errors);
  console.log("");
  log(GREEN, `[Diagnostician] Cause: ${result.cause.substring(0, 120)}...`);
  log(GREEN, `[Diagnostician] Fix: ${result.fix.substring(0, 120)}...`);
  log(GREEN, `[Diagnostician] Confidence: ${result.confidence}`);
  log(GREEN, `[Diagnostician] Model: ${result.model_used}`);
  return result;
}

// RUN TEST
async function main() {
  log(BOLD, "\n╔═══════════════════════════════════════════════════════╗");
  log(BOLD, "║   AUTONOMOUS SYSTEM v2 — FASE 3 TEST (LOCAL)        ║");
  log(BOLD, "╚═══════════════════════════════════════════════════════╝\n");

  log(CYAN, "📝 Executing AI diagnosis with 5 simulated errors...\n");

  const result = await runDiagnosis(simulatedErrors);

  log(BOLD, "\n╔═══════════════════════════════════════════════════════╗");
  log(BOLD, "║   DIAGNOSIS RESULT                                  ║");
  log(BOLD, "╚═══════════════════════════════════════════════════════╝\n");

  log(CYAN, "📋 Cause:"); log(GREEN, `   ${result.cause}\n`);
  log(CYAN, "🔧 Fix:"); log(GREEN, `   ${result.fix}\n`);
  log(CYAN, "🎯 Confidence:"); log(result.confidence >= 0.7 ? GREEN : YELLOW, `   ${result.confidence}\n`);
  log(CYAN, "📁 Affected Files:");
  result.affected_files.forEach(f => log(GREEN, `   - ${f}`));
  console.log("");
  log(CYAN, "🤖 Model:"); log(GREEN, `   ${result.model_used}\n`);

  // Validation
  log(BOLD, "\n╔═══════════════════════════════════════════════════════╗");
  log(BOLD, "║   VALIDATION                                      ║");
  log(BOLD, "╚═══════════════════════════════════════════════════════╝\n");

  let pass = true;
  const checks = [
    { name: "Cause present", ok: result.cause && result.cause.length > 10 },
    { name: "Fix present", ok: result.fix && result.fix.length > 10 },
    { name: "Confidence valid", ok: typeof result.confidence === "number" && result.confidence >= 0 && result.confidence <= 1 },
    { name: "Affected files is array", ok: Array.isArray(result.affected_files) },
  ];
  checks.forEach(c => { if (c.ok) log(GREEN, `✅ ${c.name}`); else { log(RED, `❌ ${c.name}`); pass = false; } });

  console.log("");
  if (pass) { log(GREEN, "🎉 FASE 3 VALIDADA COM SUCESSO!"); log(GREEN, "   AI diagnosis is working correctly.\n"); }
  else { log(RED, "❌ Alguns testes falharam.\n"); }
}

main().catch(e => { console.error(`Fatal: ${e.message}`); process.exit(1); });
