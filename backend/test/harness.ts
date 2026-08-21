import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/prisma/prisma.service';

export interface Harness {
  app: INestApplication;
  prisma: PrismaService;
  server: Server;
  /** Bearer header for the seeded super admin. */
  auth: { Authorization: string };
  /** The same account's credentials, for tests that need to sign in again. */
  admin: { email: string; password: string };
  close: () => Promise<void>;
}

/**
 * Boots the real application through the same `configureApp` main.ts uses, so
 * a test cannot pass on a route that production would reject — and so proxy
 * headers, CORS and cookies behave here exactly as they do on the server.
 */
export async function createHarness(): Promise<Harness> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
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
    admin: { email: 'admin@test.local', password: 'a-very-long-password' },
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
  await prisma.categoryTemplate.deleteMany();
  await prisma.edition.deleteMany();
  await prisma.creator.deleteMany();
  await prisma.judge.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.siteSetting.deleteMany();
}

export const api = (harness: Harness) => request(harness.server);
export const path = (suffix: string) => `/api/v1${suffix}`;

/**
 * The library entry a test's category is assigned from. Made directly
 * through Prisma rather than the library's own endpoint, since what these
 * specs care about is the category that comes out of it, not the library
 * API itself. Upsert so two spots in one file naming the same slug share one
 * template — the same thing two real editions picking the same award would do.
 */
export async function categoryTemplate(h: Harness, slug: string, nameLo: string) {
  const template = await h.prisma.categoryTemplate.upsert({
    where: { slug },
    update: {},
    create: { slug, nameLo },
  });
  return template.id;
}
