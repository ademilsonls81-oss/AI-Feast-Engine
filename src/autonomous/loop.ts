/**
 * Autonomous System v2 — Fase 9: Loop Principal
 *
 * Orchestrates all autonomous phases in the correct sequence:
 *   1. Monitor (check error threshold)
 *   2. Diagnostician (AI diagnosis with Groq)
 *   3. Risk Analyzer (risk classification)
 *   4. Auto-Fixer (controlled auto-correction)
 *      - Phase 1: Security Audit (Fase 6)
 *      - Phase 2: Create Backups
 *      - Phase 3: Apply Fixes
 *      - Phase 4: Calculate Success Status
 *      - Phase 5: Smoke Tests (Fase 7)
 *      - Phase 6: Automatic Deploy (Fase 8)
 *      - Phase 7: Final Status Update
 *
 * This is the MAIN ENTRY POINT for the autonomous system.
 * Called by:
 *   - Monitor cron job (hourly)
 *   - Admin API (manual trigger)
 *   - Direct function call (testing)
 *
 * Safety:
 *   - NEVER executes if already running (prevents concurrent loops)
 *   - ALWAYS logs loop start/end for observability
 *   - CATCHES all errors to prevent cascade failures
 *   - REPORTS loop duration for performance monitoring
 */

import { supabase } from "../lib/supabase.js";
import { runDiagnosis } from "./diagnostician.js";
import { fullRiskPipeline } from "./riskAnalyzer.js";
import { applyFix } from "./fixer.js";
import type { SystemError } from "./diagnostician.js";

// ==========================================
// CONFIGURATION
// ==========================================

const ERROR_THRESHOLD = 5; // errors per hour to trigger diagnosis
const MAX_ERRORS_TO_ANALYZE = 5; // max errors to fetch for diagnosis
const LOOP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes timeout for entire loop

// ==========================================
// STATE
// ==========================================

let isLoopRunning = false; // Prevent concurrent loop executions

// ==========================================
// LOOP ORCHESTRATION
// ==========================================

/**
 * Main autonomous loop.
 *
 * Executes all phases in sequence:
 *   Monitor → Diagnosis → Risk Analysis → Auto-Fix (with Security Audit, Smoke Tests, Deploy)
 *
 * @returns Object with loop execution result
 */
export async function runAutonomousLoop(): Promise<{
  success: boolean;
  errorsChecked: number;
  diagnosisTriggered: boolean;
  fixAttempted: boolean;
  duration: number;
  error?: string;
}> {
  const loopStartTime = Date.now();

  // SAFETY CHECK: Prevent concurrent executions
  if (isLoopRunning) {
    console.log("[Loop] ⚠️  Loop already running — skipping this execution");
    return {
      success: false,
      errorsChecked: 0,
      diagnosisTriggered: false,
      fixAttempted: false,
      duration: 0,
      error: "Loop already running"
    };
  }

  isLoopRunning = true;

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  AUTONOMOUS LOOP — Starting execution                      ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`[Loop] Start time: ${new Date().toISOString()}`);

  try {
    // Set timeout to prevent hanging loop
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Loop timeout after ${LOOP_TIMEOUT_MS}ms`)), LOOP_TIMEOUT_MS);
    });

    const result = await Promise.race([
      executeLoopPhases(),
      timeoutPromise
    ]);

    const loopDuration = Date.now() - loopStartTime;
    console.log(`[Loop] Loop completed in ${loopDuration}ms`);
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║  AUTONOMOUS LOOP — Execution complete                      ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");

    return {
      ...result,
      duration: loopDuration
    };
  } catch (err: any) {
    const loopDuration = Date.now() - loopStartTime;
    console.error(`[Loop] ❌ Loop failed after ${loopDuration}ms: ${err.message}`);
    console.error(`[Loop] Stack: ${err.stack}`);

    return {
      success: false,
      errorsChecked: 0,
      diagnosisTriggered: false,
      fixAttempted: false,
      duration: loopDuration,
      error: err.message
    };
  } finally {
    isLoopRunning = false;
  }
}

/**
 * Execute all phases of the autonomous loop.
 */
async function executeLoopPhases(): Promise<{
  success: boolean;
  errorsChecked: number;
  diagnosisTriggered: boolean;
  fixAttempted: boolean;
}> {
  // ==========================================
  // PHASE 1: Monitor (Check Error Threshold)
  // ==========================================
  console.log("\n[Loop] === Phase 1: Monitor (Error Threshold Check) ===");

  const { errorCount, errors } = await checkErrorThreshold();

  console.log(`[Loop] Errors in last hour: ${errorCount}`);
  console.log(`[Loop] Threshold: ${ERROR_THRESHOLD}`);

  if (errorCount < ERROR_THRESHOLD) {
    console.log("[Loop] ✅ Below threshold — no action needed");
    return {
      success: true,
      errorsChecked: errorCount,
      diagnosisTriggered: false,
      fixAttempted: false
    };
  }

  console.log(`[Loop] 🚨 Threshold exceeded (${errorCount} >= ${ERROR_THRESHOLD})`);

  // ==========================================
  // PHASE 2: Diagnostician (AI Diagnosis)
  // ==========================================
  console.log("\n[Loop] === Phase 2: Diagnostician (AI Diagnosis) ===");

  const errorsToAnalyze = errors.slice(0, MAX_ERRORS_TO_ANALYZE);
  const diagnosis = await runDiagnosis(errorsToAnalyze as SystemError[]);

  console.log(`[Loop] ✅ Diagnosis complete`);
  console.log(`[Loop]    Cause: ${diagnosis.cause.substring(0, 120)}...`);
  console.log(`[Loop]    Fix: ${diagnosis.fix.substring(0, 120)}...`);
  console.log(`[Loop]    Confidence: ${diagnosis.confidence}`);
  console.log(`[Loop]    Affected files: ${diagnosis.affected_files.join(", ") || "none"}`);

  if (!diagnosis.auto_fix_id) {
    console.log("[Loop] ⚠️  No auto_fix_id in diagnosis — skipping risk analysis and fix");
    return {
      success: true,
      errorsChecked: errorCount,
      diagnosisTriggered: true,
      fixAttempted: false
    };
  }

  // ==========================================
  // PHASE 3: Risk Analyzer (Risk Classification)
  // ==========================================
  console.log("\n[Loop] === Phase 3: Risk Analyzer (Risk Classification) ===");

  const riskResult = await fullRiskPipeline(diagnosis, diagnosis.auto_fix_id);

  console.log(`[Loop] ✅ Risk analysis complete`);
  console.log(`[Loop]    Risk level: ${riskResult.risk_level}`);
  console.log(`[Loop]    Risk score: ${riskResult.risk_score}`);
  console.log(`[Loop]    Decision: ${riskResult.decision}`);
  console.log(`[Loop]    Reasoning: ${riskResult.reasoning.substring(0, 120)}...`);

  // ==========================================
  // PHASE 4-8: Auto-Fixer (Encapsulates Phases 4-8)
  // ==========================================
  console.log("\n[Loop] === Phase 4-8: Auto-Fixer (Security Audit → Smoke Tests → Deploy) ===");

  if (riskResult.decision !== "auto_apply") {
    console.log(`[Loop] 🛡️  Decision is "${riskResult.decision}" — fix BLOCKED`);
    console.log(`[Loop]    Risk level: ${riskResult.risk_level}`);
    console.log(`[Loop]    Reasoning: ${riskResult.reasoning}`);

    return {
      success: true,
      errorsChecked: errorCount,
      diagnosisTriggered: true,
      fixAttempted: false
    };
  }

  console.log(`[Loop] 🔧 Decision is "auto_apply" — attempting automated fix...`);

  const fixResult = await applyFix(diagnosis, riskResult, diagnosis.auto_fix_id);

  console.log(`[Loop] ✅ Fix execution complete`);
  console.log(`[Loop]    Action: ${fixResult.action}`);
  console.log(`[Loop]    Success: ${fixResult.success}`);
  console.log(`[Loop]    Modified files: ${fixResult.modifiedFiles.join(", ") || "none"}`);
  console.log(`[Loop]    Security audit passed: ${fixResult.securityAuditPassed}`);

  if (fixResult.error) {
    console.error(`[Loop] ❌ Fix error: ${fixResult.error}`);
  }

  if (fixResult.reason) {
    console.log(`[Loop]    Reason: ${fixResult.reason}`);
  }

  return {
    success: fixResult.success || fixResult.action === "simulated",
    errorsChecked: errorCount,
    diagnosisTriggered: true,
    fixAttempted: true
  };
}

// ==========================================
// ERROR THRESHOLD CHECK
// ==========================================

/**
 * Check if error count in the last hour exceeds the threshold.
 *
 * @returns Object with error count and error details
 */
async function checkErrorThreshold(): Promise<{
  errorCount: number;
  errors: any[];
}> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Count errors in the last hour
    const { count, error: countError } = await supabase
      .from("system_errors")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneHourAgo);

    if (countError) {
      console.error(`[Monitor] Failed to query errors: ${countError.message}`);
      return { errorCount: 0, errors: [] };
    }

    const errorCount = count || 0;

    // If threshold exceeded, fetch error details
    if (errorCount >= ERROR_THRESHOLD) {
      const { data: errors, error: fetchError } = await supabase
        .from("system_errors")
        .select("id, error_type, source, message, stack_trace, severity, endpoint, http_status, created_at")
        .gte("created_at", oneHourAgo)
        .order("created_at", { ascending: false })
        .limit(MAX_ERRORS_TO_ANALYZE);

      if (fetchError) {
        console.error(`[Monitor] Failed to fetch error details: ${fetchError.message}`);
        return { errorCount, errors: [] };
      }

      return { errorCount, errors: errors || [] };
    }

    return { errorCount, errors: [] };
  } catch (err: any) {
    console.error(`[Monitor] Unexpected error during threshold check: ${err.message}`);
    return { errorCount: 0, errors: [] };
  }
}

// ==========================================
// MANUAL TRIGGER
// ==========================================

/**
 * Trigger autonomous loop manually.
 *
 * This function is safe to call from Admin API or tests.
 * It will skip execution if loop is already running.
 *
 * @returns Object with loop execution result
 */
export async function triggerAutonomousLoop(): Promise<{
  success: boolean;
  errorsChecked: number;
  diagnosisTriggered: boolean;
  fixAttempted: boolean;
  duration: number;
  error?: string;
}> {
  console.log("\n[Loop] 🚀 Manual trigger activated");
  return await runAutonomousLoop();
}

// ==========================================
// STATUS CHECK
// ==========================================

/**
 * Check if autonomous loop is currently running.
 *
 * @returns true if loop is executing, false otherwise
 */
export function isLoopActive(): boolean {
  return isLoopRunning;
}

/**
 * Get loop status information.
 *
 * @returns Object with loop status details
 */
export function getLoopStatus(): {
  isRunning: boolean;
  canExecute: boolean;
  message: string;
} {
  const canExecute = !isLoopRunning;
  const message = canExecute
    ? "Loop is ready to execute"
    : "Loop is currently running — new executions will be skipped";

  return {
    isRunning: isLoopRunning,
    canExecute,
    message
  };
}
