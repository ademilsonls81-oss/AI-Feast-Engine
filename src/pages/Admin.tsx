import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Database, Plus, Trash2, Activity, List, ShieldCheck, Sparkles, Power, Eye, EyeOff, Play, FileText, AlertCircle } from "lucide-react";
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
  SkeletonGrid,
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
          ? "✅ Autonomous system REACTIVATED" 
          : "⚠️ Autonomous system PAUSED");
      }
    } catch (err: any) {
      console.error("[Admin] handleToggleAutonomous error:", err);
      alert("❌ Error toggling state: " + (err.message || "Try again"));
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
      const { data, error } = await supabase.from('feeds').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error("[Admin] fetchFeeds error:", error);
        return;
      }
      if (isMountedRef.current) {
        setFeeds(data || []);
      }
    } catch (err) {
      console.error("[Admin] fetchFeeds exception:", err);
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
      alert("⚠️ Describe the skill with at least 10 characters");
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
        alert(`✅ Skill generated successfully: ${res.data.skill.name}`);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || "Unknown error";
      alert(`❌ Error generating skill: ${errorMsg}`);
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
      alert("Error toggling skill: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteSkill = async (skill: Skill) => {
    if (!window.confirm(`Are you sure you want to delete "${skill.name}"?`)) return;
    try {
      const headers = await getAuthHeaders();
      await api.delete(`/api/admin/skills/${skill.id}`, { headers });
      fetchSkills();
      alert("Skill deleted successfully");
    } catch (err: any) {
      alert("Error deleting skill: " + (err.response?.data?.error || err.message));
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
        alert(`Import finished: ${res.data.log.inserted} inserted, ${res.data.log.updated} updated`);
        fetchImportLogs();
        fetchSkills();
      }
    } catch (err: any) {
      if (currentOpId === importOperationId.current) {
        alert("Import error: " + (err.response?.data?.error || err.message));
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
        alert("Dry run error: " + (err.response?.data?.error || err.message));
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
          <p className="text-gray-400 mt-4">Loading administrative panel...</p>
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
          <h2 className="text-2xl font-bold text-white mb-3">Session Expired</h2>
          <p className="text-gray-400 mb-8">
            Your session has expired or you do not have permission to access this area. Please log in again to continue.
          </p>
          <button
            onClick={handleRelogin}
            className="px-8 py-4 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl font-bold shadow-lg shadow-neon-purple/20 hover:scale-105 transition-all"
          >
            Log In Again
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) return <div className="p-12 text-center text-red-400">Access Denied. Admin only.</div>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl mb-8 flex items-center gap-4">
        <Database className="w-10 h-10 text-neon-purple" />
        Admin Control Center
      </h1>

      <OnboardingTooltip
        context="dashboard"
        message="Manage feeds, generate skills with AI, and monitor import pipelines. All admin tools are below."
        onDismiss={() => setShowAdminTooltip(false)}
      />

      {/* Kill Switch Card */}
      <div className="mb-8 p-6 bg-dark-card border border-white/10 rounded-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${autonomousEnabled ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <Power className={`w-8 h-8 ${autonomousEnabled ? 'text-green-400' : 'text-red-400'}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Autonomous System</h2>
              <p className="text-sm text-gray-400">
                {autonomousEnabled 
                  ? "✅ System operating normally" 
                  : "⚠️ System paused - no automatic actions will be executed"}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleAutonomous}
            disabled={isToggling}
            className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
              autonomousEnabled
                ? "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                : "bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Power className={`w-5 h-5 ${isToggling ? 'animate-spin' : ''}`} />
            {isToggling ? "Changing..." : (autonomousEnabled ? "PAUSE SYSTEM" : "ACTIVATE SYSTEM")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Manage Feeds */}
        <div className="space-y-8">
          <div className="p-8 bg-dark-card border border-white/10 rounded-3xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-neon-cyan" /> Add New Source
            </h2>
            <form onSubmit={handleAddFeed} className="space-y-4">
              <FormField>
                <Input
                  type="text"
                  placeholder="Feed Name (e.g. TechCrunch)"
                  value={newFeed.name}
                  onChange={e => setNewFeed({...newFeed, name: e.target.value})}
                  required
                />
              </FormField>
              <FormField>
                <Input
                  type="url"
                  placeholder="RSS URL"
                  value={newFeed.url}
                  onChange={e => setNewFeed({...newFeed, url: e.target.value})}
                  required
                />
              </FormField>
              <FormField>
                <Select
                  value={newFeed.category}
                  onChange={e => setNewFeed({...newFeed, category: e.target.value})}
                >
                  <option>Tech</option>
                  <option>Finance</option>
                  <option>Science</option>
                  <option>Health</option>
                </Select>
              </FormField>
              <Button variant="primary" className="w-full">Add Source</Button>
            </form>
          </div>

          <div className="p-8 bg-dark-card border border-white/10 rounded-3xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <List className="w-5 h-5 text-neon-purple" /> Active Sources ({feeds.length})
            </h2>
            <div className="space-y-4">
              {feeds.map(feed => (
                <div key={feed.id} className="flex items-center justify-between p-4 bg-black/30 border border-white/5 rounded-xl">
                  <div>
                    <div className="font-bold text-sm">{feed.name}</div>
                    <div className="text-xs text-gray-500 truncate max-w-[200px]">{feed.url}</div>
                  </div>
                  <Badge variant="category" label={feed.category} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Global Logs */}
        <div className="space-y-8">
          {/* Skills Management Section */}
          <div className="p-8 bg-dark-card border border-white/10 rounded-3xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-neon-cyan" /> Manage Skills
            </h2>

            {/* Generate Skill Form */}
            <div className="space-y-4 mb-8">
              <Textarea
                placeholder="Describe the skill you want to generate... Ex: 'Skill that analyzes Python code and suggests security improvements'"
                value={skillPrompt}
                onChange={e => setSkillPrompt(e.target.value)}
              />
              <Button
                variant="primary"
                className="w-full bg-gradient-to-r from-neon-purple to-neon-cyan"
                loading={isGenerating}
                onClick={handleGenerateSkill}
              >
                <Sparkles className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? "Generating with AI..." : "Generate with AI"}
              </Button>
            </div>

            {/* Generated Skill Preview */}
            {generatedSkillPreview && (
              <div className="mb-8 p-6 bg-neon-purple/5 border border-neon-purple/20 rounded-2xl">
                <h3 className="text-sm font-bold text-neon-purple uppercase tracking-widest mb-4">Last Skill Generated</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name:</span>
                    <span className="text-white font-medium">{generatedSkillPreview.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Slug:</span>
                    <span className="text-neon-cyan font-mono">{generatedSkillPreview.slug}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Category:</span>
                    <span className="text-white">{generatedSkillPreview.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Risk:</span>
                    <span className={`font-bold ${
                      generatedSkillPreview.risk_level === 'low' ? 'text-green-400' :
                      generatedSkillPreview.risk_level === 'medium' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {generatedSkillPreview.risk_level}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span className="text-green-400 font-medium">✅ Active</span>
                  </div>
                </div>
              </div>
            )}

            {/* Skills List */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Skills Existentes ({skills.length})</h3>
              {skills.map(skill => (
                <div key={skill.id} className="flex items-center justify-between p-4 bg-black/30 border border-white/5 rounded-xl hover:border-neon-purple/20 transition-all">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm truncate">{skill.name}</span>
                      <OriginBadge verified={skill.verified} source={skill.source} isActive={skill.is_active} />
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">{skill.slug}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge variant="tag" label={skill.category} />
                      <span className="text-[8px] text-gray-600">↓ {skill.downloads || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={skill.is_active ? "icon-success" : "ghost"}
                      onClick={() => handleToggleSkill(skill)}
                      title={skill.is_active ? "Desativar" : "Ativar"}
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="icon-danger"
                      onClick={() => handleDeleteSkill(skill)}
                      title="Deletar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {skills.length === 0 && (
                <EmptyState context="skills" title="Nenhuma skill criada ainda" description="Use o gerador acima para criar a primeira." />
              )}
            </div>
          </div>

          {/* Import Pipeline Section */}
          <div className="p-8 bg-dark-card border border-white/10 rounded-3xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-neon-cyan" /> Skill Import (GitHub)
            </h2>

            {/* Action Buttons */}
            <div className="flex gap-4 mb-6">
              <Button
                variant="primary"
                className="flex-1 bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 neon-glow-purple"
                loading={isImporting}
                onClick={handleRunImport}
              >
                <Play className="w-4 h-4" /> {isImporting ? "Running..." : "Run now"}
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30"
                loading={isImporting}
                onClick={handleDryRun}
              >
                <Eye className="w-4 h-4" /> Dry run
              </Button>
            </div>

            {/* Import Logs Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 uppercase tracking-wider border-b border-white/5">
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-left py-2 px-2">Trigger</th>
                    <th className="text-center py-2 px-2">Disc.</th>
                    <th className="text-center py-2 px-2">Insert.</th>
                    <th className="text-center py-2 px-2">Upd.</th>
                    <th className="text-center py-2 px-2">Skip</th>
                    <th className="text-center py-2 px-2">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {importLogs.map(log => (
                    <tr key={log.id} className={`border-b border-white/5 ${
                      (log.errors && log.errors.length > 0) ? 'bg-red-500/5' : 'bg-green-500/5'
                    }`}>
                      <td className="py-2 px-2 text-gray-400 font-mono">{new Date(log.started_at).toLocaleString()}</td>
                      <td className="py-2 px-2">
                        <Badge variant={log.triggered_by === 'manual' ? 'trigger-manual' : 'trigger-auto'} />
                      </td>
                      <td className="py-2 px-2 text-center text-gray-300">{log.discovered}</td>
                      <td className="py-2 px-2 text-center text-green-400">{log.inserted}</td>
                      <td className="py-2 px-2 text-center text-blue-400">{log.updated}</td>
                      <td className="py-2 px-2 text-center text-yellow-400">{log.skipped}</td>
                      <td className="py-2 px-2 text-center">
                        {log.errors && log.errors.length > 0 ? (
                          <span className="text-red-400 flex items-center justify-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {log.errors.length}
                          </span>
                        ) : (
                          <span className="text-green-400">✓</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {importLogs.length === 0 && (
                    <tr><td colSpan={7}><EmptyState context="logs" title="Nenhum import executado ainda" /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dry Run Modal */}
          {showDryRunModal && dryRunResult && (
            <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDryRunModal(false)}>
              <div className="bg-dark-card border border-white/10 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Eye className="w-5 h-5 text-blue-400" /> Dry Run Result</h3>
                  <button onClick={() => setShowDryRunModal(false)} className="p-2 hover:bg-white/5 rounded-lg"><EyeOff className="w-4 h-4" /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-black/30 rounded-xl text-center">
                      <div className="text-2xl font-bold text-neon-cyan">{dryRunResult.discovered || 0}</div>
                      <div className="text-[10px] text-gray-500 uppercase">Discovered</div>
                    </div>
                    <div className="p-4 bg-black/30 rounded-xl text-center">
                      <div className="text-2xl font-bold text-green-400">{dryRunResult.approved || 0}</div>
                      <div className="text-[10px] text-gray-500 uppercase">Approved</div>
                    </div>
                    <div className="p-4 bg-black/30 rounded-xl text-center">
                      <div className="text-2xl font-bold text-yellow-400">{dryRunResult.skipped || 0}</div>
                      <div className="text-[10px] text-gray-500 uppercase">Skipped</div>
                    </div>
                  </div>
                  {dryRunResult.details?.inserted?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-green-400 mb-2">Skills que seriam inseridas:</h4>
                      <ul className="space-y-1">
                        {dryRunResult.details.inserted.map((name: string, i: number) => (
                          <li key={i} className="text-xs text-gray-300 bg-black/20 px-3 py-1.5 rounded">✓ {name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {dryRunResult.details?.skipped?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-yellow-400 mb-2">Skills que seriam ignoradas:</h4>
                      <ul className="space-y-1">
                        {dryRunResult.details.skipped.map((s: any, i: number) => (
                          <li key={i} className="text-xs text-gray-400 bg-black/20 px-3 py-1.5 rounded">✗ {s.name} — {s.reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI Processing Control */}
          <div className="p-8 bg-dark-card border border-white/10 rounded-3xl">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-neon-cyan" /> AI Processing Control
          </h2>
          
          <div className="p-6 bg-neon-purple/5 border border-neon-purple/20 rounded-2xl mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Pending Posts</div>
                <div className="text-3xl font-display font-bold text-neon-purple">{pendingCount}</div>
              </div>
              <Button
                loading={isProcessing}
                disabled={pendingCount === 0}
                className="px-6 py-3"
                onClick={handleProcessBatch}
              >
                {isProcessing ? "Processing..." : "Process Batch"}
              </Button>
            </div>
            <p className="text-[10px] text-gray-500 italic">
              * Processes posts in batches of 5 with a 2s delay to avoid Gemini rate limits.
            </p>
          </div>

          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-neon-cyan" /> Audit Logs
          </h2>
          <div className="space-y-4 mb-12">
            {auditLogs.map(log => (
              <div key={log.id} className="text-xs p-3 bg-black/20 border border-white/5 rounded-xl flex justify-between items-center">
                <div className="flex flex-col gap-1">
                  <div className="font-bold text-neon-cyan flex items-center gap-2">
                    {log.action}
                    <span className="text-[8px] px-1.5 py-0.5">
                      <Badge variant="tag" label={new Date(log.created_at).toLocaleString()} />
                    </span>
                  </div>
                  <div className="text-gray-500 font-mono scale-90 origin-left">
                    IP: {log.ip} | ID: {(log.user_id || "").substring(0, 8)}
                  </div>
                </div>
                <div className="text-[10px] text-gray-400 italic max-w-[200px] truncate">
                  {JSON.stringify(log.details)}
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-neon-cyan" /> Global Request Logs
          </h2>
          <div className="space-y-4">
            {logs.map(log => (
              <div key={log.id} className="text-xs p-3 border-b border-white/5 last:border-0 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-gray-300 font-mono">{(log.user_id || '').substring(0, 8)}...</span>
                  <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-neon-cyan">{log.endpoint}</div>
                <div className="font-bold text-neon-purple">${(log.cost || 0).toFixed(3)}</div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
