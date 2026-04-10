# 🍽️ AI FEAST ENGINE - Guia de Deploy Seguro

## 🔒 Checklist de Segurança Pré-Deploy

- [x] `.env` está no `.gitignore`
- [x] Nenhuma credencial no código-fonte
- [x] `.env.example` criado como template
- [ ] **Rotacionar chaves do Supabase** (faça isso ANTES de deploy)
- [ ] **Atualizar variáveis no Render**
- [ ] **Atualizar variáveis na Vercel**

---

## 1️⃣ RENDER - Backend Configuration

### 📍 Acesse:
https://dashboard.render.com → Selecione seu serviço → Environment

### 🔑 Variáveis de Ambiente Obrigatórias:

```env
# Supabase
VITE_SUPABASE_URL=https://liqutcjzzrqstivvfele.supabase.co
VITE_SUPABASE_ANON_KEY=<SUA_ANON_KEY_AQUI>
SUPABASE_SERVICE_ROLE_KEY=<SUA_SERVICE_ROLE_KEY_AQUI>

# AI Provider (Groq)
GROQ_API_KEY=<SUA_GROQ_API_KEY_AQUI>

# Server Config
NODE_ENV=production
APP_URL=https://www.aifeastengine.com
CORS_ORIGIN=https://www.aifeastengine.com,https://aifeastengine.com,https://api.aifeastengine.com

# Rate Limiting
RATE_LIMIT_ENABLED=true
GLOBAL_RATE_LIMIT=100
DEFAULT_RATE_LIMIT_FREE=10
DEFAULT_RATE_LIMIT_PRO=100

# Batch Processing
MAX_CONCURRENT_POSTS=5
BATCH_DELAY_MS=2000
```

### 🌐 Custom Domain no Render:
1. Vá para **Settings → Custom Domains**
2. Clique em **Add Custom Domain**
3. Insira: `api.aifeastengine.com`
4. Render vai gerar um **CNAME Target** (algo como `ai-feast-engine.onrender.com`)
5. No painel da **Hostinger**:
   - Vá para **DNS Management**
   - Adicione um registro **CNAME**:
     - **Name**: `api`
     - **Target**: `<valor-gerado-pelo-render>`
     - **TTL**: 3600
6. Aguarde propagação (até 24h, normalmente 1-2h)
7. Render vai provisionar SSL automaticamente

### ⚡ Evitar Sleep (Plano Gratuito):
1. Crie conta em https://uptimerobot.com
2. Adicione monitor:
   - **Friendly Name**: `AI Feast Engine Backend`
   - **URL to Monitor**: `https://ai-feast-engine.onrender.com/api/health`
   - **Monitoring Interval**: 5 minutes
3. Isso mantém o servidor ativo!

---

## 2️⃣ VERCEL - Frontend Configuration

### 📍 Acesse:
https://vercel.com → Selecione seu projeto → Settings → Environment Variables

### 🔑 Variáveis de Ambiente:

```env
# Supabase (Frontend - apenas Anon Key)
VITE_SUPABASE_URL=https://liqutcjzzrqstivvfele.supabase.co
VITE_SUPABASE_ANON_KEY=<SUA_ANON_KEY_AQUI>

# API URL (Backend)
VITE_API_URL=https://api.aifeastengine.com
```

⚠️ **IMPORTANTE**: Após adicionar variáveis, faça um redeploy para aplicar:
```bash
git commit --allow-empty -m "chore: trigger redeploy for env vars"
git push
```

### 🌐 Custom Domain na Vercel:
1. Vá para **Settings → Domains**
2. Clique em **Add Domain**
3. Insira: `aifeastengine.com` e `www.aifeastengine.com`
4. Vercel vai detectar que você já configurou o DNS (registro A → `76.76.21.21`)
5. Clique em **Verify** para confirmar
6. SSL será provisionado automaticamente

---

## 3️⃣ SUPABASE - Auth Configuration

### 📍 Acesse:
https://app.supabase.com → Seu Projeto → Authentication → URL Configuration

### 🔗 Redirect URLs:
Adicione estas URLs na seção **Redirect URLs**:

```
https://www.aifeastengine.com/**
https://aifeastengine.com/**
https://api.aifeastengine.com/**
http://localhost:5173/**
http://localhost:3000/**
```

### 🏠 Site URL:
Defina como: `https://www.aifeastengine.com`

### 🔑 Rotacionar Chaves do Supabase:
1. Vá para **Project Settings → API**
2. Em **Project API Keys**:
   - Clique em **Regenerate** na `service_role` key
   - Copie a NOVA chave
3. **IMEDIATAMENTE** atualize no Render:
   - `SUPABASE_SERVICE_ROLE_KEY=<nova_chave>`
4. Se regenerar a `anon` key, atualize também:
   - Render: `VITE_SUPABASE_ANON_KEY`
   - Vercel: `VITE_SUPABASE_ANON_KEY`

---

## 4️⃣ TESTES PÓS-DEPLOY

### ✅ Backend (Render):
```bash
# Health Check
curl https://api.aifeastengine.com/api/health

# Stats
curl https://api.aifeastengine.com/api/stats
```

### ✅ Frontend (Vercel):
1. Acesse: `https://www.aifeastengine.com`
2. Teste login com Google
3. Verifique se o Dashboard carrega
4. Teste o Live Feed

### ✅ Integração Frontend → Backend:
1. No Dashboard, copie sua API Key
2. Teste:
```bash
curl -H "X-API-Key: SUA_API_KEY" https://api.aifeastengine.com/api/feed
```

### ✅ CORS:
Abra o console do navegador em `https://www.aifeastengine.com` e verifique se não há erros de CORS.

---

## 5️⃣ ROTAÇÃO DE CHAVES DE EMERGÊNCIA

Se suas chaves foram comprometidas:

### Supabase:
1. Execute o SQL em `scripts/rotate-api-keys.sql`
2. Regenera as chaves no Supabase Dashboard
3. Atualize no Render e Vercel

### Groq API:
1. Acesse: https://console.groq.com/keys
2. Delete a chave antiga
3. Crie uma nova
4. Atualize no Render

### Stripe:
1. Acesse: https://dashboard.stripe.com/apikeys
2. Clique em **Roll** na chave secreta
3. Atualize no Render

---

## 📋 Ordem de Deploy Recomendada

1. ✅ **Supabase**: Configurar Auth URLs e rotacionar chaves
2. ✅ **Render**: Atualizar variáveis de ambiente + custom domain
3. ✅ **Vercel**: Atualizar variáveis + custom domain
4. ✅ **Testes**: Verificar saúde de todos os serviços
5. ✅ **UptimeRobot**: Configurar monitoramento

---

## 🆘 Troubleshooting

### CORS Error no Frontend:
- Verifique se `CORS_ORIGIN` no Render inclui `https://www.aifeastengine.com`
- Verifique se o domínio da API está correto: `https://api.aifeastengine.com`

### Google Auth não funciona:
- Verifique se as Redirect URLs no Supabase estão corretas
- Verifique se o `Site URL` está configurado

### API não responde:
- Verifique logs no Render: https://dashboard.render.com → Logs
- Teste health endpoint: `/api/health`
- Verifique se variáveis de ambiente estão carregadas

### Domínio não propaga:
- Use https://dnschecker.org para verificar propagação DNS
- DNS pode levar até 24-48h

---

## 📞 Suporte

- **Render**: https://render.com/docs
- **Vercel**: https://vercel.com/docs
- **Supabase**: https://supabase.com/docs
- **Groq**: https://console.groq.com/docs
