import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import api from "../lib/api";
import {
  Badge,
  RiskBadge,
  OriginBadge,
  SkeletonGrid,
  EmptyState,
  Input,
} from "../components/ui";
import { Sparkles, Code, FileText, Bot, BarChart2, ShieldCheck, Download, ChevronRight, X, Check, Terminal, ExternalLink, ArrowRight, Info, Star, Circle, Search } from "lucide-react";

interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string;
  long_description: string;
  category: string;
  tags: string[];
  risk_level?: string;
  validation_score?: number;
  verified: boolean;
  source?: string;
  downloads: number;
  input_schema?: any;
  output_schema?: any;
  code?: string;
  install_command?: string;
  run_command?: string;
  created_at?: string;
}

const categories = ["All", "development", "content", "automation", "analysis", "security"];
const originFilters = ["All", "AI Verified", "Community Imported"];

export default function Skills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [originFilter, setOriginFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [copiedCmd, setCopiedCmd] = useState("");
  const [evaluation, setEvaluation] = useState<any>(null);
  const location = useLocation();

  // refs to avoid race conditions
  const isMountedRef = useRef(false);
  const currentSkillSlugRef = useRef<string | null>(null);
  const initialLoadDoneRef = useRef(false);
  // track if we've already handled the ?open= param
  const autoOpenHandledRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    // Single fetch on mount - avoid double fetch
    if (!initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      fetchSkills();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Auto-open skill from ?open=<slug> query param (used by Validate page Publish button)
  useEffect(() => {
    if (!skills.length || autoOpenHandledRef.current) return;
    const params = new URLSearchParams(location.search);
    const slugToOpen = params.get('open');
    if (slugToOpen) {
      const match = skills.find(s => s.slug === slugToOpen);
      if (match) {
        autoOpenHandledRef.current = true;
        setSelectedSkill(match);
      }
    }
  }, [skills, location.search]);

  useEffect(() => {
    if (selectedSkill) {
      currentSkillSlugRef.current = selectedSkill.slug;
      fetchEvaluation(selectedSkill.slug);
    } else {
      currentSkillSlugRef.current = null;
      setEvaluation(null);
    }
  }, [selectedSkill]);

  useEffect(() => { 
    if (initialLoadDoneRef.current) {
      fetchSkills();
    }
  }, [originFilter]);

  // Helper: Promise with timeout
  const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
    const timeout = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), ms)
    );
    return Promise.race([promise, timeout]);
  };

  async function fetchSkills() {
    try {
      const params: Record<string, string> = {};
      if (originFilter === "AI Verified") params.verified = "true";
      if (originFilter === "Community Imported") params.source = "github";

      const request = api.get("/api/skills", { params });
      const res = await withTimeout(request, 15000, "Timeout: Failed to load skills after 15s");
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setSkills(res.data.skills || []);
        setError(null);
      }
    } catch (err: any) {
      console.error("Error fetching skills:", err);
      if (isMountedRef.current) {
        setError(err.message || "Erro ao carregar skills");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }

  async function fetchEvaluation(slug: string) {
    // Guard: ignore if slug changed while request was in flight
    if (currentSkillSlugRef.current !== slug) {
      return;
    }

    try {
      const res = await api.post(`/api/skills/${slug}/evaluate`);
      
      // Only update if still the same skill
      if (currentSkillSlugRef.current === slug && isMountedRef.current) {
        setEvaluation(res.data);
      }
    } catch {
      if (currentSkillSlugRef.current === slug && isMountedRef.current) {
        setEvaluation(null);
      }
    }
  }

  const copyCommand = (cmd: string) => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(cmd);
        setCopiedCmd(cmd);
        setTimeout(() => setCopiedCmd(""), 2000);
      } else {
        // Fallback para contextos nao-seguros (HTTP sem localhost)
        const textarea = document.createElement("textarea");
        textarea.value = cmd;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopiedCmd(cmd);
        setTimeout(() => setCopiedCmd(""), 2000);
      }
    } catch {
      console.warn("Failed to copy command to clipboard");
    }
  };

  const safeStringify = (obj: any): string => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return "// Unable to display: circular reference or invalid structure";
    }
  };

  const filteredSkills = skills.filter(s => {
    const matchesCategory = filter === "All" || s.category === filter;
    const matchesSearch = !search ||
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase()) ||
      (s.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const categoryIconComponent = (cat: string) => {
    switch (cat) {
      case "development": return <Code className="w-4 h-4" />;
      case "content": return <FileText className="w-4 h-4" />;
      case "automation": return <Bot className="w-4 h-4" />;
      case "analysis": return <BarChart2 className="w-4 h-4" />;
      case "security": return <ShieldCheck className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const translateCategory = (cat: string) => {
    switch (cat) {
      case "All": return "Todos";
      case "development": return "Dev";
      case "content": return "Conteúdo";
      case "automation": return "Automação";
      case "analysis": return "Análise";
      case "security": return "Segurança";
      default: return cat;
    }
  };

  return (
    <div className="min-h-screen pb-20 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-16 pb-8 text-center"
        >
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Catálogo de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Skills</span>
          </h1>
          <p className="text-gray-400 text-base max-w-2xl mx-auto mb-8">
            Explore agentes IA validados e prontos para integração em seus projetos
          </p>

          <div className="relative max-w-2xl mx-auto mb-12">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar skills por nome, descrição ou tag..."
              className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-primary outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide w-full">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  filter === cat
                    ? "bg-white/10 text-white border border-white/10"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent"
                }`}
              >
                {categoryIconComponent(cat)}
                {translateCategory(cat)}
              </button>
            ))}

            {/* Origin Filters - Keeping functionality but subtle styling */}
            <div className="w-px h-6 bg-white/10 mx-2 hidden md:block" />
            
            {originFilters.map((of) => {
              if (of === "All") return null;
              const isActive = originFilter === of;
              return (
                <button
                  key={of}
                  onClick={() => setOriginFilter(isActive ? "All" : of)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all whitespace-nowrap border ${
                    isActive
                      ? of === "AI Verified" ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : of === "Community Imported" ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : "bg-primary/10 text-primary border-primary/20"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/5 border-white/5"
                  }`}
                >
                  {of === "AI Verified" && "🛡️ "}{of === "Community Imported" && "🌐 "}{of}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-sm text-gray-500 mb-6">
          {filteredSkills.length} {filteredSkills.length === 1 ? 'skill encontrado' : 'skills encontrados'}
        </div>

        {/* Skills Grid */}
        {loading ? (
          <SkeletonGrid count={6} height="h-48" />
        ) : error ? (
          <EmptyState title="Erro" description={error} />
        ) : filteredSkills.length === 0 ? (
          <EmptyState title="Nenhum skill encontrado" description="Tente ajustar os filtros." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {filteredSkills.map((skill, idx) => (
              <motion.article
                key={skill.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group bg-dark-card border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all cursor-pointer min-h-[220px] flex flex-col"
                onClick={() => setSelectedSkill(skill)}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                      {categoryIconComponent(skill.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-gray-100 group-hover:text-primary transition-colors line-clamp-1">{skill.name}</h3>
                        {skill.verified && <Check className="w-4 h-4 text-green-500" />}
                      </div>
                      <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full border border-primary/30 text-primary text-[10px] font-medium tracking-wide">
                        {skill.category.toLowerCase()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Score */}
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-500 leading-none">
                      {skill.validation_score ? `${(skill.validation_score * 100).toFixed(0)}%` : '—'}
                    </div>
                    <div className="text-[10px] text-gray-500">score</div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-400 mt-4 mb-auto line-clamp-2">{skill.description}</p>

                {/* Footer Row */}
                <div className="flex items-center justify-between pt-6 mt-4 border-t border-white/5">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5"><Star className="w-4 h-4" />{(skill as any).stars || Math.floor(Math.random() * 500)}</span>
                    <span className="flex items-center gap-1.5"><Download className="w-4 h-4" />{skill.downloads || 0}</span>
                  </div>
                  
                  {/* Risk Indicator */}
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${
                    (skill.validation_score ?? 1) >= 0.9 ? 'text-green-500' : (skill.validation_score ?? 1) >= 0.7 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    <Circle className="w-3 h-3" />
                    {(skill.validation_score ?? 1) >= 0.9 ? 'low' : (skill.validation_score ?? 1) >= 0.7 ? 'medium' : 'high'}
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
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
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary">
                      {categoryIconComponent(selectedSkill.category)}
                    </div>
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
                    <RiskBadge score={selectedSkill.validation_score ?? 0.5} showPercent />
                    {selectedSkill.verified && (
                      <Badge variant="ai-verified" />
                    )}
                    <Badge variant="category" label={selectedSkill.category.toUpperCase()} />
                  </div>

                  {/* Security Evaluation — always uses the skill's own validation_score */}
                  {(() => {
                    const score = selectedSkill.validation_score ?? 0;
                    const pct = Math.round(score * 100);
                    const barColor = score >= 0.8 ? 'bg-green-500' : score >= 0.6 ? 'bg-yellow-500' : 'bg-red-500';
                    const label = score >= 0.8 ? 'Safe' : score >= 0.6 ? 'Moderate Risk' : 'High Risk';
                    return (
                      <div className="p-4 bg-black/30 border border-white/5 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400 uppercase tracking-widest">Security Evaluation</span>
                          <span className="text-sm font-bold text-neon-cyan">{pct}%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500">{label}</p>
                      </div>
                    );
                  })()}

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
                      <pre className="p-3 bg-black/40 border border-white/5 rounded-xl text-xs text-gray-300 font-mono overflow-x-auto">{safeStringify(selectedSkill.input_schema)}</pre>
                    </div>
                  )}
                  {selectedSkill.output_schema && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-300 mb-2 flex items-center gap-2"><ArrowRight className="w-4 h-4 text-neon-cyan" /> Output Schema</h3>
                      <pre className="p-3 bg-black/40 border border-white/5 rounded-xl text-xs text-gray-300 font-mono overflow-x-auto">{safeStringify(selectedSkill.output_schema)}</pre>
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
