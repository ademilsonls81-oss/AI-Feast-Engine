/**
 * Autonomous System v2 — Fase 4: Risk Classifier
 *
 * Evaluates risk level of auto-fixes before they are applied.
 * Determines whether a fix should be auto-applied, requires human review, or is blocked.
 *
 * Risk Classification Logic:
 *   - LOW: confidence >= 0.8 AND no critical path impact AND rollback available
 *   - MEDIUM: confidence >= 0.6 OR some risk factors present
 *   - HIGH: confidence < 0.6 OR critical path impact OR no rollback
 *   - CRITICAL: affects security, database schema changes, or irreversible operations
 *
 * Decision Mapping:
 *   - low risk → auto_apply
 *   - medium risk → require_review
 *   - high/critical risk → block
 *
 * Flow:
 *   1. Receive DiagnosisResult from diagnostician
 *   2. Analyze confidence, affected files, error patterns
 *   3. Calculate composite risk score (0.00 - 1.00)
 *   4. Determine risk level and decision
 *   5. Persist to risk_decisions table
 *   6. Return RiskAnalysisResult for downstream processing
 */

import { supabase } from "../lib/supabaseClient";
import type { DiagnosisResult } from "./diagnostician.js";

// ==========================================
// TYPES
// ==========================================

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type RiskDecision = "auto_apply" | "require_review" | "block";

export interface RiskFactors {
  confidence_low: boolean;           // IA confidence < 0.7
  affects_critical_path: boolean;    // Affects auth, payments, database, security
  has_side_effects: boolean;         // Fix may impact other components
  error_frequency: string;           // "low", "medium", "high"
  rollback_available: boolean;       // Can we safely rollback the fix?
  affects_production: boolean;       // Directly impacts production environment
  requires_migration: boolean;       // Requires database schema changes
  security_impact: boolean;          // Affects security-related code
}

export interface RiskAnalysisResult {
  auto_fix_id: string;
  risk_level: RiskLevel;
  risk_score: number;                // 0.00 - 1.00 composite score
  risk_factors: RiskFactors;
  decision: RiskDecision;
  reasoning: string;
  model_used: string;
  executed: boolean;
  executed_at?: string;
  execution_result?: any;
  execution_error?: string;
}

// ==========================================
// CONFIGURATION
// ==========================================

const MODEL_VERSION = "risk-classifier-v1";

// Risk score thresholds
const LOW_RISK_THRESHOLD = 0.3;      // <= 0.3 → low risk
const MEDIUM_RISK_THRESHOLD = 0.6;   // <= 0.6 → medium risk, > 0.6 → high risk

// Critical file patterns (affects core system functionality)
const CRITICAL_PATH_PATTERNS = [
  "auth",
  "security",
  "payment",
  "stripe",
  "webhook",
  "database",
  "supabase",
  "migration",
  "schema",
  "config",
  ".env",
  "secret",
  "password",
  "token",
  "session",
  "middleware",
  "server.ts"
];

// ==========================================
// RISK ANALYSIS
// ==========================================

/**
 * Analyze risk level of a proposed auto-fix.
 *
 * @param diagnosis - The diagnosis result from diagnostician
 * @param autoFixId - ID of the auto_fix record
 * @returns RiskAnalysisResult with risk level, decision, and reasoning
 */
export async function analyzeRisk(
  diagnosis: DiagnosisResult,
  autoFixId: string
): Promise<RiskAnalysisResult> {
  console.log("[RiskAnalyzer] Starting risk analysis...");
  console.log(`[RiskAnalyzer] Auto-fix ID: ${autoFixId}`);
  console.log(`[RiskAnalyzer] Confidence: ${diagnosis.confidence}`);
  console.log(`[RiskAnalyzer] Affected files: ${diagnosis.affected_files.join(", ") || "none"}`);

  // Step 1: Identify risk factors
  const riskFactors = identifyRiskFactors(diagnosis);

  // Step 2: Calculate composite risk score
  const riskScore = calculateRiskScore(diagnosis, riskFactors);

  // Step 3: Determine risk level
  const riskLevel = determineRiskLevel(riskScore, riskFactors);

  // Step 4: Make decision based on risk level
  const decision = mapRiskLevelToDecision(riskLevel);

  // Step 5: Generate reasoning
  const reasoning = generateReasoning(riskLevel, riskScore, riskFactors, diagnosis);

  const result: RiskAnalysisResult = {
    auto_fix_id: autoFixId,
    risk_level: riskLevel,
    risk_score: riskScore,
    risk_factors: riskFactors,
    decision,
    reasoning,
    model_used: MODEL_VERSION,
    executed: false
  };

  console.log(`[RiskAnalyzer] Risk level: ${riskLevel.toUpperCase()}`);
  console.log(`[RiskAnalyzer] Risk score: ${riskScore.toFixed(2)}`);
  console.log(`[RiskAnalyzer] Decision: ${decision}`);
  console.log(`[RiskAnalyzer] Reasoning: ${reasoning.substring(0, 120)}...`);

  return result;
}

/**
 * Identify risk factors from diagnosis result.
 */
function identifyRiskFactors(diagnosis: DiagnosisResult): RiskFactors {
  const affectedFiles = diagnosis.affected_files || [];

  // Check if any affected file matches critical path patterns
  const affectsCriticalPath = affectedFiles.some(file =>
    CRITICAL_PATH_PATTERNS.some(pattern =>
      file.toLowerCase().includes(pattern.toLowerCase())
    )
  );

  // Check for security impact
  const securityImpact = affectedFiles.some(file =>
    ["security", "auth", "secret", "password", "token", "session"].some(p =>
      file.toLowerCase().includes(p)
    )
  );

  // Check if fix requires migration
  const requiresMigration = diagnosis.fix.toLowerCase().includes("migration") ||
    diagnosis.fix.toLowerCase().includes("schema") ||
    diagnosis.cause.toLowerCase().includes("database");

  // Check for side effects (multiple affected files suggests broader impact)
  const hasSideEffects = affectedFiles.length > 2;

  // Determine error frequency from error IDs (if available)
  const errorFrequency = diagnosis.error_ids.length > 3 ? "high" :
    diagnosis.error_ids.length > 1 ? "medium" : "low";

  // Determine if rollback is available (conservative: assume no for critical paths)
  const rollbackAvailable = !affectsCriticalPath && !requiresMigration;

  // Determine if affects production
  const affectsProduction = diagnosis.confidence >= 0.5 && affectsCriticalPath;

  return {
    confidence_low: diagnosis.confidence < 0.7,
    affects_critical_path: affectsCriticalPath,
    has_side_effects: hasSideEffects,
    error_frequency: errorFrequency,
    rollback_available: rollbackAvailable,
    affects_production: affectsProduction,
    requires_migration: requiresMigration,
    security_impact: securityImpact
  };
}

/**
 * Calculate composite risk score (0.00 - 1.00).
 *
 * Weighted factors:
 *   - Confidence: 30% (lower confidence = higher risk)
 *   - Critical path impact: 25%
 *   - Security impact: 20%
 *   - Side effects: 10%
 *   - Migration required: 10%
 *   - Rollback availability: 5%
 */
function calculateRiskScore(diagnosis: DiagnosisResult, factors: RiskFactors): number {
  let score = 0;

  // Confidence factor (30%)
  // Invert confidence: 1.0 confidence → 0 risk, 0.0 confidence → 1.0 risk
  score += (1 - diagnosis.confidence) * 0.30;

  // Critical path impact (25%)
  if (factors.affects_critical_path) {
    score += 0.25;
  }

  // Security impact (20%)
  if (factors.security_impact) {
    score += 0.20;
  }

  // Side effects (10%)
  if (factors.has_side_effects) {
    score += 0.10;
  }

  // Migration required (10%)
  if (factors.requires_migration) {
    score += 0.10;
  }

  // Rollback unavailability (5%)
  if (!factors.rollback_available) {
    score += 0.05;
  }

  // Clamp to 0.00 - 1.00
  return Math.min(1.00, Math.max(0.00, score));
}

/**
 * Determine risk level from score and factors.
 */
function determineRiskLevel(riskScore: number, factors: RiskFactors): RiskLevel {
  // Override to critical if security impact + production impact
  if (factors.security_impact && factors.affects_production) {
    return "critical";
  }

  // Override to critical if requires migration + no rollback
  if (factors.requires_migration && !factors.rollback_available) {
    return "critical";
  }

  // Standard threshold-based classification
  if (riskScore <= LOW_RISK_THRESHOLD) {
    return "low";
  } else if (riskScore <= MEDIUM_RISK_THRESHOLD) {
    return "medium";
  } else if (riskScore <= 0.8) {
    return "high";
  } else {
    return "critical";
  }
}

/**
 * Map risk level to decision.
 */
function mapRiskLevelToDecision(riskLevel: RiskLevel): RiskDecision {
  switch (riskLevel) {
    case "low":
      return "auto_apply";
    case "medium":
      return "require_review";
    case "high":
    case "critical":
      return "block";
    default:
      return "require_review";
  }
}

/**
 * Generate human-readable reasoning for the risk decision.
 */
function generateReasoning(
  riskLevel: RiskLevel,
  riskScore: number,
  factors: RiskFactors,
  diagnosis: DiagnosisResult
): string {
  const parts: string[] = [];

  parts.push(`Risk level: ${riskLevel.toUpperCase()} (score: ${riskScore.toFixed(2)})`);

  // Confidence factor
  if (factors.confidence_low) {
    parts.push(`Low IA confidence (${diagnosis.confidence.toFixed(2)})`);
  }

  // Critical path
  if (factors.affects_critical_path) {
    parts.push("Affects critical system path");
  }

  // Security
  if (factors.security_impact) {
    parts.push("Security-related code impact");
  }

  // Side effects
  if (factors.has_side_effects) {
    parts.push(`Potential side effects (${diagnosis.affected_files.length} files affected)`);
  }

  // Migration
  if (factors.requires_migration) {
    parts.push("Requires database migration");
  }

  // Rollback
  if (!factors.rollback_available) {
    parts.push("No rollback available");
  }

  // If low risk, add positive factors
  if (riskLevel === "low") {
    if (!factors.affects_critical_path && !factors.security_impact) {
      parts.push("No critical path or security impact");
    }
    if (factors.rollback_available) {
      parts.push("Rollback available if needed");
    }
  }

  return parts.join(". ") + ".";
}

// ==========================================
// PERSISTENCE
// ==========================================

/**
 * Persist risk analysis to risk_decisions table.
 *
 * @param result - The RiskAnalysisResult to persist
 * @returns ID of the inserted risk_decisions record, or null on failure
 */
export async function persistRiskAnalysis(result: RiskAnalysisResult): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("risk_decisions")
      .insert({
        auto_fix_id: result.auto_fix_id,
        risk_level: result.risk_level,
        risk_score: result.risk_score,
        risk_factors: result.risk_factors,
        decision: result.decision,
        reasoning: result.reasoning,
        model_used: result.model_used,
        executed: false
      })
      .select("id")
      .single();

    if (error) {
      console.error(`[RiskAnalyzer] Failed to persist risk analysis: ${error.message}`);
      return null;
    }

    console.log(`[RiskAnalyzer] Risk analysis persisted with ID: ${data?.id}`);
    return data?.id || null;
  } catch (err: any) {
    console.error(`[RiskAnalyzer] Unexpected error persisting risk analysis: ${err.message}`);
    return null;
  }
}

// ==========================================
// EXECUTION
// ==========================================

/**
 * Execute the risk decision.
 * Updates the risk_decisions record with execution status.
 *
 * @param riskDecisionId - ID of the risk_decisions record
 * @param executed - Whether the decision was executed
 * @param result - Execution result (success/failure details)
 * @param error - Error message if execution failed
 */
export async function executeRiskDecision(
  riskDecisionId: string,
  executed: boolean,
  result?: any,
  error?: string
): Promise<void> {
  try {
    const { error: updateError } = await supabase
      .from("risk_decisions")
      .update({
        executed,
        executed_at: executed ? new Date().toISOString() : null,
        execution_result: result ? {
          success: result.success,
          action: result.action,
          modifiedFiles: result.modifiedFiles,
          timestamp: new Date().toISOString()
        } : null,
        execution_error: error || null
      })
      .eq("id", riskDecisionId);

    if (updateError) {
      console.error(`[RiskAnalyzer] Failed to update risk decision execution: ${updateError.message}`);
    } else {
      console.log(`[RiskAnalyzer] Risk decision execution status updated: executed=${executed}`);
    }
  } catch (err: any) {
    console.error(`[RiskAnalyzer] Unexpected error updating risk decision: ${err.message}`);
  }
}

// ==========================================
// FULL PIPELINE
// ==========================================

/**
 * Run the complete risk analysis pipeline.
 *
 * @param diagnosis - The diagnosis result from diagnostician
 * @param autoFixId - ID of the auto_fix record
 * @returns RiskAnalysisResult with execution status
 */
export async function fullRiskPipeline(
  diagnosis: DiagnosisResult,
  autoFixId: string
): Promise<RiskAnalysisResult> {
  console.log("[RiskAnalyzer] === Starting full risk analysis pipeline ===");

  try {
    // Step 1: Analyze risk
    const riskResult = await analyzeRisk(diagnosis, autoFixId);

    // Step 2: Persist analysis
    const persistedId = await persistRiskAnalysis(riskResult);
    if (!persistedId) {
      console.warn("[RiskAnalyzer] Failed to persist risk analysis, continuing anyway...");
    }

    console.log(`[RiskAnalyzer] === Risk Analysis Complete ===`);
    console.log(`[RiskAnalyzer] Risk level: ${riskResult.risk_level.toUpperCase()}`);
    console.log(`[RiskAnalyzer] Decision: ${riskResult.decision}`);
    console.log(`[RiskAnalyzer] Executed: ${riskResult.executed}`);

    return riskResult;
  } catch (err: any) {
    console.error(`[RiskAnalyzer] Pipeline error: ${err.message}`);

    // Return a safe "block" decision on error
    return {
      auto_fix_id: autoFixId,
      risk_level: "high",
      risk_score: 0.8,
      risk_factors: {
        confidence_low: false,
        affects_critical_path: false,
        has_side_effects: false,
        error_frequency: "unknown",
        rollback_available: false,
        affects_production: false,
        requires_migration: false,
        security_impact: false
      },
      decision: "block",
      reasoning: `Risk analysis pipeline failed: ${err.message}. Blocking for safety.`,
      model_used: MODEL_VERSION,
      executed: false,
      execution_error: err.message
    };
  }
}
