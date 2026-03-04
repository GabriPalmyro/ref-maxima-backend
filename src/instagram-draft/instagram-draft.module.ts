import { Module } from '@nestjs/common';
import { InstagramDraftController } from './instagram-draft.controller';
import { InstagramDraftService } from './instagram-draft.service';

@Module({
  controllers: [InstagramDraftController],
  providers: [InstagramDraftService],
  exports: [InstagramDraftService],
})
export class InstagramDraftModule {}
