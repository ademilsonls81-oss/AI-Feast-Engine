import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui";
import { ArrowRight, Sparkles, Shield, Zap, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Marketplace de Skills IA</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
          >
            Agentes IA{' '}
            <span className="gradient-text">validados</span>
            <br />prontos para integrar
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Descubra, valide e integre skills de IA em minutos. 
            Pipeline automatizado com verificação de segurança.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/skills">
              <Button variant="primary" size="lg" className="gap-2 h-12 px-6 text-base">
                Explorar Skills
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/docs">
              <Button variant="ghost" size="lg" className="h-12 px-6 text-base">
                Ver Documentação
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6 mt-12 text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm">Validado por IA</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-accent" />
              </div>
              <span className="text-sm">100+ Skills</span>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-16 lg:mt-24 max-w-3xl mx-auto relative"
        >
          <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg blur-2xl opacity-30 animate-pulse" />
          
          <div className="relative bg-black rounded-lg border border-white/10 p-4">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <span className="text-xs text-gray-400 font-mono ml-2">terminal</span>
            </div>
            <div className="p-4 font-mono text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-400">$</span>
                <span className="text-white">npx aifeast install</span>
                <span className="text-purple-400">code-reviewer</span>
              </div>
              <div className="mt-2 text-gray-300">
                <Check className="w-4 h-4 text-green-400 inline mr-2" />
                Verificando segurança...
              </div>
              <div className="text-gray-300">
                <Check className="w-4 h-4 text-green-400 inline mr-2" />
                Validando schema...
              </div>
              <div className="text-gray-300">
                <Check className="w-4 h-4 text-green-400 inline mr-2" />
                Instalando skill...
              </div>
              <div className="mt-2 text-green-400">
                ✨ Skill instalado com sucesso!
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}