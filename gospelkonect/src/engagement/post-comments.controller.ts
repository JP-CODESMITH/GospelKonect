// The conversation under a post: POST/GET /posts/:postId/comments.
//
// A nested controller rather than extra routes on PostsController: the path
// already says "comments", and keeping them here means PostsModule stays about
// posts while EngagementModule owns everything Phase 5 added.

import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token/token.service.js';
import { CreateCommentDto } from '../dtos/comment.dto.js';
import { PaginationDto } from '../dtos/pagination.dto.js';
import { CommentsService } from './comments.service.js';
import { RateLimit, RateLimitGuard } from '../security/rate-limit.guard.js';

type CommentResponse = Awaited<ReturnType<CommentsService['create']>>;
type CommentPage = Awaited<ReturnType<CommentsService['list']>>;

@ApiTags('comments')
@Controller('posts/:postId/comments')
export class PostCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /** Adds a comment (or a reply, via parentId) to a post. */
  @Post()
  @UseGuards(AccessTokenGuard, RateLimitGuard)
  @RateLimit({ scope: 'comments', points: 60, windowSec: 60 })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Comment on a post' })
  @ApiCreatedResponse({ description: 'Comment created' })
  @ApiBadRequestResponse({ description: 'Blank body, or a parent from another post' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiNotFoundResponse({ description: 'No such post' })
  async create(
    @CurrentUser() user: AccessTokenPayload,
    @Param('postId') postId: string,
    @Body() body: CreateCommentDto,
  ): Promise<CommentResponse> {
    return this.commentsService.create(postId, user.sub, body);
  }

  /**
   * The conversation, oldest first. Public: a shared post should be readable
   * (and quotable) without an account, the same way the post itself is.
   */
  @Get()
  @ApiOperation({ summary: 'Read the comments on a post' })
  @ApiOkResponse({ description: 'Page of comments, oldest first' })
  @ApiNotFoundResponse({ description: 'No such post' })
  async list(
    @Param('postId') postId: string,
    @Query() query: PaginationDto,
  ): Promise<CommentPage> {
    return this.commentsService.list(postId, query);
  }
}
