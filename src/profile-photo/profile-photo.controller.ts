import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { ProfilePhotoService } from './profile-photo.service';
import { GenerateProfilePhotoDto } from './dto/generate-profile-photo.dto';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Controller('mentee/profile-photo')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mentee')
export class ProfilePhotoController {
  constructor(private readonly service: ProfilePhotoService) {}

  @Post('generate')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async generate(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: GenerateProfilePhotoDto,
  ) {
    if (!file) {
      throw new BadRequestException('Photo file is required');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('File must be JPEG, PNG, or WebP');
    }
    return this.service.generate(
      user.sub,
      file.buffer,
      file.mimetype,
      dto.gender,
    );
  }
}
