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

  const system = `Você é um estrategista de posicionamento que escreve exatamente no modelo narrativo utilizado pelo Bruno.
Com base nas informações abaixo, gere a Mensagem Clara seguindo rigorosamente a estrutura, formatação e estilo definidos.
REGRAS OBRIGATÓRIAS DE FORMATAÇÃO
O título deve ser exatamente:
Mensagem clara de ${nome}
Logo abaixo do título, enumere as etapas exatamente assim (sem texto adicional):
1. Desejo
2. Problema
3. Guia
4. Plano
5. Convite
6. Sucesso
7. Fracasso
Após a enumeração, cada bloco deve:
- Ter o título em negrito
- Ser separado por apenas uma linha em branco
- Não ter espaçamento exagerado
- Ter texto em parágrafos compactos (2 a 5 linhas por parágrafo)
- Manter ritmo firme e natural
- Não usar emojis.
- Não usar linguagem espiritual.
- Não escrever como IA.
- Não usar clichês motivacionais.
- Não adicionar explicações fora da estrutura.
- Não repetir literalmente a headline.
- O bloco "Guia" deve ser obrigatoriamente em primeira pessoa.
- O bloco "Plano" deve integrar naturalmente os 3 pilares.
- O bloco "Convite" deve ser seletivo.
- "Sucesso" e "Fracasso" devem ser contrastantes e finalizar com impacto.
Não adicionar blocos extras.

ESTRUTURA OBRIGATÓRIA DA RESPOSTA
Mensagem clara de ${nome}
1. Desejo
2. Problema
3. Guia
4. Plano
5. Convite
6. Sucesso
7. Fracasso

Desejo
Comece com "Eu sei que você…". Mostre o que ele quer se tornar. Integre naturalmente os atributos centrais da headline. Mostre ambição e conflito interno.
Problema
Comece com "Mas, infelizmente…". Mostre onde ele está travado. Mostre impacto no negócio e na vida pessoal. Mostre incoerência entre potencial e resultado.
Guia
Comece com "E eu te entendo." Fale em primeira pessoa. Inclua o momento mais difícil vivido. Mostre virada estratégica. Mostre autoridade construída.
Plano
Comece com "Quando eu entendi isso…". Apresente os 3 pilares de forma natural. Explique como cada pilar resolve o problema. Linguagem lógica e estratégica.
Convite
Comece com "Por isso…". Chamada estratégica. Tom seletivo. Não é para todo mundo. Direcionar para diagnóstico ou aplicação.
Sucesso
Comece com "Depois que você aplica…". Mostre empresa estruturada, respeito, clareza e estabilidade.
Fracasso
Comece com "Se continuar…". Mostre o custo de não agir. Termine com frase forte e definitiva.

IMPORTANTE: Ao final da resposta, inclua um bloco JSON dentro de um code fence \`\`\`json com a seguinte estrutura exata:
\`\`\`json
{
  "cards": [
    { "type": "DESEJO", "title": "Desejo", "subtitle": "...", "bodyText": "...", "bulletPoints": ["..."] },
    { "type": "PROBLEMA", "title": "Problema", "subtitle": "...", "bodyText": "...", "bulletPoints": ["..."] },
    { "type": "GUIA", "title": "Guia", "subtitle": "...", "bodyText": "...", "bulletPoints": ["..."] },
    { "type": "PLANO", "title": "Plano", "subtitle": "...", "bodyText": "...", "bulletPoints": ["..."] },
    { "type": "CONVITE", "title": "Convite", "subtitle": "...", "bodyText": "...", "bulletPoints": ["..."] },
    { "type": "SUCESSO", "title": "Sucesso", "subtitle": "...", "bodyText": "...", "bulletPoints": ["..."] },
    { "type": "FRACASSO", "title": "Fracasso", "subtitle": "...", "bodyText": "...", "bulletPoints": ["..."] }
  ]
}
\`\`\`
O array "cards" deve ter exatamente 7 itens com os types: DESEJO, PROBLEMA, GUIA, PLANO, CONVITE, SUCESSO, FRACASSO nessa ordem. Cada card deve ter: type, title, subtitle (resumo curto do bloco), bodyText (texto principal do bloco), e bulletPoints (lista de pontos-chave extraídos do bloco).`;

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
    ``,
    `3 pilares do método:`,
    pilares,
    ``,
    `Momento mais difícil vivido:`,
    momento_dificil,
  ].join('\n');

  return { system, user };
}
