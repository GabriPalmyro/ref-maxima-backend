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
import { StorageModule } from './storage/storage.module';
import { InstagramDraftModule } from './instagram-draft/instagram-draft.module';
import { ProfilePhotoModule } from './profile-photo/profile-photo.module';
import { ChatModule } from './chat/chat.module';

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
    StorageModule,
    InstagramDraftModule,
    ProfilePhotoModule,
    ChatModule,
  ],
})
export class AppModule {}
