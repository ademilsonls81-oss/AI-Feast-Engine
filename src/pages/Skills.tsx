import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Globe, Search, Download, ExternalLink, ChevronRight, X, Check, Shield, Terminal, ArrowRight, AlertTriangle, AlertCircle, Info } from "lucide-react";
import api from "../lib/api";
import {
  Badge,
  RiskBadge,
  OriginBadge,
  SkeletonGrid,
  EmptyState,
  Input,
} from "../components/ui";

interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string;
  long_description: string;
  category: string;
  tags: string[];
  risk_level: string;
  verified: boolean;
  source?: string;
  downloads: number;
  input_schema?: any;
  output_schema?: any;
  code?: string;
  install_command?: string;
  run_command?: string;
  created_at: string;
}

const categories = ["All", "development", "content", "automation", "analysis", "security"];
const originFilters = ["All", "AI Verified", "Community Imported"];

export default function Skills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [originFilter, setOriginFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [copiedCmd, setCopiedCmd] = useState("");
  const [evaluation, setEvaluation] = useState<any>(null);

  useEffect(() => {
    fetchSkills();
  }, []);

  useEffect(() => {
    if (selectedSkill) {
      fetchEvaluation(selectedSkill.slug);
    }
  }, [selectedSkill]);

  async function fetchSkills() {
    try {
      const params: Record<string, string> = {};
      if (originFilter === "AI Verified") params.verified = "true";
      if (originFilter === "Community Imported") params.source = "github";

      const res = await api.get("/api/skills", { params });
      setSkills(res.data.skills || []);
    } catch (err) {
      console.error("Error fetching skills:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSkills(); }, [originFilter]);

  async function fetchEvaluation(slug: string) {
    try {
      const res = await api.post(`/api/skills/${slug}/evaluate`);
      setEvaluation(res.data);
    } catch {
      setEvaluation(null);
    }
  }

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(""), 2000);
  };

  const filteredSkills = skills.filter(s => {
    const matchesCategory = filter === "All" || s.category === filter;
    const matchesSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      (s.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const categoryIcon = (cat: string) => {
    switch (cat) {
      case "development": return "💻";
      case "content": return "📝";
      case "automation": return "⚡";
      case "analysis": return "📊";
      case "security": return "🔒";
      default: return "🔧";
    }
  };

  return (
    <div className="min-h-screen pb-20 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-16 pb-12 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan text-xs font-bold mb-6">
            <Terminal className="w-3 h-3" /> SKILL MARKETPLACE
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-6">
            Discover & <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-cyan">Install Skills</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            AI-powered skills for your development workflow. Install with one command.
          </p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 p-2 bg-dark-card border border-white/5 rounded-2xl">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 px-2 w-full md:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filter === cat
                    ? "bg-neon-cyan text-black shadow-lg shadow-neon-cyan/20"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                {cat === "All" ? "All" : `${categoryIcon(cat)} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
              </button>
            ))}
          </div>
          {/* Origin Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 px-2 w-full md:w-auto">
            {originFilters.map((of) => {
              const isActive = originFilter === of;
              const variant: "ai-verified" | "community" | "tag" =
                of === "AI Verified" ? "ai-verified" : of === "Community Imported" ? "community" : "tag";
              return (
                <button
                  key={of}
                  onClick={() => setOriginFilter(of)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap border ${
                    isActive
                      ? of === "AI Verified" ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : of === "Community Imported" ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/5 border-transparent"
                  }`}
                >
                  {of === "AI Verified" && "🛡️ "}{of === "Community Imported" && "🌐 "}{of}
                </button>
              );
            })}
          </div>
          <div className="relative w-full md:w-64 px-2">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search skills..."
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-sm focus:border-neon-cyan outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Skills Grid */}
        {loading ? (
          <SkeletonGrid count={6} height="h-48" />
        ) : filteredSkills.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSkills.map((skill, idx) => (
              <motion.article
                key={skill.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group bg-dark-card border border-white/10 rounded-3xl p-6 hover:border-neon-cyan/30 transition-all cursor-pointer"
                onClick={() => setSelectedSkill(skill)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{categoryIcon(skill.category)}</span>
                    <div>
                      <h3 className="font-bold text-sm group-hover:text-neon-cyan transition-colors line-clamp-1">{skill.name}</h3>
                      <span className="text-[10px] text-gray-500 font-mono">{skill.slug}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <OriginBadge verified={skill.verified} source={skill.source} />
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-400 mb-4 line-clamp-2">{skill.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {(skill.tags || []).slice(0, 3).map(tag => (
                    <Badge key={tag} variant="tag" label={`#${tag}`} />
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <RiskBadge level={skill.risk_level} />
                  <div className="flex items-center gap-3 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1"><Download className="w-3 h-3" />{skill.downloads || 0}</span>
                    <ChevronRight className="w-3 h-3 text-neon-cyan group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        ) : (
          <EmptyState
            context="skills"
            onAction={() => setOriginFilter("All")}
            ctaLabel="Explore skills"
          />
        )}

        {/* Detail Modal */}
        <AnimatePresence>
          {selectedSkill && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => { setSelectedSkill(null); setEvaluation(null); }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-dark-card border border-white/10 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="sticky top-0 bg-dark-card border-b border-white/5 p-6 flex items-start justify-between rounded-t-3xl z-10">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{categoryIcon(selectedSkill.category)}</span>
                    <div>
                      <h2 className="text-xl font-bold">{selectedSkill.name}</h2>
                      <span className="text-xs text-gray-500 font-mono">{selectedSkill.slug}</span>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedSkill(null); setEvaluation(null); }} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <RiskBadge level={selectedSkill.risk_level} />
                    {selectedSkill.verified && (
                      <Badge variant="ai-verified" />
                    )}
                    <Badge variant="category" label={selectedSkill.category.toUpperCase()} />
                  </div>

                  {/* Evaluation Score */}
                  {evaluation && (
                    <div className="p-4 bg-black/30 border border-white/5 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400 uppercase tracking-widest">Security Evaluation</span>
                        <span className="text-sm font-bold text-neon-cyan">{(evaluation.score * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                        <div className={`h-full rounded-full transition-all ${evaluation.score >= 0.8 ? 'bg-green-500' : evaluation.score >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${evaluation.score * 100}%` }} />
                      </div>
                      <p className="text-xs text-gray-500">{evaluation.explanation}</p>
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-300 mb-2">Description</h3>
                    <p className="text-sm text-gray-400">{selectedSkill.long_description || selectedSkill.description}</p>
                  </div>

                  {/* Tags */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-300 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {(selectedSkill.tags || []).map(tag => (
                        <Badge key={tag} variant="tag" label={`#${tag}`} />
                      ))}
                    </div>
                  </div>

                  {/* Install Command */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-300 mb-2">Install</h3>
                    <div className="flex items-center gap-2 p-3 bg-black/40 border border-white/5 rounded-xl">
                      <code className="flex-1 text-neon-cyan font-mono text-sm">{selectedSkill.install_command || `npx aifeast ${selectedSkill.slug}`}</code>
                      <button onClick={() => copyCommand(selectedSkill.install_command || `npx aifeast ${selectedSkill.slug}`)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                        {copiedCmd.includes(selectedSkill.slug) ? <Check className="w-4 h-4 text-green-400" /> : <Download className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>

                  {/* Run Command */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-300 mb-2">Execute</h3>
                    <div className="flex items-center gap-2 p-3 bg-black/40 border border-white/5 rounded-xl">
                      <code className="flex-1 text-neon-purple font-mono text-sm">{selectedSkill.run_command || `npx aifeast run ${selectedSkill.slug} --input "your text"`}</code>
                      <button onClick={() => copyCommand(selectedSkill.run_command || `npx aifeast run ${selectedSkill.slug}`)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                        {copiedCmd.includes(selectedSkill.slug) && copiedCmd.includes("run") ? <Check className="w-4 h-4 text-green-400" /> : <Terminal className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>

                  {/* Schemas */}
                  {selectedSkill.input_schema && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-300 mb-2 flex items-center gap-2"><ArrowRight className="w-4 h-4 text-green-400" /> Input Schema</h3>
                      <pre className="p-3 bg-black/40 border border-white/5 rounded-xl text-xs text-gray-300 font-mono overflow-x-auto">{JSON.stringify(selectedSkill.input_schema, null, 2)}</pre>
                    </div>
                  )}
                  {selectedSkill.output_schema && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-300 mb-2 flex items-center gap-2"><ArrowRight className="w-4 h-4 text-neon-cyan" /> Output Schema</h3>
                      <pre className="p-3 bg-black/40 border border-white/5 rounded-xl text-xs text-gray-300 font-mono overflow-x-auto">{JSON.stringify(selectedSkill.output_schema, null, 2)}</pre>
                    </div>
                  )}

                  {/* Usage Example */}
                  <div className="p-4 bg-neon-cyan/5 border border-neon-cyan/10 rounded-xl">
                    <h3 className="text-sm font-bold text-neon-cyan mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> Usage Example</h3>
                    <pre className="text-xs text-gray-300 font-mono">
{`# Install
npx aifeast ${selectedSkill.slug}

# Configure your API key
npx aifeast config --key YOUR_API_KEY

# Run
npx aifeast run ${selectedSkill.slug} --input "your input here"`}
                    </pre>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-white/5">
                    <span>Downloads: {selectedSkill.downloads || 0}</span>
                    <span>Created: {new Date(selectedSkill.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
