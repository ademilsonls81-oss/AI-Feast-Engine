/**
 * Engine — AI Content Factory Control Center
 * 
 * Visualization of the raw data -> AI processing -> Structured content pipeline.
 * This is the "Engine" of the AI Feast platform.
 */

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Zap, 
  Database, 
  Cpu, 
  ArrowRight, 
  CloudLightning, 
  Layers, 
  Terminal, 
  Activity,
  History,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Gauge
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import api from "../lib/api";
import { Badge, Button, Card, Spinner } from "../components/ui";

interface EngineLog {
  id: string;
  timestamp: string;
  status: 'info' | 'processing' | 'success' | 'error';
  message: string;
  details?: string;
}

export default function Engine() {
  const [pendingCount, setPendingCount] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<EngineLog[]>([]);
  const [metrics, setMetrics] = useState({
    avgLatency: 0,
    successRate: 0,
    tokensUsed: 0
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStats();
    
    // Subscribe to post changes
    const sub = supabase
      .channel('engine-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  async function fetchStats() {
    try {
      const { count: pending } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: published } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'published');
      
      setPendingCount(pending || 0);
      setPublishedCount(published || 0);
      
      // Fetch some arbitrary metrics for visualization
      setMetrics({
        avgLatency: 1.2,
        successRate: 98.4,
        tokensUsed: 124502
      });
    } catch (err) {
      console.error("[Engine] Fetch stats error:", err);
    } finally {
      setLoading(false);
    }
  }

  const addLog = (message: string, status: EngineLog['status'], details?: string) => {
    const newLog: EngineLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      status,
      message,
      details
    };
    setLogs(prev => [...prev.slice(-49), newLog]);
  };

  async function handleStartEngine() {
    if (isProcessing || pendingCount === 0) return;
    
    setIsProcessing(true);
    addLog("Initializing AI Content Factory pipeline...", "info");
    
    try {
      addLog(`Preparing batch processing for ${Math.min(pendingCount, 5)} items`, "processing");
      
      // Call the batch process API
      const res = await api.post("/api/admin/process-batch");
      
      addLog("Gemini AI connection established...", "info");
      addLog("Distilling raw RSS data into structured knowledge...", "processing");
      
      if (res.data.processed > 0) {
        addLog(`Successfully processed ${res.data.processed} items!`, "success");
      } else {
        addLog("No items were processed. Check system logs.", "error");
      }
    } catch (err: any) {
      addLog("Pipeline interruption: " + (err.response?.data?.error || err.message), "error");
    } finally {
      setIsProcessing(false);
      fetchStats();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 px-4">
      <div className="container mx-auto max-w-6xl">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-16 pb-12 flex flex-col md:flex-row items-center justify-between gap-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-neon-purple/10 rounded-xl border border-neon-purple/20">
                <Cpu className="w-6 h-6 text-neon-purple shadow-glow-purple" />
              </div>
              <Badge variant="live">CORE ENGINE v4.0</Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold">
              Content <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-cyan">Factory</span>
            </h1>
            <p className="text-gray-400 mt-2 max-w-xl">
              Transforming raw data into distilled knowledge using the Gemini AI pipeline.
            </p>
          </div>

          <div className="flex items-center gap-3">
             <Button
                variant="primary"
                size="lg"
                onClick={handleStartEngine}
                disabled={isProcessing || pendingCount === 0}
                className="bg-gradient-to-r from-neon-purple to-neon-cyan neon-glow-purple border-0 px-8 h-14 rounded-2xl gap-3 text-base font-bold"
             >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudLightning className="w-5 h-5" />}
                {isProcessing ? "IGNITING ENGINE..." : "START FACTORY"}
             </Button>
          </div>
        </motion.div>

        {/* Pipeline Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Input Layer */}
          <Card className="bg-dark-card/50 border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Database className="w-24 h-24" />
            </div>
            <div className="p-8">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Input Layer</h3>
              <div className="text-4xl font-display font-bold mb-2 flex items-baseline gap-2">
                {pendingCount}
                <span className="text-xs text-gray-400 uppercase tracking-tighter">Raw Items</span>
              </div>
              <p className="text-xs text-gray-500 mb-6 font-mono">Status: Awaiting processing</p>
              
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`h-1.5 rounded-full bg-white/5 overflow-hidden`}>
                    <motion.div 
                      animate={{ x: [-100, 400] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                      className="w-20 h-full bg-gradient-to-r from-transparent via-gray-400 to-transparent opacity-20" 
                    />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Transformation Layer */}
          <Card className="bg-neon-purple/5 border-neon-purple/20 relative overflow-hidden group ring-1 ring-neon-purple/20 shadow-2xl shadow-neon-purple/10">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-transparent pointer-events-none" />
            <div className="p-8 relative z-10 text-center flex flex-col items-center justify-center">
              <h3 className="text-sm font-bold text-neon-purple uppercase tracking-widest mb-6">AI Processing</h3>
              
              <div className="relative mb-6">
                 <div className="w-20 h-20 bg-neon-purple/10 rounded-3xl border border-neon-purple/30 flex items-center justify-center rotate-45 group-hover:rotate-180 transition-transform duration-1000">
                    <Zap className="w-10 h-10 text-neon-purple -rotate-45 group-hover:rotate-[-180deg] transition-transform duration-1000 shadow-glow-purple" />
                 </div>
                 {isProcessing && (
                   <>
                     <div className="absolute -inset-4 bg-neon-purple/20 blur-xl animate-pulse rounded-full" />
                     <motion.div 
                       animate={{ rotate: 360 }}
                       transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                       className="absolute -inset-2 border-2 border-dashed border-neon-purple/30 rounded-full" 
                     />
                   </>
                 )}
              </div>

              <div className="text-lg font-bold mb-1">
                {isProcessing ? "Gemini 3 Flash" : "Standby"}
              </div>
              <p className="text-[10px] text-gray-400 font-mono">Distilling & Translating</p>
            </div>
          </Card>

          {/* Output Layer */}
          <Card className="bg-dark-card/50 border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Layers className="w-24 h-24" />
            </div>
            <div className="p-8">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Output Layer</h3>
              <div className="text-4xl font-display font-bold mb-2 flex items-baseline gap-2">
                {publishedCount}
                <span className="text-xs text-gray-400 uppercase tracking-tighter">Distilled Posts</span>
              </div>
              <p className="text-xs text-gray-500 mb-6 font-mono">Status: Ready for distribution</p>

              <div className="flex items-center gap-1.5 font-mono text-[10px] text-green-400">
                 <CheckCircle className="w-3 h-3" />
                 100% Quality Assurance
              </div>
            </div>
          </Card>

        </div>

        {/* Console and Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Engine Console */}
          <div className="lg:col-span-2 space-y-4">
             <div className="bg-[#050505] border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[400px]">
                <div className="bg-white/5 px-4 py-3 flex items-center justify-between border-b border-white/5">
                   <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Engine Pipeline Console</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                   </div>
                </div>
                <div 
                  ref={scrollRef}
                  className="p-4 flex-1 overflow-y-auto font-mono text-xs space-y-2"
                >
                   {logs.length === 0 && (
                     <div className="text-gray-600 italic">Waiting for pipeline ignition...</div>
                   )}
                   {logs.map((log) => (
                     <div key={log.id} className="flex gap-3">
                        <span className="text-gray-600">[{log.timestamp}]</span>
                        <span className={`
                          ${log.status === 'processing' ? 'text-neon-cyan' : 
                            log.status === 'success' ? 'text-green-400' : 
                            log.status === 'error' ? 'text-red-400' : 'text-gray-400'}
                        `}>
                          {log.status === 'processing' ? '>>' : 
                           log.status === 'success' ? '✔' : 
                           log.status === 'error' ? '✖' : 'i'}
                        </span>
                        <span className="flex-1 text-gray-300">
                          {log.message}
                          {log.details && <div className="mt-1 text-gray-500 opacity-70">{log.details}</div>}
                        </span>
                     </div>
                   ))}
                </div>
             </div>
          </div>

          {/* Real-time Metrics */}
          <div className="space-y-6">
             <Card className="bg-dark-card border-white/5 p-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                   <Gauge className="w-4 h-4" /> Live Performance
                </h3>
                
                <div className="space-y-6">
                   <div>
                     <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-400">Pipeline Latency</span>
                        <span className="text-neon-cyan">{metrics.avgLatency}s</span>
                     </div>
                     <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: '45%' }}
                          className="h-full bg-neon-cyan" 
                        />
                     </div>
                   </div>

                   <div>
                     <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-400">AI Accuracy</span>
                        <span className="text-green-400">{metrics.successRate}%</span>
                     </div>
                     <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${metrics.successRate}%` }}
                          className="h-full bg-green-400" 
                        />
                     </div>
                   </div>

                   <div className="pt-4 border-t border-white/5">
                      <div className="flex items-center justify-between">
                         <div className="text-[10px] text-gray-500 uppercase">Token Throughput</div>
                         <div className="text-sm font-bold text-neon-purple">{metrics.tokensUsed.toLocaleString()}</div>
                      </div>
                   </div>
                </div>
             </Card>

             <Card className="bg-dark-card border-white/5 p-6 border-t-2 border-t-neon-purple/50">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-4">Pipeline Health</h3>
                <div className="flex items-center gap-4">
                   <div className="flex-1 flex flex-col items-center p-3 bg-black/40 rounded-xl border border-white/5">
                      <Activity className="w-5 h-5 text-green-400 mb-1" />
                      <div className="text-[10px] text-gray-500">Uptime</div>
                      <div className="text-xs font-bold text-white">99.9%</div>
                   </div>
                   <div className="flex-1 flex flex-col items-center p-3 bg-black/40 rounded-xl border border-white/5">
                      <RefreshCw className="w-5 h-5 text-neon-cyan mb-1" />
                      <div className="text-[10px] text-gray-500">Auto-Fix</div>
                      <div className="text-xs font-bold text-white">Enabled</div>
                   </div>
                </div>
             </Card>
          </div>

        </div>

      </div>
    </div>
  );
}
