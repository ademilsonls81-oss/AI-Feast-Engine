# Stripe Webhook - Guia de Teste

## Status Atual
✅ Endpoint configurado: `/api/stripe-webhook`
✅ Backend deployado: `https://api.aifeastengine.com`
✅ Variável `STRIPE_WEBHOOK_SECRET` adicionada ao Render

---

## Como Testar com Stripe CLI

### 1. Instalar Stripe CLI
Se ainda não tem instalado:
```bash
# Windows (via scoop)
scoop install stripe

# Ou baixe de: https://docs.stripe.com/stripe-cli
```

### 2. Fazer Login
```bash
stripe login
```
Siga as instruções no terminal para autenticar com sua conta Stripe.

### 3. Teste LOCAL (desenvolvimento)
Para testar localmente com forwarding:
```bash
# Inicie o listener que encaminha eventos para localhost
stripe listen --forward-to localhost:3000/api/stripe-webhook

# Em outro terminal, dispare o evento:
stripe trigger checkout.session.completed
```

### 4. Teste em PRODUÇÃO (Render)
Para testar o endpoint em produção, você tem duas opções:

#### Opção A: Usando Stripe CLI com forwarding remoto
```bash
stripe listen --forward-to https://api.aifeastengine.com/api/stripe-webhook
stripe trigger checkout.session.completed
```

#### Opção B: Pelo Painel Stripe
1. Acesse: https://dashboard.stripe.com/test/webhooks
2. Selecione o webhook configurado
3. Clique em "Send test webhook"
4. Escolha o evento: `checkout.session.completed`
5. Envie

---

## Como Verificar se Funcionou

### Logs do Render
Acesse: https://dashboard.render.com
- Selecione o serviço `api.aifeastengine.com`
- Vá em "Logs"
- Procure por:
  - `💰 Payment success:` → sucesso
  - `❌ Webhook Error:` → erro na assinatura
  - `⚠️ Stripe Webhook Secret is not set` → variável não carregada

### Logs da Stripe CLI
A CLI mostrará algo como:
```
2024-04-14 10:30:00  --> [200] POST http://localhost:3000/api/stripe-webhook
```

### Logs do Stripe Dashboard
1. Acesse: https://dashboard.stripe.com/test/webhooks
2. Clique no webhook
3. Role para baixo para ver "Recent deliveries"
4. Verifique status codes e respostas

---

## Teste Automatizado (com secret)

Se você tem o `STRIPE_WEBHOOK_SECRET` real:

```bash
# Defina a variável de ambiente
$env:STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxx"

# Execute o script de teste
node scripts/test-stripe-webhook.js
```

---

## Problemas Comuns

### ❌ Erro 400 - Signature Verification Failed
**Causa:** STRIPE_WEBHOOK_SECRET incorreto ou expirado
**Solução:** 
- Verifique no Stripe Dashboard > Webhooks > seu endpoint
- Copie o "Signing secret" novamente
- Atualize no Render Dashboard como `STRIPE_WEBHOOK_SECRET`

### ❌ Erro 500 - Internal Server Error
**Causa:** Problema no processamento do evento
**Solução:** Verifique logs do Render para detalhes

### ⚠️ Webhook Secret is not set
**Causa:** Variável de ambiente não foi carregada
**Solução:** 
- Verifique no Render Dashboard > Environment
- Confirme que `STRIPE_WEBHOOK_SECRET` está definida
- Faça um novo deploy se necessário

---

## Evento Esperado: checkout.session.completed

Quando um pagamento é concluído, o webhook:
1. Verifica a assinatura Stripe
2. Atualiza o usuário para `plan: "pro"`
3. Define `rate_limit: 100`
4. Salva `stripe_customer_id`

```sql
UPDATE users 
SET plan = 'pro', 
    stripe_customer_id = '<customer_id>', 
    rate_limit = 100 
WHERE id = '<user_id>';
```

---

## Próximos Passos Após Teste Bem-Sucedido

Após validar o webhook, você pode prosseguir com:
1. ✅ Configurar página de checkout (`/api/create-checkout-session`)
2. ✅ Configurar portal do cliente (Stripe Customer Portal)
3. ✅ Testar fluxo completo de assinatura
4. ✅ Configurar webhooks de `customer.subscription.deleted`
