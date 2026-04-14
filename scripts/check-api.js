// Check API alignment
import fs from 'fs';
const data = JSON.parse(fs.readFileSync(process.env.TEMP + '/skills_api.json', 'utf8'));
const skills = data.skills;
console.log('\n=== API /api/skills ===');
console.log('TOTAL:', data.total);
console.log('CATEGORIES:', JSON.stringify(data.categories));

const active = skills.filter(x => x.is_active);
console.log('ACTIVE:', active.length);

const bySrc = {};
skills.forEach(x => {
  if (!bySrc[x.source]) bySrc[x.source] = [];
  bySrc[x.source].push(x);
});
Object.keys(bySrc).forEach(src => {
  const sk = bySrc[src];
  console.log(`\n  [${src}] Total:${sk.length} Active:${sk.filter(x => x.is_active).length} Verified:${sk.filter(x => x.verified).length}`);
  sk.forEach(s => {
    const sc = (s.validation_score || 'N/A').toString();
    const ic = (s.is_active ? '✅' : '⬜') + (s.verified ? '⭐' : ' ');
    console.log(`    [${ic}] ${s.slug.padEnd(45)} score:${sc.padEnd(5)} | ${s.category} | repo:${s.repo_url || 'manual'}`);
  });
});

console.log('\n=== INACTIVE ===');
skills.filter(x => !x.is_active).forEach(x => console.log(`  ${x.slug} (${x.source})`));
if (skills.filter(x => !x.is_active).length === 0) console.log('  (none)');
