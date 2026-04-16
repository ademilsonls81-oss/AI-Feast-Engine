import React from 'react';
import { Shield, Zap, CheckCircle, Bot, Search, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Validação Automática',
    description: 'Cada skill passa por análise de segurança com IA antes de ser publicado.'
  },
  {
    icon: Zap,
    title: 'Integração Rápida',
    description: 'Instale qualquer skill em segundos com nosso CLI ou API REST.'
  },
  {
    icon: Bot,
    title: 'Agentes Especializados',
    description: 'Code review, QA, automação de testes e muito mais.'
  },
  {
    icon: Search,
    title: 'Busca Inteligente',
    description: 'Encontre skills por categoria, tecnologia ou caso de uso.'
  },
  {
    icon: CheckCircle,
    title: 'Qualidade Garantida',
    description: 'Avaliações da comunidade e métricas de uso verificadas.'
  },
  {
    icon: BarChart3,
    title: 'Monitoramento',
    description: 'Acompanhe uso, performance e custos em tempo real.'
  }
];

export default function Features() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Tudo que você precisa para<span className="gradient-text"> IA Production-Ready</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Marketplace completo com skills validados, integração instantânea e monitoramento avançado.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-xl border border-border/50 bg-card hover:border-primary/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}