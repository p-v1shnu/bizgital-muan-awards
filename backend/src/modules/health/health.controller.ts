import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SERVER_ERROR_WINDOW_MINUTES,
  serverErrorsInWindow,
} from '../../common/server-errors';
import { StorageService } from '../storage/storage.service';

/**
 * How many 5xx in five minutes is a spike rather than a bad afternoon. Ten is
 * the starting point for a site of this size (PRD §11 sets the availability
 * target at 99%, and this is not a shop): low enough that a broken save path
 * shows up within minutes, high enough that a single crawler hitting a bad URL
 * cannot wake anyone. Raise it with ERROR_SPIKE_THRESHOLD if the entry window
 * proves noisier than that.
 */
const DEFAULT_SPIKE_THRESHOLD = 10;

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
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
  /**
   * The check for the failure an uptime monitor cannot see: every page answers,
   * and every attempt to send in a name answers 500. Watched as its own monitor
   * (monitoring.md §6) — the count is this process's own, over the last few
   * minutes, and the endpoint turns 503 once it passes the threshold so a
   * keyword check on "ok" catches it too.
   */
  @Public()
  @Get('errors')
  @ApiOperation({ summary: 'Recent 5xx count — watch separately from liveness' })
  errorRate() {
    const threshold = Number(
      this.config.get<string>('ERROR_SPIKE_THRESHOLD') ?? DEFAULT_SPIKE_THRESHOLD,
    );
    const serverErrors = serverErrorsInWindow();
    const body = {
      status: 'ok',
      serverErrors,
      windowMinutes: SERVER_ERROR_WINDOW_MINUTES,
      threshold,
    };

    if (serverErrors >= threshold) {
      throw new ServiceUnavailableException(
        `${serverErrors} server errors in the last ${SERVER_ERROR_WINDOW_MINUTES} minutes`,
      );
    }
    return body;
  }

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
