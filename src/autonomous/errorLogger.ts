/**
 * Autonomous System v2 — Fase 1: Error Logger
 * 
 * Centralized error logging function for the autonomous monitoring system.
 * All errors across the application should use this function instead of console.error()
 * to enable threshold-based monitoring and auto-diagnosis.
 */

import { supabase } from "../lib/supabase.js";

export type ErrorType =
  | "api_error"
  | "db_error"
  | "webhook_error"
  | "timeout"
  | "rate_limit"
  | "auth_error"
  | "stripe_error"
  | "cron_error"
  | "queue_error"
  | "unknown";

export type ErrorSource =
  | "server"
  | "cron"
  | "webhook"
  | "skill_import"
  | "stripe"
  | "queue"
  | "chat"
  | "monitor";

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

interface LogErrorOptions {
  type: ErrorType;
  source: ErrorSource;
  message: string;
  stackTrace?: string;
  severity?: ErrorSeverity;
  endpoint?: string;
  httpStatus?: number;
  retryCount?: number;
  metadata?: Record<string, any>;
}

/**
 * Log an error to the system_errors table.
 * 
 * Usage:
 *   await logError({
 *     type: "api_error",
 *     source: "webhook",
 *     message: "Failed to update user plan",
 *     stackTrace: err.stack,
 *     severity: "error",
 *     endpoint: "/api/stripe-webhook",
 *     metadata: { userId: "123" }
 *   });
 */
export async function logError(options: LogErrorOptions): Promise<void> {
  const {
    type,
    source,
    message,
    stackTrace,
    severity = "error",
    endpoint,
    httpStatus,
    retryCount = 0,
    metadata = {}
  } = options;

  try {
    const { error } = await supabase.from("system_errors").insert({
      error_type: type,
      source,
      message,
      stack_trace: stackTrace,
      severity,
      endpoint,
      http_status: httpStatus,
      retry_count: retryCount,
      metadata
    });

    if (error) {
      // Fallback: log to console if DB insert fails
      console.error(`[logError] DB insert failed: ${error.message}. Original error: ${message}`);
    }
  } catch (err: any) {
    // Ultimate fallback — never let logging crash the app
    console.error(`[logError] Unexpected error: ${err.message}. Original: ${message}`);
  }
}

/**
 * Convenience wrapper for try-catch blocks.
 * 
 * Usage:
 *   const result = await withErrorLogging(
 *     () => stripe.checkout.sessions.create({...}),
 *     { type: "stripe_error", source: "stripe", endpoint: "/api/create-checkout-session" }
 *   );
 */
export async function withErrorLogging<T>(
  fn: () => Promise<T>,
  errorOptions: Omit<LogErrorOptions, "message" | "stackTrace">
): Promise<T | null> {
  try {
    return await fn();
  } catch (err: any) {
    await logError({
      ...errorOptions,
      message: err.message || "Unknown error",
      stackTrace: err.stack,
      httpStatus: err.statusCode || err.status,
      severity: err.statusCode >= 500 ? "critical" : "error"
    });
    return null;
  }
}
