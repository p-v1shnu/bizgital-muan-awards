import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import {
  AssignJudgeDto,
  CreateJudgeDto,
  ReorderPanelDto,
  UpdateAssignmentDto,
  UpdateJudgeDto,
} from './dto/judge.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { JudgesService } from './judges.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('judges-admin')
@Controller('admin/judges')
export class JudgesAdminController {
  constructor(private readonly judges: JudgesService) {}

  @Get()
  @ApiOperation({ summary: 'Search the judge library' })
  list(@Query() query: PaginationDto) {
    return this.judges.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Add a judge to the library' })
  create(@Body() dto: CreateJudgeDto, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.judges.create(dto, actor.id, req.ip);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a judge' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateJudgeDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.judges.update(id, dto, actor.id, req.ip);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a judge assigned to no edition' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.judges.remove(id, actor.id, req.ip);
  }
}

@ApiTags('judges-admin')
@Controller('admin/editions/:editionId/judges')
export class EditionJudgesController {
  constructor(private readonly judges: JudgesService) {}

  @Get()
  @ApiOperation({ summary: 'The panel for one edition, chair first' })
  list(@Param('editionId') editionId: string) {
    return this.judges.listForEdition(editionId);
  }

  @Post()
  @ApiOperation({ summary: 'Put a judge on this edition' })
  assign(
    @Param('editionId') editionId: string,
    @Body() dto: AssignJudgeDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.judges.assign(editionId, dto, actor.id, req.ip);
  }

  @Post('reorder')
  @HttpCode(200)
  @ApiOperation({ summary: 'Save the order the panel is shown in' })
  reorder(
    @Param('editionId') editionId: string,
    @Body() dto: ReorderPanelDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.judges.reorderPanel(editionId, dto, actor.id, req.ip);
  }

  @Patch(':assignmentId')
  @ApiOperation({ summary: 'Change a judge’s role or position on this edition' })
  update(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.judges.updateAssignment(assignmentId, dto, actor.id, req.ip);
  }

  @Delete(':assignmentId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Take a judge off this edition (the library entry stays)' })
  unassign(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.judges.unassign(assignmentId, actor.id, req.ip);
  }
}
