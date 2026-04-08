import React from "react";
import { motion } from "motion/react";
import { Copy, Terminal, Globe, Key, AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";

const DOCS_ENABLED = true;

export default function Docs() {
  if (!DOCS_ENABLED) return <div className="text-center py-20">API Documentation is temporarily disabled.</div>;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

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
          {/* Sidebar Navigation (Visual) */}
          <div className="hidden lg:block space-y-4 sticky top-24 h-fit">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Getting Started</h4>
            <a href="#authentication" className="block text-sm text-neon-purple font-medium">Authentication</a>
            <a href="#endpoints" className="block text-sm text-gray-400 hover:text-white transition-colors">Endpoints</a>
            <a href="#parameters" className="block text-sm text-gray-400 hover:text-white transition-colors">Parameters</a>
            <a href="#examples" className="block text-sm text-gray-400 hover:text-white transition-colors">Code Examples</a>
            <a href="#errors" className="block text-sm text-gray-400 hover:text-white transition-colors">Error Codes</a>
          </div>

          {/* Content */}
          <div className="lg:col-span-3 space-y-16">
            
            {/* Base URL */}
            <section id="base-url" className="p-6 bg-dark-card border border-white/10 rounded-2xl">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Base API URL</h3>
              <div className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5 group">
                <code className="text-neon-cyan font-mono text-sm break-all">https://ai-feast-engine.app/api</code>
                <button onClick={() => copyToClipboard("https://ai-feast-engine.app/api")} className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Copy className="w-4 h-4 text-gray-500 hover:text-white" />
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

            {/* Endpoints */}
            <section id="endpoints" className="space-y-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-neon-cyan/20 rounded-lg">
                  <Terminal className="w-5 h-5 text-neon-cyan" />
                </div>
                <h2 className="text-2xl font-bold">Feed Endpoint</h2>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold rounded uppercase">GET</span>
                  <code className="text-sm font-mono text-gray-300">/feed</code>
                </div>
                
                <p className="text-gray-400 text-sm">
                  Returns a list of the latest AI-processed news items, including summaries and translations.
                </p>

                <div className="overflow-x-auto">
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
                        <td className="py-4 font-mono text-neon-purple">key</td>
                        <td className="py-4 text-xs text-gray-500 italic">string</td>
                        <td className="py-4">Your API Key (Required if not in header)</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-4 font-mono text-neon-purple">lang</td>
                        <td className="py-4 text-xs text-gray-500 italic">string</td>
                        <td className="py-4">Language code (pt, en, es, fr, de, it, ja, ko, zh, ru, ar)</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-4 font-mono text-neon-purple">limit</td>
                        <td className="py-4 text-xs text-gray-500 italic">number</td>
                        <td className="py-4">Max items to return (1-50). Default: 20</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-4 font-mono text-neon-purple">since</td>
                        <td className="py-4 text-xs text-gray-500 italic">timestamp</td>
                        <td className="py-4">Filter posts created after this date (ISO format)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Examples */}
            <section id="examples" className="space-y-6">
              <h2 className="text-2xl font-bold">Code Examples</h2>
              
              <div className="space-y-4">
                <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
                  <div className="bg-white/5 px-4 py-2 flex items-center justify-between border-b border-white/5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">cURL</span>
                    <button onClick={() => copyToClipboard("curl -H 'X-API-Key: YOUR_KEY' https://ai-feast-engine.app/api/feed?lang=en")} className="text-xs text-neon-cyan hover:underline">Copy</button>
                  </div>
                  <pre className="p-6 text-xs font-mono text-gray-300 overflow-x-auto bg-black/20">
                    {`curl -X GET "https://ai-feast-engine.app/api/feed?lang=en" \\
  -H "X-API-Key: YOUR_API_KEY"`}
                  </pre>
                </div>

                <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
                  <div className="bg-white/5 px-4 py-2 flex items-center justify-between border-b border-white/5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">JavaScript (Fetch)</span>
                  </div>
                  <pre className="p-6 text-xs font-mono text-gray-300 overflow-x-auto bg-black/20">
                    {`const response = await fetch('https://ai-feast-engine.app/api/feed?lang=pt', {
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
                  </div>
                  <pre className="p-6 text-xs font-mono text-gray-300 overflow-x-auto bg-black/20">
                    {`import requests

url = "https://ai-feast-engine.app/api/feed"
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
                  { code: "401 Unauthorized", desc: "API Key is missing or invalid." },
                  { code: "402 Payment Required", desc: "Usage limit reached for the current plan." },
                  { code: "429 Too Many Requests", desc: "Rate limit exceeded. Please slow down." },
                  { code: "500 Internal Error", desc: "Something went wrong on our end." },
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
