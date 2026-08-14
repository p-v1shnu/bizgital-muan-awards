import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  configureApp(app);

  const swagger = new DocumentBuilder()
    .setTitle('Muan Awards API')
    .setDescription('Awards for Lao digital creators. See docs/muan-awards-prd.md')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  const port = Number(process.env.BACKEND_PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
