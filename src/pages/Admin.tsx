import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { motion } from "motion/react";
import { Database, Plus, Trash2, Activity, List, ShieldCheck, Sparkles, Power, Eye, EyeOff, Play, FileText, AlertCircle, Users, Search, Filter, BarChart, UserCircle, Settings, Zap, CheckCircle, RefreshCw, History as HistoryIcon } from "lucide-react";
import api from "../lib/api";
import {
  Badge,
  OriginBadge,
  StatusBadge,
  EmptyState,
  Input,
  Textarea,
  Select,
  FormField,
  Button,
  Card,
  Spinner,
} from "../components/ui";
import { OnboardingTooltip } from "../components/onboarding";

interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  risk_level: string;
  is_active: boolean;
  verified: boolean;
  source?: string;
  downloads: number;
  created_at: string;
}

interface ImportLog {
  id: number;
  started_at: string;
  finished_at: string;
  discovered: number;
  extracted: number;
  approved: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  triggered_by: string;
}

// Helper: obter Bearer token da sessão Supabase
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  return { "Authorization": `Bearer ${session.access_token}` };
}

export default function Admin() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [feeds, setFeeds] = useState<any[]>([]);
  const [newFeed, setNewFeed] = useState({ url: "", name: "", category: "Tech" });
  const [logs, setLogs] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showAdminTooltip, setShowAdminTooltip] = useState(true);
  const [activeTab, setActiveTab] = useState("system");
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedHealth, setFeedHealth] = useState<Record<string, any>>({});
  const [feedHealthError, setFeedHealthError] = useState<string | null>(null);
  const [feedHealthLoading, setFeedHealthLoading] = useState(false);

  // Skills state
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillPrompt, setSkillPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSkillPreview, setGeneratedSkillPreview] = useState<any>(null);

  // Import logs state
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [showDryRunModal, setShowDryRunModal] = useState(false);

  // Kill switch state
  const [autonomousEnabled, setAutonomousEnabled] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  // Session status state
  const [sessionExpired, setSessionExpired] = useState(false);

  // refs para evitar race conditions
  const isMountedRef = useRef(false);
  const importOperationId = useRef<number>(0);
  const previousSubscriptionRef = useRef<any>(null);


  useEffect(() => {
    isMountedRef.current = true;
    setSessionExpired(false);

    // Initial check com AbortController e tratamento de erro
    const abortController = new AbortController();

    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error) {
        console.error("[Admin] getUser error:", error);
        if (error.message.includes("Invalid API key") || error.status === 401) {
          setSessionExpired(true);
        }
        return;
      }
      if (user && !abortController.signal.aborted && isMountedRef.current) {
        setUserId(user.id);
        checkAdminRole(user.id);
      }
    }).catch(err => {
      console.error("[Admin] getUser catch error:", err);
      if (err.message.includes("auth") || err.status === 401) {
        setSessionExpired(true);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && isMountedRef.current) {
        setSessionExpired(false);
        checkAdminRole(session.user.id);
      } else if (isMountedRef.current) {
        setIsAdmin(false);
        setSessionExpired(!session);
      }
    });

    return () => {
      isMountedRef.current = false;
      abortController.abort();
      subscription.unsubscribe();
      setIsLoading(false);
    };
  }, [navigate]);

  async function checkAdminRole(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', userId)
      .single();

    if (error) {
      console.error("Error checking admin role:", error.message);
      return;
    }

    console.log(`User ${data?.email} has role: ${data?.role}`);

    if (data?.role === 'admin') {
      setIsAdmin(true);
      console.log("✅ Admin access granted");
      // Carregar estado do kill switch
      fetchAutonomousStatus();
    } else {
      console.log("❌ Access denied: role is", data?.role);
    }
  }

  async function fetchAutonomousStatus() {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'autonomous_enabled')
        .single();

      if (error && !error.message.includes('no rows')) {
        console.error("[Admin] fetchAutonomousStatus error:", error);
        return;
      }

      if (data?.value !== undefined && isMountedRef.current) {
        setAutonomousEnabled(data.value);
      }
    } catch (err) {
      console.error("[Admin] fetchAutonomousStatus exception:", err);
    }
  }

  async function handleToggleAutonomous() {
    const newValue = !autonomousEnabled;
    setIsToggling(true);
    
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: 'autonomous_enabled', value: newValue }, { onConflict: 'key' });

      if (error) {
        throw error;
      }

      if (isMountedRef.current) {
        setAutonomousEnabled(newValue);
        alert(newValue 
          ? "✅ Sistema autônomo REATIVADO" 
          : "⚠️ Sistema autônomo PAUSADO");
      }
    } catch (err: any) {
      console.error("[Admin] handleToggleAutonomous error:", err);
      alert("❌ Erro ao alterar estado: " + (err.message || "Tente novamente"));
    } finally {
      if (isMountedRef.current) {
        setIsToggling(false);
      }
    }
  }

  useEffect(() => {
    if (!isAdmin) return;

    // AbortController para cancelar requisições se desmontar
    const abortController = new AbortController();
    
    // Cleanup da subscription anterior se existir (evitar isAdmin flip)
    if (previousSubscriptionRef.current) {
      previousSubscriptionRef.current.cleanup?.();
    }

    // Fetch initial feeds
    fetchFeeds();
    fetchSkills();
    fetchImportLogs();

    // Feeds subscription
    const feedsSub = supabase
      .channel('admin-feeds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feeds' }, () => {
        if (isMountedRef.current) fetchFeeds();
      })
      .subscribe();

    // Logs subscription
    fetchLogs();
    const logsSub = supabase
      .channel('admin-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'usage_logs' }, () => {
        if (isMountedRef.current) fetchLogs();
      })
      .subscribe();

    // Pending posts subscription
    fetchPendingCount();
    const pendingSub = supabase
      .channel('admin-pending')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        if (isMountedRef.current) fetchPendingCount();
      })
      .subscribe();

    // Audit logs subscription
    fetchAuditLogs();
    fetchUsers();
    fetchAllPosts();
    const auditSub = supabase
      .channel('admin-audit')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
        if (isMountedRef.current) fetchAuditLogs();
      })
      .subscribe();

    // Guardar cleanup para próxima renderização
    previousSubscriptionRef.current = {
      cleanup: () => {
        supabase.removeChannel(feedsSub);
        supabase.removeChannel(logsSub);
        supabase.removeChannel(pendingSub);
        supabase.removeChannel(auditSub);
      }
    };

    return () => {
      abortController.abort();
      if (previousSubscriptionRef.current?.cleanup) {
        previousSubscriptionRef.current.cleanup();
      }
    };
  }, [isAdmin]);

  async function fetchFeeds() {
    try {
      setFeedHealthLoading(true);
      setFeedHealthError(null);
      const { data: feedsData, error: feedsError } = await supabase.from('feeds').select('*').order('created_at', { ascending: false });
      if (feedsError) throw feedsError;
      const { data: healthData, error: healthError } = await supabase.from('feed_health').select('*');
      if (healthError) throw healthError;
      const healthMap: Record<string, any> = {};
      healthData?.forEach(h => { healthMap[h.feed_id] = h; });
      if (isMountedRef.current) {
        setFeeds(feedsData || []);
        setFeedHealth(healthMap);
      }
    } catch (err: any) {
      console.error("[Admin] fetchFeeds exception:", err);
      setFeedHealthError(err.message || "Erro ao carregar health");
    } finally {
      setFeedHealthLoading(false);
    }
  }

  async function fetchLogs() {
    try {
      const { data, error } = await supabase
        .from('usage_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);
      if (error) {
        console.error("[Admin] fetchLogs error:", error);
        return;
      }
      if (isMountedRef.current) {
        setLogs(data || []);
      }
    } catch (err) {
      console.error("[Admin] fetchLogs exception:", err);
    }
  }

  async function fetchPendingCount() {
    try {
      const { count, error } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) {
        console.error("[Admin] fetchPendingCount error:", error);
        return;
      }
      if (isMountedRef.current) {
        setPendingCount(count || 0);
      }
    } catch (err) {
      console.error("[Admin] fetchPendingCount exception:", err);
    }
  }

  async function fetchAuditLogs() {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) {
        console.error("[Admin] fetchAuditLogs error:", error);
        return;
      }
      if (isMountedRef.current) {
        setAuditLogs(data || []);
      }
    } catch (err) {
      console.error("[Admin] fetchAuditLogs exception:", err);
    }
  }

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error("[Admin] fetchUsers error:", error);
        return;
      }
      if (isMountedRef.current) {
        setAllUsers(data || []);
      }
    } catch (err) {
      console.error("[Admin] fetchUsers exception:", err);
    }
  }

  async function fetchAllPosts() {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, feeds(name)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) {
        console.error("[Admin] fetchAllPosts error:", error);
        return;
      }
      if (isMountedRef.current) {
        setAllPosts(data || []);
      }
    } catch (err) {
      console.error("[Admin] fetchAllPosts exception:", err);
    }
  }

  async function fetchSkills() {
    try {
      const res = await api.get("/api/skills");
      if (isMountedRef.current) {
        setSkills(res.data.skills || []);
      }
    } catch (err) {
      console.error("Error fetching skills:", err);
    }
  }

  const handleGenerateSkill = async () => {
    if (skillPrompt.trim().length < 10) {
      alert("⚠️ Descreva a skill com pelo menos 10 caracteres");
      return;
    }

    setIsGenerating(true);
    setGeneratedSkillPreview(null);

    try {
      const headers = await getAuthHeaders();
      const res = await api.post("/api/admin/skills/generate", { prompt: skillPrompt }, { headers });

      if (res.data.skill) {
        setGeneratedSkillPreview(res.data.skill);
        setSkillPrompt("");
        fetchSkills();
        alert(`✅ Skill gerada com sucesso: ${res.data.skill.name}`);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || "Erro desconhecido";
      alert(`❌ Erro ao gerar skill: ${errorMsg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleSkill = async (skill: Skill) => {
    try {
      const headers = await getAuthHeaders();
      await api.post(`/api/admin/skills/${skill.id}/toggle`, {}, { headers });
      fetchSkills();
    } catch (err: any) {
      alert("Erro ao alternar skill: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteSkill = async (skill: Skill) => {
    if (!window.confirm(`Tem certeza que deseja deletar "${skill.name}"?`)) return;
    try {
      const headers = await getAuthHeaders();
      await api.delete(`/api/admin/skills/${skill.id}`, { headers });
      fetchSkills();
      alert("Skill deletada com sucesso");
    } catch (err: any) {
      alert("Erro ao deletar skill: " + (err.response?.data?.error || err.message));
    }
  };

  // Import pipeline functions
  async function fetchImportLogs() {
    try {
      const res = await api.get("/api/admin/skills/import/logs");
      if (isMountedRef.current) {
        setImportLogs(res.data.logs || []);
      }
    } catch (err) {
      console.error("Error fetching import logs:", err);
    }
  }

  async function handleRunImport() {
    // Criar operation ID único para evitar race condition
    const currentOpId = ++importOperationId.current;
    setIsImporting(true);
    
    try {
      const headers = await getAuthHeaders();
      const res = await api.post("/api/admin/skills/import/manual", {}, { headers });
      
      // Only update if this is still the latest operation
      if (currentOpId === importOperationId.current && isMountedRef.current) {
        alert(`Import concluído: ${res.data.log.inserted} inseridas, ${res.data.log.updated} atualizadas`);
        fetchImportLogs();
        fetchSkills();
      }
    } catch (err: any) {
      if (currentOpId === importOperationId.current) {
        alert("Erro no import: " + (err.response?.data?.error || err.message));
      }
    } finally {
      if (currentOpId === importOperationId.current && isMountedRef.current) {
        setIsImporting(false);
      }
    }
  }

  async function handleDryRun() {
    const currentOpId = ++importOperationId.current;
    setIsImporting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await api.post("/api/admin/skills/import/manual", { dryRun: true }, { headers });
      
      if (currentOpId === importOperationId.current && isMountedRef.current) {
        setDryRunResult(res.data.log);
        setShowDryRunModal(true);
      }
    } catch (err: any) {
      if (currentOpId === importOperationId.current) {
        alert("Erro no dry run: " + (err.response?.data?.error || err.message));
      }
    } finally {
      if (currentOpId === importOperationId.current && isMountedRef.current) {
        setIsImporting(false);
      }
    }
  }

  const handleProcessBatch = async () => {
    if (!userId) return;
    setIsProcessing(true);
    try {
      await api.post("/api/admin/process-batch", {}, {
        headers: { 'X-User-Id': userId }
      });
      alert("Batch processing started!");
    } catch (err: any) {
      alert("Error starting batch: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRelogin = async () => {
    // Redirect to login page or trigger sign in
    window.location.href = "/";
  };

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/admin/feeds", newFeed);
      setNewFeed({ url: "", name: "", category: "Tech" });
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || "Erro desconhecido";
      alert(`❌ Erro ao adicionar feed: ${errorMsg}`);
    }
  };

  // Cleanup global ao desmontar
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-gray-400 mt-4">Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  // Session expired state
  if (sessionExpired) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-3">Sessão Expirada</h2>
          <p className="text-gray-400 mb-8">
            Sua sessão expirou ou você não tem permissão para acessar esta área. Faça login novamente para continuar.
          </p>
          <button
            onClick={handleRelogin}
            className="px-8 py-4 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl font-bold shadow-lg shadow-neon-purple/20 hover:scale-105 transition-all"
          >
            Fazer Login Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) return <div className="p-12 text-center text-red-400">Access Denied. Admin only.</div>;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
        <h1 className="text-4xl font-display font-bold flex items-center gap-4">
          <ShieldCheck className="w-10 h-10 text-neon-purple" />
          Admin <span className="text-neon-cyan">Control Center</span>
        </h1>
        
        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar max-w-full">
          {[
            { id: "system", icon: Activity, label: "System" },
            { id: "users", icon: Users, label: "Users" },
            { id: "feeds", icon: List, label: "Sources" },
            { id: "health", icon: Activity, label: "Health" },
            { id: "posts", icon: Database, label: "Posts" },
            { id: "skills", icon: Sparkles, label: "Skills" },
            { id: "logs", icon: BarChart, label: "Logs" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-neon-purple to-neon-cyan text-white shadow-lg shadow-neon-purple/20"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <OnboardingTooltip
        context="dashboard"
        message="Manage feeds, generate skills with AI, and monitor import pipelines. All admin tools are below."
        onDismiss={() => setShowAdminTooltip(false)}
      />

      {/* TAB CONTENT */}
      <div className="space-y-8">
        {activeTab === "system" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* Kill Switch Card */}
            <div className="p-8 bg-dark-card border border-white/10 rounded-3xl">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl ${autonomousEnabled ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    <Power className={`w-10 h-10 ${autonomousEnabled ? 'text-green-400' : 'text-red-400'}`} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Sistema Autônomo</h2>
                    <p className="text-gray-400">
                      {autonomousEnabled 
                        ? "✅ O motor de ingestão e correção está OPERANTE" 
                        : "⚠️ Todas as ações preventivas e automáticas estão PAUSADAS"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleAutonomous}
                  disabled={isToggling}
                  className={`min-w-[200px] px-8 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 ${
                    autonomousEnabled
                      ? "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                      : "bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30"
                  } disabled:opacity-50`}
                >
                  <Power className={`w-5 h-5 ${isToggling ? 'animate-spin' : ''}`} />
                  {isToggling ? "Alterando..." : (autonomousEnabled ? "PAUSAR AGORA" : "ATIVAR AGORA")}
                </button>
              </div>
            </div>

            {/* Processing Info */}
            <div className="p-8 bg-dark-card border border-white/10 rounded-3xl">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-neon-cyan" /> Batch Processing Pipeline
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-black/40 border border-white/5 rounded-2xl text-center">
                  <div className="text-3xl font-bold text-neon-purple mb-1">{pendingCount}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-widest">Pending Posts</div>
                </div>
                <div className="md:col-span-2 p-6 bg-neon-purple/5 border border-neon-purple/10 rounded-2xl flex items-center justify-between">
                  <p className="text-sm text-gray-400 max-w-sm">
                    Manual trigger to process posts from all RSS sources. Uses AI translation and summarization.
                  </p>
                  <Button
                    variant="primary"
                    loading={isProcessing}
                    disabled={pendingCount === 0}
                    onClick={handleProcessBatch}
                    className="px-10"
                  >
                    Process Batch Now
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-dark-card border border-white/10 rounded-3xl">
               <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                 <ShieldCheck className="w-5 h-5 text-neon-cyan" /> Access Advanced Monitors
               </h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <button onClick={() => navigate('/admin/system')} className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-left group">
                   <Activity className="w-8 h-8 text-neon-cyan mb-3 group-hover:scale-110 transition-transform" />
                   <div className="font-bold mb-1">System Health Visualizer</div>
                   <div className="text-xs text-gray-500">Loop metrics, circuit breaker status and real-time polling.</div>
                 </button>
                 <button onClick={() => navigate('/admin/system-errors')} className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-left group">
                   <AlertCircle className="w-8 h-8 text-red-500 mb-3 group-hover:scale-110 transition-transform" />
                   <div className="font-bold mb-1">Error Logs Dashboard</div>
                   <div className="text-xs text-gray-500">Detailed traces, severity tracking and investigation tools.</div>
                 </button>
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === "users" && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-8 bg-dark-card border border-white/10 rounded-3xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <Users className="w-6 h-6 text-neon-cyan" /> User Management ({allUsers.length})
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input 
                  className="pl-10 w-64" 
                  placeholder="Search users..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-widest border-b border-white/5">
                    <th className="pb-4 pt-0 font-bold">User / Email</th>
                    <th className="pb-4 pt-0 font-bold">Plan</th>
                    <th className="pb-4 pt-0 font-bold">Usage</th>
                    <th className="pb-4 pt-0 font-bold">Role</th>
                    <th className="pb-4 pt-0 font-bold">Joined</th>
                    <th className="pb-4 pt-0 font-bold text-right">API Key</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allUsers.filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase())).map(user => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-neon-purple/20 flex items-center justify-center text-neon-purple text-xs font-bold">
                            {user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold">{user.email}</div>
                            <div className="text-[10px] text-gray-500 font-mono">{user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <Badge variant={user.plan === 'pro' ? 'popular' : 'tag'} label={user.plan.toUpperCase()} />
                      </td>
                      <td className="py-4 text-sm font-mono text-neon-cyan">
                        {user.usage_count} <span className="text-gray-600 text-[10px]">/ {user.rate_limit}</span>
                      </td>
                      <td className="py-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${user.role === 'admin' ? 'bg-neon-purple/20 text-neon-purple' : 'bg-white/10 text-gray-400'}`}>
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 text-xs text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 text-right">
                        <code className="text-[10px] text-gray-600 font-mono">{user.api_key.substring(0, 10)}...</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allUsers.length === 0 && <EmptyState context="users" />}
            </div>
          </motion.div>
        )}

        {activeTab === "feeds" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="p-8 bg-dark-card border border-white/10 rounded-3xl">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-neon-cyan" /> Add New Source
              </h2>
              <form onSubmit={handleAddFeed} className="space-y-4">
                <FormField label="Source Name">
                  <Input
                    placeholder="e.g. TechCrunch"
                    value={newFeed.name}
                    onChange={e => setNewFeed({...newFeed, name: e.target.value})}
                    required
                  />
                </FormField>
                <FormField label="RSS Feed URL">
                  <Input
                    type="url"
                    placeholder="https://example.com/feed"
                    value={newFeed.url}
                    onChange={e => setNewFeed({...newFeed, url: e.target.value})}
                    required
                  />
                </FormField>
                <FormField label="Category">
                  <Select
                    value={newFeed.category}
                    onChange={e => setNewFeed({...newFeed, category: e.target.value})}
                  >
                    <option>Tech</option>
                    <option>Finance</option>
                    <option>Science</option>
                    <option>Health</option>
                    <option>General</option>
                  </Select>
                </FormField>
                <Button variant="primary" className="w-full mt-4">Initialize Source</Button>
              </form>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-8 bg-dark-card border border-white/10 rounded-3xl">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <List className="w-5 h-5 text-neon-purple" /> Active Pipeline Sources ({feeds.length})
              </h2>
              <div className="space-y-3">
                {feeds.map(feed => {
                  const health = feedHealth[feed.id];
                  const healthScore = health?.health_score || 0;
                  const lastStatus = health?.last_status;
                  return (
                    <div key={feed.id} className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between hover:border-white/10 transition-all">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="text-sm font-bold mb-0.5">{feed.name}</div>
                        <div className="text-[10px] text-gray-500 truncate font-mono">{feed.url}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        {health && (
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-bold" style={{ color: healthScore >= 70 ? '#4ade80' : healthScore >= 40 ? '#facc15' : '#f87171' }}>
                              {healthScore}%
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${lastStatus === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {lastStatus || '—'}
                            </span>
                          </div>
                        )}
                        <Badge variant="tag" label={feed.category} />
                        <button className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}

        {activeTab === "health" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 bg-dark-card border border-white/10 rounded-3xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <Activity className="w-6 h-6 text-green-400" /> Feed Health Monitor
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={fetchFeeds} disabled={feedHealthLoading} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${feedHealthLoading ? 'animate-spin' : ''}`} /></button>
              </div>
            </div>

            {feedHealthLoading ? (
              <div className="grid gap-4">
                {[1,2,3].map(i => (
                  <div key={i} className="p-4 bg-black/40 border border-white/5 rounded-2xl animate-pulse">
                    <div className="h-4 bg-white/10 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-white/5 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : feedHealthError ? (
              <EmptyState title="Erro" description={feedHealthError} />
            ) : feeds.length === 0 ? (
              <EmptyState title="Nenhum feed" description="Adicione feeds para monitorar health." />
            ) : (
              <div className="grid gap-4">
                {feeds.map((feed) => {
                const health = feedHealth[feed.id];
                const score = health?.health_score || 0;
                const lastStatus = health?.last_status;
                const errors = health?.consecutive_errors || 0;
                const latency = health?.last_latency_ms;
                const lastChecked = health?.last_checked_at;
                
                const scoreColor = score >= 70 ? "text-green-400" : score >= 40 ? "text-yellow-400" : "text-red-400";
                const barColor = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
                
                return (
                <div key={feed.id} className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                <div className="text-sm font-bold text-white">{feed.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{feed.url}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${scoreColor}`}>{score}%</div>
                          <div className="text-[10px] text-gray-500">health score</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="h-2 bg-white/10 rounded-full mb-3 overflow-hidden">
                      <div className={`h-full ${barColor} transition-all`} style={{ width: `${score}%` }} />
                    </div>
                    
                    {/* Metrics Row */}
                    <div className="flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Status:</span>
                        <span className={lastStatus === "success" ? "text-green-400" : "text-red-400"}>
                          {lastStatus || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Erros consec:</span>
                        <span className={errors > 0 ? "text-red-400" : "text-gray-400"}>
                          {errors}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Latência:</span>
                        <span className="text-gray-400">
                          {latency ? `${latency}ms` : "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Última verificação:</span>
                        <span className="text-gray-400">
                          {lastChecked ? new Date(lastChecked).toLocaleString("pt-BR") : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === "posts" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 bg-dark-card border border-white/10 rounded-3xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <Database className="w-6 h-6 text-neon-cyan" /> Latest Processed Posts ({allPosts.length})
              </h2>
              <div className="flex items-center gap-2">
                 <button onClick={fetchAllPosts} className="p-2 hover:bg-white/5 rounded-lg text-gray-400"><RefreshCw className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-gray-500 uppercase tracking-widest border-b border-white/5">
                    <th className="pb-4 pt-0 font-bold">Content</th>
                    <th className="pb-4 pt-0 font-bold">Source</th>
                    <th className="pb-4 pt-0 font-bold">Status</th>
                    <th className="pb-4 pt-0 font-bold">Category</th>
                    <th className="pb-4 pt-0 font-bold text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allPosts.map(post => (
                    <tr key={post.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 max-w-sm">
                        <div className="text-sm font-medium line-clamp-1">{post.title}</div>
                        <div className="text-[10px] text-gray-500 truncate">{post.link}</div>
                      </td>
                      <td className="py-4">
                        <span className="text-xs text-gray-400">{post.feeds?.name || 'Unknown'}</span>
                      </td>
                      <td className="py-4">
                        <StatusBadge status={post.status} />
                      </td>
                      <td className="py-4">
                        <Badge variant="tag" label={post.category} />
                      </td>
                      <td className="py-4 text-right text-[10px] text-gray-500 font-mono">
                        {new Date(post.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allPosts.length === 0 && <EmptyState context="posts" />}
            </div>
          </motion.div>
        )}

        {activeTab === "skills" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {/* Skill Generator */}
             <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-8 bg-dark-card border border-white/10 rounded-3xl">
                <div className="flex flex-col h-full">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-neon-cyan" /> IA-Skills Foundry
                  </h2>
                  <div className="space-y-4 mb-8 flex-1">
                    <p className="text-xs text-gray-500 mb-4">Descale a lógica que deseja automatizar. A IA irá gerar o slug, descrição e metadados.</p>
                    <Textarea
                      placeholder="Ex: 'Skill que monitora flutuações de BTC e gera summaries focados em risco'"
                      className="min-h-[150px]"
                      value={skillPrompt}
                      onChange={e => setSkillPrompt(e.target.value)}
                    />
                    <Button
                      variant="primary"
                      className="w-full bg-gradient-to-r from-neon-purple to-neon-cyan py-6 h-auto text-lg"
                      loading={isGenerating}
                      onClick={handleGenerateSkill}
                    >
                      FORJAR SKILL COM IA
                    </Button>
                  </div>
                  {generatedSkillPreview && (
                    <div className="p-6 bg-neon-purple/5 border border-neon-cyan/20 rounded-2xl animate-in fade-in slide-in-from-bottom-2">
                      <div className="text-[10px] font-bold text-neon-cyan uppercase tracking-widest mb-2">New Arrival</div>
                      <div className="font-bold text-white text-lg mb-1">{generatedSkillPreview.name}</div>
                      <div className="text-xs text-gray-400 mb-2">{generatedSkillPreview.description}</div>
                      <Badge variant="tag" label={generatedSkillPreview.category} />
                    </div>
)}
              </div>
            )}
            </motion.div>
        )}

        {activeTab === "logs" && (
          <div className="space-y-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 bg-dark-card border border-white/10 rounded-3xl">
              <h2 className="text-xl font-bold mb-8 flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-neon-purple" /> Admin Audit Trail
              </h2>
              <div className="space-y-3">
                {auditLogs.map(log => (
                  <div key={log.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-black/40 border border-white/5 rounded-2xl text-[10px]">
                    <div className="font-bold text-neon-cyan uppercase tracking-tighter">{log.action || 'Unknown Action'}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
