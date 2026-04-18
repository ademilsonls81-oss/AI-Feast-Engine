import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X, ChevronRight, BookOpen } from "lucide-react";

interface FirstRunBannerProps {
  onDismiss: () => void;
  onNavigateToDocs?: () => void;
}

export default function FirstRunBanner({ onDismiss, onNavigateToDocs }: FirstRunBannerProps) {
  const [visible, setVisible] = useState(true);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden mb-8"
        >
          <div className="p-6 bg-gradient-to-r from-neon-purple/10 to-neon-cyan/10 border border-neon-purple/20 rounded-2xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-neon-purple/20 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-neon-purple" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white mb-1">
                Fa&#231;a sua primeira chamada em 30 segundos &#8594;
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Use seu novo API key para fazer uma chamada &#224; API e veja o engine em a&#231;&#227;o. 
                A documenta&#231;&#227;o tem exemplos prontos em cURL, JavaScript e Python.
              </p>
              <div className="flex items-center gap-3 mt-3">
                {onNavigateToDocs && (
                  <button
                    onClick={onNavigateToDocs}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-neon-purple/20 text-neon-purple border border-neon-purple/30 rounded-lg text-xs font-bold hover:bg-neon-purple/30 transition-all"
                  >
                    <BookOpen className="w-3 h-3" /> Ver documenta&#231;&#227;o
                  </button>
                )}
                <button
                  onClick={handleDismiss}
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  J&#225; fiz minha primeira chamada <X className="w-3 h-3" />
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/5 rounded transition-colors text-gray-500 hover:text-white shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
