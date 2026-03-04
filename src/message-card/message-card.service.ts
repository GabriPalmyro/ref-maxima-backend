import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessageCardService {
  constructor(private readonly prisma: PrismaService) {}

  async getCards(menteeId: string) {
    return this.prisma.messageCard.findMany({
      where: { menteeId },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
