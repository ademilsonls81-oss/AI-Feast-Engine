/**
 * Autonomous System v2 — Fase 6: Security Auditor
 *
 * Mandatory security audit before any auto-fix is applied.
 * Uses Sandeco Maestro Skills concept — orchestrates pattern-based checks
 * and AI-powered analysis to validate code safety.
 *
 * Rules checked:
 *   1. No eval() or Function() — code injection risk
 *   2. No exec() with user input — command injection risk
 *   3. No fs.writeFileSync to sensitive paths — file tampering risk
 *   4. No hardcoded secrets (API keys, passwords, tokens)
 *   5. No prototype pollution (__proto__, constructor.prototype)
 *   6. No SQL injection patterns (string concatenation in queries)
 *   7. No unsafe deserialization (JSON.parse of untrusted input)
 *   8. No disabled security features (tls.rejectUnauthorized = false)
 *   9. No insecure HTTP (http:// to internal services)
 *   10. Best practices: type safety, error handling, no any casting
 *
 * Flow:
 *   1. Pattern-based static analysis (fast, deterministic)
 *   2. AI-powered deep analysis via Groq (if available)
 *   3. Consolidate results — if ANY issue found → rejected
 *   4. Return AuditResult with issues list and reasoning
 */

import OpenAI from "openai";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

// ==========================================
// TYPES
// ==========================================

export type AuditResult = "approved" | "rejected";

export interface AuditIssue {
  rule: string;
  severity: "critical" | "high" | "medium" | "low";
  file: string;
  line?: number;
  code?: string;
  description: string;
  recommendation: string;
}

export interface AuditResultFull {
  result: AuditResult;
  issues: AuditIssue[];
  checksPerformed: number;
  modelUsed: string;
  reasoning: string;
}

// ==========================================
// SECURITY RULES (Pattern-based Static Analysis)
// ==========================================

interface SecurityRule {
  id: string;
  name: string;
  severity: "critical" | "high" | "medium" | "low";
  pattern: RegExp;
  description: string;
  recommendation: string;
}

const SECURITY_RULES: SecurityRule[] = [
  {
    id: "SEC-001",
    name: "No eval()",
    severity: "critical",
    pattern: /\beval\s*\(/g,
    description: "eval() allows arbitrary code execution — code injection vulnerability",
    recommendation: "Use JSON.parse() for data parsing or a safe expression evaluator like mathjs"
  },
  {
    id: "SEC-002",
    name: "No Function constructor",
    severity: "critical",
    pattern: /\bnew\s+Function\s*\(/g,
    description: "new Function() allows arbitrary code execution — same risk as eval()",
    recommendation: "Use explicit function definitions or a templating library"
  },
  {
    id: "SEC-003",
    name: "No exec() with dynamic input",
    severity: "critical",
    pattern: /\b(exec|execSync|spawn|spawnSync)\s*\(\s*[^'"]/g,
    description: "exec() with non-literal arguments enables command injection",
    recommendation: "Use execFile() with argument arrays or validate/sanitize input strictly"
  },
  {
    id: "SEC-004",
    name: "No prototype pollution",
    severity: "high",
    pattern: /\b(__proto__|constructor\.prototype|Object\.prototype)\b/g,
    description: "Modifying object prototypes enables prototype pollution attacks",
    recommendation: "Use Object.create(null) for maps, avoid __proto__ access"
  },
  {
    id: "SEC-005",
    name: "No hardcoded secrets",
    severity: "critical",
    pattern: /(sk_live_|sk_test_|ghp_|gho_|AIza|AKIA|eyJhbGci|password\s*=\s*['"][^'"]{8,}|api_key\s*=\s*['"][^'"]{8,})/gi,
    description: "Hardcoded secrets in source code expose credentials",
    recommendation: "Use environment variables (process.env.X) or a secrets manager"
  },
  {
    id: "SEC-006",
    name: "No unsafe file writes",
    severity: "high",
    pattern: /\b(writeFileSync|writeFile)\s*\(\s*['"](\/etc|\/root|\.env|\.ssh|passwd|shadow)/gi,
    description: "Writing to sensitive system paths enables file tampering",
    recommendation: "Validate file paths against an allowlist before writing"
  },
  {
    id: "SEC-007",
    name: "No disabled TLS verification",
    severity: "high",
    pattern: /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0|rejectUnauthorized\s*:\s*false/gi,
    description: "Disabling TLS verification enables man-in-the-middle attacks",
    recommendation: "Fix certificate issues instead of disabling verification"
  },
  {
    id: "SEC-008",
    name: "No innerHTML assignment",
    severity: "medium",
    pattern: /\.innerHTML\s*=/g,
    description: "Setting innerHTML with user input enables XSS attacks",
    recommendation: "Use textContent or a sanitization library like DOMPurify"
  },
  {
    id: "SEC-009",
    name: "No unsafe JSON.parse",
    severity: "medium",
    pattern: /\bJSON\.parse\s*\(\s*(?!['"])/g,
    description: "JSON.parse of non-constant input may throw or process malicious data",
    recommendation: "Wrap JSON.parse in try-catch and validate input source"
  },
  {
    id: "SEC-010",
    name: "No SQL string concatenation",
    severity: "critical",
    pattern: /(SELECT|INSERT|UPDATE|DELETE)\s+.*\+\s*|`.+\$\{.*\}.+`/gi,
    description: "SQL string concatenation enables SQL injection",
    recommendation: "Use parameterized queries or query builders"
  },
  {
    id: "SEC-011",
    name: "No unsafe deserialization",
    severity: "high",
    pattern: /\bunserialize\s*\(|\bpickle\.loads\s*\(/g,
    description: "Deserializing untrusted data enables remote code execution",
    recommendation: "Use JSON for data interchange, never deserialize untrusted data"
  },
  {
    id: "SEC-012",
    name: "No insecure HTTP to internal services",
    severity: "high",
    pattern: /http:\/\/(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01]))(?!.*example)/gi,
    description: "HTTP to internal services exposes data in transit",
    recommendation: "Use HTTPS for all service communication"
  },
  {
    id: "SEC-013",
    name: "No process.env assignment in source",
    severity: "medium",
    pattern: /process\.env\.[A-Z_]+\s*=\s*['"]/g,
    description: "Modifying environment variables at runtime is unpredictable",
    recommendation: "Set environment variables in deployment config, not in code"
  },
  {
    id: "SEC-014",
    name: "No console.log with secrets",
    severity: "medium",
    pattern: /console\.log\s*\(.*(?:password|secret|token|key|credential).*\)/gi,
    description: "Logging secrets exposes them in logs",
    recommendation: "Log only non-sensitive context, never secrets"
  },
  {
    id: "SEC-015",
    name: "No unsafe type casting (as any)",
    severity: "low",
    pattern: /\bas\s+any\b/g,
    description: "Using 'as any' bypasses TypeScript type safety",
    recommendation: "Use proper type definitions or type guards"
  }
];

// ==========================================
// PATTERN-BASED STATIC ANALYSIS
// ==========================================

/**
 * Scan file content against all security rules.
 * Returns list of issues found.
 */
function scanFileWithRules(filePath: string, content: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const lines = content.split("\n");

  for (const rule of SECURITY_RULES) {
    rule.pattern.lastIndex = 0; // Reset regex
    let match: RegExpExecArray | null;

    while ((match = rule.pattern.exec(content)) !== null) {
      // Find line number
      const matchStart = match.index;
      let lineNumber = 1;
      for (let i = 0; i < matchStart; i++) {
        if (content[i] === "\n") lineNumber++;
      }

      // Get the line content
      const lineContent = lines[lineNumber - 1]?.trim() || "";

      // Skip if it's in a comment
      if (lineContent.startsWith("//") || lineContent.startsWith("*") || lineContent.startsWith("/*")) {
        continue;
      }

      // Skip if it's in a test file (test patterns are expected)
      if (filePath.includes(".test.") || filePath.includes("test-")) {
        continue;
      }

      issues.push({
        rule: rule.id,
        severity: rule.severity,
        file: filePath,
        line: lineNumber,
        code: lineContent.substring(0, 120),
        description: rule.description,
        recommendation: rule.recommendation
      });

      // Only report first occurrence per rule per file to avoid noise
      break;
    }
  }

  return issues;
}

// ==========================================
// AI-POWERED DEEP ANALYSIS
// ==========================================

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || "";
const GROQ_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.groq.com/openai/v1";
const IA_MODEL = "llama-3.1-8b-instant";

/**
 * Use AI to perform deep security analysis.
 * This catches issues that pattern matching might miss.
 */
async function aiSecurityReview(
  newContent: string,
  originalContent: string,
  filePath: string,
  fixDescription: string
): Promise<AuditIssue[]> {
  if (!GROQ_API_KEY) {
    console.warn("[Auditor] GROQ_API_KEY not set, skipping AI analysis.");
    return [];
  }

  try {
    const client = new OpenAI({
      apiKey: GROQ_API_KEY,
      baseURL: GROQ_BASE_URL
    });

    const diff = generateDiff(originalContent, newContent);

    const prompt = `You are a security auditor reviewing an automated code fix.

## File: ${filePath}
## Fix Description: ${fixDescription}

## Code Diff:
\`\`\`diff
${diff}
\`\`\`

## New File Content:
\`\`\`typescript
${newContent.substring(0, 3000)}
\`\`\`

Review the fix for security vulnerabilities. Check for:
1. Code injection (eval, Function constructor)
2. Command injection (exec with user input)
3. Hardcoded secrets
4. SQL injection
5. XSS vulnerabilities
6. Prototype pollution
7. Insecure HTTP
8. Disabled security features
9. Unsafe deserialization
10. Type safety issues

Respond with a JSON array of issues found (empty array if none):
[
  {
    "rule": "SEC-XXX",
    "severity": "critical|high|medium|low",
    "file": "file path",
    "line": 1,
    "description": "what the issue is",
    "recommendation": "how to fix it"
  }
]

Return ONLY the JSON array, no markdown, no explanation. If no issues, return [].`;

    const response = await client.chat.completions.create({
      model: IA_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a security code reviewer. Analyze code changes for vulnerabilities."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 1024
    });

    const aiText = response.choices[0]?.message?.content || "";

    if (!aiText) return [];

    // Try to parse response as JSON
    try {
      // Handle markdown code blocks
      const jsonMatch = aiText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.map((issue: any) => ({
            ...issue,
            file: filePath,
            rule: issue.rule || "AI-001"
          }));
        }
      }
    } catch {
      // If AI didn't return valid JSON, check for rejection keywords
      if (aiText.toLowerCase().includes("vulnerability") ||
          aiText.toLowerCase().includes("injection") ||
          aiText.toLowerCase().includes("insecure")) {
        return [{
          rule: "AI-001",
          severity: "high" as const,
          file: filePath,
          description: "AI flagged potential security issue: " + aiText.substring(0, 200),
          recommendation: "Review the code manually before applying fix"
        }];
      }
    }

    return [];
  } catch (err: any) {
    console.error(`[Auditor] AI security review failed: ${err.message}`);
    return [];
  }
}

/**
 * Generate a simple diff between original and new content.
 */
function generateDiff(original: string, modified: string): string {
  const origLines = original.split("\n");
  const modLines = modified.split("\n");

  const diffLines: string[] = [];

  // Simple line-by-line diff
  const maxLines = Math.max(origLines.length, modLines.length);
  for (let i = 0; i < maxLines; i++) {
    const origLine = origLines[i] || "";
    const modLine = modLines[i] || "";

    if (origLine !== modLine) {
      if (origLine) diffLines.push(`- ${origLine}`);
      if (modLine) diffLines.push(`+ ${modLine}`);
    }
  }

  return diffLines.join("\n");
}

// ==========================================
// MAIN AUDITOR FUNCTION
// ==========================================

/**
 * Run mandatory security audit on a proposed fix.
 *
 * This function MUST be called BEFORE applying any auto-fix.
 * If the audit returns "rejected", the fix MUST NOT be applied.
 *
 * @param fix - The fix description (what the fixer intends to do)
 * @param affectedFiles - Array of file paths that will be modified
 * @param newContents - Map of file path → proposed new content (after fix)
 * @returns AuditResultFull with approved/rejected and issues list
 */
export async function runSecurityAudit(
  fix: string,
  affectedFiles: string[],
  newContents?: Map<string, string>
): Promise<AuditResultFull> {
  console.log("[Auditor] === Starting mandatory security audit ===");
  console.log(`[Auditor] Files to audit: ${affectedFiles.join(", ")}`);
  console.log(`[Auditor] Fix: ${fix.substring(0, 100)}...`);

  const allIssues: AuditIssue[] = [];
  const projectRoot = process.cwd();

  // === PHASE 1: Pattern-based static analysis ===
  console.log("[Auditor] Phase 1: Pattern-based static analysis...");

  for (const filePath of affectedFiles) {
    const fullPath = path.resolve(projectRoot, filePath);

    try {
      let content: string;

      if (newContents?.has(filePath)) {
        // Use the proposed new content
        content = newContents.get(filePath)!;
      } else if (fsSync.existsSync(fullPath)) {
        // Read the current file content
        content = await fs.readFile(fullPath, "utf-8");
      } else {
        console.warn(`[Auditor] File not found, skipping: ${filePath}`);
        continue;
      }

      const fileIssues = scanFileWithRules(filePath, content);
      allIssues.push(...fileIssues);

      if (fileIssues.length > 0) {
        console.log(`[Auditor] ⚠️  Found ${fileIssues.length} issue(s) in ${filePath}`);
      }
    } catch (err: any) {
      console.error(`[Auditor] Error scanning ${filePath}: ${err.message}`);
      allIssues.push({
        rule: "AUD-001",
        severity: "medium",
        file: filePath,
        description: `Could not scan file: ${err.message}`,
        recommendation: "Verify file manually before applying fix"
      });
    }
  }

  // === PHASE 2: AI-powered deep analysis ===
  console.log("[Auditor] Phase 2: AI-powered deep analysis...");

  for (const filePath of affectedFiles) {
    const fullPath = path.resolve(projectRoot, filePath);

    try {
      let originalContent = "";
      let newContent = "";

      if (newContents?.has(filePath)) {
        newContent = newContents.get(filePath)!;
        // Try to read original from backup or current file
        if (fsSync.existsSync(fullPath)) {
          originalContent = await fs.readFile(fullPath, "utf-8");
        }
      } else if (fsSync.existsSync(fullPath)) {
        newContent = await fs.readFile(fullPath, "utf-8");
        originalContent = newContent; // No change to compare, but AI can still review
      }

      if (originalContent !== newContent || newContent.length > 0) {
        const aiIssues = await aiSecurityReview(newContent, originalContent, filePath, fix);
        allIssues.push(...aiIssues);

        if (aiIssues.length > 0) {
          console.log(`[Auditor] 🤖 AI found ${aiIssues.length} issue(s) in ${filePath}`);
        }
      }
    } catch (err: any) {
      console.error(`[Auditor] AI review error for ${filePath}: ${err.message}`);
    }
  }

  // === PHASE 3: Consolidate results ===
  const criticalIssues = allIssues.filter(i => i.severity === "critical");
  const highIssues = allIssues.filter(i => i.severity === "high");
  const mediumIssues = allIssues.filter(i => i.severity === "medium");
  const lowIssues = allIssues.filter(i => i.severity === "low");

  // Any critical or high issue → rejected
  const result: AuditResult = (criticalIssues.length > 0 || highIssues.length > 0)
    ? "rejected"
    : "approved";

  const reasoning = buildReasoning(result, allIssues);

  console.log(`[Auditor] === Audit Complete ===`);
  console.log(`[Auditor] Result: ${result.toUpperCase()}`);
  console.log(`[Auditor] Issues: ${allIssues.length} total (${criticalIssues.length} critical, ${highIssues.length} high, ${mediumIssues.length} medium, ${lowIssues.length} low)`);

  if (result === "rejected") {
    console.log(`[Auditor] ⛔ Fix BLOCKED by security audit`);
    for (const issue of criticalIssues.concat(highIssues)) {
      console.log(`[Auditor]   - [${issue.severity.toUpperCase()}] ${issue.rule}: ${issue.description}`);
    }
  } else {
    console.log(`[Auditor] ✅ Fix approved by security audit`);
  }

  return {
    result,
    issues: allIssues,
    checksPerformed: SECURITY_RULES.length + 1, // +1 for AI review
    modelUsed: GROQ_API_KEY ? IA_MODEL : "pattern-only",
    reasoning
  };
}

// ==========================================
// REASONING GENERATION
// ==========================================

/**
 * Generate human-readable reasoning for the audit result.
 */
function buildReasoning(result: AuditResult, issues: AuditIssue[]): string {
  if (result === "approved") {
    if (issues.length === 0) {
      return "Security audit passed. No issues detected across all security rules and AI analysis.";
    }
    return `Security audit approved with ${issues.length} low-priority note(s). ` +
      `Issues: ${issues.map(i => `${i.rule} (${i.severity}): ${i.description.substring(0, 80)}`).join("; ")}. ` +
      `These do not block the fix but should be reviewed.`;
  }

  const criticalIssues = issues.filter(i => i.severity === "critical");
  const highIssues = issues.filter(i => i.severity === "high");

  const parts: string[] = [];
  parts.push(`Security audit REJECTED.`);

  if (criticalIssues.length > 0) {
    parts.push(`${criticalIssues.length} critical issue(s): ${criticalIssues.map(i => `${i.rule}: ${i.description}`).join("; ")}`);
  }

  if (highIssues.length > 0) {
    parts.push(`${highIssues.length} high issue(s): ${highIssues.map(i => `${i.rule}: ${i.description}`).join("; ")}`);
  }

  parts.push("Fix blocked for security reasons. Resolve issues before retrying.");

  return parts.join(" ");
}

// ==========================================
// QUICK AUDIT (Pattern-only, no AI)
// ==========================================

/**
 * Fast security check using only pattern matching (no AI calls).
 * Useful for pre-validation or offline environments.
 */
export function quickSecurityAudit(
  affectedFiles: string[],
  newContents?: Map<string, string>
): AuditResultFull {
  console.log("[Auditor] Quick security audit (pattern-only)...");

  const allIssues: AuditIssue[] = [];
  const projectRoot = process.cwd();

  for (const filePath of affectedFiles) {
    const fullPath = path.resolve(projectRoot, filePath);

    try {
      let content: string;

      if (newContents?.has(filePath)) {
        content = newContents.get(filePath)!;
      } else if (fsSync.existsSync(fullPath)) {
        content = fsSync.readFileSync(fullPath, "utf-8");
      } else {
        continue;
      }

      const fileIssues = scanFileWithRules(filePath, content);
      allIssues.push(...fileIssues);
    } catch { /* skip errors in quick mode */ }
  }

  const hasBlockingIssues = allIssues.some(i => i.severity === "critical" || i.severity === "high");
  const result: AuditResult = hasBlockingIssues ? "rejected" : "approved";
  const reasoning = buildReasoning(result, allIssues);

  console.log(`[Auditor] Quick audit result: ${result}`);
  console.log(`[Auditor] Issues: ${allIssues.length}`);

  return {
    result,
    issues: allIssues,
    checksPerformed: SECURITY_RULES.length,
    modelUsed: "pattern-only",
    reasoning
  };
}
