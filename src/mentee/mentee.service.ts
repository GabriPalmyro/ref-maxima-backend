import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  STORAGE_PROVIDER,
  StorageProvider,
} from '../storage/storage.interface';
import { UpdateMenteeProfileDto } from './dto/update-mentee-profile.dto';

@Injectable()
export class MenteeService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async getProfile(menteeId: string) {
    const mentee = await this.prisma.mentee.findUnique({
      where: { id: menteeId },
      select: {
        id: true,
        name: true,
        email: true,
        instagram: true,
        avatarUrl: true,
        phone: true,
        onboardingStatus: true,
        createdAt: true,
        mentor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!mentee) throw new NotFoundException('Mentee not found');
    return mentee;
  }

  async updateProfile(menteeId: string, dto: UpdateMenteeProfileDto) {
    const mentee = await this.prisma.mentee.findUnique({
      where: { id: menteeId },
    });

    if (!mentee) throw new NotFoundException('Mentee not found');

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
      },
    });
  }

  async uploadAvatar(
    menteeId: string,
    file: Buffer,
    contentType: string,
  ): Promise<string> {
    const path = `avatars/mentee-${menteeId}`;
    return this.storage.upload(path, file, contentType);
  }
}
