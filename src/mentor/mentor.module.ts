import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MentorService } from './mentor.service';
import { MentorController } from './mentor.controller';
import { ReportModule } from '../report/report.module';
import { InviteModule } from '../invite/invite.module';

@Module({
  imports: [PrismaModule, ReportModule, InviteModule],
  controllers: [MentorController],
  providers: [MentorService],
})
export class MentorModule {}
