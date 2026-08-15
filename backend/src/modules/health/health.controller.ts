import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness and database connectivity probe' })
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Kept apart from the probe above, which is the one that decides whether
   * somebody is woken up. Storage being down is bad — every picture on the site
   * disappears — but the site still answers, people can still read the winners
   * and still send an entry, and that is not the same emergency as the site
   * being gone. Watched as its own check, it can be told about in the morning.
   */
  @Public()
  @Get('storage')
  @ApiOperation({ summary: 'Object storage reachability — watch separately from liveness' })
  async storageCheck() {
    try {
      await this.storage.checkBucket();
    } catch (caught) {
      throw new ServiceUnavailableException(
        `Object storage did not answer: ${caught instanceof Error ? caught.name : 'unknown error'}`,
      );
    }
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
