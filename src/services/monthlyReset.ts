/**
 * Monthly Reset Cron Job
 * Reseta usage_count de usuários free no dia 1 de cada mês
 * Executado automaticamente quando o servidor inicia
 */

import { supabase } from "../lib/supabaseClient";

let isRunning = false;
let lastResetDate: string | null = null;

/**
 * Verifica se é dia 1 e executa o reset mensal
 */
export async function runMonthlyReset() {
  if (isRunning) {
    console.log("[Cron] Monthly reset already running");
    return;
  }

  const today = new Date();
  const dateKey = `${today.getFullYear()}-${today.getMonth() + 1}`;

  // Evita reset duplicado no mesmo mês
  if (lastResetDate === dateKey) {
    console.log(`[Cron] Monthly reset already completed for ${dateKey}`);
    return;
  }

  // Só executa no dia 1
  if (today.getDate() !== 1) {
    console.log(`[Cron] Not the 1st of month (${today.getDate()}), skipping reset`);
    return;
  }

  isRunning = true;
  console.log(`[Cron] Starting monthly usage reset for ${dateKey}...`);

  try {
    const { data, error } = await supabase
      .from("users")
      .update({ usage_count: 0 })
      .eq("plan", "free")
      .select("id, email");

    if (error) {
      console.error(`[Cron] Error resetting usage: ${error.message}`);
      return;
    }

    const resetCount = data?.length || 0;
    console.log(`[Cron] ✅ Reset ${resetCount} free users for ${dateKey}`);
    lastResetDate = dateKey;
  } catch (err: any) {
    console.error(`[Cron] Monthly reset failed: ${err.message}`);
  } finally {
    isRunning = false;
  }
}

/**
 * Inicia verificação automática a cada 24 horas
 * Verifica se é dia 1 e executa o reset se necessário
 */
export function startMonthlyResetJob() {
  console.log("[Cron] Monthly reset job scheduled (checking every 24h)");

  // Executa imediatamente ao iniciar (para teste)
  runMonthlyReset();

  // Agenda verificação a cada 24 horas
  setInterval(runMonthlyReset, 24 * 60 * 60 * 1000);
}
