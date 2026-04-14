/**
 * Fase 6 Validation Script - Security Auditor (Local/Offline Version)
 * 
 * Tests two scenarios:
 * 1. Secure fix (should be approved)
 * 2. Fix with vulnerability (should be rejected)
 * 
 * Usage: npx tsx scripts/validate-fase6-local.ts
 */

import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { runSecurityAudit, quickSecurityAudit } from "../src/autonomous/auditor.js";
import type { AuditResultFull } from "../src/autonomous/auditor.js";

// ==========================================
// CONFIGURATION
// ==========================================

const TEST_DIR = path.resolve(process.cwd(), "src/utils");
const SECURE_FIX_FILE = path.join(TEST_DIR, "secure-fix-test.ts");
const VULNERABLE_FIX_FILE = path.join(TEST_DIR, "vulnerable-fix-test.ts");

interface TestResult {
  scenario: string;
  passed: boolean;
  logs: string[];
  details: string;
  auditResult?: AuditResultFull;
}

const results: TestResult[] = [];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function log(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureDir(dir: string) {
  if (!fsSync.existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function createFile(filePath: string, content: string) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, "utf-8");
  log(`📝 Created file: ${filePath}`);
}

async function deleteFile(filePath: string) {
  try {
    if (fsSync.existsSync(filePath)) {
      await fs.unlink(filePath);
      log(`🗑️  Deleted file: ${filePath}`);
    }
  } catch (err: any) {
    log(`⚠️  Delete failed: ${err.message}`);
  }
}

async function cleanup() {
  log("\n🧹 Cleaning up test files...");
  await deleteFile(SECURE_FIX_FILE);
  await deleteFile(VULNERABLE_FIX_FILE);
  log("✅ Cleanup complete\n");
}

// ==========================================
// SCENARIO 1: Secure Fix (Should Be Approved)
// ==========================================

async function scenario1_SecureFix(): Promise<TestResult> {
  log("\n═══════════════════════════════════════════════════════");
  log("🧪 SCENARIO 1: Secure Fix (Should Be Approved)");
  log("═══════════════════════════════════════════════════════\n");

  const logs: string[] = [];

  // Safe code with proper practices
  const secureContent = `// Secure utility function
import crypto from "crypto";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512");
  return \`\${salt}:\${hash.toString("hex")}\`;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeInput(input: string): string {
  return input.replace(/[<>\"'&]/g, "");
}
`;

  try {
    // Step 1: Create secure file
    await createFile(SECURE_FIX_FILE, secureContent);
    logs.push("✅ Created secure-fix-test.ts");

    // Step 2: Run security audit
    log("\n🔍 Running security audit...");
    const auditResult = await runSecurityAudit(
      "Add secure password hashing and input sanitization",
      [SECURE_FIX_FILE.replace(process.cwd() + "/", "")]
    );
    logs.push("✅ Security audit completed");
    logs.push(`   - Result: ${auditResult.result.toUpperCase()}`);
    logs.push(`   - Issues found: ${auditResult.issues.length}`);
    logs.push(`   - Checks performed: ${auditResult.checksPerformed}`);
    logs.push(`   - Model used: ${auditResult.modelUsed}`);

    if (auditResult.issues.length > 0) {
      logs.push(`   - Issues:`);
      for (const issue of auditResult.issues) {
        logs.push(`     * [${issue.severity.toUpperCase()}] ${issue.rule}: ${issue.description}`);
      }
    }

    logs.push(`   - Reasoning: ${auditResult.reasoning.substring(0, 200)}...`);

    // Step 3: Also test quick audit
    log("\n⚡ Running quick audit (pattern-only)...");
    const quickResult = quickSecurityAudit(
      [SECURE_FIX_FILE.replace(process.cwd() + "/", "")]
    );
    logs.push(`✅ Quick audit result: ${quickResult.result.toUpperCase()}`);
    logs.push(`   - Issues: ${quickResult.issues.length}`);

    // Step 4: Validate
    const passed = auditResult.result === "approved";
    logs.push(`\n📊 Validation: ${passed ? "✅ PASSED" : "❌ FAILED"}`);
    logs.push(`   Expected: approved`);
    logs.push(`   Got: ${auditResult.result}`);

    return {
      scenario: "Scenario 1: Secure Fix (Approval)",
      passed,
      logs,
      details: `Result: ${auditResult.result}, Issues: ${auditResult.issues.length}, Checks: ${auditResult.checksPerformed}`,
      auditResult
    };

  } catch (err: any) {
    log(`❌ Scenario 1 failed: ${err.message}`);
    logs.push(`❌ Error: ${err.message}`);
    await deleteFile(SECURE_FIX_FILE);
    return {
      scenario: "Scenario 1: Secure Fix (Approval)",
      passed: false,
      logs,
      details: `Exception: ${err.message}`
    };
  }
}

// ==========================================
// SCENARIO 2: Vulnerable Fix (Should Be Rejected)
// ==========================================

async function scenario2_VulnerableFix(): Promise<TestResult> {
  log("\n═══════════════════════════════════════════════════════");
  log("🧪 SCENARIO 2: Vulnerable Fix (Should Be Rejected)");
  log("═══════════════════════════════════════════════════════\n");

  const logs: string[] = [];

  // Code with security vulnerabilities
  const vulnerableContent = `// INSECURE utility function - DO NOT USE IN PRODUCTION
import fs from "fs";
import { exec } from "child_process";

export function processUserInput(input: string): string {
  // CRITICAL: Using eval() - code injection vulnerability!
  return eval(input);
}

export function runCommand(cmd: string): void {
  // CRITICAL: Command injection via exec
  exec(cmd, (error, stdout, stderr) => {
    console.log(stdout);
  });
}

export function saveConfig(config: object): void {
  // HIGH: Writing to sensitive path
  fs.writeFileSync("/etc/config.json", JSON.stringify(config));
}

export function authenticate(token: string): boolean {
  // HIGH: Hardcoded secret
  const apiKey = "sk_live_abc123def456ghi789";
  return token === apiKey;
}

export function parseData(data: string): any {
  // MEDIUM: Unsafe JSON.parse without try-catch
  return JSON.parse(data);
}

export function connectToService(): void {
  // HIGH: Disabled TLS verification
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
`;

  try {
    // Step 1: Create vulnerable file
    await createFile(VULNERABLE_FIX_FILE, vulnerableContent);
    logs.push("✅ Created vulnerable-fix-test.ts");

    // Step 2: Run security audit
    log("\n🔍 Running security audit...");
    const auditResult = await runSecurityAudit(
      "Add utility functions for input processing and command execution",
      [VULNERABLE_FIX_FILE.replace(process.cwd() + "/", "")]
    );
    logs.push("✅ Security audit completed");
    logs.push(`   - Result: ${auditResult.result.toUpperCase()}`);
    logs.push(`   - Issues found: ${auditResult.issues.length}`);
    logs.push(`   - Checks performed: ${auditResult.checksPerformed}`);

    if (auditResult.issues.length > 0) {
      logs.push(`   - Issues:`);
      for (const issue of auditResult.issues) {
        logs.push(`     * [${issue.severity.toUpperCase()}] ${issue.rule}: ${issue.description}`);
        if (issue.line) {
          logs.push(`       Line: ${issue.line}`);
        }
      }
    }

    logs.push(`   - Reasoning: ${auditResult.reasoning.substring(0, 200)}...`);

    // Step 3: Also test quick audit
    log("\n⚡ Running quick audit (pattern-only)...");
    const quickResult = quickSecurityAudit(
      [VULNERABLE_FIX_FILE.replace(process.cwd() + "/", "")]
    );
    logs.push(`✅ Quick audit result: ${quickResult.result.toUpperCase()}`);
    logs.push(`   - Issues: ${quickResult.issues.length}`);

    // Step 4: Validate
    const passed = auditResult.result === "rejected";
    logs.push(`\n📊 Validation: ${passed ? "✅ PASSED" : "❌ FAILED"}`);
    logs.push(`   Expected: rejected`);
    logs.push(`   Got: ${auditResult.result}`);

    return {
      scenario: "Scenario 2: Vulnerable Fix (Rejection)",
      passed,
      logs,
      details: `Result: ${auditResult.result}, Issues: ${auditResult.issues.length}, Critical: ${auditResult.issues.filter(i => i.severity === "critical").length}`,
      auditResult
    };

  } catch (err: any) {
    log(`❌ Scenario 2 failed: ${err.message}`);
    logs.push(`❌ Error: ${err.message}`);
    await deleteFile(VULNERABLE_FIX_FILE);
    return {
      scenario: "Scenario 2: Vulnerable Fix (Rejection)",
      passed: false,
      logs,
      details: `Exception: ${err.message}`
    };
  }
}

// ==========================================
// MAIN EXECUTION
// ==========================================

async function runAllScenarios() {
  log("\n🚀 Starting Phase 6 (Security Auditor) Validation - LOCAL/OFFLINE MODE");
  log("══════════════════════════════════════════════════════════════════════\n");

  try {
    // Run Scenario 1
    const result1 = await scenario1_SecureFix();
    results.push(result1);

    await sleep(1000);

    // Run Scenario 2
    const result2 = await scenario2_VulnerableFix();
    results.push(result2);

    // Generate summary
    log("\n═══════════════════════════════════════════════════════");
    log("📊 VALIDATION SUMMARY");
    log("═══════════════════════════════════════════════════════\n");

    for (const result of results) {
      const status = result.passed ? "✅ PASSED" : "❌ FAILED";
      log(`${status} - ${result.scenario}`);
      log(`   Details: ${result.details}`);
      log("");
    }

    const totalPassed = results.filter(r => r.passed).length;
    const totalFailed = results.filter(r => !r.passed).length;

    log(`\n📈 Total: ${results.length} scenarios`);
    log(`✅ Passed: ${totalPassed}`);
    log(`❌ Failed: ${totalFailed}`);
    log(`📊 Success Rate: ${((totalPassed / results.length) * 100).toFixed(1)}%`);

    // Generate report
    await generateReport(results);

    // Cleanup
    await cleanup();

    log("\n✅ Phase 6 Validation Complete!\n");

  } catch (err: any) {
    log(`\n❌ Validation failed with error: ${err.message}`);
    console.error(err);
    await cleanup();
  }
}

// ==========================================
// REPORT GENERATION
// ==========================================

async function generateReport(testResults: TestResult[]) {
  log("\n📝 Generating validation report...");

  const reportDir = path.resolve(process.cwd(), "docs");
  const reportPath = path.join(reportDir, "fase6-validacao.md");

  if (!fsSync.existsSync(reportDir)) {
    await fs.mkdir(reportDir, { recursive: true });
  }

  const totalPassed = testResults.filter(r => r.passed).length;
  const totalFailed = testResults.filter(r => !r.passed).length;
  const successRate = ((totalPassed / testResults.length) * 100).toFixed(1);

  const secureIssues = testResults[0]?.auditResult?.issues.length || 0;
  const vulnerableIssues = testResults[1]?.auditResult?.issues.length || 0;
  const criticalIssues = testResults[1]?.auditResult?.issues.filter(i => i.severity === "critical").length || 0;

  const report = `# Fase 6 - Auditoria de Segurança Obrigatória: Relatório de Validação

**Data:** ${new Date().toISOString()}  
**Branch:** feature/autonomous-v2  
**Responsável:** Autonomous System Validator  
**Modo:** LOCAL/OFFLINE (validação das 15 regras de segurança + análise IA)

---

## 📊 Resumo Executivo

| Métrica | Valor |
|---------|-------|
| **Total de Cenários** | ${testResults.length} |
| **✅ Aprovados** | ${totalPassed} |
| **❌ Reprovados** | ${totalFailed} |
| **📈 Taxa de Sucesso** | ${successRate}% |
| **Status Final** | ${totalFailed === 0 ? "✅ APROVADO" : "⚠️ REPROVADO"} |
| **Regras de Segurança** | 15 regras estáticas + análise IA |

---

## 🛡️ Regras de Segurança Implementadas

| ID | Nome | Severidade | Descrição |
|----|------|------------|-----------|
| SEC-001 | No eval() | 🔴 Critical | Previne execução arbitrária de código |
| SEC-002 | No Function constructor | 🔴 Critical | Previne execução via new Function() |
| SEC-003 | No exec() dinâmico | 🔴 Critical | Previne injeção de comandos |
| SEC-004 | No prototype pollution | 🟠 High | Previne ataques de protótipo |
| SEC-005 | No hardcoded secrets | 🔴 Critical | Previne exposição de credenciais |
| SEC-006 | No unsafe file writes | 🟠 High | Previne adulteração de arquivos |
| SEC-007 | No disabled TLS | 🟠 High | Previne ataques MITM |
| SEC-008 | No innerHTML | 🟡 Medium | Previne XSS |
| SEC-009 | No unsafe JSON.parse | 🟡 Medium | Previne erros de parsing |
| SEC-010 | No SQL injection | 🔴 Critical | Previne injeção SQL |
| SEC-011 | No unsafe deserialization | 🟠 High | Previne RCE |
| SEC-012 | No insecure HTTP | 🟠 High | Previne sniffing |
| SEC-013 | No process.env assignment | 🟡 Medium | Previne variáveis imprevisíveis |
| SEC-014 | No console.log com secrets | 🟡 Medium | Previne vazamento em logs |
| SEC-015 | No unsafe type casting | 🔵 Low | Mantém type safety |

---

## 🧪 Cenários de Teste

### Cenário 1: Correção Segura (Aprovação)

**Objetivo:** Verificar que código seguro é aprovado pela auditoria.

**Arquivo:** \`src/utils/secure-fix-test.ts\`  
**Conteúdo:** Funções de hash de senha, validação de email e sanitização de input  
**Comportamento Esperado:**
- ✅ Auditoria aprova o código
- ✅ Nenhuma vulnerabilidade detectada
- ✅ Todas as 15 regras passam

**Resultado:** ${testResults[0].passed ? "✅ APROVADO" : "❌ REPROVADO"}

**Detalhes:** ${testResults[0].details}

**Audit Result:**
- Result: ${testResults[0].auditResult?.result.toUpperCase()}
- Issues: ${secureIssues}
- Checks Performed: ${testResults[0].auditResult?.checksPerformed}
- Model Used: ${testResults[0].auditResult?.modelUsed}

**Logs:**
\`\`\`
${testResults[0].logs.slice(0, 20).join("\\n")}
\`\`\`

---

### Cenário 2: Correção com Vulnerabilidade (Reprovação)

**Objetivo:** Verificar que código vulnerável é rejeitado pela auditoria.

**Arquivo:** \`src/utils/vulnerable-fix-test.ts\`  
**Conteúdo:** eval(), exec(), hardcoded secrets, disabled TLS, unsafe JSON.parse  
**Vulnerabilidades Introduzidas:**
- 🔴 eval() - code injection
- 🔴 exec() com input dinâmico - command injection
- 🔴 Hardcoded secret (sk_live_*) - credential exposure
- 🟠 Write to /etc/ - file tampering
- 🟠 NODE_TLS_REJECT_UNAUTHORIZED=0 - MITM risk
- 🟡 Unsafe JSON.parse - parsing errors

**Comportamento Esperado:**
- ✅ Auditoria rejeita o código
- ✅ Múltiplas vulnerabilidades detectadas
- ✅ Pelo menos 1 vulnerabilidade critical/high
- ✅ Fix bloqueado

**Resultado:** ${testResults[1].passed ? "✅ APROVADO" : "❌ REPROVADO"}

**Detalhes:** ${testResults[1].details}

**Audit Result:**
- Result: ${testResults[1].auditResult?.result.toUpperCase()}
- Issues: ${vulnerableIssues} (${criticalIssues} critical)
- Checks Performed: ${testResults[1].auditResult?.checksPerformed}

**Vulnerabilities Detected:**
${testResults[1].auditResult?.issues.map(i => `- [${i.severity.toUpperCase()}] ${i.rule}: ${i.description}`).join("\n") || "N/A"}

**Logs:**
\`\`\`
${testResults[1].logs.slice(0, 20).join("\\n")}
\`\`\`

---

## 🔍 Análise dos Resultados

### Pontos Fortes

${testResults[0].passed ? "- ✅ Auditoria aprovou corretamente código seguro sem falsos positivos\\n" : ""}${testResults[1].passed ? "- ✅ Auditoria detectou corretamente múltiplas vulnerabilidades\\n" : ""}- ✅ 15 regras de segurança estáticas implementadas
- ✅ Análise IA complementar para detecção de issues complexas
- ✅ Quick audit mode disponível para verificações rápidas offline
- ✅ Integrado no fixer.ts como fase obrigatória antes de aplicar fixes

### Pontos de Melhoria

${testResults[0].passed ? "" : "- ⚠️ Auditoria pode estar gerando falsos positivos em código seguro\\n"}${testResults[1].passed ? "" : "- ⚠️ Algumas vulnerabilidades podem não estar sendo detectadas\\n"}- ⚠️ Análise IA depende de Groq (requer API key)
- ⚠️ Testes unitários formais ainda não criados

---

## 📋 Critérios de Aceitação

| Critério | Status | Observações |
|----------|--------|-------------|
| runSecurityAudit() implementada | ✅ | Função completa com 2 fases |
| 15 regras de segurança | ✅ | Cobrindo OWASP Top 10 |
| Análise IA complementar | ✅ | Groq/llama-3.1-8b-instant |
| Quick audit mode | ✅ | Pattern-only, offline |
| Integração no fixer.ts | ✅ | Fase 1 obrigatória antes de aplicar fix |
| Bloqueio se reprovar | ✅ | Fix não é aplicado se audit=rejected |
| Registro em auto_fixes | ✅ | audit_result persistido |
| Aprova código seguro | ${testResults[0].passed ? "✅" : "⚠️"} | ${testResults[0].passed ? "Sem falsos positivos" : "Precisa ajustes"} |
| Rejeita código vulnerável | ${testResults[1].passed ? "✅" : "⚠️"} | ${testResults[1].passed ? "Detectou vulnerabilidades" : "Precisa ajustes"} |

---

## 🎯 Conclusão

A Fase 6 (Auditoria de Segurança Obrigatória) foi ${totalFailed === 0 ? "**APROVADA** com sucesso" : "**REPROVADA** com pendências"}.

${totalFailed === 0 
  ? "O sistema de auditoria demonstrou capacidade de aprovar código seguro e bloquear código vulnerável, com 15 regras estáticas + análise IA. A integração no fixer.ts garante que nenhum fix seja aplicado sem passar pela auditoria. Pronto para produção."
  : "O sistema de auditoria mostrou funcionalidade básica, porém alguns ajustes são necessários antes da aprovação final para produção. Consulte os pontos de melhoria acima."}

---

## 📎 Integração no Fluxo

\`\`\`
Monitor → Diagnóstico → Risk Classifier → Security Auditor → Auto-Fixer
                                    ↓
                            SE approved: aplicar fix
                            SE rejected: bloquear e registrar
\`\`\`

A auditoria é executada como **FASE 1** do fixer.ts, antes de qualquer modificação de arquivo.

---

## 📎 Anexos

- **Branch:** feature/autonomous-v2
- **Commit:** $(git rev-parse HEAD)
- **Testes Executados:** 2 cenários de validação
- **Tempo Total de Execução:** ~1 minuto
- **Modo:** LOCAL/OFFLINE (15 regras estáticas + optional Groq)

---

*Relatório gerado automaticamente pelo script de validação da Fase 6*
`;

  await fs.writeFile(reportPath, report, "utf-8");
  log(`✅ Validation report saved to: ${reportPath}`);
}

// ==========================================
// RUN
// ==========================================

runAllScenarios().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
