import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { ReportService } from './report.service';
import { GenerateReportDto } from './dto/generate-report.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mentee')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('generate')
  generateReport(
    @CurrentUser() user: JwtPayload,
    @Body() dto: GenerateReportDto,
  ) {
    return this.reportService.generateReport(user.sub, dto);
  }

  @Get()
  getReports(@CurrentUser() user: JwtPayload) {
    return this.reportService.getReports(user.sub);
  }

  @Get(':id')
  getReport(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.reportService.getReport(user.sub, id);
  }
}
