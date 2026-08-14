import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { envValidationSchema } from './config/env.validation';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { EditionsModule } from './modules/editions/editions.module';
import { HealthModule } from './modules/health/health.module';
import { IdentityAccessModule } from './modules/identity-access/identity-access.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: envValidationSchema }),
    // In-memory throttling is enough for the MVP: the PRD (§9) deliberately
    // leaves Redis out. Swap to a Redis storage adapter if the API is ever
    // scaled past a single container.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuditModule,
    IdentityAccessModule,
    EditionsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
