/**
 * Autonomous System v2 — Fase 10: Proteções Finais
 *
 * Implementa salvaguardas críticas para prevenir comportamentos indesejados
 * do sistema autônomo em produção.
 *
 * Proteções:
 *   1. Rate Limiting: Evita execuções muito frequentes do loop
 *   2. Circuit Breaker: Pausa o sistema após falhas consecutivas
 *   3. Deploy Cooldown: Previne deploys muito próximos no tempo
 *   4. Environment Validation: Valida configurações antes de executar
 *
 * Todas as proteções são verificadas ANTES do loop iniciar.
 * Se alguma proteção bloquear, o loop NÃO executa.
 */

import { supabase } from "../lib/supabaseClient";

// ==========================================
// CONFIGURAÇÃO
// ==========================================

/** Intervalo mínimo entre execuções do loop (1 hora) */
const MIN_LOOP_INTERVAL_MS = 60 * 60 * 1000;

/** Número de falhas consecutivas antes de ativar circuit breaker */
const CIRCUIT_BREAKER_THRESHOLD = 3;

/** Período de cooldown após falhas consecutivas (6 horas) */
const CIRCUIT_BREAKER_COOLDOWN_MS = 6 * 60 * 60 * 1000;

/** Intervalo mínimo entre deploys (2 horas) */
const MIN_DEPLOY_INTERVAL_MS = 2 * 60 * 60 * 1000;

/** Número máximo de deploys por dia */
const MAX_DEPLOYS_PER_DAY = 5;

// ==========================================
// STATE (In-memory)
// ==========================================

/** Timestamp da última execução do loop */
let lastLoopExecution: number | null = null;

/** Timestamp do último deploy realizado */
let lastDeployTimestamp: number | null = null;

/** Contador de falhas consecutivas do loop */
let consecutiveFailures = 0;

/** Timestamp de quando o circuit breaker foi ativado */
let circuitBreakerActivatedAt: number | null = null;

// ==========================================
// PROTEÇÃO 1: RATE LIMITING
// ==========================================

/**
 * Verifica se o loop está sendo executado com muita frequência.
 *
 * Rate limiting previne:
 *   - Consumo excessivo de recursos
 *   - Chamadas desnecessárias à API do Groq
 *   - Sobrecarga do banco de dados
 *
 * @returns Object com status de rate limiting
 */
export function checkRateLimit(): {
  allowed: boolean;
  reason?: string;
  nextAllowedAt?: Date;
} {
  if (lastLoopExecution === null) {
    return { allowed: true };
  }

  const timeSinceLastExecution = Date.now() - lastLoopExecution;

  if (timeSinceLastExecution < MIN_LOOP_INTERVAL_MS) {
    const nextAllowedAt = new Date(lastLoopExecution + MIN_LOOP_INTERVAL_MS);

    return {
      allowed: false,
      reason: `Rate limit: loop executed ${Math.round(timeSinceLastExecution / 1000 / 60)}min ago. Next allowed in ${Math.round((MIN_LOOP_INTERVAL_MS - timeSinceLastExecution) / 1000 / 60)}min`,
      nextAllowedAt
    };
  }

  return { allowed: true };
}

/**
 * Registra que o loop foi executado.
 * Deve ser chamado após conclusão do loop.
 */
export function recordLoopExecution() {
  lastLoopExecution = Date.now();
}

/**
 * Registra falha do loop.
 * Deve ser chamado quando loop falha.
 */
export function recordLoopFailure() {
  consecutiveFailures++;
  console.log(`[Protections] Consecutive failures: ${consecutiveFailures}`);

  // Ativar circuit breaker se threshold excedido
  if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreakerActivatedAt = Date.now();
    console.log(`[Protections] ⚠️  Circuit breaker activated after ${consecutiveFailures} consecutive failures`);
  }
}

/**
 * Registra sucesso do loop (reseta contador de falhas).
 * Deve ser chamado quando loop completa com sucesso.
 */
export function recordLoopSuccess() {
  consecutiveFailures = 0;
  circuitBreakerActivatedAt = null;
}

// ==========================================
// PROTEÇÃO 2: CIRCUIT BREAKER
// ==========================================

/**
 * Verifica se o circuit breaker está ativo.
 *
 * Circuit breaker previne:
 *   - Execuções contínuas quando sistema está instável
 *   - Waste de recursos em loops de falha
 *   - Possíveis efeitos colaterais de correções mal-sucedidas
 *
 * @returns Object com status do circuit breaker
 */
export function checkCircuitBreaker(): {
  allowed: boolean;
  reason?: string;
  cooldownEndsAt?: Date;
} {
  if (circuitBreakerActivatedAt === null) {
    return { allowed: true };
  }

  const timeSinceActivation = Date.now() - circuitBreakerActivatedAt;

  // Verificar se cooldown já passou
  if (timeSinceActivation >= CIRCUIT_BREAKER_COOLDOWN_MS) {
    console.log(`[Protections] ✅ Circuit breaker cooldown expired — resetting`);
    circuitBreakerActivatedAt = null;
    consecutiveFailures = 0;
    return { allowed: true };
  }

  const cooldownEndsAt = new Date(circuitBreakerActivatedAt + CIRCUIT_BREAKER_COOLDOWN_MS);
  const remainingMs = CIRCUIT_BREAKER_COOLDOWN_MS - timeSinceActivation;

  return {
    allowed: false,
    reason: `Circuit breaker active: ${consecutiveFailures} consecutive failures. Cooldown ends in ${Math.round(remainingMs / 1000 / 60)}min`,
    cooldownEndsAt
  };
}

/**
 * Obtém status detalhado do circuit breaker.
 */
export function getCircuitBreakerStatus(): {
  isActive: boolean;
  consecutiveFailures: number;
  threshold: number;
  cooldownEndsAt?: Date;
  message: string;
} {
  const isActive = circuitBreakerActivatedAt !== null;
  const cooldownEndsAt = isActive
    ? new Date(circuitBreakerActivatedAt! + CIRCUIT_BREAKER_COOLDOWN_MS)
    : undefined;

  let message = `Circuit breaker inactive (${consecutiveFailures}/${CIRCUIT_BREAKER_THRESHOLD} failures)`;
  if (isActive) {
    const remaining = CIRCUIT_BREAKER_COOLDOWN_MS - (Date.now() - circuitBreakerActivatedAt!);
    message = `Circuit breaker ACTIVE — cooldown ends in ${Math.round(remaining / 1000 / 60)}min`;
  }

  return {
    isActive,
    consecutiveFailures,
    threshold: CIRCUIT_BREAKER_THRESHOLD,
    cooldownEndsAt,
    message
  };
}

// ==========================================
// PROTEÇÃO 3: DEPLOY COOLDOWN
// ==========================================

/**
 * Verifica se é seguro realizar um deploy agora.
 *
 * Deploy cooldown previne:
 *   - Deploys muito frequentes que podem causar instabilidade
 *   - Sobrecarga no pipeline de CI/CD
 *   - Dificuldade de rollback em caso de problemas
 *
 * @returns Object com status de deploy cooldown
 */
export function checkDeployCooldown(): {
  allowed: boolean;
  reason?: string;
  nextAllowedAt?: Date;
} {
  if (lastDeployTimestamp === null) {
    return { allowed: true };
  }

  const timeSinceLastDeploy = Date.now() - lastDeployTimestamp;

  if (timeSinceLastDeploy < MIN_DEPLOY_INTERVAL_MS) {
    const nextAllowedAt = new Date(lastDeployTimestamp + MIN_DEPLOY_INTERVAL_MS);

    return {
      allowed: false,
      reason: `Deploy cooldown: last deploy ${Math.round(timeSinceLastDeploy / 1000 / 60)}min ago. Next allowed in ${Math.round((MIN_DEPLOY_INTERVAL_MS - timeSinceLastDeploy) / 1000 / 60)}min`,
      nextAllowedAt
    };
  }

  return { allowed: true };
}

/**
 * Registra que um deploy foi realizado.
 * Deve ser chamado após deploy bem-sucedido.
 */
export function recordDeploy() {
  lastDeployTimestamp = Date.now();
}

/**
 * Verifica no banco de dados quantos deploys foram realizados hoje.
 * Se exceder o limite, bloqueia novos deploys.
 *
 * @returns Object com status de deploy daily limit
 */
export async function checkDailyDeployLimit(): Promise<{
  allowed: boolean;
  reason?: string;
  deployCount?: number;
}> {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from("deploy_tracking")
      .select("*", { count: "exact", head: true })
      .gte("deployed_at", startOfDay.toISOString());

    if (error) {
      console.warn(`[Protections] Failed to query deploy count: ${error.message}`);
      return { allowed: true }; // Fail-safe: allow deploy if query fails
    }

    const deployCount = count || 0;

    if (deployCount >= MAX_DEPLOYS_PER_DAY) {
      return {
        allowed: false,
        reason: `Daily deploy limit reached: ${deployCount}/${MAX_DEPLOYS_PER_DAY} deploys today`,
        deployCount
      };
    }

    return { allowed: true, deployCount };
  } catch (err: any) {
    console.warn(`[Protections] Failed to check daily deploy limit: ${err.message}`);
    return { allowed: true }; // Fail-safe: allow deploy if check fails
  }
}

// ==========================================
// PROTEÇÃO 4: ENVIRONMENT VALIDATION
// ==========================================

/**
 * Valida que o ambiente está configurado corretamente antes de executar.
 *
 * Environment validation previne:
 *   - Execuções em ambiente de desenvolvimento sem configuração adequada
 *   - Falta de variáveis de ambiente críticas
 *   - Execuções acidentais em ambientes não configurados
 *
 * @returns Object com status de validação de ambiente
 */
export function validateEnvironment(): {
  valid: boolean;
  issues: string[];
  mode: "production" | "development" | "test";
} {
  const issues: string[] = [];
  const nodeEnv = process.env.NODE_ENV || "development";

  const mode: "production" | "development" | "test" =
    nodeEnv === "production" ? "production" :
    nodeEnv === "test" ? "test" : "development";

  // Validar variáveis de ambiente críticas
  const requiredEnvVars = [
    "GROQ_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY"
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      issues.push(`Missing required env var: ${envVar}`);
    }
  }

  // Em produção, exigir todas as variáveis
  if (mode === "production" && issues.length > 0) {
    return {
      valid: false,
      issues,
      mode
    };
  }

  // Em desenvolvimento, apenas alertar sobre variáveis faltando
  if (mode === "development" && issues.length > 0) {
    console.warn(`[Protections] ⚠️  Running in development mode with missing env vars: ${issues.join(", ")}`);
  }

  return {
    valid: true,
    issues,
    mode
  };
}

// ==========================================
// FUNÇÃO COMPOSTA: CHECK ALL PROTECTIONS
// ==========================================

/**
 * Executa todas as verificações de proteção.
 *
 * Esta função deve ser chamada ANTES do loop iniciar.
 * Se qualquer proteção bloquear, o loop NÃO deve executar.
 *
 * @returns Object com resultado consolidado de todas as proteções
 */
export async function checkAllProtections(): Promise<{
  allPassed: boolean;
  blockingReasons: string[];
  warnings: string[];
  protectionStatus: {
    rateLimit: { allowed: boolean; reason?: string };
    circuitBreaker: { allowed: boolean; reason?: string };
    environment: { valid: boolean; issues: string[]; mode: string };
  };
}> {
  const blockingReasons: string[] = [];
  const warnings: string[] = [];

  // 1. Rate Limiting
  const rateLimit = checkRateLimit();
  if (!rateLimit.allowed) {
    blockingReasons.push(rateLimit.reason!);
  }

  // 2. Circuit Breaker
  const circuitBreaker = checkCircuitBreaker();
  if (!circuitBreaker.allowed) {
    blockingReasons.push(circuitBreaker.reason!);
  }

  // 3. Environment Validation
  const environment = validateEnvironment();
  if (!environment.valid) {
    blockingReasons.push(`Environment invalid: ${environment.issues.join(", ")}`);
  } else if (environment.issues.length > 0) {
    warnings.push(`Environment warnings: ${environment.issues.join(", ")}`);
  }

  const allPassed = blockingReasons.length === 0;

  return {
    allPassed,
    blockingReasons,
    warnings,
    protectionStatus: {
      rateLimit: { allowed: rateLimit.allowed, reason: rateLimit.reason },
      circuitBreaker: { allowed: circuitBreaker.allowed, reason: circuitBreaker.reason },
      environment: { valid: environment.valid, issues: environment.issues, mode: environment.mode }
    }
  };
}

/**
 * Verifica proteções específicas para deploy.
 * Deve ser chamada ANTES de realizar deploy.
 *
 * @returns Object com resultado de verificações de deploy
 */
export async function checkDeployProtections(): Promise<{
  allPassed: boolean;
  blockingReasons: string[];
}> {
  const blockingReasons: string[] = [];

  // 1. Deploy Cooldown
  const cooldown = checkDeployCooldown();
  if (!cooldown.allowed) {
    blockingReasons.push(cooldown.reason!);
  }

  // 2. Daily Deploy Limit
  const dailyLimit = await checkDailyDeployLimit();
  if (!dailyLimit.allowed) {
    blockingReasons.push(dailyLimit.reason!);
  }

  return {
    allPassed: blockingReasons.length === 0,
    blockingReasons
  };
}

// ==========================================
// RESET (Para Testes e Admin API)
// ==========================================

/**
 * Reseta todas as proteções.
 * USAR APENAS EM TESTES ou via Admin API com cautela.
 */
export function resetProtections() {
  lastLoopExecution = null;
  lastDeployTimestamp = null;
  consecutiveFailures = 0;
  circuitBreakerActivatedAt = null;
  console.log("[Protections] ⚠️  All protections reset");
}

/**
 * Reseta manualmente o circuit breaker.
 * Útil para testes ou recuperação manual.
 */
export function resetCircuitBreaker() {
  circuitBreakerActivatedAt = null;
  consecutiveFailures = 0;
  console.log("[Protections] ⚠️  Circuit breaker manually reset");
}
