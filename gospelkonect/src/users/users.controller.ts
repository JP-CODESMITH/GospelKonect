import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
// FileInterceptor reads the multipart body into a Buffer, so the controller
// never touches disk directly — LocalStorageService does that.
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { OptionalAccessTokenGuard } from '../auth/guards/optional-access-token.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token/token.service.js';
import { UpdateUserDto } from '../dtos/update-user.dto.js';
import { SearchUsersDto } from '../dtos/user-query.dto.js';
import { PaginationDto } from '../dtos/pagination.dto.js';
import { UsersService } from './users.service.js';
import { FollowsService } from './follows.service.js';
import {
  AVATAR_MAX_BYTES,
  LocalStorageService,
} from '../storage/local-storage.service.js';

/** Shapes Swagger shows; kept in sync by the service return types. */
type ProfileResponse = Awaited<ReturnType<UsersService['getProfile']>>;
type UpdateResponse = Awaited<ReturnType<UsersService['updateProfile']>>;
type SearchResponse = Awaited<ReturnType<UsersService['search']>>;
type ListResponse = Awaited<ReturnType<FollowsService['listFollowers']>>;

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly followsService: FollowsService,
    // Injected here rather than in the controller delegating to a third
    // service: only this endpoint needs to write bytes to disk.
    private readonly storage: LocalStorageService,
  ) {}

  /**
   * Discovery: paginated list of users, optionally filtered by a free-text
   * term matched against username and name. Authenticated callers get follow
   * flags per row; anonymous callers see everyone (except themselves).
   */
  @Get()
  @UseGuards(OptionalAccessTokenGuard)
  @ApiOperation({ summary: 'Discover users' })
  @ApiOkResponse({ description: 'Page of users plus pagination metadata' })
  async search(
    @Query() query: SearchUsersDto,
    @CurrentUser() viewer?: AccessTokenPayload,
  ): Promise<SearchResponse> {
    return this.usersService.search(query, viewer?.sub);
  }

  /**
   * One profile by handle, with follower/following counts. Public — the
   * optional guard only adds `isFollowing`/`isFollowedBy` when a token is sent.
   */
  @Get(':username')
  @UseGuards(OptionalAccessTokenGuard)
  @ApiOperation({ summary: 'Get a profile by username' })
  @ApiOkResponse({ description: 'Profile' })
  @ApiNotFoundResponse({ description: 'No such username' })
  async getProfile(
    @Param('username') username: string,
    @CurrentUser() viewer?: AccessTokenPayload,
  ): Promise<ProfileResponse> {
    return this.usersService.getProfile(username, viewer?.sub);
  }

  /** Accounts following `username`, newest first. */
  @Get(':username/followers')
  @UseGuards(OptionalAccessTokenGuard)
  @ApiOperation({ summary: 'List followers of a user' })
  @ApiOkResponse({ description: 'Page of follower profiles' })
  @ApiNotFoundResponse({ description: 'No such username' })
  async listFollowers(
    @Param('username') username: string,
    @Query() query: PaginationDto,
    @CurrentUser() viewer?: AccessTokenPayload,
  ): Promise<ListResponse> {
    return this.followsService.listFollowers(username, query, viewer?.sub);
  }

  /** Accounts that `username` follows, newest first. */
  @Get(':username/following')
  @UseGuards(OptionalAccessTokenGuard)
  @ApiOperation({ summary: 'List accounts a user follows' })
  @ApiOkResponse({ description: 'Page of followed profiles' })
  @ApiNotFoundResponse({ description: 'No such username' })
  async listFollowing(
    @Param('username') username: string,
    @Query() query: PaginationDto,
    @CurrentUser() viewer?: AccessTokenPayload,
  ): Promise<ListResponse> {
    return this.followsService.listFollowing(username, query, viewer?.sub);
  }

  /**
   * Edits the caller's own name/username/bio. Addressed as `/me` so a client
   * can never name another account in the path.
   */
  @Patch('me')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth() // Tells Swagger to offer the Authorize button for this route.
  @ApiOperation({ summary: 'Update the current user profile' })
  @ApiOkResponse({ description: 'Updated profile' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiConflictResponse({ description: 'Username already taken' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async updateProfile(
    @CurrentUser() user: AccessTokenPayload,
    @Body() body: UpdateUserDto,
  ): Promise<UpdateResponse> {
    return this.usersService.updateProfile(user.sub, body);
  }

  /**
   * Uploads a new avatar (multipart field `file`). The previous image is
   * deleted after the database has been repointed at the new one.
   */
  @Post('me/avatar')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      // Reject oversized files while streaming, before they land in memory.
      limits: { fileSize: AVATAR_MAX_BYTES },
      // First line of defence on type: only image/* gets past multer at all.
      // LocalStorageService re-checks against its allow-list afterwards.
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Only image files are allowed'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a new profile picture' })
  @ApiCreatedResponse({ description: 'Avatar replaced' })
  @ApiBadRequestResponse({ description: 'No file, wrong type or empty file' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async uploadAvatar(
    @CurrentUser() user: AccessTokenPayload,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UpdateResponse> {
    // Wrong field name or an empty body arrives as undefined, not an error.
    if (!file) {
      throw new BadRequestException('Expected a "file" field with an image');
    }
    if (file.size === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }

    // Storage picks a fresh UUID name, so nothing from the request is used as
    // a path. The returned URL is what main.ts serves.
    const url = await this.storage.saveAvatar(file.buffer, file.mimetype);
    return this.usersService.setAvatar(user.sub, url);
  }

  /** Follows another account. Idempotent: repeating it is still 204. */
  @Post(':id/follow')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT) // No body → 204 rather than an empty object.
  @ApiOperation({ summary: 'Follow a user' })
  @ApiNoContentResponse({ description: 'Now following' })
  @ApiBadRequestResponse({ description: 'Cannot follow yourself' })
  @ApiNotFoundResponse({ description: 'No such user' })
  async follow(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') targetId: string,
  ): Promise<void> {
    return this.followsService.follow(user.sub, targetId);
  }

  /** Unfollows an account. Idempotent: unfollowing twice is still 204. */
  @Delete(':id/follow')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiNoContentResponse({ description: 'No longer following (or never did)' })
  @ApiNotFoundResponse({ description: 'No such user' })
  async unfollow(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') targetId: string,
  ): Promise<void> {
    return this.followsService.unfollow(user.sub, targetId);
  }
}
