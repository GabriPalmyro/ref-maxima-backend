export interface PersonaIcpJson {
  nomeFicticio: string;
  resumo: string;
  dadosDemograficos: {
    nome: string;
    genero: string;
    idade: string;
    escolaridade: string;
    ocupacao: string;
    religiao: string;
    rendaMedia: string;
    relacionamento: string;
    narrativa: string;
  };
  caracteristicasAmaria: string[];
  caracteristicasNaoAtenderia: string[];
  inimigosCliente: string[];
  oQueMaisValoriza: string[];
  comoObterResultado: string;
  diagnosticoProfundo: {
    desejos: string[];
    dores: string[];
    emocoes: string[];
    medos: string[];
    objecoes: string[];
  };
  vidaIdeal: string;
  cenarioNegativo: string;
  localizacaoCliente: string[];
  ideiasConteudo: string[];
}

export function buildPrompt(answers: Record<string, string>): {
  system: string;
  user: string;
} {
  const publico = answers.q1 ?? '';
  const problema = answers.q2 ?? '';
  const transformacao = answers.q3 ?? '';
  const autoridade = answers.q4 ?? '';
  const pilares = answers.q5 ?? '';

  const system = `Voce e um estrategista de posicionamento premium especializado em empresarios e mentores.
Com base nas respostas abaixo, construa um documento completo de CLIENTE DOS SONHOS.

REGRAS OBRIGATORIAS:
- Nao usar emojis.
- Nao escrever como IA.
- Nao usar frases genericas.
- Escrever como documento interno de mentoria.
- Linguagem natural, estrategica e emocional.
- Nao mencionar que esta inferindo.
- Manter consistencia psicologica.

IMPORTANTE: Responda APENAS com um JSON valido, sem texto antes ou depois, sem code fences.
O JSON deve seguir exatamente esta estrutura:

{
  "nomeFicticio": "nome ficticio para a persona",
  "resumo": "resumo estrategico da persona em 4 a 6 linhas explicando quem ele e, onde esta travado, o conflito principal e o que esta em jogo",
  "dadosDemograficos": {
    "nome": "nome figurativo",
    "genero": "genero",
    "idade": "idade",
    "escolaridade": "escolaridade",
    "ocupacao": "ocupacao profissional",
    "religiao": "religiao",
    "rendaMedia": "renda media",
    "relacionamento": "estado civil",
    "narrativa": "texto narrativo profundo explicando como ele construiu o que tem, onde esta travado, impacto no negocio, impacto na familia, conflito emocional, comportamentos repetitivos e medo silencioso"
  },
  "caracteristicasAmaria": ["caracteristica 1", "caracteristica 2"],
  "caracteristicasNaoAtenderia": ["caracteristica 1", "caracteristica 2"],
  "inimigosCliente": ["inimigo 1", "inimigo 2"],
  "oQueMaisValoriza": ["valor 1", "valor 2"],
  "comoObterResultado": "texto estrategico integrando naturalmente os 3 pilares do metodo, sem bullets, apenas texto",
  "diagnosticoProfundo": {
    "desejos": ["desejo 1", "desejo 2"],
    "dores": ["dor 1", "dor 2"],
    "emocoes": ["emocao 1", "emocao 2"],
    "medos": ["medo 1", "medo 2"],
    "objecoes": ["objecao 1", "objecao 2"]
  },
  "vidaIdeal": "texto curto explicando o cenario ideal",
  "cenarioNegativo": "texto curto explicando o cenario se nao mudar",
  "localizacaoCliente": ["onde ele esta 1", "onde ele esta 2"],
  "ideiasConteudo": ["ideia 1", "ideia 2"]
}`;

  const user = [
    `Respostas do mentorado:`,
    ``,
    `Publico que deseja atrair: ${publico}`,
    `Principal problema que resolve: ${problema}`,
    `Transformacao prometida: ${transformacao}`,
    `Autoridade do mentor (historia/conquistas): ${autoridade}`,
    `3 pilares do metodo: ${pilares}`,
  ].join('\n');

  return { system, user };
}
