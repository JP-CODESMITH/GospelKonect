// Blocking routes: POST/DELETE /users/:id/block and GET /users/me/blocks.
//
// Lives in the moderation module but hangs under the /users prefix, the same
// way the timeline controller does — the path says "users", the capability
// says "safety", and only one of those two should decide where the file is.

import { Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token/token.service.js';
import { PaginationDto } from '../dtos/pagination.dto.js';
import { RateLimit, RateLimitGuard } from '../security/rate-limit.guard.js';
import { BlocksService } from './blocks.service.js';

type BlockList = Awaited<ReturnType<BlocksService['list']>>;

@ApiTags('users')
@Controller('users')
export class BlocksController {
  constructor(private readonly blocks: BlocksService) {}

  /**
   * Blocks an account. Idempotent: repeating it (or blocking someone who
   * already blocked you) is still 204 — blocking is a state, not an event.
   */
  @Post(':id/block')
  @UseGuards(AccessTokenGuard, RateLimitGuard)
  @RateLimit({ scope: 'blocks', points: 60, windowSec: 60 })
  @ApiBearerAuth()
  @HttpCode(204) // Nothing to return → 204, not {}.
  @ApiOperation({ summary: 'Block a user' })
  @ApiNoContentResponse({ description: 'Now blocked (or already was)' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async block(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<void> {
    return this.blocks.block(user.sub, id);
  }

  /** Lifts a block. Also 204 when there was nothing to lift. */
  @Delete(':id/block')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiNoContentResponse({ description: 'No longer blocked' })
  async unblock(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<void> {
    return this.blocks.unblock(user.sub, id);
  }

  /** Everyone you block, newest first — the "manage blocked accounts" screen. */
  @Get('me/blocks')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List the accounts you blocked' })
  @ApiOkResponse({ description: 'Page of blocked accounts' })
  async list(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: PaginationDto,
  ): Promise<BlockList> {
    return this.blocks.list(user.sub, query);
  }
}
