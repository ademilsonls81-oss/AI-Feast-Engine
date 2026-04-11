# 💳 STRIPE - Configuração Completa para AI FEAST ENGINE

## 📋 O que já está pronto no código:

✅ **Checkout Session** (`/api/create-checkout-session`)  
✅ **Webhook Handler** (`/api/stripe-webhook`)  
✅ **Upgrade automático** (checkout.session.completed → plan: pro)  
✅ **Downgrade automático** (subscription.deleted → plan: free)  
✅ **Botão no Frontend** (Dashboard → "Upgrade to Pro")  

## 🔑 O que você precisa criar no Stripe (5 min):

### Passo 1: Criar Conta Stripe
1. Acesse: https://dashboard.stripe.com/register
2. Crie conta (ou use login existente)
3. Ative **Test Mode** (toggle no topo direito)

### Passo 2: Criar Produto Pro Plan
1. Vá para: **Products → Add Product**
2. Configure:
   - **Name**: `AI Feast Engine Pro`
   - **Description**: `10,000 API requests/month + Priority Access`
   - **Pricing**: `Recurring` → `$9.99/month`
3. Clique em **Save**
4. **Copie o Price ID** (começa com `price_...`)

### Passo 3: Pegar Chaves API
1. Vá para: **Developers → API Keys**
2. Copie:
   - **Secret Key** (começa com `sk_test_...`)

### Passo 4: Criar Webhook
1. Vá para: **Developers → Webhooks → Add Endpoint**
2. **Endpoint URL**: `https://api.aifeastengine.com/api/stripe-webhook`
3. **Events**: Selecione:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.deleted`
4. Clique em **Add Endpoint**
5. **Copie o Webhook Secret** (começa com `whsec_...`)

## 🔐 Variáveis para configurar no Render:

```
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_PRO_PRICE_ID=price_XXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_ENABLED=true
```

## 🚀 Deploy no Render:

1. Acesse: https://dashboard.render.com
2. Selecione: `ai-feast-engine`
3. Vá para: **Environment**
4. Adicione as 4 variáveis acima
5. Clique em **Save Changes**
6. O Render vai fazer redeploy automático

## ✅ Teste o Fluxo:

1. Acesse: https://www.aifeastengine.com/dashboard
2. Faça login
3. Clique em **"Upgrade to Pro"**
4. Use card de teste do Stripe:
   - **Card**: `4242 4242 4242 4242`
   - **Expiry**: `12/30`
   - **CVC**: `123`
5. Complete o checkout
6. Verifique no Dashboard se o plano mudou para **PRO**

## 🧪 Cards de Teste Stripe:

| Card | Resultado |
|------|-----------|
| 4242 4242 4242 4242 | ✅ Pagamento aprovado |
| 4000 0000 0000 9995 | ❌ Pagamento recusado |
| 4000 0025 0000 3155 | ⚠️ Requer autenticação 3D |

---

**Após configurar, o fluxo de pagamento estará 100% automatizado!**
