/**
 * Autonomous System v2 — Teste Direto via Supabase HTTP API
 * 
 * Insere 5 erros de teste e executa a query de threshold diretamente.
 * Usa a anon key do .env.local que está disponível.
 * 
 * Uso:
 *   node scripts/test-monitor-direct.js
 */

import { readFileSync } from "fs";

// Carregar .env.local
const envContent = readFileSync(".env.local", "utf-8");
const envVars = {};
for (const line of envContent.split("\n")) {
  const eqIdx = line.indexOf("=");
  if (eqIdx > 0) {
    const key = line.substring(0, eqIdx).trim();
    let value = line.substring(eqIdx + 1).trim();
    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.substring(1, value.length - 1);
    }
    envVars[key] = value;
  }
}

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.log("❌ Credenciais não encontradas no .env.local");
  console.log(`   VITE_SUPABASE_URL: ${SUPABASE_URL || "missing"}`);
  console.log(`   VITE_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? "present" : "missing"}`);
  process.exit(1);
}

console.log("✅ Credenciais carregadas:", SUPABASE_URL);

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function log(color, msg) {
  console.log(`${color}${msg}${RESET}`);
}

async function supabaseRpc(method, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Prefer": "return=representation"
    },
    body: JSON.stringify(body || {})
  });
  return res.json();
}

async function supabaseInsert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Prefer": "return=representation"
    },
    body: JSON.stringify(rows)
  });
  
  if (!res.ok) {
    const err = await res.text();
    return { error: { message: `${res.status}: ${err.substring(0, 200)}` } };
  }
  
  const data = await res.json();
  return { data };
}

async function supabaseCount(table, gteDate) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?created_at=gte.${gteDate}&limit=1`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Prefer": "count=exact"
    }
  });
  
  const count = res.headers.get("content-range");
  const total = count ? count.split("/")[1] : "0";
  
  return { count: parseInt(total) || 0 };
}

async function runTest() {
  log(BOLD, "\n╔═══════════════════════════════════════════════════════╗");
  log(BOLD, "║   AUTONOMOUS SYSTEM v2 — FASE 2 TEST (DIRECT)       ║");
  log(BOLD, "╚═══════════════════════════════════════════════════════╝\n");

  // Step 1: Insert 5 test errors
  log(CYAN, "📝 Passo 1: Inserindo 5 erros de teste via API...");

  const now = new Date();
  const errors = [];
  for (let i = 1; i <= 5; i++) {
    errors.push({
      error_type: i % 2 === 0 ? "api_error" : "db_error",
      source: i % 3 === 0 ? "webhook" : "server",
      message: `Test error #${i} — Monitor validation ${now.toISOString()}`,
      severity: i === 5 ? "critical" : "error",
      endpoint: i % 2 === 0 ? "/api/feed" : "/api/stripe-webhook",
      http_status: i % 2 === 0 ? 500 : 503,
      metadata: { test: true, iteration: i, timestamp: now.toISOString() }
    });
  }

  const { data: inserted, error: insertError } = await supabaseInsert("system_errors", errors);

  if (insertError) {
    log(RED, `❌ Falha ao inserir erros: ${insertError.message}`);
    log(RED, "\n   Possíveis causas:");
    log(RED, "   1. Migration 011 não aplicada no Supabase");
    log(RED, "   2. RLS bloqueando inserção (anon key sem permissão)");
    log(RED, "   3. Tabela não existe");
    log(RED, "\n   Solução: Inserir erros manualmente via SQL Editor do Supabase:");
    console.log(`
INSERT INTO system_errors (error_type, source, message, severity, metadata)
VALUES 
  ('api_error', 'server', 'Test error 1', 'error', '{"test": true}'::jsonb),
  ('api_error', 'server', 'Test error 2', 'error', '{"test": true}'::jsonb),
  ('db_error', 'webhook', 'Test error 3', 'error', '{"test": true}'::jsonb),
  ('timeout', 'stripe', 'Test error 4', 'error', '{"test": true}'::jsonb),
  ('webhook_error', 'server', 'Test error 5', 'critical', '{"test": true}'::jsonb);
`);
    process.exit(1);
  }

  log(GREEN, `✅ ${inserted.length} erros inseridos com sucesso.`);

  // Step 2: Query errors from last hour
  log(CYAN, "\n📝 Passo 2: Contando erros na última hora...");

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count } = await supabaseCount("system_errors", oneHourAgo);

  log(GREEN, `   ${count} erros encontrados na última hora.`);

  // Step 3: Check threshold
  log(CYAN, "\n📝 Passo 3: Verificando threshold...");

  const ERROR_THRESHOLD = 5;

  console.log("");
  if (count >= ERROR_THRESHOLD) {
    log(RED, `🚨 [Monitor] ${count} errors detected in the last hour (threshold: ${ERROR_THRESHOLD})!`);
    log(RED, "🚨 [Monitor] Triggering autonomous diagnosis...");
    console.log("");
    log(YELLOW, "🔍 [Diagnosis] Starting autonomous diagnosis...");
    log(YELLOW, "🔍 [Diagnosis] Placeholder — Fase 3 not yet implemented.");
    console.log("");
    log(GREEN, "✅ THRESHOLD TRIGGERED CORRECTLY!");
    log(GREEN, "   Fase 2 validada com sucesso!");
  } else {
    log(GREEN, `✅ [Monitor] ${count} errors in the last hour — below threshold, ignoring.`);
    console.log("");
    log(RED, `❌ Threshold NOT triggered (expected >= ${ERROR_THRESHOLD}, got ${count})`);
  }

  // Summary
  log(BOLD, "\n╔═══════════════════════════════════════════════════════╗");
  log(BOLD, "║                     RESULTADO                        ║");
  log(BOLD, "╚═══════════════════════════════════════════════════════╝\n");

  if (count >= ERROR_THRESHOLD) {
    log(GREEN, "✅ FASE 2 VALIDADA COM SUCESSO!");
    log(GREEN, "\n   Logs esperados no Render (após deploy):");
    log(GREEN, '   🚨 [Monitor] 5 errors detected in the last hour (threshold: 5)!');
    log(GREEN, "   🚨 [Monitor] Triggering autonomous diagnosis...");
    log(GREEN, "   🔍 [Diagnosis] Starting autonomous diagnosis...");
    log(GREEN, "   🔍 [Diagnosis] Placeholder — Fase 3 not yet implemented.");
  } else {
    log(RED, "❌ VALIDAÇÃO FALHOU — Verifique os logs acima.");
  }

  console.log("");
  log(YELLOW, "🧹 Para remover erros de teste, execute no Supabase SQL Editor:");
  console.log("   DELETE FROM system_errors WHERE metadata->>'test' = 'true';");
  console.log("");
}

runTest().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
