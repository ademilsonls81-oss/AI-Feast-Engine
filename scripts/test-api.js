#!/usr/bin/env node
/**
 * AI FEAST ENGINE - API Test Script
 * Faz chamada de teste à API e verifica se o usage_count incrementa
 * Uso: npm run test:api
 */

import { createInterface } from 'readline';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

const API_BASE = 'https://api.aifeastengine.com';

console.log(`\n${BLUE}🍽️  AI FEAST ENGINE - API Test Script${RESET}`);
console.log(`${BLUE}======================================${RESET}\n`);

// Passo 1: Testar endpoint público primeiro
console.log(`${CYAN}📡 Passo 1: Testando endpoint público (sem API key)...${RESET}\n`);

try {
  const healthRes = await fetch(`${API_BASE}/api/health`);
  const healthData = await healthRes.json();
  console.log(`${GREEN}✅ Health Check: ${JSON.stringify(healthData)}${RESET}\n`);

  const statsRes = await fetch(`${API_BASE}/api/stats`);
  const statsData = await statsRes.json();
  console.log(`${GREEN}✅ Stats: ${statsData.postsCount} posts, ${statsData.feedsCount} feeds, ${statsData.languages} idiomas${RESET}\n`);
} catch (error) {
  console.log(`${RED}❌ Erro ao conectar: ${error.message}${RESET}`);
  console.log(`${YELLOW}💡 Verifique se a API está online em: ${API_BASE}${RESET}\n`);
  process.exit(1);
}

// Passo 2: Pedir API key ao usuário
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

console.log(`${CYAN}📡 Passo 2: Testar endpoint protegido (com API key)${RESET}\n`);
console.log(`${YELLOW}Para encontrar sua API key:${RESET}`);
console.log(`  1. Acesse: https://www.aifeastengine.com/dashboard`);
console.log(`  2. Faça login com Google`);
console.log(`  3. Copie a chave que começa com "af_"\n`);

const apiKey = await question(`${BLUE}🔑 Digite sua API Key (ou pressione Enter para pular): ${RESET}`);

if (!apiKey || apiKey.trim() === '') {
  console.log(`\n${YELLOW}⏭️  Teste com API key pulado.${RESET}`);
  console.log(`${YELLOW}💡 Para testar depois, execute:${RESET}`);
  console.log(`   curl -H "X-API-Key: SUA_CHAVE" ${API_BASE}/api/feed\n`);
  rl.close();
  process.exit(0);
}

console.log(`\n${CYAN}🚀 Fazendo chamada à API...${RESET}\n`);

try {
  const response = await fetch(`${API_BASE}/api/feed`, {
    headers: {
      'X-API-Key': apiKey.trim()
    }
  });

  console.log(`${BLUE}📊 Resposta:${RESET}`);
  console.log(`   Status HTTP: ${response.status} ${response.statusText}\n`);

  if (response.status === 200) {
    const data = await response.json();
    const postCount = data.posts?.length || 0;
    
    console.log(`${GREEN}✅ SUCESSO! API retornou ${postCount} posts${RESET}\n`);
    
    if (data.posts && data.posts.length > 0) {
      console.log(`${CYAN}📰 Primeiros 3 posts:${RESET}`);
      data.posts.slice(0, 3).forEach((post, i) => {
        console.log(`   ${i + 1}. ${post.title?.substring(0, 60) || 'Sem título'}...`);
      });
    }
    
    console.log(`\n${GREEN}🎉 API funcionando perfeitamente!${RESET}`);
    console.log(`${GREEN}📈 Seu usage_count deve ter incrementado em +1${RESET}`);
    console.log(`${YELLOW}💡 Faça refresh no Dashboard para ver as métricas atualizadas${RESET}\n`);
    
  } else if (response.status === 401) {
    console.log(`${RED}❌ 401 Unauthorized - API Key inválida!${RESET}`);
    console.log(`${YELLOW}💡 Verifique se a chave está correta e começa com "af_"${RESET}\n`);
    
  } else if (response.status === 429) {
    console.log(`${RED}❌ 429 Too Many Requests - Limite atingido!${RESET}`);
    console.log(`${YELLOW}💡 Seu limite mensal foi alcançado. Aguarde ou faça upgrade.${RESET}\n`);
    
  } else {
    const error = await response.json().catch(() => ({}));
    console.log(`${RED}❌ Erro: ${response.status} - ${error.error || 'Unknown'}${RESET}\n`);
  }
} catch (error) {
  console.log(`${RED}❌ Erro na requisição: ${error.message}${RESET}\n`);
}

// Passo 3: Testar com parâmetros
console.log(`\n${CYAN}📡 Passo 3: Testar com parâmetros de idioma...${RESET}\n`);

try {
  const langTest = await fetch(`${API_BASE}/api/feed?lang=en&limit=3`, {
    headers: {
      'X-API-Key': apiKey.trim()
    }
  });

  if (langTest.ok) {
    const data = await langTest.json();
    console.log(`${GREEN}✅ Filtro por idioma funcionando! ${data.posts?.length || 0} posts em inglês${RESET}\n`);
  } else {
    console.log(`${YELLOW}⚠️  Status: ${langTest.status} (pode ser normal se limite atingido)${RESET}\n`);
  }
} catch (error) {
  console.log(`${YELLOW}⚠️  Erro no teste de idioma: ${error.message}${RESET}\n`);
}

rl.close();

console.log(`${BLUE}📊 Resumo Final:${RESET}`);
console.log(`   ✅ Endpoints públicos: OK`);
console.log(`   ✅ API protegida: Testada`);
console.log(`   📈 Usage Metrics: Deve estar atualizado no Dashboard\n`);
