import { BadRequestException, Injectable } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInviteDto } from './dto/create-invite.dto';

const generateCode = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 6);

@Injectable()
export class InviteService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(mentorId: string, dto?: CreateInviteDto) {
    const code = generateCode();

    return this.prisma.inviteCode.create({
      data: {
        mentorId,
        code,
        menteeName: dto?.menteeName,
        menteeEmail: dto?.menteeEmail,
        forMenteeId: dto?.menteeId,
      },
    });
  }

  async listByMentor(mentorId: string) {
    return this.prisma.inviteCode.findMany({
      where: { mentorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(mentorId: string, inviteId: string) {
    const invite = await this.prisma.inviteCode.findFirst({
      where: { id: inviteId, mentorId },
    });

    if (!invite) {
      throw new BadRequestException('Invite not found');
    }

    if (invite.status !== 'ACTIVE') {
      throw new BadRequestException('Invite is not active');
    }

    return this.prisma.inviteCode.update({
      where: { id: inviteId },
      data: { status: 'EXPIRED' },
    });
  }
}
