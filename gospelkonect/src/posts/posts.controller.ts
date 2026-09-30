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
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token/token.service.js';
import { CreatePostDto, UpdatePostDto } from '../dtos/post.dto.js';
import { PaginationDto } from '../dtos/pagination.dto.js';
import { PostsService } from './posts.service.js';

type PostResponse = Awaited<ReturnType<PostsService['create']>>;
type FeedResponse = Awaited<ReturnType<PostsService['list']>>;

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

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
   * The global feed. No guard on purpose: reads are public, and a token check
   * here would cost a Redis deny-list round trip on every page load while
   * adding no viewer-specific data yet. Add OptionalAccessTokenGuard the day a
   * post response carries viewer state (liked, reposted, …).
   */
  @Get()
  @ApiOperation({ summary: 'Read the global feed' })
  @ApiOkResponse({ description: 'Page of posts, newest first' })
  async list(@Query() query: PaginationDto): Promise<FeedResponse> {
    return this.postsService.list(query);
  }

  /** One post. Public, so a shared link works without logging in. */
  @Get(':id')
  @ApiOperation({ summary: 'Read a single post' })
  @ApiOkResponse({ description: 'The post' })
  @ApiNotFoundResponse({ description: 'No such post' })
  async getById(@Param('id') id: string): Promise<PostResponse> {
    return this.postsService.getById(id);
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
    return this.postsService.update(id, user.sub, body);
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
}
