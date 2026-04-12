# 🍽️ AI Feast Engine CLI

Interface de linha de comando oficial para interagir com o AI Feast Engine — descubra, configure e execute skills de IA diretamente do terminal.

## Instalação

```bash
# Via npx (sem instalação)
npx aifeast list

# Ou instalar globalmente
npm install -g aifeast
aifeast --help
```

## Requisitos

- Node.js 14+
- API Key do AI Feast Engine (obtida no dashboard)

## Configuração Inicial

```bash
# Salvar sua API Key
aifeast config --key af_xxxxxxxxxxxxx
```

A chave é salva em `~/.aifeast/config.json` e reutilizada automaticamente.

## Comandos

### `list` — Listar Skills

Lista todas as skills disponíveis no catálogo.

```bash
aifeast list
```

### `info <slug>` — Detalhes da Skill

Mostra informações detalhadas de uma skill específica.

```bash
aifeast info summarize-article
```

### `run <slug> --input "texto"` — Executar Skill

Executa uma skill com o input fornecido.

```bash
aifeast run summarize-article --input "https://example.com/artigo"
aifeast run translate-text --input "Hello world" --lang pt
```

### `config --key <valor>` — Configurar API Key

Salva sua API Key para uso em comandos autenticados.

```bash
aifeast config --key af_xxxxxxxxxxxxx
```

### `help` — Ajuda

Mostra a lista de comandos disponíveis.

```bash
aifeast help
```

## Estrutura de Configuração

O arquivo de configuração é armazenado em `~/.aifeast/config.json`:

```json
{
  "apiKey": "af_xxxxxxxxxxxxx"
}
```

## API Base

`https://api.aifeastengine.com`

## Troubleshooting

### "API Key não configurada"
Execute `aifeast config --key SUA_API_KEY` para salvar sua chave. A key é obtida no [Dashboard](https://www.aifeastengine.com).

### "Comando desconhecido"
Execute `aifeast help` para ver a lista de comandos válidos.

### Timeout ao listar skills
A API pode estar temporariamente indisponível. Verifique o status em [aifeastengine.com](https://www.aifeastengine.com) e tente novamente.

### Erro 402 — Limite atingido
Seu plano free atingiu o limite mensal de 100 requests. Faça upgrade para Pro ou aguarde o próximo ciclo.

## Licença

MIT

## Repositório

https://github.com/ademilsonls81-oss/AI-Feast-Engine
