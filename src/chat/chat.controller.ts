import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  HttpCode,
  Header,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mentee')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('conversations')
  async listConversations(@CurrentUser() user: JwtPayload) {
    return this.chatService.listConversations(user.sub);
  }

  @Get('conversations/:id')
  async getConversation(
    @CurrentUser() user: JwtPayload,
    @Param('id') conversationId: string,
  ) {
    return this.chatService.getConversation(user.sub, conversationId);
  }

  @Post()
  @HttpCode(200)
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  async chat(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendMessageDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Disable timeout for this SSE response
    res.setTimeout(0);

    const abortController = new AbortController();

    // Detect client disconnect
    req.on('close', () => {
      abortController.abort();
    });

    try {
      const { conversationId, stream } =
        await this.chatService.prepareAndStream(
          user.sub, // menteeId
          dto,
          abortController.signal,
        );

      // Send conversationId immediately (important for new conversations)
      res.write(
        `event: conversation\ndata: ${JSON.stringify({ conversationId })}\n\n`,
      );

      for await (const chunk of stream) {
        if (abortController.signal.aborted) break;
        res.write(
          `event: token\ndata: ${JSON.stringify({ content: chunk })}\n\n`,
        );
      }

      res.write(`event: done\ndata: ${JSON.stringify({ conversationId })}\n\n`);
    } catch (error) {
      if (!abortController.signal.aborted) {
        const message =
          error instanceof Error ? error.message : 'Internal error';
        res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
      }
    } finally {
      res.end();
    }
  }
}
