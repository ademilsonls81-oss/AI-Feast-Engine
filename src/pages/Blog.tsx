import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, User, ArrowRight, Sparkles, Cpu, Zap, Shield, Rocket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

const BLOG_POSTS = [
  {
    id: 1,
    title: "Introducing AI Feast Engine v4.0",
    excerpt: "Discover the most powerful autonomous content engine ever built. Real-time RSS distillation, Gemini Flash integration, and zero-latency output.",
    date: "April 17, 2026",
    author: "Ademilson Lima",
    category: "Product Update",
    icon: Sparkles,
    color: "text-neon-purple",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 2,
    title: "Mastering the Ingestion Pipeline",
    excerpt: "Learn how to optimize your feed ingestion for maximum throughput and content quality using our new high-precision filters.",
    date: "April 15, 2026",
    author: "AI Feast Team",
    category: "Tutorial",
    icon: Cpu,
    color: "text-neon-cyan",
    image: "https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 3,
    title: "The Future of Autonomous Skills",
    excerpt: "Why the transition from static templates to dynamic AI skills is the biggest shift in SaaS development this decade.",
    date: "April 12, 2026",
    author: "Engineering Blog",
    category: "Insights",
    icon: Zap,
    color: "text-yellow-400",
    image: "https://images.unsplash.com/photo-1620712943543-bcc4638d9980?auto=format&fit=crop&q=80&w=800"
  }
];

export default function Blog() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center mb-16 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-6"
          >
            <Rocket className="w-3 h-3" />
            Engineering & Vision
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-6">
            Insights from the <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-cyan neon-glow-purple">Frontier of AI</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Technical deep dives, product updates, and our journey in building the ecosystem of autonomous agents.
          </p>
        </div>

        {/* Featured Post */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <Card className="bg-dark-card border-white/5 overflow-hidden group hover:border-primary/30 transition-all duration-500">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="relative h-64 md:h-auto overflow-hidden">
                <img 
                  src={BLOG_POSTS[0].image} 
                  alt="Featured" 
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent opacity-60" />
              </div>
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <div className="flex items-center gap-4 mb-6 text-xs font-mono">
                  <span className="bg-primary/20 text-primary px-3 py-1 rounded-md">{BLOG_POSTS[0].category}</span>
                  <span className="text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> {BLOG_POSTS[0].date}</span>
                </div>
                <h2 className="text-3xl font-bold mb-4 group-hover:text-primary transition-colors">{BLOG_POSTS[0].title}</h2>
                <p className="text-gray-400 mb-8 max-w-lg leading-relaxed">{BLOG_POSTS[0].excerpt}</p>
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-white font-bold">AL</div>
                    <span className="text-sm font-medium">{BLOG_POSTS[0].author}</span>
                  </div>
                  <button className="flex items-center gap-2 text-sm text-primary font-bold hover:translate-x-1 transition-transform">
                    READ STORY <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Post Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
          {BLOG_POSTS.slice(1).map((post, idx) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="bg-dark-card border-white/5 h-full hover:border-white/10 transition-colors group">
                <div className="h-48 overflow-hidden rounded-t-xl">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <CardContent className="p-8">
                   <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] uppercase font-bold text-primary tracking-widest">{post.category}</span>
                      <post.icon className={`w-5 h-5 ${post.color}`} />
                   </div>
                   <h3 className="text-xl font-bold mb-3">{post.title}</h3>
                   <p className="text-sm text-gray-500 mb-6 line-clamp-2">{post.excerpt}</p>
                   <div className="flex items-center justify-between border-t border-white/5 pt-4">
                      <span className="text-xs text-gray-400">{post.date}</span>
                      <button className="text-xs font-bold text-white hover:text-primary transition-colors flex items-center gap-1 group/btn">
                         CONTINUE <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                   </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Newsletter / CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-24 p-8 md:p-12 bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-[2rem] text-center"
        >
          <h2 className="text-3xl font-bold mb-4">Stay at the cutting edge</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto text-lg lowercase">Receba atualizações semanais sobre novos agentes e pipelines disponíveis.</p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="seu@email.com" 
              className="flex-1 px-6 py-3 rounded-xl bg-black/40 border border-white/10 focus:border-primary outline-none transition-all"
            />
            <button className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-primary transition-all">
              SUBSCRIBE
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
