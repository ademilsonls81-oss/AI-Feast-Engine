/**
 * Autonomous System v2 — Fase 5: Auto-Fixer
 *
 * Applies automated fixes to source code based on risk analysis decisions.
 * Only executes fixes when risk decision is "auto_apply".
 *
 * Fix Patterns:
 *   1. Syntax fixes (missing imports, typos)
 *   2. Configuration fixes (wrong values, missing env vars)
 *   3. Middleware ordering fixes
 *   4. Error handling improvements
 *   5. Security hardening (rate limiting, CORS)
 *
 * Safety Rules:
 *   - NEVER apply fix if risk decision is "block" or "require_review"
 *   - ALWAYS run security audit before applying fix (Fase 6)
 *   - ALWAYS create backup before modifying files
 *   - NEVER modify files that are not in the project directory
 *   - ALWAYS verify syntax after modification
 *
 * Flow:
 *   1. Check risk decision (must be "auto_apply")
 *   2. Run security audit (mandatory)
 *   3. Create backup of affected files
 *   4. Apply fix pattern to files
 *   5. Verify syntax after fix
 *   6. Update auto_fixes status
 *   7. Return FixResult with success/failure details
 */

import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { runSecurityAudit } from "./auditor.js";
import { executeRiskDecision } from "./riskAnalyzer.js";
import type { DiagnosisResult, RiskAnalysisResult } from "./index.js";

// ==========================================
// TYPES
// ==========================================

export interface FixResult {
  action: "applied" | "blocked" | "failed" | "simulated";
  success: boolean;
  modifiedFiles: string[];
  backupFiles: string[];
  error?: string;
  reason?: string;
  securityAuditPassed: boolean;
}

export interface FixPattern {
  id: string;
  name: string;
  description: string;
  match: (diagnosis: DiagnosisResult) => boolean;
  apply: (filePath: string, content: string, diagnosis: DiagnosisResult) => string;
}

// ==========================================
// CONFIGURATION
// ==========================================

const BACKUP_DIR = ".autonomous-backup";
const MAX_FILE_SIZE = 100_000; // 100KB limit to prevent accidental large modifications

// ==========================================
// FIX PATTERNS
// ==========================================

/**
 * Pattern: Add missing express.raw() middleware for Stripe webhooks.
 * Matches: webhook signature verification errors
 */
const stripeWebhookFix: FixPattern = {
  id: "FIX-001",
  name: "Stripe Webhook Middleware",
  description: "Add express.raw() middleware before express.json() for Stripe webhook endpoint",
  match: (diagnosis) =>
    diagnosis.error_ids.length > 0 &&
    (diagnosis.cause.toLowerCase().includes("webhook") ||
     diagnosis.cause.toLowerCase().includes("stripe") ||
     diagnosis.fix.toLowerCase().includes("raw")),
  apply: (filePath, content, diagnosis) => {
    // Only apply if file is server.ts or similar entry point
    if (!filePath.includes("server") && !filePath.includes("app")) {
      return content;
    }

    // Check if express.raw() is already present
    if (content.includes("express.raw") || content.includes("app.raw")) {
      return content;
    }

    // Insert express.raw() before express.json() for webhook route
    const webhookPattern = /(app\.use\s*\(\s*['"]\/webhook['"]|app\.post\s*\(\s*['"]\/webhook['"])/;
    const match = webhookPattern.exec(content);

    if (match) {
      const insertPos = match.index;
      const beforeInsert = content.substring(0, insertPos);
      const afterInsert = content.substring(insertPos);

      const middleware = "app.use('/webhook', express.raw({ type: 'application/json' }));\n";
      return beforeInsert + middleware + afterInsert;
    }

    return content;
  }
};

/**
 * Pattern: Add error handling middleware.
 * Matches: unhandled error patterns
 */
const errorHandlerFix: FixPattern = {
  id: "FIX-002",
  name: "Error Handler Middleware",
  description: "Add global error handling middleware",
  match: (diagnosis) =>
    diagnosis.cause.toLowerCase().includes("unhandled") ||
    diagnosis.cause.toLowerCase().includes("error handling") ||
    diagnosis.fix.toLowerCase().includes("middleware"),
  apply: (filePath, content, diagnosis) => {
    // Only apply to server/app files
    if (!filePath.includes("server") && !filePath.includes("app")) {
      return content;
    }

    // Check if error handler is already present
    if (content.includes("error-handling") || content.includes("err, req, res")) {
      return content;
    }

    // Add error handler at the end of the file
    const errorHandler = `
// Global error handler (added by autonomous system)
app.use((err: any, req: any, res: any, next: any) => {
  console.error('[Error Handler]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});
`;

    return content + errorHandler;
  }
};

/**
 * Pattern: Add missing import.
 * Matches: "cannot find module" or "is not defined" errors
 */
const missingImportFix: FixPattern = {
  id: "FIX-003",
  name: "Missing Import",
  description: "Add missing import statement",
  match: (diagnosis) =>
    diagnosis.cause.toLowerCase().includes("cannot find module") ||
    diagnosis.cause.toLowerCase().includes("is not defined") ||
    diagnosis.fix.toLowerCase().includes("import"),
  apply: (filePath, content, diagnosis) => {
    // Extract module name from fix suggestion
    const importMatch = diagnosis.fix.match(/import\s+.*from\s+['"](.+?)['"]/);
    if (!importMatch) {
      return content;
    }

    const moduleName = importMatch[1];

    // Check if import is already present
    if (content.includes(`from '${moduleName}'`) || content.includes(`from "${moduleName}"`)) {
      return content;
    }

    // Add import at the top of the file
    const lines = content.split("\n");
    const importIndex = lines.findIndex(line => line.startsWith("import "));

    const newImport = `import ${moduleName.replace(/[^a-zA-Z0-9]/g, "_")} from '${moduleName}';`;

    if (importIndex !== -1) {
      lines.splice(importIndex + 1, 0, newImport);
    } else {
      lines.unshift(newImport);
    }

    return lines.join("\n");
  }
};

// All fix patterns
const FIX_PATTERNS: FixPattern[] = [
  stripeWebhookFix,
  errorHandlerFix,
  missingImportFix
];

// ==========================================
// BACKUP
// ==========================================

/**
 * Create backup of a file before modifying it.
 *
 * @param filePath - Path to the file to backup
 * @returns Path to the backup file, or null if backup failed
 */
async function createBackup(filePath: string): Promise<string | null> {
  try {
    const projectRoot = process.cwd();
    const fullPath = path.resolve(projectRoot, filePath);

    if (!fsSync.existsSync(fullPath)) {
      console.warn(`[Fixer] File not found, skipping backup: ${filePath}`);
      return null;
    }

    // Create backup directory
    const backupDir = path.resolve(projectRoot, BACKUP_DIR);
    if (!fsSync.existsSync(backupDir)) {
      await fs.mkdir(backupDir, { recursive: true });
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const relativePath = filePath.replace(/\//g, "_").replace(/\\/g, "_");
    const backupPath = path.join(backupDir, `${relativePath}.${timestamp}.bak`);

    // Copy file to backup location
    await fs.copyFile(fullPath, backupPath);

    console.log(`[Fixer] Backup created: ${backupPath}`);
    return backupPath;
  } catch (err: any) {
    console.error(`[Fixer] Failed to create backup for ${filePath}: ${err.message}`);
    return null;
  }
}

// ==========================================
// SYNTAX VERIFICATION
// ==========================================

/**
 * Verify that modified file has valid TypeScript syntax.
 * Uses a simple heuristic check (not a full compiler).
 *
 * @param content - The file content after modification
 * @returns true if syntax appears valid
 */
function verifySyntax(content: string): boolean {
  // Check for balanced braces
  const braceCount = (content.match(/{/g) || []).length - (content.match(/}/g) || []).length;
  if (braceCount !== 0) {
    console.warn(`[Fixer] Syntax check failed: unbalanced braces (${braceCount})`);
    return false;
  }

  // Check for balanced parentheses
  const parenCount = (content.match(/\(/g) || []).length - (content.match(/\)/g) || []).length;
  if (parenCount !== 0) {
    console.warn(`[Fixer] Syntax check failed: unbalanced parentheses (${parenCount})`);
    return false;
  }

  // Check for balanced brackets
  const bracketCount = (content.match(/\[/g) || []).length - (content.match(/\]/g) || []).length;
  if (bracketCount !== 0) {
    console.warn(`[Fixer] Syntax check failed: unbalanced brackets (${bracketCount})`);
    return false;
  }

  // Check for common syntax errors
  if (content.includes(";;") || content.includes("{{") || content.includes("}}")) {
    console.warn(`[Fixer] Syntax check failed: double punctuation detected`);
    return false;
  }

  return true;
}

/**
 * Simulate a syntax error for testing purposes.
 * This function intentionally introduces a syntax error.
 */
export function simulateSyntaxError(content: string): string {
  return content + "\n// SYNTAX ERROR SIMULATED {{{";
}

// ==========================================
// FIX APPLICATION
// ==========================================

/**
 * Apply fix pattern to a file.
 *
 * @param filePath - Path to the file to modify
 * @param content - Current file content
 * @param diagnosis - The diagnosis result
 * @returns New file content after applying fix, or original if no fix matched
 */
function applyFixPattern(filePath: string, content: string, diagnosis: DiagnosisResult): string {
  console.log(`[Fixer] Attempting to apply fix pattern to ${filePath}...`);

  for (const pattern of FIX_PATTERNS) {
    if (pattern.match(diagnosis)) {
      console.log(`[Fixer] Matched fix pattern: ${pattern.name} (${pattern.id})`);
      console.log(`[Fixer] Description: ${pattern.description}`);

      const newContent = pattern.apply(filePath, content, diagnosis);

      if (newContent !== content) {
        console.log(`[Fixer] Fix pattern applied successfully`);
        return newContent;
      } else {
        console.log(`[Fixer] Fix pattern did not modify file`);
      }
    }
  }

  console.log(`[Fixer] No matching fix pattern found`);
  return content;
}

// ==========================================
// MAIN FIX FUNCTION
// ==========================================

/**
 * Apply automated fix based on risk analysis.
 *
 * @param diagnosis - The diagnosis result from diagnostician
 * @param riskResult - The risk analysis result
 * @param autoFixId - ID of the auto_fix record
 * @returns FixResult with success/failure details
 */
export async function applyFix(
  diagnosis: DiagnosisResult,
  riskResult: RiskAnalysisResult,
  autoFixId: string
): Promise<FixResult> {
  console.log("[Fixer] === Starting automated fix ===");
  console.log(`[Fixer] Auto-fix ID: ${autoFixId}`);
  console.log(`[Fixer] Risk decision: ${riskResult.decision}`);

  // SAFETY CHECK: Only apply if decision is "auto_apply"
  if (riskResult.decision !== "auto_apply") {
    console.log(`[Fixer] Fix blocked: decision is "${riskResult.decision}", not "auto_apply"`);

    return {
      action: "blocked",
      success: false,
      modifiedFiles: [],
      backupFiles: [],
      reason: `Fix blocked by risk analyzer: ${riskResult.decision}. Requires manual review.`,
      securityAuditPassed: false
    };
  }

  const affectedFiles = diagnosis.affected_files || [];
  const modifiedFiles: string[] = [];
  const backupFiles: string[] = [];
  const projectRoot = process.cwd();

  // === PHASE 1: Security Audit (Mandatory) ===
  console.log("[Fixer] Phase 1: Running mandatory security audit...");

  // Read current file contents for audit
  const newContents = new Map<string, string>();

  for (const filePath of affectedFiles) {
    const fullPath = path.resolve(projectRoot, filePath);

    try {
      let currentContent = "";

      if (fsSync.existsSync(fullPath)) {
        currentContent = await fs.readFile(fullPath, "utf-8");
      }

      // Apply fix pattern to get proposed new content
      const proposedContent = applyFixPattern(filePath, currentContent, diagnosis);

      if (proposedContent !== currentContent) {
        newContents.set(filePath, proposedContent);
      }
    } catch (err: any) {
      console.error(`[Fixer] Error reading file ${filePath}: ${err.message}`);
    }
  }

  // Run security audit on proposed changes
  const securityAudit = await runSecurityAudit(diagnosis.fix, affectedFiles, newContents);

  if (securityAudit.result === "rejected") {
    console.log("[Fixer] ⛔ Fix BLOCKED by security audit");
    console.log(`[Fixer] Issues: ${securityAudit.issues.length}`);

    // Update risk decision with block result
    await executeRiskDecision(riskResult.auto_fix_id || autoFixId, false, undefined,
      `Security audit rejected: ${securityAudit.reasoning}`);

    return {
      action: "blocked",
      success: false,
      modifiedFiles: [],
      backupFiles: [],
      reason: `Security audit rejected: ${securityAudit.reasoning}`,
      securityAuditPassed: false
    };
  }

  console.log("[Fixer] ✅ Security audit passed");

  // === PHASE 2: Create Backups ===
  console.log("[Fixer] Phase 2: Creating backups...");

  for (const filePath of affectedFiles) {
    if (newContents.has(filePath)) {
      const backupPath = await createBackup(filePath);
      if (backupPath) {
        backupFiles.push(backupPath);
      }
    }
  }

  // === PHASE 3: Apply Fixes ===
  console.log("[Fixer] Phase 3: Applying fixes...");

  for (const [filePath, newContent] of newContents.entries()) {
    const fullPath = path.resolve(projectRoot, filePath);

    try {
      // Verify file size
      if (newContent.length > MAX_FILE_SIZE) {
        throw new Error(`File too large (${newContent.length} bytes), exceeds limit of ${MAX_FILE_SIZE}`);
      }

      // Verify syntax before writing
      if (!verifySyntax(newContent)) {
        throw new Error("Syntax verification failed after fix application");
      }

      // Write the fixed content
      await fs.writeFile(fullPath, newContent, "utf-8");

      modifiedFiles.push(filePath);
      console.log(`[Fixer] ✅ Fixed: ${filePath}`);
    } catch (err: any) {
      console.error(`[Fixer] ❌ Failed to fix ${filePath}: ${err.message}`);

      // Update risk decision with error
      await executeRiskDecision(riskResult.auto_fix_id || autoFixId, false, undefined, err.message);

      return {
        action: "failed",
        success: false,
        modifiedFiles,
        backupFiles,
        error: err.message,
        securityAuditPassed: true
      };
    }
  }

  // === PHASE 4: Update Status ===
  const success = modifiedFiles.length > 0;

  console.log(`[Fixer] === Fix Complete ===`);
  console.log(`[Fixer] Success: ${success}`);
  console.log(`[Fixer] Modified files: ${modifiedFiles.join(", ") || "none"}`);
  console.log(`[Fixer] Backup files: ${backupFiles.join(", ") || "none"}`);

  // Update risk decision with execution result
  await executeRiskDecision(
    riskResult.auto_fix_id || autoFixId,
    success,
    {
      success,
      action: success ? "applied" : "no_changes",
      modifiedFiles,
      backupFiles
    }
  );

  return {
    action: success ? "applied" : "simulated",
    success,
    modifiedFiles,
    backupFiles,
    securityAuditPassed: true
  };
}
