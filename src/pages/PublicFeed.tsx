import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { supabase } from "../lib/supabaseClient";
import { Post } from "../types";
import { Globe, Clock, ChevronRight, Search, Filter } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function PublicFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const categories = ["All", "Tech", "Finance", "Science", "Health", "General"];

  useEffect(() => {
    fetchPosts();
    
    // Subscribe to new published posts
    const sub = supabase
      .channel('public-feed')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'posts',
        filter: "status=eq.published"
      }, () => fetchPosts())
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'published')
      .order('pub_date', { ascending: false })
      .limit(30);
    
    setPosts((data as Post[]) || []);
    setLoading(false);
  }

  const filteredPosts = posts.filter(p => {
    const matchesCategory = filter === "All" || p.category === filter;
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                         p.summary?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen pb-20 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-16 pb-12 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-purple/10 border border-neon-purple/20 text-neon-purple text-xs font-bold mb-6">
            <Globe className="w-3 h-3" /> LIVE AI FEED
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-6">
            Global Knowledge, <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-cyan text-glow-purple">Distilled</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Real-time insights from global news sources, summarized and translated by Gemini AI.
          </p>
        </motion.div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 p-2 bg-dark-card border border-white/5 rounded-2xl">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 px-2 w-full md:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filter === cat 
                    ? "bg-neon-purple text-white shadow-lg shadow-neon-purple/20" 
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64 px-2">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search insights..."
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-sm focus:border-neon-purple outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Feed Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2, 4, 5].map(i => <div key={i} className="h-64 bg-white/5 animate-pulse rounded-3xl" />)}
          </div>
        ) : filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredPosts.map((post, idx) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative bg-dark-card border border-white/10 rounded-3xl overflow-hidden hover:border-neon-purple/30 transition-all flex flex-col"
              >
                <div className="p-8 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {post.category}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {new Date(post.pub_date).toLocaleDateString()}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold mb-4 group-hover:text-neon-cyan transition-colors line-clamp-2">
                    {post.title}
                  </h3>

                  <div className="text-gray-400 text-sm leading-relaxed mb-6 flex-1 prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{post.summary || "Processing..."}</ReactMarkdown>
                  </div>

                  <div className="pt-6 border-t border-white/5 mt-auto flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {['en', 'es', 'fr', 'de'].map(lang => (
                        <div key={lang} className="w-6 h-6 rounded-full border-2 border-dark-card bg-black/40 flex items-center justify-center text-[8px] font-bold text-gray-400 uppercase">
                          {lang}
                        </div>
                      ))}
                      <div className="w-6 h-6 rounded-full border-2 border-dark-card bg-neon-purple/20 flex items-center justify-center text-[8px] font-bold text-neon-purple">
                        +7
                      </div>
                    </div>
                    
                    <a 
                      href={post.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-bold text-neon-cyan hover:underline group-hover:gap-3 transition-all"
                    >
                      Read Source <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500">No matching insights found.</div>
        )}
      </div>
    </div>
  );
}
