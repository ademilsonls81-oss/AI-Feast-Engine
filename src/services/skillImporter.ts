import { supabase } from "../lib/supabase.js";
import { NormalizedSkill } from "./skillNormalizer.js";

export interface ValidatedSkill {
  skill: NormalizedSkill;
  risk_level: "low" | "medium" | "high";
  score: number;
  warnings: string[];
  approved: boolean;
}

export interface ImportReport {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  details: {
    inserted: string[];
    updated: string[];
    skipped: { name: string; reason: string }[];
  };
}

export async function importSkills(
  validatedSkills: ValidatedSkill[]
): Promise<ImportReport> {
  const report: ImportReport = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    details: { inserted: [], updated: [], skipped: [] }
  };

  // Filtrar apenas aprovados com score >= 0.6
  const approved = validatedSkills.filter(
    s => s.approved && s.score >= 0.6
  );

  for (const validated of approved) {
    const skill = validated.skill;

    try {
      // REGRA: repo_url já existe com slug diferente → skip
      if (skill.repo_url) {
        const { data: existingByUrl } = await supabase
          .from("skills")
          .select("slug")
          .eq("repo_url", skill.repo_url)
          .single();

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
      const { data: existing } = await supabase
        .from("skills")
        .select("*")
        .eq("slug", skill.slug)
        .single();

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
        // REGRA: slug novo → INSERT com is_active: false, source: 'github'
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
            is_active: false,
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
        }
      }
    } catch (err: any) {
      report.errors.push(`Unexpected error for "${skill.name}": ${err.message}`);
    }
  }

  return report;
}
