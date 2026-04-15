/**
 * AutoFixes — Página de Histórico de Correções Automáticas
 * 
 * Exibe correções geradas pelo sistema autônomo com dados de validação e deploy.
 * Dados vindos da tabela auto_fixes via Supabase.
 */

import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { motion } from "motion/react";
import { 
  CheckCircle, XCircle, Clock, RefreshCw, Zap, GitCommit, 
  Play, AlertCircle, Terminal, Rocket, Brain 
} from "lucide-react";
import { Badge, EmptyState, Spinner } from "../../components/ui";

interface AutoFix {
  id: string;
  error_ids: string[] | null;
  cause: string;
  fix: string;
  confidence: number;
  affected_files: string[];
  status: "pending_review" | "applied" | "rejected" | "auto_applied";
  applied_by: string | null;
  applied_at: string | null;
  review_notes: string | null;
  model_used: string | null;
  validation_status: "passed" | "failed" | "skipped" | null;
  fix_pattern: string | null;
  commit_hash: string | null;
  deploy_status: "pending" | "deployed" | "failed" | "skipped" | null;
  deployed_at: string | null;
  deployed_branch: string | null;
  deploy_error: string | null;
  created_at: string;
  updated_at: string;
}

const statuses = [
  { value: "all", label: "Todos" },
  { value: "pending_review", label: "Aguardando Revisão" },
  { value: "auto_applied", label: "Auto-Aplicado" },
  { value: "applied", label: "Aplicado" },
  { value: "rejected", label: "Rejeitado" },
];

const statusColors: Record<string, string> = {
  pending_review: "text-yellow-400 bg-yellow-500/20",
  auto_applied: "text-neon-cyan bg-neon-cyan/20",
  applied: "text-green-400 bg-green-500/20",
  rejected: "text-red-400 bg-red-500/20",
};

const validationColors: Record<string, string> = {
  passed: "text-green-400",
  failed: "text-red-400",
  skipped: "text-gray-400",
};

const deployColors: Record<string, string> = {
  pending: "text-yellow-400",
  deployed: "text-green-400",
  failed: "text-red-400",
  skipped: "text-gray-400",
};

export default function AutoFixes() {
  const { profile, loading } = useAuth();
  const [fixes, setFixes] = useState<AutoFix[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!loading && profile?.role === "admin") {
      fetchFixes();
    }
  }, [loading, profile]);

  async function fetchFixes() {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from("auto_fixes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("[AutoFixes] Error fetching:", error);
        return;
      }

      setFixes(data || []);
    } catch (err) {
      console.error("[AutoFixes] Exception:", err);
    } finally {
      setLoadingData(false);
    }
  }

  const filteredFixes =
    filter === "all"
      ? fixes
      : fixes.filter((f) => f.status === filter);

  const stats = {
    total: fixes.length,
    pending: fixes.filter((f) => f.status === "pending_review").length,
    auto: fixes.filter((f) => f.status === "auto_applied").length,
    applied: fixes.filter((f) => f.status === "applied").length,
    rejected: fixes.filter((f) => f.status === "rejected").length,
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const confidencePercent = (conf: number) => `${(conf * 100).toFixed(0)}%`;

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

  return (
    <div className="min-h-screen bg-dark-bg px-4 py-8">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Zap className="w-8 h-8 text-neon-purple" />
            Correções Automáticas
          </h1>
          <p className="text-gray-400">
            Diagnósticos e correções gerados pelo sistema autônomo
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-dark-card border border-white/10 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Total</div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-dark-card border border-yellow-500/20 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Aguardando</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
          </div>
          <div className="bg-dark-card border border-neon-cyan/20 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Auto-Aplicado</div>
            <div className="text-2xl font-bold text-neon-cyan">{stats.auto}</div>
          </div>
          <div className="bg-dark-card border border-green-500/20 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Aplicado</div>
            <div className="text-2xl font-bold text-green-400">{stats.applied}</div>
          </div>
          <div className="bg-dark-card border border-red-500/20 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Rejeitado</div>
            <div className="text-2xl font-bold text-red-400">{stats.rejected}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {statuses.map((stat) => (
            <button
              key={stat.value}
              onClick={() => setFilter(stat.value)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === stat.value
                  ? "bg-neon-cyan text-black shadow-lg"
                  : "bg-dark-card border border-white/10 text-gray-400 hover:text-gray-200"
              }`}
            >
              {stat.label}
            </button>
          ))}
          <button
            onClick={fetchFixes}
            disabled={loadingData}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-dark-card border border-white/10 rounded-lg hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingData ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Cards */}
        {filteredFixes.length === 0 ? (
          <EmptyState
            context="logs"
            title="Nenhuma correção registrada"
            description="O sistema ainda não gerou correções automáticas."
          />
        ) : (
          <div className="grid gap-4">
            {filteredFixes.map((fix) => (
              <motion.div
                key={fix.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-dark-card border border-white/10 rounded-2xl p-6"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        statusColors[fix.status] || "text-gray-400"
                      }`}
                    >
                      {fix.status.replace("_", " ").toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(fix.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Validation Status */}
                    {fix.validation_status && (
                      <div className="flex items-center gap-1">
                        <AlertCircle
                          className={`w-4 h-4 ${
                            validationColors[fix.validation_status]
                          }`}
                        />
                        <span
                          className={`text-xs font-bold ${
                            validationColors[fix.validation_status]
                          }`}
                        >
                          {fix.validation_status.toUpperCase()}
                        </span>
                      </div>
                    )}
                    {/* Deploy Status */}
                    {fix.deploy_status && (
                      <div className="flex items-center gap-1">
                        <Rocket
                          className={`w-4 h-4 ${
                            deployColors[fix.deploy_status]
                          }`}
                        />
                        <span
                          className={`text-xs font-bold ${
                            deployColors[fix.deploy_status]
                          }`}
                        >
                          {fix.deploy_status.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cause */}
                <div className="mb-4">
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">
                    Causa Raiz
                  </div>
                  <p className="text-sm text-gray-200">{fix.cause}</p>
                </div>

                {/* Fix */}
                <div className="mb-4">
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">
                    Correção Sugerida
                  </div>
                  <pre className="bg-black/40 p-3 rounded-lg text-xs text-neon-cyan font-mono overflow-x-auto">
                    {fix.fix}
                  </pre>
                </div>

                {/* Meta Row */}
                <div className="flex flex-wrap items-center gap-6 text-xs">
                  {/* Confidence */}
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-neon-purple" />
                    <span className="text-gray-400">Confiança:</span>
                    <span className="font-bold text-white">
                      {confidencePercent(fix.confidence)}
                    </span>
                  </div>

                  {/* Model */}
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-400">Modelo:</span>
                    <span className="text-gray-300">{fix.model_used || "—"}</span>
                  </div>

                  {/* Fix Pattern */}
                  {fix.fix_pattern && (
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-neon-cyan" />
                      <span className="text-gray-400">Pattern:</span>
                      <span className="text-gray-300">{fix.fix_pattern}</span>
                    </div>
                  )}

                  {/* Commit Hash */}
                  {fix.commit_hash && (
                    <div className="flex items-center gap-2">
                      <GitCommit className="w-4 h-4 text-neon-cyan" />
                      <code className="font-mono text-neon-cyan">
                        {fix.commit_hash.substring(0, 7)}
                      </code>
                    </div>
                  )}

                  {/* Deployed Branch */}
                  {fix.deployed_branch && (
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">{fix.deployed_branch}</span>
                    </div>
                  )}
                </div>

                {/* Files */}
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                    Arquivos Afetados
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {fix.affected_files?.map((file, i) => (
                      <span
                        key={i}
                        className="text-xs text-gray-400 bg-black/40 px-2 py-1 rounded"
                      >
                        {file}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}