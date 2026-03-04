import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InstagramService } from './instagram.service';
import { InstagramApiService } from './instagram-api.service';
import { InstagramController } from './instagram.controller';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        baseURL: config.get<string>('RAPIDAPI_BASE_URL'),
        timeout: 10000,
        headers: {
          'x-rapidapi-host': config.get<string>('RAPIDAPI_HOST'),
          'x-rapidapi-key': config.get<string>('RAPIDAPI_KEY'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [InstagramController],
  providers: [InstagramService, InstagramApiService],
  exports: [InstagramService],
})
export class InstagramModule {}
