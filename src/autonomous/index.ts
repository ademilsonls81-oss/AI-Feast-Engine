/**
 * Autonomous System v2
 *
 * Self-monitoring and self-healing system for AI Feast Engine.
 *
 * Phases:
 *   Fase 0: system_errors table (migration 011)
 *   Fase 1: logError() function
 *   Fase 2: Monitor (threshold-based error checking)
 *   Fase 3: Diagnosis (AI-powered analysis with Groq)
 *   Fase 4: Risk Classifier (risk assessment before auto-fix)
 *   Fase 5: Auto-Fixer (controlled auto-correction)
 *   Fase 6: Security Auditor (mandatory audit before any fix)
 *   Fase 7: Smoke Tests (automated validation after fix)
 *   Fase 8: Auto Deploy (automatic git commit + push after validation)
 *   Fase 9: Main Loop (orchestrates all phases in sequence)
 */

export { logError, withErrorLogging } from "./errorLogger.js";
export { startMonitor, triggerAutonomousLoop } from "./monitor.js";
export { runAutonomousLoop, triggerAutonomousLoop as triggerLoop } from "./loop.js";
export { runDiagnosis } from "./diagnostician.js";
export { analyzeRisk, persistRiskAnalysis, executeRiskDecision, fullRiskPipeline } from "./riskAnalyzer.js";
export { applyFix, simulateSyntaxError } from "./fixer.js";
export { runSecurityAudit, quickSecurityAudit } from "./auditor.js";
export { runSmokeTests, validateFixWithRollback, quickValidation } from "./tester.js";
export { deployIfSafe, isDeploySafe, revertDeploy } from "./deployer.js";
export { isLoopActive, getLoopStatus } from "./loop.js";
export type { ErrorType, ErrorSource, ErrorSeverity } from "./errorLogger.js";
export type { SystemError, DiagnosisResult } from "./diagnostician.js";
export type { RiskLevel, RiskDecision, RiskFactors, RiskAnalysisResult } from "./riskAnalyzer.js";
export type { FixResult, FixPattern } from "./fixer.js";
export type { AuditResult, AuditIssue, AuditResultFull } from "./auditor.js";
export type { SmokeTestResult, SmokeTestSuiteResult } from "./tester.js";
export type { DeployResult, DeployConfig } from "./deployer.js";
