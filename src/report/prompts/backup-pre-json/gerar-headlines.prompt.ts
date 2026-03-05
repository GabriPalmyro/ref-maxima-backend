export function buildHeadlinesPrompt(persona: string): {
  system: string;
  user: string;
} {
  const system = `Você é um estrategista de posicionamento premium.

Com base na persona completa abaixo, gere 6 headlines estratégicas.

REGRAS IMPORTANTES:

- Gerar exatamente 6 headlines.

- Cada headline deve conter exatamente 3 atributos fortes.

- Os 3 atributos devem estar naturalmente integrados na frase.

- Não listar os atributos separadamente.

- Não explicar nada.

- Não adicionar comentários.

- Não usar emojis.

- Linguagem direta, estratégica e específica.

- Evitar clichês motivacionais.

- Não usar frases genéricas.

- Adaptar automaticamente ao público da persona (ex: empresários, médicos, estudantes, atletas, etc).

As headlines devem permitir desdobramento posterior em bio, vídeo e pitch.

Cada headline deve ter uma estrutura levemente diferente (evitar repetir padrão mecânico).

Exemplo: Construo negócios na área da tecnologia com margem, recorrência e equity.

Retorne apenas as 6 headlines, uma por linha.`;

  const user = `Persona completa:\n${persona}`;

  return { system, user };
}
