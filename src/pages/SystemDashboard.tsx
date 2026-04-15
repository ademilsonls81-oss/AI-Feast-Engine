/**
 * SystemDashboard — Fase 11: Dashboard Visual do Sistema Autônomo
 * 
 * Página protegida por autenticação de admin que exibe:
 *   - Status geral do sistema (loop, circuit breaker, modo autônomo)
 *   - Erros recentes (últimos 10)
 *   - Correções automáticas (histórico de auto_fixes)
 *   - Decisões de risco (últimas análises)
 *   - Métricas rápidas (execuções hoje, correções, erros)
 * 
 * Atualização em tempo real via polling a cada 30s.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Zap,
  TrendingUp,
  RefreshCw,
  Terminal,
  GitCommit,
  AlertCircle,
  BarChart3
} from "lucide-react";
import { motion } from "motion/react";

// ==========================================
// TYPES
// ==========================================

interface SystemStatus {
  loop_status: {
    is_running: boolean;
    can_execute: boolean;
    message: string;
  };
  circuit_breaker: {
    is_active: boolean;
    consecutive_failures: number;
    threshold: number;
    cooldown_ends_at?: string;
    message: string;
  };
  last_loop_execution: string | null;
  total_fixes_applied: number;
  errors_last_24h: number;
  timestamp: string;
}

interface SystemError {
  id: string;
  error_type: string;
  source: string;
  message: string;
  stack_trace: string | null;
  severity: string;
  endpoint: string | null;
  http_status: number | null;
  created_at: string;
}

interface AutoFix {
  id: string;
  status: string;
  commit_hash: string | null;
  created_at: string;
  [key: string]: any;
}

interface RiskDecision {
  id: string;
  risk_level: string;
  decision: string;
  risk_score: number;
  created_at: string;
  [key: string]: any;
}

interface Metrics {
  today: {
    errors_detected: number;
    fixes_applied: number;
    risk_decisions: number;
    posts_published: number;
  };
  yesterday: {
    errors_detected: number;
    fixes_applied: number;
  };
  timestamp: string;
}

// ==========================================
// API HELPERS
// ==========================================

async function fetchAdminEndpoint<T>(endpoint: string): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const response = await fetch(`/api/admin${endpoint}`, {
    headers: {
      "Authorization": `Bearer ${session.access_token}`
    }
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ==========================================
// COMPONENTS
// ==========================================

function StatusBadge({ status, label }: { status: "online" | "problem" | "warning"; label: string }) {
  const colors = {
    online: "bg-green-500",
    problem: "bg-red-500",
    warning: "bg-yellow-500"
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
      <div className={`w-3 h-3 rounded-full ${colors[status]} animate-pulse`} />
      <span className="text-sm text-gray-300">{label}</span>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, trend }: { icon: any; label: string; value: number | string; trend?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-xl p-4 border border-gray-700"
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5 text-blue-400" />
        {trend !== undefined && (
          <span className={`text-xs ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </motion.div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    low: "bg-green-900 text-green-300",
    medium: "bg-yellow-900 text-yellow-300",
    high: "bg-red-900 text-red-300",
    critical: "bg-red-900 text-red-300 font-bold"
  };

  return (
    <span className={`px-2 py-1 rounded text-xs ${colors[severity] || "bg-gray-700 text-gray-300"}`}>
      {severity.toUpperCase()}
    </span>
  );
}

function RiskLevelBadge({ riskLevel }: { riskLevel: string }) {
  const colors: Record<string, string> = {
    low: "bg-green-900 text-green-300",
    medium: "bg-yellow-900 text-yellow-300",
    high: "bg-orange-900 text-orange-300",
    critical: "bg-red-900 text-red-300 font-bold"
  };

  return (
    <span className={`px-2 py-1 rounded text-xs ${colors[riskLevel] || "bg-gray-700 text-gray-300"}`}>
      {riskLevel.toUpperCase()}
    </span>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  const colors: Record<string, string> = {
    auto_apply: "bg-green-900 text-green-300",
    require_review: "bg-yellow-900 text-yellow-300",
    block: "bg-red-900 text-red-300"
  };

  return (
    <span className={`px-2 py-1 rounded text-xs ${colors[decision] || "bg-gray-700 text-gray-300"}`}>
      {decision.toUpperCase().replace("_", " ")}
    </span>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);

  if (diffMins < 1) return "Agora mesmo";
  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  return date.toLocaleDateString("pt-BR");
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function SystemDashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [errors, setErrors] = useState<SystemError[]>([]);
  const [fixes, setFixes] = useState<AutoFix[]>([]);
  const [decisions, setDecisions] = useState<RiskDecision[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  // refs para evitar race conditions
  const lastRequestTimestamp = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Verificar se é admin e redirecionar se necessário
  useEffect(() => {
    if (!loading) {
      if (!user || profile?.role !== "admin") {
        navigate("/admin");
        return; // Previne renderização e chamadas API
      }
    }
  }, [user, profile, loading, navigate]);

  // Helper para verificar sessão válida antes de fetch
  async function checkSessionAndRedirect(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        console.error("[SystemDashboard] Session expired or error:", error);
        navigate("/admin");
        return false;
      }
      return true;
    } catch (err) {
      console.error("[SystemDashboard] Session check error:", err);
      navigate("/admin");
      return false;
    }
  }

  // Helper: Promise with timeout
  const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
    const timeout = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), ms)
    );
    return Promise.race([promise, timeout]);
  };

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    // Criar novo AbortController para esta requisição
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const requestTime = Date.now();
    lastRequestTimestamp.current = requestTime;

    try {
      setError(null);
      setLoadingData(true);

      // Verificar sessão antes de continuar
      const hasValidSession = await checkSessionAndRedirect();
      if (!hasValidSession) return;

      // Usar Promise.allSettled em vez de Promise.all para evitar fail-fast
      const results = await Promise.allSettled([
        withTimeout(fetchAdminEndpoint<SystemStatus>("/system/status"), 15000, "Status timeout"),
        withTimeout(fetchAdminEndpoint<{ errors: SystemError[] }>("/system/errors?limit=10"), 15000, "Errors timeout"),
        withTimeout(fetchAdminEndpoint<{ fixes: AutoFix[] }>("/system/fixes?limit=10"), 15000, "Fixes timeout"),
        withTimeout(fetchAdminEndpoint<{ decisions: RiskDecision[] }>("/system/decisions?limit=10"), 15000, "Decisions timeout"),
        withTimeout(fetchAdminEndpoint<Metrics>("/system/metrics"), 15000, "Metrics timeout")
      ]);

      // Verificar se ainda é a última requisição (evitar race condition)
      if (requestTime !== lastRequestTimestamp.current || controller.signal.aborted) {
        console.log("[SystemDashboard] Ignoring stale response");
        return;
      }

      // Processar resultados filtrando apenas os fulfilled
      const [statusResult, errorsResult, fixesResult, decisionsResult, metricsResult] = results;

      if (statusResult.status === "fulfilled") setStatus(statusResult.value);
      else console.error("[SystemDashboard] Status fetch failed:", statusResult.reason);

      if (errorsResult.status === "fulfilled") setErrors(errorsResult.value.errors || []);
      else console.error("[SystemDashboard] Errors fetch failed:", errorsResult.reason);

      if (fixesResult.status === "fulfilled") setFixes(fixesResult.value.fixes || []);
      else console.error("[SystemDashboard] Fixes fetch failed:", fixesResult.reason);

      if (decisionsResult.status === "fulfilled") setDecisions(decisionsResult.value.decisions || []);
      else console.error("[SystemDashboard] Decisions fetch failed:", decisionsResult.reason);

      if (metricsResult.status === "fulfilled") setMetrics(metricsResult.value);
      else console.error("[SystemDashboard] Metrics fetch failed:", metricsResult.reason);

      setLastRefresh(new Date());
    } catch (err: any) {
      console.error("[SystemDashboard] Error fetching data:", err);
      setError(err.message);
      
      // Show user-friendly error if timeout or network issue
      if (err.message.includes("timeout") || err.message.includes("Failed to fetch")) {
        alert("⚠️ Erro de conexão ou tempo esgotado. Verifique sua internet e tente novamente.");
      }
    } finally {
      // Só remover loading se ainda for a última requisição
      if (requestTime === lastRequestTimestamp.current && !controller.signal.aborted) {
        setLoadingData(false);
      }
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Polling a cada 30s com verificação de sessão
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = async () => {
      // Verificar sessão antes de iniciar polling
      const hasValidSession = await checkSessionAndRedirect();
      if (!hasValidSession) return;

      intervalId = setInterval(async () => {
        // Verificar sessão a cada intervalo
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log("[SystemDashboard] Session expired during polling, stopping");
          if (intervalId) clearInterval(intervalId);
          navigate("/admin");
          return;
        }
        fetchAllData();
      }, 30000);
    };

    startPolling();

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchAllData, navigate]);

  if (loading || loadingData && !status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">Erro ao carregar dashboard</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchAllData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Calcular status geral
  const systemStatus: "online" | "problem" | "warning" = 
    status?.circuit_breaker.is_active ? "problem" :
    status?.errors_last_24h > 20 ? "warning" : "online";

  const autonomousMode = status?.loop_status.can_execute ? "ON" : "OFF";

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Activity className="w-6 h-6 text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold">Sistema Autônomo v2</h1>
                <p className="text-sm text-gray-400">Dashboard de Monitoramento</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={systemStatus} label={systemStatus === "online" ? "Online" : systemStatus === "problem" ? "Problema" : "Atenção"} />
              <StatusBadge
                status={autonomousMode === "ON" ? "online" : "warning"}
                label={`Autônomo: ${autonomousMode}`}
              />
              <button
                onClick={fetchAllData}
                disabled={loadingData}
                className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loadingData ? "animate-spin" : ""}`} />
                <span className="text-sm">Atualizar</span>
              </button>
              <div className="text-xs text-gray-500">
                Última atualização: {lastRefresh.toLocaleTimeString("pt-BR")}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Métricas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={BarChart3}
            label="Erros Detectados (Hoje)"
            value={metrics?.today.errors_detected || 0}
            trend={metrics?.yesterday.errors_detected ? Math.round((1 - (metrics.today.errors_detected / metrics.yesterday.errors_detected)) * 100) : undefined}
          />
          <MetricCard
            icon={CheckCircle}
            label="Correções Aplicadas (Hoje)"
            value={metrics?.today.fixes_applied || 0}
            trend={metrics?.yesterday.fixes_applied ? Math.round((1 - (metrics.today.fixes_applied / metrics.yesterday.fixes_applied)) * 100) : undefined}
          />
          <MetricCard
            icon={Shield}
            label="Decisões de Risco (Hoje)"
            value={metrics?.today.risk_decisions || 0}
          />
          <MetricCard
            icon={TrendingUp}
            label="Posts Publicados (Hoje)"
            value={metrics?.today.posts_published || 0}
          />
        </div>

        {/* Status Geral */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Status Geral
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Loop Principal</div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${status?.loop_status.is_running ? "bg-yellow-400 animate-pulse" : "bg-green-400"}`} />
                <span className="font-medium">
                  {status?.loop_status.is_running ? "Executando" : "Inativo"}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{status?.loop_status.message}</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Circuit Breaker</div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${status?.circuit_breaker.is_active ? "bg-red-400 animate-pulse" : "bg-green-400"}`} />
                <span className="font-medium">
                  {status?.circuit_breaker.is_active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {status?.circuit_breaker.consecutive_failures}/{status?.circuit_breaker.threshold} falhas consecutivas
              </div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Última Execução</div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="font-medium">
                  {status?.last_loop_execution ? formatDate(status.last_loop_execution) : "Nunca"}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {status?.total_fixes_applied} correções aplicadas no total
              </div>
            </div>
          </div>
        </div>

        {/* Erros Recentes */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Erros Recentes ({errors.length})
          </h2>
          {errors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p>Nenhum erro encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {errors.map((err) => (
                <div key={err.id} className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Terminal className="w-4 h-4 text-gray-400" />
                        <span className="font-mono text-sm text-gray-300 truncate">{err.error_type}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{err.message}</p>
                      {err.endpoint && (
                        <p className="text-xs text-gray-600 mt-1">Endpoint: {err.endpoint}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <SeverityBadge severity={err.severity} />
                      <span className="text-xs text-gray-500">{formatDate(err.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Correções Automáticas */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Correções Automáticas ({fixes.length})
          </h2>
          {fixes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhuma correção automática registrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 px-3 text-gray-400">Status</th>
                    <th className="text-left py-2 px-3 text-gray-400">Commit</th>
                    <th className="text-left py-2 px-3 text-gray-400">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {fixes.map((fix) => (
                    <tr key={fix.id} className="border-b border-gray-800">
                      <td className="py-2 px-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          fix.status === "applied" ? "bg-green-900 text-green-300" :
                          fix.status === "failed" ? "bg-red-900 text-red-300" :
                          "bg-gray-700 text-gray-300"
                        }`}>
                          {fix.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-xs text-gray-400">
                        {fix.commit_hash ? (
                          <span className="flex items-center gap-1">
                            <GitCommit className="w-3 h-3" />
                            {fix.commit_hash.substring(0, 7)}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-500">
                        {formatDate(fix.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Decisões de Risco */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            Decisões de Risco ({decisions.length})
          </h2>
          {decisions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhuma decisão de risco registrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {decisions.map((decision) => (
                <div key={decision.id} className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <RiskLevelBadge riskLevel={decision.risk_level} />
                      <DecisionBadge decision={decision.decision} />
                      <span className="text-sm text-gray-400">
                        Score: {(decision.risk_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{formatDate(decision.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
