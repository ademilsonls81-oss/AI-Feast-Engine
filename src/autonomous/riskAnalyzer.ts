/**
 * Autonomous System v2 — Fase 4: Risk Classifier
 *
 * Evaluates the risk level of auto-fix suggestions before they are applied.
 * Prevents dangerous fixes from being auto-applied without human review.
 *
 * Risk Factors:
 *   1. IA Confidence (lower confidence = higher risk)
 *   2. Error Frequency (frequent errors = higher urgency but also higher risk)
 *   3. Affected Files (critical system files = higher risk)
 *   4. Error Severity (critical errors = higher risk)
 *   5. Side Effects Potential (complex fixes = higher risk)
 *   6. Rollback Availability (can we undo? = lower risk)
 *
 * Decision Matrix:
 *   - low risk (score < 0.3): auto_apply
 *   - medium risk (0.3 <= score < 0.6): require_review
 *   - high risk (0.6 <= score < 0.85): require_review
 *   - critical risk (score >= 0.85): block
 */

import { supabase } from "../lib/supabase.js";
import type { DiagnosisResult } from "./diagnostician.js";

// ==========================================
// TYPES
// ==========================================

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type RiskDecision = "auto_apply" | "require_review" | "block";

export interface RiskFactors {
  confidence_low: boolean;           // IA confidence < 0.7
  affects_critical_path: boolean;    // Affects core system files
  has_side_effects: boolean;         // Fix may affect other components
  error_frequency: "low" | "medium" | "high";  // How often this error occurs
  rollback_available: boolean;       // Can we easily undo the fix?
  affects_production: boolean;       // Affects production environment
  complexity_high: boolean;          // Fix involves complex changes
}

export interface RiskAnalysisResult {
  auto_fix_id?: string;
  risk_level: RiskLevel;
  risk_score: number;  // 0.00 - 1.00
  risk_factors: RiskFactors;
  decision: RiskDecision;
  reasoning: string;
  model_used: string;
  diagnosis: DiagnosisResult;
}

// ==========================================
// CONFIGURATION
// ==========================================

// Critical system files that increase risk if modified
const CRITICAL_PATHS = [
  "server.ts",
  "src/lib/supabase.ts",
  "src/lib/",
  "src/middleware/",
  "src/services/auth",
  "src/routes/auth",
  "stripe",
  "webhook"
];

// Risk score thresholds
const RISK_THRESHOLDS = {
  low: 0.3,
  medium: 0.6,
  high: 0.85
};

// Weights for risk factors (sum = 1.0)
const RISK_WEIGHTS = {
  confidence: 0.25,
  critical_path: 0.20,
  side_effects: 0.15,
  error_frequency: 0.10,
  rollback: 0.10,
  production: 0.10,
  complexity: 0.10
};

// ==========================================
// RISK FACTOR ANALYSIS
// ==========================================

/**
 * Analyze if affected files include critical system paths.
 */
function affectsCriticalPath(affectedFiles: string[]): boolean {
  if (!affectedFiles || affectedFiles.length === 0) return false;

  return affectedFiles.some(file =>
    CRITICAL_PATHS.some(path => file.toLowerCase().includes(path.toLowerCase()))
  );
}

/**
 * Estimate if the fix has potential side effects.
 * Heuristic: fixes affecting multiple files or critical paths likely have side effects.
 */
function hasSideEffects(affectedFiles: string[], fix: string): boolean {
  // Multiple files = higher chance of side effects
  if (affectedFiles.length > 3) return true;

  // Fix mentions changes to shared components
  const sideEffectKeywords = [
    "middleware", "shared", "global", "config", "database",
    "schema", "migration", "all", "every", "entire"
  ];

  const fixLower = fix.toLowerCase();
  return sideEffectKeywords.some(keyword => fixLower.includes(keyword));
}

/**
 * Determine error frequency category.
 * Based on the error patterns in the diagnosis.
 */
function estimateErrorFrequency(diagnosis: DiagnosisResult): "low" | "medium" | "high" {
  // Use error_ids count as proxy for frequency
  const errorCount = diagnosis.error_ids?.length || 0;

  if (errorCount >= 5) return "high";
  if (errorCount >= 2) return "medium";
  return "low";
}

/**
 * Check if rollback is available.
 * Heuristic: if the fix affects versioned files or has migration support.
 */
function isRollbackAvailable(affectedFiles: string[], fix: string): boolean {
  // Migrations can be rolled back
  if (affectedFiles.some(f => f.includes("migration"))) return true;

  // Fix mentions revert or rollback
  const fixLower = fix.toLowerCase();
  if (fixLower.includes("revert") || fixLower.includes("rollback")) return true;

  // Config changes can be reverted
  if (affectedFiles.some(f => f.includes("config") || f.includes(".env"))) return true;

  return false;
}

/**
 * Check if fix affects production environment.
 */
function affectsProduction(affectedFiles: string[]): boolean {
  // Core server files and routes affect production
  return affectsCriticalPath(affectedFiles) ||
    affectedFiles.some(f => f.includes("routes") || f.includes("server"));
}

/**
 * Estimate fix complexity.
 */
function isComplexFix(fix: string, affectedFiles: string[]): boolean {
  // Long fix description = complex
  if (fix.length > 500) return true;

  // Multiple files = complex
  if (affectedFiles.length > 5) return true;

  // Complex keywords
  const complexityKeywords = [
    "refactor", "restructure", "rewrite", "redesign",
    "architecture", "pattern", "multiple", "several"
  ];

  const fixLower = fix.toLowerCase();
  return complexityKeywords.some(keyword => fixLower.includes(keyword));
}

// ==========================================
// RISK SCORE CALCULATION
// ==========================================

/**
 * Calculate composite risk score (0.00 - 1.00).
 */
function calculateRiskScore(
  diagnosis: DiagnosisResult,
  factors: RiskFactors
): number {
  let score = 0;

  // 1. Confidence factor (low confidence = high risk)
  const confidenceRisk = 1 - diagnosis.confidence;
  score += confidenceRisk * RISK_WEIGHTS.confidence;

  // 2. Critical path
  score += (factors.affects_critical_path ? 1 : 0) * RISK_WEIGHTS.critical_path;

  // 3. Side effects
  score += (factors.has_side_effects ? 1 : 0) * RISK_WEIGHTS.side_effects;

  // 4. Error frequency (high frequency = higher urgency but also higher risk of cascade)
  const frequencyScore = factors.error_frequency === "high" ? 1 :
    factors.error_frequency === "medium" ? 0.5 : 0;
  score += frequencyScore * RISK_WEIGHTS.error_frequency;

  // 5. Rollback (no rollback = higher risk)
  score += (factors.rollback_available ? 0 : 1) * RISK_WEIGHTS.rollback;

  // 6. Production impact
  score += (factors.affects_production ? 1 : 0) * RISK_WEIGHTS.production;

  // 7. Complexity
  score += (factors.complexity_high ? 1 : 0) * RISK_WEIGHTS.complexity;

  // Clamp to 0-1
  return Math.min(1, Math.max(0, score));
}

/**
 * Determine risk level from score.
 * Exported for testing.
 */
export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.high) return "critical";
  if (score >= RISK_THRESHOLDS.medium) return "high";
  if (score >= RISK_THRESHOLDS.low) return "medium";
  return "low";
}

/**
 * Determine decision based on risk level.
 */
function riskLevelToDecision(riskLevel: RiskLevel): RiskDecision {
  switch (riskLevel) {
    case "low":
      return "auto_apply";
    case "medium":
    case "high":
      return "require_review";
    case "critical":
      return "block";
  }
}

// ==========================================
// REASONING GENERATION
// ==========================================

/**
 * Generate human-readable reasoning for the risk classification.
 */
function generateReasoning(
  diagnosis: DiagnosisResult,
  factors: RiskFactors,
  riskLevel: RiskLevel,
  riskScore: number
): string {
  const reasons: string[] = [];

  if (factors.confidence_low) {
    reasons.push(`IA confidence is low (${diagnosis.confidence})`);
  }

  if (factors.affects_critical_path) {
    reasons.push("fix affects critical system paths");
  }

  if (factors.has_side_effects) {
    reasons.push("potential side effects detected");
  }

  if (factors.error_frequency === "high") {
    reasons.push("error frequency is high (frequent failures)");
  }

  if (!factors.rollback_available) {
    reasons.push("no automatic rollback available");
  }

  if (factors.affects_production) {
    reasons.push("affects production environment");
  }

  if (factors.complexity_high) {
    reasons.push("fix complexity is high");
  }

  if (reasons.length === 0) {
    reasons.push("no significant risk factors detected");
  }

  return `Risk level: ${riskLevel} (score: ${riskScore.toFixed(2)}). ${reasons.join("; ")}. Decision: ${riskLevelToDecision(riskLevel).replace("_", " ")}.`;
}

// ==========================================
// MAIN RISK ANALYSIS
// ==========================================

/**
 * Analyze the risk level of a diagnosis result.
 *
 * @param diagnosis - The DiagnosisResult from the diagnostician
 * @returns RiskAnalysisResult with risk_level, risk_score, decision, reasoning
 */
export async function analyzeRisk(diagnosis: DiagnosisResult): Promise<RiskAnalysisResult> {
  console.log("[RiskAnalyzer] Starting risk analysis...");

  const affectedFiles = diagnosis.affected_files || [];
  const fix = diagnosis.fix || "";

  // Analyze risk factors
  const riskFactors: RiskFactors = {
    confidence_low: diagnosis.confidence < 0.7,
    affects_critical_path: affectsCriticalPath(affectedFiles),
    has_side_effects: hasSideEffects(affectedFiles, fix),
    error_frequency: estimateErrorFrequency(diagnosis),
    rollback_available: isRollbackAvailable(affectedFiles, fix),
    affects_production: affectsProduction(affectedFiles),
    complexity_high: isComplexFix(fix, affectedFiles)
  };

  // Calculate risk score
  const riskScore = calculateRiskScore(diagnosis, riskFactors);
  const riskLevel = scoreToRiskLevel(riskScore);
  const decision = riskLevelToDecision(riskLevel);
  const reasoning = generateReasoning(diagnosis, riskFactors, riskLevel, riskScore);

  const result: RiskAnalysisResult = {
    risk_level: riskLevel,
    risk_score: Math.round(riskScore * 100) / 100,  // Round to 2 decimals
    risk_factors: riskFactors,
    decision,
    reasoning,
    model_used: "risk-classifier-v1",
    diagnosis
  };

  console.log(`[RiskAnalyzer] Risk level: ${riskLevel} (score: ${result.risk_score})`);
  console.log(`[RiskAnalyzer] Decision: ${decision}`);
  console.log(`[RiskAnalyzer] Reasoning: ${reasoning}`);

  return result;
}

// ==========================================
// PERSISTENCE
// ==========================================

/**
 * Persist risk analysis to risk_decisions table.
 *
 * @param riskAnalysis - The RiskAnalysisResult to persist
 * @param autoFixId - The ID of the auto_fix record this analysis refers to
 */
export async function persistRiskAnalysis(
  riskAnalysis: RiskAnalysisResult,
  autoFixId: string
): Promise<void> {
  try {
    const { error } = await supabase.from("risk_decisions").insert({
      auto_fix_id: autoFixId,
      risk_level: riskAnalysis.risk_level,
      risk_score: riskAnalysis.risk_score,
      risk_factors: riskAnalysis.risk_factors,
      decision: riskAnalysis.decision,
      reasoning: riskAnalysis.reasoning,
      model_used: riskAnalysis.model_used
    });

    if (error) {
      console.error(`[RiskAnalyzer] Failed to persist risk analysis: ${error.message}`);
    } else {
      console.log(`[RiskAnalyzer] Risk analysis persisted (ID: ${autoFixId})`);
    }
  } catch (err: any) {
    console.error(`[RiskAnalyzer] Unexpected error persisting risk analysis: ${err.message}`);
  }
}

// ==========================================
// DECISION EXECUTOR
// ==========================================

/**
 * Execute the risk decision.
 * - auto_apply: apply the fix automatically
 * - require_review: flag for human review
 * - block: prevent fix from being applied
 *
 * NOTE: auto_apply is not yet implemented — requires a code modification system.
 * For now, it just updates the auto_fix status.
 */
export async function executeRiskDecision(
  riskAnalysis: RiskAnalysisResult,
  autoFixId: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  console.log(`[RiskAnalyzer] Executing decision: ${riskAnalysis.decision}`);

  try {
    let newStatus: string;

    switch (riskAnalysis.decision) {
      case "auto_apply":
        newStatus = "auto_applied";
        console.log(`[RiskAnalyzer] Auto-applying fix ${autoFixId}...`);
        // TODO: Implement actual code modification
        // For now, just update status
        break;

      case "require_review":
        newStatus = "pending_review";
        console.log(`[RiskAnalyzer] Flagging ${autoFixId} for human review...`);
        break;

      case "block":
        newStatus = "rejected";
        console.log(`[RiskAnalyzer] Blocking fix ${autoFixId} — too risky!`);
        break;

      default:
        return { success: false, error: `Unknown decision: ${riskAnalysis.decision}` };
    }

    // Update auto_fix status
    const { error } = await supabase
      .from("auto_fixes")
      .update({ status: newStatus })
      .eq("id", autoFixId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Update risk_decisions executed flag
    const { error: updateError } = await supabase
      .from("risk_decisions")
      .update({
        executed: true,
        executed_at: new Date().toISOString(),
        execution_result: { status: newStatus }
      })
      .eq("auto_fix_id", autoFixId);

    if (updateError) {
      console.error(`[RiskAnalyzer] Failed to update execution status: ${updateError.message}`);
    }

    return { success: true, result: { status: newStatus } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// FULL PIPELINE
// ==========================================

/**
 * Complete risk analysis pipeline:
 * 1. Analyze risk
 * 2. Persist to database
 * 3. Execute decision
 *
 * @param diagnosis - The DiagnosisResult from the diagnostician
 * @param autoFixId - The ID of the auto_fix record
 * @returns RiskAnalysisResult with execution status
 */
export async function fullRiskPipeline(
  diagnosis: DiagnosisResult,
  autoFixId: string
): Promise<RiskAnalysisResult & { executed: boolean; executionError?: string }> {
  // 1. Analyze risk
  const riskAnalysis = await analyzeRisk(diagnosis);

  // 2. Persist
  await persistRiskAnalysis(riskAnalysis, autoFixId);

  // 3. Execute decision
  const execution = await executeRiskDecision(riskAnalysis, autoFixId);

  return {
    ...riskAnalysis,
    executed: execution.success,
    executionError: execution.error
  };
}
