// Editing and deleting a comment: PATCH/DELETE /comments/:id.
//
// Split from PostCommentsController because these paths hang off the comment
// id directly — the same reason PostsController and UserPostsController are
// separate files.

import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { UpdateCommentDto } from '../dtos/comment.dto.js';
import { CommentsService } from './comments.service.js';

type CommentResponse = Awaited<ReturnType<CommentsService['update']>>;

@ApiTags('comments')
@Controller('comments')
export class CommentController {
  constructor(private readonly commentsService: CommentsService) {}

  /** Replaces the body of your own comment. */
  @Patch(':id')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit your comment' })
  @ApiOkResponse({ description: 'Updated comment (updatedAt is refreshed)' })
  @ApiForbiddenResponse({ description: 'The comment belongs to another user' })
  @ApiNotFoundResponse({ description: 'No such comment' })
  async update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body() body: UpdateCommentDto,
  ): Promise<CommentResponse> {
    return this.commentsService.update(id, user.sub, body);
  }

  /** Permanently deletes your own comment, and every reply beneath it. */
  @Delete(':id')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT) // Nothing to return → 204, not {}.
  @ApiOperation({ summary: 'Delete your comment' })
  @ApiNoContentResponse({ description: 'Comment deleted' })
  @ApiForbiddenResponse({ description: 'The comment belongs to another user' })
  @ApiNotFoundResponse({ description: 'No such comment' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async remove(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<void> {
    return this.commentsService.remove(id, user.sub);
  }
}
