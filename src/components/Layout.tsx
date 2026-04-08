import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { signInWithGoogle } from "../lib/supabaseClient";
import { motion } from "motion/react";
import { LayoutDashboard, BookOpen, Shield, LogOut, Globe, Zap, User } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: "Live Feed", path: "/feed", icon: Globe },
    { name: "Docs", path: "/docs", icon: BookOpen },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-neon-purple selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-neon-purple to-neon-cyan rounded-xl flex items-center justify-center shadow-lg shadow-neon-purple/20 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-display font-bold tracking-tight">
              AI FEAST <span className="text-neon-cyan">ENGINE</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 text-sm font-bold transition-all hover:text-white ${
                  isActive(item.path) ? "text-neon-cyan" : "text-gray-400"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-4">
                <Link 
                  to="/dashboard"
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    isActive("/dashboard") 
                      ? "bg-neon-purple text-white shadow-lg shadow-neon-purple/20" 
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Dashboard
                </Link>

                {profile?.role === 'admin' && (
                  <Link 
                    to="/admin"
                    className={`p-2 rounded-full transition-all ${
                      isActive("/admin") ? "text-neon-cyan bg-neon-cyan/10" : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <Shield className="w-5 h-5" />
                  </Link>
                )}

                <div className="h-6 w-px bg-white/10" />

                <div className="flex items-center gap-3 px-2">
                  <div className="w-8 h-8 rounded-full bg-neon-purple/20 border border-neon-purple/20 flex items-center justify-center overflow-hidden">
                    {user.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="Profile" />
                    ) : (
                      <User className="w-4 h-4 text-neon-purple" />
                    )}
                  </div>
                  <button 
                    onClick={signOut}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="px-6 py-2.5 bg-white text-black text-xs font-bold rounded-full hover:bg-gray-200 transition-all active:scale-95"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20 min-h-screen">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-neon-purple/5 blur-[120px] -z-10" />
        {children}
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-black">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-gray-500 text-xs">
            © 2026 AI Feast Engine. All systems operational.
          </div>
          <div className="flex items-center gap-8">
            <a href="#" className="text-gray-500 hover:text-white transition-all text-xs">Privacy</a>
            <a href="#" className="text-gray-500 hover:text-white transition-all text-xs">Terms</a>
            <a href="#" className="text-gray-500 hover:text-white transition-all text-xs">API Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
