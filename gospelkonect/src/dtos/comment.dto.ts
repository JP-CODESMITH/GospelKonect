import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';

// Trimmed once, before validation, so a comment of "   " fails @Length(1, …)
// instead of being stored as a blank line.
const trimmed = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Body for POST /posts/:postId/comments. `parentId` turns the comment into a
 * reply to another comment in the same post — the same-thread rule is checked
 * in the service, where a 400 can explain what was wrong with the id.
 */
export class CreateCommentDto {
  @Transform(({ value }) => trimmed(value))
  @IsString()
  // Same ceiling as a post: enough for a real reply, small enough that one
  // comment cannot bloat every page of the conversation.
  @Length(1, 1000)
  @Matches(/\S/, { message: 'content must not be blank' })
  content!: string;

  @IsOptional()
  @IsUUID('4')
  parentId?: string;
}

/** PATCH /comments/:id — an edit replaces the body, like a post edit. */
export class UpdateCommentDto {
  @Transform(({ value }) => trimmed(value))
  @IsString()
  @Length(1, 1000)
  @Matches(/\S/, { message: 'content must not be blank' })
  content!: string;
}
