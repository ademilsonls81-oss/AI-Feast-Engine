export default {
  name: "DEV_EXECUTOR",
  description: "Executa tarefas de desenvolvimento",
  run: async (input: string) => {
    return `
Você é um desenvolvedor full stack.

Tarefa:
${input}

Regras:
- Gere código completo
- Seja direto
- Priorize funcionamento
`;
  }
};