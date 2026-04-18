/**
 * SystemErrors — Página de Monitoramento de Erros do Sistema
 * 
 * Exibe erros críticos capturados pelo sistema autônomo.
 * Dados vindos da tabela system_errors via Supabase.
 */

import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { motion } from "framer-motion";
import { AlertTriangle, AlertCircle, AlertOctagon, RefreshCw, XCircle, Filter } from "lucide-react";
import { Badge, EmptyState, Spinner } from "../../components/ui";

interface SystemError {
  id: string;
  error_type: string;
  source: string;
  message: string;
  stack_trace: string | null;
  severity: "info" | "warning" | "error" | "critical";
  endpoint: string | null;
  http_status: number | null;
  retry_count: number;
  resolved: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

const severities = [
  { value: "all", label: "Todos" },
  { value: "critical", label: "Crítico" },
  { value: "error", label: "Erro" },
  { value: "warning", label: "Aviso" },
  { value: "info", label: "Info" },
];

export default function SystemErrors() {
  const { user, profile, loading } = useAuth();
  const [errors, setErrors] = useState<SystemError[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filter, setFilter] = useState("all");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    if (!loading && profile?.role !== "admin") {
      return;
    }
    fetchErrors();
  }, [loading, profile]);

  async function fetchErrors() {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from("system_errors")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("[SystemErrors] Error fetching:", error);
        return;
      }

      setErrors(data || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("[SystemErrors] Exception:", err);
    } finally {
      setLoadingData(false);
    }
  }

  async function resolveError(errorId: string) {
    try {
      const { error } = await supabase
        .from("system_errors")
        .update({ resolved: true })
        .eq("id", errorId);

      if (error) {
        console.error("[SystemErrors] Resolve error:", error);
        return;
      }

      setErrors((prev) =>
        prev.map((e) => (e.id === errorId ? { ...e, resolved: true } : e))
      );
    } catch (err) {
      console.error("[SystemErrors] Resolve exception:", err);
    }
  }

  const filteredErrors = filter === "all" 
    ? errors 
    : errors.filter(e => e.severity === filter);

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case "critical": return <XCircle className="w-5 h-5 text-red-500" />;
    case "error": return <AlertOctagon className="w-5 h-5 text-orange-500" />;
    case "warning": return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case "info": return <AlertCircle className="w-5 h-5 text-blue-500" />;
    default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
  }
};

  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);

    if (diffMins < 1) return "Agora mesmo";
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return date.toLocaleString("pt-BR");
  };

  if (loading || (loadingData && !errors.length)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-gray-400 mt-4">Carregando erros...</p>
        </div>
      </div>
    );
  }

  if (profile?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center text-red-400">
          <AlertCircle className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
          <p className="text-gray-400">Somente administradores podem visualizar esta seção.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg px-4 py-8">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-neon-cyan" />
            Erros do Sistema
          </h1>
          <p className="text-gray-400">Monitoramento em tempo real de falhas e exceções</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {severities.map((sev) => {
            const isActive = filter === sev.value;
            return (
              <button
                key={sev.value}
                onClick={() => setFilter(sev.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? "bg-neon-cyan text-black shadow-lg shadow-neon-cyan/20"
                    : "bg-dark-card border border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20"
                }`}
              >
                {sev.label}
              </button>
            );
          })}
          
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {filteredErrors.length} erro(s) • Atualizado {formatTimestamp(lastRefresh.toISOString())}
            </span>
            <button
              onClick={fetchErrors}
              disabled={loadingData}
              className="p-2 bg-dark-card border border-white/10 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${loadingData ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Errors Table */}
        {filteredErrors.length === 0 ? (
          <EmptyState
            context="logs"
            title="Nenhum erro registrado"
            description="O sistema está operando normalmente."
          />
        ) : (
          <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-black/30 border-b border-white/5">
                  <tr>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Severidade</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Mensagem</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Fonte</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Endpoint</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Data</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredErrors.map((err) => (
                    <motion.tr
                      key={err.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(err.severity)}
                          <Badge 
                            variant="tag" 
                            label={err.severity.toUpperCase()} 
                          />
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="max-w-md">
                          <div className="font-mono text-sm text-gray-200 truncate" title={err.message}>
                            {err.message}
                          </div>
                          <div className="text-xs text-gray-500 mt-1" title={err.error_type}>
                            {err.error_type}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-300 truncate max-w-xs" title={err.source}>
                          {err.source}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {err.endpoint ? (
                          <div className="flex flex-col gap-1">
                            <code className="text-xs text-neon-cyan font-mono">{err.endpoint}</code>
                            {err.http_status && (
                              <Badge 
                                variant="tag" 
                                label={`${err.http_status}`} 
                              />
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-400">
                          {formatTimestamp(err.created_at)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {err.resolved ? (
                          <span className="text-xs text-green-400">✓ Resolvido</span>
                        ) : (
                          <button
                            onClick={() => resolveError(err.id)}
                            className="text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded transition-colors"
                          >
                            Marcar Resolvido
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
