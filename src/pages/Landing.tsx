import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Zap, Shield, Globe, Database, ArrowRight, CheckCircle2 } from "lucide-react";
import { signInWithGoogle } from "../lib/supabaseClient";
import api from "../lib/api";
import { cn } from "../lib/utils";

export default function Landing() {
  const [stats, setStats] = useState({ postsCount: 0, feedsCount: 0, languages: 11 });

  useEffect(() => {
    api.get("/api/stats").then(res => setStats(res.data)).catch(console.error);
  }, []);

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-6xl pointer-events-none">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-neon-purple/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-neon-cyan/20 blur-[120px] rounded-full" />
        </div>

        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-white/5 border border-white/10 text-xs font-semibold tracking-wider text-neon-cyan uppercase">
              The Next-Gen Data Pipeline
            </span>
            <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tighter mb-8 leading-[1.1]">
              Fuel Your LLMs with <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-cyan neon-text-purple">
                AI-Processed Data
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
              Ingest 50+ RSS feeds, generate AI summaries in Portuguese, and translate to 10+ languages instantly. The feast starts here.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => signInWithGoogle()}
                className="w-full sm:w-auto px-8 py-4 bg-neon-purple text-white rounded-full font-bold neon-glow-purple hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                Get Started Free <ArrowRight className="w-5 h-5" />
              </button>
              <Link to="/docs" className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full font-bold transition-all">
                View Documentation
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto p-8 bg-dark-card/50 border border-white/10 rounded-3xl backdrop-blur-sm"
          >
            <div className="text-center">
              <div className="text-3xl font-display font-bold text-neon-purple mb-1">{stats.postsCount.toLocaleString()}+</div>
              <div className="text-xs text-gray-500 uppercase tracking-widest">Posts Processed</div>
            </div>
            <div className="text-center border-l border-white/10">
              <div className="text-3xl font-display font-bold text-neon-cyan mb-1">{stats.feedsCount}</div>
              <div className="text-xs text-gray-500 uppercase tracking-widest">Active Sources</div>
            </div>
            <div className="text-center border-l border-white/10">
              <div className="text-3xl font-display font-bold text-neon-purple mb-1">{stats.languages}</div>
              <div className="text-xs text-gray-500 uppercase tracking-widest">Languages</div>
            </div>
            <div className="text-center border-l border-white/10">
              <div className="text-3xl font-display font-bold text-neon-cyan mb-1">&lt; 100ms</div>
              <div className="text-xs text-gray-500 uppercase tracking-widest">API Latency</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-dark-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl mb-4">Engineered for Performance</h2>
            <p className="text-gray-400">Everything you need to build powerful AI agents and crawlers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              { icon: Zap, title: "AI Summarization", desc: "Native Portuguese summaries generated by Groq Llama 3.1 for maximum speed.", color: "text-neon-purple" },
              { icon: Globe, title: "Multi-Language", desc: "Automatic translation to 11 languages including English, Japanese, and Arabic.", color: "text-neon-cyan" },
              { icon: Database, title: "Structured API", desc: "Clean JSON output ready for your bots, crawlers, and LLM fine-tuning.", color: "text-neon-purple" },
            ].map((f, i) => (
              <div key={i} className="p-8 bg-dark-card border border-white/5 rounded-3xl hover:border-neon-purple/30 transition-all group">
                <f.icon className={cn("w-12 h-12 mb-6 transition-transform group-hover:scale-110", f.color)} />
                <h3 className="text-xl mb-3">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Live Stats Banner */}
          <div className="max-w-4xl mx-auto p-8 bg-gradient-to-r from-neon-purple/10 to-neon-cyan/10 border border-white/10 rounded-3xl">
            <div className="text-center mb-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Live System Stats</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-neon-purple mb-1">300+</div>
                <div className="text-xs text-gray-500 uppercase">Articles Processed</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-neon-cyan mb-1">11</div>
                <div className="text-xs text-gray-500 uppercase">Languages</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-neon-purple mb-1">5</div>
                <div className="text-xs text-gray-500 uppercase">Categories</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-neon-cyan mb-1">12</div>
                <div className="text-xs text-gray-500 uppercase">RSS Sources</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 Categories Showcase */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl mb-4">5 Content Categories, Fully Balanced</h2>
            <p className="text-gray-400">From tech to health, we've got your data needs covered.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-5xl mx-auto">
            {[
              { icon: "💻", cat: "Tech", desc: "AI, gadgets, startups", count: "180+" },
              { icon: "💰", cat: "Finance", desc: "Markets, business", count: "60+" },
              { icon: "🏥", cat: "Health", desc: "Medical, wellness", count: "30+" },
              { icon: "🔬", cat: "Science", desc: "NASA, research", count: "29+" },
              { icon: "📰", cat: "General", desc: "World news", count: "76+" },
            ].map((item, i) => (
              <div key={i} className="p-6 bg-dark-card border border-white/5 rounded-2xl text-center hover:border-neon-purple/30 transition-all group">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{item.icon}</div>
                <h4 className="text-sm font-bold mb-1">{item.cat}</h4>
                <p className="text-xs text-gray-500 mb-2">{item.desc}</p>
                <div className="text-lg font-bold text-neon-cyan">{item.count}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-400">Scale as you grow. No hidden fees.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="p-10 bg-dark-card border border-white/10 rounded-3xl relative overflow-hidden">
              <h3 className="text-2xl mb-2">Free</h3>
              <div className="text-4xl font-bold mb-6">$0<span className="text-lg text-gray-500 font-normal">/mo</span></div>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 className="w-5 h-5 text-neon-cyan" /> 100 requests / month</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 className="w-5 h-5 text-neon-cyan" /> All 5 categories</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 className="w-5 h-5 text-neon-cyan" /> 11 languages</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 className="w-5 h-5 text-neon-cyan" /> Community support</li>
              </ul>
              <button
                onClick={() => signInWithGoogle()}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all"
              >
                Get Started Free
              </button>
            </div>

            {/* Pro Plan */}
            <div className="p-10 bg-gradient-to-br from-neon-purple/20 to-neon-cyan/10 border-2 border-neon-purple rounded-3xl relative overflow-hidden neon-glow-purple">
              <div className="absolute top-4 right-4 bg-neon-purple text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider rounded-full">Most Popular</div>
              <h3 className="text-2xl mb-2">Pro</h3>
              <div className="text-4xl font-bold mb-2">$9.99<span className="text-lg text-gray-500 font-normal">/mo</span></div>
              <div className="text-xs text-gray-400 mb-6">+ $0.001 per extra request</div>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 className="w-5 h-5 text-neon-cyan" /> 10,000 requests / month</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 className="w-5 h-5 text-neon-cyan" /> Priority processing</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 className="w-5 h-5 text-neon-cyan" /> All 5 categories + more coming</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 className="w-5 h-5 text-neon-cyan" /> Real-time updates</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 className="w-5 h-5 text-neon-cyan" /> Premium support</li>
              </ul>
              <button
                onClick={() => signInWithGoogle()}
                className="w-full py-4 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-neon-purple/30"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}