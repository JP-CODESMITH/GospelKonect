import { IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

// Fields a user may edit via PATCH /users/me.
// `avatar` is deliberately NOT here: the profile picture must go through the
// multipart upload endpoint, otherwise a client could store an arbitrary URL
// (or a javascript: link) by editing it as plain text.
export class UpdateUserDto {
  // Display name — schema column `name`.
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  // Handle used for @mentions and profile URLs — schema column `username`.
  // Restricted to word characters so it can be used inside a URL path segment
  // (GET /users/:username) without any encoding.
  @IsOptional()
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username may only contain letters, numbers and underscores',
  })
  username?: string;

  // Short bio — schema column `bio String?`.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
