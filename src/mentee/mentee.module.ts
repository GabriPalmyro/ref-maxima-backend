import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MenteeService } from './mentee.service';
import { MenteeController } from './mentee.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MenteeController],
  providers: [MenteeService],
})
export class MenteeModule {}
