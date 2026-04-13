/**
 * Seeder de Skills Curadas
 * 
 * Lê o arquivo seed-skills.json e gera SQL para inserção no banco.
 * Uso: node scripts/seed-skills.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const skills = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'seed-skills.json'), 'utf8')
).seeded_skills;

console.log(`\n🌱 Seeder: ${skills.length} skills curadas prontas para importação\n`);

skills.forEach((skill, i) => {
  console.log(`  ${i + 1}. ${skill.name.padEnd(35)} [${skill.category.padEnd(12)}] ${skill.slug}`);
});

console.log('\n📋 Para inserir no banco, execute o SQL abaixo no Supabase Dashboard:\n');

const insertSQL = skills.map((skill) => {
  const tags = skill.tags.map(t => `'${t}'`).join(', ');
  return `('${skill.id}', '${skill.name.replace(/'/g, "''")}', '${skill.slug}', '${skill.description.replace(/'/g, "''")}', '${skill.long_description.replace(/'/g, "''")}', '${skill.category}', ARRAY[${tags}], '${skill.source}', '${skill.repo_url}', 0, false, true, '${skill.risk_level}', '${skill.install_command}', '${skill.run_command}')`;
}).join(',\n');

console.log(`-- ==========================================
-- INSERT: ${skills.length} Curated Skills from GitHub
-- ==========================================

INSERT INTO public.skills (id, name, slug, description, long_description, category, tags, source, repo_url, stars, verified, is_active, risk_level, install_command, run_command)
VALUES
${insertSQL}

ON CONFLICT (id) DO NOTHING;

-- Verificação
SELECT 
  source,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active = true) as active,
  COUNT(*) FILTER (WHERE verified = true) as verified,
  category,
  COUNT(*) FILTER (WHERE category = s.category) as per_category
FROM public.skills s
GROUP BY source, category
ORDER BY source, category;
`);
