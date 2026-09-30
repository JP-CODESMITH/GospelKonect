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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { OptionalAccessTokenGuard } from '../auth/guards/optional-access-token.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token/token.service.js';
import { CreatePostDto, UpdatePostDto } from '../dtos/post.dto.js';
import { SetReactionDto } from '../dtos/reaction.dto.js';
import { PaginationDto } from '../dtos/pagination.dto.js';
import { PostsService } from './posts.service.js';
import { ReactionsService } from '../engagement/reactions.service.js';

type ReactionState = Awaited<ReturnType<ReactionsService['set']>>;

type PostResponse = Awaited<ReturnType<PostsService['create']>>;
type FeedResponse = Awaited<ReturnType<PostsService['list']>>;

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    // The PUT/DELETE /posts/:id/reactions routes hang off this controller but
    // belong to the engagement module (Phase 5), which PostsModule imports.
    private readonly reactionsService: ReactionsService,
  ) {}

  /**
   * Publishes a post. Only the signed-in author can do this, and the author
   * row is never echoed back from the body — the response is built by the
   * select in PostsService, so passwordHash can't leak.
   */
  @Post()
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a post' })
  @ApiCreatedResponse({ description: 'Post created' })
  @ApiBadRequestResponse({ description: 'Content blank, too long or not a string' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async create(
    @CurrentUser() user: AccessTokenPayload,
    @Body() body: CreatePostDto,
  ): Promise<PostResponse> {
    return this.postsService.create(user.sub, body);
  }

  /**
   * The global feed. Public — but now that a post carries viewerReaction,
   * reads take OptionalAccessTokenGuard: a valid token fills it in, an
   * absent or invalid one is treated as anonymous instead of rejected.
   */
  @Get()
  @UseGuards(OptionalAccessTokenGuard)
  @ApiOperation({ summary: 'Read the global feed' })
  @ApiOkResponse({ description: 'Page of posts, newest first' })
  async list(
    @CurrentUser() viewer: AccessTokenPayload | undefined,
    @Query() query: PaginationDto,
  ): Promise<FeedResponse> {
    return this.postsService.list(query, viewer?.sub);
  }

  /** One post. Public, so a shared link works without logging in. */
  @Get(':id')
  @UseGuards(OptionalAccessTokenGuard)
  @ApiOperation({ summary: 'Read a single post' })
  @ApiOkResponse({ description: 'The post' })
  @ApiNotFoundResponse({ description: 'No such post' })
  async getById(
    @CurrentUser() viewer: AccessTokenPayload | undefined,
    @Param('id') id: string,
  ): Promise<PostResponse> {
    return this.postsService.getById(id, viewer?.sub);
  }

  /** Replaces the body of your own post; 403 if it belongs to someone else. */
  @Patch(':id')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit your post' })
  @ApiOkResponse({ description: 'Updated post (updatedAt is refreshed)' })
  @ApiBadRequestResponse({ description: 'Content blank, too long or not a string' })
  @ApiForbiddenResponse({ description: 'The post belongs to another user' })
  @ApiNotFoundResponse({ description: 'No such post' })
  async update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body() body: UpdatePostDto,
  ): Promise<PostResponse> {
    return this.postsService.update(id, user.sub, body, user.sub);
  }

  /** Permanently deletes your own post. */
  @Delete(':id')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT) // Nothing to return → 204, not {}.
  @ApiOperation({ summary: 'Delete your post' })
  @ApiNoContentResponse({ description: 'Post deleted' })
  @ApiForbiddenResponse({ description: 'The post belongs to another user' })
  @ApiNotFoundResponse({ description: 'No such post' })
  async remove(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<void> {
    return this.postsService.remove(id, user.sub);
  }

  /**
   * Sets (or replaces) your reaction on a post. PUT, not PATCH: the body is
   * the complete desired state — "my reaction is LOVE".
   */
  @Put(':id/reactions')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'React to a post' })
  @ApiOkResponse({ description: 'The post’s fresh reaction tallies' })
  @ApiBadRequestResponse({ description: 'Unknown reaction type' })
  @ApiNotFoundResponse({ description: 'No such post' })
  async setReaction(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body() body: SetReactionDto,
  ): Promise<ReactionState> {
    return this.reactionsService.set(id, user.sub, body.type);
  }

  /** Removes your reaction. Answering with the updated tallies keeps the
   * client from issuing a follow-up read just to redraw the buttons. */
  @Delete(':id/reactions')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove your reaction from a post' })
  @ApiOkResponse({ description: 'The post’s fresh reaction tallies' })
  async removeReaction(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<ReactionState> {
    return this.reactionsService.remove(id, user.sub);
  }
}
