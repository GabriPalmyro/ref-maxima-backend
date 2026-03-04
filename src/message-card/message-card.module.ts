import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MessageCardService } from './message-card.service';
import { MessageCardController } from './message-card.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MessageCardController],
  providers: [MessageCardService],
})
export class MessageCardModule {}
