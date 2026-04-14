/**
 * Autonomous System v2 — Fase 5: Auto-Fixer (Auto-correção Controlada)
 *
 * Applies automated fixes to source files based on diagnosis and risk assessment.
 * Only executes for LOW risk fixes. Blocks critical file modifications.
 *
 * Safety Chain:
 *   1. Verify risk level is 'low'
 *   2. Verify target files are NOT in critical list
 *   3. Create backup of original file
 *   4. Apply the fix (regex-based transformation)
 *   5. Run npm run build + npm test
 *   6. If validation fails → revert to backup
 *   7. Persist results to auto_fixes and risk_decisions
 *
 * Fix Application Strategy:
 *   The fixer uses the diagnosis 'fix' field to identify the type of change needed.
 *   It supports these fix patterns:
 *   - Comment/uncomment code
 *   - Add missing import
 *   - Fix typo/string replacement
 *   - Add error handling wrapper
 *   - Fix syntax error (missing semicolon, brace, etc.)
 */

import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { supabase } from "../lib/supabase.js";
import type { DiagnosisResult } from "./diagnostician.js";
import type { RiskAnalysisResult, RiskLevel } from "./riskAnalyzer.js";

const execAsync = promisify(exec);

// ==========================================
// CONFIGURATION
// ==========================================

// Files that should NEVER be auto-modified
const CRITICAL_FILES = [
  "stripe-webhook.ts",
  "auth.ts",
  "billing.ts",
  "server.ts",
  "src/middleware/auth.ts",
  "src/lib/supabase.ts",
  ".env",
  ".env.example"
];

// Directories that are off-limits for auto-fix
const CRITICAL_DIRS = [
  "src/middleware",
  "src/lib",
  "node_modules",
  ".git",
  "dist"
];

// Backup directory
const BACKUP_DIR = ".autonomous-backup";

// Validation timeout (30 seconds)
const VALIDATION_TIMEOUT = 30000;

// ==========================================
// TYPES
// ==========================================

export interface FixResult {
  success: boolean;
  action: "applied" | "blocked" | "reverted" | "skipped";
  reason: string;
  backupPath?: string;
  modifiedFiles: string[];
  buildOutput?: string;
  testOutput?: string;
  error?: string;
}

export interface FixPattern {
  name: string;
  apply: (content: string, fix: string) => string | null;
}

// ==========================================
// SAFETY CHECKS
// ==========================================

/**
 * Check if a file path is critical and should not be modified.
 */
function isCriticalFile(filePath: string): boolean {
  const normalized = filePath.toLowerCase().replace(/\\/g, "/");

  // Check direct file match
  if (CRITICAL_FILES.some(cf => normalized.includes(cf.toLowerCase()))) {
    return true;
  }

  // Check directory match
  if (CRITICAL_DIRS.some(cd => normalized.startsWith(cd.toLowerCase()))) {
    return true;
  }

  return false;
}

/**
 * Verify all affected files are safe to modify.
 */
function validateFilesSafe(affectedFiles: string[]): { safe: boolean; blockedFiles: string[] } {
  const blockedFiles: string[] = [];

  for (const file of affectedFiles) {
    if (isCriticalFile(file)) {
      blockedFiles.push(file);
    }
  }

  return {
    safe: blockedFiles.length === 0,
    blockedFiles
  };
}

// ==========================================
// BACKUP SYSTEM
// ==========================================

/**
 * Create a timestamped backup of a file.
 */
async function createBackup(filePath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = path.basename(filePath);
  const fileDir = path.dirname(filePath).replace(/[\\/]/g, "__");
  const backupFileName = `${fileDir}__${fileName}.${timestamp}.bak`;
  const backupPath = path.join(BACKUP_DIR, backupFileName);

  // Ensure backup directory exists
  await fs.mkdir(BACKUP_DIR, { recursive: true });

  // Copy file to backup location
  await fs.copyFile(filePath, backupPath);

  console.log(`[Fixer] Backup created: ${backupPath}`);
  return backupPath;
}

/**
 * Restore a file from backup.
 */
async function restoreFromBackup(backupPath: string, originalPath: string): Promise<void> {
  await fs.copyFile(backupPath, originalPath);
  console.log(`[Fixer] File restored from: ${backupPath}`);
}

/**
 * Clean up backup file.
 */
async function cleanupBackup(backupPath: string): Promise<void> {
  try {
    await fs.unlink(backupPath);
  } catch {
    // Ignore cleanup failures
  }
}

// ==========================================
// FIX PATTERNS
// ==========================================

/**
 * Pattern: Fix syntax errors (missing semicolons, braces, etc.)
 * Looks for common patterns in the fix description and applies them.
 */
const fixPatterns: FixPattern[] = [
  {
    name: "add_missing_semicolon",
    apply: (content: string, fix: string): string | null => {
      if (!fix.toLowerCase().includes("semicolon") && !fix.toLowerCase().includes(";")) return null;

      // Find lines that look like they're missing semicolons
      const lines = content.split("\n");
      const fixedLines = lines.map(line => {
        const trimmed = line.trim();
        // Skip empty lines, comments, imports, function declarations, control flow
        if (
          trimmed === "" ||
          trimmed.startsWith("//") ||
          trimmed.startsWith("/*") ||
          trimmed.startsWith("import ") ||
          trimmed.startsWith("export ") ||
          trimmed.startsWith("function ") ||
          trimmed.startsWith("class ") ||
          trimmed.startsWith("interface ") ||
          trimmed.startsWith("type ") ||
          trimmed.startsWith("if ") ||
          trimmed.startsWith("for ") ||
          trimmed.startsWith("while ") ||
          trimmed.startsWith("switch ") ||
          trimmed.endsWith("{") ||
          trimmed.endsWith("}") ||
          trimmed.endsWith(";") ||
          trimmed.endsWith(",") ||
          trimmed.endsWith("(") ||
          trimmed.endsWith(")")
        ) {
          return line;
        }
        // Add semicolon if line looks like a statement
        if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*[=(]/.test(trimmed) && !trimmed.endsWith(";")) {
          return line + ";";
        }
        return line;
      });

      return fixedLines.join("\n");
    }
  },
  {
    name: "add_missing_import",
    apply: (content: string, fix: string): string | null => {
      // Extract import name from fix description
      const importMatch = fix.match(/import\s+['"]?(\w+)/i) || fix.match(/add\s+(?:missing\s+)?import\s+(\w+)/i);
      if (!importMatch) return null;

      const importName = importMatch[1];
      if (content.includes(importName)) return null; // Already exists

      // Add import at the top
      return `import { ${importName} } from './${importName.toLowerCase()}';\n${content}`;
    }
  },
  {
    name: "fix_typo",
    apply: (content: string, fix: string): string | null => {
      // Extract typo fix: "change X to Y" or "fix typo: X -> Y"
      const changeMatch = fix.match(/change\s+(\w+)\s+to\s+(\w+)/i) ||
        fix.match(/(?:typo|fix)[\s:]*(\w+)\s*->\s*(\w+)/i) ||
        fix.match(/replace\s+(\w+)\s+with\s+(\w+)/i);

      if (!changeMatch) return null;

      const from = changeMatch[1];
      const to = changeMatch[2];

      // Don't replace if already correct
      if (!content.includes(from)) return null;

      return content.split(from).join(to);
    }
  },
  {
    name: "add_error_handling",
    apply: (content: string, fix: string): string | null => {
      if (!fix.toLowerCase().includes("try") && !fix.toLowerCase().includes("error")) return null;

      // Find function calls without try-catch
      if (content.includes("try {")) return null; // Already has try-catch

      // Wrap the main content in try-catch (simplified)
      const lines = content.split("\n");
      const indent = "  ";
      const wrappedLines = [
        "try {",
        ...lines.map(l => l ? `${indent}${l}` : ""),
        "} catch (err: any) {",
        `${indent}console.error("Auto-fixed error:", err.message);`,
        "}"
      ];

      return wrappedLines.join("\n");
    }
  },
  {
    name: "fix_syntax_error",
    apply: (content: string, fix: string): string | null => {
      // General syntax fix: remove trailing commas before closing brace
      if (fix.toLowerCase().includes("trailing comma") || fix.toLowerCase().includes("syntax")) {
        const fixed = content.replace(/,\s*([}\]])/g, "$1");
        if (fixed !== content) return fixed;
      }

      // Fix: add missing closing brace
      if (fix.toLowerCase().includes("closing brace") || fix.toLowerCase().includes("missing }")) {
        const openCount = (content.match(/{/g) || []).length;
        const closeCount = (content.match(/}/g) || []).length;
        if (openCount > closeCount) {
          return content + "\n" + "}".repeat(openCount - closeCount);
        }
      }

      // Fix: add missing closing parenthesis
      if (fix.toLowerCase().includes("closing paren") || fix.toLowerCase().includes("missing )")) {
        const openCount = (content.match(/\(/g) || []).length;
        const closeCount = (content.match(/\)/g) || []).length;
        if (openCount > closeCount) {
          return content + ")".repeat(openCount - closeCount);
        }
      }

      return null;
    }
  }
];

// ==========================================
// FIX APPLICATION
// ==========================================

/**
 * Apply a fix to a file using pattern matching.
 * Returns the new content if a fix was applied, null otherwise.
 */
function applyFixToContent(content: string, fix: string, fileName: string): { newContent: string; patternUsed: string } | null {
  for (const pattern of fixPatterns) {
    const result = pattern.apply(content, fix);
    if (result !== null && result !== content) {
      return { newContent: result, patternUsed: pattern.name };
    }
  }

  // Fallback: try to interpret the fix as a direct replacement
  // Look for "change X to Y" or "replace X with Y" patterns
  const replacements = [
    fix.match(/change\s+['"]([^'"]+)['"]\s+to\s+['"]([^'"]+)['"]/i),
    fix.match(/replace\s+['"]([^'"]+)['"]\s+with\s+['"]([^'"]+)['"]/i),
    fix.match(/['"]([^'"]+)['"]\s*->\s*['"]([^'"]+)['"]/)
  ];

  for (const match of replacements) {
    if (match && match[1] && match[2]) {
      const from = match[1];
      const to = match[2];
      if (content.includes(from)) {
        return { newContent: content.split(from).join(to), patternUsed: "direct_replacement" };
      }
    }
  }

  return null;
}

/**
 * Apply fix to multiple files.
 */
async function applyFixToFiles(
  fix: string,
  affectedFiles: string[]
): Promise<{ success: boolean; modifiedFiles: string[]; details: { file: string; pattern: string }[]; error?: string }> {
  const modifiedFiles: string[] = [];
  const details: { file: string; pattern: string }[] = [];

  for (const filePath of affectedFiles) {
    // Resolve relative to project root
    const fullPath = path.resolve(process.cwd(), filePath);

    try {
      // Check file exists
      if (!fsSync.existsSync(fullPath)) {
        console.warn(`[Fixer] File not found, skipping: ${fullPath}`);
        continue;
      }

      // Read content
      const content = await fs.readFile(fullPath, "utf-8");

      // Apply fix
      const result = applyFixToContent(content, fix, filePath);

      if (result) {
        // Write fixed content
        await fs.writeFile(fullPath, result.newContent, "utf-8");
        modifiedFiles.push(filePath);
        details.push({ file: filePath, pattern: result.patternUsed });
        console.log(`[Fixer] Applied fix to ${filePath} using pattern: ${result.patternUsed}`);
      } else {
        console.warn(`[Fixer] No applicable fix pattern for ${filePath}`);
      }
    } catch (err: any) {
      return {
        success: false,
        modifiedFiles,
        details,
        error: `Failed to apply fix to ${filePath}: ${err.message}`
      };
    }
  }

  return { success: true, modifiedFiles, details };
}

// ==========================================
// VALIDATION
// ==========================================

/**
 * Run build and test validation.
 */
async function validateFix(): Promise<{ buildOk: boolean; testsOk: boolean; buildOutput: string; testOutput: string }> {
  let buildOk = false;
  let testsOk = false;
  let buildOutput = "";
  let testOutput = "";

  // Run build
  try {
    console.log("[Fixer] Running npm run build...");
    const buildResult = await execAsync("npm run build", {
      timeout: VALIDATION_TIMEOUT,
      cwd: process.cwd()
    });
    buildOutput = buildResult.stdout + buildResult.stderr;
    buildOk = true;
    console.log("[Fixer] Build passed ✓");
  } catch (err: any) {
    buildOutput = err.stdout + err.stderr + err.message;
    console.error(`[Fixer] Build failed ✗: ${err.message}`);
  }

  // Only run tests if build passed
  if (buildOk) {
    try {
      console.log("[Fixer] Running npm test...");
      const testResult = await execAsync("npm test", {
        timeout: VALIDATION_TIMEOUT,
        cwd: process.cwd()
      });
      testOutput = testResult.stdout + testResult.stderr;
      testsOk = true;
      console.log("[Fixer] Tests passed ✓");
    } catch (err: any) {
      testOutput = err.stdout + err.stderr + err.message;
      console.error(`[Fixer] Tests failed ✗: ${err.message}`);
    }
  }

  return { buildOk, testsOk, buildOutput, testOutput };
}

// ==========================================
// PERSISTENCE
// ==========================================

/**
 * Update auto_fix record with execution results.
 */
async function updateAutoFixRecord(
  autoFixId: string,
  result: FixResult,
  patternUsed?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from("auto_fixes")
      .update({
        status: result.action === "applied" ? "auto_applied" :
          result.action === "reverted" ? "rejected" :
            result.action === "blocked" ? "rejected" : "pending_review",
        applied_by: "autonomous-system-v2",
        applied_at: new Date().toISOString(),
        backup_path: result.backupPath,
        fix_pattern: patternUsed,
        validation_status: result.action === "applied" ? "passed" :
          result.action === "reverted" ? "failed" : "skipped",
        build_output: result.buildOutput?.substring(0, 2000),
        test_output: result.testOutput?.substring(0, 2000),
        review_notes: `${result.action}: ${result.reason}\n` +
          (result.buildOutput ? `Build output: ${result.buildOutput.substring(0, 500)}\n` : "") +
          (result.testOutput ? `Test output: ${result.testOutput.substring(0, 500)}` : "")
      })
      .eq("id", autoFixId);

    if (error) {
      console.error(`[Fixer] Failed to update auto_fix record: ${error.message}`);
    }
  } catch (err: any) {
    console.error(`[Fixer] Error updating auto_fix record: ${err.message}`);
  }
}

/**
 * Update risk_decisions record with execution results.
 */
async function updateRiskRecord(
  autoFixId: string,
  result: FixResult
): Promise<void> {
  try {
    const { error } = await supabase
      .from("risk_decisions")
      .update({
        executed: true,
        executed_at: new Date().toISOString(),
        execution_result: {
          action: result.action,
          reason: result.reason,
          success: result.success,
          modifiedFiles: result.modifiedFiles,
          backupPath: result.backupPath,
          error: result.error
        }
      })
      .eq("auto_fix_id", autoFixId);

    if (error) {
      console.error(`[Fixer] Failed to update risk_decisions record: ${error.message}`);
    }
  } catch (err: any) {
    console.error(`[Fixer] Error updating risk_decisions record: ${err.message}`);
  }
}

// ==========================================
// MAIN FIXER FUNCTION
// ==========================================

/**
 * Apply an automated fix based on diagnosis and risk assessment.
 *
 * Safety Chain:
 *   1. Only applies if risk_level is 'low'
 *   2. Blocks modifications to critical files
 *   3. Creates backup before any change
 *   4. Validates with build + tests
 *   5. Reverts on validation failure
 *
 * @param diagnosis - The AI diagnosis with suggested fix
 * @param riskAssessment - The risk analysis result
 * @param autoFixId - The auto_fixes record ID
 * @returns FixResult with action taken and details
 */
export async function applyFix(
  diagnosis: DiagnosisResult,
  riskAssessment: RiskAnalysisResult,
  autoFixId: string
): Promise<FixResult> {
  console.log("[Fixer] === Starting auto-fix application ===");
  console.log(`[Fixer] Auto-fix ID: ${autoFixId}`);
  console.log(`[Fixer] Risk level: ${riskAssessment.risk_level}`);
  console.log(`[Fixer] Fix: ${diagnosis.fix.substring(0, 100)}...`);

  // === STEP 1: Verify risk level ===
  if (riskAssessment.risk_level !== "low") {
    console.log(`[Fixer] Blocked: risk level is '${riskAssessment.risk_level}', requires 'low'`);
    const result: FixResult = {
      success: false,
      action: "blocked",
      reason: `Auto-fix blocked: risk level '${riskAssessment.risk_level}' requires 'low'. Manual review required.`,
      modifiedFiles: []
    };

    await updateAutoFixRecord(autoFixId, result);
    await updateRiskRecord(autoFixId, result);
    return result;
  }

  // === STEP 2: Verify files are safe ===
  const affectedFiles = diagnosis.affected_files || [];

  if (affectedFiles.length === 0) {
    const result: FixResult = {
      success: false,
      action: "skipped",
      reason: "No affected files specified in diagnosis",
      modifiedFiles: []
    };

    await updateAutoFixRecord(autoFixId, result);
    await updateRiskRecord(autoFixId, result);
    return result;
  }

  const fileCheck = validateFilesSafe(affectedFiles);

  if (!fileCheck.safe) {
    console.log(`[Fixer] Blocked: critical files detected: ${fileCheck.blockedFiles.join(", ")}`);
    const result: FixResult = {
      success: false,
      action: "blocked",
      reason: `Auto-fix blocked: critical files cannot be auto-modified: ${fileCheck.blockedFiles.join(", ")}`,
      modifiedFiles: []
    };

    await updateAutoFixRecord(autoFixId, result);
    await updateRiskRecord(autoFixId, result);
    return result;
  }

  // === STEP 3: Create backups ===
  const backups: { file: string; backupPath: string }[] = [];

  for (const filePath of affectedFiles) {
    const fullPath = path.resolve(process.cwd(), filePath);
    try {
      if (fsSync.existsSync(fullPath)) {
        const backupPath = await createBackup(fullPath);
        backups.push({ file: filePath, backupPath });
      }
    } catch (err: any) {
      console.error(`[Fixer] Failed to create backup for ${filePath}: ${err.message}`);
    }
  }

  // === STEP 4: Apply fix ===
  const applyResult = await applyFixToFiles(diagnosis.fix, affectedFiles);

  if (!applyResult.success) {
    console.error(`[Fixer] Fix application failed: ${applyResult.error}`);

    // Revert any partial changes
    for (const backup of backups) {
      try {
        await restoreFromBackup(backup.backupPath, path.resolve(process.cwd(), backup.file));
      } catch { /* ignore revert failures */ }
    }

    const result: FixResult = {
      success: false,
      action: "reverted",
      reason: `Fix application error: ${applyResult.error}`,
      modifiedFiles: [],
      backupPath: backups[0]?.backupPath
    };

    await updateAutoFixRecord(autoFixId, result);
    await updateRiskRecord(autoFixId, result);
    return result;
  }

  if (applyResult.modifiedFiles.length === 0) {
    // No fix was applicable - clean up backups
    for (const backup of backups) {
      await cleanupBackup(backup.backupPath);
    }

    const result: FixResult = {
      success: false,
      action: "skipped",
      reason: "Fix description did not match any applicable pattern",
      modifiedFiles: []
    };

    await updateAutoFixRecord(autoFixId, result);
    await updateRiskRecord(autoFixId, result);
    return result;
  }

  // Extract pattern used from details
  const patternUsed = applyResult.details[0]?.pattern;

  // === STEP 5: Validate ===
  console.log("[Fixer] Running validation (build + tests)...");
  const validation = await validateFix();

  if (validation.buildOk && validation.testsOk) {
    // === SUCCESS: Fix applied and validated ===
    console.log("[Fixer] === Auto-fix SUCCESS ===");

    // Clean up backups
    for (const backup of backups) {
      await cleanupBackup(backup.backupPath);
    }

    const result: FixResult = {
      success: true,
      action: "applied",
      reason: "Fix applied and validated successfully",
      modifiedFiles: applyResult.modifiedFiles,
      buildOutput: validation.buildOutput,
      testOutput: validation.testOutput
    };

    await updateAutoFixRecord(autoFixId, result, patternUsed);
    await updateRiskRecord(autoFixId, result);
    return result;
  }

  // === FAILURE: Revert ===
  console.log("[Fixer] === Validation FAILED — Reverting ===");

  for (const backup of backups) {
    try {
      await restoreFromBackup(backup.backupPath, path.resolve(process.cwd(), backup.file));
    } catch (err: any) {
      console.error(`[Fixer] Revert failed for ${backup.file}: ${err.message}`);
    }
  }

  const result: FixResult = {
    success: false,
    action: "reverted",
    reason: `Validation failed: build=${validation.buildOk ? "OK" : "FAIL"}, tests=${validation.testsOk ? "OK" : "FAIL"}`,
    modifiedFiles: applyResult.modifiedFiles,
    buildOutput: validation.buildOutput,
    testOutput: validation.testOutput,
    backupPath: backups[0]?.backupPath
  };

  await updateAutoFixRecord(autoFixId, result);
  await updateRiskRecord(autoFixId, result);
  return result;
}

// ==========================================
// UTILITY: Simulate a syntax error for testing
// ==========================================

/**
 * Introduces a deliberate syntax error in a test file.
 * For testing the auto-fix flow end-to-end.
 */
export async function simulateSyntaxError(filePath: string): Promise<{ original: string; backupPath: string }> {
  const fullPath = path.resolve(process.cwd(), filePath);

  if (!fsSync.existsSync(fullPath)) {
    throw new Error(`Test file not found: ${fullPath}`);
  }

  const original = await fs.readFile(fullPath, "utf-8");
  const backupPath = await createBackup(fullPath);

  // Introduce a missing semicolon
  const lines = original.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (
      trimmed.length > 0 &&
      !trimmed.endsWith(";") &&
      !trimmed.endsWith("{") &&
      !trimmed.endsWith("}") &&
      !trimmed.endsWith(",") &&
      !trimmed.startsWith("//") &&
      !trimmed.startsWith("import") &&
      !trimmed.startsWith("export") &&
      trimmed.includes("=") &&
      !trimmed.includes("function") &&
      !trimmed.includes("if") &&
      !trimmed.includes("for")
    ) {
      lines[i] = lines[i].replace(/;?$/, ""); // Remove semicolon if present
      break;
    }
  }

  await fs.writeFile(fullPath, lines.join("\n"), "utf-8");
  console.log(`[Fixer] Simulated syntax error in ${filePath}`);

  return { original, backupPath };
}
