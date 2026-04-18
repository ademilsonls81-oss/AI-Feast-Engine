import React from "react";
import { motion } from "framer-motion";
import { Copy, Terminal, Globe, Key, AlertCircle, CheckCircle2, ChevronRight, Database, Search, BarChart3, Puzzle, Check } from "lucide-react";
import { cn } from "../lib/utils";
import { Badge, Card } from "../components/ui";

const DOCS_ENABLED = true;

export default function Docs() {
  if (!DOCS_ENABLED) return <div className="text-center py-20">API Documentation is temporarily disabled.</div>;

  const [copiedText, setCopiedText] = React.useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const BASE_URL = "https://api.aifeastengine.com/api";

  return (
    <div className="min-h-screen pt-12 pb-24 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <span className="text-neon-cyan text-xs font-bold uppercase tracking-widest mb-4 block">Developer Center</span>
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-6">API <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-cyan">Documentation</span></h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Integrate AI-processed data directly into your LLMs, bots, and crawlers with our high-performance REST API.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Sidebar Navigation */}
          <div className="hidden lg:block space-y-4 sticky top-24 h-fit">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Getting Started</h4>
            <a href="#base-url" className="block text-sm text-gray-400 hover:text-white transition-colors">Base URL</a>
            <a href="#authentication" className="block text-sm text-gray-400 hover:text-white transition-colors">Authentication</a>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-8 mb-4">Endpoints</h4>
            <a href="#feed" className="block text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"><Globe className="w-3 h-3" /> GET /feed</a>
            <a href="#stats" className="block text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"><BarChart3 className="w-3 h-3" /> GET /stats</a>
            <a href="#skills" className="block text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"><Puzzle className="w-3 h-3" /> GET /skills</a>
            <a href="#search" className="block text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"><Search className="w-3 h-3" /> GET /search</a>
            <a href="#verified" className="block text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"><CheckCircle2 className="w-3 h-3" /> GET /verified</a>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-8 mb-4">Reference</h4>
            <a href="#examples" className="block text-sm text-gray-400 hover:text-white transition-colors">Code Examples</a>
            <a href="#errors" className="block text-sm text-gray-400 hover:text-white transition-colors">Error Codes</a>
          </div>

          {/* Content */}
          <div className="lg:col-span-3 space-y-16">

            {/* Base URL */}
            <section id="base-url" className="p-6 bg-dark-card border border-white/10 rounded-2xl">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Base API URL</h3>
              <div className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5 group">
                <code className="text-neon-cyan font-mono text-sm break-all">{BASE_URL}</code>
                <button onClick={() => copyToClipboard(BASE_URL)} className="p-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  {copiedText === BASE_URL ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-500 hover:text-white" />
                  )}
                </button>
              </div>
            </section>

            {/* Authentication */}
            <section id="authentication" className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-neon-purple/20 rounded-lg">
                  <Key className="w-5 h-5 text-neon-purple" />
                </div>
                <h2 className="text-2xl font-bold">Authentication</h2>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                All requests to the AI Feast Engine API must include an API Key in the request header.
                You can generate your key in the <a href="/dashboard" className="text-neon-purple hover:underline">Dashboard</a>.
              </p>
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-4">
                <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
                <p className="text-xs text-yellow-500/80 italic">
                  Keep your API Key secret. If compromised, rotate it immediately from your account settings.
                </p>
              </div>
              <div className="bg-black/60 rounded-xl p-4 font-mono text-xs overflow-x-auto border border-white/5">
                <span className="text-gray-500"># Header example</span><br />
                <span className="text-neon-purple">X-API-Key</span>: <span className="text-neon-cyan">your_api_key_here</span>
              </div>
            </section>

            {/* Feed Endpoint */}
            <section id="feed" className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-neon-cyan/20 rounded-lg">
                  <Globe className="w-5 h-5 text-neon-cyan" />
                </div>
                <h2 className="text-2xl font-bold">Feed Endpoint</h2>
              </div>

              <div className="flex items-center gap-4">
                <Badge variant="http-get" />
                <code className="text-sm font-mono text-gray-300">/feed</code>
              </div>

              <p className="text-gray-400 text-sm">
                Returns a list of the latest AI-processed news items, including summaries and translations. Supports pagination, language filtering, and category filtering.
              </p>

              <div className="overflow-x-auto">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Query Parameters</h4>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-500">
                      <th className="pb-4 font-medium uppercase text-[10px] tracking-widest">Parameter</th>
                      <th className="pb-4 font-medium uppercase text-[10px] tracking-widest">Type</th>
                      <th className="pb-4 font-medium uppercase text-[10px] tracking-widest">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    <tr className="border-b border-white/10">
                      <td className="py-4 font-mono text-neon-purple">lang</td>
                      <td className="py-4 text-xs text-gray-500 italic">string</td>
                      <td className="py-4"> Language code: pt, en, es, fr, de, it, ja, ko, zh, ru, ar. Default: pt</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-4 font-mono text-neon-purple">limit</td>
                      <td className="py-4 text-xs text-gray-500 italic">number</td>
                      <td className="py-4">Max items to return (1-50). Default: 20</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-4 font-mono text-neon-purple">page</td>
                      <td className="py-4 text-xs text-gray-500 italic">number</td>
                      <td className="py-4">Page number for pagination. Default: 1</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-4 font-mono text-neon-purple">category</td>
                      <td className="py-4 text-xs text-gray-500 italic">string</td>
                      <td className="py-4">Filter by category: tech, finance, health, science, general</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-4 font-mono text-neon-purple">since</td>
                      <td className="py-4 text-xs text-gray-500 italic">timestamp</td>
                      <td className="py-4">Filter posts created after this date (ISO format)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-black/40 rounded-xl p-4 font-mono text-xs overflow-x-auto border border-white/5">
                <span className="text-gray-500"># Response</span><br />
                <span className="text-gray-500">{`{`}</span><br />
                <span className="text-neon-purple">  "posts"</span>: [<span className="text-gray-500">{`{ id, title, link, summary, translations, category, created_at }`}</span>],<br />
                <span className="text-neon-purple">  "total"</span>: <span className="text-neon-cyan">259</span>,<br />
                <span className="text-neon-purple">  "page"</span>: <span className="text-neon-cyan">1</span>,<br />
                <span className="text-neon-purple">  "per_page"</span>: <span className="text-neon-cyan">20</span><br />
                <span className="text-gray-500">{`}`}</span>
              </div>
            </section>

            {/* Stats Endpoint */}
            <section id="stats" className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-neon-purple/20 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-neon-purple" />
                </div>
                <h2 className="text-2xl font-bold">Stats Endpoint</h2>
              </div>

              <div className="flex items-center gap-4">
                <Badge variant="http-get" />
                <code className="text-sm font-mono text-gray-300">/stats</code>
              </div>

              <p className="text-gray-400 text-sm">
                Returns system-wide statistics. No authentication required. Cached for 5 minutes.
              </p>

              <div className="bg-black/40 rounded-xl p-4 font-mono text-xs overflow-x-auto border border-white/5">
                <span className="text-gray-500"># GET {BASE_URL}/stats</span><br /><br />
                <span className="text-gray-500">{`{`}</span><br />
                <span className="text-neon-purple">  "postsCount"</span>: <span className="text-neon-cyan">259</span>,<br />
                <span className="text-neon-purple">  "feedsCount"</span>: <span className="text-neon-cyan">5</span>,<br />
                <span className="text-neon-purple">  "languages"</span>: <span className="text-neon-cyan">11</span><br />
                <span className="text-gray-500">{`}`}</span>
              </div>
            </section>

            {/* Skills Endpoint */}
            <section id="skills" className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-neon-cyan/20 rounded-lg">
                  <Puzzle className="w-5 h-5 text-neon-cyan" />
                </div>
                <h2 className="text-2xl font-bold">Skills Endpoint</h2>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <Badge variant="http-get" />
                <code className="text-sm font-mono text-gray-300">/skills</code>
              </div>

              <p className="text-gray-400 text-sm">
                Returns a list of community-built skills. No authentication required. Supports filtering by source and verified status.
              </p>

              <div className="overflow-x-auto">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Query Parameters</h4>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-500">
                      <th className="pb-4 font-medium uppercase text-[10px] tracking-widest">Parameter</th>
                      <th className="pb-4 font-medium uppercase text-[10px] tracking-widest">Type</th>
                      <th className="pb-4 font-medium uppercase text-[10px] tracking-widest">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    <tr className="border-b border-white/5">
                      <td className="py-4 font-mono text-neon-purple">source</td>
                      <td className="py-4 text-xs text-gray-500 italic">string</td>
                      <td className="py-4">Filter by source: anthropic, cline</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-4 font-mono text-neon-purple">verified</td>
                      <td className="py-4 text-xs text-gray-500 italic">boolean</td>
                      <td className="py-4">Filter verified skills only: true, false</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-black/40 rounded-xl p-4 font-mono text-xs overflow-x-auto border border-white/5">
                <span className="text-gray-500"># Response</span><br />
                <span className="text-gray-500">{`{`}</span><br />
                <span className="text-neon-purple">  "skills"</span>: [<span className="text-gray-500">{`{ id, name, slug, description, category, downloads, verified }`}</span>],<br />
                <span className="text-neon-purple">  "total"</span>: <span className="text-neon-cyan">42</span>,<br />
                <span className="text-neon-purple">  "categories"</span>: [<span className="text-neon-cyan">"development", "content", "automation"</span>]<br />
                <span className="text-gray-500">{`}`}</span>
              </div>
            </section>

            {/* Search Endpoint */}
            <section id="search" className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-neon-purple/20 rounded-lg">
                  <Search className="w-5 h-5 text-neon-purple" />
                </div>
                <h2 className="text-2xl font-bold">Search Endpoint</h2>
              </div>

              <div className="flex items-center gap-4">
                <Badge variant="http-get" />
                <code className="text-sm font-mono text-gray-300">/search</code>
              </div>

              <p className="text-gray-400 text-sm">
                Search across skills and posts. Supports full-text search by query string and category filter.
              </p>

              <div className="overflow-x-auto">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Query Parameters</h4>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-500">
                      <th className="pb-4 font-medium uppercase text-[10px] tracking-widest">Parameter</th>
                      <th className="pb-4 font-medium uppercase text-[10px] tracking-widest">Type</th>
                      <th className="pb-4 font-medium uppercase text-[10px] tracking-widest">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    <tr className="border-b border-white/5">
                      <td className="py-4 font-mono text-neon-purple">q</td>
                      <td className="py-4 text-xs text-gray-500 italic">string</td>
                      <td className="py-4">Search query (required)</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-4 font-mono text-neon-purple">category</td>
                      <td className="py-4 text-xs text-gray-500 italic">string</td>
                      <td className="py-4">Filter by category</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-black/40 rounded-xl p-4 font-mono text-xs overflow-x-auto border border-white/5">
                <span className="text-gray-500"># GET {BASE_URL}/search?q=security&category=development</span><br /><br />
                <span className="text-gray-500">{`{`}</span><br />
                <span className="text-neon-purple">  "query"</span>: <span className="text-neon-cyan">"security"</span>,<br />
                <span className="text-neon-purple">  "skills"</span>: [<span className="text-gray-500">{`...`}</span>],<br />
                <span className="text-neon-purple">  "total"</span>: <span className="text-neon-cyan">5</span><br />
                <span className="text-gray-500">{`}`}</span>
              </div>
            </section>

            {/* Verified Endpoint */}
            <section id="verified" className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-neon-cyan/20 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-neon-cyan" />
                </div>
                <h2 className="text-2xl font-bold">Verified Skills Score</h2>
              </div>

              <div className="flex items-center gap-4">
                <Badge variant="http-get" />
                <code className="text-sm font-mono text-gray-300">/verified</code>
              </div>

              <p className="text-gray-400 text-sm">
                Returns overall verified skills statistics. No authentication required.
              </p>

              <div className="bg-black/40 rounded-xl p-4 font-mono text-xs overflow-x-auto border border-white/5">
                <span className="text-gray-500"># GET {BASE_URL}/verified</span><br /><br />
                <span className="text-gray-500">{`{`}</span><br />
                <span className="text-neon-purple">  "verified_count"</span>: <span className="text-neon-cyan">12</span>,<br />
                <span className="text-neon-purple">  "total_count"</span>: <span className="text-neon-cyan">42</span>,<br />
                <span className="text-neon-purple">  "avg_score"</span>: <span className="text-neon-cyan">0.95</span><br />
                <span className="text-gray-500">{`}`}</span>
              </div>
            </section>

            {/* Examples */}
            <section id="examples" className="space-y-6">
              <h2 className="text-2xl font-bold">Code Examples</h2>

              <div className="space-y-4">
                <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
                  <div className="bg-white/5 px-4 py-2 flex items-center justify-between border-b border-white/5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">cURL</span>
                    <button onClick={() => copyToClipboard(`curl -H 'X-API-Key: YOUR_KEY' ${BASE_URL}/feed?lang=en`)} className="text-xs text-neon-cyan hover:underline">Copy</button>
                  </div>
                  <pre className="p-6 text-xs font-mono text-gray-300 overflow-x-auto bg-black/20">
                    {`curl -X GET "${BASE_URL}/feed?lang=en" \\\n  -H "X-API-Key: YOUR_API_KEY"`}
                  </pre>
                </div>

                <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
                  <div className="bg-white/5 px-4 py-2 flex items-center justify-between border-b border-white/5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">JavaScript (Fetch)</span>
                    <button onClick={() => copyToClipboard(`fetch('${BASE_URL}/feed?lang=pt', { headers: { 'X-API-Key': 'KEY' } })`)} className="text-xs text-neon-cyan hover:underline">Copy</button>
                  </div>
                  <pre className="p-6 text-xs font-mono text-gray-300 overflow-x-auto bg-black/20">
                    {`const response = await fetch('${BASE_URL}/feed?lang=pt', {
  headers: {
    'X-API-Key': 'YOUR_API_KEY'
  }
});
const data = await response.json();
console.log(data.posts);`}
                  </pre>
                </div>

                <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
                  <div className="bg-white/5 px-4 py-2 flex items-center justify-between border-b border-white/5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Python</span>
                    <button onClick={() => copyToClipboard(`requests.get('${BASE_URL}/feed', headers={'X-API-Key': 'KEY'}, params={'lang': 'en'})`)} className="text-xs text-neon-cyan hover:underline">Copy</button>
                  </div>
                  <pre className="p-6 text-xs font-mono text-gray-300 overflow-x-auto bg-black/20">
                    {`import requests

url = "${BASE_URL}/feed"
headers = {"X-API-Key": "YOUR_API_KEY"}
params = {"lang": "en", "limit": 10}

response = requests.get(url, headers=headers, params=params)
print(response.json())`}
                  </pre>
                </div>
              </div>
            </section>

            {/* Error Codes */}
            <section id="errors" className="space-y-6">
              <h2 className="text-2xl font-bold">Error Codes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { code: "401 Unauthorized", desc: "API Key is missing or invalid. Include X-API-Key header." },
                  { code: "402 Payment Required", desc: "Usage limit reached for the current plan. Upgrade to Pro." },
                  { code: "429 Too Many Requests", desc: "Rate limit exceeded. Please slow down. Retry after delay." },
                  { code: "500 Internal Error", desc: "Something went wrong on our end. Check " }, { code: "500 Internal Error", desc: "Something went wrong. GET /api/health to check status." },
                ].map((e, index) => (
                  <div key={index} className="p-4 bg-dark-card border border-white/10 rounded-xl">
                    <div className="text-red-400 font-bold text-sm mb-1">{e.code}</div>
                    <div className="text-gray-400 text-xs">{e.desc}</div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
