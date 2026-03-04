export interface PerceptionPromptParams {
  persona: string | null;
  profilePicInfo: string;
  bio: string;
  posts: string;
  hasImages?: boolean;
}

export interface PerceptionPromptResult {
  system: string;
  user: string;
}

export function buildPerceptionPrompt(
  params: PerceptionPromptParams,
): PerceptionPromptResult {
  const personaContent =
    params.persona ??
    'Persona ICP não disponível — analisar o perfil com base em sinais gerais de posicionamento';
  const bioContent = params.bio || 'Bio não encontrada';
  const hasImages = params.hasImages ?? false;

  const system = `Você é um estrategista de posicionamento premium especializado em percepção de valor e autoridade digital.`;

  const imageInstructions = hasImages
    ? `

IMAGENS DISPONÍVEIS PARA ANÁLISE VISUAL:

Imagem 1 — Foto de perfil: Você está recebendo a foto de perfil do Instagram. Analise qualidade, profissionalismo, iluminação, enquadramento e alinhamento com o posicionamento da persona.

Imagem 2 — Grid dos últimos 12 posts: Você está recebendo uma montagem 4x3 com os últimos 12 posts do perfil. Analise consistência visual, paleta de cores, estilo fotográfico, proporção entre tipos de conteúdo (carrossel, foto pessoal, lifestyle, prova social, bastidores, etc.), qualidade de produção e coerência com a marca pessoal.

IMPORTANTE: Use as imagens como fonte principal de análise visual. As legendas e métricas complementam, mas a análise visual das imagens é o diferencial desta avaliação.`
    : '';

  const visualStructure = hasImages
    ? `
Foto de perfil (análise visual)
Avaliar qualidade da imagem, profissionalismo, alinhamento com posicionamento.
Se transmite autoridade e confiança para o público-alvo.

Grid visual dos posts
Avaliar consistência visual do feed (paleta de cores, estilo, qualidade).
Proporção entre tipos de conteúdo visual.
Coerência entre identidade visual e posicionamento desejado.
Qualidade de produção (amador vs profissional).

`
    : '';

  const user = `Com base nas informações abaixo, avalie a percepção de valor do perfil do Instagram em relação ao cliente ideal.

REGRAS IMPORTANTES:

Entregar nota de 0 a 100.

Não fazer análise acadêmica.

Não listar critérios técnicos.

Não explicar metodologia.

Não escrever como IA.

Linguagem direta, estratégica e objetiva.

Entregar apenas o que realmente está prejudicando ou potencializando a percepção de valor.

Se algo estiver bom, reconhecer brevemente.

Foco em ajuste prático.

Avaliar sempre com base na persona.

Nunca usar regra universal.

Considerar sinais implícitos de status, maturidade, autoridade e coerência com o público.${imageInstructions}

INFORMAÇÕES DISPONÍVEIS:

Persona:
${personaContent}

Foto de perfil:
${params.profilePicInfo}

Bio:
${bioContent}

Últimos 12 posts:
${params.posts}

ESTRUTURA OBRIGATÓRIA DA RESPOSTA:

Percepção de valor: X/100

Diagnóstico principal
Explicar em poucas linhas o que mais influencia a nota (positivo ou negativo).

Bio
Se estiver fraca, explicar por que reduz percepção de valor e sugerir uma frase melhor baseada no posicionamento.
Se estiver forte, explicar por que aumenta valor.

${visualStructure}Posts
Analisar a proporção dos 12 posts.
Explicar o que está desalinhado com o público.
Sugerir ajustes específicos (ex: mais família, mais prova social, menos ostentação, mais trabalho, mais sofisticação silenciosa, etc.).

Ajuste estratégico imediato
Listar de 2 a 5 ações práticas que aumentariam de 10 a 20 pontos na percepção de valor.

OBJETIVO FINAL:

Entregar uma análise cirúrgica, prática e aplicável imediatamente para aumentar a percepção de valor do perfil.

Sem enrolação.
Sem teoria.
Sem relatório técnico.`;

  return { system, user };
}
