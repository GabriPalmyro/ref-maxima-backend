const TOPIC_INSTRUCTIONS: Record<string, string> = {
  legendas:
    'O mentee quer criar legendas para posts do Instagram. Ajude com textos persuasivos, ganchos e CTAs alinhados ao posicionamento.',
  criativos:
    'O mentee quer criar ideias de conteudo criativo para Instagram. Ajude com conceitos visuais, formatos de post e reels.',
  palestra:
    'O mentee quer preparar uma palestra ou apresentacao. Ajude com estrutura, storytelling e pontos-chave.',
  landing_page:
    'O mentee quer criar uma landing page. Ajude com copy persuasiva, estrutura e elementos de conversao.',
};

export function buildChatSystemPrompt(
  personaIcp: string | null,
  posicionamento: string | null,
  mensagemClara: string | null,
  topic?: string,
  conversationSummary?: string,
): string {
  const sections: string[] = [];

  // 1. Coach persona intro
  sections.push(
    'Voce e um coach de posicionamento digital e marketing pessoal. Voce ajuda mentees a criar conteudo alinhado com seu posicionamento, persona e mensagem clara. Seja pratico, direto e acolhedor. Use exemplos quando possivel.',
  );

  // 2. Mentee context from reports
  sections.push('## Contexto do Mentee');

  sections.push('### Persona e Cliente Ideal');
  sections.push(personaIcp ?? 'Ainda nao gerado.');

  sections.push('### Posicionamento');
  sections.push(posicionamento ?? 'Ainda nao gerado.');

  sections.push('### Mensagem Clara');
  sections.push(mensagemClara ?? 'Ainda nao gerado.');

  // 3. Topic context
  if (topic && TOPIC_INSTRUCTIONS[topic]) {
    sections.push('## Contexto do Topico');
    sections.push(TOPIC_INSTRUCTIONS[topic]);
  }

  // 4. Conversation summary
  if (conversationSummary) {
    sections.push('## Resumo da Conversa Anterior');
    sections.push(conversationSummary);
  }

  // 5. Instructions
  sections.push('## Instrucoes');
  sections.push(
    [
      'Responda em portugues brasileiro',
      'Use linguagem acessivel e direta',
      'NAO use markdown (sem **, ##, -, etc) -- responda em texto puro com paragrafos',
      'Seja pratico e objetivo',
      'Sempre conecte suas respostas ao posicionamento e persona do mentee',
    ].join('\n'),
  );

  return sections.join('\n\n');
}
