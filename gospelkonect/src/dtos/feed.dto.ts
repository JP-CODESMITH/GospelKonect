import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from './pagination.dto.js';

// Query for GET /feed. Two ways to walk the timeline, picked by which params
// arrive:
//   - page/limit  → classic pagination (meta.page/totalPages are meaningful)
//   - cursor      → keyset continuation for infinite scroll, immune to posts
//                   being inserted above the fold while the user scrolls
// A cursor wins over `page` when both are sent.
export class FeedQueryDto extends PaginationDto {
  // Opaque keyset token (base64url of tier+createdAt+id). Opaque on purpose:
  // clients must treat it as a string, so its encoding can change later
  // without a breaking change.
  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;
}
