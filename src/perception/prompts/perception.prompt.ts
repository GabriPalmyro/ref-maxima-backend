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

  const system = `Você é um estrategista de posicionamento premium especializado em percepção de valor e autoridade digital.

REGRA ABSOLUTA: Responda EXCLUSIVAMENTE com um objeto JSON válido. Sem texto antes ou depois do JSON. Sem markdown. Sem code fences. Apenas o JSON puro.`;

  const imageInstructions = hasImages
    ? `

IMAGENS DISPONÍVEIS PARA ANÁLISE VISUAL:

Imagem 1 — Foto de perfil: Você está recebendo a foto de perfil do Instagram. Analise qualidade, profissionalismo, iluminação, enquadramento e alinhamento com o posicionamento da persona.

Imagem 2 — Grid dos últimos 12 posts: Você está recebendo uma montagem 4x3 com os últimos 12 posts do perfil. Analise consistência visual, paleta de cores, estilo fotográfico, proporção entre tipos de conteúdo (carrossel, foto pessoal, lifestyle, prova social, bastidores, etc.), qualidade de produção e coerência com a marca pessoal.

IMPORTANTE: Use as imagens como fonte principal de análise visual. As legendas e métricas complementam, mas a análise visual das imagens é o diferencial desta avaliação.`
    : '';

  const fotoPerfilField = hasImages
    ? `"fotoPerfil": {
      "avaliacao": "Análise da foto de perfil: qualidade, profissionalismo, alinhamento com posicionamento. Se transmite autoridade e confiança para o público-alvo."
    }`
    : `"fotoPerfil": null`;

  const gridVisualField = hasImages
    ? `"gridVisual": {
      "avaliacao": "Análise do grid visual: consistência visual do feed (paleta de cores, estilo, qualidade), proporção entre tipos de conteúdo visual, coerência entre identidade visual e posicionamento, qualidade de produção."
    }`
    : `"gridVisual": null`;

  const user = `Com base nas informações abaixo, avalie a percepção de valor do perfil do Instagram em relação ao cliente ideal.

REGRAS IMPORTANTES:

- Nota de 0 a 100. NUNCA acima de 100. NUNCA abaixo de 0.
  - 0-20: Perfil muito fraco, sem posicionamento
  - 21-40: Perfil fraco, posicionamento confuso
  - 41-60: Perfil mediano, tem potencial mas precisa de ajustes
  - 61-80: Perfil bom, posicionamento claro com ajustes pontuais
  - 81-100: Perfil excelente, posicionamento premium consolidado
- Não fazer análise acadêmica.
- Não listar critérios técnicos.
- Não explicar metodologia.
- Não escrever como IA.
- Linguagem direta, estratégica e objetiva.
- Entregar apenas o que realmente está prejudicando ou potencializando a percepção de valor.
- Se algo estiver bom, reconhecer brevemente.
- Foco em ajuste prático.
- Avaliar sempre com base na persona.
- Nunca usar regra universal.
- Considerar sinais implícitos de status, maturidade, autoridade e coerência com o público.${imageInstructions}

INFORMAÇÕES DISPONÍVEIS:

Persona:
${personaContent}

Foto de perfil:
${params.profilePicInfo}

Bio:
${bioContent}

Últimos 12 posts:
${params.posts}

RESPONDA EXCLUSIVAMENTE com o seguinte JSON (sem texto extra, sem markdown, sem code fences):

{
  "score": <número inteiro de 0 a 100>,
  "diagnosticoPrincipal": "Explicar em poucas linhas o que mais influencia a nota (positivo ou negativo).",
  "bio": {
    "avaliacao": "Se estiver fraca, explicar por que reduz percepção de valor. Se estiver forte, explicar por que aumenta valor.",
    "sugestao": "Sugerir uma frase melhor baseada no posicionamento, ou null se a bio já estiver boa."
  },
  ${fotoPerfilField},
  ${gridVisualField},
  "posts": {
    "avaliacao": "Analisar a proporção dos 12 posts. Explicar o que está desalinhado com o público.",
    "ajustes": ["ajuste específico 1", "ajuste específico 2"]
  },
  "ajustesImediatos": ["ação prática 1 que aumentaria 10-20 pontos", "ação prática 2", "...de 2 a 5 ações"]
}

LEMBRE-SE: score DEVE ser um número inteiro entre 0 e 100. Os campos de texto devem conter a análise real, não as instruções acima.`;

  return { system, user };
}
