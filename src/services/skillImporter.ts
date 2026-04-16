import { supabase } from "../lib/supabaseClient";
import { NormalizedSkill } from "./skillNormalizer.js";

export interface ValidatedSkill {
  skill: NormalizedSkill;
  risk_level: "low" | "medium" | "high";
  score: number;
  warnings: string[];
  approved: boolean;
}

export interface ImportReport {
  discovered: number;
  extracted: number;
  inserted: number;
  updated: number;
  skipped: number;
  auto_activated: number;
  errors: string[];
  details: {
    inserted: string[];
    updated: string[];
    skipped: { name: string; reason: string }[];
    auto_activated: string[];
  };
}

export async function importSkills(
  validatedSkills: ValidatedSkill[],
  extra: { discovered?: number; extracted?: number } = {}
): Promise<ImportReport> {
  const report: ImportReport = {
    discovered: extra.discovered || 0,
    extracted: extra.extracted || 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    auto_activated: 0,
    errors: [],
    details: { inserted: [], updated: [], skipped: [], auto_activated: [] }
  };

  // Filtrar apenas aprovados com score >= 0.75 (aumentado de 0.6 para melhor qualidade)
  const approved = validatedSkills.filter(
    s => s.approved && s.score >= 0.75
  );

  for (const validated of approved) {
    const skill = validated.skill;

    try {
      // REGRA: repo_url já existe com slug diferente → skip
      if (skill.repo_url) {
        const { data: existingByUrl, error: urlError } = await supabase
          .from("skills")
          .select("slug")
          .eq("repo_url", skill.repo_url)
          .maybeSingle();

        if (urlError) {
          report.errors.push(`Failed to check repo_url for "${skill.name}": ${urlError.message}`);
          continue;
        }

        if (existingByUrl && existingByUrl.slug !== skill.slug) {
          report.skipped++;
          report.details.skipped.push({
            name: skill.name,
            reason: `repo_url already used by slug "${existingByUrl.slug}"`
          });
          continue;
        }
      }

      // Verificar se skill já existe por slug
      const { data: existing, error: slugError } = await supabase
        .from("skills")
        .select("*")
        .eq("slug", skill.slug)
        .maybeSingle();

      if (slugError) {
        report.errors.push(`Failed to check slug for "${skill.name}": ${slugError.message}`);
        continue;
      }

      if (existing) {
        // REGRA: skill existente com source = 'manual' → SKIP (não sobrescrever)
        if (existing.source === "manual") {
          report.skipped++;
          report.details.skipped.push({
            name: skill.name,
            reason: "Manual skill — not overwriting curated content"
          });
          continue;
        }

        // REGRA: skill existente com source = 'github' → UPDATE parcial
        const { error } = await supabase
          .from("skills")
          .update({
            stars: skill.stars,
            validation_score: validated.score,
            updated_at: new Date().toISOString()
          })
          .eq("slug", skill.slug);

        if (error) {
          report.errors.push(`Failed to update "${skill.name}": ${error.message}`);
        } else {
          report.updated++;
          report.details.updated.push(skill.name);
        }
      } else {
        // REGRA: slug novo → INSERT
        // Auto-ativar se score >= 0.8, senão is_active: false (revisão manual)
        const autoActivate = validated.score >= 0.8;
        const { error } = await supabase
          .from("skills")
          .insert({
            id: skill.id,
            name: skill.name,
            slug: skill.slug,
            description: skill.description,
            long_description: skill.long_description,
            category: skill.category,
            tags: skill.tags,
            source: "github",
            repo_url: skill.repo_url || null,
            stars: skill.stars,
            validation_score: validated.score,
            risk_level: validated.risk_level,
            verified: false,
            is_active: autoActivate,
            input_schema: null,
            output_schema: null,
            code: null,
            install_command: `npx aifeast ${skill.slug}`,
            run_command: `npx aifeast run ${skill.slug}`
          });

        if (error) {
          // Unique violation não é erro crítico — pode ser race condition
          if (error.code === "23505") {
            report.skipped++;
            report.details.skipped.push({
              name: skill.name,
              reason: `Duplicate: ${error.details || error.message}`
            });
          } else {
            report.errors.push(`Failed to insert "${skill.name}": ${error.message}`);
          }
        } else {
          report.inserted++;
          report.details.inserted.push(skill.name);
          if (autoActivate) {
            report.auto_activated++;
            report.details.auto_activated.push(skill.name);
          }
        }
      }
    } catch (err: any) {
      report.errors.push(`Unexpected error for "${skill.name}": ${err.message}`);
    }
  }

  return report;
}
