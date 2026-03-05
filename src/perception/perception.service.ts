import { Injectable, Logger } from '@nestjs/common';
import { PerceptionAnalysis } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import {
  InstagramPostData,
  InstagramProfileData,
} from '../instagram/dto/instagram-profile.dto';
import { InstagramService } from '../instagram/instagram.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  PerceptionAnalysisResponse,
  PerceptionErrorResponse,
  PerceptionStructuredContent,
} from './dto/perception-analysis.dto';
import { ImageProcessingService } from './image-processing.service';
import { buildPerceptionPrompt } from './prompts/perception.prompt';

@Injectable()
export class PerceptionService {
  private readonly logger = new Logger(PerceptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly instagramService: InstagramService,
    private readonly imageProcessing: ImageProcessingService,
  ) {}

  /**
   * Analyze perception of value for a mentee's Instagram profile.
   *
   * Flow:
   * 1. Fetch Instagram data — return error if no handle, not_found, or private
   * 2. Fetch Persona ICP report — proceed with null if not available (graceful degradation)
   * 2b. Download and process images (profile pic + post grid)
   * 3. Build prompt with Instagram data + persona content
   * 4. Call AI (vision if images available, text-only fallback)
   * 5. Parse score from AI response via regex
   * 6. Upsert result in DB (latest per mentee)
   * 7. Return mapped response
   */
  async analyze(
    menteeId: string,
  ): Promise<PerceptionAnalysisResponse | PerceptionErrorResponse> {
    // 1. Force-refresh Instagram data and detect changes
    const instagramResult =
      await this.instagramService.forceRefreshAndDetectChanges(menteeId);

    if (instagramResult.status === 'no_handle') {
      return {
        status: 'error',
        reason: 'no_handle',
        message:
          'Nenhum perfil do Instagram encontrado. Adicione seu @handle para análise.',
      };
    }

    if (instagramResult.status === 'not_found') {
      return {
        status: 'error',
        reason: 'no_instagram_data',
        message: `Perfil @${instagramResult.username} não encontrado no Instagram.`,
      };
    }

    if (instagramResult.status === 'private') {
      return {
        status: 'error',
        reason: 'private_profile',
        message:
          'Perfil do Instagram é privado. Torne o perfil público para análise.',
      };
    }

    // At this point status is 'success' or 'error' with possible cached data
    let profile: InstagramProfileData | undefined;
    let posts: InstagramPostData[] = [];

    if (instagramResult.status === 'success') {
      profile = instagramResult.profile;
      posts = instagramResult.posts ?? [];
    } else if (
      instagramResult.status === 'error' &&
      instagramResult.cachedProfile
    ) {
      // Use stale cached data if available
      profile = instagramResult.cachedProfile;
      posts = instagramResult.cachedPosts ?? [];
    } else {
      return {
        status: 'error',
        reason: 'no_instagram_data',
        message:
          'Dados do Instagram não disponíveis. Tente novamente mais tarde.',
      };
    }

    // 1b. Change detection gate — skip AI if Instagram data unchanged
    if (!instagramResult.changed) {
      const existingAnalysis = await this.prisma.perceptionAnalysis.findUnique({
        where: { menteeId },
      });
      if (existingAnalysis && existingAnalysis.status === 'COMPLETED') {
        this.logger.log(
          `Instagram data unchanged for mentee ${menteeId} — returning cached perception analysis`,
        );
        return this.toResponse(existingAnalysis);
      }
      this.logger.log(
        `Instagram data unchanged for mentee ${menteeId} but no existing analysis — generating first one`,
      );
    } else {
      this.logger.log(
        `Instagram data changed for mentee ${menteeId} — re-running AI analysis`,
      );
    }

    // 2. Fetch Persona ICP report (graceful degradation if not available)
    let personaContent: string | null = null;
    try {
      const personaReport = await this.prisma.generatedReport.findUnique({
        where: {
          menteeId_type: {
            menteeId,
            type: 'PERSONA_ICP',
          },
        },
      });

      if (personaReport && personaReport.status === 'COMPLETED') {
        personaContent = personaReport.rawResponse;
      } else if (personaReport) {
        this.logger.debug(
          `Persona ICP report exists but status is ${personaReport.status} — proceeding without it`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Failed to fetch Persona ICP report for mentee ${menteeId}: ${err instanceof Error ? err.message : err}`,
      );
    }

    // 2b. Download and process images
    const images = await this.prepareImages(profile, posts);

    // 3. Build prompt variables
    const profilePicInfo = profile.profilePicUrl
      ? `Foto de perfil presente. Seguidores: ${profile.followerCount}, Seguindo: ${profile.followingCount}`
      : 'Sem foto de perfil HD disponível';

    const bio = profile.biography ?? '';

    const postsText =
      posts.length > 0
        ? posts
            .map(
              (post, i) =>
                `Post ${i + 1}:\nLegenda: ${post.caption ?? 'sem legenda'}\nCurtidas: ${post.likeCount}\nComentários: ${post.commentCount}`,
            )
            .join('\n\n')
        : 'Nenhum post disponível para análise';

    const { system, user } = buildPerceptionPrompt({
      persona: personaContent,
      profilePicInfo,
      bio,
      posts: postsText,
      hasImages: images.length > 0,
    });

    // 4. Call AI with retry (vision or text-only)
    let aiResult: { content: string; model: string } | null = null;
    let aiError: string | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        if (images.length > 0) {
          this.logger.log(
            `Sending vision request with ${images.length} image(s) for mentee ${menteeId} (attempt ${attempt}/2)`,
          );
          aiResult = await this.aiService.generateCompletionWithImages(
            system,
            user,
            images,
          );
        } else {
          this.logger.log(
            `Sending text-only request for mentee ${menteeId} (attempt ${attempt}/2)`,
          );
          aiResult = await this.aiService.generateCompletion(system, user);
        }
        break;
      } catch (err) {
        aiError = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `AI call attempt ${attempt}/2 failed for mentee ${menteeId}: ${aiError}`,
        );
      }
    }

    if (!aiResult) {
      // Store error record
      await this.prisma.perceptionAnalysis.upsert({
        where: { menteeId },
        create: {
          menteeId,
          score: 0,
          rawResponse: '',
          status: 'ERROR',
          errorMessage: aiError ?? 'AI call failed after 2 attempts',
        },
        update: {
          score: 0,
          rawResponse: '',
          status: 'ERROR',
          errorMessage: aiError ?? 'AI call failed after 2 attempts',
        },
      });

      return {
        status: 'error',
        reason: 'ai_failed',
        message: 'Falha ao gerar análise de percepção. Tente novamente.',
      };
    }

    // 5. Parse structured response from AI
    const { score, structured } = this.parseStructuredResponse(aiResult.content);

    // 6. Upsert result
    const record = await this.prisma.perceptionAnalysis.upsert({
      where: { menteeId },
      create: {
        menteeId,
        score,
        rawResponse: aiResult.content,
        structuredContent: structured as any,
        modelUsed: aiResult.model,
        status: 'COMPLETED',
        errorMessage: null,
      },
      update: {
        score,
        rawResponse: aiResult.content,
        structuredContent: structured as any,
        modelUsed: aiResult.model,
        status: 'COMPLETED',
        errorMessage: null,
      },
    });

    // 7. Return mapped response
    return this.toResponse(record);
  }

  /**
   * Get the stored perception analysis for a mentee.
   * Returns null if no analysis exists.
   */
  async getAnalysis(
    menteeId: string,
  ): Promise<PerceptionAnalysisResponse | null> {
    const record = await this.prisma.perceptionAnalysis.findUnique({
      where: { menteeId },
    });

    if (!record) {
      return null;
    }

    return this.toResponse(record);
  }

  // ==========================================================================
  // Private helpers
  // ==========================================================================

  /**
   * Download and process images for vision analysis.
   * Returns an array of { base64, mimeType } ready for the AI call.
   * Returns empty array if all images fail (graceful degradation to text-only).
   */
  private async prepareImages(
    profile: InstagramProfileData,
    posts: InstagramPostData[],
  ): Promise<Array<{ base64: string; mimeType: string }>> {
    const result: Array<{ base64: string; mimeType: string }> = [];

    // Download all images concurrently
    const postUrls = posts.slice(0, 12).map((p) => p.imageUrl);
    const [profilePicBuffer, ...postBuffers] = await Promise.all([
      profile.profilePicUrl
        ? this.imageProcessing.downloadImage(profile.profilePicUrl)
        : Promise.resolve(null),
      ...postUrls.map((url) => this.imageProcessing.downloadImage(url)),
    ]);

    const downloadedPostCount = postBuffers.filter(Boolean).length;
    this.logger.log(
      `Downloaded ${downloadedPostCount}/${postUrls.length} post images, profile pic: ${profilePicBuffer ? 'yes' : 'no'}`,
    );

    // Process profile pic
    if (profilePicBuffer) {
      try {
        const processed =
          await this.imageProcessing.processProfilePic(profilePicBuffer);
        result.push({
          base64: this.imageProcessing.toBase64(processed),
          mimeType: 'image/jpeg',
        });
      } catch (err) {
        this.logger.warn(
          `Failed to process profile pic: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    // Build grid if we have at least one post image
    if (downloadedPostCount > 0) {
      try {
        const grid = await this.imageProcessing.buildGrid(postBuffers);
        result.push({
          base64: this.imageProcessing.toBase64(grid),
          mimeType: 'image/jpeg',
        });
      } catch (err) {
        this.logger.warn(
          `Failed to build post grid: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    return result;
  }

  /**
   * Parse the structured JSON response from the AI.
   * Returns { score, structured } where score is clamped 0-100.
   * Falls back to regex score extraction if JSON parsing fails.
   */
  private parseStructuredResponse(text: string): {
    score: number;
    structured: PerceptionStructuredContent | null;
  } {
    // Try to extract JSON from the response (handle possible markdown fences)
    let jsonStr = text.trim();

    // Strip markdown code fences if present
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);

      // Clamp score to 0-100
      const rawScore =
        typeof parsed.score === 'number' ? parsed.score : parseInt(parsed.score, 10);
      const score = Math.min(100, Math.max(0, isNaN(rawScore) ? 0 : Math.round(rawScore)));

      const structured: PerceptionStructuredContent = {
        score,
        diagnosticoPrincipal: parsed.diagnosticoPrincipal ?? '',
        bio: {
          avaliacao: parsed.bio?.avaliacao ?? '',
          sugestao: parsed.bio?.sugestao ?? null,
        },
        fotoPerfil: parsed.fotoPerfil
          ? { avaliacao: parsed.fotoPerfil.avaliacao ?? '' }
          : null,
        gridVisual: parsed.gridVisual
          ? { avaliacao: parsed.gridVisual.avaliacao ?? '' }
          : null,
        posts: {
          avaliacao: parsed.posts?.avaliacao ?? '',
          ajustes: Array.isArray(parsed.posts?.ajustes) ? parsed.posts.ajustes : [],
        },
        ajustesImediatos: Array.isArray(parsed.ajustesImediatos)
          ? parsed.ajustesImediatos
          : [],
      };

      return { score, structured };
    } catch {
      this.logger.warn(
        'Failed to parse JSON from AI response — falling back to regex score extraction',
      );

      // Fallback: try regex for score
      const primaryMatch = text.match(
        /Percep[çc][ãa]o de valor:\s*(\d{1,3})\s*\/\s*100/i,
      );
      if (primaryMatch) {
        const s = Math.min(100, Math.max(0, parseInt(primaryMatch[1], 10)));
        return { score: s, structured: null };
      }

      const fallbackMatch = text.match(/(\d{1,3})\s*\/\s*100/);
      if (fallbackMatch) {
        const s = Math.min(100, Math.max(0, parseInt(fallbackMatch[1], 10)));
        return { score: s, structured: null };
      }

      this.logger.warn('Could not parse score from AI response — defaulting to 0');
      return { score: 0, structured: null };
    }
  }

  /**
   * Map a Prisma PerceptionAnalysis record to the response DTO.
   */
  private toResponse(record: PerceptionAnalysis): PerceptionAnalysisResponse {
    return {
      id: record.id,
      menteeId: record.menteeId,
      score: record.score,
      rawResponse: record.rawResponse,
      structuredContent:
        (record.structuredContent as unknown as PerceptionStructuredContent) ?? null,
      status: record.status,
      errorMessage: record.errorMessage,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
