import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InviteService } from './invite.service';
import { InviteController } from './invite.controller';

@Module({
  imports: [PrismaModule],
  controllers: [InviteController],
  providers: [InviteService],
  exports: [InviteService],
})
export class InviteModule {}
