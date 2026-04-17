import { motion } from 'framer-motion';
import { Button } from "@/components/ui";
import { Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/mês',
    description: 'Para começar a explorar',
    features: [
      '100 requisições/mês',
      '10 req/min rate limit',
      'Skills básicas',
      '1 API key',
      'Community support'
    ],
    cta: 'Conseguir Grátis',
    popular: false
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/mês',
    description: 'Para times em produção',
    features: [
      '10.000 requisições/mês',
      '100 req/min rate limit',
      'Todas as skills',
      'API keys ilimitadas',
      'Analytics avançado',
      'Priority support',
      'Webhooks'
    ],
    cta: 'Upgrade para Pro',
    popular: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Para grandes operações',
    features: [
      'Requisições ilimitadas',
      'Rate limit customizado',
      'Skills exclusivas',
      'SSO (SAML/OIDC)',
      'SLA garantido',
      'Dedicated support',
      'White-label'
    ],
    cta: 'Falar com Vendas',
    popular: false
  }
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 relative">
      {/* Blob central */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-50"
          style={{ background: 'hsl(262 83% 65% / 0.1)' }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold mb-4"
          >
            Planos para cada{' '}
            <span className="gradient-text">estágio</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground"
          >
            Comece grátis, escale quando precisar
          </motion.p>
        </div>

        {/* Cards */}
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
              {/* Badge Popular */}
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
                    <Check className="w-4 h-4 text-chart-3 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link to="/dashboard">
                <Button
                  className={`w-full ${
                    plan.popular
                      ? 'bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white border-0'
                      : ''
                  }`}
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}