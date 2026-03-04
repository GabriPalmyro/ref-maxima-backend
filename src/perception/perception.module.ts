import { Module } from '@nestjs/common';
import { InstagramModule } from '../instagram/instagram.module';
import { ImageProcessingService } from './image-processing.service';
import { PerceptionController } from './perception.controller';
import { PerceptionService } from './perception.service';

@Module({
  imports: [InstagramModule], // For InstagramService; AiModule is @Global(), PrismaModule is @Global()
  controllers: [PerceptionController],
  providers: [PerceptionService, ImageProcessingService],
  exports: [PerceptionService],
})
export class PerceptionModule {}
