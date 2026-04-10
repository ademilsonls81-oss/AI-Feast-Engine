#!/usr/bin/env node
/**
 * AI FEAST ENGINE - Production Readiness Test
 * Valida todos os endpoints, CORS, SSL e funcionalidades críticas
 * Uso: npm run test:production
 */

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

const API_BASE = process.env.API_URL || 'https://api.aifeastengine.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.aifeastengine.com';
const API_KEY = process.env.TEST_API_KEY || null;

console.log(`\n${BLUE}🍽️  AI FEAST ENGINE - Production Readiness Test${RESET}`);
console.log(`${BLUE}=============================================${RESET}\n`);
console.log(`📡 API Base: ${API_BASE}`);
console.log(`🌐 Frontend: ${FRONTEND_URL}`);
console.log(`🔑 API Key: ${API_KEY ? '✅ Configurada' : '⚠️  Não configurada (defina TEST_API_KEY)'}`);
console.log();

let results = {
  passed: [],
  failed: [],
  warnings: []
};

async function test(name, fn) {
  process.stdout.write(`🧪 ${name}... `);
  try {
    const result = await fn();
    if (result.success) {
      console.log(`${GREEN}✅ PASS${RESET}`);
      results.passed.push({ name, detail: result.detail });
    } else {
      console.log(`${RED}❌ FAIL${RESET}`);
      results.failed.push({ name, detail: result.detail });
    }
  } catch (error) {
    console.log(`${RED}❌ ERROR${RESET}`);
    results.failed.push({ name, detail: error.message });
  }
}

// 1. Health Check
await test('Backend Health Check', async () => {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    const data = await res.json();
    
    if (res.ok && data.status === 'alive') {
      return { success: true, detail: `Status: ${data.status}` };
    }
    return { success: false, detail: `Unexpected response: ${JSON.stringify(data)}` };
  } catch (error) {
    return { success: false, detail: error.message };
  }
});

// 2. Stats Endpoint
await test('Stats Endpoint', async () => {
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    const data = await res.json();
    
    if (res.ok && data.postsCount > 0) {
      return { 
        success: true, 
        detail: `${data.postsCount} posts, ${data.feedsCount} feeds, ${data.languages} idiomas` 
      };
    }
    return { success: false, detail: `Unexpected: ${JSON.stringify(data)}` };
  } catch (error) {
    return { success: false, detail: error.message };
  }
});

// 3. Feed Endpoint (sem API Key - deve retornar 401)
await test('Feed Endpoint Proteção (401 sem key)', async () => {
  try {
    const res = await fetch(`${API_BASE}/api/feed`);
    
    if (res.status === 401) {
      return { success: true, detail: 'Protegido corretamente (401)' };
    }
    return { success: false, detail: `Status: ${res.status} (esperava 401)` };
  } catch (error) {
    return { success: false, detail: error.message };
  }
});

// 4. Feed Endpoint (com API Key - se disponível)
if (API_KEY) {
  await test('Feed Endpoint (com API Key)', async () => {
    try {
      const res = await fetch(`${API_BASE}/api/feed`, {
        headers: { 'X-API-Key': API_KEY }
      });
      
      if (res.ok) {
        const data = await res.json();
        const postCount = data.posts?.length || 0;
        return { success: true, detail: `${postCount} posts retornados` };
      }
      const error = await res.json().catch(() => ({}));
      return { success: false, detail: `Status ${res.status}: ${error.error || 'Unknown'}` };
    } catch (error) {
      return { success: false, detail: error.message };
    }
  });
}

// 5. CORS Check
await test('CORS Headers (preflight OPTIONS)', async () => {
  try {
    const res = await fetch(`${API_BASE}/api/feed`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://www.aifeastengine.com',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'X-API-Key'
      }
    });
    
    const corsOrigin = res.headers.get('Access-Control-Allow-Origin');
    const corsMethods = res.headers.get('Access-Control-Allow-Methods');
    
    if (corsOrigin) {
      return { success: true, detail: `Allow-Origin: ${corsOrigin}` };
    }
    return { success: false, detail: 'CORS headers não encontrados' };
  } catch (error) {
    return { success: false, detail: error.message };
  }
});

// 6. Stripe Webhook (deve existir)
await test('Stripe Webhook Endpoint', async () => {
  try {
    const res = await fetch(`${API_BASE}/api/stripe-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    
    // Deve retornar 200 mesmo sem webhook secret configurado
    if (res.ok || res.status === 400) {
      return { success: true, detail: `Status: ${res.status}` };
    }
    return { success: false, detail: `Status: ${res.status}` };
  } catch (error) {
    return { success: false, detail: error.message };
  }
});

// 7. Frontend SSL Check
await test('Frontend SSL Check', async () => {
  try {
    const res = await fetch(FRONTEND_URL);
    
    if (res.ok) {
      return { success: true, detail: `SSL OK, Status: ${res.status}` };
    }
    return { success: false, detail: `Status: ${res.status}` };
  } catch (error) {
    if (error.message.includes('SSL') || error.message.includes('certificate')) {
      return { success: false, detail: 'SSL não provisionado ainda' };
    }
    return { success: false, detail: error.message };
  }
});

// 8. Health endpoint do backend antigo (fallback)
await test('Backend Fallback (onrender.com)', async () => {
  try {
    const res = await fetch('https://ai-feast-engine.onrender.com/api/health');
    const data = await res.json();
    
    if (res.ok && data.status === 'alive') {
      return { success: true, detail: 'Fallback funcionando' };
    }
    return { success: false, detail: 'Fallback falhou' };
  } catch (error) {
    return { success: false, detail: error.message };
  }
});

// Resumo
console.log(`\n${'='.repeat(60)}`);
console.log(`${BLUE}📊 RESUMO DO TESTE DE PRODUÇÃO${RESET}`);
console.log(`${'='.repeat(60)}\n`);

if (results.passed.length > 0) {
  console.log(`${GREEN}✅ PASSOU (${results.passed.length}):${RESET}`);
  results.passed.forEach(({ name, detail }) => {
    console.log(`   ✓ ${name} - ${detail || ''}`);
  });
}

if (results.warnings.length > 0) {
  console.log(`\n${YELLOW}⚠️  ALERTAS (${results.warnings.length}):${RESET}`);
  results.warnings.forEach(({ name, detail }) => {
    console.log(`   ⚠ ${name} - ${detail || ''}`);
  });
}

if (results.failed.length > 0) {
  console.log(`\n${RED}❌ FALHOU (${results.failed.length}):${RESET}`);
  results.failed.forEach(({ name, detail }) => {
    console.log(`   ✗ ${name} - ${detail || ''}`);
  });
}

const total = results.passed.length + results.failed.length;
const passRate = total > 0 ? ((results.passed.length / total) * 100).toFixed(1) : 0;

console.log(`\n${'='.repeat(60)}`);
console.log(`📈 Taxa de Aprovação: ${passRate}% (${results.passed.length}/${total})`);

if (results.failed.length === 0) {
  console.log(`${GREEN}\n🎉 SISTEMA 100% PRONUTO PARA PRODUÇÃO!${RESET}\n`);
} else if (passRate >= 70) {
  console.log(`${YELLOW}\n⚠️  SISTEMA PARCIALMENTE PRONTO - Resolva as falhas acima${RESET}\n`);
} else {
  console.log(`${RED}\n🚨 SISTEMA NÃO ESTÁ PRONTO PARA PRODUÇÃO${RESET}\n`);
}

process.exit(results.failed.length > 0 ? 1 : 0);
