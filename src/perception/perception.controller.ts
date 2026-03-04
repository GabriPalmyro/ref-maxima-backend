import {
  Controller,
  Get,
  Post,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { PerceptionService } from './perception.service';

@Controller('mentee/perception')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mentee')
export class PerceptionController {
  constructor(private readonly perceptionService: PerceptionService) {}

  /**
   * POST /mentee/perception/analyze
   * Generate or refresh the perception analysis for the authenticated mentee.
   * Returns the analysis result or an error response if Instagram data is missing.
   */
  @Post('analyze')
  analyze(@CurrentUser() user: JwtPayload) {
    return this.perceptionService.analyze(user.sub);
  }

  /**
   * GET /mentee/perception
   * Get the stored perception analysis for the authenticated mentee.
   * Returns 404 if no analysis has been generated yet.
   */
  @Get()
  async getAnalysis(@CurrentUser() user: JwtPayload) {
    const result = await this.perceptionService.getAnalysis(user.sub);
    if (!result) {
      throw new NotFoundException('No perception analysis found');
    }
    return result;
  }
}
