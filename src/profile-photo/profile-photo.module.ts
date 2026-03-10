import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfilePhotoController } from './profile-photo.controller';
import { ProfilePhotoService } from './profile-photo.service';
import { GeminiImageService } from './gemini-image.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProfilePhotoController],
  providers: [ProfilePhotoService, GeminiImageService],
})
export class ProfilePhotoModule {}
