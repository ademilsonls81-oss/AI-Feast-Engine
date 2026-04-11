#!/usr/bin/env node
/**
 * Verifica se os posts recentes foram processados com JSON válido
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://liqutcjzzrqstivvfele.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcXV0Y2p6enJxc3RpdnZmZWxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5ODAzNiwiZXhwIjoyMDkxMDc0MDM2fQ.CEwxEeOB2CoAF0JyreovFYhU4Ibc03np8RgU6B6SiP0';

const supabase = createClient(supabaseUrl, supabaseKey);

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

console.log(`\n${BLUE}🔍 Verificando JSON parsing dos posts recentes...${RESET}\n`);

// Posts processados APÓS a correção (últimos 20 published)
const { data: recentPosts, error } = await supabase
  .from('posts')
  .select('*')
  .eq('status', 'published')
  .order('created_at', { ascending: false })
  .limit(20);

if (error || !recentPosts) {
  console.log(`${RED}❌ Erro: ${error?.message}${RESET}\n`);
  process.exit(1);
}

console.log(`${GREEN}✅ ${recentPosts.length} posts recentes analisados${RESET}\n`);

let jsonOk = 0;
let jsonFail = 0;

recentPosts.forEach((post, i) => {
  const hasValidSummary = post.summary && post.summary.length > 5 && !post.summary.startsWith('Resumo em') && !post.summary.startsWith('Aqui está') && !post.summary.startsWith('##');
  const hasValidTranslations = post.translations && typeof post.translations === 'object' && Object.keys(post.translations).length >= 8;
  
  const isValid = hasValidSummary && hasValidTranslations;
  
  if (isValid) {
    jsonOk++;
    console.log(`${i + 1}. ✅ [${post.category}] ${post.title?.substring(0, 50)}...`);
  } else {
    jsonFail++;
    console.log(`${i + 1}. ${RED}❌ [${post.category}] ${post.title?.substring(0, 50)}...${RESET}`);
    if (!hasValidSummary) console.log(`   → Resumo inválido: "${post.summary?.substring(0, 50)}"`);
    if (!hasValidTranslations) console.log(`   → Traduções inválidas: ${typeof post.translations}`);
  }
});

console.log(`\n${'═'.repeat(60)}`);
console.log(`${BLUE}📊 RESULTADO DO TESTE JSON${RESET}`);
console.log(`${'═'.repeat(60)}\n`);

console.log(`✅ JSON válido:    ${GREEN}${jsonOk}/${recentPosts.length}${RESET} (${((jsonOk / recentPosts.length) * 100).toFixed(1)}%)`);
console.log(`❌ JSON inválido:  ${RED}${jsonFail}/${recentPosts.length}${RESET} (${((jsonFail / recentPosts.length) * 100).toFixed(1)}%)`);

if (jsonOk === recentPosts.length) {
  console.log(`\n${GREEN}🎉 TODOS OS POSTS RECENTES COM JSON VÁLIDO!${RESET}\n`);
} else if (jsonOk > jsonFail) {
  console.log(`\n${YELLOW}⚠️  Maioria OK, mas alguns ainda com erro${RESET}\n`);
} else {
  console.log(`\n${RED}🚨 Correção do prompt ainda não teve efeito${RESET}\n`);
}

// Status dos pending
const { data: pendingPosts } = await supabase
  .from('posts')
  .select('id, category, created_at')
  .eq('status', 'pending')
  .order('created_at', { ascending: false })
  .limit(10);

if (pendingPosts && pendingPosts.length > 0) {
  console.log(`${BLUE}⏳ Posts pending (serão processados em breve):${RESET}`);
  pendingPosts.forEach(p => {
    console.log(`   ⏳ [${p.category}] ${p.id.substring(0, 8)}... (${new Date(p.created_at).toLocaleTimeString()})`);
  });
  console.log(`\n${YELLOW}💡 A AutoQueue processará esses posts nos próximos minutos${RESET}\n`);
}
