import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MessageCardType, OnboardingStatus, ReportType } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { CorrectReportDto } from './dto/correct-report.dto';
import { GenerateReportDto } from './dto/generate-report.dto';
import { buildHeadlinesPrompt } from './prompts/gerar-headlines.prompt';
import { buildPrompt as mensagemClaraPrompt } from './prompts/mensagem-clara.prompt';
import { buildPrompt as personaIcpPrompt } from './prompts/persona-icp.prompt';
import { buildPrompt as posicionamentoPrompt } from './prompts/posicionamento.prompt';

const CARD_SORT_ORDER: Record<MessageCardType, number> = {
  DESEJO: 1,
  PROBLEMA: 2,
  GUIA: 3,
  PLANO: 4,
  CONVITE: 5,
  SUCESSO: 6,
  FRACASSO: 7,
};

const REPORT_TITLES: Record<ReportType, string> = {
  PERSONA_ICP: 'Cliente dos Sonhos',
  POSICIONAMENTO: 'Posicionamento',
  MENSAGEM_CLARA: 'Mensagem Clara',
};

const ONBOARDING_AFTER_REPORT: Record<ReportType, OnboardingStatus> = {
  PERSONA_ICP: 'PHASE_1',
  POSICIONAMENTO: 'PHASE_2',
  MENSAGEM_CLARA: 'COMPLETED',
};

const VALID_CARD_TYPES = new Set<string>(Object.values(MessageCardType));

/**
 * Extracts and parses JSON from AI response.
 * Handles code fences and trailing text after the JSON object/array.
 */
function parseAiJson(content: string): unknown {
  let text = content.trim();

  // Strip code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  // Find the first JSON object or array boundary and slice to its matching close
  const start = text.search(/[{[]/);
  if (start !== -1) {
    const opener = text[start];
    const closer = opener === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === opener) depth++;
      else if (ch === closer) {
        depth--;
        if (depth === 0) {
          text = text.slice(start, i + 1);
          break;
        }
      }
    }
  }

  return JSON.parse(text);
}

@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async generateReport(menteeId: string, dto: GenerateReportDto) {
    const existing = await this.prisma.generatedReport.findUnique({
      where: { menteeId_type: { menteeId, type: dto.type } },
    });

    if (existing) {
      if (existing.status === 'COMPLETED') {
        throw new ConflictException('Report of this type already exists');
      }
      if (existing.status === 'ERROR') {
        await this.prisma.generatedReport.delete({
          where: { id: existing.id },
        });
      }
    }

    let system: string;
    let user: string;

    if (dto.type === 'PERSONA_ICP') {
      const built = personaIcpPrompt(dto.answers);
      system = built.system;
      user = built.user;
    } else if (dto.type === 'POSICIONAMENTO') {
      const mentee = await this.prisma.mentee.findUnique({
        where: { id: menteeId },
      });
      const personaReport = await this.getCompletedReport(
        menteeId,
        'PERSONA_ICP',
      );
      const built = posicionamentoPrompt({
        nome: mentee!.name,
        persona: personaReport.rawResponse!,
        headline: dto.answers.headline,
      });
      system = built.system;
      user = built.user;
    } else {
      // MENSAGEM_CLARA
      const mentee = await this.prisma.mentee.findUnique({
        where: { id: menteeId },
      });
      const personaReport = await this.getCompletedReport(
        menteeId,
        'PERSONA_ICP',
      );
      const posReport = await this.getCompletedReport(
        menteeId,
        'POSICIONAMENTO',
      );
      const posAnswers = posReport.answers as Record<string, string>;
      const personaAnswers = personaReport.answers as Record<string, string>;
      const built = mensagemClaraPrompt({
        nome: mentee!.name,
        persona: personaReport.rawResponse!,
        headline: posAnswers.headline,
        pilares: personaAnswers.q5,
        momento_dificil: dto.answers.momento_dificil,
      });
      system = built.system;
      user = built.user;
    }

    const report = await this.prisma.generatedReport.create({
      data: {
        menteeId,
        type: dto.type,
        title: REPORT_TITLES[dto.type],
        status: 'PROCESSING',
        answers: dto.answers,
      },
    });

    try {
      const aiResult = await this.aiService.generateCompletion(system, user);
      const parsed = parseAiJson(aiResult.content);

      // Create message cards for MENSAGEM_CLARA
      if (dto.type === 'MENSAGEM_CLARA') {
        const data = parsed as {
          cards: Array<{
            type: string;
            title: string;
            subtitle?: string;
            bodyText: string;
            bulletPoints?: string[];
          }>;
        };
        if (data.cards) {
          await Promise.all(
            data.cards
              .filter((card) => VALID_CARD_TYPES.has(card.type))
              .map((card) =>
                this.prisma.messageCard.create({
                  data: {
                    reportId: report.id,
                    menteeId,
                    cardType: card.type as MessageCardType,
                    sortOrder: CARD_SORT_ORDER[card.type as MessageCardType],
                    title: card.title,
                    subtitle: card.subtitle,
                    bodyText: card.bodyText,
                    bulletPoints: card.bulletPoints,
                  },
                }),
              ),
          );
        }
      }

      const updated = await this.prisma.generatedReport.update({
        where: { id: report.id },
        data: {
          status: 'COMPLETED',
          rawResponse: aiResult.content,
          structuredContent: parsed as any,
          modelUsed: aiResult.model,
        },
        include: { messageCards: { orderBy: { sortOrder: 'asc' } } },
      });

      await this.prisma.mentee.update({
        where: { id: menteeId },
        data: {
          onboardingStatus: ONBOARDING_AFTER_REPORT[dto.type],
        },
      });

      return updated;
    } catch (error) {
      await this.prisma.generatedReport.update({
        where: { id: report.id },
        data: {
          status: 'ERROR',
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  async correctReport(
    menteeId: string,
    reportId: string,
    dto: CorrectReportDto,
  ) {
    const existing = await this.prisma.generatedReport.findFirst({
      where: { id: reportId, menteeId },
      include: { messageCards: true },
    });

    if (!existing) {
      throw new NotFoundException('Report not found');
    }

    if (existing.status !== 'COMPLETED') {
      throw new ConflictException('Only completed reports can be corrected');
    }

    // Rebuild original prompts
    const { system, user } = await this.rebuildPrompts(
      menteeId,
      existing.type as ReportType,
      existing.answers as Record<string, string>,
    );

    // Delete old message cards if MENSAGEM_CLARA
    if (existing.type === 'MENSAGEM_CLARA' && existing.messageCards.length > 0) {
      await this.prisma.messageCard.deleteMany({
        where: { reportId: existing.id },
      });
    }

    // Mark as PROCESSING
    await this.prisma.generatedReport.update({
      where: { id: existing.id },
      data: { status: 'PROCESSING', errorMessage: null },
    });

    try {
      const aiResult = await this.aiService.generateCompletionWithHistory([
        { role: 'system', content: system },
        { role: 'user', content: user },
        { role: 'assistant', content: existing.rawResponse! },
        {
          role: 'user',
          content: `O mentor revisou o relatório acima e pediu a seguinte correção:\n\n"${dto.correction}"\n\nPor favor, gere novamente o relatório completo no mesmo formato JSON, aplicando a correção solicitada. Mantenha todas as seções e a mesma estrutura. Responda APENAS com o JSON corrigido.`,
        },
      ]);

      const parsed = parseAiJson(aiResult.content);

      // Recreate message cards for MENSAGEM_CLARA
      if (existing.type === 'MENSAGEM_CLARA') {
        const data = parsed as {
          cards: Array<{
            type: string;
            title: string;
            subtitle?: string;
            bodyText: string;
            bulletPoints?: string[];
          }>;
        };
        if (data.cards) {
          await Promise.all(
            data.cards
              .filter((card) => VALID_CARD_TYPES.has(card.type))
              .map((card) =>
                this.prisma.messageCard.create({
                  data: {
                    reportId: existing.id,
                    menteeId,
                    cardType: card.type as MessageCardType,
                    sortOrder: CARD_SORT_ORDER[card.type as MessageCardType],
                    title: card.title,
                    subtitle: card.subtitle,
                    bodyText: card.bodyText,
                    bulletPoints: card.bulletPoints,
                  },
                }),
              ),
          );
        }
      }

      const updated = await this.prisma.generatedReport.update({
        where: { id: existing.id },
        data: {
          status: 'COMPLETED',
          rawResponse: aiResult.content,
          structuredContent: parsed as any,
          modelUsed: aiResult.model,
          version: { increment: 1 },
        },
        include: { messageCards: { orderBy: { sortOrder: 'asc' } } },
      });

      return updated;
    } catch (error) {
      await this.prisma.generatedReport.update({
        where: { id: existing.id },
        data: {
          status: 'ERROR',
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  async getReports(menteeId: string) {
    return this.prisma.generatedReport.findMany({
      where: { menteeId },
      orderBy: { generatedAt: 'asc' },
    });
  }

  async getReport(menteeId: string, reportId: string) {
    const report = await this.prisma.generatedReport.findFirst({
      where: { id: reportId, menteeId },
      include: { messageCards: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  private async rebuildPrompts(
    menteeId: string,
    type: ReportType,
    answers: Record<string, string>,
  ): Promise<{ system: string; user: string }> {
    if (type === 'PERSONA_ICP') {
      return personaIcpPrompt(answers);
    }

    if (type === 'POSICIONAMENTO') {
      const mentee = await this.prisma.mentee.findUnique({
        where: { id: menteeId },
      });
      const personaReport = await this.getCompletedReport(
        menteeId,
        'PERSONA_ICP',
      );
      return posicionamentoPrompt({
        nome: mentee!.name,
        persona: personaReport.rawResponse!,
        headline: answers.headline,
      });
    }

    // MENSAGEM_CLARA
    const mentee = await this.prisma.mentee.findUnique({
      where: { id: menteeId },
    });
    const personaReport = await this.getCompletedReport(
      menteeId,
      'PERSONA_ICP',
    );
    const posReport = await this.getCompletedReport(menteeId, 'POSICIONAMENTO');
    const posAnswers = posReport.answers as Record<string, string>;
    const personaAnswers = personaReport.answers as Record<string, string>;
    return mensagemClaraPrompt({
      nome: mentee!.name,
      persona: personaReport.rawResponse!,
      headline: posAnswers.headline,
      pilares: personaAnswers.q5,
      momento_dificil: answers.momento_dificil,
    });
  }

  private async getCompletedReport(menteeId: string, type: ReportType) {
    const report = await this.prisma.generatedReport.findUnique({
      where: { menteeId_type: { menteeId, type } },
    });
    if (!report || report.status !== 'COMPLETED') {
      throw new NotFoundException(
        `Report ${type} must be completed before proceeding`,
      );
    }
    return report;
  }

  async generateHeadlines(
    menteeId: string,
    regenerate = false,
  ): Promise<{ headlines: string[] }> {
    const personaReport = await this.getCompletedReport(
      menteeId,
      'PERSONA_ICP',
    );

    // Return cached headlines if already generated (unless regenerating)
    if (!regenerate) {
      const structured = personaReport.structuredContent as {
        headlines?: string[];
      } | null;
      if (structured?.headlines?.length) {
        return { headlines: structured.headlines };
      }
    }

    const { system, user } = buildHeadlinesPrompt(personaReport.rawResponse!);
    const aiResult = await this.aiService.generateCompletion(system, user);

    const headlines = aiResult.content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Merge headlines into existing structuredContent (don't overwrite persona JSON)
    const existingContent =
      (personaReport.structuredContent as Record<string, unknown>) ?? {};
    await this.prisma.generatedReport.update({
      where: { id: personaReport.id },
      data: { structuredContent: { ...existingContent, headlines } },
    });

    return { headlines };
  }
}
