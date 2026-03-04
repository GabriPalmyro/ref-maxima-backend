import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { InstagramService } from './instagram.service';
import { UpdateInstagramHandleDto } from './dto/update-handle.dto';

@Controller('mentee/instagram')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mentee')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @Get()
  getProfile(
    @CurrentUser() user: JwtPayload,
    @Query('refresh') refresh?: string,
  ) {
    const forceRefresh = refresh === 'true';
    return this.instagramService.getProfile(user.sub, forceRefresh);
  }

  @Post('update-handle')
  updateHandle(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateInstagramHandleDto,
  ) {
    return this.instagramService.updateHandle(user.sub, dto.handle);
  }
}
