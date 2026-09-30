// Admin console, part 1: accounts. GET/POST/PATCH/DELETE /admin/users…,
// plus GET /admin/suspensions. Every route is AccessTokenGuard then AdminGuard.

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token/token.service.js';
import { AdminListQueryDto, SetRoleDto, SuspendUserDto } from '../dtos/report.dto.js';
import { AdminGuard } from './admin.guard.js';
import { AdminService, type AdminUserRow } from './admin.service.js';
import type { Paginated } from '../common/pagination.js';

@ApiTags('admin')
@Controller('admin')
@UseGuards(AccessTokenGuard, AdminGuard)
@ApiBearerAuth()
export class AdminUsersController {
  constructor(private readonly admin: AdminService) {}

  /** Accounts, searchable and filterable — the moderation home screen. */
  @Get('users')
  @ApiOperation({ summary: 'List accounts (admin)' })
  @ApiOkResponse({ description: 'Page of accounts' })
  @ApiForbiddenResponse({ description: 'Not an administrator' })
  async listUsers(@Query() query: AdminListQueryDto): Promise<Paginated<AdminUserRow>> {
    return this.admin.listUsers(query);
  }

  /** Accounts whose suspension is active. */
  @Get('suspensions')
  @ApiOperation({ summary: 'List suspended accounts (admin)' })
  @ApiOkResponse({ description: 'Page of suspended accounts' })
  async listSuspensions(@Query() query: AdminListQueryDto): Promise<Paginated<AdminUserRow>> {
    return this.admin.listSuspensions(query);
  }

  /** One account with its counts and suspension details. */
  @Get('users/:id')
  @ApiOperation({ summary: 'Read one account (admin)' })
  @ApiOkResponse({ description: 'The account' })
  @ApiNotFoundResponse({ description: 'No such account' })
  async getUser(@Param('id') id: string): Promise<AdminUserRow> {
    return this.admin.getUser(id);
  }

  /**
   * Suspends an account. With no `days` the suspension runs until an admin
   * lifts it; either way every authenticated call and every new login stop
   * immediately (the guard reads the row, not the token).
   */
  @Post('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend an account (admin)' })
  @ApiOkResponse({ description: 'The suspended account' })
  async suspend(
    @CurrentUser() admin: AccessTokenPayload,
    @Param('id') id: string,
    @Body() body: SuspendUserDto,
  ): Promise<AdminUserRow> {
    return this.admin.suspend(id, admin.sub, body);
  }

  /** Lifts a suspension. */
  @Post('users/:id/unsuspend')
  @ApiOperation({ summary: 'Lift a suspension (admin)' })
  @ApiOkResponse({ description: 'The restored account' })
  async unsuspend(
    @CurrentUser() admin: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<AdminUserRow> {
    return this.admin.unsuspend(id, admin.sub);
  }

  /** Grants or revokes administrator rights. */
  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Change an account’s role (admin)' })
  @ApiOkResponse({ description: 'The updated account' })
  async setRole(
    @CurrentUser() admin: AccessTokenPayload,
    @Param('id') id: string,
    @Body() body: SetRoleDto,
  ): Promise<AdminUserRow> {
    return this.admin.setRole(id, admin.sub, body);
  }

  /** Account removal: content, objects and edges go with it. */
  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT) // Nothing to return → 204, not {}.
  @ApiOperation({ summary: 'Delete an account and its content (admin)' })
  async removeAccount(
    @CurrentUser() admin: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<void> {
    return this.admin.removeAccount(id, admin.sub);
  }
}
