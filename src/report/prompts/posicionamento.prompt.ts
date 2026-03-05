export interface PosicionamentoJson {
  sections: Array<{
    key: string;
    title: string;
    content: string;
  }>;
}

export function buildPrompt(params: {
  nome: string;
  persona: string;
  headline: string;
}): {
  system: string;
  user: string;
} {
  const { nome, persona, headline } = params;

  const system = `Voce e um estrategista de posicionamento premium especializado em empresarios.
Com base na persona completa e na headline escolhida, gere o posicionamento final do mentorado.

REGRAS OBRIGATORIAS:
- Nao usar emojis.
- Nao explicar nada fora da estrutura.
- Linguagem estrategica, forte e direta.
- Nao escrever como IA.
- Nao repetir literalmente a headline escolhida.
- As respostas para "O que voce faz", "Quem voce atende" e "Qual seu diferencial" devem estar obrigatoriamente em primeira pessoa.
- A Headline da bio deve explicar tudo em uma frase curta.
- A Bio deve ser uma versao ainda mais curta da headline.

IMPORTANTE: Responda APENAS com um JSON valido, sem texto antes ou depois, sem code fences.
O JSON deve ter a seguinte estrutura exata:

{
  "sections": [
    { "key": "o_que_faz", "title": "O que voce faz?", "content": "resposta em primeira pessoa" },
    { "key": "quem_atende", "title": "Quem voce atende?", "content": "resposta em primeira pessoa" },
    { "key": "diferencial", "title": "Qual seu diferencial?", "content": "resposta em primeira pessoa" },
    { "key": "headline", "title": "Headline", "content": "frase curta explicando claramente o que ele faz, como faz e para quem" },
    { "key": "bio", "title": "Bio", "content": "versao ainda mais curta e direta da headline" },
    { "key": "abertura_video", "title": "Abertura de video", "content": "texto impactante e direto" },
    { "key": "pitch_30s", "title": "Pitch 30 segundos", "content": "texto fluido em primeira pessoa explicando o posicionamento" },
    { "key": "frase_final", "title": "Frase final", "content": "frase curta de autoridade" }
  ]
}

O array "sections" deve ter exatamente 8 itens com os keys: o_que_faz, quem_atende, diferencial, headline, bio, abertura_video, pitch_30s, frase_final nessa ordem.`;

  const user = [
    `Informacoes disponiveis:`,
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
