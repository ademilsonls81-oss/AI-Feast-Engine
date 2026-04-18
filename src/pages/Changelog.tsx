import React from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Cpu, Sparkles, Database, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui';

const RELEASES = [
  {
    version: "4.0.0",
    date: "April 17, 2026",
    title: "The Engine Overhaul",
    badge: "Major",
    changes: [
      { type: "new", text: "Introduced 'Ingestion Pipeline' with real-time RSS syncing logic.", icon: Database },
      { type: "new", text: "Added live AI Performance metrics (TPS and Cost tracking).", icon: Zap },
      { type: "improved", text: "Refactored Dashboard with developer-ready cURL console.", icon: Cpu },
      { type: "improved", text: "Full internationalization for all dashboard and engine components.", icon: Sparkles }
    ]
  },
  {
    version: "3.5.0",
    date: "April 10, 2026",
    title: "Security & Validation",
    badge: "Feature",
    changes: [
      { type: "new", text: "Agent validation system using human-in-the-loop protocols.", icon: ShieldCheck },
      { type: "improved", text: "Optimized Gemini Flash 1.5 token consumption by 30%.", icon: Zap }
    ]
  }
];

export default function Changelog() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Changelog</h1>
          <p className="text-gray-400 text-lg">Stay updated with the latest improvements and refinements to the AI Feast ecosystem.</p>
        </div>

        <div className="space-y-16">
          {RELEASES.map((release, rIdx) => (
            <div key={release.version} className="relative pl-12 border-l border-white/5">
              <div className="absolute left-[-5px] top-0 w-[9px] h-[9px] rounded-full bg-primary shadow-glow-purple" />
              
              <div className="mb-6 flex items-center gap-4">
                <span className="text-2xl font-bold font-mono text-white">{release.version}</span>
                <span className="text-sm text-gray-500 font-mono">{release.date}</span>
                <Badge variant="category" className={release.badge === 'Major' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-white/5 text-gray-400'}>
                  {release.badge}
                </Badge>
              </div>

              <h2 className="text-xl font-bold mb-8 text-gray-200">{release.title}</h2>

              <div className="grid gap-6">
                {release.changes.map((change, cIdx) => (
                  <motion.div 
                    key={cIdx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: rIdx * 0.1 + cIdx * 0.05 }}
                    className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5"
                  >
                    <div className="mt-1 p-1.5 rounded-lg bg-black/40 border border-white/10">
                      <change.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${change.type === 'new' ? 'text-green-400' : 'text-neon-cyan'}`}>
                          {change.type}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm leading-relaxed">{change.text}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
