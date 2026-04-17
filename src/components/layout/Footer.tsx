import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Github, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo + descrição */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">
                AIFeast
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Marketplace of validated AI agents ready to use.
            </p>
          </div>

          {/* Produto */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-white">Product</h4>
            <ul className="space-y-3">
              <li><Link to="/skills" className="text-sm text-muted-foreground hover:text-white transition-colors">Skills</Link></li>
              <li><Link to="/docs" className="text-sm text-muted-foreground hover:text-white transition-colors">Documentation</Link></li>
              <li><Link to="/#pricing" className="text-sm text-muted-foreground hover:text-white transition-colors">Pricing</Link></li>
            </ul>
          </div>

          {/* Recursos */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-white">Resources</h4>
            <ul className="space-y-3">
              <li><Link to="/status" className="text-sm text-muted-foreground hover:text-white transition-colors">Status</Link></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-white transition-colors">Changelog</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-white">Legal</h4>
            <ul className="space-y-3">
              <li><Link to="/privacy" className="text-sm text-muted-foreground hover:text-white transition-colors">Privacy</Link></li>
              <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-white transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 AI Feast Engine. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <Github className="w-5 h-5" />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}