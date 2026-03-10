import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  STORAGE_PROVIDER,
  StorageProvider,
} from '../storage/storage.interface';
import { GeminiImageService } from './gemini-image.service';
import { MALE_PROFILE_PHOTO_PROMPT } from './prompts/male-prompt';
import { FEMALE_PROFILE_PHOTO_PROMPT } from './prompts/female-prompt';

@Injectable()
export class ProfilePhotoService {
  private readonly logger = new Logger(ProfilePhotoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiImageService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async generate(
    menteeId: string,
    photo: Buffer,
    mimeType: string,
    gender: string,
  ) {
    // 1. Upload original
    const originalPath = `profile-photos/original/${menteeId}-${Date.now()}`;
    const originalUrl = await this.storage.upload(
      originalPath,
      photo,
      mimeType,
    );
    this.logger.log(`Original uploaded: ${originalPath}`);

    // 2. Call Gemini
    const prompt =
      gender === 'male'
        ? MALE_PROFILE_PHOTO_PROMPT
        : FEMALE_PROFILE_PHOTO_PROMPT;

    const generatedBuffer = await this.gemini.generateImage(
      prompt,
      photo,
      mimeType,
    );

    // 3. Upload generated
    const generatedPath = `profile-photos/generated/${menteeId}-${Date.now()}.png`;
    const generatedUrl = await this.storage.upload(
      generatedPath,
      generatedBuffer,
      'image/png',
    );
    this.logger.log(`Generated uploaded: ${generatedPath}`);

    // 4. Save to DB
    const record = await this.prisma.generatedProfilePhoto.create({
      data: {
        menteeId,
        gender,
        originalUrl,
        generatedUrl,
      },
    });

    return {
      id: record.id,
      originalUrl: record.originalUrl,
      generatedUrl: record.generatedUrl,
      createdAt: record.createdAt,
    };
  }
}
