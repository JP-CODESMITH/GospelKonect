import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';

// Trimmed once, before validation, so the stored body never carries leading or
// trailing whitespace — and a payload of "   " fails @Length(1, …) below
// instead of being saved as a blank post.
const trimmed = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** The post body. Everything else on a post is server-owned. */
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

  /**
   * Pre-uploaded blobs to attach, in order (POST /media first). Optional: a
   * text-only post sends nothing. The 4/1-or-video shape rule and ownership
   * are enforced in MediaService — validation only checks the shape here, so
   * a bad id still reaches a meaningful 400 from the service.
   */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(4)
  mediaIds?: string[];
}

/**
 * PATCH body. Content is required (not partial): an edit replaces the body,
 * and an empty PATCH would otherwise bump updatedAt for no reason. mediaIds,
 * when present, REPLACES the attachment list; when absent it is left alone.
 */
export class UpdatePostDto extends CreatePostDto {}
