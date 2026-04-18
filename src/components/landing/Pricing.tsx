import { motion } from 'framer-motion';
import { Button } from "@/components/ui";
import { Check, Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';
import api from '../../lib/api';
import { getAuthHeaders } from '../../lib/authHeaders';
import { useAuth } from '../../contexts/AuthContext';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    description: 'Get started and explore',
    features: [
      '100 requests/month',
      '10 req/min rate limit',
      'Basic skills',
      '1 API key',
      'Community support'
    ],
    cta: 'Get Started Free',
    popular: false,
    stripe: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/mo',
    description: 'For teams in production',
    features: [
      '10,000 requests/month',
      '100 req/min rate limit',
      'All skills',
      'Unlimited API keys',
      'Advanced analytics',
      'Priority support',
      'Webhooks'
    ],
    cta: 'Upgrade to Pro',
    popular: true,
    stripe: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large-scale operations',
    features: [
      'Unlimited requests',
      'Custom rate limits',
      'Exclusive skills',
      'SSO (SAML/OIDC)',
      'Guaranteed SLA',
      'Dedicated support',
      'White-label'
    ],
    cta: 'Contact Sales',
    popular: false,
    stripe: false,
  }
];

export default function Pricing() {
  const { user } = useAuth();
  const [stripeLoading, setStripeLoading] = useState(false);

  const handleStripeCheckout = async () => {
    if (!user) {
      window.location.href = '/dashboard';
      return;
    }
    setStripeLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await api.post(
        '/api/create-checkout-session',
        { userId: user.id, email: user.email },
        { headers }
      );
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        alert('Unable to start checkout. Please try again.');
      }
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Checkout unavailable. Please try again later.');
    } finally {
      setStripeLoading(false);
    }
  };

  return (
    <section id="pricing" className="py-24 relative">
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-50"
          style={{ background: 'hsl(262 83% 65% / 0.1)' }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold mb-4"
          >
            Plans for every{' '}
            <span className="gradient-text">stage</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground"
          >
            Start free, scale when you need it
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-2xl border p-6 lg:p-8 ${
                plan.popular
                  ? 'border-primary/50 bg-card/60 glow'
                  : 'border-border/50 bg-card/30'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-xs font-medium text-white">
                    <Sparkles className="w-3 h-3" />
                    Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.stripe ? (
                <Button
                  onClick={handleStripeCheckout}
                  disabled={stripeLoading}
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white border-0 gap-2"
                >
                  {stripeLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
                  ) : plan.cta}
                </Button>
              ) : plan.name === 'Enterprise' ? (
                <a href="mailto:sales@aifeastengine.com">
                  <Button variant="outline" className="w-full">{plan.cta}</Button>
                </a>
              ) : (
                <a href="/dashboard">
                  <Button variant="outline" className="w-full">{plan.cta}</Button>
                </a>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
