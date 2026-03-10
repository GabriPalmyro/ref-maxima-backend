import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { SendMessageDto } from './dto/send-message.dto';
import { buildChatSystemPrompt } from './prompts/coach-persona.prompt';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async listConversations(menteeId: string) {
    return this.prisma.conversation.findMany({
      where: { menteeId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async getConversation(menteeId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.menteeId !== menteeId) {
      throw new ForbiddenException('Access denied');
    }

    return conversation;
  }

  async deleteConversation(menteeId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.menteeId !== menteeId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.conversation.delete({
      where: { id: conversationId },
    });

    return { deleted: true };
  }

  async prepareAndStream(
    menteeId: string,
    dto: SendMessageDto,
    signal: AbortSignal,
  ): Promise<{ conversationId: string; stream: AsyncGenerator<string> }> {
    // 1. Get or create conversation
    let conversation: {
      id: string;
      topic: string | null;
      summary: string | null;
    };

    if (dto.conversationId) {
      const existing = await this.prisma.conversation.findUnique({
        where: { id: dto.conversationId },
        select: { id: true, menteeId: true, topic: true, summary: true },
      });

      if (!existing || existing.menteeId !== menteeId) {
        throw new ForbiddenException('Conversation not found or access denied');
      }

      conversation = existing;
    } else {
      conversation = await this.prisma.conversation.create({
        data: { menteeId, topic: dto.topic ?? null },
        select: { id: true, topic: true, summary: true },
      });
    }

    // 2. Save user message
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: dto.message,
      },
    });

    // 3. Build system prompt from coaching reports
    const reports = await this.prisma.generatedReport.findMany({
      where: { menteeId, status: 'COMPLETED' },
      select: { type: true, rawResponse: true },
    });

    const reportMap = new Map(reports.map((r) => [r.type, r.rawResponse]));
    const systemPrompt = buildChatSystemPrompt(
      reportMap.get('PERSONA_ICP') ?? null,
      reportMap.get('POSICIONAMENTO') ?? null,
      reportMap.get('MENSAGEM_CLARA') ?? null,
      conversation.topic ?? undefined,
      conversation.summary ?? undefined,
    );

    // 4. Build message context (sliding window)
    const messageContext = await this.buildMessageContext(
      conversation.id,
      conversation.summary,
    );

    // 5. Combine system prompt + message context
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messageContext,
    ];

    // 6. Return conversationId and stream
    return {
      conversationId: conversation.id,
      stream: this.streamAndPersist(conversation.id, fullMessages, signal),
    };
  }

  private async *streamAndPersist(
    conversationId: string,
    fullMessages: Array<{ role: string; content: string }>,
    signal: AbortSignal,
  ): AsyncGenerator<string> {
    let fullResponse = '';
    try {
      for await (const chunk of this.aiService.generateStreamingCompletion(
        fullMessages,
        signal,
      )) {
        fullResponse += chunk;
        yield chunk;
      }
    } finally {
      // Save assistant message (even partial on abort)
      if (fullResponse) {
        await this.prisma.message.create({
          data: {
            conversationId,
            role: 'ASSISTANT',
            content: fullResponse,
          },
        });
        // Check and trigger summarization
        await this.summarizeOverflow(conversationId);
      }
    }
  }

  private async buildMessageContext(
    conversationId: string,
    summary: string | null,
  ): Promise<Array<{ role: string; content: string }>> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { role: true, content: true },
    });

    // Reverse to chronological order
    messages.reverse();

    const context: Array<{ role: string; content: string }> = [];

    // Prepend summary if exists
    if (summary) {
      context.push({
        role: 'system',
        content: 'Resumo da conversa anterior:\n' + summary,
      });
    }

    // Map messages
    for (const m of messages) {
      context.push({ role: m.role.toLowerCase(), content: m.content });
    }

    return context;
  }

  private async summarizeOverflow(conversationId: string): Promise<void> {
    const totalCount = await this.prisma.message.count({
      where: { conversationId },
    });

    if (totalCount <= 10) return;

    // Load conversation's current summary
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { summary: true },
    });

    // Load messages OLDER than the 10 most recent
    const newestMessages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true },
    });

    const newestIds = newestMessages.map((m) => m.id);

    const oldMessages = await this.prisma.message.findMany({
      where: {
        conversationId,
        id: { notIn: newestIds },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true },
    });

    if (oldMessages.length === 0) return;

    // Build summarization prompt
    const formattedMessages = oldMessages
      .map((m) => {
        const label = m.role === 'USER' ? 'Mentee' : 'Coach';
        return `${label}: ${m.content}`;
      })
      .join('\n');

    const existingSummary = conversation?.summary;

    const summaryUserPrompt = existingSummary
      ? `Resumo anterior:\n${existingSummary}\n\nMensagens novas:\n${formattedMessages}`
      : formattedMessages;

    const summarySystemPrompt =
      'Resuma a seguinte conversa em no maximo 300 palavras em portugues. Mantenha os pontos-chave, decisoes e contexto importante. Substitua completamente qualquer resumo anterior.';

    // Call non-streaming AI completion
    const result = await this.aiService.generateCompletion(
      summarySystemPrompt,
      summaryUserPrompt,
    );

    // Update conversation summary
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { summary: result.content },
    });

    // Delete old messages that were summarized
    const oldMessageIds = oldMessages.map((m) => m.id);
    await this.prisma.message.deleteMany({
      where: { id: { in: oldMessageIds } },
    });
  }
}
