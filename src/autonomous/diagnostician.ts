/**
 * Autonomous System v2 — Fase 3: AI Diagnostician
 *
 * Uses Groq (llama-3.1-8b-instant) to analyze system errors and generate
 * structured diagnosis reports with root cause analysis and fix suggestions.
 *
 * Flow:
 *   1. Receive recent errors (last hour, max 5)
 *   2. Build context from error data (max 2000 chars)
 *   3. Send to Groq IA with structured prompt
 *   4. Parse JSON response (with fallback for invalid JSON)
 *   5. Return DiagnosisResult with cause, fix, confidence, affected_files
 *   6. Persist to auto_fixes table
 */

import OpenAI from "openai";
import { supabase } from "../lib/supabase.js";

// ==========================================
// TYPES
// ==========================================

export interface SystemError {
  id?: string;
  error_type: string;
  source: string;
  message: string;
  stack_trace?: string;
  severity: string;
  endpoint?: string;
  http_status?: number;
  created_at?: string;
}

export interface DiagnosisResult {
  cause: string;
  fix: string;
  confidence: number; // 0-1
  affected_files: string[];
  raw_ia_response?: string;
  model_used: string;
  error_ids: string[];
}

// ==========================================
// CONFIGURATION
// ==========================================

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || "";
const GROQ_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.groq.com/openai/v1";
const IA_MODEL = "llama-3.1-8b-instant";
const MAX_CONTEXT_CHARS = 2000;
const MAX_ERRORS_FOR_ANALYSIS = 5;

// ==========================================
// JSON CLEANING FALLBACK
// ==========================================

/**
 * Attempts to extract valid JSON from IA response.
 * Handles cases where IA wraps JSON in markdown code blocks or adds extra text.
 */
function cleanJSON(response: string): string | null {
  // Try direct parse first
  try {
    JSON.parse(response);
    return response;
  } catch {}

  // Try to extract JSON from code block
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      JSON.parse(codeBlockMatch[1].trim());
      return codeBlockMatch[1].trim();
    } catch {}
  }

  // Try to find JSON object in text
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      JSON.parse(jsonMatch[0]);
      return jsonMatch[0];
    } catch {}
  }

  return null;
}

// ==========================================
// PROMPT BUILDER
// ==========================================

/**
 * Build the system prompt for the IA with error context.
 * Limits context to MAX_CONTEXT_CHARS to stay within token limits.
 */
function buildPrompt(errors: SystemError[]): string {
  const errorContext = errors
    .slice(0, MAX_ERRORS_FOR_ANALYSIS)
    .map((e, i) => {
      const parts: string[] = [];
      parts.push(`${i + 1}. [${e.severity.toUpperCase()}] ${e.error_type} from ${e.source}`);
      if (e.endpoint) parts.push(`   Endpoint: ${e.endpoint}`);
      if (e.http_status) parts.push(`   HTTP Status: ${e.http_status}`);
      parts.push(`   Message: ${e.message}`);
      if (e.stack_trace) {
        const truncatedStack = e.stack_trace.length > 300 ? e.stack_trace.substring(0, 300) + "..." : e.stack_trace;
        parts.push(`   Stack: ${truncatedStack}`);
      }
      if (e.created_at) parts.push(`   Time: ${e.created_at}`);
      return parts.join("\n");
    })
    .join("\n\n");

  // Truncate context if needed
  const truncatedContext = errorContext.length > MAX_CONTEXT_CHARS
    ? errorContext.substring(0, MAX_CONTEXT_CHARS) + "\n...[context truncated]"
    : errorContext;

  return `You are an autonomous system diagnostician for a Node.js/Express backend API called "AI Feast Engine".

Analyze the following errors and provide a structured diagnosis in JSON format.

## Error Context (last hour):
${truncatedContext}

## Response Format (JSON ONLY, no extra text):
{
  "cause": "Root cause analysis — what is likely causing these errors. Be specific.",
  "fix": "Concrete code fix suggestion — what file to change and what to change it to.",
  "confidence": 0.85,
  "affected_files": ["src/routes/xxx.ts", "server.ts"]
}

Rules:
- confidence must be between 0.0 and 1.0
- affected_files should be realistic file paths in the project
- fix should be actionable, not vague
- Return ONLY the JSON object, no markdown, no explanation
`;
}

// ==========================================
// IA DIAGNOSIS
// ==========================================

/**
 * Call Groq IA to analyze errors and return diagnosis.
 * Handles failures gracefully with fallback response.
 */
async function callIA(errors: SystemError[]): Promise<DiagnosisResult> {
  if (!GROQ_API_KEY) {
    console.warn("[Diagnostician] GROQ_API_KEY not set, using fallback diagnosis.");
    return getFallbackDiagnosis(errors);
  }

  try {
    const client = new OpenAI({
      apiKey: GROQ_API_KEY,
      baseURL: GROQ_BASE_URL
    });

    const prompt = buildPrompt(errors);

    const response = await client.chat.completions.create({
      model: IA_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a backend diagnostician. Analyze errors and return JSON diagnosis."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3, // Low temperature for consistent, focused responses
      max_tokens: 1024
    });

    const iaText = response.choices[0]?.message?.content || "";

    if (!iaText) {
      console.warn("[Diagnostician] IA returned empty response, using fallback.");
      return getFallbackDiagnosis(errors);
    }

    // Parse response
    const cleanedJSON = cleanJSON(iaText);

    if (!cleanedJSON) {
      console.warn("[Diagnostician] Could not parse IA response as JSON, using fallback.");
      console.warn(`[Diagnostician] Raw response: ${iaText.substring(0, 200)}...`);
      return getFallbackDiagnosis(errors);
    }

    const parsed = JSON.parse(cleanedJSON);

    // Validate required fields
    if (!parsed.cause || !parsed.fix || typeof parsed.confidence !== "number") {
      console.warn("[Diagnostician] IA response missing required fields, using fallback.");
      return getFallbackDiagnosis(errors);
    }

    return {
      cause: parsed.cause,
      fix: parsed.fix,
      confidence: Math.min(1, Math.max(0, parsed.confidence)), // Clamp 0-1
      affected_files: Array.isArray(parsed.affected_files) ? parsed.affected_files : [],
      raw_ia_response: iaText,
      model_used: IA_MODEL,
      error_ids: errors.filter(e => e.id).map(e => e.id!)
    };
  } catch (err: any) {
    console.error(`[Diagnostician] IA call failed: ${err.message}, using fallback.`);
    return getFallbackDiagnosis(errors);
  }
}

// ==========================================
// FALLBACK DIAGNOSIS
// ==========================================

/**
 * Returns a basic diagnosis when IA is unavailable.
 * Based on error type patterns.
 */
function getFallbackDiagnosis(errors: SystemError[]): DiagnosisResult {
  const types = errors.map(e => e.error_type);
  const sources = errors.map(e => e.source);

  // Pattern-based fallback
  if (types.includes("webhook_error")) {
    return {
      cause: "Webhook signature verification is failing. Possible causes: STRIPE_WEBHOOK_SECRET mismatch, Stripe API version mismatch, or raw body not being preserved correctly.",
      fix: "Verify that express.raw({ type: 'application/json' }) middleware is registered BEFORE express.json() for the webhook endpoint. Also check that STRIPE_WEBHOOK_SECRET matches the one in Stripe Dashboard.",
      confidence: 0.6,
      affected_files: ["server.ts"],
      model_used: "fallback",
      raw_ia_response: "Fallback — IA unavailable",
      error_ids: errors.filter(e => e.id).map(e => e.id!)
    };
  }

  if (types.includes("db_error") || types.includes("timeout")) {
    return {
      cause: "Database connection issues or slow queries. Possible causes: Supabase pool exhaustion, network latency, or unoptimized queries.",
      fix: "Check Supabase connection pool settings. Add query timeout and retry logic. Review slow queries in the affected endpoints.",
      confidence: 0.5,
      affected_files: ["src/lib/supabase.ts", "src/routes/public.ts"],
      model_used: "fallback",
      raw_ia_response: "Fallback — IA unavailable",
      error_ids: errors.filter(e => e.id).map(e => e.id!)
    };
  }

  if (types.includes("stripe_error")) {
    return {
      cause: "Stripe API integration failure. Possible causes: Invalid API key, expired credentials, or rate limiting.",
      fix: "Verify STRIPE_SECRET_KEY is correct and active. Check Stripe Dashboard for any account issues or rate limit warnings.",
      confidence: 0.5,
      affected_files: ["server.ts"],
      model_used: "fallback",
      raw_ia_response: "Fallback — IA unavailable",
      error_ids: errors.filter(e => e.id).map(e => e.id!)
    };
  }

  // Generic fallback
  return {
    cause: `Multiple ${types[0] || "unknown"} errors detected from ${sources[0] || "unknown"} source. Requires manual investigation.`,
    fix: "Review the error logs in the affected endpoint. Check for recent code changes or dependency updates that may have caused the issue.",
    confidence: 0.3,
    affected_files: errors.filter(e => e.endpoint).map(e => `src/routes/${e.endpoint?.split("/")[2] || "unknown"}.ts`) || ["server.ts"],
    model_used: "fallback",
    raw_ia_response: "Fallback — IA unavailable",
    error_ids: errors.filter(e => e.id).map(e => e.id!)
  };
}

// ==========================================
// PERSISTENCE
// ==========================================

/**
 * Save diagnosis result to auto_fixes table.
 */
async function persistDiagnosis(result: DiagnosisResult): Promise<void> {
  try {
    const { error } = await supabase.from("auto_fixes").insert({
      error_ids: result.error_ids,
      cause: result.cause,
      fix: result.fix,
      confidence: result.confidence,
      affected_files: result.affected_files,
      status: "pending_review",
      raw_ia_response: result.raw_ia_response?.substring(0, 5000), // Limit size
      model_used: result.model_used
    });

    if (error) {
      console.error(`[Diagnostician] Failed to persist diagnosis: ${error.message}`);
    } else {
      console.log(`[Diagnostician] Diagnosis persisted with confidence: ${result.confidence}`);
    }
  } catch (err: any) {
    console.error(`[Diagnostician] Unexpected error persisting diagnosis: ${err.message}`);
  }
}

// ==========================================
// MAIN EXPORT
// ==========================================

/**
 * Run autonomous diagnosis on recent errors.
 *
 * @param errors - Array of SystemError objects (last hour, max 5)
 * @returns DiagnosisResult with cause, fix, confidence, affected_files
 */
export async function runDiagnosis(errors: SystemError[]): Promise<DiagnosisResult> {
  console.log("[Diagnostician] Starting AI diagnosis...");
  console.log(`[Diagnostician] Analyzing ${errors.length} error(s)...`);

  // Call IA (or fallback)
  const result = await callIA(errors);

  console.log(`[Diagnostician] Cause: ${result.cause.substring(0, 100)}...`);
  console.log(`[Diagnostician] Fix: ${result.fix.substring(0, 100)}...`);
  console.log(`[Diagnostician] Confidence: ${result.confidence}`);
  console.log(`[Diagnostician] Model: ${result.model_used}`);

  // Persist to database
  await persistDiagnosis(result);

  return result;
}
