#!/usr/bin/env node
/**
 * AI FEAST ENGINE - CORS Validation Test
 * Testa se CORS está funcionando corretamente com os domínios oficiais
 */

const API_BASE = 'https://api.aifeastengine.com';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

console.log(`\n${BLUE}🍽️  AI FEAST ENGINE - CORS Validation Test${RESET}\n`);

async function testCORS() {
  console.log('🧪 Testando CORS Preflight...');
  
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
    const corsHeaders = res.headers.get('Access-Control-Allow-Headers');
    const corsCredentials = res.headers.get('Access-Control-Allow-Credentials');

    console.log(`\n📊 Headers CORS Recebidos:`);
    console.log(`   Access-Control-Allow-Origin: ${corsOrigin || '❌ AUSENTE'}`);
    console.log(`   Access-Control-Allow-Methods: ${corsMethods || '❌ AUSENTE'}`);
    console.log(`   Access-Control-Allow-Headers: ${corsHeaders || '❌ AUSENTE'}`);
    console.log(`   Access-Control-Allow-Credentials: ${corsCredentials || '❌ AUSENTE'}`);

    if (corsOrigin && (corsOrigin.includes('aifeastengine.com') || corsOrigin === 'https://www.aifeastengine.com')) {
      console.log(`\n${GREEN}✅ CORS CONFIGURADO CORRETAMENTE!${RESET}`);
      console.log(`   Domínio permitido: ${corsOrigin}\n`);
      return true;
    } else {
      console.log(`\n${RED}❌ CORS NÃO CONFIGURADO!${RESET}`);
      console.log(`   Origem não permitida: ${corsOrigin}\n`);
      return false;
    }
  } catch (error) {
    console.log(`\n${RED}❌ ERRO NO TESTE CORS:${RESET} ${error.message}\n`);
    return false;
  }
}

async function testActualRequest() {
  console.log('🧪 Testando Requisição Real com CORS...');
  
  try {
    const res = await fetch(`${API_BASE}/api/feed`, {
      headers: {
        'Origin': 'https://www.aifeastengine.com'
      }
    });

    console.log(`   Status HTTP: ${res.status}`);
    
    if (res.status === 401) {
      console.log(`   ${GREEN}✅ PROTEGIDO CORRETAMENTE (401 - API Key necessária)${RESET}`);
      return true;
    } else if (res.ok) {
      const data = await res.json();
      console.log(`   ${GREEN}✅ REQUISIÇÃO BEM-SUCEDIDA${RESET}`);
      console.log(`   Posts retornados: ${data.posts?.length || 0}`);
      return true;
    } else {
      console.log(`   ${YELLOW}⚠️  STATUS INESPERADO${RESET}`);
      return false;
    }
  } catch (error) {
    console.log(`   ${RED}❌ ERRO: ${error.message}${RESET}`);
    return false;
  }
}

(async () => {
  const corsOk = await testCORS();
  const reqOk = await testActualRequest();

  console.log(`${'='.repeat(60)}`);
  console.log(`${BLUE}📊 RESUMO CORS${RESET}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Preflight: ${corsOk ? GREEN + '✅ PASS' + RESET : RED + '❌ FAIL' + RESET}`);
  console.log(`Request:   ${reqOk ? GREEN + '✅ PASS' + RESET : RED + '❌ FAIL' + RESET}`);
  
  if (corsOk && reqOk) {
    console.log(`\n${GREEN}🎉 CORS 100% FUNCIONAL!${RESET}\n`);
  } else {
    console.log(`\n${YELLOW}⚠️  Verifique configuração CORS no Render${RESET}\n`);
  }
})();
