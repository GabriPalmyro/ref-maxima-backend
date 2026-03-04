export interface PerceptionAnalysisResponse {
  id: string;
  menteeId: string;
  score: number;
  rawResponse: string;
  status: string; // 'COMPLETED' | 'ERROR' | 'PROCESSING'
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PerceptionErrorResponse {
  status: 'error';
  reason: 'no_instagram_data' | 'private_profile' | 'no_handle' | 'ai_failed';
  message: string;
}
