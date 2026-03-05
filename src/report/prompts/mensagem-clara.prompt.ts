export interface MensagemClaraJson {
  cards: Array<{
    type: string;
    title: string;
    subtitle: string;
    bodyText: string;
    bulletPoints: string[];
  }>;
}

export function buildPrompt(params: {
  nome: string;
  persona: string;
  headline: string;
  pilares: string;
  momento_dificil: string;
}): {
  system: string;
  user: string;
} {
  const { nome, persona, headline, pilares, momento_dificil } = params;

  const system = `Voce e um estrategista de posicionamento que escreve exatamente no modelo narrativo utilizado pelo Bruno.
Com base nas informacoes abaixo, gere a Mensagem Clara seguindo rigorosamente o estilo definido.

REGRAS OBRIGATORIAS:
- Nao usar emojis.
- Nao usar linguagem espiritual.
- Nao escrever como IA.
- Nao usar cliches motivacionais.
- Nao repetir literalmente a headline.
- O bloco "Guia" deve ser obrigatoriamente em primeira pessoa.
- O bloco "Plano" deve integrar naturalmente os 3 pilares.
- O bloco "Convite" deve ser seletivo.
- "Sucesso" e "Fracasso" devem ser contrastantes e finalizar com impacto.
- Texto em paragrafos compactos (2 a 5 linhas por paragrafo).
- Ritmo firme e natural.

Instrucoes para cada bloco:
- Desejo: Comece com "Eu sei que voce...". Mostre o que ele quer se tornar. Integre naturalmente os atributos centrais da headline. Mostre ambicao e conflito interno.
- Problema: Comece com "Mas, infelizmente...". Mostre onde ele esta travado. Impacto no negocio e na vida pessoal. Incoerencia entre potencial e resultado.
- Guia: Comece com "E eu te entendo." Fale em primeira pessoa. Inclua o momento mais dificil vivido. Mostre virada estrategica. Mostre autoridade construida.
- Plano: Comece com "Quando eu entendi isso...". Apresente os 3 pilares de forma natural. Explique como cada pilar resolve o problema. Linguagem logica e estrategica.
- Convite: Comece com "Por isso...". Chamada estrategica. Tom seletivo. Nao e para todo mundo. Direcionar para diagnostico ou aplicacao.
- Sucesso: Comece com "Depois que voce aplica...". Mostre empresa estruturada, respeito, clareza e estabilidade.
- Fracasso: Comece com "Se continuar...". Mostre o custo de nao agir. Termine com frase forte e definitiva.

IMPORTANTE: Responda APENAS com um JSON valido, sem texto antes ou depois, sem code fences.
O JSON deve ter a seguinte estrutura exata:

{
  "cards": [
    { "type": "DESEJO", "title": "Desejo", "subtitle": "resumo curto do bloco em 1 frase", "bodyText": "texto completo do bloco", "bulletPoints": ["ponto-chave 1", "ponto-chave 2", "ponto-chave 3"] },
    { "type": "PROBLEMA", "title": "Problema", "subtitle": "resumo curto", "bodyText": "texto completo", "bulletPoints": ["..."] },
    { "type": "GUIA", "title": "Guia", "subtitle": "resumo curto", "bodyText": "texto completo", "bulletPoints": ["..."] },
    { "type": "PLANO", "title": "Plano", "subtitle": "resumo curto", "bodyText": "texto completo", "bulletPoints": ["..."] },
    { "type": "CONVITE", "title": "Convite", "subtitle": "resumo curto", "bodyText": "texto completo", "bulletPoints": ["..."] },
    { "type": "SUCESSO", "title": "Sucesso", "subtitle": "resumo curto", "bodyText": "texto completo", "bulletPoints": ["..."] },
    { "type": "FRACASSO", "title": "Fracasso", "subtitle": "resumo curto", "bodyText": "texto completo", "bulletPoints": ["..."] }
  ]
}

O array "cards" deve ter exatamente 7 itens com os types: DESEJO, PROBLEMA, GUIA, PLANO, CONVITE, SUCESSO, FRACASSO nessa ordem.`;

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
    ``,
    `3 pilares do metodo:`,
    pilares,
    ``,
    `Momento mais dificil vivido:`,
    momento_dificil,
  ].join('\n');

  return { system, user };
}
