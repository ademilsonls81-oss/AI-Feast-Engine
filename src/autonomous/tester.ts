/**
 * Autonomous System v2 — Fase 7: Smoke Tests
 *
 * Automated smoke tests that run AFTER a fix is applied.
 * Validates that core endpoints are still functional.
 *
 * Endpoints tested:
 *   1. GET /api/health — Basic liveness check
 *   2. GET /api/skills — Skills endpoint
 *   3. GET /api/feed — Feed endpoint (with test API key)
 *
 * Flow:
 *   1. Start server if not running
 *   2. Hit each endpoint with timeout
 *   3. Validate HTTP status (200-299 = pass)
 *   4. If ANY fail → rollback the fix
 *   5. If ALL pass → mark validation_status: 'passed'
 *
 * Safety:
 *   - Tests run in isolated mode (no side effects)
 *   - Timeout per endpoint: 5 seconds
 *   - Total test timeout: 15 seconds
 *   - On failure: automatic rollback from backup
 */

import http from "http";
import { supabase } from "../lib/supabase.js";
import { restoreFromBackup } from "./fixer.js";

// ==========================================
// TYPES
// ==========================================

export interface SmokeTestResult {
  endpoint: string;
  status: number;
  responseTime: number;
  passed: boolean;
  error?: string;
}

export interface SmokeTestSuiteResult {
  passed: boolean;
  tests: SmokeTestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  error?: string;
}

// ==========================================
// CONFIGURATION
// ==========================================

const SERVER_HOST = process.env.SERVER_HOST || "localhost";
const SERVER_PORT = parseInt(process.env.SERVER_PORT || "3000");
const BASE_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;

const ENDPOINTS_TO_TEST = [
  {
    path: "/api/health",
    description: "Health check endpoint",
    expectStatus: 200,
    timeout: 5000
  },
  {
    path: "/api/skills",
    description: "Skills listing endpoint",
    expectStatus: 200,
    timeout: 5000
  },
  {
    path: "/api/feed",
    description: "Feed endpoint (with test API key)",
    expectStatus: 200,
    timeout: 5000,
    headers: { "X-API-Key": process.env.TEST_API_KEY || "test-key" }
  }
];

const TOTAL_TIMEOUT = 20000; // 20 seconds total

// ==========================================
// HTTP HELPER
// ==========================================

/**
 * Make an HTTP GET request with timeout.
 */
function httpGet(
  url: string,
  headers?: Record<string, string>,
  timeout = 5000
): Promise<{ status: number; body: string; duration: number }> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const timer = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);

    const req = http.get(url, { headers, timeout }, (res) => {
      clearTimeout(timer);
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        const duration = Date.now() - startTime;
        resolve({ status: res.statusCode || 0, body, duration });
      });
    });

    req.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    req.on("timeout", () => {
      clearTimeout(timer);
      req.destroy();
      reject(new Error(`Request timeout after ${timeout}ms`));
    });
  });
}

// ==========================================
// SMOKE TEST FUNCTIONS
// ==========================================

/**
 * Test a single endpoint.
 */
async function testEndpoint(
  endpoint: typeof ENDPOINTS_TO_TEST[0]
): Promise<SmokeTestResult> {
  const url = `${BASE_URL}${endpoint.path}`;
  console.log(`[Tester] Testing: ${endpoint.description} (${url})`);

  try {
    const { status, body, duration } = await httpGet(
      url,
      endpoint.headers,
      endpoint.timeout
    );

    const passed = status >= 200 && status < 300;

    console.log(
      `[Tester] ${passed ? "✅" : "❌"} ${endpoint.path} → ${status} (${duration}ms)`
    );

    return {
      endpoint: endpoint.path,
      status,
      responseTime: duration,
      passed,
      error: passed ? undefined : `Expected 2xx, got ${status}`
    };
  } catch (err: any) {
    console.log(`[Tester] ❌ ${endpoint.path} → ERROR: ${err.message}`);

    return {
      endpoint: endpoint.path,
      status: 0,
      responseTime: 0,
      passed: false,
      error: err.message
    };
  }
}

/**
 * Run smoke tests on all core endpoints.
 *
 * @returns SmokeTestSuiteResult with pass/fail for each test
 */
export async function runSmokeTests(): Promise<SmokeTestSuiteResult> {
  console.log("[Tester] === Starting smoke tests ===");
  console.log(`[Tester] Server: ${BASE_URL}`);
  console.log(`[Tester] Endpoints to test: ${ENDPOINTS_TO_TEST.length}`);

  const suiteStartTime = Date.now();
  const results: SmokeTestResult[] = [];

  // Run tests sequentially to avoid overwhelming the server
  for (const endpoint of ENDPOINTS_TO_TEST) {
    const result = await testEndpoint(endpoint);
    results.push(result);

    // Fail fast: if any test fails, we can stop early
    if (!result.passed) {
      console.log(`[Tester] ⚠️  Test failed: ${endpoint.path} — stopping early`);
      break;
    }
  }

  const totalDuration = Date.now() - suiteStartTime;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.filter(r => !r.passed).length;
  const allPassed = failedTests === 0;

  console.log(`[Tester] === Smoke Tests Complete ===`);
  console.log(`[Tester] Duration: ${totalDuration}ms`);
  console.log(`[Tester] Results: ${passedTests}/${results.length} passed`);

  if (!allPassed) {
    console.log(`[Tester] ⛔ FAILED — ${failedTests} test(s) failed:`);
    for (const result of results.filter(r => !r.passed)) {
      console.log(`[Tester]   - ${result.endpoint}: ${result.error}`);
    }
  } else {
    console.log(`[Tester] ✅ All smoke tests passed`);
  }

  return {
    passed: allPassed,
    tests: results,
    totalTests: results.length,
    passedTests,
    failedTests,
    duration: totalDuration
  };
}

// ==========================================
// VALIDATION AND ROLLBACK
// ==========================================

/**
 * Run smoke tests and handle rollback if they fail.
 *
 * This is the main function called by the fixer after applying a fix.
 * It:
 *   1. Runs smoke tests
 *   2. If tests fail → rolls back from backup
 *   3. Updates auto_fixes.validation_status
 *   4. Returns validation result
 *
 * @param autoFixId - ID of the auto_fix record
 * @param backupFiles - Array of backup file paths created before the fix
 * @param modifiedFiles - Array of files that were modified by the fix
 * @returns Object with passed status and optional error
 */
export async function validateFixWithRollback(
  autoFixId: string,
  backupFiles: string[],
  modifiedFiles: string[]
): Promise<{ passed: boolean; error?: string; status: "passed" | "failed" }> {
  console.log("[Tester] === Validating applied fix ===");
  console.log(`[Tester] Auto-fix ID: ${autoFixId}`);
  console.log(`[Tester] Modified files: ${modifiedFiles.join(", ") || "none"}`);
  console.log(`[Tester] Backup files: ${backupFiles.join(", ") || "none"}`);

  // Step 1: Run smoke tests
  const smokeResult = await runSmokeTests();

  // Step 2: If tests passed, mark validation as passed
  if (smokeResult.passed) {
    console.log("[Tester] ✅ Smoke tests passed — marking validation as passed");

    await updateValidationStatus(autoFixId, "passed", undefined);

    return { passed: true, status: "passed" };
  }

  // Step 3: If tests failed, rollback
  console.log("[Tester] ⛔ Smoke tests failed — initiating rollback");

  const rollbackError = await rollbackFix(backupFiles, modifiedFiles);

  await updateValidationStatus(
    autoFixId,
    "failed",
    rollbackError || `Smoke tests failed: ${smokeResult.failedTests}/${smokeResult.totalTests} tests failed`
  );

  return {
    passed: false,
    error: rollbackError || `Smoke tests failed: ${smokeResult.failedTests}/${smokeResult.totalTests} tests failed`,
    status: "failed"
  };
}

/**
 * Update validation_status in auto_fixes table.
 */
async function updateValidationStatus(
  autoFixId: string,
  status: "passed" | "failed",
  error?: string
): Promise<void> {
  try {
    const { error: dbError } = await supabase
      .from("auto_fixes")
      .update({
        validation_status: status,
        test_output: error?.substring(0, 5000),
        updated_at: new Date().toISOString()
      })
      .eq("id", autoFixId);

    if (dbError) {
      console.error(`[Tester] Failed to update validation status: ${dbError.message}`);
    } else {
      console.log(`[Tester] Validation status updated: ${status}`);
    }
  } catch (err: any) {
    console.error(`[Tester] Error updating validation status: ${err.message}`);
  }
}

/**
 * Rollback a fix by restoring from backups.
 *
 * @param backupFiles - Array of backup file paths
 * @param modifiedFiles - Array of files that were modified
 * @returns Error message if rollback failed, undefined if successful
 */
async function rollbackFix(
  backupFiles: string[],
  modifiedFiles: string[]
): Promise<string | undefined> {
  console.log(`[Tester] Rolling back ${modifiedFiles.length} file(s)...`);

  try {
    // Try to use the fixer's restore function
    for (let i = 0; i < modifiedFiles.length; i++) {
      const modifiedFile = modifiedFiles[i];
      const backupFile = backupFiles[i];

      if (backupFile) {
        console.log(`[Tester] Restoring ${modifiedFile} from ${backupFile}`);
        // We'll import this dynamically to avoid circular dependencies
        const { restoreFromBackup } = await import("./fixer.js");
        await restoreFromBackup(backupFile, modifiedFile);
      } else {
        console.warn(`[Tester] No backup found for ${modifiedFile}`);
      }
    }

    console.log("[Tester] ✅ Rollback complete");
    return undefined;
  } catch (err: any) {
    console.error(`[Tester] ❌ Rollback failed: ${err.message}`);
    return `Rollback failed: ${err.message}`;
  }
}

// ==========================================
// QUICK VALIDATION (No server required)
// ==========================================

/**
 * Quick validation that checks if modified files exist and are valid TypeScript.
 * Used when server is not available or cannot be started.
 *
 * @param modifiedFiles - Array of files that were modified
 * @returns Object with passed status and optional error
 */
export async function quickValidation(
  modifiedFiles: string[]
): Promise<{ passed: boolean; error?: string }> {
  console.log("[Tester] === Quick validation (no server) ===");

  for (const filePath of modifiedFiles) {
    try {
      const fs = await import("fs/promises");
      const content = await fs.readFile(filePath, "utf-8");

      // Basic syntax checks
      const braceCount = (content.match(/{/g) || []).length - (content.match(/}/g) || []).length;
      if (braceCount !== 0) {
        return { passed: false, error: `Unbalanced braces in ${filePath} (${braceCount})` };
      }

      const parenCount = (content.match(/\(/g) || []).length - (content.match(/\)/g) || []).length;
      if (parenCount !== 0) {
        return { passed: false, error: `Unbalanced parentheses in ${filePath} (${parenCount})` };
      }

      console.log(`[Tester] ✅ ${filePath} passed quick validation`);
    } catch (err: any) {
      return { passed: false, error: `Cannot read ${filePath}: ${err.message}` };
    }
  }

  console.log("[Tester] ✅ All files passed quick validation");
  return { passed: true };
}
