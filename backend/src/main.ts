import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  configureApp(app);

  // The docs map every route, including the back office, and describe the
  // shape of each body — a free head start for anyone probing the server. They
  // stay on for development and can be turned on deliberately elsewhere, but
  // a production container does not serve them by default (OWASP A02:2025).
  const swaggerEnabled =
    process.env.SWAGGER_ENABLED === 'true' ||
    (process.env.SWAGGER_ENABLED !== 'false' && process.env.NODE_ENV !== 'production');

  if (swaggerEnabled) {
    const swagger = new DocumentBuilder()
      .setTitle('Muan Awards API')
      .setDescription('Awards for Lao digital creators. See docs/muan-awards-prd.md')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));
  }

  const port = Number(process.env.BACKEND_PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
