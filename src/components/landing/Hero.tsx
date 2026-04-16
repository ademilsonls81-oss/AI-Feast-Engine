import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Badge, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui";
import { ArrowRight, Zap } from 'lucide-react';

export default function Hero() {
  return (
    <section className="flex flex-col items-center text-center mt-20 mb-16 px-4">
      <Badge variant="outline" className="border-purple-500/50 text-purple-400 gap-2 mb-6">
        <Zap className="w-3 h-3" /> Marketplace de Skills IA
      </Badge>
      
      <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto mb-6">
        Agentes IA validados <br /> prontos para integrar
      </h1>
      
      <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-10">
        Descubra, valide e integre skills de IA em minutos. Pipeline automatizado com verificação de segurança.
      </p>

      <div className="flex items-center gap-4">
        <Button className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 rounded-full font-semibold gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
          Explorar Skills <ArrowRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" className="border-zinc-700 bg-transparent hover:bg-zinc-900 px-8 py-6 rounded-full font-semibold">
          Ver Documentação
        </Button>
      </div>
    </section>
  );
}