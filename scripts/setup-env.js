#!/usr/bin/env node
/**
 * AI FEAST ENGINE - Environment Setup Script
 * Este script cria o arquivo .env.local a partir de um template interativo
 * sem expor credenciais no código-fonte.
 * 
 * Uso: node scripts/setup-env.js
 */

import { createInterface } from 'readline';
import { existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const envPath = join(rootDir, '.env.local');

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

console.log('\n🍽️  AI FEAST ENGINE - Environment Setup\n');
console.log('Este script vai criar seu arquivo .env.local com as credenciais corretas.\n');
console.log('⚠️  IMPORTANTE: Nunca commite o arquivo .env.local no git!\n');

(async () => {
  try {
    // Verificar se já existe um .env.local
    if (existsSync(envPath)) {
      const overwrite = await question('⚠️  .env.local já existe. Deseja sobrescrever? (y/N): ');
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        console.log('\n❌ Setup cancelado.');
        rl.close();
        process.exit(0);
      }
    }

    console.log('\n📝 Supabase Configuration:');
    console.log('   Obtenha em: https://app.supabase.com/project/_/settings/api');
    const supabaseUrl = await question('   VITE_SUPABASE_URL: ');
    const supabaseAnonKey = await question('   VITE_SUPABASE_ANON_KEY: ');
    const supabaseServiceKey = await question('   SUPABASE_SERVICE_ROLE_KEY: ');

    console.log('\n🤖 AI Provider (Groq):');
    console.log('   Obtenha em: https://console.groq.com/keys');
    const groqApiKey = await question('   GROQ_API_KEY: ');

    console.log('\n💳 Stripe (Opcional - deixe vazio se não usar):');
    console.log('   Obtenha em: https://dashboard.stripe.com/apikeys');
    const stripeSecretKey = await question('   STRIPE_SECRET_KEY: ');
    const stripeWebhookSecret = await question('   STRIPE_WEBHOOK_SECRET: ');
    const stripeProPriceId = await question('   STRIPE_PRO_PRICE_ID: ');

    console.log('\n🌐 Domínios:');
    const appUrl = await question('   APP_URL [https://www.aifeastengine.com]: ') || 'https://www.aifeastengine.com';
    const corsOrigin = await question('   CORS_ORIGIN [https://www.aifeastengine.com,https://aifeastengine.com,https://api.aifeastengine.com]: ') || 
      'https://www.aifeastengine.com,https://aifeastengine.com,https://api.aifeastengine.com';

    // Criar conteúdo do .env.local
    const envContent = `# AI FEAST ENGINE - Local Environment
# ⚠️  NUNCA COMMITE ESTE ARQUIVO NO GIT!
# Gerado em: ${new Date().toISOString()}

# Supabase (Database & Auth)
VITE_SUPABASE_URL=${supabaseUrl}
VITE_SUPABASE_ANON_KEY=${supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceKey}

# AI Provider (Groq)
GROQ_API_KEY=${groqApiKey}

# Stripe (Optional)
STRIPE_SECRET_KEY=${stripeSecretKey || 'sk_test_placeholder'}
STRIPE_WEBHOOK_SECRET=${stripeWebhookSecret || 'whsec_placeholder'}
STRIPE_PRO_PRICE_ID=${stripeProPriceId || 'price_placeholder'}
STRIPE_ENABLED=${stripeSecretKey ? 'true' : 'false'}

# Server Config
PORT=3000
NODE_ENV=development
APP_URL=${appUrl}
CORS_ORIGIN=${corsOrigin}

# Rate Limiting
RATE_LIMIT_ENABLED=true
GLOBAL_RATE_LIMIT=100
DEFAULT_RATE_LIMIT_FREE=10
DEFAULT_RATE_LIMIT_PRO=100

# Batch Processing
MAX_CONCURRENT_POSTS=5
BATCH_DELAY_MS=2000
`;

    writeFileSync(envPath, envContent, 'utf8');

    console.log('\n✅ Arquivo .env.local criado com sucesso!');
    console.log(`📁 Localizado em: ${envPath}`);
    console.log('\n🔒 Lembre-se:');
    console.log('   - Este arquivo está no .gitignore e NÃO será commitado');
    console.log('   - Para produção (Render/Vercel), use as variáveis de ambiente nos dashboards');
    console.log('   - Se suas chaves forem comprometidas, rotate imediatamente!');
    console.log('\n🚀 Próximo passo: Execute `npm run dev` para iniciar o servidor local\n');

    rl.close();
  } catch (error) {
    console.error('\n❌ Erro durante o setup:', error.message);
    rl.close();
    process.exit(1);
  }
})();
