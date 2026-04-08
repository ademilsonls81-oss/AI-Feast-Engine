import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Database, Plus, Trash2, Activity, List, ShieldCheck } from "lucide-react";
import api from "../lib/api";

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [feeds, setFeeds] = useState<any[]>([]);
  const [newFeed, setNewFeed] = useState({ url: "", name: "", category: "Tech" });
  const [logs, setLogs] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);


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
      .select('role')
      .eq('id', userId)
      .single();
    
    if (!error && data?.role === 'admin') {
      setIsAdmin(true);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;

    // Fetch initial feeds
    fetchFeeds();

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
  );
}
