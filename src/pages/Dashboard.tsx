import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Progress } from "@/components/ui";
import { Link } from 'react-router-dom';
import {
  Key, Copy, Eye, EyeOff, RefreshCw, Zap, BarChart3, Activity, Clock,
  CheckCircle, Sparkles, ArrowUpRight, TrendingUp, AlertTriangle, Loader2,
  ShieldAlert, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { getAuthHeaders } from '../lib/authHeaders';

const RECENT_SKILLS = [
  { id: '1', name: 'Code Reviewer', category: 'development' },
  { id: '2', name: 'Security Scanner', category: 'security' },
  { id: '3', name: 'Email Composer', category: 'content' },
  { id: '4', name: 'Task Automator', category: 'automation' },
];

export default function Dashboard() {
  const { user, profile, refreshProfile } = useAuth();
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState(true);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [revokingKey, setRevokingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  const usageCount = (profile as any)?.usage_count ?? 47;
  const usageLimit = (profile as any)?.usage_limit ?? 100;
  const rateLimitVal = (profile as any)?.rate_limit ?? 10;
  const plan = profile?.plan ?? 'free';
  const usagePercent = Math.min((usageCount / usageLimit) * 100, 100);

  // Load existing API key
  const fetchApiKey = useCallback(async () => {
    if (!user) { setLoadingKey(false); return; }
    setLoadingKey(true);
    setKeyError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await api.get('/api/user/api-key', { headers });
      setApiKey(res.data?.api_key ?? null);
    } catch (err: any) {
      // 404 means no key yet — not an error
      if (err?.response?.status === 404) {
        setApiKey(null);
      } else {
        setKeyError('Failed to load API key. Try refreshing.');
      }
    } finally {
      setLoadingKey(false);
    }
  }, [user]);

  useEffect(() => { fetchApiKey(); }, [fetchApiKey]);

  // Generate new API key
  const generateApiKey = async () => {
    if (!user) return;
    setGeneratingKey(true);
    setKeyError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await api.post('/api/user/api-key', {}, { headers });
      setApiKey(res.data?.api_key);
      setShowApiKey(true);
      setShowRevokeConfirm(false);
    } catch (err: any) {
      setKeyError(err?.response?.data?.error ?? 'Failed to generate API key.');
    } finally {
      setGeneratingKey(false);
    }
  };

  // Revoke + regenerate
  const revokeAndRegenerate = async () => {
    if (!user) return;
    setRevokingKey(true);
    setKeyError(null);
    try {
      const headers = await getAuthHeaders();
      await api.delete('/api/user/api-key', { headers });
      const res = await api.post('/api/user/api-key', {}, { headers });
      setApiKey(res.data?.api_key);
      setShowApiKey(true);
      setShowRevokeConfirm(false);
    } catch (err: any) {
      setKeyError(err?.response?.data?.error ?? 'Failed to revoke API key.');
    } finally {
      setRevokingKey(false);
    }
  };

  const copyApiKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    });
  };

  // Stripe upgrade
  const handleUpgradeToPro = async () => {
    if (!user) return;
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
        alert('Unable to create checkout session. Please try again.');
      }
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Stripe checkout unavailable. Please try again later.');
    } finally {
      setStripeLoading(false);
    }
  };

  const stats = [
    { label: 'Requests', value: usageCount, icon: Activity, change: '+12%', color: 'text-primary' },
    { label: 'Active Skills', value: 4, icon: Zap, change: '+2', color: 'text-accent' },
    { label: 'Uptime', value: '99.9%', icon: CheckCircle, change: 'Stable', color: 'text-green-400' },
    { label: 'Avg Latency', value: '45ms', icon: Clock, change: '-8ms', color: 'text-yellow-400' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase">
              <Sparkles className="w-3 h-3" />
              {plan} Plan
            </span>
          </div>
        </div>

        {/* Stats */}
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
                  <div className="flex items-center gap-1 mt-3 text-xs text-green-400">
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

            {/* API Key Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-primary" />
                    API Key
                  </CardTitle>
                  <CardDescription>Use this key to authenticate your API requests</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingKey ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading key...
                    </div>
                  ) : apiKey ? (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            readOnly
                            value={showApiKey ? apiKey : '•'.repeat(40)}
                            className="font-mono text-sm bg-background pr-20"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="p-1.5 text-gray-400 hover:text-white transition-colors"
                              title={showApiKey ? 'Hide' : 'Show'}
                            >
                              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={copyApiKey}
                              className="p-1.5 text-gray-400 hover:text-white transition-colors"
                              title="Copy"
                            >
                              {copiedKey ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setShowRevokeConfirm(true)}
                          title="Revoke & Regenerate"
                          disabled={revokingKey}
                          className="shrink-0"
                        >
                          <RefreshCw className={`w-4 h-4 ${revokingKey ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>

                      {/* Revoke confirm */}
                      <AnimatePresence>
                        {showRevokeConfirm && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-bold text-red-400 mb-1">Revoke current key?</p>
                                <p className="text-xs text-gray-400">Your current API key will be permanently invalidated and a new one will be generated. Any active integration using the old key will break immediately.</p>
                                <div className="flex gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    onClick={revokeAndRegenerate}
                                    disabled={revokingKey}
                                    className="bg-red-500 hover:bg-red-600 text-white border-0 text-xs h-8"
                                  >
                                    {revokingKey ? <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Revoking...</> : 'Yes, Revoke & Generate New'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowRevokeConfirm(false)}
                                    className="text-xs h-8"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    /* No key yet — generate */
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        You don't have an API key yet. Generate one to start integrating with AI Feast Engine.
                      </p>
                      <Button
                        onClick={generateApiKey}
                        disabled={generatingKey || !user}
                        className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white border-0 gap-2"
                      >
                        {generatingKey ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                        ) : (
                          <><Key className="w-4 h-4" /> Generate API Key</>
                        )}
                      </Button>
                    </div>
                  )}

                  {keyError && (
                    <div className="flex items-center gap-2 text-sm text-red-400">
                      <AlertTriangle className="w-4 h-4" /> {keyError}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Active Skills */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-accent" />
                    Active Skills
                  </CardTitle>
                  <CardDescription>Skills currently enabled on your account</CardDescription>
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Usage */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-accent" />
                    Monthly Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Requests</span>
                      <span className="font-medium">{usageCount} / {usageLimit}</span>
                    </div>
                    <Progress value={usagePercent} className="h-2" />
                    {usagePercent >= 80 && (
                      <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Approaching limit — consider upgrading
                      </p>
                    )}
                  </div>
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Rate Limit</span>
                      <span className="font-medium">{rateLimitVal} req/min</span>
                    </div>
                  </div>

                  {plan === 'free' && (
                    <Button
                      onClick={handleUpgradeToPro}
                      disabled={stripeLoading}
                      className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white border-0 mt-2 gap-2"
                    >
                      {stripeLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Connecting to Stripe...</>
                      ) : (
                        <><ExternalLink className="w-4 h-4" /> Upgrade to Pro — $29/mo</>
                      )}
                    </Button>
                  )}
                  {plan !== 'free' && (
                    <div className="text-xs text-green-400 flex items-center gap-1 pt-2">
                      <CheckCircle className="w-3 h-3" /> Pro plan active
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Actions */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link to="/docs">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Zap className="w-4 h-4" /> View Documentation
                    </Button>
                  </Link>
                  <Link to="/status">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Activity className="w-4 h-4" /> API Status
                    </Button>
                  </Link>
                  <Link to="/skills">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <BarChart3 className="w-4 h-4" /> Explore Skills
                    </Button>
                  </Link>
                  <Link to="/valide">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <CheckCircle className="w-4 h-4" /> Validate an Agent
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