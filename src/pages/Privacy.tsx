import React from "react";
import { motion } from "motion/react";
import { Shield, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="min-h-screen pt-12 pb-24 px-4">
      <div className="container mx-auto max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-neon-purple/20 rounded-xl">
              <Shield className="w-6 h-6 text-neon-purple" />
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold">Privacy Policy</h1>
          </div>

          <p className="text-gray-500 text-sm mb-12">Last updated: April 14, 2026</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-bold mb-4">1. Information We Collect</h2>
              <p className="text-gray-400 leading-relaxed">
                When you use AI Feast Engine, we collect information you provide directly to us, including your email address (via Google OAuth authentication) and usage data such as API request counts. We do not collect personal information beyond what is necessary for service operation.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">2. How We Use Your Information</h2>
              <p className="text-gray-400 leading-relaxed">
                We use the collected information to provide, maintain, and improve our services, process your transactions, and communicate with you about updates and features. Your data is never sold to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">3. Data Storage and Security</h2>
              <p className="text-gray-400 leading-relaxed">
                Your data is stored securely using Supabase, a trusted cloud database provider. We implement industry-standard security measures including encryption, access controls, and regular security audits to protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">4. API Data Processing</h2>
              <p className="text-gray-400 leading-relaxed">
                When you use our API, we process RSS feeds and generate AI summaries. The content we process is publicly available information from RSS sources. We do not store personal data from the content we process.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">5. Third-Party Services</h2>
              <p className="text-gray-400 leading-relaxed">
                We use third-party services including Google (authentication), Supabase (database), Stripe (payments), and Groq (AI processing). Each service has its own privacy policy. We only share the minimum data necessary for each service to function.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">6. Your Rights</h2>
              <p className="text-gray-400 leading-relaxed">
                You have the right to access, modify, or delete your personal data at any time through your Dashboard or by contacting us. You may also deactivate or delete your account entirely.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">7. Contact</h2>
              <p className="text-gray-400 leading-relaxed">
                If you have questions about this Privacy Policy, please contact us through the support channels available in your Dashboard.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
