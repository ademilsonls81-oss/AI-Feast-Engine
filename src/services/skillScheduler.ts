import cron from "node-cron";
import { supabase } from "../lib/supabase.js";
import { discoverRepos } from "./githubDiscovery.js";
import { extractSkillsFromRepo } from "./skillExtractor.js";
import { normalizeSkill } from "./skillNormalizer.js";
import { validateSkill } from "./skillValidator.js";
import { importSkills } from "./skillImporter.js";

let pipelineRunning = false;

/**
 * Proteção contra execução simultânea (single-instance).
 * Usa variável em memória — funciona corretamente quando o app
 * roda em uma única instância (Render free tier).
 * Se escalar horizontalmente, implementar lock distribuído via
 * pg_try_advisory_lock ou tabela de lock no banco.
 */
export function isPipelineRunning(): boolean {
  return pipelineRunning;
}

export function setPipelineRunning(value: boolean): void {
  pipelineRunning = value;
}

export interface PipelineLog {
  id?: number;
  started_at: string;
  finished_at?: string;
  discovered: number;
  extracted: number;
  approved: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  triggered_by: "cron" | "manual";
}

export async function runImportPipeline(
  triggeredBy: "cron" | "manual" = "cron",
  dryRun: boolean = false
): Promise<PipelineLog> {
  // Proteção contra execução simultânea
  if (pipelineRunning && !dryRun) {
    throw new Error("Import already in progress");
  }

  const log: PipelineLog = {
    started_at: new Date().toISOString(),
    discovered: 0,
    extracted: 0,
    approved: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    triggered_by: triggeredBy
  };

  const groqApiKey = process.env.GROQ_API_KEY || "";

  try {
    if (!dryRun) pipelineRunning = true;
    console.log(`[Scheduler] Pipeline started${dryRun ? " (DRY RUN)" : ""} — triggered by: ${triggeredBy}`);

    // Timeout de segurança: 10 minutos para o pipeline completo
    const pipelineTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Pipeline timeout after 10 minutes")), 10 * 60 * 1000)
    );

    // 1. Discovery
    const repos = await Promise.race([discoverRepos(), pipelineTimeout]);
    log.discovered = repos.length;
    console.log(`[Scheduler] Discovered ${log.discovered} repos`);

    // 2. Extract + Normalize + Validate
    const validatedSkills: any[] = [];

    for (const repo of repos.slice(0, 5)) {
      const rawSkills = await extractSkillsFromRepo(repo);
      log.extracted += rawSkills.length;

      for (const raw of rawSkills.slice(0, 3)) {
        const normalized = normalizeSkill(raw);
        const result = await validateSkill(normalized, groqApiKey);
        validatedSkills.push(result);

        await new Promise(r => setTimeout(r, 300));
      }
    }

    const approved = validatedSkills.filter(s => s.approved);
    log.approved = approved.length;
    console.log(`[Scheduler] ${log.approved} skills approved out of ${validatedSkills.length} validated`);

    // 3. Import (ou dry run)
    if (dryRun) {
      log.skipped = validatedSkills.length - log.approved;
      log.inserted = log.approved; // Simulação
      console.log(`[Scheduler] Dry run complete: ${log.inserted} would be inserted, ${log.skipped} skipped`);
    } else {
      const report = await importSkills(approved, { discovered: log.discovered, extracted: log.extracted });
      log.inserted = report.inserted;
      log.updated = report.updated;
      log.skipped = report.skipped;
      log.errors = report.errors;
    }

  } catch (err: any) {
    log.errors.push(err.message);
    console.error(`[Scheduler] Pipeline error: ${err.message}`);
  } finally {
    log.finished_at = new Date().toISOString();
    if (!dryRun) pipelineRunning = false;

    // Salvar log no banco (exceto dry run)
    if (!dryRun) {
      try {
        await supabase
          .from("skill_import_logs")
          .insert({
            started_at: log.started_at,
            finished_at: log.finished_at,
            discovered: log.discovered,
            extracted: log.extracted,
            approved: log.approved,
            inserted: log.inserted,
            updated: log.updated,
            skipped: log.skipped,
            errors: log.errors, // JSONB — array diretamente, sem stringify
            triggered_by: log.triggered_by
          });
      } catch (err: any) {
        console.error(`[Scheduler] Failed to save import log: ${err.message}`);
      }
    }
  }

  return log;
}

export function startCronJob(): void {
  // Não rodar cron em ambiente de desenvolvimento
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    console.log("[Scheduler] Cron job disabled in development/test mode");
    return;
  }

  // Rodar diariamente às 03:00 UTC
  cron.schedule("0 3 * * *", async () => {
    console.log("[Scheduler] Cron trigger — starting import pipeline...");
    try {
      await runImportPipeline("cron");
    } catch (err: any) {
      console.error(`[Scheduler] Cron pipeline error: ${err.message}`);
    }
  }, {
    timezone: "UTC"
  });

  console.log("[Scheduler] Cron job registered — runs daily at 03:00 UTC");
}
