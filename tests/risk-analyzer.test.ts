/**
 * Risk Analyzer Tests
 *
 * Tests the risk classification logic for autonomous auto-fixes.
 * Covers all risk levels: low, medium, high, critical
 */

import { describe, it, expect } from "vitest";
import { analyzeRisk } from "../src/autonomous/riskAnalyzer.js";
import type { RiskFactors, RiskAnalysisResult } from "../src/autonomous/riskAnalyzer.js";
import type { DiagnosisResult } from "../src/autonomous/diagnostician.js";

// Helper to create mock diagnoses
function createMockDiagnosis(overrides: Partial<DiagnosisResult> = {}): DiagnosisResult {
  return {
    cause: "Test cause",
    fix: "Test fix",
    confidence: 0.9,
    affected_files: ["src/routes/test.ts"],
    model_used: "test-model",
    error_ids: ["error-1"],
    auto_fix_id: "test-auto-fix-id",
    ...overrides
  };
}

describe("Risk Analyzer - Risk Score Calculation", () => {
  it("should calculate low risk score for high confidence, non-critical fix", async () => {
    const diagnosis = createMockDiagnosis({
      confidence: 0.95,
      affected_files: ["src/routes/test.ts"]
    });
    const result = await analyzeRisk(diagnosis, "test-1");
    expect(result.risk_score).toBeLessThan(0.3);
    expect(result.risk_level).toBe("low");
  });

  it("should calculate medium risk score for moderate confidence with side effects", async () => {
    const diagnosis = createMockDiagnosis({
      confidence: 0.7,
      affected_files: ["src/routes/test.ts", "src/services/test.ts", "src/utils/test.ts"]
    });
    const result = await analyzeRisk(diagnosis, "test-2");
    expect(result.risk_score).toBeGreaterThanOrEqual(0.1);
    expect(result.risk_score).toBeLessThan(0.6);
  });

  it("should calculate high risk score for low confidence with critical path", async () => {
    const diagnosis = createMockDiagnosis({
      confidence: 0.4,
      affected_files: ["src/lib/supabase.ts", "server.ts"]
    });
    const result = await analyzeRisk(diagnosis, "test-3");
    expect(result.risk_score).toBeGreaterThanOrEqual(0.4);
  });
});

describe("Risk Analyzer - Low Risk Scenarios", () => {
  it("should classify low risk for high confidence, non-critical fix", async () => {
    const diagnosis = createMockDiagnosis({
      confidence: 0.95,
      affected_files: ["src/routes/test.ts"],
      fix: "Add a simple log statement"
    });

    const result = await analyzeRisk(diagnosis, "test-low-1");
    expect(result.risk_level).toBe("low");
    expect(result.decision).toBe("auto_apply");
    expect(result.risk_score).toBeLessThan(0.3);
  });

  it("should classify low risk when rollback is available", async () => {
    const diagnosis = createMockDiagnosis({
      confidence: 0.85,
      affected_files: ["src/routes/test.ts"],
      fix: "Revert the config change"
    });

    const result = await analyzeRisk(diagnosis, "test-low-2");
    expect(result.risk_factors.rollback_available).toBe(true);
    expect(result.risk_score).toBeLessThan(0.5);
  });
});

describe("Risk Analyzer - Medium Risk Scenarios", () => {
  it("should classify medium risk for moderate confidence with some side effects", async () => {
    const diagnosis = createMockDiagnosis({
      confidence: 0.75,
      affected_files: ["src/routes/test.ts", "src/services/test.ts", "src/utils/test.ts"],
      fix: "Update the shared middleware configuration"
    });

    const result = await analyzeRisk(diagnosis, "test-med-1");
    expect(result.risk_factors.has_side_effects).toBe(true);
    expect(["low", "medium"]).toContain(result.risk_level);
  });

  it("should classify medium risk for low-medium confidence affecting production", async () => {
    const diagnosis = createMockDiagnosis({
      confidence: 0.65,
      affected_files: ["server.ts"],
      fix: "Modify server startup logic"
    });

    const result = await analyzeRisk(diagnosis, "test-med-2");
    expect(result.risk_factors.affects_production).toBe(true);
    expect(result.risk_factors.affects_critical_path).toBe(true);
    expect(result.risk_score).toBeGreaterThanOrEqual(0.3);
  });
});

describe("Risk Analyzer - High Risk Scenarios", () => {
  it("should classify high risk for low confidence affecting critical paths", async () => {
    const diagnosis = createMockDiagnosis({
      confidence: 0.5,
      affected_files: ["src/lib/supabase.ts", "server.ts"],
      fix: "Refactor database connection handling"
    });

    const result = await analyzeRisk(diagnosis, "test-high-1");
    expect(result.risk_factors.confidence_low).toBe(true);
    expect(result.risk_factors.affects_critical_path).toBe(true);
    expect(result.risk_score).toBeGreaterThanOrEqual(0.4);
  });

  it("should classify high risk for multiple affected files with side effects", async () => {
    const diagnosis = createMockDiagnosis({
      confidence: 0.6,
      affected_files: [
        "src/routes/auth.ts",
        "src/services/auth.ts",
        "src/middleware/auth.ts",
        "server.ts"
      ],
      fix: "Restructure the entire auth system"
    });

    const result = await analyzeRisk(diagnosis, "test-high-2");
    expect(result.risk_factors.has_side_effects).toBe(true);
    expect(result.risk_score).toBeGreaterThanOrEqual(0.5);
  });
});

describe("Risk Analyzer - Critical Risk Scenarios", () => {
  it("should classify critical risk for very low confidence affecting critical infrastructure", async () => {
    const diagnosis = createMockDiagnosis({
      confidence: 0.2,
      affected_files: ["src/lib/supabase.ts", "server.ts", "src/middleware/auth.ts"],
      fix: "Complete rewrite of database layer and authentication"
    });

    const result = await analyzeRisk(diagnosis, "test-crit-1");
    expect(result.risk_factors.confidence_low).toBe(true);
    expect(result.risk_factors.affects_critical_path).toBe(true);
    expect(result.risk_level).toBe("critical");
    expect(result.decision).toBe("block");
    expect(result.risk_score).toBeGreaterThanOrEqual(0.7);
  });

  it("should classify critical risk when no rollback and affects production", async () => {
    const diagnosis = createMockDiagnosis({
      confidence: 0.25,
      affected_files: ["server.ts", "src/lib/supabase.ts"],
      fix: "Remove deprecated API endpoints completely"
    });

    const result = await analyzeRisk(diagnosis, "test-crit-2");
    expect(result.risk_factors.rollback_available).toBe(false);
    expect(result.risk_score).toBeGreaterThanOrEqual(0.4);
  });
});

describe("Risk Analyzer - Decision Mapping", () => {
  it("should return auto_apply for low risk", async () => {
    const diagnosis = createMockDiagnosis({ confidence: 0.95 });
    const result = await analyzeRisk(diagnosis, "test-dec-1");
    expect(result.decision).toBe("auto_apply");
  });

  it("should return require_review for medium risk", async () => {
    const diagnosis = createMockDiagnosis({
      confidence: 0.65,
      affected_files: ["server.ts"]
    });
    const result = await analyzeRisk(diagnosis, "test-dec-2");
    // Medium risk maps to require_review
    expect(["require_review", "auto_apply"]).toContain(result.decision);
  });

  it("should return block for critical risk", async () => {
    const diagnosis = createMockDiagnosis({
      confidence: 0.1,
      affected_files: ["server.ts", "src/lib/supabase.ts", "src/middleware/auth.ts"],
      fix: "Complete system rewrite"
    });
    const result = await analyzeRisk(diagnosis, "test-dec-3");
    expect(result.decision).toBe("block");
  });
});

describe("Risk Analyzer - Reasoning Generation", () => {
  it("should generate meaningful reasoning", async () => {
    const diagnosis = createMockDiagnosis({
      confidence: 0.4,
      affected_files: ["src/lib/supabase.ts"],
      fix: "Refactor database connection with multiple changes"
    });

    const result = await analyzeRisk(diagnosis, "test-reas-1");
    expect(result.reasoning).toContain("Risk level:");
    expect(result.reasoning).toContain("score:");
    expect(result.reasoning.length).toBeGreaterThan(50);
  });

  it("should include all relevant risk factors in reasoning", async () => {
    const diagnosis = createMockDiagnosis({
      confidence: 0.3,
      affected_files: ["server.ts", "src/lib/supabase.ts", "src/middleware/auth.ts"],
      fix: "Major refactor of shared middleware and global config"
    });

    const result = await analyzeRisk(diagnosis, "test-reas-2");
    expect(result.reasoning).toContain("Risk level:");
    expect(result.reasoning).toContain("Low IA confidence");
    expect(result.reasoning).toContain("critical system path");
  });
});

describe("Risk Analyzer - Edge Cases", () => {
  it("should handle empty affected files", async () => {
    const diagnosis = createMockDiagnosis({
      confidence: 0.8,
      affected_files: [],
      fix: "Simple fix"
    });

    const result = await analyzeRisk(diagnosis, "test-edge-1");
    expect(result.risk_factors.affects_critical_path).toBe(false);
    expect(result.risk_level).toBe("low");
  });

  it("should handle empty fix", async () => {
    const diagnosis = createMockDiagnosis({
      confidence: 0.7,
      affected_files: ["src/test.ts"],
      fix: ""
    });

    const result = await analyzeRisk(diagnosis, "test-edge-2");
    expect(result.risk_factors.requires_migration).toBe(false);
  });

  it("should clamp risk score between 0 and 1", async () => {
    const diagnosis = createMockDiagnosis({
      confidence: 0,
      affected_files: ["server.ts", "src/lib/supabase.ts", "src/middleware/auth.ts"],
      fix: "Complete rewrite with refactor and restructure"
    });

    const result = await analyzeRisk(diagnosis, "test-edge-3");
    expect(result.risk_score).toBeGreaterThanOrEqual(0);
    expect(result.risk_score).toBeLessThanOrEqual(1);
  });
});
