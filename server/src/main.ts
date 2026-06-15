import { loadEnvFiles, resolveEnvFilePaths } from './config/env';

// 尽早加载 .env，供 Prisma 与 Nest 使用
loadEnvFiles();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  const port = process.env.API_PORT || 3000;
  await app.listen(port);
  console.log(`API running at http://localhost:${port}/api/v1`);
}

bootstrap();
