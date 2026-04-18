/**
 * AuditLogs — Página de Auditoria para Administradores
 * 
 * Exibe todas as ações críticas realizadas pelos usuários no sistema.
 * Dados vindos da tabela audit_logs via Supabase.
 */

import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import api from "../../lib/api";
import { getAuthHeaders } from "../../lib/authHeaders";
import { motion } from "framer-motion";
import { Shield, Search, RefreshCw, User, Terminal, Globe, Calendar, Info, Clock, AlertCircle } from "lucide-react";
import { Badge, EmptyState, Spinner } from "../../components/ui";

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  ip: string | null;
  user_agent: string | null;
  details: Record<string, any>;
  created_at: string;
  // Enriched
  user_email?: string;
}

export default function AuditLogs() {
  const { user, profile, loading } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    if (!loading && profile?.role !== "admin") {
      return;
    }
    fetchLogs();
  }, [loading, profile]);

  async function fetchLogs() {
    try {
      setLoadingData(true);
      const headers = await getAuthHeaders();
      const res = await api.get('/api/admin/audit-logs?limit=100', { headers });
      
      const rawLogs = res.data?.logs || [];
      
      // Fetch user emails for the logs
      const userIds = Array.from(new Set(rawLogs.map((l: AuditLog) => l.user_id)));
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from("users")
          .select("id, email")
          .in("id", userIds);
          
        const userMap: Record<string, string> = {};
        usersData?.forEach(u => userMap[u.id] = u.email);
        
        const enriched = rawLogs.map((l: AuditLog) => ({
          ...l,
          user_email: userMap[l.user_id] || "Unknown User"
        }));
        setLogs(enriched);
      } else {
        setLogs(rawLogs);
      }
      
      setLastRefresh(new Date());
    } catch (err) {
      console.error("[AuditLogs] Exception:", err);
    } finally {
      setLoadingData(false);
    }
  }

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    l.id.includes(search)
  );

  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
  };

  if (loading || (loadingData && !logs.length)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-gray-400 mt-4">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  if (profile?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center text-red-400">
          <AlertCircle className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-400">Only administrators can view system audit logs.</p>
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
            <Shield className="w-8 h-8 text-neon-purple" />
            Audit Logs
          </h1>
          <p className="text-gray-400">Comprehensive history of system actions and security events</p>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by action, user or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-dark-card border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-neon-purple outline-none transition-all text-white"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:block">
              Last update: {lastRefresh.toLocaleTimeString()}
            </span>
            <button
              onClick={fetchLogs}
              disabled={loadingData}
              className="px-4 py-2.5 bg-dark-card border border-white/10 rounded-xl text-sm font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingData ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Logs Table */}
        {filteredLogs.length === 0 ? (
          <EmptyState
            context="logs"
            title="No logs found"
            description={search ? "Try adjusting your search filters." : "No audit records shared yet."}
          />
        ) : (
          <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-black/30 border-b border-white/5">
                  <tr>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Action</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">User</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Metadata</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          <code className="text-sm text-neon-purple font-bold font-mono">
                            {log.action}
                          </code>
                          <span className="text-[10px] text-gray-600 font-mono group-hover:text-gray-500">
                            {log.id}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <div className="text-sm text-gray-200 font-medium">{log.user_email}</div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                                <span className="flex items-center gap-1"><Globe className="w-2.5 h-2.5" /> {log.ip || 'Local'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-2">
                           {Object.entries(log.details || {}).slice(0, 3).map(([key, val]) => (
                             <div key={key} className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/40 border border-white/5 text-[10px]">
                                <span className="text-gray-500 uppercase">{key}:</span>
                                <span className="text-gray-300 font-medium truncate max-w-[100px]">{JSON.stringify(val)}</span>
                             </div>
                           ))}
                           {Object.keys(log.details || {}).length > 3 && (
                             <Badge variant="tag" label={`+${Object.keys(log.details).length - 3}`} />
                           )}
                           {!log.details && <span className="text-gray-600 italic text-xs">No details</span>}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col items-end gap-1">
                          <div className="text-sm text-gray-300 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-gray-500" />
                            {formatTimestamp(log.created_at)}
                          </div>
                          <div className="text-[10px] text-gray-600 flex items-center gap-1">
                             <Clock className="w-2.5 h-2.5" />
                             {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
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
