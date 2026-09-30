// One-author timeline: GET /users/:username/posts.
//
// Split into its own controller (not folded into PostsController) because it
// lives under the /users prefix — keeping it here means PostsModule owns every
// post route and UsersModule doesn't have to know posts exist.

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OptionalAccessTokenGuard } from '../auth/guards/optional-access-token.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token/token.service.js';
import { PaginationDto } from '../dtos/pagination.dto.js';
import { PostsService } from './posts.service.js';

type TimelineResponse = Awaited<ReturnType<PostsService['listByUsername']>>;

@ApiTags('posts')
@Controller('users')
export class UserPostsController {
  constructor(private readonly postsService: PostsService) {}

  /**
   * The posts written by one handle, newest first. Public — the optional
   * token only exists so a signed-in visitor sees their own viewerReaction.
   */
  @Get(':username/posts')
  @UseGuards(OptionalAccessTokenGuard)
  @ApiOperation({ summary: "Read a user's posts" })
  @ApiOkResponse({ description: 'Page of posts, newest first' })
  @ApiNotFoundResponse({ description: 'No such username' })
  async listByUsername(
    @CurrentUser() viewer: AccessTokenPayload | undefined,
    @Param('username') username: string,
    @Query() query: PaginationDto,
  ): Promise<TimelineResponse> {
    return this.postsService.listByUsername(username, query, viewer?.sub);
  }
}
