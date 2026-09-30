import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token/token.service.js';
import { MarkReadDto, QueryNotificationsDto } from '../dtos/notification.dto.js';
import {
  NotificationsService,
  type NotificationResponse,
} from './notifications.service.js';
import type { Paginated } from '../common/pagination.js';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** The inbox. `?unread=true` narrows to the unread slice. */
  @Get()
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my notifications' })
  @ApiOkResponse({ description: 'Page of notifications, newest first' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async list(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: QueryNotificationsDto,
  ): Promise<Paginated<NotificationResponse>> {
    return this.notifications.list(user.sub, query, query.unread === true);
  }

  /**
   * The badge number. Separate endpoint on purpose: the client polls this far
   * more often than it fetches the full list, and a count is one indexed row
   * scan rather than a page of joined rows.
   */
  @Get('unread-count')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Count my unread notifications' })
  @ApiOkResponse({ description: 'The count' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async unreadCount(@CurrentUser() user: AccessTokenPayload): Promise<{ count: number }> {
    return { count: await this.notifications.unreadCount(user.sub) };
  }

  /**
   * Marks notifications read. With `ids` it marks those; without it, every
   * unread notification ("mark all as read").
   */
  @Post('read')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK) // Returns a count, so 200 rather than the 201 default.
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ApiCreatedResponse({ description: 'How many rows changed' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async markRead(
    @CurrentUser() user: AccessTokenPayload,
    @Body() body: MarkReadDto,
  ): Promise<{ updated: number }> {
    return { updated: await this.notifications.markRead(user.sub, body.ids) };
  }
}
