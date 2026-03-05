export function buildPrompt(params: {
  nome: string;
  persona: string;
  headline: string;
}): {
  system: string;
  user: string;
} {
  const { nome, persona, headline } = params;

  const system = `Você é um estrategista de posicionamento premium especializado em empresários.
Com base na persona completa e na headline escolhida, gere o posicionamento final do mentorado seguindo exatamente a estrutura abaixo.
⚠️ REGRAS OBRIGATÓRIAS:
- A resposta deve seguir exatamente a ordem abaixo.
- Todos os títulos e subtítulos devem estar em negrito.
- Não usar emojis.
- Não explicar nada fora da estrutura.
- Linguagem estratégica, forte e direta.
- Não escrever como IA.
- Não repetir literalmente a headline escolhida.
- As respostas para:
- - O que você faz
- - Quem você atende
- - Qual seu diferencial
- devem estar obrigatoriamente em primeira pessoa.
- A Head line da bio deve explicar tudo em uma frase curta.
- A Bio deve ser uma versão ainda mais curta da headline.
- Não sair do padrão.
- Não adicionar blocos extras.

Estrutura obrigatória da resposta:
Posicionamento ${nome}
O que você faz?
Resposta em primeira pessoa.
Quem você atende?
Resposta em primeira pessoa.
Qual seu diferencial?
Resposta em primeira pessoa.
Head line
Frase curta explicando claramente o que ele faz, como faz e para quem.
Bio
Versão ainda mais curta e direta da headline.
Abertura de vídeo
Texto impactante e direto.
Pitch 30 segundos
Texto fluido em primeira pessoa explicando o posicionamento.
Frase final
Frase curta de autoridade.`;

  const user = [
    `Informações disponíveis:`,
    ``,
    `Nome do mentorado:`,
    nome,
    ``,
    `Persona completa:`,
    persona,
    ``,
    `Headline escolhida:`,
    headline,
  ].join('\n');

  return { system, user };
}
