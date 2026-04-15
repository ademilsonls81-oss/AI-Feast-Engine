/**
 * AutoFixes — Página de Histórico de Correções Automáticas
 * 
 * Exibe correções aplicadas automaticamente pelo sistema.
 * Dados vindos da tabela auto_fixes via Supabase.
 */

import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { motion } from "motion/react";
import { CheckCircle, XCircle, Clock, GitCommit, RefreshCw, Zap } from "lucide-react";
import { Badge, EmptyState, Spinner } from "../../components/ui";

interface AutoFix {
  id: string;
  error_id: string | null;
  status: "pending" | "applied" | "failed" | "rolled_back";
  description: string | null;
  commit_hash: string | null;
  files_changed: number | null;
  risk_level: string | null;
  execution_time_ms: number | null;
  created_at: string;
  executed_at: string | null;
}

const statuses = [
  { value: "all", label: "Todos", color: "text-gray-400" },
  { value: "applied", label: "Aplicado", color: "text-green-400" },
  { value: "failed", label: "Falhou", color: "text-red-400" },
  { value: "pending", label: "Pendente", color: "text-yellow-400" },
  { value: "rolled_back", label: "Revertido", color: "text-orange-400" }
];

export default function AutoFixes() {
  const { user, profile, loading } = useAuth();
  const [fixes, setFixes] = useState<AutoFix[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filter, setFilter] = useState("all");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    if (!loading && profile?.role !== "admin") {
      return;
    }
    fetchFixes();
  }, [loading, profile]);

  async function fetchFixes() {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from('auto_fixes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error("[AutoFixes] Error fetching:", error);
        return;
      }

      setFixes(data || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("[AutoFixes] Exception:", err);
    } finally {
      setLoadingData(false);
    }
  }

  const filteredFixes = filter === "all" 
    ? fixes 
    : fixes.filter(f => f.status === filter);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "applied": return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "failed": return <XCircle className="w-5 h-5 text-red-500" />;
      case "pending": return <Clock className="w-5 h-5 text-yellow-500" />;
      case "rolled_back": return <XCircle className="w-5 h-5 text-orange-500" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatTimestamp = (dateStr: string | null) => {
    if (!dateStr) return "—";
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

  const formatDuration = (ms: number | null) => {
    if (!ms) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (loading || (loadingData && !fixes.length)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-gray-400 mt-4">Carregando correções...</p>
        </div>
      </div>
    );
  }

  if (profile?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center text-red-400">
          <XCircle className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
          <p className="text-gray-400">Somente administradores podem visualizar esta seção.</p>
        </div>
      </div>
    );
  }

  const appliedCount = fixes.filter(f => f.status === "applied").length;
  const successRate = fixes.length > 0 ? Math.round((appliedCount / fixes.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-dark-bg px-4 py-8">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Zap className="w-8 h-8 text-neon-purple" />
            Correções Automáticas
          </h1>
          <p className="text-gray-400">Histórico de correções aplicadas pelo sistema autônomo</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-dark-card border border-white/10 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Total de Correções</div>
            <div className="text-2xl font-bold text-white">{fixes.length}</div>
          </div>
          <div className="bg-dark-card border border-white/10 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Sucesso</div>
            <div className="text-2xl font-bold text-green-400">{appliedCount}</div>
          </div>
          <div className="bg-dark-card border border-white/10 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Taxa de Sucesso</div>
            <div className="text-2xl font-bold text-neon-cyan">{successRate}%</div>
          </div>
          <div className="bg-dark-card border border-white/10 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Última Atualização</div>
            <div className="text-lg font-bold text-white">{formatTimestamp(lastRefresh.toISOString())}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {statuses.map((stat) => (
            <button
              key={stat.value}
              onClick={() => setFilter(stat.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === stat.value
                  ? "bg-neon-cyan text-black shadow-lg shadow-neon-cyan/20"
                  : "bg-dark-card border border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20"
              }`}
            >
              {getStatusIcon(stat.value)}
              {stat.label}
            </button>
          ))}
          
          <div className="ml-auto">
            <button
              onClick={fetchFixes}
              disabled={loadingData}
              className="flex items-center gap-2 px-4 py-2 bg-dark-card border border-white/10 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${loadingData ? "animate-spin" : ""}`} />
              <span className="text-sm text-gray-400">Atualizar</span>
            </button>
          </div>
        </div>

        {/* Fixes Table */}
        {filteredFixes.length === 0 ? (
          <EmptyState
            context="logs"
            title="Nenhuma correção registrada"
            description="O sistema ainda não aplicou correções automáticas."
          />
        ) : (
          <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-black/30 border-b border-white/5">
                  <tr>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Descrição</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Commit</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Arquivos</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Duração</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFixes.map((fix) => (
                    <motion.tr
                      key={fix.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(fix.status)}
                          <Badge 
                            variant="tag" 
                            label={fix.status.toUpperCase().replace("_", " ")} 
                          />
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="max-w-md">
                          <div className="text-sm text-gray-200 truncate" title={fix.description || "Sem descrição"}>
                            {fix.description || "Descrição não disponível"}
                          </div>
                          {fix.risk_level && (
                            <Badge 
                              variant="tag" 
                              label={`Risco: ${fix.risk_level.toUpperCase()}`} 
                            />
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {fix.commit_hash ? (
                          <code className="flex items-center gap-1 text-xs text-neon-cyan font-mono">
                            <GitCommit className="w-3 h-3" />
                            {fix.commit_hash.substring(0, 7)}
                          </code>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-400">
                          {fix.files_changed !== null ? `${fix.files_changed} arquivos` : "—"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-400 font-mono">
                          {formatDuration(fix.execution_time_ms)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-400">
                          {formatTimestamp(fix.executed_at || fix.created_at)}
                        </span>
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
