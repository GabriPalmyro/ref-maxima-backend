import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
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
}
