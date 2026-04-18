import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui";
import { ArrowRight, Sparkles, Shield, Zap, Play } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <section className="relative overflow-hidden z-0">
      {/* Blobs animados — roxo esquerda, ciano direita */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[100px] animate-pulse-glow"
          style={{ background: 'rgba(168, 85, 247, 0.15)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[100px] animate-pulse-glow"
          style={{ background: 'rgba(6, 182, 212, 0.15)', animationDelay: '1s' }}
        />
        {/* Radial gradient mask */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#0a0a0a_80%)]" />
      </div>

      {/* Grid quadriculado */}
      <div className="absolute inset-0 grid-pattern pointer-events-none z-0 opacity-20" />

      {/* Content wrapper */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI Skills Marketplace</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
          >
            Validated AI Agents{' '}
            <span className="gradient-text text-primary">ready to deploy</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Discover, validate and integrate AI skills in minutes.
            <br />Automated import pipeline with AI-powered security verification.
          </motion.p>

          {/* CTAs — botão preenchido com gradiente roxo→ciano */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/skills">
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white border-0 gap-2 h-12 px-6 text-base"
              >
                Explore Skills
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/docs">
              <Button variant="outline" size="lg" className="gap-2 h-12 px-6 text-base">
                <Play className="w-4 h-4" />
                View Documentation
              </Button>
            </Link>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6 mt-12 text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-chart-3" />
              <span className="text-sm">AI Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-chart-4" />
              <span className="text-sm">100+ Skills</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm">Self-Healing Pipeline</span>
            </div>
          </motion.div>
        </div>

        {/* Terminal — 3 bolinhas coloridas */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-16 lg:mt-24 max-w-3xl mx-auto"
        >
          <div className="rounded-xl border border-border/50 bg-card/50 glass overflow-hidden glow">
            {/* Barra do terminal com 3 bolinhas */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-secondary/30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs text-muted-foreground font-mono ml-2">terminal</span>
            </div>

            {/* Conteúdo do terminal */}
            <div className="p-4 font-mono text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-chart-3">$</span>
                <span className="text-muted-foreground">npx aifeast install</span>
                <span className="text-primary font-bold">code-reviewer</span>
              </div>
              <div className="text-muted-foreground/70 mt-2">
                <span className="text-chart-3">✓</span> Security check passed
              </div>
              <div className="text-muted-foreground/70">
                <span className="text-chart-3">✓</span> Schema validated
              </div>
              <div className="text-muted-foreground/70">
                <span className="text-chart-3">✓</span> Installing skill...
              </div>
              <div className="mt-2 text-chart-3 font-semibold">
                ✨ Skill installed successfully!
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
