import { IsOptional, IsString, Length, IsUrl, MaxLength } from 'class-validator';

// Profile fields a user may edit about themselves. Deliberately excludes
// email/username (identity + uniqueness are handled by dedicated flows) and
// password (needs its own change-password endpoint with current-password
// verification), and matches the optional columns on the Prisma `User` model.
export class UpdateUserDto {
  // Display name — schema column `name` (required there, optional here so the
  // client can send only the fields it wants to change).
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  // Short bio — schema column `bio String?`.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  // Avatar URL — schema column `avatar String?`. IsUrl rejects arbitrary text,
  // so a user can't store a javascript: link that other clients might render.
  @IsOptional()
  @IsUrl({ require_tld: false }) // require_tld:false allows http://localhost for dev.
  @MaxLength(2048)
  avatar?: string;
}
