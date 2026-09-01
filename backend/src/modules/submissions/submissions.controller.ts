import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import {
  CountSubmissionsDto,
  CreateSubmissionDto,
  ListSubmissionsDto,
  MergeSubmissionDto,
  ReviewSubmissionDto,
} from './dto/submission.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SubmissionsService } from './submissions.service';

@ApiTags('submissions')
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Public()
  // Per address, per hour (PRD §7.1). Repeats of the same name from the same
  // address are folded together separately, in the service, so this is not what
  // stops one fan inflating a count — it is only what stops a script.
  //
  // Raised from 10 after threat-modelling who actually shares an address here.
  // Mobile networks in Laos put many subscribers behind one, and the form is
  // open for a few weeks a year: measured, the eleventh entry from an address
  // was refused for an hour, and on a carrier that address is a whole city.
  // 30 still stops a script — and nothing sent here is published without the
  // team reading it first, which is the real control.
  @Throttle({ default: { limit: 30, ttl: 60 * 60_000 } })
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Send in a name from the public form' })
  create(@Body() dto: CreateSubmissionDto, @Req() req: Request) {
    return this.submissions.create(dto, req.ip);
  }
}

@ApiTags('submissions-admin')
@Controller('admin/submissions')
export class SubmissionsAdminController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Get()
  @ApiOperation({ summary: 'The screening queue, grouped by name and category' })
  list(@Query() query: ListSubmissionsDto) {
    return this.submissions.listGrouped(query);
  }

  @Get('counts')
  @ApiOperation({ summary: 'How many entries sit in each status' })
  counts(@Query() query: CountSubmissionsDto) {
    return this.submissions.counts(query);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept as a nominee; duplicates of the same name are folded in' })
  accept(
    @Param('id') id: string,
    @Body() dto: ReviewSubmissionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.submissions.accept(id, dto, actor.id, req.ip);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject this name across the whole cluster' })
  reject(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.submissions.reject(id, actor.id, req.ip);
  }

  @Post(':id/merge')
  @ApiOperation({ summary: 'Fold this group into another spelling of the same person (PRD §7.2)' })
  merge(
    @Param('id') id: string,
    @Body() dto: MergeSubmissionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.submissions.merge(id, dto, actor.id, req.ip);
  }
}
