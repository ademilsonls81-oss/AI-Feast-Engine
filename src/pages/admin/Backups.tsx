import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { History, RotateCcw, Database, HardDrive, CheckCircle2, AlertTriangle, Cloud, DownloadCloud, Loader2 } from "lucide-react";
import { Button } from "../../components/ui";
import api from "../../lib/api";

interface Backup {
  id: string;
  hash: string;
  created_at: string;
  message: string;
  type: 'push' | 'manual';
  status: 'active' | 'archived';
  size?: string;
}

export default function Backups() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  useEffect(() => {
    fetchBackups();
  }, []);

  async function fetchBackups() {
    try {
      const res = await api.get("/api/admin/backups");
      setBackups(res.data);
    } catch (err) {
      console.error("Error fetching backups:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleRestore = async (id: string, hash: string) => {
    if (!confirm(`Are you sure you want to restore the system to point [${hash}]? All current unsaved changes will be lost.`)) return;
    
    setIsRestoring(id);
    try {
      await api.post("/api/admin/backups/restore", { hash });
      alert(`System restored to [${hash}] successfully! Re-loading components...`);
      window.location.reload();
    } catch (err: any) {
      alert("Restore failed: " + (err.response?.data?.error || err.message));
    } finally {
      setIsRestoring(null);
    }
  };

  const createManualBackup = async () => {
    const message = prompt("Enter a description for this snapshot:");
    if (message === null) return;

    setCreating(true);
    try {
      await api.post("/api/admin/backups/snapshot", { message });
      await fetchBackups();
    } catch (err: any) {
      alert("Backup failed: " + (err.response?.data?.error || err.message));
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 bg-background">
      <div className="container mx-auto max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white mb-2 flex items-center gap-3">
            <History className="w-8 h-8 text-primary" /> Global Recovery System
          </h1>
          <p className="text-gray-400">
            A real-time snapshot system integrated with Git. Each critical change generates a restoration point. Revert any failure with one click.
          </p>
        </motion.div>

        {/* Status Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-dark-card border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4 text-green-400">
              <Cloud className="w-6 h-6" />
              <h3 className="font-bold">System Status</h3>
            </div>
            <p className="text-3xl font-bold text-white mb-1">HEALTHY</p>
            <p className="text-xs text-gray-500">Git repository synchronized</p>
          </div>
          <div className="bg-dark-card border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4 text-primary">
              <History className="w-6 h-6" />
              <h3 className="font-bold">Restore Points</h3>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{backups.length} <span className="text-lg text-gray-500">snapshots</span></p>
            <p className="text-xs text-gray-500">Points available for rollback</p>
          </div>
          <div className="bg-dark-card border border-white/5 rounded-2xl p-6 flex flex-col justify-center items-center text-center">
            <Button onClick={createManualBackup} disabled={creating} variant="outline" className="w-full h-12 bg-white/[0.02] hover:bg-white/10 border-white/10">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DownloadCloud className="w-4 h-4 mr-2" />}
              Force Backup Now
            </Button>
            <p className="text-[10px] text-gray-500 mt-3 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" /> Persistent snapshots enabled
            </p>
          </div>
        </div>

        {/* History List */}
        <div className="bg-dark-card border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2"><Database className="w-4 h-4" /> Snapshot History</h2>
          </div>
          
          <div className="divide-y divide-white/5">
            {backups.length === 0 && (
                <div className="p-12 text-center text-gray-500 italic">No snapshots found. Create your first one above.</div>
            )}
            {backups.map((backup, index) => (
              <motion.div 
                key={backup.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors hover:bg-white/[0.02] ${
                  index === 0 ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm text-neon-cyan bg-neon-cyan/10 border border-neon-cyan/20 px-2 py-0.5 rounded-md">
                      {backup.hash}
                    </span>
                    {index === 0 && (
                      <span className="text-[10px] uppercase font-bold text-green-400 border border-green-400/20 bg-green-400/10 px-2 py-0.5 rounded-full">
                        Actual Version
                      </span>
                    )}
                    {backup.type === 'manual' && (
                      <span className="text-[10px] uppercase font-bold text-gray-400 border border-gray-500/20 bg-gray-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <HardDrive className="w-3 h-3" /> Manual
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-medium mb-1">{backup.message}</h3>
                  <div className="text-xs text-gray-500 flex items-center gap-4">
                    <span>📅 {new Date(backup.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex shrink-0">
                  <Button 
                    variant={index === 0 ? "outline" : "danger"} 
                    disabled={index === 0 || isRestoring !== null}
                    onClick={() => handleRestore(backup.id, backup.hash)}
                    className="gap-2"
                  >
                    {isRestoring === backup.id ? (
                      <>⏳ Restoring...</>
                    ) : index === 0 ? (
                      <><CheckCircle2 className="w-4 h-4 text-green-500" /> Currently Running</>
                    ) : (
                      <><RotateCcw className="w-4 h-4" /> Restore Point</>
                    )}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
