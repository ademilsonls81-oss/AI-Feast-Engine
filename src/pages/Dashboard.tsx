import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from 'react-router-dom';
import { Key, Copy, Eye, EyeOff, RefreshCw, Zap, BarChart3, Activity, Clock, CheckCircle, Sparkles, ArrowUpRight, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

const RECENT_SKILLS = [
  { id: '1', name: 'Code Reviewer', category: 'development' },
  { id: '2', name: 'Security Scanner', category: 'security' },
  { id: '3', name: 'Email Composer', category: 'content' },
  { id: '4', name: 'Task Automator', category: 'automation' },
];

export default function Dashboard() {
  const [showApiKey, setShowApiKey] = useState(false);
  const userData = {
    plan: 'free',
    usage_count: 47,
    usage_limit: 100,
    rate_limit: 10,
    api_key: 'YOUR_API_KEY_HERE'
  };

  const usagePercent = (userData.usage_count / userData.usage_limit) * 100;

  const copyApiKey = () => {
    navigator.clipboard.writeText(userData.api_key);
    alert('API Key copiada!');
  };

  const stats = [
    { label: 'Requisições', value: userData.usage_count, icon: Activity, change: '+12%', color: 'text-primary' },
    { label: 'Skills Ativos', value: 4, icon: Zap, change: '+2', color: 'text-accent' },
    { label: 'Uptime', value: '99.9%', icon: CheckCircle, change: 'Estável', color: 'text-chart-3' },
    { label: 'Latência Média', value: '45ms', icon: Clock, change: '-8ms', color: 'text-chart-4' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Gerencie sua conta e monitore o uso</p>
          </div>
          <Badge variant="secondary" className="w-fit bg-primary/10 text-primary border-primary/20">
            <Sparkles className="w-3 h-3 mr-1" />
            Plano {userData.plan.charAt(0).toUpperCase() + userData.plan.slice(1)}
          </Badge>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className="border-border/50 bg-card/50">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <div className={`p-2 rounded-lg bg-secondary ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-chart-3">
                    <TrendingUp className="w-3 h-3" />
                    <span>{stat.change}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-primary" />
                    API Key
                  </CardTitle>
                  <CardDescription>Use esta chave para autenticar suas requisições</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        readOnly
                        value={showApiKey ? userData.api_key : '•'.repeat(36)}
                        className="font-mono text-sm bg-background pr-20"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowApiKey(!showApiKey)}>
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyApiKey}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <Button variant="outline" size="icon">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-accent" />
                    Skills em Uso
                  </CardTitle>
                  <CardDescription>Skills ativos na sua conta</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {RECENT_SKILLS.map((skill) => (
                      <div key={skill.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                        <div>
                          <p className="font-medium">{skill.name}</p>
                          <p className="text-sm text-muted-foreground">{skill.category}</p>
                        </div>
                        <Link to="/skills">
                          <Button variant="ghost" size="icon">
                            <ArrowUpRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-chart-2" />
                    Uso Mensal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Requisições</span>
                      <span className="font-medium">{userData.usage_count} / {userData.usage_limit}</span>
                    </div>
                    <Progress value={usagePercent} className="h-2" />
                  </div>
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Rate Limit</span>
                      <span className="font-medium">{userData.rate_limit} req/min</span>
                    </div>
                  </div>
                  <Link to="/#pricing">
                    <Button className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white border-0 mt-2">
                      Upgrade para Pro
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle>Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link to="/docs">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Zap className="w-4 h-4" />
                      Ver Documentação
                    </Button>
                  </Link>
                  <Link to="/status">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Activity className="w-4 h-4" />
                      Status da API
                    </Button>
                  </Link>
                  <Link to="/skills">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Explorar Skills
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}