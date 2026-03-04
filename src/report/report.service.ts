import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MessageCardType, OnboardingStatus, ReportType } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
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

      if (dto.type === 'MENSAGEM_CLARA') {
        const jsonMatch = aiResult.content.match(/```json\s*([\s\S]*?)```/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          await Promise.all(
            parsed.cards
              .filter((card: { type: string }) =>
                VALID_CARD_TYPES.has(card.type),
              )
              .map(
                (card: {
                  type: MessageCardType;
                  title: string;
                  subtitle?: string;
                  bodyText: string;
                  bulletPoints?: string[];
                }) =>
                  this.prisma.messageCard.create({
                    data: {
                      reportId: report.id,
                      menteeId,
                      cardType: card.type,
                      sortOrder: CARD_SORT_ORDER[card.type],
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

    await this.prisma.generatedReport.update({
      where: { id: personaReport.id },
      data: { structuredContent: { headlines } },
    });

    return { headlines };
  }
}
