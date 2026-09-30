import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { PaginationDto } from './pagination.dto.js';

// Query for GET /notifications — the inbox.
export class QueryNotificationsDto extends PaginationDto {
  // `?unread=true` narrows to the unread slice (what an inbox view wants).
  // Parsed here because query strings arrive as text; the pipe's transform
  // option does not convert "true"/"false" to booleans on its own.
  @IsOptional()
  // @Transform (unlike @Type) receives the raw value, which is what needs
  // converting here: "true"/"false" strings straight off the query string.
  // Anything else is left as-is so IsBoolean rejects it with a 400 instead of
  // quietly reading `?unread=maybe` as false.
  @Transform(({ value }) => {
    if (value === undefined) return value;
    if (value === true || value === 'true' || value === '') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  unread?: boolean;
}

// Body for POST /notifications/read.
export class MarkReadDto {
  // Specific ids to mark. Omitted = mark everything unread — the "mark all as
  // read" button, which is the common case and needs no round trip per item.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  ids?: string[];
}
