import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Search, CheckCircle, XCircle, Loader2, AlertTriangle, ArrowRight, Code } from "lucide-react";
import { Button } from "../components/ui";

export default function Valide() {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<null | 'success' | 'failed'>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const startScan = () => {
    if (!url) return;
    setScanning(true);
    setResult(null);
    setLogs(["Iniciando análise de segurança...", `Clonando repositório: ${url}`]);

    const steps = [
      "Verificando dependências (npm audit)...",
      "Analisando código fonte (SAST)...",
      "Procurando por chaves ou secrets hardcoded...",
      "Avaliando prompts da IA (LLM Security)...",
      "Testando contra Data Leakage...",
      "Compilando relatório final..."
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setLogs(prev => [...prev, steps[currentStep]]);
        currentStep++;
      } else {
        clearInterval(interval);
        setScanning(false);
        // Simular 80% de chance de sucesso
        const isSuccess = Math.random() > 0.2;
        setResult(isSuccess ? 'success' : 'failed');
        setLogs(prev => [...prev, isSuccess 
          ? "✅ Validação concluída com sucesso. Nenhum risco crítico." 
          : "❌ Falha na validação. Vulnerabilidades críticas (Data Leakage) detectadas."]);
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 bg-background">
      <div className="container mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Auditoria e <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Validação</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Submeta seu agente de Inteligência Artificial para uma varredura de segurança, vazamento de dados e vulnerabilidades.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-dark-card border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Code className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Insira a URL do repositório GitHub do seu Agent..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={scanning}
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-50 text-white"
              />
            </div>
            <Button 
              size="lg" 
              onClick={startScan} 
              disabled={scanning || !url}
              className="h-14 px-8 rounded-2xl bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold min-w-[200px]"
            >
              {scanning ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Analisando...</>
              ) : (
                <><Search className="w-5 h-5" /> Iniciar Scanner</>
              )}
            </Button>
          </div>

          {/* Terminal/Logs */}
          <div className="bg-black rounded-2xl p-6 font-mono text-sm border border-white/10 min-h-[300px] flex flex-col">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-500 text-xs ml-2">aifeast-validator-cli v2.0.4</span>
            </div>
            
            <div className="flex-1 space-y-2 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-600 italic">Aguardando repositório para análise...</div>
              ) : (
                logs.map((log, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }}
                    className={
                      log.startsWith("✅") ? "text-green-400 font-bold" : 
                      log.startsWith("❌") ? "text-red-400 font-bold" : 
                      "text-gray-300"
                    }
                  >
                    <span className="text-gray-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                    {log}
                  </motion.div>
                ))
              )}
              {scanning && (
                <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-3 h-4 bg-primary mt-2" />
              )}
            </div>
          </div>

          {/* Resultados */}
          <AnimatePresence>
            {result && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`mt-6 p-6 rounded-2xl border flex items-start md:items-center gap-4 ${
                  result === 'success' 
                    ? 'bg-green-500/10 border-green-500/20' 
                    : 'bg-red-500/10 border-red-500/20'
                }`}
              >
                {result === 'success' ? (
                  <CheckCircle className="w-10 h-10 text-green-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-10 h-10 text-red-500 shrink-0" />
                )}
                
                <div className="flex-1">
                  <h3 className={`font-bold text-lg ${result === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {result === 'success' ? 'Skill Validado Aprovado!' : 'Vulnerabilidades Críticas Encontradas'}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {result === 'success' 
                      ? 'Nenhum risco de segurança encontrado. Seu agente está apto para ser indexado no marketplace e receber o selo AI Verified.' 
                      : 'O scanner detectou possíveis meios de prompt injection ou vazamento de dados. Verifique os logs e corrija o código do agente.'}
                  </p>
                </div>

                {result === 'success' && (
                  <Button className="shrink-0 bg-green-500 hover:bg-green-600 text-black font-bold h-12 rounded-xl">
                    Publicar Skill <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
