// Admin console, part 2: content removal. GET/DELETE /admin/posts and
// /admin/comments — the tree's "Posts" and "Comments" nodes.

import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token/token.service.js';
import { AdminListQueryDto } from '../dtos/report.dto.js';
import { AdminGuard } from './admin.guard.js';
import {
  AdminService,
  type AdminCommentRow,
  type AdminPostRow,
} from './admin.service.js';
import type { Paginated } from '../common/pagination.js';

@ApiTags('admin')
@Controller('admin')
@UseGuards(AccessTokenGuard, AdminGuard)
@ApiBearerAuth()
export class AdminContentController {
  constructor(private readonly admin: AdminService) {}

  /** Every post, newest first — search narrows to a phrase. */
  @Get('posts')
  @ApiOperation({ summary: 'List posts (admin)' })
  @ApiOkResponse({ description: 'Page of posts with author and comment count' })
  async listPosts(@Query() query: AdminListQueryDto): Promise<Paginated<AdminPostRow>> {
    return this.admin.listPosts(query);
  }

  /** Removes a post as moderation: same cascade the author's own delete has. */
  @Delete('posts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a post (admin)' })
  @ApiNoContentResponse({ description: 'Post removed' })
  async removePost(
    @CurrentUser() admin: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<void> {
    return this.admin.removePost(id, admin.sub);
  }

  /** Every comment, newest first — for reading a reported thread. */
  @Get('comments')
  @ApiOperation({ summary: 'List comments (admin)' })
  @ApiOkResponse({ description: 'Page of comments with author and post' })
  async listComments(@Query() query: AdminListQueryDto): Promise<Paginated<AdminCommentRow>> {
    return this.admin.listComments(query);
  }

  /** Removes a comment (and its replies) as moderation. */
  @Delete('comments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a comment (admin)' })
  @ApiNoContentResponse({ description: 'Comment removed' })
  async removeComment(
    @CurrentUser() admin: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<void> {
    return this.admin.removeComment(id, admin.sub);
  }
}
