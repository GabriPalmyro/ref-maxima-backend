import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { InstagramDraftService } from '../instagram-draft/instagram-draft.service';
import { GenerateReportDto } from '../report/dto/generate-report.dto';
import { CreateMenteeDto } from './dto/create-mentee.dto';
import { UpdateMentorDto } from './dto/update-mentor.dto';
import { MentorService } from './mentor.service';

@Controller('mentor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mentor')
export class MentorController {
  constructor(
    private readonly mentorService: MentorService,
    private readonly draftService: InstagramDraftService,
  ) {}

  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.mentorService.getProfile(user.sub);
  }

  @Put('profile')
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateMentorDto) {
    return this.mentorService.updateProfile(user.sub, dto);
  }

  @Post('profile/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadMentorAvatar(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.mentorService.uploadMentorAvatar(
      user.sub,
      file.buffer,
      file.mimetype,
    );
  }

  @Get('mentees')
  listMentees(@CurrentUser() user: JwtPayload) {
    return this.mentorService.listMentees(user.sub);
  }

  @Post('mentees')
  createMentee(@CurrentUser() user: JwtPayload, @Body() dto: CreateMenteeDto) {
    return this.mentorService.createMentee(user.sub, dto);
  }

  @Delete('mentees/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMentee(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.mentorService.deleteMentee(user.sub, id);
  }

  @Get('mentees/:id')
  getMenteeDetail(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.mentorService.getMenteeDetail(user.sub, id);
  }

  @Post('mentees/:menteeId/headlines/generate')
  generateHeadlines(
    @CurrentUser() user: JwtPayload,
    @Param('menteeId') menteeId: string,
    @Body() body: { regenerate?: boolean },
  ) {
    return this.mentorService.generateHeadlines(
      user.sub,
      menteeId,
      body?.regenerate === true,
    );
  }

  @Post('mentees/:menteeId/reports/generate')
  generateMenteeReport(
    @CurrentUser() user: JwtPayload,
    @Param('menteeId') menteeId: string,
    @Body() dto: GenerateReportDto,
  ) {
    return this.mentorService.verifyAndGenerate(user.sub, menteeId, dto);
  }

  @Get('mentees/:menteeId/reports')
  getMenteeReports(
    @CurrentUser() user: JwtPayload,
    @Param('menteeId') menteeId: string,
  ) {
    return this.mentorService.getMenteeReports(user.sub, menteeId);
  }

  @Get('mentees/:menteeId/reports/:reportId')
  getMenteeReport(
    @CurrentUser() user: JwtPayload,
    @Param('menteeId') menteeId: string,
    @Param('reportId') reportId: string,
  ) {
    return this.mentorService.getMenteeReport(user.sub, menteeId, reportId);
  }

  @Get('mentees/:menteeId/message-cards')
  getMenteeCards(
    @CurrentUser() user: JwtPayload,
    @Param('menteeId') menteeId: string,
  ) {
    return this.mentorService.getMenteeCards(user.sub, menteeId);
  }

  @Post('mentees/:id/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadMenteeAvatar(
    @CurrentUser() user: JwtPayload,
    @Param('id') menteeId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.mentorService.uploadMenteeAvatar(
      user.sub,
      menteeId,
      file.buffer,
      file.mimetype,
    );
  }

  @Get('mentees/:id/instagram-draft')
  async getMenteeInstagramDraft(
    @CurrentUser() user: JwtPayload,
    @Param('id') menteeId: string,
  ) {
    const mentee = await this.mentorService.getMenteeDetail(user.sub, menteeId);
    if (!mentee) throw new NotFoundException('Mentee not found');
    return this.draftService.getDraft(menteeId);
  }
}
