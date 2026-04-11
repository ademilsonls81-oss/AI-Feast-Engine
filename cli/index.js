#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

const API_BASE = 'https://api.aifeastengine.com';
const CONFIG_DIR = path.join(os.homedir(), '.aifeast');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Cores para terminal
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  purple: '\x1b[35m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function getConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveConfig(config) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const cmd = args[0];
  const slug = args[1];
  const flags = {};

  for (let i = 2; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace('--', '');
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      flags[key] = val;
    }
  }

  return { cmd, slug, flags, args };
}

// ============================================
// COMANDOS
// ============================================

async function cmdList() {
  log('\n🔍 Buscando skills disponíveis...\n', 'cyan');
  try {
    const res = await axios.get(`${API_BASE}/api/skills`);
    const { skills, total } = res.data;

    if (!skills || skills.length === 0) {
      log('Nenhuma skill disponível no momento.', 'yellow');
      return;
    }

    log(`📦 Skills disponíveis (${total}):\n`, 'bold');

    skills.forEach((skill, i) => {
      const riskColor = skill.risk_level === 'low' ? 'green' : skill.risk_level === 'medium' ? 'yellow' : 'red';
      log(`  ${i + 1}. ${colors.bold}${skill.name}${colors.reset}`, 'cyan');
      log(`     Slug: ${colors.cyan}${skill.slug}${colors.reset}`);
      log(`     ${skill.description || 'Sem descrição'}`, 'gray');
      log(`     Categoria: ${skill.category} | Risco: ${colors[riskColor]}${skill.risk_level}${colors.reset}`, 'gray');
      log(`     Instalar: ${colors.green}npx aifeast info ${skill.slug}${colors.reset}`, 'gray');
      log('');
    });
  } catch (err) {
    log(`❌ Erro ao buscar skills: ${err.message}`, 'red');
    process.exit(1);
  }
}

async function cmdInfo(slug) {
  if (!slug) {
    log('❌ Uso: npx aifeast info <skill-slug>', 'red');
    process.exit(1);
  }

  log(`\n🔍 Buscando informações da skill: ${colors.bold}${slug}\n`, 'cyan');
  try {
    const res = await axios.get(`${API_BASE}/api/skills/${slug}`);
    const skill = res.data;

    log(`  ${colors.bold}${colors.cyan}Nome:${colors.reset} ${skill.name}`, 'reset');
    log(`  ${colors.bold}Slug:${colors.reset} ${skill.slug}`);
    log(`  ${colors.bold}Descrição:${colors.reset} ${skill.description}`, 'gray');
    log(`  ${colors.bold}Detalhes:${colors.reset} ${skill.long_description}`, 'gray');
    log(`  ${colors.bold}Categoria:${colors.reset} ${skill.category}`);
    log(`  ${colors.bold}Tags:${colors.reset} ${(skill.tags || []).join(', ')}`);
    log(`  ${colors.bold}Risco:${colors.reset} ${skill.risk_level}`);
    log(`  ${colors.bold}Downloads:${colors.reset} ${skill.downloads || 0}`);
    log(`  ${colors.bold}Instalar:${colors.reset} ${colors.green}npx aifeast ${skill.install_command}${colors.reset}`);
    log(`  ${colors.bold}Executar:${colors.reset} ${colors.green}npx aifeast run ${skill.slug} --input "seu texto"${colors.reset}`);
    log('');
  } catch (err) {
    if (err.response && err.response.status === 404) {
      log(`❌ Skill "${slug}" não encontrada.`, 'red');
    } else {
      log(`❌ Erro: ${err.message}`, 'red');
    }
    process.exit(1);
  }
}

async function cmdRun(slug, flags) {
  if (!slug) {
    log('❌ Uso: npx aifeast run <skill-slug> --input "texto aqui"', 'red');
    process.exit(1);
  }

  const config = getConfig();
  if (!config.apiKey) {
    log('❌ API Key não configurada.', 'red');
    log('   Execute: npx aifeast config --key SUA_API_KEY', 'yellow');
    process.exit(1);
  }

  const input = flags.input || flags.i || flags.data;
  if (!input) {
    log('❌ Input não fornecido.', 'red');
    log('   Uso: npx aifeast run ' + slug + ' --input "seu texto aqui"', 'yellow');
    process.exit(1);
  }

  log(`\n🚀 Executando skill: ${colors.bold}${slug}\n`, 'cyan');
  try {
    const res = await axios.post(
      `${API_BASE}/api/skills/${slug}/execute`,
      { input },
      {
        headers: {
          'X-API-Key': config.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = res.data;

    if (result.status === 'executed' || result.skill_id) {
      log(`  ${colors.bold}${colors.green}✅ Skill executada com sucesso!${colors.reset}`, 'green');
      log(`  ${colors.bold}Skill:${colors.reset} ${result.skill_name || slug}`);
      log(`  ${colors.bold}Nível de risco:${colors.reset} ${result.risk_level || 'N/A'}`);
      log(`  ${colors.bold}Requests restantes:${colors.reset} ${result.usage_remaining || 'N/A'}`);
      log('');

      if (result.message) {
        log(`  ${colors.bold}Mensagem:${colors.reset} ${result.message}`, 'gray');
      }
      if (result.input_received) {
        log(`  ${colors.bold}Input recebido:${colors.reset} ${result.input_received}`, 'gray');
      }
      log('');
    } else {
      log(`  ${colors.yellow}Resposta:${colors.reset}`, 'yellow');
      log(JSON.stringify(result, null, 2));
    }
  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      const data = err.response.data;

      if (status === 401) {
        log('❌ API Key inválida ou ausente.', 'red');
      } else if (status === 402) {
        log('❌ Limite mensal de requests atingido!', 'red');
        log(`   Plano: ${data.plan} | Uso: ${data.usage_count}/${data.limit}`, 'yellow');
        log('   Faça upgrade para Pro ou aguarde o próximo mês.', 'yellow');
      } else if (status === 404) {
        log(`❌ Skill "${slug}" não encontrada.`, 'red');
      } else {
        log(`❌ Erro (${status}): ${data.error || err.message}`, 'red');
      }
    } else {
      log(`❌ Erro: ${err.message}`, 'red');
    }
    process.exit(1);
  }
}

async function cmdConfig(flags) {
  const key = flags.key || flags.k;
  if (!key) {
    log('❌ Uso: npx aifeast config --key SUA_API_KEY', 'red');
    process.exit(1);
  }

  const config = getConfig();
  config.apiKey = key;
  saveConfig(config);

  log(`\n✅ API Key salva com sucesso em: ${CONFIG_FILE}`, 'green');
  log(`   Chave: ${key.substring(0, 8)}...${key.substring(key.length - 4)}`, 'gray');
  log('');
}

// ============================================
// HELP
// ============================================

function showHelp() {
  log(`\n${colors.bold}🍽️  AI Feast Engine CLI${colors.reset}\n`);
  log('Comandos disponíveis:\n', 'bold');
  log('  list                          Lista todas as skills disponíveis', 'cyan');
  log('  info <skill-slug>             Mostra detalhes de uma skill', 'cyan');
  log('  run <skill-slug> --input ""   Executa uma skill com input', 'cyan');
  log('  config --key API_KEY          Configura sua API Key', 'cyan');
  log('  help                          Mostra esta ajuda', 'cyan');
  log('\nExemplos:\n', 'bold');
  log('  npx aifeast list', 'gray');
  log('  npx aifeast info summarize-article', 'gray');
  log('  npx aifeast run summarize-article --input "https://example.com/artigo"', 'gray');
  log('  npx aifeast config --key af_xxxxxxxxxxxxx', 'gray');
  log('');
}

// ============================================
// MAIN
// ============================================

async function main() {
  const { cmd, slug, flags } = parseArgs(process.argv);

  switch (cmd) {
    case 'list':
      await cmdList();
      break;
    case 'info':
      await cmdInfo(slug);
      break;
    case 'run':
      await cmdRun(slug, flags);
      break;
    case 'config':
      await cmdConfig(flags);
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      if (cmd) {
        log(`❌ Comando desconhecido: ${cmd}`, 'red');
        log('   Execute: npx aifeast help\n', 'yellow');
      } else {
        showHelp();
      }
      process.exit(1);
  }
}

main().catch(err => {
  log(`❌ Erro inesperado: ${err.message}`, 'red');
  process.exit(1);
});
