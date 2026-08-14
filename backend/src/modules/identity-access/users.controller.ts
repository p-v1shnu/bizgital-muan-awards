import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UsersService } from './users.service';

@ApiTags('admin-users')
@Controller('admin/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Roles(AdminRole.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: 'List admin accounts' })
  list() {
    return this.users.list();
  }

  @Roles(AdminRole.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create an admin account' })
  create(
    @Body() dto: CreateAdminUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.users.create(dto, actor.id, req.ip);
  }

  @Roles(AdminRole.SUPER_ADMIN)
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete an admin account' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.users.remove(id, actor.id, req.ip);
  }

  @Post('me/password')
  @HttpCode(204)
  @ApiOperation({ summary: 'Change your own password' })
  changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.users.changePassword(actor.id, dto, req.ip);
  }
}
