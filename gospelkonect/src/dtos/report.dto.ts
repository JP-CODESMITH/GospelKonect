import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import {
  AccountStatus,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  UserRole,
} from '@prisma/client';
import { PaginationDto } from './pagination.dto.js';

/**
 * POST /reports. The target is polymorphic: (targetType, targetId) points at
 * the user, post or comment being reported. Validation checks the shape; the
 * service checks that the row actually exists.
 */
export class CreateReportDto {
  @IsEnum(ReportTargetType)
  targetType!: ReportTargetType;

  @IsUUID('4')
  targetId!: string;

  @IsEnum(ReportReason)
  reason!: ReportReason;

  // Free text only where the enum is not enough. Optional so a one-tap report
  // from a client can still go through.
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  details?: string;
}

/** PATCH /admin/reports/:id — moving a report along the workflow. */
export class UpdateReportDto {
  // Validated as an enum here; the SERVICE is what refuses PENDING, because
  // "stay open" is not a transition and a body asking for one is a client
  // bug worth a 400 with a sentence attached.
  @IsEnum(ReportStatus)
  status!: ReportStatus;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  resolution?: string;
}

/** POST /admin/users/:id/suspend — no `days` means "until an admin lifts it". */
export class SuspendUserDto {
  @IsOptional()
  @IsString()
  @Length(1, 500)
  reason?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  // 10 years is already "indefinite" in practice; the cap just stops a typo
  // creating an absurd date.
  @Max(3650)
  days?: number;
}

/** PATCH /admin/users/:id/role */
export class SetRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}

/** GET /admin/* list filters. */
export class AdminListQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;

  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;
}

export class AdminReportsQueryDto extends AdminListQueryDto {
  // Named apart from `status` (an account state on the base class): a report
  // queue filter and an account filter are different questions.
  @IsOptional()
  @IsEnum(ReportStatus)
  reportStatus?: ReportStatus;

  @IsOptional()
  @IsEnum(ReportTargetType)
  targetType?: ReportTargetType;
}
