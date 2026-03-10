import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);

  // Configure server timeouts for long SSE connections (10 minutes)
  const server = app.getHttpServer();
  server.setTimeout(10 * 60 * 1000);
  server.keepAliveTimeout = 10 * 60 * 1000;
  server.headersTimeout = 10 * 60 * 1000 + 1000;
}
bootstrap();
