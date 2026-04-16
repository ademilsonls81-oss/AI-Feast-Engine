import React from 'react';
import { Button, Badge, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui";
import { Link } from 'react-router-dom';

export default function Pricing() {
  return (
    <section className="py-24">
      <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto px-4">
        {/* Grátis */}
        <Card className="border-zinc-800 bg-black/50 p-8 rounded-3xl flex flex-col">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-xl">Grátis</CardTitle>
            <p className="text-4xl font-bold mt-2">R$ 0</p>
            <CardDescription>Para testes e projetos pessoais</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-grow space-y-3 text-sm text-muted-foreground">
            <p>✓ 5 skills disponíveis</p>
            <p>✓ 100 requisições/mês</p>
            <p>✓ Suporte da comunidade</p>
            <p>✓ CLI básico</p>
          </CardContent>
          <CardFooter className="p-0 mt-8">
            <Link to="/dashboard">
              <Button variant="outline" className="w-full border-zinc-700 rounded-full">Começar Grátis</Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Pro (Destaque Roxo) */}
        <Card className="border-purple-500 bg-black/50 p-8 rounded-3xl flex flex-col relative shadow-[0_0_30px_rgba(139,92,246,0.2)]">
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600">Mais Popular</Badge>
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-xl">Pro</CardTitle>
            <p className="text-4xl font-bold mt-2">R$ 97 <span className="text-sm text-muted-foreground">/mês</span></p>
            <CardDescription>Para desenvolvedores e equipes</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-grow space-y-3 text-sm text-muted-foreground">
            <p>✓ Todos os skills</p>
            <p>✓ 10.000 requisições/mês</p>
            <p>✓ Suporte prioritário</p>
            <p>✓ API key dedicada</p>
            <p>✓ Webhooks</p>
            <p>✓ Integrações avançadas</p>
          </CardContent>
          <CardFooter className="p-0 mt-8">
            <Link to="/dashboard">
              <Button className="w-full bg-purple-600 hover:bg-purple-700 rounded-full">Assinar Pro</Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Enterprise */}
        <Card className="border-zinc-800 bg-black/50 p-8 rounded-3xl flex flex-col">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-xl">Enterprise</CardTitle>
            <p className="text-4xl font-bold mt-2">Sob consulta</p>
            <CardDescription>Para empresas e scale-ups</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-grow space-y-3 text-sm text-muted-foreground">
            <p>✓ Tudo do Pro</p>
            <p>✓ Requisições ilimitadas</p>
            <p>✓ Suporte 24/7</p>
            <p>✓ SLA garantido</p>
            <p>✓ Onboarding dedicado</p>
            <p>✓ Custom Integrations</p>
          </CardContent>
          <CardFooter className="p-0 mt-8">
            <Button variant="outline" className="w-full border-zinc-700 rounded-full">Falar com Vendas</Button>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}