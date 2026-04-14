/**
 * Autonomous System v2 — Fase 2: Monitor
 * 
 * Scheduled monitor that checks error frequency and triggers diagnosis
 * when error thresholds are exceeded.
 * 
 * Schedule: Every hour at minute 0 (0 * * * *)
 * 
 * Logic:
 *   1. Count errors from the last hour in system_errors table
 *   2. If count >= THRESHOLD (5), log alert and trigger diagnosis (Fase 3)
 *   3. If count < THRESHOLD, log "below threshold, ignoring"
 * 
 * In development (NODE_ENV !== 'production'), the cron is registered
 * but does NOT execute — only logs "Monitor agendado (pausado em dev)".
 */

import cron from "node-cron";
import { supabase } from "../lib/supabase.js";
import { runDiagnosis } from "./diagnostician.js";
import type { SystemError } from "./diagnostician.js";

// ==========================================
// CONFIGURATION
// ==========================================
const ERROR_THRESHOLD = 5; // errors per hour to trigger diagnosis
const CRON_SCHEDULE = "0 * * * *"; // every hour at minute 0

// ==========================================
// FASE 3: AI DIAGNOSIS
// ==========================================
/**
 * Run autonomous diagnosis using AI (Groq).
 * Fetches recent errors and calls the diagnostician.
 */
async function runDiagnosisWithAI() {
  console.log("🔍 [Diagnosis] Starting autonomous diagnosis...");

  try {
    // Fetch recent errors (last hour, max 5)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: errors, error: fetchError } = await supabase
      .from("system_errors")
      .select("id, error_type, source, message, stack_trace, severity, endpoint, http_status, created_at")
      .gte("created_at", oneHourAgo)
      .order("created_at", { ascending: false })
      .limit(5);

    if (fetchError) {
      console.error(`❌ [Diagnosis] Failed to fetch errors: ${fetchError.message}`);
      return;
    }

    if (!errors || errors.length === 0) {
      console.log("🔍 [Diagnosis] No errors to analyze.");
      return;
    }

    console.log(`🔍 [Diagnosis] Analyzing ${errors.length} error(s)...`);

    // Call AI diagnostician
    const result = await runDiagnosis(errors as SystemError[]);

    console.log(`✅ [Diagnosis] Cause: ${result.cause.substring(0, 120)}...`);
    console.log(`✅ [Diagnosis] Fix: ${result.fix.substring(0, 120)}...`);
    console.log(`✅ [Diagnosis] Confidence: ${result.confidence}`);
    console.log(`✅ [Diagnosis] Model: ${result.model_used}`);
    if (result.affected_files.length > 0) {
      console.log(`✅ [Diagnosis] Affected files: ${result.affected_files.join(", ")}`);
    }
  } catch (err: any) {
    console.error(`❌ [Diagnosis] Unexpected error: ${err.message}`);
  }
}

// ==========================================
// ERROR THRESHOLD CHECK
// ==========================================
/**
 * Check if error count in the last hour exceeds the threshold.
 * 
 * Query: SELECT COUNT(*) FROM system_errors WHERE created_at > NOW() - INTERVAL '1 hour'
 */
async function checkErrorThreshold() {
  console.log("[Monitor] Checking error threshold...");

  try {
    // Count errors in the last hour
    const { count, error } = await supabase
      .from("system_errors")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (error) {
      console.error(`❌ [Monitor] Failed to query errors: ${error.message}`);
      return;
    }

    const errorCount = count || 0;

    if (errorCount >= ERROR_THRESHOLD) {
      console.log(`🚨 [Monitor] ${errorCount} errors detected in the last hour (threshold: ${ERROR_THRESHOLD})!`);
      console.log("🚨 [Monitor] Triggering autonomous diagnosis...");

      // Trigger AI diagnosis (Fase 3)
      await runDiagnosisWithAI();
    } else {
      console.log(`✅ [Monitor] ${errorCount} errors in the last hour — below threshold, ignoring.`);
    }
  } catch (err: any) {
    console.error(`❌ [Monitor] Unexpected error during threshold check: ${err.message}`);
  }
}

// ==========================================
// CRON JOB INITIALIZATION
// ==========================================
/**
 * Start the monitor cron job.
 * In development mode, the cron is registered but paused.
 * In production, it runs every hour.
 */
export function startMonitor() {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    console.log("📋 [Monitor] Monitor agendado (pausado em dev). Para testar, execute checkErrorThreshold() manualmente.");
    // Register but don't start — provide manual test function
    return { checkErrorThreshold };
  }

  console.log(`📋 [Monitor] Starting monitor cron job (${CRON_SCHEDULE})...`);

  // Schedule the cron job
  const task = cron.schedule(CRON_SCHEDULE, async () => {
    await checkErrorThreshold();
  }, {
    timezone: "UTC"
  });

  // Run once on startup to verify everything works
  console.log("[Monitor] Running initial threshold check...");
  checkErrorThreshold();

  return { task, checkErrorThreshold };
}

// Export for manual testing
export { checkErrorThreshold };
