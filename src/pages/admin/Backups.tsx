import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { History, RotateCcw, Database, HardDrive, CheckCircle2, AlertTriangle, Cloud, DownloadCloud } from "lucide-react";
import { Button } from "../../components/ui";

interface Backup {
  id: string;
  hash: string;
  timestamp: string;
  message: string;
  type: 'push' | 'manual';
  status: 'active' | 'archived';
  size: string;
}

export default function Backups() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  
  // Mocks para simular backups armazenados apos cada push/deploy
  useEffect(() => {
    setBackups([
      {
        id: "b_1",
        hash: "043fb8e",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
        message: "feat: layout and status redesign to match mockup",
        type: 'push',
        status: 'active',
        size: "45.2 MB"
      },
      {
        id: "b_2",
        hash: "b34e724",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
        message: "fix: change button wording string",
        type: 'push',
        status: 'archived',
        size: "45.1 MB"
      },
      {
        id: "b_3",
        hash: "0744a7c",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        message: "style: fix tailwind v4 theme variables",
        type: 'push',
        status: 'archived',
        size: "44.8 MB"
      },
      {
        id: "b_4",
        hash: "m_1",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
        message: "Snapshot Mensal",
        type: 'manual',
        status: 'archived',
        size: "42.0 MB"
      }
    ]);
  }, []);

  const handleRestore = (id: string, hash: string) => {
    setIsRestoring(id);
    // Simula o processo de rollback
    setTimeout(() => {
      setIsRestoring(null);
      alert(`O sistema foi restaurado para o ponto [${hash}] com sucesso! A aplicação está reiniciando.`);
    }, 4000);
  };

  const createManualBackup = () => {
    const newBackup: Backup = {
      id: `b_${Date.now()}`,
      hash: "manual_" + Math.random().toString(36).substring(2, 8),
      timestamp: new Date().toISOString(),
      message: "Backup Manual (Admin)",
      type: 'manual',
      status: 'active',
      size: "45.3 MB"
    };
    setBackups([newBackup, ...backups]);
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 bg-background">
      <div className="container mx-auto max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white mb-2 flex items-center gap-3">
            <History className="w-8 h-8 text-primary" /> Sistema de Backups & Snapshots
          </h1>
          <p className="text-gray-400">
            A cada push no repositório ou atualização crítica, o sistema gera automaticamente um ponto de restauração. Em caso de falha crítica, você pode reverter toda a aplicação para a estabilidade com um clique.
          </p>
        </motion.div>

        {/* Status Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-dark-card border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4 text-green-400">
              <Cloud className="w-6 h-6" />
              <h3 className="font-bold">Armazenamento Ativo</h3>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{(backups.length * 45).toFixed(0)} <span className="text-lg text-gray-500">MB</span></p>
            <p className="text-xs text-gray-500">Uso no provedor remoto (AWS S3)</p>
          </div>
          <div className="bg-dark-card border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4 text-primary">
              <History className="w-6 h-6" />
              <h3 className="font-bold">Pontos Disponíveis</h3>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{backups.length} <span className="text-lg text-gray-500">snapshots</span></p>
            <p className="text-xs text-gray-500">Pontos de restauração preservados logs</p>
          </div>
          <div className="bg-dark-card border border-white/5 rounded-2xl p-6 flex flex-col justify-center items-center text-center">
            <Button onClick={createManualBackup} variant="outline" className="w-full h-12 bg-white/[0.02] hover:bg-white/10 border-white/10">
              <DownloadCloud className="w-4 h-4 mr-2" />
              Forçar Backup Agora
            </Button>
            <p className="text-[10px] text-gray-500 mt-3 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" /> Backups seguros habilitados
            </p>
          </div>
        </div>

        {/* History List */}
        <div className="bg-dark-card border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2"><Database className="w-4 h-4" /> Histórico de Snapshots</h2>
          </div>
          
          <div className="divide-y divide-white/5">
            {backups.map((backup, index) => (
              <motion.div 
                key={backup.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
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
                      <span className="text-[10px] uppercase font-bold text-green-500 border border-green-500/20 bg-green-500/10 px-2 py-0.5 rounded-full">
                        Versão Atual Produção
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
                    <span>📅 {new Date(backup.timestamp).toLocaleString('pt-BR')}</span>
                    <span>📦 {backup.size}</span>
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
                      <>⏳ Restaurando Sistema...</>
                    ) : index === 0 ? (
                      <><CheckCircle2 className="w-4 h-4 text-green-500" /> Rodando Atualmente</>
                    ) : (
                      <><RotateCcw className="w-4 h-4" /> Restaurar Ponto</>
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
