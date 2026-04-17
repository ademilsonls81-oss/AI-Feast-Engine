import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { signInWithGoogle } from "../lib/supabaseClient";
import { motion } from "motion/react";
import { LayoutDashboard, Shield, LogOut, Zap, User, Puzzle, Activity, AlertTriangle, Wrench, Database, ListChecks, Cpu, Factory } from "lucide-react";
import { Button } from "./ui";
import Footer from "./layout/Footer";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const location = useLocation();

  // Navigation Items for the main menu
  const navItems = [
    { name: "Validate", path: "/valide", icon: Zap },
    { name: "Engine", path: "/engine", icon: Factory },
    { name: "Skills", path: "/skills", icon: Puzzle },
    { name: "Status", path: "/status", icon: Activity },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background text-white font-sans selection:bg-neon-purple selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-neon-purple to-neon-cyan rounded-xl flex items-center justify-center shadow-lg shadow-neon-purple/20 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-display font-bold tracking-tight">
              AI<span className="text-neon-cyan gradient-text">Feast</span>
            </span>
          </Link>

          {/* Desktop Nav - Mostra os links principais (Validate, Engine, Skills, Status) */}
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

                {profile?.role === "admin" && (
                  <div className="hidden lg:flex items-center gap-1 px-3 py-2 bg-dark-card/50 border border-white/5 rounded-xl">
                    <Link
                      to="/admin/system"
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        isActive("/admin/system") ? "text-neon-cyan bg-neon-cyan/10" : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      Admin
                    </Link>
                    <Link
                      to="/admin/audit-logs"
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        isActive("/admin/audit-logs") ? "text-neon-cyan bg-neon-cyan/10" : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <ListChecks className="w-3.5 h-3.5" />
                      Audit
                    </Link>
                    <Link
                      to="/admin/system-errors"
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        isActive("/admin/system-errors") ? "text-red-400 bg-red-500/10" : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Errors
                    </Link>
                    <Link
                      to="/admin/auto-fixes"
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        isActive("/admin/auto-fixes") ? "text-green-400 bg-green-500/10" : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      Fixes
                    </Link>
                    <Link
                      to="/admin/backups"
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        isActive("/admin/backups") ? "text-neon-cyan bg-neon-cyan/10" : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Database className="w-3.5 h-3.5" />
                      Backups
                    </Link>
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <Link
                      to="/admin"
                      className={`p-2 rounded-lg transition-all ${
                        isActive("/admin") ? "text-neon-cyan bg-neon-cyan/10" : "text-gray-500 hover:text-gray-300"
                      }`}
                      title="Admin Panel"
                    >
                      <Shield className="w-4 h-4" />
                    </Link>
                  </div>
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
              <Button variant="primary" size="sm" onClick={signInWithGoogle} className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white border-0 gap-2 h-10 px-5 text-sm font-bold shadow-lg shadow-neon-purple/20">
                Começar Grátis
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20 min-h-screen">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-neon-purple/5 blur-[120px] -z-10" />
        {children}
      </main>
      <Footer />
    </div>
  );
}
