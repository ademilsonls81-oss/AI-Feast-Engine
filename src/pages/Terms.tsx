import React from "react";
import { motion } from "framer-motion";
import { FileText, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <div className="min-h-screen pt-12 pb-24 px-4">
      <div className="container mx-auto max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-neon-cyan/20 rounded-xl">
              <FileText className="w-6 h-6 text-neon-cyan" />
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold">Terms of Service</h1>
          </div>

          <p className="text-gray-500 text-sm mb-12">Last updated: April 14, 2026</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-bold mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-400 leading-relaxed">
                By accessing or using AI Feast Engine, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use our services. We may modify these terms at any time, and continued use constitutes acceptance of changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">2. Description of Service</h2>
              <p className="text-gray-400 leading-relaxed">
                AI Feast Engine provides AI-processed news aggregation and translation services. We ingest RSS feeds, generate AI summaries, and make the processed data available via our web interface and API. The service is provided "as is" and we make no guarantees about uptime, data accuracy, or availability.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">3. User Accounts</h2>
              <p className="text-gray-400 leading-relaxed">
                You must create an account via Google OAuth to access the API and Dashboard. You are responsible for maintaining the security of your API key. Any activity conducted under your API key is considered your responsibility. You must immediately notify us of any unauthorized use.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">4. Acceptable Use</h2>
              <p className="text-gray-400 leading-relaxed">
                You may not: (a) use the API to build a competing service; (b) exceed your plan's usage limits; (c) attempt to circumvent rate limiting or security measures; (d) use the service for illegal purposes; (e) redistribute raw RSS content without processing. We reserve the right to suspend accounts that violate these terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">5. Subscription and Payments</h2>
              <p className="text-gray-400 leading-relaxed">
                Pro subscriptions are billed monthly through Stripe. You may cancel at any time through the Customer Portal. Refunds are not provided for partial months. We reserve the right to modify pricing with 30 days notice. Unpaid invoices may result in service suspension.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">6. Limitation of Liability</h2>
              <p className="text-gray-400 leading-relaxed">
                AI Feast Engine shall not be liable for any indirect, incidental, special, or consequential damages arising from use of the service. Our total liability shall not exceed the amount you paid in the 12 months preceding the claim. We do not guarantee accuracy of AI-generated content.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">7. Intellectual Property</h2>
              <p className="text-gray-400 leading-relaxed">
                The AI Feast Engine software, design, and branding are our intellectual property. Processed content summaries are provided as a service output and may be used freely by subscribers. Raw RSS content remains the property of original publishers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">8. Termination</h2>
              <p className="text-gray-400 leading-relaxed">
                We may terminate or suspend your account at any time for violations of these terms. You may close your account at any time. Upon termination, your API key will be deactivated and data access will be revoked.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">9. Contact</h2>
              <p className="text-gray-400 leading-relaxed">
                Questions about these Terms should be directed through the support channels available in your Dashboard.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
