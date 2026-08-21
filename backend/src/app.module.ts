import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { envValidationSchema } from './config/env.validation';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PublicThrottlerGuard } from './common/guards/public-throttler.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CategoryTemplatesModule } from './modules/category-templates/category-templates.module';
import { CreatorsModule } from './modules/creators/creators.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EditionsModule } from './modules/editions/editions.module';
import { HealthModule } from './modules/health/health.module';
import { IdentityAccessModule } from './modules/identity-access/identity-access.module';
import { JudgesModule } from './modules/judges/judges.module';
import { NominationsModule } from './modules/nominations/nominations.module';
import { PublicSiteModule } from './modules/public-site/public-site.module';
import { SiteSettingsModule } from './modules/site-settings/site-settings.module';
import { SponsorsModule } from './modules/sponsors/sponsors.module';
import { StorageModule } from './modules/storage/storage.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: envValidationSchema }),
    // In-memory throttling is enough for the MVP: the PRD (§9) deliberately
    // leaves Redis out. Swap to a Redis storage adapter if the API is ever
    // scaled past a single container.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuditModule,
    StorageModule,
    IdentityAccessModule,
    EditionsModule,
    CategoriesModule,
    CategoryTemplatesModule,
    CreatorsModule,
    JudgesModule,
    NominationsModule,
    SponsorsModule,
    SubmissionsModule,
    PublicSiteModule,
    SiteSettingsModule,
    DashboardModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: PublicThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
