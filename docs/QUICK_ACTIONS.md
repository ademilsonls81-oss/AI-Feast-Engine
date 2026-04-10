# 🎯 GUIA RÁPIDO - AÇÕES MANUAIS NECESSÁRIAS
**Data**: 10/04/2026  
**Tempo estimado**: 20 minutos

---

## 🟢 1. RENDER - Custom Domain (5 min)

### Passo a Passo:
```
1. Acesse: https://dashboard.render.com
2. Login com Google/GitHub
3. Clique em: ai-feast-engine (seu serviço)
4. No menu lateral: Settings
5. Role até: Custom Domains
6. Clique: "Add Custom Domain"
7. Digite: api.aifeastengine.com
8. Clique: "Add Domain"
9. Aguarde: Render vai verificar DNS (já está configurado!)
10. Status final: "Active" com ✅ verde
```

### Validação:
```bash
# Após 2-5 minutos, teste:
curl https://api.aifeastengine.com/api/health

# Deve retornar:
{"status":"alive"}
```

### Se der erro:
- Verifique se o SSL foi provisionado (cadeado verde no dashboard)
- Clique em "Re-issue Certificate" se necessário
- Aguarde até 10 minutos

---

## 🟢 2. VERCEL - Custom Domains (5 min)

### Passo a Passo:
```
1. Acesse: https://vercel.com
2. Clique no projeto: ai-feast-engine
3. Clique em: Settings (engrenagem)
4. Menu lateral: Domains
5. Em "Add Domain", digite: aifeastengine.com
6. Clique: Add
7. Repita para: www.aifeastengine.com
8. Vercel vai verificar DNS automaticamente
9. Status: "Valid Configuration" com ✅ verde
```

### Na Hostinger (se necessário):
```
Se Vercel pedir configuração DNS:

1. Acesse: https://hostinger.com.br
2. DNS Zone Editor
3. Adicione:
   - Tipo: A
   - Nome: @
   - Valor: 76.76.21.21
   - TTL: 3600

   - Tipo: CNAME
   - Nome: www
   - Valor: cname.vercel-dns.com
   - TTL: 3600
```

### Validação:
```
Acesse no navegador:
https://www.aifeastengine.com

Deve carregar a Landing Page com SSL (cadeado verde)
```

---

## 🟢 3. SUPABASE - Auth Configuration (3 min)

### Passo a Passo:
```
1. Acesse: https://app.supabase.com
2. Selecione: liqutcjzzrqstivvfele (seu projeto)
3. Menu lateral: Authentication
4. Sub-menu: URL Configuration
5. Em "Redirect URLs", adicione:
   ✅ https://www.aifeastengine.com/**
   ✅ https://aifeastengine.com/**
   ✅ https://api.aifeastengine.com/**
   
6. Em "Site URL", defina:
   https://www.aifeastengine.com
   
7. Clique: Save
```

### Validação:
```
1. Acesse: https://www.aifeastengine.com
2. Clique em "Sign In"
3. Faça login com Google
4. Deve redirecionar de volta para o Dashboard
```

---

## 🟢 4. UPTIMEROBOT - Monitoramento (5 min)

### Passo a Passo:
```
1. Acesse: https://uptimerobot.com
2. Crie conta (grátis)
3. Clique: "Add New Monitor"
4. Configuração:
   - Friendly Name: AI Feast Engine API
   - Monitor Type: HTTPS
   - URL: https://ai-feast-engine.onrender.com/api/health
   - Monitoring Interval: 5 minutes
   - Alert Contacts: Seu email
   
5. Clique: "Create Monitor"
```

### Resultado:
- Render não vai "dormir" (ping a cada 5 min)
- Você será notificado se o serviço cair
- Dashboard com uptime % ao longo do tempo

---

## 🟢 5. GOOGLE SEARCH CONSOLE (2 min)

### Passo a Passo:
```
1. Acesse: https://search.google.com/search-console
2. Clique: "Add Property"
3. Selecione: "URL prefix"
4. Digite: https://www.aifeastengine.com
5. Clique: Continue
6. Verificação (método recomendado):
   - Faça upload do arquivo HTML no public/
   - OU adicione meta tag no index.html (já fizemos!)
7. Clique: Verify
```

### Após verificação:
```
1. Envie o sitemap:
   - Sitemaps → Add new sitemap
   - URL: sitemap.xml
   - Submit
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

Após completar todas as ações, teste nesta ordem:

### Teste 1: API Domain
```bash
curl https://api.aifeastengine.com/api/health
# Esperado: {"status":"alive"}
```

### Teste 2: Frontend Domain
```
Acesse: https://www.aifeastengine.com
Esperado: Landing page com SSL (cadeado verde)
```

### Teste 3: Login E2E
```
1. Acesse: https://www.aifeastengine.com
2. Clique: Sign In
3. Login com Google
4. Esperado: Redirecionar para Dashboard
5. Verifique: F12 → Console sem erros
```

### Teste 4: API com Auth
```bash
# Após login, copie sua API key do Dashboard
curl -H "X-API-Key: SUA_API_KEY" https://api.aifeastengine.com/api/feed

# Esperado: JSON com posts
```

### Teste 5: Feed Público
```
Acesse: https://www.aifeastengine.com/feed
Esperado: Lista de notícias com resumos
```

### Teste 6: Documentação
```
Acesse: https://www.aifeastengine.com/docs
Esperado: Página de documentação da API
```

---

## 🚨 TROUBLESHOOTING RÁPIDO

### SSL não provisiona no Render:
```
1. Verifique DNS: nslookup api.aifeastengine.com
2. Deve apontar para: *.onrender.com
3. No Render: Settings → Custom Domains → Re-issue Certificate
4. Aguarde 5-10 minutos
```

### CORS Error no Frontend:
```
1. Verifique no Render: APP_URL=https://www.aifeastengine.com
2. Verifique no Render: CORS_ORIGIN inclui https://www.aifeastengine.com
3. Limpe cache do navegador
```

### Login não funciona:
```
1. Verifique Supabase: Redirect URLs incluem https://www.aifeastengine.com/**
2. Verifique Supabase: Site URL = https://www.aifeastengine.com
3. Limpe cookies e tente novamente
```

### DNS não propaga:
```
1. Verifique: https://dnschecker.org
2. Digite: api.aifeastengine.com
3. Se ainda mostrando IP antigo, aguarde (até 24h)
4. Normalmente propaga em 1-2h
```

---

**Tempo total estimado**: 20 minutos  
**Dificuldade**: Fácil (copy-paste)  
**Status**: Pronto para executar! 🚀
