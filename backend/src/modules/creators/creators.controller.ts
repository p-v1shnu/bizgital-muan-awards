import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import type { Request } from 'express';

import { CreateCreatorDto, UpdateCreatorDto } from './dto/creator.dto';
import { RevokeCreatorDto } from './dto/revoke-creator.dto';
import { CreatorsService } from './creators.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';

// The public creator profile lives in PublicSiteController, alongside the
// other visitor-facing reads.

@ApiTags('creators-admin')
@Controller('admin/creators')
export class CreatorsAdminController {
  constructor(private readonly creators: CreatorsService) {}

  @Get()
  @ApiOperation({ summary: 'Search the creator library' })
  list(@Query() query: PaginationDto) {
    return this.creators.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One creator with their nomination history' })
  byId(@Param('id') id: string) {
    return this.creators.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a creator to the library' })
  create(@Body() dto: CreateCreatorDto, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.creators.create(dto, actor.id, req.ip);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a creator' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCreatorDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.creators.update(id, dto, actor.id, req.ip);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a creator who holds no nominations' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.creators.remove(id, actor.id, req.ip);
  }

  @Roles(AdminRole.SUPER_ADMIN)
  @Post(':id/revoke')
  @ApiOperation({
    summary:
      'Hide a creator and their nomination/winner history from the public site — SUPER_ADMIN only, requires a reason',
  })
  revoke(
    @Param('id') id: string,
    @Body() dto: RevokeCreatorDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.creators.revoke(id, dto, actor.id, req.ip);
  }

  @Roles(AdminRole.SUPER_ADMIN)
  @Post(':id/unrevoke')
  @ApiOperation({ summary: 'Reverse a revocation — SUPER_ADMIN only' })
  unrevoke(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.creators.unrevoke(id, actor.id, req.ip);
  }
}
