// Admin console, part 3: the report workflow and the audit trail.

import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token/token.service.js';
import { AdminListQueryDto, AdminReportsQueryDto, UpdateReportDto } from '../dtos/report.dto.js';
import { AdminGuard } from './admin.guard.js';
import {
  AdminService,
  type ModerationActionRow,
} from './admin.service.js';
import type { ReportResponse } from './reports.service.js';
import type { Paginated } from '../common/pagination.js';

@ApiTags('admin')
@Controller('admin')
@UseGuards(AccessTokenGuard, AdminGuard)
@ApiBearerAuth()
export class AdminReportsController {
  constructor(private readonly admin: AdminService) {}

  /** The queue. Filter by reportStatus (PENDING first) or targetType. */
  @Get('reports')
  @ApiOperation({ summary: 'List reports (admin)' })
  @ApiOkResponse({ description: 'Page of reports, newest first' })
  async listReports(@Query() query: AdminReportsQueryDto): Promise<Paginated<ReportResponse>> {
    return this.admin.listReports(query);
  }

  /**
   * Moves a report along the workflow: REVIEWING while it is being looked at,
   * RESOLVED or DISMISSED to close it (both stamp who closed it and when).
   */
  @Patch('reports/:id')
  @ApiOperation({ summary: 'Update a report’s status (admin)' })
  @ApiOkResponse({ description: 'The updated report' })
  async updateReport(
    @CurrentUser() admin: AccessTokenPayload,
    @Param('id') id: string,
    @Body() body: UpdateReportDto,
  ): Promise<ReportResponse> {
    return this.admin.updateReport(id, admin.sub, body);
  }

  /** What every moderator did, newest first. Append-only by construction. */
  @Get('actions')
  @ApiOperation({ summary: 'List moderation actions (admin)' })
  @ApiOkResponse({ description: 'Page of audit entries' })
  async listActions(@Query() query: AdminListQueryDto): Promise<Paginated<ModerationActionRow>> {
    return this.admin.listActions(query);
  }
}
