export interface PerceptionStructuredContent {
  score: number;
  diagnosticoPrincipal: string;
  bio: {
    avaliacao: string;
    sugestao: string | null;
  };
  fotoPerfil: {
    avaliacao: string;
  } | null;
  gridVisual: {
    avaliacao: string;
  } | null;
  posts: {
    avaliacao: string;
    ajustes: string[];
  };
  ajustesImediatos: string[];
}

export interface PerceptionAnalysisResponse {
  id: string;
  menteeId: string;
  score: number;
  rawResponse: string;
  structuredContent: PerceptionStructuredContent | null;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PerceptionErrorResponse {
  status: 'error';
  reason: 'no_instagram_data' | 'private_profile' | 'no_handle' | 'ai_failed';
  message: string;
}
