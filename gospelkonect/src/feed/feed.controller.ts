import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token/token.service.js';
import { FeedQueryDto } from '../dtos/feed.dto.js';
import { FeedService, type FeedPage } from './feed.service.js';
import type { PostResponse } from '../posts/post.constants.js';

@ApiTags('feed')
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  /**
   * The home timeline: posts from people you follow and your own, then public
   * posts as fill, newest first within each tier.
   *
   * Requires a token — the whole point is that the response depends on who is
   * asking. Two paging modes: `page`/`limit`, or `cursor` (from
   * meta.nextCursor) for infinite scroll.
   */
  @Get()
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Read the personalised home feed' })
  @ApiOkResponse({ description: 'A page of posts plus meta.nextCursor' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Access token deny-listed (logged out)' })
  async getFeed(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: FeedQueryDto,
  ): Promise<FeedPage<PostResponse>> {
    return this.feedService.getFeed(user.sub, query);
  }
}
