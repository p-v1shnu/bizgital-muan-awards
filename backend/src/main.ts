import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Caddy terminates TLS and proxies to this container, so without this every
  // request would read as coming from the proxy: one shared rate-limit bucket
  // for the whole country, and one identical ipHash on every submission.
  // Only private-range hops are trusted, so a public client cannot forge
  // X-Forwarded-For to escape either.
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(cookieParser());

  // Refresh tokens ride in an HttpOnly cookie, so credentials must be allowed
  // and the origin list stays an explicit whitelist — never '*'.
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

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
