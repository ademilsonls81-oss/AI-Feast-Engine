#!/usr/bin/env node
/**
 * AI FEAST ENGINE - Post Quality & Category Audit
 * Analisa todos os posts no banco e verifica:
 * - Distribuição por categoria
 * - Qualidade dos resumos (tamanho, idioma)
 * - Traduções completas (11 idiomas)
 * - Status (published, pending, error)
 * - Fontes RSS ativas
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://liqutcjzzrqstivvfele.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcXV0Y2p6enJxc3RpdnZmZWxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5ODAzNiwiZXhwIjoyMDkxMDc0MDM2fQ.CEwxEeOB2CoAF0JyreovFYhU4Ibc03np8RgU6B6SiP0';

const supabase = createClient(supabaseUrl, supabaseKey);

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

console.log(`\n${BLUE}🍽️  AI FEAST ENGINE - Post Quality & Category Audit${RESET}`);
console.log(`${BLUE}====================================================${RESET}\n`);

// 1. Buscar todos os posts
console.log(`${CYAN}📊 Buscando todos os posts do banco...${RESET}\n`);

const { data: posts, error: postsError } = await supabase
  .from('posts')
  .select('*')
  .order('created_at', { ascending: false });

if (postsError) {
  console.log(`${RED}❌ Erro ao buscar posts: ${postsError.message}${RESET}\n`);
  process.exit(1);
}

console.log(`${GREEN}✅ ${posts.length} posts encontrados${RESET}\n`);

// 2. Buscar feeds RSS
const { data: feeds } = await supabase
  .from('feeds')
  .select('*')
  .order('category');

// 3. Análise por categoria
console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
console.log(`${CYAN}📁 DISTRIBUIÇÃO POR CATEGORIA${RESET}`);
console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);

const categories = {};
posts.forEach(post => {
  const cat = post.category || 'Uncategorized';
  if (!categories[cat]) {
    categories[cat] = { total: 0, published: 0, pending: 0, error: 0, sources: new Set() };
  }
  categories[cat].total++;
  if (post.status === 'published') categories[cat].published++;
  else if (post.status === 'pending') categories[cat].pending++;
  else if (post.status === 'error') categories[cat].error++;
  if (post.source_id) categories[cat].sources.add(post.source_id);
});

Object.entries(categories).sort((a, b) => b[1].total - a[1].total).forEach(([cat, data]) => {
  const bar = '█'.repeat(Math.round((data.total / posts.length) * 30));
  const pct = ((data.total / posts.length) * 100).toFixed(1);
  console.log(`${GREEN}${cat.padEnd(15)}${RESET} ${bar.padEnd(30)} ${data.total} (${pct}%)`);
  console.log(`${' '.repeat(15)} ✅${data.published} | ⏳${data.pending} | ❌${data.error} | 📡${data.sources.size} fontes\n`);
});

// 4. Análise de status geral
console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
console.log(`${CYAN}📊 STATUS GERAL${RESET}`);
console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);

const statusCount = { published: 0, pending: 0, error: 0 };
posts.forEach(p => statusCount[p.status] = (statusCount[p.status] || 0) + 1);

console.log(`✅ Published:  ${GREEN}${statusCount.published}${RESET} (${((statusCount.published / posts.length) * 100).toFixed(1)}%)`);
console.log(`⏳ Pending:    ${YELLOW}${statusCount.pending}${RESET} (${((statusCount.pending / posts.length) * 100).toFixed(1)}%)`);
console.log(`❌ Error:      ${RED}${statusCount.error}${RESET} (${((statusCount.error / posts.length) * 100).toFixed(1)}%)`);

// 5. Análise de qualidade dos resumos
console.log(`\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
console.log(`${CYAN}📝 QUALIDADE DOS RESUMOS${RESET}`);
console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);

const publishedPosts = posts.filter(p => p.status === 'published');
const summaries = publishedPosts.filter(p => p.summary && p.summary.length > 10);
const emptySummaries = publishedPosts.filter(p => !p.summary || p.summary.length <= 10);

console.log(`✅ Com resumo:    ${GREEN}${summaries.length}${RESET}`);
console.log(`❌ Sem resumo:    ${RED}${emptySummaries.length}${RESET}`);

if (summaries.length > 0) {
  const avgLength = summaries.reduce((sum, p) => sum + p.summary.length, 0) / summaries.length;
  console.log(`📏 Tamanho médio: ${YELLOW}${avgLength.toFixed(0)} caracteres${RESET}`);
  
  // Verificar se estão em português
  const ptChars = summaries.filter(p => /[ãõáàâêéíóôúç]/i.test(p.summary)).length;
  console.log(`🇧🇷 Em português: ${GREEN}${ptChars}/${summaries.length}${RESET} (${((ptChars / summaries.length) * 100).toFixed(1)}%)`);
}

// 6. Análise de traduções
console.log(`\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
console.log(`${CYAN}🌍 QUALIDADE DAS TRADUÇÕES${RESET}`);
console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);

const languages = ['en', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'zh', 'ru', 'ar'];
const langStats = {};

languages.forEach(lang => {
  langStats[lang] = { complete: 0, empty: 0, total: publishedPosts.length };
});

publishedPosts.forEach(post => {
  if (post.translations) {
    languages.forEach(lang => {
      const translation = post.translations[lang];
      if (translation && translation.length > 5) {
        langStats[lang].complete++;
      } else {
        langStats[lang].empty++;
      }
    });
  } else {
    languages.forEach(lang => langStats[lang].empty++);
  }
});

console.log(`Idioma  | Completas | Vazias | Taxa`);
console.log(`${'─'.repeat(45)}`);

languages.forEach(lang => {
  const rate = ((langStats[lang].complete / langStats[lang].total) * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(rate / 10));
  const color = rate > 80 ? GREEN : rate > 50 ? YELLOW : RED;
  console.log(`${lang.toUpperCase().padEnd(7)} | ${String(langStats[lang].complete).padStart(9)} | ${String(langStats[lang].empty).padStart(6)} | ${color}${rate}%${RESET} ${bar}`);
});

// 7. Fontes RSS
console.log(`\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
console.log(`${CYAN}📡 FONTES RSS ATIVAS${RESET}`);
console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);

if (feeds && feeds.length > 0) {
  feeds.forEach(feed => {
    const feedPosts = posts.filter(p => p.source_id === feed.id);
    console.log(`📰 ${feed.name || feed.url}`);
    console.log(`   📁 Categoria: ${feed.category || 'N/A'}`);
    console.log(`   📊 Posts: ${feedPosts.length}`);
    console.log(`   🔗 URL: ${feed.url?.substring(0, 60)}...`);
    console.log(``);
  });
}

// 8. Posts com erro
console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
console.log(`${CYAN}❌ POSTS COM ERRO (para retry)${RESET}`);
console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);

const errorPosts = posts.filter(p => p.status === 'error');
if (errorPosts.length > 0) {
  errorPosts.slice(0, 10).forEach(post => {
    console.log(`❌ ${post.title?.substring(0, 60) || 'Sem título'}`);
    console.log(`   Erro: ${post.error_message || 'N/A'}`);
    console.log(`   Retry count: ${post.retry_count || 0}`);
    console.log(``);
  });
} else {
  console.log(`${GREEN}✅ Nenhum post com erro!${RESET}\n`);
}

// 9. Posts sem categoria definida
console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
console.log(`${CYAN}📋 POSTS RECENTES (últimos 20)${RESET}`);
console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);

posts.slice(0, 20).forEach((post, i) => {
  const statusIcon = post.status === 'published' ? '✅' : post.status === 'error' ? '❌' : '⏳';
  console.log(`${i + 1}. ${statusIcon} [${post.category || 'N/A'}] ${post.title?.substring(0, 50) || 'Sem título'}...`);
});

// 10. Resumo final
console.log(`\n${'═'.repeat(60)}`);
console.log(`${BLUE}📊 RESUMO FINAL DA AUDITORIA${RESET}`);
console.log(`${'═'.repeat(60)}\n`);

const totalCategories = Object.keys(categories).length;
const healthScore = ((statusCount.published / posts.length) * 100).toFixed(1);
const translationAvg = (languages.reduce((sum, lang) => sum + (langStats[lang].complete / langStats[lang].total) * 100, 0) / languages.length).toFixed(1);

console.log(`📁 Categorias ativas:     ${GREEN}${totalCategories}${RESET}`);
console.log(`📊 Total de posts:        ${GREEN}${posts.length}${RESET}`);
console.log(`✅ Taxa de publicação:    ${GREEN}${healthScore}%${RESET}`);
console.log(`🌍 Taxa de tradução:      ${GREEN}${translationAvg}%${RESET}`);
console.log(`📡 Fontes RSS:            ${GREEN}${feeds?.length || 0}${RESET}`);

if (healthScore > 80 && translationAvg > 80 && totalCategories >= 3) {
  console.log(`\n${GREEN}🎉 SISTEMA CALIBRADO E SAUDÁVEL!${RESET}\n`);
} else if (healthScore > 60) {
  console.log(`\n${YELLOW}⚠️  SISTEMA FUNCIONANDO MAS PODE MELHORAR${RESET}\n`);
} else {
  console.log(`\n${RED}🚨 SISTEMA PRECISA DE ATENÇÃO${RESET}\n`);
}
