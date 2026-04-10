#!/usr/bin/env node
/**
 * AI FEAST ENGINE - Uptime Monitor / Keep-Alive Script
 * Mantém o Render ativo fazendo ping a cada 5 minutos
 * Uso: npm run monitor:uptime
 */

const PING_URL = process.env.UPTIME_URL || 'https://ai-feast-engine.onrender.com/api/health';
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

console.log(`\n${BLUE}🍽️  AI FEAST ENGINE - Uptime Monitor${RESET}`);
console.log(`${BLUE}================================${RESET}\n`);
console.log(`📡 Ping URL: ${PING_URL}`);
console.log(`⏱️  Intervalo: 5 minutos`);
console.log(`🚀 Iniciando monitoramento...\n`);

let successCount = 0;
let failCount = 0;
let lastStatus = 'unknown';

async function ping() {
  const timestamp = new Date().toLocaleString('pt-BR');
  
  try {
    const response = await fetch(PING_URL, { 
      method: 'GET',
      headers: { 'User-Agent': 'AI-Feast-Engine-Uptime-Monitor/1.0' }
    });
    
    const data = await response.json();
    
    if (response.ok && data.status === 'alive') {
      successCount++;
      lastStatus = 'online';
      console.log(`[${timestamp}] ${GREEN}✅ ONLINE${RESET} (${response.status}) - ${data.status}`);
    } else {
      failCount++;
      lastStatus = 'warning';
      console.log(`[${timestamp}] ${YELLOW}⚠️  RESPONDENDO MAS ESTRANHO${RESET} (${response.status}) - ${JSON.stringify(data)}`);
    }
  } catch (error) {
    failCount++;
    lastStatus = 'offline';
    console.log(`[${timestamp}] ${RED}❌ OFFLINE${RESET} - ${error.message}`);
    console.log(`   ${YELLOW}💡 O Render pode estar "dormindo". Aguarde ou redeploy.${RESET}`);
  }
  
  // Resumo a cada 12 pings (1 hora)
  if ((successCount + failCount) % 12 === 0) {
    const total = successCount + failCount;
    const uptime = ((successCount / total) * 100).toFixed(1);
    console.log(`\n${BLUE}📊 RESUMO (Última hora):${RESET}`);
    console.log(`   Sucessos: ${GREEN}${successCount}${RESET}`);
    console.log(`   Falhas: ${failCount > 0 ? RED : GREEN}${failCount}${RESET}`);
    console.log(`   Uptime: ${uptime}%\n`);
  }
}

// Primeiro ping imediato
ping();

// Pings subsequentes
setInterval(ping, INTERVAL_MS);

// Graceful shutdown
process.on('SIGINT', () => {
  const total = successCount + failCount;
  const uptime = total > 0 ? ((successCount / total) * 100).toFixed(1) : '0';
  console.log(`\n\n${BLUE}📊 RESUMO FINAL DO MONITOR:${RESET}`);
  console.log(`   Total de pings: ${total}`);
  console.log(`   Sucessos: ${GREEN}${successCount}${RESET}`);
  console.log(`   Falhas: ${failCount > 0 ? RED : GREEN}${failCount}${RESET}`);
  console.log(`   Uptime: ${uptime}%`);
  console.log(`\n👋 Monitor encerrado.\n`);
  process.exit(0);
});
