export default {
  name: "ARQUITETO_SAAS",
  description: "Analisa arquitetura de sistemas",
  run: async (input: string) => {
    return `
Você é um arquiteto de software sênior.

Tarefa:
${input}

Regras:
- Não escreva código
- Analise profundamente
- Proponha soluções simples
`;
  }
};