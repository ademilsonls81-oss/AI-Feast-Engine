#!/usr/bin/env node
/**
 * AI FEAST ENGINE - Force Ingestion
 * Força ingestão imediata de todos os feeds RSS
 * Uso: node scripts/force-ingestion.js
 */

import { createClient } from '@supabase/supabase-js';
import Parser from 'rss-parser';
import dotenv from 'dotenv';

dotenv.config();

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.log(`${RED}❌ Credenciais Supabase não encontradas!${RESET}`);
  console.log(`${YELLOW}💡 Certifique-se de ter .env.local ou .env configurado${RESET}\n`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const parser = new Parser({
  customFields: { item: [['content:encoded', 'contentEncoded']] }
});

console.log(`\n${BLUE}🍽️  AI FEAST ENGINE - Force Ingestion${RESET}`);
console.log(`${BLUE}========================================${RESET}\n`);

// 1. Buscar feeds
console.log(`${CYAN}📡 Buscando feeds RSS...${RESET}\n`);

const { data: feeds, error: feedsError } = await supabase
  .from('feeds')
  .select('*')
  .order('category');

if (feedsError || !feeds) {
  console.log(`${RED}❌ Erro ao buscar feeds: ${feedsError?.message}${RESET}\n`);
  process.exit(1);
}

console.log(`${GREEN}✅ ${feeds.length} feeds encontrados${RESET}\n`);

// 2. Contar posts por categoria
console.log(`${CYAN}📊 Contando posts por categoria...${RESET}\n`);

const { data: allPosts } = await supabase
  .from('posts')
  .select('category');

const categoryCounts = {};
if (allPosts) {
  allPosts.forEach(p => {
    const cat = p.category || 'General';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
}

Object.entries(categoryCounts).forEach(([cat, count]) => {
  console.log(`   ${cat.padEnd(15)} ${count} posts`);
});
console.log();

// 3. Ingestão balanceada
console.log(`${CYAN}🚀 Iniciando ingestão balanceada...${RESET}\n`);

const minPostsPerCategory = 30;
let totalIngested = 0;

for (const feed of feeds) {
  const category = feed.category || 'General';
  const currentCount = categoryCounts[category] || 0;
  
  // Balancear
  let itemsToFetch = 10;
  if (currentCount > minPostsPerCategory * 3) {
    itemsToFetch = 2;
  } else if (currentCount > minPostsPerCategory * 2) {
    itemsToFetch = 5;
  } else if (currentCount < minPostsPerCategory) {
    itemsToFetch = 20;
  }
  
  console.log(`${CYAN}📰 ${feed.name || feed.url}${RESET}`);
  console.log(`   📁 ${category} (${currentCount} posts) → buscando ${itemsToFetch} itens`);
  
  try {
    const feedData = await parser.parseURL(feed.url);
    let ingested = 0;
    
    for (const item of feedData.items.slice(0, itemsToFetch)) {
      // Verificar duplicata
      const { data: exists } = await supabase
        .from('posts')
        .select('id')
        .eq('link', item.link)
        .single();
      
      if (exists) continue;
      
      const rawContent = item.contentEncoded || item.content || item.contentSnippet || '';
      
      const { error } = await supabase
        .from('posts')
        .insert({
          title: item.title,
          link: item.link,
          pub_date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          content_raw: rawContent,
          source_id: feed.id,
          category: category,
          status: 'pending'
        });
      
      if (error) {
        console.log(`   ${RED}❌ Erro: ${item.title?.substring(0, 50)}${RESET}`);
      } else {
        ingested++;
        totalIngested++;
      }
    }
    
    console.log(`   ${GREEN}✅ ${ingested} novos posts${RESET}\n`);
    
    // Delay entre feeds
    await new Promise(r => setTimeout(r, 1000));
    
  } catch (err) {
    console.log(`   ${RED}❌ Falha ao parsear: ${err.message}${RESET}\n`);
  }
}

// 4. Resumo
console.log(`${'═'.repeat(60)}`);
console.log(`${BLUE}📊 RESUMO DA INGESTÃO${RESET}`);
console.log(`${'═'.repeat(60)}\n`);

console.log(`${GREEN}✅ Total de novos posts: ${totalIngested}${RESET}\n`);

// Nova contagem
const { data: newCounts } = await supabase.from('posts').select('category, status');
const finalCounts = { published: 0, pending: 0, error: 0 };
const finalCategories = {};

if (newCounts) {
  newCounts.forEach(p => {
    finalCounts[p.status] = (finalCounts[p.status] || 0) + 1;
    const cat = p.category || 'General';
    finalCategories[cat] = (finalCategories[cat] || 0) + 1;
  });
}

console.log(`${CYAN}📁 Distribuição por categoria:${RESET}`);
Object.entries(finalCategories)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    const pct = ((count / newCounts.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(pct / 3));
    console.log(`   ${cat.padEnd(15)} ${count.toString().padStart(3)} (${pct}%) ${bar}`);
  });

console.log(`\n${CYAN}📊 Status dos posts:${RESET}`);
console.log(`   ✅ Published: ${GREEN}${finalCounts.published}${RESET}`);
console.log(`   ⏳ Pending:   ${YELLOW}${finalCounts.pending}${RESET} (serão processados pela AutoQueue)`);
console.log(`   ❌ Error:     ${RED}${finalCounts.error}${RESET}`);

console.log(`\n${GREEN}🎉 Ingestão concluída!${RESET}`);
console.log(`${YELLOW}💡 A AutoQueue processará os posts pending nos próximos minutos${RESET}\n`);
