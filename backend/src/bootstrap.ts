import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

/**
 * Everything the HTTP layer needs, in one place.
 *
 * This lives apart from `main.ts` so the e2e harness can boot the *same*
 * application rather than a lookalike. The two drifted once already: the tests
 * built their own app without `trust proxy`, so every request there read as one
 * address — which is precisely the condition the rate limit and the submission
 * dedupe are supposed to tell apart, and neither could be tested at all.
 */
export function configureApp(app: NestExpressApplication) {
  // A deploy stops the container with SIGTERM. Without this, Nest ignores it
  // and the process is killed ten seconds later, in the middle of whatever it
  // was doing; with it, requests in flight finish and the database pool closes.
  app.enableShutdownHooks();

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
}
