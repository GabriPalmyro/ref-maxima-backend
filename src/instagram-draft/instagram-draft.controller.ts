import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { InstagramDraftService } from './instagram-draft.service';
import { UpdateDraftDto } from './dto/update-draft.dto';

@Controller('mentee/instagram-draft')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mentee')
export class InstagramDraftController {
  constructor(private readonly draftService: InstagramDraftService) {}

  @Get()
  async getDraft(@CurrentUser() user: JwtPayload) {
    return this.draftService.getDraft(user.sub);
  }

  @Put()
  async updateDraft(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateDraftDto,
  ) {
    return this.draftService.updateDraft(user.sub, dto);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    }),
  )
  async uploadImage(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type: 'profile' | 'post',
  ) {
    const url = await this.draftService.uploadImage(
      user.sub,
      file.buffer,
      file.mimetype,
      type || 'post',
    );
    return { url };
  }

  @Post('seed')
  async seedFromScraped(@CurrentUser() user: JwtPayload) {
    return this.draftService.seedFromScrapedData(user.sub);
  }

  @Delete()
  async deleteDraft(@CurrentUser() user: JwtPayload) {
    await this.draftService.deleteDraft(user.sub);
    return { deleted: true };
  }
}
