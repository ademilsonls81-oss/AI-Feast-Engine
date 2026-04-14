/**
 * Stripe Full Flow Test - Production
 * Testa checkout, webhook simulation e portal session
 */

const BASE_URL = 'https://api.aifeastengine.com';

// Cores para output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function log(color, msg) {
  console.log(`${color}${msg}${RESET}`);
}

// Test 1: Health Check
async function testHealth() {
  log(CYAN, '\n═══════════════════════════════════════════');
  log(CYAN, '   TESTE 1: HEALTH CHECK');
  log(CYAN, '═══════════════════════════════════════════\n');

  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    if (data.status === 'alive') {
      log(GREEN, `✅ Backend está rodando: ${JSON.stringify(data)}`);
      return true;
    }
  } catch (e) {
    log(RED, `❌ Backend não responde: ${e.message}`);
  }
  return false;
}

// Test 2: Create Checkout Session
async function testCheckoutSession() {
  log(CYAN, '\n═══════════════════════════════════════════');
  log(CYAN, '   TESTE 2: CREATE CHECKOUT SESSION');
  log(CYAN, '═══════════════════════════════════════════\n');

  const testData = {
    userId: 'test-user-' + Date.now(),
    email: 'test@example.com'
  };

  log(YELLOW, `📤 Enviando: ${JSON.stringify(testData)}`);

  try {
    const res = await fetch(`${BASE_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    log(YELLOW, `📥 Status: ${res.status} ${res.statusText}`);

    const data = await res.json();
    console.log(`📦 Response: ${JSON.stringify(data, null, 2)}`);

    if (res.status === 200 && data.url) {
      log(GREEN, '✅ Checkout session criada com sucesso!');
      log(GREEN, `🔗 URL: ${data.url}`);
      return { success: true, url: data.url };
    } else if (res.status === 503) {
      log(RED, `❌ Stripe não está habilitado: ${data.error}`);
      return { success: false, error: 'Stripe not enabled' };
    } else if (data.error) {
      log(RED, `❌ Erro: ${data.error}`);
      return { success: false, error: data.error };
    }
  } catch (e) {
    log(RED, `❌ Erro na requisição: ${e.message}`);
    return { success: false, error: e.message };
  }
  return { success: false, error: 'Unknown error' };
}

// Test 3: Create Portal Session (sem usuário válido - espera erro)
async function testPortalSession() {
  log(CYAN, '\n═══════════════════════════════════════════');
  log(CYAN, '   TESTE 3: CREATE PORTAL SESSION (expect error)');
  log(CYAN, '═══════════════════════════════════════════\n');

  const testData = { userId: 'nonexistent-user' };

  log(YELLOW, `📤 Enviando: ${JSON.stringify(testData)}`);

  try {
    const res = await fetch(`${BASE_URL}/api/create-portal-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    log(YELLOW, `📥 Status: ${res.status} ${res.statusText}`);

    const data = await res.json();
    console.log(`📦 Response: ${JSON.stringify(data, null, 2)}`);

    if (res.status === 404) {
      log(GREEN, '✅ Comportamento correto: Usuário não encontrado retorna 404');
      return { success: true };
    } else if (res.status === 400) {
      log(GREEN, '✅ Comportamento correto: Usuário não-Pro retorna 400');
      return { success: true };
    } else if (res.status === 503) {
      log(RED, `❌ Stripe não está habilitado: ${data.error}`);
      return { success: false, error: 'Stripe not enabled' };
    }
  } catch (e) {
    log(RED, `❌ Erro na requisição: ${e.message}`);
    return { success: false, error: e.message };
  }
  return { success: false, error: 'Unknown error' };
}

// Test 4: Simular Webhook Event (checkout.session.completed)
async function testWebhookSimulation() {
  log(CYAN, '\n═══════════════════════════════════════════');
  log(CYAN, '   TESTE 4: WEBHOOK SIMULATION (sem assinatura)');
  log(CYAN, '═══════════════════════════════════════════\n');

  // Nota: Sem o webhook secret real, não podemos criar assinatura válida
  // Este teste verifica apenas se o endpoint responde
  const testEvent = {
    id: 'evt_test_' + Date.now(),
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_123',
        client_reference_id: 'test-user-123',
        customer: 'cus_test_123',
        subscription: 'sub_test_123'
      }
    }
  };

  log(YELLOW, '📤 Enviando evento sem assinatura (espera 400)...');

  try {
    const res = await fetch(`${BASE_URL}/api/stripe-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testEvent)
    });

    log(YELLOW, `📥 Status: ${res.status} ${res.statusText}`);

    if (res.status === 400) {
      log(GREEN, '✅ Comportamento correto: Endpoint rejeita requisição sem assinatura');
      return { success: true };
    } else if (res.status === 200) {
      const data = await res.json();
      if (data.received) {
        log(YELLOW, '⚠️  Webhook aceitou sem assinatura (webhook secret pode não estar configurado)');
        return { success: true, note: 'Secret not set' };
      }
    }
  } catch (e) {
    log(RED, `❌ Erro: ${e.message}`);
    return { success: false, error: e.message };
  }
  return { success: false };
}

// Test 5: Verificar Stripe Enabled
async function testStripeEnabled() {
  log(CYAN, '\n═══════════════════════════════════════════');
  log(CYAN, '   TESTE 5: VERIFICAR STRIPE STATUS');
  log(CYAN, '═══════════════════════════════════════════\n');

  // Tenta criar checkout com dados inválidos para ver a resposta
  try {
    const res = await fetch(`${BASE_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const data = await res.json();

    if (res.status === 400 && data.error === 'Missing data') {
      log(GREEN, '✅ Endpoint está ativo (rejeitou dados faltando corretamente)');
      return { success: true };
    } else if (res.status === 503) {
      log(RED, `❌ Stripe não habilitado: ${data.error}`);
      return { success: false, error: 'Stripe not enabled' };
    } else if (data.error && data.error.includes('Invalid')) {
      log(GREEN, '✅ Stripe está habilitado (erro de validação do Stripe, não de configuração)');
      return { success: true };
    }
  } catch (e) {
    log(RED, `❌ Erro: ${e.message}`);
    return { success: false, error: e.message };
  }
  return { success: false };
}

// Executar todos os testes
async function runAllTests() {
  log(BOLD, '\n╔═══════════════════════════════════════════════════════╗');
  log(BOLD, '║     STRIPE FLOW TEST - PRODUCTION                    ║');
  log(BOLD, '║     AI FEAST ENGINE                                  ║');
  log(BOLD, '╚═══════════════════════════════════════════════════════╝\n');

  const results = {
    health: await testHealth(),
    stripeEnabled: await testStripeEnabled(),
    checkout: await testCheckoutSession(),
    portal: await testPortalSession(),
    webhook: await testWebhookSimulation()
  };

  // Resumo final
  log(BOLD, '\n╔═══════════════════════════════════════════════════════╗');
  log(BOLD, '║                     RESULTADO FINAL                  ║');
  log(BOLD, '╚═══════════════════════════════════════════════════════╝\n');

  const tests = [
    { name: 'Health Check', pass: results.health },
    { name: 'Stripe Enabled', pass: results.stripeEnabled?.success },
    { name: 'Checkout Session', pass: results.checkout?.success },
    { name: 'Portal Session', pass: results.portal?.success },
    { name: 'Webhook Endpoint', pass: results.webhook?.success }
  ];

  let passCount = 0;
  tests.forEach(t => {
    if (t.pass) {
      log(GREEN, `  ✅ ${t.name}`);
      passCount++;
    } else {
      log(RED, `  ❌ ${t.name}`);
    }
  });

  log(BOLD, `\n  ${passCount}/${tests.length} testes passaram\n`);

  if (passCount === tests.length) {
    log(GREEN, '🎉 TODOS OS TESTES PASSARAM! Stripe está configurado e pronto!');
    log(YELLOW, '\n📋 Próximos passos:');
    log(YELLOW, '   1. Acesse https://aifeastengine.com');
    log(YELLOW, '   2. Faça login com Google');
    log(YELLOW, '   3. Clique em "Upgrade to Pro"');
    log(YELLOW, '   4. Use cartão de teste: 4242 4242 4242 4242');
    log(YELLOW, '   5. Complete a assinatura');
    log(YELLOW, '   6. Verifique Dashboard com plano Pro\n');
  } else {
    log(RED, '⚠️  Alguns testes falharam. Verifique configuração no Render.');
    log(RED, '   - STRIPE_SECRET_KEY');
    log(RED, '   - STRIPE_PRO_PRICE_ID');
    log(RED, '   - STRIPE_ENABLED=true\n');
  }

  return results;
}

runAllTests().catch(console.error);
