import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

export interface Harness {
  app: INestApplication;
  prisma: PrismaService;
  server: Server;
  /** Bearer header for the seeded super admin. */
  auth: { Authorization: string };
  close: () => Promise<void>;
}

/**
 * Boots the real application — same pipes, filters and guards as main.ts, so a
 * test cannot pass on a route that production would reject.
 */
export async function createHarness(): Promise<Harness> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
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
  await app.init();

  const prisma = app.get(PrismaService);
  await reset(prisma);

  const server = app.getHttpServer() as Server;
  const setup = await request(server)
    .post('/api/v1/auth/setup')
    .send({ email: 'admin@test.local', password: 'a-very-long-password', name: 'Test Admin' })
    .expect(201);

  return {
    app,
    prisma,
    server,
    auth: { Authorization: `Bearer ${setup.body.data.accessToken}` },
    close: async () => {
      await reset(prisma);
      await app.close();
    },
  };
}

/** Children before parents, so foreign keys never block the wipe. */
export async function reset(prisma: PrismaService) {
  await prisma.auditLog.deleteMany();
  await prisma.publicSubmission.deleteMany();
  await prisma.nomination.deleteMany();
  await prisma.editionJudge.deleteMany();
  await prisma.editionSponsor.deleteMany();
  await prisma.category.deleteMany();
  await prisma.edition.deleteMany();
  await prisma.creator.deleteMany();
  await prisma.judge.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.siteSetting.deleteMany();
}

export const api = (harness: Harness) => request(harness.server);
export const path = (suffix: string) => `/api/v1${suffix}`;
