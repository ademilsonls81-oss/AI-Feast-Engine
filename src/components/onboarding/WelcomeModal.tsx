import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, Zap, Key, Terminal, Check, ArrowRight, ArrowLeft, Copy } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import api from "../../lib/api";

interface WelcomeModalProps {
  onComplete: () => void;
}

const steps = [
  {
    title: "Welcome to AI Feast Engine",
    icon: Zap,
    description: "Your AI-powered data pipeline is ready. Ingest, summarize, and translate content from 50+ RSS feeds into 11 languages.",
    actionLabel: "Get Started",
  },
  {
    title: "Generate Your API Key",
    icon: Key,
    description: "You need an API key to access the engine. We'll generate one for you right now.",
    actionLabel: "Generate API Key",
    isAction: true,
  },
  {
    title: "Configure the CLI",
    icon: Terminal,
    description: "Use our CLI to interact with skills from your terminal. Copy the command below with your new API key.",
    actionLabel: "I'm Done",
    isFinal: true,
  },
];

export default function WelcomeModal({ onComplete }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const step = steps[currentStep];
  const Icon = step.icon;
  const totalSteps = steps.length;

  const handleNext = async () => {
    if (currentStep === 1 && !apiKey) {
      // Generate API key
      setIsGenerating(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) {
          alert("Session expired. Please login again.");
          return;
        }

        const res = await api.post("/api/user/rotate-key", {}, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.api_key) {
          setApiKey(res.data.api_key);
        }
      } catch (err: any) {
        alert("Failed to generate API key: " + (err.response?.data?.error || err.message));
        return;
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    if (currentStep === totalSteps - 1) {
      // Mark onboarding as done
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (token) {
          await supabase
            .from("users")
            .update({ onboarding_done: true })
            .eq("id", sessionData.session.user.id);
        }
      } catch (err) {
        console.error("Failed to mark onboarding done:", err);
      }
      onComplete();
      return;
    }

    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const copyCommand = () => {
    if (apiKey) {
      navigator.clipboard.writeText(`npx aifeast config --key ${apiKey}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-dark-card border border-white/10 rounded-3xl max-w-lg w-full overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={() => {
              // Still mark as done if user closes
              onComplete();
            }}
            className="absolute top-4 right-4 z-10 p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress bar */}
          <div className="h-1 bg-white/5">
            <div
              className="h-full bg-neon-purple transition-all duration-500"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>

          <div className="p-8">
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center mb-6">
              <Icon className="w-8 h-8 text-neon-purple" />
            </div>

            {/* Step title + description */}
            <h2 className="text-2xl font-display font-bold mb-3">{step.title}</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">{step.description}</p>

            {/* Step 2: API Key display */}
            {currentStep === 1 && apiKey && (
              <div className="p-4 bg-black/40 border border-white/5 rounded-xl mb-6">
                <div className="flex items-center justify-between">
                  <code className="text-neon-cyan font-mono text-sm break-all">{apiKey}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(apiKey)}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors ml-2 shrink-0"
                  >
                    <Copy className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-2">Save this key somewhere safe — you won't see it again!</p>
              </div>
            )}

            {/* Step 3: CLI snippet */}
            {currentStep === 2 && (
              <div className="p-4 bg-black/40 border border-neon-cyan/20 rounded-xl mb-6">
                <div className="flex items-center justify-between">
                  <code className="text-neon-cyan font-mono text-sm">
                    npx aifeast config --key {apiKey ? apiKey.substring(0, 12) + "..." : "af_xxxxx"}
                  </code>
                  {apiKey && (
                    <button
                      onClick={copyCommand}
                      className="p-2 hover:bg-white/5 rounded-lg transition-colors ml-2 shrink-0"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  )}
                </div>
                {!apiKey && (
                  <p className="text-[10px] text-yellow-500 mt-2">Go back and generate your API key first!</p>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              {currentStep > 0 ? (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={handleNext}
                disabled={isGenerating}
                className="flex items-center gap-2 px-6 py-3 bg-neon-purple text-white rounded-full font-bold neon-glow-purple hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    {step.actionLabel}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
