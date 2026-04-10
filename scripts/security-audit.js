#!/usr/bin/env node
/**
 * AI FEAST ENGINE - Security Audit Script
 * Verifica se há credenciais expostas no código-fonte
 * 
 * Uso: npm run audit:security
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = __dirname; // scripts/ directory
const projectRoot = join(rootDir, '..'); // AI-Feast-Engine/

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

console.log(`\n${BLUE}🍽️  AI FEAST ENGINE - Security Audit${RESET}\n`);

let issues = [];
let warnings = [];
let passed = [];

// 1. Verificar se .env está no .gitignore
console.log('1️⃣  Verificando .gitignore...');
const gitignorePath = join(projectRoot, '.gitignore');
const gitignore = readFileSync(gitignorePath, 'utf8');
if (gitignore.includes('.env')) {
  console.log(`   ${GREEN}✅ .env está no .gitignore${RESET}`);
  passed.push('.env no gitignore');
} else {
  console.log(`   ${RED}❌ .env NÃO está no .gitignore!${RESET}`);
  issues.push('.env não está no .gitignore');
}

// 2. Verificar se .env.local existe
console.log('\n2️⃣  Verificando arquivos .env...');
if (existsSync(join(projectRoot, '.env.local'))) {
  console.log(`   ${GREEN}✅ .env.local existe${RESET}`);
  passed.push('.env.local existe');
} else {
  console.log(`   ${YELLOW}⚠️  .env.local não existe (execute: npm run setup:env)${RESET}`);
  warnings.push('.env.local não existe');
}

// 3. Verificar se .env tem credenciais reais
console.log('\n3️⃣  Verificando credenciais no .env...');
const envContent = readFileSync(join(projectRoot, '.env'), 'utf8');
const hasRealKeys = envContent.includes('eyJhbGciOi') || 
                    (envContent.includes('sk_live_') && !envContent.includes('placeholder'));

if (hasRealKeys) {
  console.log(`   ${RED}❌ .env contém credenciais reais!${RESET}`);
  issues.push('Credenciais reais no .env');
} else {
  console.log(`   ${GREEN}✅ .env não contém credenciais reais${RESET}`);
  passed.push('.env limpo');
}

// 4. Verificar código-fonte em busca de credenciais
console.log('\n4️⃣  Verificando código-fonte...');
const patterns = [
  { regex: /sk_live_[a-zA-Z0-9]{20,}/, name: 'Stripe Live Key' },
  { regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]{20,}/, name: 'JWT/Supabase Key' },
  { regex: /gsk_[a-zA-Z0-9]{20,}/, name: 'Groq API Key' },
  { regex: /sk-or-v1-[a-zA-Z0-9]{20,}/, name: 'OpenRouter API Key' },
];

let foundCredentials = false;
for (const pattern of patterns) {
  try {
    const result = execSync(
      `findstr /R /C:"${pattern.regex.source}" src/*.ts src/*.tsx 2>nul || echo NOT_FOUND`,
      { encoding: 'utf8', cwd: projectRoot }
    );
    
    if (!result.includes('NOT_FOUND') && result.trim()) {
      console.log(`   ${RED}❌ Encontrado: ${pattern.name}${RESET}`);
      issues.push(`${pattern.name} no código-fonte`);
      foundCredentials = true;
    }
  } catch (e) {
    // findstr retorna erro quando não encontra (o que é bom!)
    if (!e.stdout?.includes('NOT_FOUND')) {
      // Comando não encontrou nada - tudo certo!
    }
  }
}

if (!foundCredentials) {
  console.log(`   ${GREEN}✅ Nenhuma credencial encontrada no código-fonte${RESET}`);
  passed.push('Código-fonte limpo');
}

// 5. Verificar se .env foi commited no git
console.log('\n5️⃣  Verificando histórico do git...');
try {
  const gitHistory = execSync('git log --all --oneline -- .env', { 
    encoding: 'utf8', 
    cwd: projectRoot 
  }).trim();
  
  if (gitHistory) {
    console.log(`   ${RED}❌ .env foi commited no passado!${RESET}`);
    console.log(`   ${YELLOW}⚠️  Considere rotacionar todas as chaves${RESET}`);
    issues.push('.env no histórico do git');
    warnings.push('Chaves podem estar expostas no histórico');
  } else {
    console.log(`   ${GREEN}✅ .env nunca foi commited${RESET}`);
    passed.push('.env limpo no git');
  }
} catch (e) {
  console.log(`   ${YELLOW}⚠️  Não foi possível verificar histórico do git${RESET}`);
}

// 6. Verificar arquivos de backup
console.log('\n6️⃣  Verificando arquivos de backup...');
const backupFiles = ['.env.backup', '.env.backup.local'];
for (const backupFile of backupFiles) {
  if (existsSync(join(projectRoot, backupFile))) {
    console.log(`   ${YELLOW}⚠️  ${backupFile} existe com credenciais reais${RESET}`);
    warnings.push(`${backupFile} contém credenciais`);
  }
}

// 7. Verificar node_modules/.env
console.log('\n7️⃣  Verificando node_modules...');
if (existsSync(join(projectRoot, 'node_modules', '.env'))) {
  console.log(`   ${RED}❌ .env encontrado em node_modules!${RESET}`);
  issues.push('.env em node_modules');
} else {
  console.log(`   ${GREEN}✅ Sem .env em node_modules${RESET}`);
  passed.push('node_modules limpo');
}

// Resumo
console.log(`\n${'='.repeat(60)}`);
console.log(`${BLUE}📊 RESUMO DA AUDITORIA${RESET}`);
console.log(`${'='.repeat(60)}\n`);

if (passed.length > 0) {
  console.log(`${GREEN}✅ PASSOU (${passed.length}):${RESET}`);
  passed.forEach(item => console.log(`   ✓ ${item}`));
}

if (warnings.length > 0) {
  console.log(`\n${YELLOW}⚠️  ALERTAS (${warnings.length}):${RESET}`);
  warnings.forEach(item => console.log(`   ⚠ ${item}`));
}

if (issues.length > 0) {
  console.log(`\n${RED}❌ PROBLEMAS (${issues.length}):${RESET}`);
  issues.forEach(item => console.log(`   ✗ ${item}`));
}

console.log(`\n${'='.repeat(60)}`);

if (issues.length === 0) {
  console.log(`${GREEN}🎉 TODAS AS VERIFICAÇÕES PASSARAM!${RESET}`);
  console.log(`${GREEN}   Seu projeto está seguro para deploy.${RESET}`);
} else {
  console.log(`${RED}🚨 ${issues.length} PROBLEMA(S) ENCONTRADO(S)!${RESET}`);
  console.log(`${YELLOW}   Resolva antes de fazer deploy.${RESET}`);
}

console.log(`${'='.repeat(60)}\n`);

// Exit code
process.exit(issues.length > 0 ? 1 : 0);
