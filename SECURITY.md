# 🔒 AI FEAST ENGINE - Security & Deployment Guide

## ✅ Status de Segurança

**Última auditoria**: 10/04/2026  
**Status**: ✅ **SEGURO** - Nenhuma credencial exposta no código-fonte

---

## 🛡️ Scripts de Segurança Disponíveis

### 1. Setup Interativo do Ambiente
```bash
npm run setup:env
```
Cria o arquivo `.env.local` de forma segura e interativa, sem expor credenciais.

### 2. Auditoria de Segurança
```bash
npm run audit:security
```
Verifica automaticamente se há credenciais expostas no projeto.

### 3. Rotação de Chaves (SQL)
```sql
-- Execute no Supabase SQL Editor
-- Arquivo: scripts/rotate-api-keys.sql
```
Rotaciona todas as chaves de API dos usuários e cria índices de performance.

---

## 📁 Estrutura de Arquivos de Ambiente

| Arquivo | Propósito | Commitado? |
|---------|-----------|------------|
| `.env.example` | Template com placeholders | ✅ Sim |
| `.env` | Configuração local (placeholders) | ✅ Sim (sem credenciais) |
| `.env.local` | Credenciais reais de desenvolvimento | ❌ Não |
| `.env.backup` | Backup de credenciais antigas | ❌ Não |
| `.env.production` | Template para Render/Vercel | ✅ Sim (sem credenciais) |

---

## 🚀 Deployment Checklist

### Pré-Deploy
- [x] Executar `npm run audit:security` e verificar que passou
- [x] **Rotacionar chaves do Supabase** (se houver risco de exposição)
- [x] Verificar se `.env` não foi commited acidentalmente

### Render (Backend)
1. Acessar: https://dashboard.render.com
2. Adicionar variáveis de ambiente (veja `.env.production` como referência)
3. Configurar custom domain: `api.aifeastengine.com`
4. Verificar logs após deploy

### Vercel (Frontend)
1. Acessar: https://vercel.com
2. Adicionar variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL=https://api.aifeastengine.com`
3. Configurar custom domain: `www.aifeastengine.com`

### Supabase
1. Authentication → URL Configuration
2. Adicionar redirect URLs:
   - `https://www.aifeastengine.com/**`
   - `https://aifeastengine.com/**`
3. Definir Site URL: `https://www.aifeastengine.com`

---

## 🚨 Procedimento de Emergência

### Se credenciais foram comprometidas:

1. **Rotacionar imediatamente**:
   - Supabase: Dashboard → Settings → API → Regenerate
   - Groq: https://console.groq.com/keys → Delete + Create New
   - Stripe: Dashboard → API keys → Roll secret key

2. **Atualizar variáveis**:
   - Render: Environment Variables
   - Vercel: Settings → Environment Variables

3. **Executar rotação de chaves de usuários**:
   ```bash
   # Execute o SQL em scripts/rotate-api-keys.sql
   ```

4. **Verificar logs** para uso não autorizado

---

## 📊 Monitoramento

### UptimeRobot (Evitar Sleep do Render)
- **URL**: https://uptimerobot.com
- **Monitor**: `https://ai-feast-engine.onrender.com/api/health`
- **Intervalo**: 5 minutos

### Health Checks
```bash
# Backend
curl https://api.aifeastengine.com/api/health

# Stats
curl https://api.aifeastengine.com/api/stats
```

---

## 🔐 Boas Práticas

1. ✅ **Nunca** commite arquivos `.env.*` (exceto `.env.example`)
2. ✅ **Sempre** use `.env.local` para desenvolvimento
3. ✅ **Rotacione** chaves a cada 90 dias
4. ✅ **Use** variáveis de ambiente nos dashboards (Render/Vercel)
5. ✅ **Execute** `npm run audit:security` antes de cada deploy
6. ✅ **Monitore** logs para atividade suspeita

---

## 📞 Suporte

- **Documentação Completa**: `docs/DEPLOY_GUIDE.md`
- **Supabase**: https://supabase.com/docs
- **Render**: https://render.com/docs
- **Vercel**: https://vercel.com/docs

---

*Última atualização: 10/04/2026*
