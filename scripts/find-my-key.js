#!/usr/bin/env node
/**
 * AI FEAST ENGINE - Find My API Key
 * Consulta o Supabase para encontrar a API key do usuário logado
 */

import { createClient } from '@supabase/supabase-js';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

const supabaseUrl = 'https://liqutcjzzrqstivvfele.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcXV0Y2p6enJxc3RpdnZmZWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTgwMzYsImV4cCI6MjA5MTA3NDAzNn0.deYQjqFEAkJu9zRowDNQsfTNw99RR9aMqnKeb8-Cuis';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log(`\n${BLUE}🍽️  AI FEAST ENGINE - Find My API Key${RESET}`);
console.log(`${BLUE}======================================${RESET}\n`);

console.log(`${CYAN}📡 Consultando banco de dados...${RESET}\n`);

try {
  // Primeiro testa a conexão
  const { data: tables, error: tableError } = await supabase
    .from('users')
    .select('*')
    .limit(1);
  
  if (tableError && tableError.message.includes('row-level security')) {
    console.log(`${YELLOW}⚠️  RLS (Row Level Security) está ativo no Supabase${RESET}`);
    console.log(`${YELLOW}💡 Isso significa que só pode ver seus próprios dados após login${RESET}\n`);
    console.log(`${GREEN}🔑 Para encontrar sua API Key:${RESET}\n`);
    console.log(`${CYAN}Opção 1 - Pelo Dashboard (recomendado):${RESET}`);
    console.log(`   1. Acesse: https://www.aifeastengine.com/dashboard`);
    console.log(`   2. Faça login com Google`);
    console.log(`   3. Sua API Key aparece no card "API Access"`);
    console.log(`   4. Clique no ícone de copiar ao lado da chave\n`);
    
    console.log(`${CYAN}Opção 2 - Pelo Supabase Dashboard:${RESET}`);
    console.log(`   1. Acesse: https://app.supabase.com`);
    console.log(`   2. Selecione seu projeto (liqutcjzzrqstivvfele)`);
    console.log(`   3. Vá para: Table Editor → users`);
    console.log(`   4. Copie o valor da coluna "api_key"\n`);
    
    console.log(`${GREEN}📋 Formato esperado da chave:${RESET}`);
    console.log(`   af_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\n`);
    process.exit(0);
  }

  if (tableError) {
    console.log(`${RED}❌ Erro ao consultar tabela users: ${tableError.message}${RESET}\n`);
    console.log(`${YELLOW}💡 Verifique se a tabela existe no Supabase${RESET}\n`);
  }

  // Busca todos os usuários e suas API keys
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, api_key, plan, usage_count, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.log(`${RED}❌ Erro ao consultar: ${error.message}${RESET}\n`);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log(`${YELLOW}⚠️  Nenhum usuário encontrado no banco!${RESET}`);
    console.log(`${YELLOW}💡 Faça login no dashboard primeiro${RESET}\n`);
    process.exit(0);
  }

  console.log(`${GREEN}✅ ${users.length} usuário(s) encontrado(s):${RESET}\n`);

  users.forEach((user, i) => {
    const num = i + 1;
    console.log(`${CYAN}━━━ Usuário ${num} ━━━${RESET}`);
    console.log(`   Email:        ${user.email || 'N/A'}`);
    console.log(`   User ID:      ${user.id}`);
    console.log(`   API Key:      ${GREEN}${user.api_key || '❌ SEM CHAVE'}${RESET}`);
    console.log(`   Plan:         ${user.plan || 'free'}`);
    console.log(`   Usage Count:  ${user.usage_count || 0}`);
    console.log(`   Created:      ${new Date(user.created_at).toLocaleDateString('pt-BR')}`);
    console.log(`\n`);
  });

  // Comando de teste pronto
  const userWithKey = users.find(u => u.api_key);
  if (userWithKey) {
    console.log(`${GREEN}🎉 Use este comando para testar:${RESET}\n`);
    console.log(`${YELLOW}curl -H "X-API-Key: ${userWithKey.api_key}" https://api.aifeastengine.com/api/feed${RESET}\n`);
    console.log(`${YELLOW}💡 Depois acesse o Dashboard e faça refresh para ver o Usage Metrics!${RESET}\n`);
  } else {
    console.log(`${RED}❌ Nenhum usuário com API key encontrada!${RESET}`);
    console.log(`${YELLOW}💡 Acesse o Dashboard e gere uma nova key${RESET}\n`);
  }

} catch (error) {
  console.log(`${RED}❌ Erro: ${error.message}${RESET}\n`);
  process.exit(1);
}
