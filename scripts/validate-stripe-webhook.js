/**
 * Stripe Webhook Validator
 * Verifica se o endpoint está configurado corretamente
 */

const WEBHOOK_URL = 'https://api.aifeastengine.com/api/stripe-webhook';
const HEALTH_URL = 'https://api.aifeastengine.com/api/health';

async function checkHealth() {
  console.log('🏥 Verificando saúde do backend...');
  try {
    const res = await fetch(HEALTH_URL);
    const data = await res.json();
    if (data.status === 'alive') {
      console.log('   ✅ Backend está rodando');
      return true;
    }
  } catch (e) {
    console.log('   ❌ Backend não responde');
  }
  return false;
}

async function checkWebhookEndpoint() {
  console.log('');
  console.log('🔍 Verificando endpoint do webhook...');
  
  // Teste 1: GET (deve retornar 405 ou similar, já que é POST-only)
  try {
    const res = await fetch(WEBHOOK_URL, { method: 'GET' });
    console.log(`   GET: ${res.status} ${res.statusText}`);
    
    // Se retornou 200 com HTML, o Express não está roteando corretamente
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      console.log('   ⚠️  GET retornou HTML (SPA fallback)');
      console.log('   ℹ️  Isso é normal - endpoint é POST-only');
    }
  } catch (e) {
    console.log(`   ❌ Erro: ${e.message}`);
  }

  // Teste 2: POST sem assinatura (deve falhar)
  console.log('');
  console.log('📝 Testando POST sem assinatura...');
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    });
    console.log(`   Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log(`   Resposta: ${text.substring(0, 100)}`);
    
    if (res.status === 200 && text.includes('received')) {
      console.log('   ⚠️  Aceitou sem assinatura (webhook secret pode não estar configurado)');
    } else if (res.status === 400) {
      console.log('   ✅ Rejeitou corretamente (espera assinatura)');
    }
  } catch (e) {
    console.log(`   ❌ Erro: ${e.message}`);
  }
}

async function checkStripeConfig() {
  console.log('');
  console.log('⚙️  Verificando configuração Stripe...');
  console.log('');
  console.log('Para validar completamente, você precisa:');
  console.log('');
  console.log('1️⃣  Obter o STRIPE_WEBHOOK_SECRET do Stripe Dashboard');
  console.log('    → https://dashboard.stripe.com/test/webhooks');
  console.log('');
  console.log('2️⃣  Executar teste com secret:');
  console.log('    $env:STRIPE_WEBHOOK_SECRET="whsec_xxx"');
  console.log('    node scripts/test-stripe-webhook.js');
  console.log('');
  console.log('3️⃣  OU usar Stripe CLI:');
  console.log('    stripe listen --forward-to https://api.aifeastengine.com/api/stripe-webhook');
  console.log('    stripe trigger checkout.session.completed');
}

// Executar todas as verificações
console.log('═══════════════════════════════════════════════════════');
console.log('   STRIPE WEBHOOK VALIDATOR - AI FEAST ENGINE');
console.log('═══════════════════════════════════════════════════════');
console.log('');

const isAlive = await checkHealth();
if (isAlive) {
  await checkWebhookEndpoint();
  await checkStripeConfig();
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Backend está ativo. Pronto para teste de webhook.');
  console.log('═══════════════════════════════════════════════════════');
} else {
  console.log('');
  console.log('❌ Backend não está respondendo. Verifique o Render Dashboard.');
}
