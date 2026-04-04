import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
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
import { MenteeService } from './mentee.service';
import { UpdateMenteeProfileDto } from './dto/update-mentee-profile.dto';

@Controller('mentee')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mentee')
export class MenteeController {
  constructor(private readonly menteeService: MenteeService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.menteeService.getProfile(user.sub);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateMenteeProfileDto,
  ) {
    return this.menteeService.updateProfile(user.sub, dto);
  }

  @Delete('account')
  deleteAccount(@CurrentUser() user: JwtPayload) {
    return this.menteeService.deleteAccount(user.sub);
  }

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const url = await this.menteeService.uploadAvatar(
      user.sub,
      file.buffer,
      file.mimetype,
    );
    await this.menteeService.updateProfile(user.sub, { avatarUrl: url });
    return { url };
  }
}
