import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { GenerateReportDto } from '../report/dto/generate-report.dto';
import { CreateMenteeDto } from './dto/create-mentee.dto';
import { UpdateMentorDto } from './dto/update-mentor.dto';
import { MentorService } from './mentor.service';

@Controller('mentor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mentor')
export class MentorController {
  constructor(private readonly mentorService: MentorService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.mentorService.getProfile(user.sub);
  }

  @Put('profile')
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateMentorDto) {
    return this.mentorService.updateProfile(user.sub, dto);
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
}
