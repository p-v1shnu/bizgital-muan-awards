import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { CreateSubmissionDto, ListSubmissionsDto, ReviewSubmissionDto } from './dto/submission.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SubmissionsService } from './submissions.service';

@ApiTags('submissions')
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Public()
  // Tighter than the global 100/min: this endpoint writes on behalf of anyone.
  // Not tighter still, because Lao mobile networks put many real people behind
  // one address — this has to stop a script, not a family.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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
  counts() {
    return this.submissions.counts();
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
}
