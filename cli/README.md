# 🍽️ AI Feast Engine CLI

Interface de linha de comando para instalar e executar skills do AI Feast Engine.

## Instalação

```bash
# Executar diretamente com npx
npx aifeast list

# Ou instalar globalmente
npm install -g aifeast
aifeast list
```

## Comandos

### Listar Skills

```bash
npx aifeast list
```

Lista todas as skills disponíveis no catálogo.

### Ver Detalhes

```bash
npx aifeast info <skill-slug>
```

Exemplo:
```bash
npx aifeast info summarize-article
```

### Executar Skill

```bash
npx aifeast run <skill-slug> --input "seu texto aqui"
```

Exemplo:
```bash
npx aifeast run summarize-article --input "https://example.com/artigo"
```

### Configurar API Key

```bash
npx aifeast config --key SUA_API_KEY
```

A API Key é salva em `~/.aifeast/config.json` e reutilizada automaticamente.

### Ajuda

```bash
npx aifeast help
```

## Requisitos

- Node.js 14+
- API Key do AI Feast Engine (obtida em https://www.aifeastengine.com/dashboard)

## API Base

`https://api.aifeastengine.com`

## Licença

MIT
