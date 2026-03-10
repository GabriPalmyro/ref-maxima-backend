import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateReportDto } from '../report/dto/generate-report.dto';
import { ReportService } from '../report/report.service';
import { InviteService } from '../invite/invite.service';
import { CreateMenteeDto } from './dto/create-mentee.dto';
import { UpdateMenteeDto } from './dto/update-mentee.dto';
import { UpdateMentorDto } from './dto/update-mentor.dto';
import {
  STORAGE_PROVIDER,
  StorageProvider,
} from '../storage/storage.interface';

@Injectable()
export class MentorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportService: ReportService,
    private readonly inviteService: InviteService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async getProfile(mentorId: string) {
    const mentor = await this.prisma.mentor.findUnique({
      where: { id: mentorId },
    });

    if (!mentor) return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...profile } = mentor;
    return profile;
  }

  async updateProfile(mentorId: string, dto: UpdateMentorDto) {
    return this.prisma.mentor.update({
      where: { id: mentorId },
      data: dto,
      select: {
        id: true,
        email: true,
        authProvider: true,
        googleId: true,
        name: true,
        avatarUrl: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async listMentees(mentorId: string) {
    return this.prisma.mentee.findMany({
      where: { mentorId, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        instagram: true,
        onboardingStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMentee(mentorId: string, dto: CreateMenteeDto) {
    let mentee;

    try {
      mentee = await this.prisma.mentee.create({
        data: {
          mentorId,
          authProvider: 'MENTOR_CREATED',
          socialId: randomUUID(),
          name: dto.name,
          email: dto.email,
          avatarUrl: dto.avatarUrl,
          phone: dto.phone,
          instagram: dto.instagram,
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          instagram: true,
          onboardingStatus: true,
          createdAt: true,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const fields = (err.meta?.target as string[] | undefined) ?? [];
        if (fields.includes('email')) {
          throw new ConflictException('email already exists');
        }
      }
      throw err;
    }

    await this.inviteService.generate(mentorId, {
      menteeName: mentee.name,
      menteeEmail: mentee.email,
      menteeId: mentee.id,
    });

    return mentee;
  }

  async updateMentee(mentorId: string, menteeId: string, dto: UpdateMenteeDto) {
    await this.verifyMenteeBelongsToMentor(mentorId, menteeId);
    return this.prisma.mentee.update({
      where: { id: menteeId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.instagram !== undefined && { instagram: dto.instagram }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        instagram: true,
        avatarUrl: true,
        phone: true,
        onboardingStatus: true,
        createdAt: true,
      },
    });
  }

  async deleteMentee(mentorId: string, menteeId: string): Promise<void> {
    await this.verifyMenteeBelongsToMentor(mentorId, menteeId);
    await this.prisma.$transaction([
      this.prisma.inviteCode.deleteMany({ where: { forMenteeId: menteeId } }),
      this.prisma.mentee.delete({ where: { id: menteeId } }),
    ]);
  }

  async getMenteeDetail(mentorId: string, menteeId: string) {
    return this.prisma.mentee.findFirst({
      where: { id: menteeId, mentorId },
      include: {
        reports: {
          select: {
            id: true,
            type: true,
            status: true,
            title: true,
            generatedAt: true,
          },
        },
        _count: {
          select: { messageCards: true },
        },
      },
    });
  }

  private async verifyMenteeBelongsToMentor(
    mentorId: string,
    menteeId: string,
  ) {
    const mentee = await this.prisma.mentee.findFirst({
      where: { id: menteeId, mentorId },
    });
    if (!mentee) {
      throw new NotFoundException('Mentee not found');
    }
    return mentee;
  }

  async getMenteeReports(mentorId: string, menteeId: string) {
    await this.verifyMenteeBelongsToMentor(mentorId, menteeId);
    return this.prisma.generatedReport.findMany({
      where: { menteeId },
      orderBy: { generatedAt: 'asc' },
    });
  }

  async getMenteeReport(mentorId: string, menteeId: string, reportId: string) {
    await this.verifyMenteeBelongsToMentor(mentorId, menteeId);
    const report = await this.prisma.generatedReport.findFirst({
      where: { id: reportId, menteeId },
      include: { messageCards: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    return report;
  }

  async getMenteeCards(mentorId: string, menteeId: string) {
    await this.verifyMenteeBelongsToMentor(mentorId, menteeId);
    return this.prisma.messageCard.findMany({
      where: { menteeId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async verifyAndGenerate(
    mentorId: string,
    menteeId: string,
    dto: GenerateReportDto,
  ) {
    await this.verifyMenteeBelongsToMentor(mentorId, menteeId);
    return this.reportService.generateReport(menteeId, dto);
  }

  async generateHeadlines(
    mentorId: string,
    menteeId: string,
    regenerate = false,
  ) {
    await this.verifyMenteeBelongsToMentor(mentorId, menteeId);
    return this.reportService.generateHeadlines(menteeId, regenerate);
  }

  async uploadMentorAvatar(
    mentorId: string,
    file: Buffer,
    contentType: string,
  ): Promise<{ url: string }> {
    const path = `avatars/mentors/${mentorId}`;
    const url = await this.storage.upload(path, file, contentType);
    await this.prisma.mentor.update({
      where: { id: mentorId },
      data: { avatarUrl: url },
    });
    return { url };
  }

  async uploadMenteeAvatar(
    mentorId: string,
    menteeId: string,
    file: Buffer,
    contentType: string,
  ): Promise<{ url: string }> {
    await this.verifyMenteeBelongsToMentor(mentorId, menteeId);
    const path = `avatars/mentees/${menteeId}`;
    const url = await this.storage.upload(path, file, contentType);
    await this.prisma.mentee.update({
      where: { id: menteeId },
      data: { avatarUrl: url },
    });
    return { url };
  }
}
