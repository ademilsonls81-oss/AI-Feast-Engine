/**
 * Autonomous System v2
 *
 * Self-monitoring and auto-healing system for AI Feast Engine.
 *
 * Phases:
 *   Fase 0: system_errors table (migration 011)
 *   Fase 1: logError() function
 *   Fase 2: Monitor (threshold-based error checking)
 *   Fase 3: Diagnosis (AI-powered analysis with Groq)
 *   Fase 4: Risk Classifier (risk assessment before auto-fix)
 */

export { logError, withErrorLogging } from "./errorLogger.js";
export { startMonitor, checkErrorThreshold } from "./monitor.js";
export { runDiagnosis } from "./diagnostician.js";
export { analyzeRisk, persistRiskAnalysis, executeRiskDecision, fullRiskPipeline } from "./riskAnalyzer.js";
export type { ErrorType, ErrorSource, ErrorSeverity } from "./errorLogger.js";
export type { SystemError, DiagnosisResult } from "./diagnostician.js";
export type { RiskLevel, RiskDecision, RiskFactors, RiskAnalysisResult } from "./riskAnalyzer.js";
