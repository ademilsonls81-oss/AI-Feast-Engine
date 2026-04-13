#!/usr/bin/env node

'use strict';

const { Command } = require('commander');
const ora = require('ora');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const API_BASE = 'https://api.aifeastengine.com';
const CONFIG_DIR = path.join(os.homedir(), '.aifeast');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// ============================================
// CORE UTILS
// ============================================

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
  try { fs.chmodSync(CONFIG_FILE, 0o600); } catch {}
}

function output(data, jsonFlag) {
  if (jsonFlag) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function formatError(err) {
  if (err.response) {
    const status = err.response.status;
    const data = err.response.data;
    if (status === 401) return 'API Key inválida ou ausente.';
    if (status === 402) return `Limite mensal atingido. Plano: ${data.plan || 'N/A'} | Uso: ${data.usage_count || '?'}/${data.limit || '?'}`;
    if (status === 404) return `Recurso não encontrado.`;
    return `Erro ${status}: ${data.error || err.message}`;
  }
  return err.message;
}

// ============================================
// COMMAND ACTIONS
// ============================================

async function cmdList(opts) {
  const spinner = opts.json ? { start:()=>{}, succeed:()=>{}, fail:()=>{} } : ora('Fetching skills...').start();
  try {
    const res = await axios.get(`${API_BASE}/api/skills`);
    const { skills, total } = res.data;
    spinner.succeed(`Fetched ${total || (skills ? skills.length : 0)} skills`);

    if (opts.json) {
      output(skills || [], true);
      return;
    }

    if (!skills || skills.length === 0) {
      console.log('  Nenhuma skill disponível no momento.');
      return;
    }

    skills.forEach((skill, i) => {
      const riskColor = skill.risk_level === 'low' ? '\x1b[32m' : skill.risk_level === 'medium' ? '\x1b[33m' : '\x1b[31m';
      const badge = skill.verified ? ' \x1b[32m[AI Verified]\x1b[0m' : skill.source === 'github' ? ' \x1b[36m[Community]\x1b[0m' : '';
      console.log(`  \x1b[1m${i + 1}. ${skill.name}\x1b[0m${badge}`);
      console.log(`     Slug: \x1b[36m${skill.slug}\x1b[0m`);
      console.log(`     ${skill.description || 'Sem descrição'}`);
      console.log(`     Categoria: ${skill.category} | Risco: ${riskColor}${skill.risk_level}\x1b[0m`);
      console.log('');
    });
  } catch (err) {
    spinner.fail(`Error: ${formatError(err)}`);
    process.exitCode = 1;
  }
}

async function cmdInfo(slug, opts) {
  if (!slug) {
    console.error('\x1b[31m❌ Uso: aifeast info <skill-slug>\x1b[0m');
    process.exitCode = 1;
    return;
  }

  const spinner = opts.json ? { start:()=>{}, succeed:()=>{}, fail:()=>{} } : ora(`Loading skill "${slug}"...`).start();
  try {
    const res = await axios.get(`${API_BASE}/api/skills/${slug}`);
    const skill = res.data;
    spinner.succeed(`Skill loaded: ${skill.name}`);

    if (opts.json) {
      output(skill, true);
      return;
    }

    console.log(`  \x1b[1m\x1b[36mNome:\x1b[0m ${skill.name}`);
    console.log(`  \x1b[1mSlug:\x1b[0m ${skill.slug}`);
    console.log(`  \x1b[1mDescrição:\x1b[0m ${skill.description}`);
    console.log(`  \x1b[1mDetalhes:\x1b[0m ${skill.long_description || 'N/A'}`);
    console.log(`  \x1b[1mCategoria:\x1b[0m ${skill.category}`);
    console.log(`  \x1b[1mTags:\x1b[0m ${(skill.tags || []).join(', ') || 'N/A'}`);
    console.log(`  \x1b[1mRisco:\x1b[0m ${skill.risk_level}`);
    console.log(`  \x1b[1mDownloads:\x1b[0m ${skill.downloads || 0}`);
    console.log(`  \x1b[1mInstalar:\x1b[0m \x1b[32m${skill.install_command || `npx aifeast ${skill.slug}`}\x1b[0m`);
    console.log(`  \x1b[1mExecutar:\x1b[0m \x1b[32m${skill.run_command || `npx aifeast run ${skill.slug} --input "seu texto"`}\x1b[0m`);
    console.log('');
  } catch (err) {
    spinner.fail(`Error: ${formatError(err)}`);
    process.exitCode = 1;
  }
}

async function cmdRun(slug, opts) {
  if (!slug) {
    console.error('\x1b[31m❌ Uso: aifeast run <skill-slug> --input "texto"\x1b[0m');
    process.exitCode = 1;
    return;
  }

  const config = getConfig();
  if (!config.apiKey) {
    console.error('\x1b[31m❌ API Key não configurada.\x1b[0m');
    console.error('   Execute: aifeast config --key SUA_API_KEY');
    process.exitCode = 1;
    return;
  }

  const input = opts.input || opts.i || opts.data;
  if (!input) {
    console.error('\x1b[31m❌ Input não fornecido.\x1b[0m');
    console.error(`   Uso: aifeast run ${slug} --input "seu texto aqui"`);
    process.exitCode = 1;
    return;
  }

  const spinner = opts.json ? { start:()=>{}, succeed:()=>{}, fail:()=>{} } : ora(`Running skill "${slug}"...`).start();
  const startTime = Date.now();
  try {
    const res = await axios.post(
      `${API_BASE}/api/skills/${slug}/execute`,
      { input },
      { headers: { 'X-API-Key': config.apiKey, 'Content-Type': 'application/json' } }
    );
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const result = res.data;

    if (result.status === 'executed' || result.skill_id) {
      spinner.succeed(`Skill executed in ${elapsed}s`);

      if (opts.json) {
        output(result, true);
        return;
      }

      console.log(`  \x1b[1mSkill:\x1b[0m ${result.skill_name || slug}`);
      console.log(`  \x1b[1mNível de risco:\x1b[0m ${result.risk_level || 'N/A'}`);
      console.log(`  \x1b[1mRequests restantes:\x1b[0m ${result.usage_remaining || 'N/A'}`);
      if (result.message) console.log(`  \x1b[1mMensagem:\x1b[0m ${result.message}`);
      if (result.input_received) console.log(`  \x1b[1mInput recebido:\x1b[0m ${result.input_received}`);
      console.log('');
    } else {
      spinner.succeed(`Completed in ${elapsed}s`);
      if (opts.json) {
        output(result, true);
      } else {
        console.log(`  \x1b[33mResposta:\x1b[0m`);
        console.log(JSON.stringify(result, null, 2));
      }
    }
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    spinner.fail(`Error after ${elapsed}s: ${formatError(err)}`);
    process.exitCode = 1;
  }
}

async function cmdConfig(opts) {
  const key = opts.key || opts.k;
  if (!key) {
    console.error('\x1b[31m❌ Uso: aifeast config --key SUA_API_KEY\x1b[0m');
    process.exitCode = 1;
    return;
  }

  const spinner = opts.json ? { start:()=>{}, succeed:()=>{}, fail:()=>{} } : ora('Saving API key...').start();
  const config = getConfig();
  config.apiKey = key;
  saveConfig(config);
  spinner.succeed(`API key saved to ${CONFIG_FILE}`);

  if (opts.json) {
    output({ status: 'ok', path: CONFIG_FILE, key: `${key.substring(0, 8)}...${key.substring(key.length - 4)}` }, true);
  } else {
    console.log(`   Chave: ${key.substring(0, 8)}...${key.substring(key.length - 4)}`);
  }
}

async function cmdSearch(query, opts) {
  if (!query) {
    console.error('\x1b[31m❌ Uso: aifeast search "termo"\x1b[0m');
    process.exitCode = 1;
    return;
  }

  const spinner = opts.json ? { start:()=>{}, succeed:()=>{}, fail:()=>{} } : ora(`Searching skills for "${query}"...`).start();
  try {
    const res = await axios.get(`${API_BASE}/api/skills/search`, { params: { q: query } });
    const { skills, total } = res.data;
    spinner.succeed(`Found ${total || (skills ? skills.length : 0)} results`);

    if (opts.json) {
      output(skills || [], true);
      return;
    }

    if (!skills || skills.length === 0) {
      console.log('  Nenhuma skill encontrada.');
      return;
    }

    skills.slice(0, 10).forEach((skill, i) => {
      const riskColor = skill.risk_level === 'low' ? '\x1b[32m' : skill.risk_level === 'medium' ? '\x1b[33m' : '\x1b[31m';
      const badge = skill.verified ? ' \x1b[32m[AI Verified]\x1b[0m' : skill.source === 'github' ? ' \x1b[36m[Community]\x1b[0m' : '';
      console.log(`  \x1b[1m${i + 1}. ${skill.name}\x1b[0m${badge}`);
      console.log(`     Slug: \x1b[36m${skill.slug}\x1b[0m`);
      console.log(`     ${skill.description || 'Sem descrição'}`);
      console.log(`     Categoria: ${skill.category} | Risco: ${riskColor}${skill.risk_level}\x1b[0m`);
      console.log('');
    });
  } catch (err) {
    spinner.fail(`Error: ${formatError(err)}`);
    process.exitCode = 1;
  }
}

async function cmdExecuteBySlug(slug, opts) {
  if (!slug) return false;

  const config = getConfig();
  if (!config.apiKey) {
    console.error('\x1b[31m❌ API Key não configurada.\x1b[0m');
    console.error('   Execute: aifeast config --key SUA_API_KEY');
    process.exitCode = 1;
    return true; // consumed
  }

  const spinner = opts.json ? { start:()=>{}, succeed:()=>{}, fail:()=>{} } : ora(`Looking up skill "${slug}"...`).start();
  try {
    const res = await axios.get(`${API_BASE}/api/skills/${slug}`);
    const skill = res.data;
    spinner.succeed(`Found: ${skill.name}`);

    const runSpinner = opts.json ? { start:()=>{}, succeed:()=>{}, fail:()=>{} } : ora(`Executing "${slug}"...`).start();
    const startTime = Date.now();
    const execRes = await axios.post(
      `${API_BASE}/api/skills/${slug}/execute`,
      {},
      { headers: { 'X-API-Key': config.apiKey, 'Content-Type': 'application/json' } }
    );
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const result = execRes.data;

    if (result.status === 'executed' || result.skill_id) {
      runSpinner.succeed(`Executed in ${elapsed}s`);

      if (opts.json) {
        output(result, true);
      } else {
        console.log(`  \x1b[1mSkill:\x1b[0m ${result.skill_name || slug}`);
        console.log(`  \x1b[1mRequests restantes:\x1b[0m ${result.usage_remaining || 'N/A'}`);
        if (result.message) console.log(`  \x1b[1mMensagem:\x1b[0m ${result.message}`);
        console.log('');
      }
    } else {
      runSpinner.succeed(`Completed in ${elapsed}s`);
      if (opts.json) output(result, true);
    }
    return true;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      spinner.stop();
      return false; // not found — let commander handle unknown command
    }
    spinner.fail(`Error: ${formatError(err)}`);
    process.exitCode = 1;
    return true; // consumed
  }
}

// ============================================
// COMMANDER SETUP
// ============================================

const program = new Command();

program
  .name('aifeast')
  .description('🍽️  AI Feast Engine CLI — discover, configure, and run AI skills from your terminal')
  .version(pkg.version, '-v, --version', 'show CLI version')
  .addHelpText('after', `
Examples:
  $ aifeast list
  $ aifeast info summarize-article
  $ aifeast run summarize-article --input "https://example.com/article"
  $ aifeast search "json"
  $ aifeast config --key af_xxxxxxxxxxxxx
  $ aifeast json-validator              # shortcut: run skill directly
  $ aifeast list --json | jq '.[].slug' # pipe JSON output

Documentation:  https://www.aifeastengine.com
Report issues:  https://github.com/ademilsonls81-oss/AI-Feast-Engine
`)
  .showHelpAfterError();

// ── list ──────────────────────────────────
program
  .command('list')
  .description('List all available AI skills')
  .option('--json', 'Output as JSON for piping')
  .action(cmdList);

// ── info ──────────────────────────────────
program
  .command('info <slug>')
  .description('Show detailed information about a skill')
  .option('--json', 'Output as JSON for piping')
  .action(cmdInfo);

// ── run ───────────────────────────────────
program
  .command('run <slug>')
  .description('Execute an AI skill with input')
  .requiredOption('--input <text>', 'Input text or URL for the skill')
  .option('-i <text>', 'Shorthand for --input')
  .option('--data <text>', 'Alternative input flag')
  .option('--json', 'Output as JSON for piping')
  .action(cmdRun);

// ── search ────────────────────────────────
program
  .command('search <query>')
  .description('Search skills by name, description, or tags')
  .option('--json', 'Output as JSON for piping')
  .action(cmdSearch);

// ── config ────────────────────────────────
program
  .command('config')
  .description('Configure your API key')
  .requiredOption('--key <value>', 'Your AI Feast Engine API key')
  .option('-k <value>', 'Shorthand for --key')
  .option('--json', 'Output as JSON for piping')
  .action(cmdConfig);

// ── Unknown command fallback ──────────────
program
  .command('*', { hidden: true, isDefault: true })
  .allowUnknownOption()
  .argument('[args...]', 'Unknown command arguments')
  .action(async (args) => {
    const slug = args[0];
    if (!slug) {
      console.error(`\x1b[31m❌ Unknown command.\x1b[0m`);
      console.error('   Run \x1b[36maifeast --help\x1b[0m for available commands.');
      process.exitCode = 1;
      return;
    }
    // Try as skill slug
    const found = await cmdExecuteBySlug(slug, {});
    if (!found) {
      console.error(`\x1b[31m❌ Unknown command: ${slug}\x1b[0m`);
      console.error('   Run \x1b[36maifeast --help\x1b[0m for available commands.');
      process.exitCode = 1;
    }
  });

// ============================================
// GO
// ============================================

program.parse(process.argv);
