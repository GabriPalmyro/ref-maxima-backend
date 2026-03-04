import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { InviteService } from './invite.service';
import { CreateInviteDto } from './dto/create-invite.dto';

@Controller('invites')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mentor')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @Post()
  generate(@CurrentUser() user: JwtPayload, @Body() dto: CreateInviteDto) {
    return this.inviteService.generate(user.sub, dto);
  }

  @Get()
  listByMentor(@CurrentUser() user: JwtPayload) {
    return this.inviteService.listByMentor(user.sub);
  }

  @Delete(':id')
  revoke(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.inviteService.revoke(user.sub, id);
  }
}
