# 🔑 GUIA RÁPIDO - Como Usar a API e Gerar Usage Metrics

## 📊 Por que o Usage Metrics está vazio?

O **Usage Metrics** só mostra dados quando alguém faz chamadas à API usando sua **API Key**. 

Se você nunca usou a API, o gráfico fica vazio.

---

## 🚀 COMO TESTAR E GERAR DADOS

### Passo 1: Pegue sua API Key

1. Acesse: `https://www.aifeastengine.com/dashboard`
2. Faça login com Google
3. Copie sua **API Key** (começa com `af_`)

### Passo 2: Faça uma chamada de teste

#### Opção A - Usando cURL (Terminal)
```bash
curl -H "X-API-Key: SUA_API_KEY_AQUI" https://api.aifeastengine.com/api/feed
```

#### Opção B - Usando JavaScript (Console do Navegador)
```javascript
const response = await fetch('https://api.aifeastengine.com/api/feed', {
  headers: {
    'X-API-Key': 'SUA_API_KEY_AQUI'
  }
});
const data = await response.json();
console.log(data);
```

#### Opção C - Usando Python
```python
import requests

response = requests.get(
    'https://api.aifeastengine.com/api/feed',
    headers={
        'X-API-Key': 'SUA_API_KEY_AQUI'
    }
)
print(response.json())
```

### Passo 3: Verifique o Usage Metrics

1. Volte para o **Dashboard**
2. Faça **refresh** da página (F5)
3. O gráfico agora deve mostrar **1 request**!

---

## 📈 O QUE APARECE NO USAGE METRICS

### Barra de Progresso
- **Roxo**: 0-70% do limite mensal ✅
- **Amarelo**: 70-90% do limite ⚠️
- **Vermelho**: 90%+ do limite 🔴

### Plano Free
- **Limite**: 100 requests/mês
- **Custo**: Grátis

### Plano Pro
- **Limite**: 10,000 requests/mês
- **Custo**: $0.001 por request extra

---

## 🧪 TESTE RÁPIDO (5 requests seguidos)

Execute isso no terminal para gerar dados rapidamente:

```bash
# Substitua SUA_API_KEY pela sua chave real
for i in {1..5}; do
  echo "Request $i:"
  curl -s -H "X-API-Key: SUA_API_KEY" https://api.aifeastengine.com/api/feed | jq '.posts | length'
  sleep 1
done
```

---

## 🔍 ENDPOINTS DISPONÍVEIS

| Endpoint | Método | Descrição | Auth |
|----------|--------|-----------|------|
| `/api/feed` | GET | Lista posts recentes | ✅ API Key |
| `/api/feed?lang=en` | GET | Posts em inglês | ✅ API Key |
| `/api/feed?lang=es&limit=10` | GET | Posts em espanhol | ✅ API Key |
| `/api/stats` | GET | Estatísticas gerais | ❌ Pública |
| `/api/health` | GET | Health check | ❌ Pública |

### Parâmetros do `/api/feed`
- `lang`: Idioma (`pt`, `en`, `es`, `fr`, `de`, `it`, `ja`, `ko`, `zh`, `ru`, `ar`)
- `limit`: Número de posts (1-50, padrão: 20)
- `since`: Filtrar por data (ISO format)

---

## 💡 DICAS

1. **Cada request conta**: Toda chamada ao `/api/feed` incrementa o `usage_count`
2. **Logs detalhados**: O banco registra endpoint, timestamp e custo
3. **Reset mensal**: O contador reseta todo mês
4. **Alerta de limite**: Se chegar no limite, você recebe erro 429

---

## 🚨 PROBLEMAS COMUNS

### Erro 401 Unauthorized
- **Causa**: API Key inválida ou ausente
- **Solução**: Verifique se a key está correta no header `X-API-Key`

### Erro 429 Too Many Requests
- **Causa**: Limite mensal atingido
- **Solução**: Aguarde o próximo mês ou faça upgrade para Pro

### Erro de CORS
- **Causa**: Frontend não configurado corretamente
- **Solução**: Verifique se está usando `api.aifeastengine.com`

---

**Pronto! Agora você pode monitorar todo o uso da sua API!** 🚀
