// Report intake: POST /reports (file one) and GET /reports/mine (follow up).

import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token/token.service.js';
import { CreateReportDto } from '../dtos/report.dto.js';
import { PaginationDto } from '../dtos/pagination.dto.js';
import { RateLimit, RateLimitGuard } from '../security/rate-limit.guard.js';
import { ReportsService, type ReportResponse } from './reports.service.js';

type ReportList = Awaited<ReturnType<ReportsService['listMine']>>;

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /**
   * Reports a user, post or comment. Answering 201 for a report that is
   * already open on the same target is deliberate: the client's job is "tell
   * the moderators", and it succeeded either way.
   */
  @Post()
  @UseGuards(AccessTokenGuard, RateLimitGuard)
  @RateLimit({ scope: 'reports', points: 30, windowSec: 3600 })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report a user, post or comment' })
  @ApiCreatedResponse({ description: 'Report filed (or the open one you already filed)' })
  async create(
    @CurrentUser() user: AccessTokenPayload,
    @Body() body: CreateReportDto,
  ): Promise<ReportResponse> {
    return this.reports.create(user.sub, body);
  }

  /** Your own reports and their current status. */
  @Get('mine')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List your reports' })
  @ApiOkResponse({ description: 'Page of reports, newest first' })
  async listMine(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: PaginationDto,
  ): Promise<ReportList> {
    return this.reports.listMine(user.sub, query);
  }
}
