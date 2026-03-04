import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { InviteModule } from './invite/invite.module';
import { MentorModule } from './mentor/mentor.module';
import { MenteeModule } from './mentee/mentee.module';
import { AiModule } from './ai/ai.module';
import { ReportModule } from './report/report.module';
import { MessageCardModule } from './message-card/message-card.module';
import { InstagramModule } from './instagram/instagram.module';
import { PerceptionModule } from './perception/perception.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    InviteModule,
    MentorModule,
    MenteeModule,
    AiModule,
    ReportModule,
    MessageCardModule,
    InstagramModule,
    PerceptionModule,
  ],
})
export class AppModule {}
