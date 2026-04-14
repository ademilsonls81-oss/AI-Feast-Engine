// Stress test: 10 concurrent users, 3 rounds
const endpoints = [
  { url: 'https://api.aifeastengine.com/api/skills', name: 'GET /api/skills' },
  { url: 'https://api.aifeastengine.com/api/skills/code-reviewer', name: 'GET /api/skills/code-reviewer' },
  { url: 'https://api.aifeastengine.com/api/skills/secret-scanner', name: 'GET /api/skills/secret-scanner' },
  { url: 'https://api.aifeastengine.com/api/skills?source=github', name: 'GET /api/skills?source=github' },
  { url: 'https://api.aifeastengine.com/api/skills/search?q=analysis', name: 'GET /api/skills/search?q=analysis' },
  { url: 'https://api.aifeastengine.com/api/skills/search?q=security', name: 'GET /api/skills/search?q=security' },
  { url: 'https://api.aifeastengine.com/api/verified', name: 'GET /api/verified' },
  { url: 'https://api.aifeastengine.com/api/stats', name: 'GET /api/stats' },
  { url: 'https://api.aifeastengine.com/api/skills/trend-analyzer', name: 'GET /api/skills/trend-analyzer' },
  { url: 'https://api.aifeastengine.com/api/skills/blog-post-generator', name: 'GET /api/skills/blog-post-generator' }
];

async function runRound(round) {
  const promises = endpoints.map(async (ep) => {
    const start = Date.now();
    try {
      const res = await fetch(ep.url, { signal: AbortSignal.timeout(15000) });
      const elapsed = Date.now() - start;
      return { round, endpoint: ep.name, status: res.status, time: elapsed, error: null };
    } catch (err) {
      const elapsed = Date.now() - start;
      return { round, endpoint: ep.name, status: 0, time: elapsed, error: err.message };
    }
  });
  return Promise.all(promises);
}

async function main() {
  console.log('=== STRESS TEST: 10 concurrent endpoints, 3 rounds ===\n');
  const allResults = [];

  for (let r = 1; r <= 3; r++) {
    console.log(`Round ${r}/3...`);
    const results = await runRound(r);
    allResults.push(...results);
    results.forEach(r => {
      const icon = r.status >= 200 && r.status < 300 ? '✅' : r.status === 0 ? '❌' : '⚠️';
      console.log(`  ${icon} ${r.endpoint.padEnd(50)} ${r.status} ${r.time}ms${r.error ? ' — ' + r.error : ''}`);
    });
    console.log('');
  }

  const ok = allResults.filter(r => r.status >= 200 && r.status < 300);
  const errs = allResults.filter(r => r.status === 0);
  const warns = allResults.filter(r => r.status >= 400);
  const times = allResults.map(r => r.time).sort((a, b) => a - b);
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const max = Math.max(...times);
  const errorRate = ((errs.length / allResults.length) * 100).toFixed(1);

  console.log('=== SUMMARY ===');
  console.log(`Total requests: ${allResults.length}`);
  console.log(`Success (2xx): ${ok.length}`);
  console.log(`Errors (0/timeout): ${errs.length}`);
  console.log(`Warnings (4xx/5xx): ${warns.length}`);
  console.log(`\nLatency:`);
  console.log(`  Average: ${avg}ms`);
  console.log(`  p50: ${p50}ms`);
  console.log(`  p95: ${p95}ms`);
  console.log(`  p99: ${p99}ms`);
  console.log(`  Max: ${max}ms`);
  console.log(`\nError rate: ${errorRate}%`);

  const rate429 = warns.filter(r => r.status === 429);
  const rate500 = warns.filter(r => r.status === 500);
  if (rate429.length > 0) console.log(`\n⚠️  Rate limited (429): ${rate429.length} requests`);
  if (rate500.length > 0) console.log(`\n❌ Server errors (500): ${rate500.length} requests`);
  if (errs.length > 0) console.log(`\n❌ Connection errors: ${errs.length} requests`);

  console.log(`\nServer stability: ${errs.length === 0 && rate500.length === 0 ? '✅ STABLE' : '❌ UNSTABLE'}`);
}

main().catch(console.error);
