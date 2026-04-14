/**
 * Stripe Webhook Test Script - v3 (ES Modules)
 * Testa o webhook de produção com validação de assinatura
 * 
 * USO:
 *   1. Com Stripe CLI: stripe trigger checkout.session.completed
 *   2. Com secret local: node test-stripe-webhook.js
 *   3. Teste simples de conectividade: node test-stripe-webhook.js --ping
 */

import crypto from 'crypto';

// Configuração
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://api.aifeastengine.com/api/stripe-webhook';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Modo de teste
const args = process.argv.slice(2);
const isPing = args.includes('--ping');

// Evento de teste (checkout.session.completed)
const testEvent = {
  id: 'evt_test_' + Date.now(),
  object: 'event',
  api_version: '2023-10-16',
  created: Math.floor(Date.now() / 1000),
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_' + Date.now(),
      object: 'checkout.session',
      mode: 'subscription',
      status: 'complete',
      client_reference_id: 'user-test-123',
      customer: 'cus_test_' + Date.now(),
      customer_email: 'test@example.com',
      metadata: {
        userId: 'user-test-123'
      },
      subscription: 'sub_test_' + Date.now(),
      amount_total: 990,
      currency: 'usd'
    }
  }
};

// Assinar o payload (simula a assinatura do Stripe)
function signPayload(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

// Teste 1: Ping simples (só verifica se endpoint está vivo)
async function pingTest() {
  console.log('🏓 Teste de conectividade (PING)...');
  console.log(`📡 Endpoint: ${WEBHOOK_URL}`);
  console.log('');

  try {
    const response = await fetch(WEBHOOK_URL, { method: 'GET' });
    console.log(`📥 Status: ${response.status} ${response.statusText}`);
    const body = await response.text();
    console.log(`📦 Resposta: ${body.substring(0, 200)}`);
    console.log('');
    console.log('⚠️  Nota: Webhook POST requer assinatura válida.');
    console.log('   Use "node test-stripe-webhook.js" para teste completo.');
  } catch (error) {
    console.log('❌ FALHA NA CONEXÃO:');
    console.log(`   ${error.message}`);
  }
}

// Teste 2: Envio completo com assinatura
async function fullTest() {
  if (!WEBHOOK_SECRET || WEBHOOK_SECRET.includes('placeholder')) {
    console.log('⚠️  STRIPE_WEBHOOK_SECRET não definida ou ainda é placeholder!');
    console.log('');
    console.log('Execute com a variável de ambiente:');
    console.log('  STRIPE_WEBHOOK_SECRET=whsec_xxxx node test-stripe-webhook.js');
    console.log('');
    console.log('OU faça o teste com Stripe CLI:');
    console.log('  stripe listen --forward-to http://localhost:3000/api/stripe-webhook');
    console.log('  stripe trigger checkout.session.completed');
    console.log('');
    console.log('Deseja fazer apenas um teste de conectividade?');
    console.log('');
    
    return pingTest();
  }

  console.log('🧪 Testando Stripe Webhook (assinatura completa)...');
  console.log(`📡 Endpoint: ${WEBHOOK_URL}`);
  console.log(`🔑 Secret: ${WEBHOOK_SECRET.substring(0, 12)}...`);
  console.log('');

  const payload = JSON.stringify(testEvent);
  const signature = signPayload(payload, WEBHOOK_SECRET);

  console.log('📦 Evento:', testEvent.type);
  console.log('📋 Session ID:', testEvent.data.object.id);
  console.log('👤 User ID:', testEvent.data.object.client_reference_id);
  console.log('');
  console.log('🔐 Signature:', signature.substring(0, 50) + '...');
  console.log('');

  try {
    console.log('📤 Enviando requisição POST...');
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature
      },
      body: payload
    });

    console.log('');
    console.log('📥 Resposta recebida:');
    console.log(`   Status: ${response.status} ${response.statusText}`);

    const responseBody = await response.text();
    console.log(`   Body: ${responseBody.substring(0, 300)}`);
    console.log('');

    if (response.status === 200) {
      console.log('✅ SUCESSO! Webhook processado corretamente.');
      console.log('   O checkout.session.completed foi recebido e validado.');
    } else if (response.status === 400) {
      console.log('❌ ERRO 400: Assinatura inválida ou erro no processamento.');
      console.log('   Possíveis causas:');
      console.log('   - STRIPE_WEBHOOK_SECRET incorreto');
      console.log('   - Timestamp expirado (>5 min)');
      console.log('   - Payload malformado');
    } else if (response.status >= 500) {
      console.log(`❌ ERRO DO SERVIDOR (${response.status}):`);
      console.log('   Verifique os logs no Render Dashboard.');
    } else {
      console.log(`⚠️  ERRO ${response.status}: Verifique configuração.`);
    }
  } catch (error) {
    console.log('❌ FALHA NA CONEXÃO:');
    console.log(`   ${error.message}`);
    console.log('');
    console.log('Possíveis causas:');
    console.log('   - Backend não está rodando no Render');
    console.log('   - URL do webhook está incorreta');
    console.log('   - Problema de rede/firewall');
  }
}

// Executar teste apropriado
console.log('═══════════════════════════════════════════');
console.log('   STRIPE WEBHOOK TEST - AI FEAST ENGINE');
console.log('═══════════════════════════════════════════');
console.log('');

if (isPing) {
  pingTest();
} else {
  fullTest();
}
