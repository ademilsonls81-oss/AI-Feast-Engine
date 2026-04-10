import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase, signInWithGoogle } from "../lib/supabaseClient";
import { motion } from "motion/react";
import { Key, BarChart3, History, Copy, Check, Zap, AlertCircle, RefreshCw, Layers, Database } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "../lib/api";
import { Post, AppStats } from "../types";

export default function Dashboard() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<AppStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchLogs(user.id);
      fetchPosts();
      fetchStats();
    }
  }, [user]);

  async function fetchLogs(userId: string) {
    const { data } = await supabase
      .from('usage_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(10);
    setLogs(data || []);
  }

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    setPosts((data as Post[]) || []);
  }

  async function fetchStats() {
    try {
      const res = await api.get("/api/stats");
      setStats(res.data);
    } catch (err) {
      console.error("Stats fetch error:", err);
    }
  }

  const handleRotateKey = async () => {
    if (!window.confirm("Are you sure? Your old API key will stop working immediately.")) return;
    setIsRotating(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await api.post("/api/user/rotate-key", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.api_key) {
        await refreshProfile();
        alert("API Key rotated successfully!");
      } else {
        alert("Failed to rotate key");
      }
    } catch (err) {
      alert("Failed to rotate key");
    } finally {
      setIsRotating(false);
    }
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const res = await api.post("/api/create-checkout-session", {
        userId: user?.id,
        email: user?.email
      });
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      alert("Failed to start checkout");
    } finally {
      setIsUpgrading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-neon-purple animate-pulse">Loading engine...</div>;
  
  if (!user) return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <AlertCircle className="w-16 h-16 text-neon-purple mb-6 mx-auto" />
        <h2 className="text-3xl font-display font-bold mb-4">Command Center Locked</h2>
        <p className="text-gray-400 mb-8 max-w-md">Access your API keys, monitor usage, and manage your AI ingestion sources.</p>
        <button onClick={signInWithGoogle} className="px-10 py-4 bg-neon-purple text-white rounded-full font-bold neon-glow-purple transition-all hover:scale-105 active:scale-95">
          Authenticate with Google
        </button>
      </motion.div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header Info */}
      <div className="flex flex-col lg:flex-row items-start justify-between gap-8 mb-12">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">
            Systems <span className="text-neon-cyan text-glow-cyan">Online</span>
          </h1>
          <p className="text-gray-400">Welcome back, {user.user_metadata?.full_name?.split(' ')[0] || user.email}</p>
        </motion.div>

        <div className="flex flex-wrap gap-4">
          {/* Stats Bar */}
          <div className="flex items-center gap-6 p-1 pr-6 bg-dark-card border border-white/10 rounded-2xl">
            <div className="flex items-center gap-3 p-3 bg-neon-purple/10 rounded-xl">
              <Zap className="w-6 h-6 text-neon-purple" />
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest leading-none mb-1">Plan</div>
                <div className="text-sm font-bold uppercase text-neon-purple leading-none">{profile?.plan || 'free'}</div>
              </div>
            </div>
            
            <div className="w-px h-8 bg-white/10" />

            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest leading-none mb-1">Global Posts</div>
              <div className="text-sm font-bold text-white leading-none">{stats?.postsCount || 0}</div>
            </div>

            {profile?.plan === 'free' && (
              <button 
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="ml-4 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white text-[10px] font-bold rounded-lg shadow-lg shadow-neon-purple/20 hover:scale-105 transition-all disabled:opacity-50"
              >
                {isUpgrading ? "LOADING..." : "UPGRADE TO PRO"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* API Key Card */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="p-8 bg-dark-card border border-white/10 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Key className="w-24 h-24 text-neon-cyan" />
            </div>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neon-cyan/10 rounded-lg">
                  <Key className="w-5 h-5 text-neon-cyan" />
                </div>
                <h2 className="text-xl font-bold">API Access</h2>
              </div>
              <button 
                onClick={handleRotateKey}
                disabled={isRotating}
                className="flex items-center gap-2 text-[10px] font-bold text-gray-500 hover:text-red-400 transition-colors uppercase tracking-widest"
              >
                <RefreshCw className={`w-3 h-3 ${isRotating ? 'animate-spin' : ''}`} /> {isRotating ? 'Rotating...' : 'Rotate Key'}
              </button>
            </div>
            <div className="flex items-center gap-4 p-4 bg-black/40 border border-white/5 rounded-xl group/key">
              <code className="flex-1 text-neon-cyan font-mono text-sm break-all">
                {profile?.api_key || 'No key active'}
              </code>
              <button onClick={() => copyToClipboard(profile?.api_key || '')} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-gray-400" />}
              </button>
            </div>
            <p className="mt-6 text-xs text-gray-500 leading-relaxed italic">
              Include this key in the <code className="text-gray-300">X-API-Key</code> request header. Never share your key in client-side code.
            </p>
          </motion.div>

          {/* Activity Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Status List */}
             <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="p-8 bg-dark-card border border-white/10 rounded-3xl">
              <div className="flex items-center gap-3 mb-8">
                <Database className="w-5 h-5 text-neon-purple" />
                <h2 className="text-lg font-bold">Recent Processing</h2>
              </div>
              <div className="space-y-4">
                {posts.map(post => (
                  <div key={post.id} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="text-xs font-medium text-gray-200 truncate">{post.title}</div>
                      <div className="text-[10px] text-gray-500">{new Date(post.created_at).toLocaleTimeString()}</div>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                      post.status === 'published' ? 'bg-green-500/10 text-green-400' :
                      post.status === 'processing' ? 'bg-blue-500/10 text-blue-400 animate-pulse' :
                      post.status === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-gray-500/10 text-gray-500'
                    }`}>
                      {post.status}
                    </div>
                  </div>
                ))}
                {posts.length === 0 && <div className="text-center py-6 text-xs text-gray-500">No recent processing jobs.</div>}
              </div>
            </motion.div>

            {/* Logs List */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="p-8 bg-dark-card border border-white/10 rounded-3xl">
              <div className="flex items-center gap-3 mb-8">
                <History className="w-5 h-5 text-neon-cyan" />
                <h2 className="text-lg font-bold">API Request Logs</h2>
              </div>
              <div className="space-y-4">
                {logs.map(log => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                    <div>
                      <div className="text-xs font-mono text-neon-cyan">{log.endpoint}</div>
                      <div className="text-[10px] text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</div>
                    </div>
                    <div className="text-[10px] font-bold text-neon-purple">${(log.cost || 0.001).toFixed(3)}</div>
                  </div>
                ))}
                {logs.length === 0 && <div className="text-center py-6 text-xs text-gray-500">No API calls recorded.</div>}
              </div>
            </motion.div>
          </div>

          {/* Chart Section */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="p-8 bg-dark-card border border-white/10 rounded-3xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-neon-purple" />
                <h2 className="text-xl font-bold">Usage Metrics</h2>
              </div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {profile?.usage_count || 0} / {profile?.plan === 'free' ? '100' : '10k'} REQS
              </div>
            </div>
            <div className="h-48 w-full">
              {logs.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...logs].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis dataKey="timestamp" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
                    <Line type="monotone" dataKey="cost" stroke="#a855f7" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-gray-600 uppercase tracking-tighter">Insufficient data for visualizer</div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Sidebar / Stats */}
        <div className="space-y-8">
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="p-8 bg-gradient-to-br from-neon-purple/20 to-transparent border border-neon-purple/10 rounded-3xl">
            <h3 className="text-sm font-bold text-neon-purple uppercase tracking-widest mb-6">Engine Stats</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400">Knowledge Sources</div>
                <div className="text-lg font-bold font-mono">{stats?.feedsCount || 0}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400">Supported Languages</div>
                <div className="text-lg font-bold font-mono">{stats?.languages || 11}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400">Total Insights</div>
                <div className="text-lg font-bold font-mono">{stats?.postsCount || 0}</div>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-white/5">
              <div className="text-[10px] text-gray-500 leading-relaxed uppercase tracking-widest mb-4">Core Readiness</div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-neon-cyan w-[94%]" />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="p-8 bg-white/5 border border-white/5 rounded-3xl">
            <Layers className="w-8 h-8 text-gray-500 mb-4 opacity-20" />
            <h3 className="text-sm font-bold text-gray-300 mb-2">Need a higher limit?</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-6">Pro users get 10,000 monthly queries and real-time processing priority.</p>
            <a href="/docs" className="text-[10px] font-bold text-neon-cyan hover:underline uppercase tracking-widest">Read documentation →</a>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
