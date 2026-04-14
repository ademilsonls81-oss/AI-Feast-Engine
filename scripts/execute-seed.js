// Executa o SQL do Bloco 1 via Supabase REST API
import fs from 'fs';

const SUPABASE_URL = 'https://liqutcjzzrqstivvfele.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcXV0Y2p6enJxc3RpdnZmZWxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5ODAzNiwiZXhwIjoyMDkxMDc0MDM2fQ.CEwxEeOB2CoAF0JyreovFYhU4Ibc03np8RgU6B6SiP0';

const sql = fs.readFileSync('C:/Users/user/Desktop/AI-Feast-Engine/supabase/migrations/010_skills_development.sql', 'utf8');

// Parse skills from SQL - extract each tuple
const skills = [];
const tupleRegex = /\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']*)',\s*'([^']*)',\s*'([^']+)',\s*ARRAY\[([^\]]+)\],\s*'([^']+)',\s*(true|false),\s*(true|false),\s*'([^']+)',\s*([\d.]+),\s*'([^']+)',\s*'([^']+)'\)/g;

let match;
while ((match = tupleRegex.exec(sql)) !== null) {
  skills.push({
    id: match[1],
    name: match[2],
    slug: match[3],
    description: match[4],
    long_description: match[5],
    category: match[6],
    tags: match[7].replace(/'/g, '').split(',').map(t => t.trim()),
    source: match[8],
    verified: match[9] === 'true',
    is_active: match[10] === 'true',
    risk_level: match[11],
    validation_score: parseFloat(match[12]),
    install_command: match[13],
    run_command: match[14]
  });
}

console.log(`Parsed ${skills.length} skills from SQL file`);
if (skills.length === 0) {
  console.error('ERROR: No skills parsed. Check regex.');
  process.exit(1);
}

// Insert in batches of 10
let totalInserted = 0;
let totalSkipped = 0;

for (let i = 0; i < skills.length; i += 10) {
  const batch = skills.slice(i, i + 10);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/skills`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(batch)
  });

  if (res.ok || res.status === 201) {
    totalInserted += batch.length;
    console.log(`  ✅ Batch ${Math.floor(i/10)+1}: ${batch.length} skills inserted`);
  } else {
    const err = await res.text();
    // Check for duplicate violations (some may already exist)
    if (err.includes('duplicate') || err.includes('Conflict')) {
      // Try one by one to find which ones are duplicates
      let inserted = 0;
      for (const skill of batch) {
        const singleRes = await fetch(`${SUPABASE_URL}/rest/v1/skills`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify([skill])
        });
        if (singleRes.ok || singleRes.status === 201) {
          inserted++;
        } else {
          totalSkipped++;
        }
      }
      totalInserted += inserted;
      console.log(`  ⚠️  Batch ${Math.floor(i/10)+1}: ${inserted} inserted, ${batch.length - inserted} skipped (duplicates)`);
    } else {
      console.error(`  ❌ Batch ${Math.floor(i/10)+1} FAILED (${res.status}):`, err.substring(0, 200));
    }
  }
}

console.log(`\n=== RESULT ===`);
console.log(`Total attempted: ${skills.length}`);
console.log(`Total inserted: ${totalInserted}`);
console.log(`Total skipped (duplicates): ${totalSkipped}`);
