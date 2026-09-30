import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

// Trimmed once, before validation, so the stored body never carries leading or
// trailing whitespace — and so a payload of "   " fails @Length(1, …) below
// instead of being saved as a blank post.
const trimmed = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** The post body. Everything else about a post is server-owned. */
export class CreatePostDto {
  @Transform(({ value }) => trimmed(value))
  @IsString()
  // 1000 chars: room for a real message, small enough that one post can't be
  // used to bloat every feed response.
  @Length(1, 1000)
  // Belt and braces for whitespace-only input that survives Length (e.g. a
  // string made entirely of a single space is trimmed to '' by @Transform, but
  // this also rejects exotic whitespace such as zero-width spaces).
  @Matches(/\S/, { message: 'content must not be blank' })
  content!: string;
}

/**
 * PATCH body. Content is required (not partial): an edit replaces the body,
 * and an empty PATCH would otherwise bump updatedAt for no reason.
 */
export class UpdatePostDto extends CreatePostDto {}
