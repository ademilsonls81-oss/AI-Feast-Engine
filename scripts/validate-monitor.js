/**
 * Autonomous System v2 — Validation Script
 * 
 * Simulates 5 errors to test the monitor threshold trigger.
 * 
 * Usage:
 *   node scripts/validate-monitor.js
 * 
 * Or with custom count:
 *   node scripts/validate-monitor.js 7
 */

import { supabase } from "../src/lib/supabase.js";
import { checkErrorThreshold } from "../src/autonomous/monitor.js";

const errorCount = parseInt(process.argv[2]) || 5;

console.log("\n═══════════════════════════════════════════════════════");
console.log("   AUTONOMOUS SYSTEM v2 — VALIDATION");
console.log("═══════════════════════════════════════════════════════\n");

async function simulateErrors(count) {
  console.log(`📝 Inserting ${count} test errors into system_errors...\n`);

  const errors = [];
  for (let i = 1; i <= count; i++) {
    errors.push({
      error_type: i % 2 === 0 ? "api_error" : "db_error",
      source: i % 3 === 0 ? "webhook" : "server",
      message: `Test error #${i} — Simulated for monitor validation`,
      severity: i === count ? "critical" : "error",
      endpoint: i % 2 === 0 ? "/api/feed" : "/api/stripe-webhook",
      http_status: i % 2 === 0 ? 500 : 503,
      metadata: { test: true, iteration: i }
    });
  }

  const { data, error } = await supabase.from("system_errors").insert(errors).select();

  if (error) {
    console.error(`❌ Failed to insert errors: ${error.message}`);
    console.log("\n⚠️  Make sure migration 011 has been applied to Supabase.");
    return false;
  }

  console.log(`✅ ${data.length} errors inserted successfully.\n`);
  console.log("🔍 Running threshold check...\n");

  await checkErrorThreshold();

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("   VALIDATION COMPLETE");
  console.log("═══════════════════════════════════════════════════════\n");

  if (count >= 5) {
    console.log("✅ Expected: 🚨 Monitor alert (>= 5 errors)");
    console.log("   Check logs above for the alert message.");
  } else {
    console.log("✅ Expected: Below threshold message (< 5 errors)");
    console.log("   Check logs above for the 'below threshold' message.");
  }

  console.log("\n🧹 To clean up test errors, run:");
  console.log("   DELETE FROM system_errors WHERE metadata->>'test' = 'true';\n");

  return true;
}

simulateErrors(errorCount).catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
