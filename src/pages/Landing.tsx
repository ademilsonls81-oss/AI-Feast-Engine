import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Globe, Database, CreditCard, Activity, CheckCircle2 } from "lucide-react";
import { signInWithGoogle } from "../lib/supabaseClient";
import api from "../lib/api";
import { cn } from "../lib/utils";
import { Badge, Button, Spinner, EmptyState } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ postsCount: 0, feedsCount: 0, languages: 11 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  useEffect(() => {
    setStatsLoading(true);
    setStatsError(null);
    api.get("/api/stats")
      .then(res => setStats(res.data))
      .catch(err => setStatsError(err.message || 'Erro ao carregar estatísticas'))
      .finally(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    setSkillsLoading(true);
    setSkillsError(null);
    api.get("/api/skills")
      .then(res => {
        const all = res.data.skills || [];
        const sorted = [...all].sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
        setSkills(sorted.slice(0, 6));
      })
      .catch(err => setSkillsError(err.message || 'Erro ao carregar skills'))
      .finally(() => setSkillsLoading(false));
  }, []);

  const handleUpgrade = async () => {
    if (!user) {
      signInWithGoogle();
      return;
    }

    setIsUpgrading(true);
    try {
      const res = await api.post("/api/create-checkout-session", {
        userId: user.id,
        email: user.email
      });
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

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
            <Badge variant="tag"><span className="text-neon-cyan">The Next-Gen Data Pipeline</span></Badge>
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
              <Button variant="primary" size="lg" onClick={() => signInWithGoogle()}>
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Button>
              <Button variant="secondary" size="lg" onClick={() => window.location.href = '/docs'}>
                View Documentation
              </Button>
            </div>
          </motion.div>

          {/* Live Stats */}
          {statsLoading ? (
            <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto p-8">
              <div className="text-center"><Spinner size="md" /></div>
            </div>
          ) : statsError ? (
            <div className="mt-24"><EmptyState title="Erro" description={statsError} /></div>
          ) : stats.postsCount === 0 ? (
            <div className="mt-24"><EmptyState title="Sem dados" description="Nenhum post processado ainda." /></div>
          ) : (
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
          )}
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
              { icon: Globe, title: "Multi-Language", desc: "Automatic translation to 11 languages including English, Japanese, and Arabic.", color: "text-neon-cyan" },
              { icon: Database, title: "Structured API", desc: "Clean JSON output ready for your bots, crawlers, and LLM fine-tuning.", color: "text-neon-purple" },
              { icon: Activity, title: "Real-Time Pipeline", desc: "Continuous ingestion from RSS feeds with AI summarization and translation.", color: "text-neon-cyan" },
            ].map((f, i) => (
              <div key={i} className="p-8 bg-dark-card border border-white/5 rounded-3xl hover:border-neon-purple/30 transition-all group">
                <f.icon className={cn("w-12 h-12 mb-6 transition-transform group-hover:scale-110", f.color)} />
                <h3 className="text-xl mb-3">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
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

      {/* Skills Section */}
      <section className="py-24 bg-dark-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl mb-4">Popular Skills</h2>
            <p className="text-gray-400">Community-built tools ready to integrate with your workflow.</p>
            <a href="/skills" className="text-neon-cyan text-sm hover:underline inline-flex items-center gap-1 mt-4">
              Browse all skills <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {skillsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="p-6 bg-dark-card border border-white/5 rounded-2xl animate-pulse">
                  <div className="h-4 bg-white/10 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-white/5 rounded w-full mb-2" />
                  <div className="h-3 bg-white/5 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : skillsError ? (
            <div className="max-w-5xl mx-auto"><EmptyState title="Erro" description={skillsError} /></div>
          ) : skills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {skills.map((skill, i) => (
                <a
                  key={skill.id || i}
                  href={`/skills`}
                  className="p-6 bg-dark-card border border-white/5 rounded-2xl hover:border-neon-purple/30 transition-all group block"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-sm font-bold text-white group-hover:text-neon-cyan transition-colors truncate pr-2">
                      {skill.name}
                    </h4>
                    {skill.verified && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 font-bold uppercase">Verified</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2">{skill.description || "No description"}</p>
                  <div className="flex items-center justify-between text-[10px] text-gray-600">
                    <span className="uppercase tracking-wider">{skill.category || "general"}</span>
                    <span>{skill.downloads || 0} uses</span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <EmptyState title="Sem skills" description="Nenhum skill disponível ainda." />
          )}
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
              <Button variant="secondary" className="w-full" onClick={() => signInWithGoogle()}>
                Get Started Free
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="p-10 bg-gradient-to-br from-neon-purple/20 to-neon-cyan/10 border-2 border-neon-purple rounded-3xl relative overflow-hidden neon-glow-purple">
              <Badge variant="popular" className="absolute top-4 right-4" />
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
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="w-full py-4 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-neon-purple/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpgrading ? "LOADING..." : "Upgrade to Pro"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
