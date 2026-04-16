import React from 'react';
import { Button } from "@/components/ui";
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const plans = [
  {
    name: 'Grátis',
    price: 'R$ 0',
    description: 'Para testes e projetos pessoais',
    features: [
      '5 skills disponíveis',
      '100 requisições/mês',
      'Suporte da comunidade',
      'CLI básico'
    ],
    cta: 'Começar Grátis',
    variant: 'secondary'
  },
  {
    name: 'Pro',
    price: 'R$ 97',
    period: '/mês',
    description: 'Para desenvolvedores e equipes',
    features: [
      'Todos os skills',
      '10.000 requisições/mês',
      'Suporte prioritário',
      'API key dedicada',
      'Webhooks',
      'Integrações avançadas'
    ],
    cta: 'Assinar Pro',
    popular: true,
    variant: 'primary'
  },
  {
    name: 'Enterprise',
    price: 'Sob consulta',
    description: 'Para empresas e scale-ups',
    features: [
      'Tudo do Pro',
      'Requisições ilimitadas',
      'Suporte 24/7',
      'SLA garantido',
      'Onboarding dedicado',
      'Custom integrations'
    ],
    cta: 'Falar com Vendas',
    variant: 'secondary'
  }
];

export default function Pricing() {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Planos<span className="gradient-text"> flexíveis</span> para cada necessidade
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comece gratis, escale quando precisar. Sem burocracias.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative p-8 rounded-xl border ${
                plan.popular 
                  ? 'border-primary bg-card' 
                  : 'border-border/50 bg-card'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                  Mais Popular
                </div>
              )}
              <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold">{plan.price}</span>
                {plan.period && (
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                )}
              </div>
              <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>
              
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Link to="/dashboard">
                <Button variant={plan.variant as any} className="w-full">
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}