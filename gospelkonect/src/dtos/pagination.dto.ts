import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Shared page/limit pagination for every list endpoint (followers, following,
// discovery, feed). `transform: true` on the global ValidationPipe turns these
// query strings into real numbers, so services never have to parse them.
export class PaginationDto {
  // 1-based page number. Rejecting 0/negatives keeps `OFFSET (page-1)*limit`
  // from producing a negative offset.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  // Page size, capped at 100 so a client can't request the whole table.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
