import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
// NestExpressApplication exposes useStaticAssets(), which NestFactory's
// default (platform-agnostic) return type does not declare.
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// `join` keeps a trailing slash in UPLOAD_DIR from producing a broken URL.
import { join } from 'node:path';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Lets PrismaService and RedisService run their onModuleDestroy hooks on
  // SIGTERM/SIGINT, so connections are closed instead of dropped.
  app.enableShutdownHooks();

  app.setGlobalPrefix('api/v1');

  // Serves the avatar directory at /uploads/… . Static assets are mounted on
  // the Express app directly, so the api/v1 global prefix does not apply to
  // them — which is exactly what a stored avatar URL (/uploads/avatars/x.png)
  // expects.
  app.useStaticAssets(join(process.cwd(), app.get(ConfigService).get('upload.dir') ?? 'uploads'), {
    prefix: '/uploads',
  });

  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('GospelKonect API')
    .setDescription('GospelKonect social platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

// `void` marks the promise as intentionally un-awaited, which is what the
// project's no-floating-promises lint rule requires. Bootstrap failures (e.g.
// JWT_SECRET missing in production) still surface via the catch below.
void bootstrap().catch((err: unknown) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
