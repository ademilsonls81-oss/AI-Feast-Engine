/**
 * NotFound — Página 404
 * 
 * Exibida quando o usuário acessa uma rota inexistente.
 */

import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, SearchX, ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-dark-card border border-white/10 mb-6">
            <SearchX className="w-16 h-16 text-neon-cyan" />
          </div>
          <h1 className="text-6xl font-display font-bold text-white mb-4">
            404
          </h1>
          <h2 className="text-2xl font-bold text-gray-200 mb-3">
            Página Não Encontrada
          </h2>
          <p className="text-gray-400 mb-8">
            Ops! Parece que você se perdeu no espaço digital. A página que você procura não existe ou foi movida.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl font-bold shadow-lg shadow-neon-purple/20 hover:scale-105 transition-all group"
        >
          <Home className="w-5 h-5" />
          Voltar ao Início
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </motion.div>
    </div>
  );
}
