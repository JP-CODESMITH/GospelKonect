import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from './pagination.dto.js';

// Query for GET /users — discovery/search. Page/limit come from PaginationDto
// (src/dtos/pagination.dto.ts), which every paginated endpoint shares.
export class SearchUsersDto extends PaginationDto {
  // Optional free-text term matched against username and name. Empty means
  // "list everyone", which is what makes the endpoint double as pagination.
  @IsOptional()
  @IsString()
  @MaxLength(50)
  search?: string;
}
