import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Database, Plus, Trash2, Activity, List, ShieldCheck, Sparkles, Power, Eye } from "lucide-react";
import api from "../lib/api";

interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  risk_level: string;
  is_active: boolean;
  downloads: number;
  created_at: string;
}

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [feeds, setFeeds] = useState<any[]>([]);
  const [newFeed, setNewFeed] = useState({ url: "", name: "", category: "Tech" });
  const [logs, setLogs] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Skills state
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillPrompt, setSkillPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [adminSecret, setAdminSecret] = useState("");
  const [generatedSkillPreview, setGeneratedSkillPreview] = useState<any>(null);


  useEffect(() => {
    // Initial check
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        checkAdminRole(user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
    } else {
      console.log("❌ Access denied: role is", data?.role);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;

    // Fetch initial feeds
    fetchFeeds();
    fetchSkills();

    // Feeds subscription
    const feedsSub = supabase
      .channel('admin-feeds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feeds' }, () => {
        fetchFeeds();
      })
      .subscribe();

    // Logs subscription
    fetchLogs();
    const logsSub = supabase
      .channel('admin-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'usage_logs' }, () => {
        fetchLogs();
      })
      .subscribe();

    // Pending posts subscription
    fetchPendingCount();
    const pendingSub = supabase
      .channel('admin-pending')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPendingCount();
      })
      .subscribe();

    // Audit logs subscription
    fetchAuditLogs();
    const auditSub = supabase
      .channel('admin-audit')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
        fetchAuditLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(feedsSub);
      supabase.removeChannel(logsSub);
      supabase.removeChannel(pendingSub);
      supabase.removeChannel(auditSub);
    };
  }, [isAdmin]);

  async function fetchFeeds() {
    const { data } = await supabase.from('feeds').select('*').order('created_at', { ascending: false });
    setFeeds(data || []);
  }

  async function fetchLogs() {
    const { data } = await supabase
      .from('usage_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(20);
    setLogs(data || []);
  }

  async function fetchPendingCount() {
    const { count } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    setPendingCount(count || 0);
  }

  async function fetchAuditLogs() {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setAuditLogs(data || []);
  }

  async function fetchSkills() {
    try {
      const res = await api.get("/api/skills");
      setSkills(res.data.skills || []);
    } catch (err) {
      console.error("Error fetching skills:", err);
    }
  }

  const handleGenerateSkill = async () => {
    if (!adminSecret) {
      alert("⚠️ Insira o Admin Secret para continuar");
      return;
    }
    if (skillPrompt.trim().length < 10) {
      alert("⚠️ Descreva a skill com pelo menos 10 caracteres");
      return;
    }

    setIsGenerating(true);
    setGeneratedSkillPreview(null);

    try {
      const res = await api.post("/api/admin/skills/generate", { prompt: skillPrompt }, {
        headers: { "X-Admin-Secret": adminSecret }
      });

      if (res.data.skill) {
        setGeneratedSkillPreview(res.data.skill);
        setSkillPrompt("");
        fetchSkills();
        alert(`✅ Skill gerada com sucesso: ${res.data.skill.name}`);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || "Erro desconhecido";
      const details = err.response?.data?.details || "";
      alert(`❌ Erro ao gerar skill: ${errorMsg}\n${details}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleSkill = async (skill: Skill) => {
    if (!adminSecret) {
      alert("⚠️ Insira o Admin Secret para continuar");
      return;
    }

    try {
      await api.post(`/api/admin/skills/${skill.id}/toggle`, {}, {
        headers: { "X-Admin-Secret": adminSecret }
      });
      fetchSkills();
    } catch (err: any) {
      alert("Erro ao alternar skill: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteSkill = async (skill: Skill) => {
    if (!window.confirm(`Tem certeza que deseja deletar "${skill.name}"?`)) return;
    if (!adminSecret) {
      alert("⚠️ Insira o Admin Secret para continuar");
      return;
    }

    try {
      await api.delete(`/api/admin/skills/${skill.id}`, {
        headers: { "X-Admin-Secret": adminSecret }
      });
      fetchSkills();
      alert("Skill deletada com sucesso");
    } catch (err: any) {
      alert("Erro ao deletar skill: " + (err.response?.data?.error || err.message));
    }
  };

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

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/api/admin/feeds", newFeed);
    setNewFeed({ url: "", name: "", category: "Tech" });
  };

  if (!isAdmin) return <div className="p-12 text-center text-red-400">Access Denied. Admin only.</div>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl mb-8 flex items-center gap-4">
        <Database className="w-10 h-10 text-neon-purple" />
        Admin Control Center
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Manage Feeds */}
        <div className="space-y-8">
          <div className="p-8 bg-dark-card border border-white/10 rounded-3xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-neon-cyan" /> Add New Source
            </h2>
            <form onSubmit={handleAddFeed} className="space-y-4">
              <input 
                type="text" 
                placeholder="Feed Name (e.g. TechCrunch)" 
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all"
                value={newFeed.name}
                onChange={e => setNewFeed({...newFeed, name: e.target.value})}
                required
              />
              <input 
                type="url" 
                placeholder="RSS URL" 
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all"
                value={newFeed.url}
                onChange={e => setNewFeed({...newFeed, url: e.target.value})}
                required
              />
              <select 
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all"
                value={newFeed.category}
                onChange={e => setNewFeed({...newFeed, category: e.target.value})}
              >
                <option>Tech</option>
                <option>Finance</option>
                <option>Science</option>
                <option>Health</option>
              </select>
              <button className="w-full py-3 bg-neon-purple text-white rounded-xl font-bold neon-glow-purple">Add Source</button>
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
                  <div className="px-2 py-1 bg-neon-purple/20 text-neon-purple text-[10px] rounded uppercase font-bold">
                    {feed.category}
                  </div>
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
              <Sparkles className="w-5 h-5 text-neon-cyan" /> Gerenciar Skills
            </h2>

            {/* Admin Secret Input */}
            <div className="mb-6 p-4 bg-black/30 border border-white/5 rounded-xl">
              <label className="text-xs text-gray-400 mb-2 block">Admin Secret (obrigatório)</label>
              <input
                type="password"
                placeholder="Cole aqui seu ADMIN_SECRET"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all font-mono"
                value={adminSecret}
                onChange={e => setAdminSecret(e.target.value)}
              />
            </div>

            {/* Generate Skill Form */}
            <div className="space-y-4 mb-8">
              <textarea
                placeholder="Descreva a skill que deseja gerar... Ex: 'Skill que analisa código Python e sugere melhorias de segurança'"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all min-h-[100px] resize-none"
                value={skillPrompt}
                onChange={e => setSkillPrompt(e.target.value)}
              />
              <button
                onClick={handleGenerateSkill}
                disabled={isGenerating}
                className="w-full py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl font-bold neon-glow-purple disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? "Gerando com IA..." : "Gerar com IA"}
              </button>
            </div>

            {/* Generated Skill Preview */}
            {generatedSkillPreview && (
              <div className="mb-8 p-6 bg-neon-purple/5 border border-neon-purple/20 rounded-2xl">
                <h3 className="text-sm font-bold text-neon-purple uppercase tracking-widest mb-4">Última Skill Gerada</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nome:</span>
                    <span className="text-white font-medium">{generatedSkillPreview.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Slug:</span>
                    <span className="text-neon-cyan font-mono">{generatedSkillPreview.slug}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Categoria:</span>
                    <span className="text-white">{generatedSkillPreview.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Risco:</span>
                    <span className={`font-bold ${
                      generatedSkillPreview.risk_level === 'low' ? 'text-green-400' :
                      generatedSkillPreview.risk_level === 'medium' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {generatedSkillPreview.risk_level}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span className="text-green-400 font-medium">✅ Ativa</span>
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
                      {!skill.is_active && (
                        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[8px] rounded uppercase font-bold">Inativa</span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">{skill.slug}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="px-1.5 py-0.5 bg-white/5 text-gray-400 text-[8px] rounded uppercase">{skill.category}</span>
                      <span className="text-[8px] text-gray-600">↓ {skill.downloads || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleSkill(skill)}
                      className={`p-2 rounded-lg transition-all ${
                        skill.is_active
                          ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          : 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'
                      }`}
                      title={skill.is_active ? "Desativar" : "Ativar"}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSkill(skill)}
                      className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all"
                      title="Deletar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {skills.length === 0 && (
                <div className="text-center py-8 text-xs text-gray-600">
                  Nenhuma skill criada ainda. Use o gerador acima para criar a primeira.
                </div>
              )}
            </div>
          </div>

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
              <button 
                onClick={handleProcessBatch}
                disabled={pendingCount === 0 || isProcessing}
                className="px-6 py-3 bg-neon-purple text-white rounded-xl font-bold neon-glow-purple disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isProcessing ? "Processing..." : "Process Batch"}
              </button>
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
                    <span className="text-[8px] px-1.5 py-0.5 bg-white/5 rounded text-gray-500 font-mono">
                      {new Date(log.created_at).toLocaleString()}
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
