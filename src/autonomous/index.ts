/**
 * Autonomous System v2
 * 
 * Self-monitoring and auto-healing system for AI Feast Engine.
 * 
 * Phases:
 *   Fase 0: system_errors table (migration 011)
 *   Fase 1: logError() function
 *   Fase 2: Monitor (threshold-based error checking)
 *   Fase 3: Diagnosis (auto-detection and reporting)
 *   Fase 4: Auto-fix (automated remediation)
 */

export { logError, withErrorLogging } from "./errorLogger.js";
export { startMonitor, checkErrorThreshold } from "./monitor.js";
export type { ErrorType, ErrorSource, ErrorSeverity } from "./errorLogger.js";
