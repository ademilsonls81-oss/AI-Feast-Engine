/**
 * Autonomous System v2 — Fase 2: Monitor
 *
 * Scheduled monitor that checks error frequency and triggers
 * the autonomous loop when error thresholds are exceeded.
 *
 * Schedule: Every hour at minute 0 (0 * * * *)
 *
 * Logic:
 *   1. Delegate to runAutonomousLoop() for all autonomous phases
 *   2. Monitor only schedules/trigger the loop — does NOT execute phases directly
 *
 * In development (NODE_ENV !== 'production'), the cron is registered
 * but does NOT execute — only logs "Monitor agendado (pausado em dev)".
 */

import cron from "node-cron";
import { runAutonomousLoop } from "./loop.js";

// ==========================================
// CONFIGURATION
// ==========================================
const CRON_SCHEDULE = "0 * * * *"; // every hour at minute 0

// ==========================================
// CRON JOB INITIALIZATION
// ==========================================
/**
 * Start the monitor cron job.
 * In development mode, the cron is registered but paused.
 * In production, it runs every hour.
 */
export function startMonitor() {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    console.log("📋 [Monitor] Monitor agendado (pausado em dev). Para testar, execute triggerAutonomousLoop() manualmente.");
    // Register but don't start — provide manual test function
    return { triggerAutonomousLoop: runAutonomousLoop };
  }

  console.log(`📋 [Monitor] Starting monitor cron job (${CRON_SCHEDULE})...`);

  // Schedule the cron job to run the autonomous loop
  const task = cron.schedule(CRON_SCHEDULE, async () => {
    await runAutonomousLoop();
  }, {
    timezone: "UTC"
  });

  // Run once on startup to verify everything works
  console.log("[Monitor] Running initial autonomous loop...");
  runAutonomousLoop();

  return { task, triggerAutonomousLoop: runAutonomousLoop };
}

// Export for manual testing
export { runAutonomousLoop as triggerAutonomousLoop };
