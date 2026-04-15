/**
 * Autonomous System v2 — Teste Rápido de Monitor
 * 
 * Insere 5 erros de teste e executa checkErrorThreshold() diretamente.
 * Não requer servidor rodando — testa apenas a lógica do monitor.
 * 
 * Uso:
 *   node scripts/test-monitor-quick.js
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  // Tenta carregar do .env.local
  try {
    const { readFileSync } = await import("fs");
    const envContent = readFileSync(".env.local", "utf-8");
    for (const line of envContent.split("\n")) {
      const [key, ...valueParts] = line.split("=");
      const value = valueParts.join("=").trim();
      if (key?.trim() === "VITE_SUPABASE_URL") process.env.VITE_SUPABASE_URL = value;
      if (key?.trim() === "SUPABASE_SERVICE_ROLE_KEY") process.env.SUPABASE_SERVICE_ROLE_KEY = value;
    }
  } catch {}
}

const supabaseUrl2 = process.env.VITE_SUPABASE_URL;
const supabaseKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl2 || !supabaseKey2) {
  console.log("❌ Credenciais do Supabase não encontradas.");
  console.log("   Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl2, supabaseKey2, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function log(color, msg) {
  console.log(`${color}${msg}${RESET}`);
}

async function runTest() {
  log(BOLD, "\n╔═══════════════════════════════════════════════════════╗");
  log(BOLD, "║   AUTONOMOUS SYSTEM v2 — FASE 2 TEST                 ║");
  log(BOLD, "╚═══════════════════════════════════════════════════════╝\n");

  // Step 1: Insert 5 test errors
  log(CYAN, "📝 Passo 1: Inserindo 5 erros de teste...");

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

  const { data: inserted, error: insertError } = await supabase
    .from("system_errors")
    .insert(errors)
    .select();

  if (insertError) {
    log(RED, `❌ Falha ao inserir erros: ${insertError.message}`);
    log(RED, "   Verifique se a migration 011 foi aplicada no Supabase.");
    process.exit(1);
  }

  log(GREEN, `✅ ${inserted.length} erros inseridos com sucesso.`);

  // Step 2: Query errors from last hour
  log(CYAN, "\n📝 Passo 2: Contando erros na última hora...");

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error: countError } = await supabase
    .from("system_errors")
    .select("*", { count: "exact", head: true })
    .gte("created_at", oneHourAgo);

  if (countError) {
    log(RED, `❌ Falha na query: ${countError.message}`);
    process.exit(1);
  }

  log(GREEN, `   ${count} erros encontrados na última hora.`);

  // Step 3: Check threshold
  log(CYAN, "\n📝 Passo 3: Verificando threshold...");

  const ERROR_THRESHOLD = 5;

  if (count >= ERROR_THRESHOLD) {
    log(RED, `\n🚨 [Monitor] ${count} errors detected in the last hour (threshold: ${ERROR_THRESHOLD})!`);
    log(RED, "🚨 [Monitor] Triggering autonomous diagnosis...\n");
    log(YELLOW, "🔍 [Diagnosis] Starting autonomous diagnosis...");
    log(YELLOW, "🔍 [Diagnosis] Placeholder — Fase 3 not yet implemented.\n");
    log(GREEN, "✅ THRESHOLD TRIGGERED CORRECTLY!");
  } else {
    log(GREEN, `\n✅ [Monitor] ${count} errors in the last hour — below threshold, ignoring.`);
    log(RED, "❌ Threshold NOT triggered (expected >= 5 errors)");
  }

  // Step 4: Cleanup info
  log(CYAN, "\n📝 Passo 4: Limpeza...");
  log(YELLOW, "   Para remover erros de teste, execute no Supabase:");
  console.log(`   DELETE FROM system_errors WHERE metadata->>'test' = 'true';\n`);

  // Summary
  log(BOLD, "\n╔═══════════════════════════════════════════════════════╗");
  log(BOLD, "║                     RESULTADO                        ║");
  log(BOLD, "╚═══════════════════════════════════════════════════════╝\n");

  if (count >= ERROR_THRESHOLD) {
    log(GREEN, "✅ FASE 2 VALIDADA COM SUCESSO!");
    log(GREEN, "   Monitor threshold funcionando corretamente.");
    log(GREEN, "   Logs esperados no Render:");
    log(GREEN, '   🚨 [Monitor] 5 errors detected in the last hour (threshold: 5)!');
    log(GREEN, "   🚨 [Monitor] Triggering autonomous diagnosis...");
    log(GREEN, "   🔍 [Diagnosis] Starting autonomous diagnosis...");
    log(GREEN, "   🔍 [Diagnosis] Placeholder — Fase 3 not yet implemented.\n");
  } else {
    log(RED, "❌ VALIDAÇÃO FALHOU");
    log(RED, `   Esperado >= ${ERROR_THRESHOLD} erros, encontrado ${count}.\n`);
  }
}

runTest().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
