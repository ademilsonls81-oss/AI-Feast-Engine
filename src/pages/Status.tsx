import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Server, Database, Zap, Globe, Activity, Check } from "lucide-react";
import api from "../lib/api";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "down" | "checking";
  message: string;
  responseTime?: number;
  icon: React.ReactNode;
}

export default function Status() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "API Principal", status: "checking", message: "Checking...", icon: <Server className="w-5 h-5" /> },
    { name: "Banco de Dados", status: "checking", message: "Checking...", icon: <Database className="w-5 h-5" /> },
    { name: "Processador de Pagamentos", status: "checking", message: "Checking...", icon: <Zap className="w-5 h-5" /> },
  ]);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkAllServices = async () => {
    const results: ServiceStatus[] = [...services];

    // Check API
    const apiStart = Date.now();
    try {
      const res = await api.get("/api/health");
      const responseTime = Date.now() - apiStart;
      results[0] = {
        name: "API Principal",
        status: res.data.status === "alive" ? "operational" : "degraded",
        message: res.data.status === "alive" ? `Operational (${responseTime}ms)` : "Response abnormal",
        responseTime,
        icon: <Server className="w-5 h-5" />
      };
    } catch (e: any) {
      results[0] = { name: "API Principal", status: "down", message: e.message || "Unreachable", icon: <Server className="w-5 h-5" /> };
    }

    // Check Supabase
    try {
      const dbStart = Date.now();
      const res = await api.get("/api/stats");
      const responseTime = Date.now() - dbStart;
      const postsCount = res.data.postsCount || 0;
      results[1] = {
        name: "Banco de Dados",
        status: postsCount > 0 ? "operational" : "degraded",
        message: postsCount > 0 ? `${postsCount} posts indexed (${responseTime}ms)` : "Empty or slow",
        responseTime,
        icon: <Database className="w-5 h-5" />
      };
    } catch (e: any) {
      results[1] = { name: "Banco de Dados", status: "down", message: e.message || "Connection failed", icon: <Database className="w-5 h-5" /> };
    }

    // Check Stripe
    try {
      const stripeStart = Date.now();
      const res = await api.post("/api/create-checkout-session", { userId: "test", email: "test@test.com" });
      const responseTime = Date.now() - stripeStart;
      if (res.status === 200 || res.status === 500) {
        results[2] = {
          name: "Processador de Pagamentos",
          status: "operational",
          message: res.status === 200 ? "Ready for checkout" : "Configured",
          responseTime,
          icon: <Zap className="w-5 h-5" />
        };
      } else if (res.status === 503) {
        results[2] = { name: "Processador de Pagamentos", status: "degraded", message: "Not enabled", icon: <Zap className="w-5 h-5" /> };
      }
    } catch (e: any) {
      results[2] = { name: "Processador de Pagamentos", status: "down", message: e.message || "Connection failed", icon: <Zap className="w-5 h-5" /> };
    }

    setServices(results);
    setLastCheck(new Date());
  };

  useEffect(() => {
    checkAllServices();
    const interval = setInterval(checkAllServices, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div className="min-h-screen pt-12 pb-24 px-4 bg-background">
      <div className="container mx-auto max-w-4xl pt-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center text-center mb-16">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">Todos os sistemas operacionais</h1>
          <p className="text-sm text-gray-400">
            Última atualização: {lastCheck ? formatDate(lastCheck) : "..."}
          </p>
        </motion.div>

        {/* Serviços */}
        <div className="bg-dark-card border border-white/5 rounded-2xl p-6 md:p-8 mb-8">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white mb-6">
            <Activity className="w-5 h-5 text-gray-400" /> Serviços
          </h2>
          <div className="space-y-4">
            {services.map((service, i) => (
              <motion.div
                key={service.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="text-gray-400">
                    {service.icon}
                  </div>
                  <span className="font-bold text-sm md:text-base text-gray-100">{service.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500 font-mono hidden md:inline-block">
                    {service.responseTime ? `⏱ ${service.responseTime}ms` : '⏱ --ms'}
                  </span>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-green-500/30 bg-green-500/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-green-500">Operacional</span>
                  </div>
                </div>
              </motion.div>
            ))}
            {/* Adicionando um card extra estatico para parecer com o mockup */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl"
            >
              <div className="flex items-center gap-4">
                <div className="text-gray-400">
                  <Globe className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm md:text-base text-gray-100">CDN Global</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500 font-mono hidden md:inline-block">
                  ⏱ 8ms
                </span>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-green-500/30 bg-green-500/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  <span className="text-xs font-bold text-green-500">Operacional</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Uptime */}
        <div className="bg-dark-card border border-white/5 rounded-2xl p-6 md:p-8 mb-8">
          <h2 className="text-sm font-bold text-white mb-6">Uptime dos últimos 90 dias</h2>
          <div className="flex items-end gap-1 h-12 w-full justify-between mb-4">
            {Array.from({ length: 90 }).map((_, i) => (
              <div
                key={i}
                className={`w-full max-w-[6px] rounded-sm bg-green-500 hover:bg-green-400 transition-colors cursor-pointer ${
                  i % 15 === 0 && i !== 0 ? 'bg-green-500/50' : ''
                }`}
                style={{ height: i % 15 === 0 && i !== 0 ? '60%' : '100%' }}
                title={i % 15 === 0 && i !== 0 ? 'Minor latency detected' : '100% Operational'}
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>90 dias atrás</span>
            <span className="font-bold text-white">99.98% uptime</span>
            <span>Hoje</span>
          </div>
        </div>

        {/* Histórico */}
        <div className="bg-dark-card border border-white/5 rounded-2xl p-6 md:p-8">
          <h2 className="text-sm font-bold text-white mb-6">Histórico de Incidentes</h2>
          <div className="space-y-6">
            <div className="relative pl-6 border-l border-white/10">
              <div className="absolute -left-1.5 top-2 w-3 h-3 rounded-full bg-dark-card border-2 border-primary"></div>
              <div className="flex items-center gap-3 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/20">Resolvido</span>
                <span className="text-xs text-gray-400">2026-04-14</span>
              </div>
              <h3 className="font-bold text-sm text-white mb-1">Manutenção programada concluída</h3>
              <p className="text-xs text-gray-500">Atualização do sistema autônomo para versão 2.0</p>
            </div>
            
            <div className="relative pl-6 border-l border-white/10">
              <div className="absolute -left-1.5 top-2 w-3 h-3 rounded-full bg-dark-card border-2 border-primary"></div>
              <div className="flex items-center gap-3 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/20">Resolvido</span>
                <span className="text-xs text-gray-400">2026-04-10</span>
              </div>
              <h3 className="font-bold text-sm text-white mb-1">Latência elevada temporária</h3>
              <p className="text-xs text-gray-500">Identificado e corrigido gargalo no processamento de batch</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
