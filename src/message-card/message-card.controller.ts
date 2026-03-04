import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { MessageCardService } from './message-card.service';

@Controller('message-cards')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mentee')
export class MessageCardController {
  constructor(private readonly messageCardService: MessageCardService) {}

  @Get()
  getCards(@CurrentUser() user: JwtPayload) {
    return this.messageCardService.getCards(user.sub);
  }
}
