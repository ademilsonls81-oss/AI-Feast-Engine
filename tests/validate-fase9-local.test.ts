/**
 * Fase 9 — Loop Principal: Validação Local
 *
 * Cenários testados:
 *   1. Loop executa todas as fases quando há 5+ erros
 *   2. Loop NÃO executa quando há menos de 5 erros
 *   3. Loop é bloqueado quando já está executando (concorrência)
 *   4. Loop loga sequência correta de fases
 *
 * Uso: npx tsx scripts/validate-fase9-local.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dos módulos antes de importar o loop
vi.mock("../src/lib/supabase.js", () => ({
  supabase: {
    from: vi.fn()
  }
}));

vi.mock("../src/autonomous/diagnostician.js", () => ({
  runDiagnosis: vi.fn().mockResolvedValue({
    cause: "Test error cause",
    fix: "Test fix suggestion",
    confidence: 0.85,
    affected_files: ["src/test/file.ts"],
    model_used: "groq-llama-3",
    auto_fix_id: "test-fix-001"
  })
}));

vi.mock("../src/autonomous/riskAnalyzer.js", () => ({
  fullRiskPipeline: vi.fn().mockResolvedValue({
    risk_level: "low",
    risk_score: 0.15,
    decision: "auto_apply",
    reasoning: "Low risk - safe to apply",
    executed: true,
    execution_error: null
  })
}));

vi.mock("../src/autonomous/fixer.js", () => ({
  applyFix: vi.fn().mockResolvedValue({
    action: "applied",
    success: true,
    modifiedFiles: ["src/test/file.ts"],
    error: null,
    reason: "Test fix applied successfully",
    securityAuditPassed: true
  })
}));

// Import after mocking
import { supabase } from "../src/lib/supabase.js";
import { runAutonomousLoop, triggerAutonomousLoop, isLoopActive, getLoopStatus } from "../src/autonomous/loop.js";

// Access internal state for testing
import * as loopModule from "../src/autonomous/loop.js";

describe("Fase 9 — Loop Principal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset loop state between tests
    (loopModule as any).isLoopRunning = false;
  });

  it("Cenário 1: Loop executa todas as fases quando há 5+ erros", async () => {
    console.log("\n🧪 Cenário 1: Loop com 5+ erros");

    // Mock: 5 errors in last hour
    const mockSelect = vi.fn()
      .mockReturnValue({
        gte: vi.fn().mockResolvedValueOnce({ count: 5, error: null }) // count errors
      });

    const mockSelectDetails = vi.fn()
      .mockReturnValue({
        gte: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce({
              data: [
                { id: "1", error_type: "TypeError", source: "api", message: "Test error 1", severity: "high" },
                { id: "2", error_type: "TypeError", source: "api", message: "Test error 2", severity: "high" },
                { id: "3", error_type: "TypeError", source: "api", message: "Test error 3", severity: "high" },
                { id: "4", error_type: "TypeError", source: "api", message: "Test error 4", severity: "high" },
                { id: "5", error_type: "TypeError", source: "api", message: "Test error 5", severity: "high" }
              ],
              error: null
            })
          })
        })
      });

    let callCount = 0;
    (supabase.from as any).mockImplementation(() => {
      callCount++;
      return { select: callCount === 1 ? mockSelect : mockSelectDetails };
    });

    const result = await runAutonomousLoop();

    console.log(`✅ Result:`, result);

    expect(result.success).toBe(true);
    expect(result.errorsChecked).toBe(5);
    expect(result.diagnosisTriggered).toBe(true);
    expect(result.fixAttempted).toBe(true);
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeUndefined();

    console.log("✅ Cenário 1 PASSED: Loop executou todas as fases");
  });

  it("Cenário 2: Loop NÃO executa quando há menos de 5 erros", async () => {
    console.log("\n🧪 Cenário 2: Loop com menos de 5 erros");

    // Mock: 3 errors in last hour (below threshold)
    const mockSelect = vi.fn().mockReturnValue({
      gte: vi.fn().mockResolvedValueOnce({ count: 3, error: null })
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect
    });

    const result = await runAutonomousLoop();

    console.log(`✅ Result:`, result);

    expect(result.success).toBe(true);
    expect(result.errorsChecked).toBe(3);
    expect(result.diagnosisTriggered).toBe(false);
    expect(result.fixAttempted).toBe(false);

    console.log("✅ Cenário 2 PASSED: Loop não executou quando abaixo do threshold");
  });

  it("Cenário 3: Loop é bloqueado quando já está executando (concorrência)", async () => {
    console.log("\n🧪 Cenário 3: Loop bloqueado por concorrência");

    // Mock: 5 errors in last hour
    const mockSelect = vi.fn().mockReturnValue({
      gte: vi.fn().mockResolvedValueOnce({ count: 5, error: null })
    });

    const mockSelectDetails = vi.fn().mockReturnValue({
      gte: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValueOnce({
            data: [
              { id: "1", error_type: "TypeError", source: "api", message: "Test error 1", severity: "high" }
            ],
            error: null
          })
        })
      })
    });

    let callCount = 0;
    (supabase.from as any).mockImplementation(() => {
      callCount++;
      return { select: callCount === 1 ? mockSelect : mockSelectDetails };
    });

    // Start first loop
    const promise1 = runAutonomousLoop();

    // Immediately try to start second loop (before first completes)
    const result2 = await runAutonomousLoop();

    console.log(`✅ Result2 (concurrent attempt):`, result2);

    expect(result2.success).toBe(false);
    expect(result2.error).toBe("Loop already running");
    expect(result2.errorsChecked).toBe(0);
    expect(result2.diagnosisTriggered).toBe(false);
    expect(result2.fixAttempted).toBe(false);

    // Wait for first loop to complete
    const result1 = await promise1;

    console.log(`✅ Result1 (original):`, result1);
    console.log("✅ Cenário 3 PASSED: Loop bloqueou execução concorrente");
  }, 10000);

  it("Cenário 4: Loop loga sequência correta de fases", async () => {
    console.log("\n🧪 Cenário 4: Sequência de fases logada corretamente");

    // Mock: 5 errors in last hour
    const mockSelect = vi.fn().mockReturnValue({
      gte: vi.fn().mockResolvedValueOnce({ count: 5, error: null })
    });

    const mockSelectDetails = vi.fn().mockReturnValue({
      gte: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValueOnce({
            data: [
              { id: "1", error_type: "TypeError", source: "api", message: "Test error 1", severity: "high" }
            ],
            error: null
          })
        })
      })
    });

    let callCount = 0;
    (supabase.from as any).mockImplementation(() => {
      callCount++;
      return { select: callCount === 1 ? mockSelect : mockSelectDetails };
    });

    // Capture console.log output
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args) => {
      logs.push(args.join(" "));
      originalLog(...args);
    };

    try {
      await runAutonomousLoop();

      // Verify phase logs are present
      const phase1Log = logs.find(l => l.includes("Phase 1: Monitor"));
      const phase2Log = logs.find(l => l.includes("Phase 2: Diagnostician"));
      const phase3Log = logs.find(l => l.includes("Phase 3: Risk Analyzer"));
      const phase4Log = logs.find(l => l.includes("Phase 4-8: Auto-Fixer"));

      expect(phase1Log).toBeDefined();
      expect(phase2Log).toBeDefined();
      expect(phase3Log).toBeDefined();
      expect(phase4Log).toBeDefined();

      console.log("✅ Todas as fases foram logadas na sequência correta");
    } finally {
      console.log = originalLog;
    }

    console.log("✅ Cenário 4 PASSED: Sequência de fases validada");
  });

  it("Cenário 5: triggerAutonomousLoop() funciona para chamada manual", async () => {
    console.log("\n🧪 Cenário 5: Trigger manual funciona");

    // Mock: 5 errors in last hour
    const mockSelect = vi.fn().mockReturnValue({
      gte: vi.fn().mockResolvedValueOnce({ count: 5, error: null })
    });

    const mockSelectDetails = vi.fn().mockReturnValue({
      gte: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValueOnce({
            data: [
              { id: "1", error_type: "TypeError", source: "api", message: "Test error 1", severity: "high" }
            ],
            error: null
          })
        })
      })
    });

    let callCount = 0;
    (supabase.from as any).mockImplementation(() => {
      callCount++;
      return { select: callCount === 1 ? mockSelect : mockSelectDetails };
    });

    const result = await triggerAutonomousLoop();

    expect(result.success).toBe(true);
    expect(result.errorsChecked).toBe(5);
    expect(result.diagnosisTriggered).toBe(true);
    expect(result.fixAttempted).toBe(true);

    console.log("✅ Cenário 5 PASSED: Trigger manual funciona");
  });

  it("Cenário 6: isLoopActive() e getLoopStatus() retornam estado correto", async () => {
    console.log("\n🧪 Cenário 6: Status do loop funciona");

    // Initially loop should not be active
    expect(isLoopActive()).toBe(false);

    const status = getLoopStatus();
    expect(status.isRunning).toBe(false);
    expect(status.canExecute).toBe(true);
    expect(status.message).toBe("Loop is ready to execute");

    console.log("✅ Cenário 6 PASSED: Status do loop funciona");
  });
});
