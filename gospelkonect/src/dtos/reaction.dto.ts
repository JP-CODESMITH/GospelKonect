import { IsEnum } from 'class-validator';
import { ReactionType } from '@prisma/client';

/**
 * Body for PUT /posts/:id/reactions. One reaction per user per post, so this
 * is an upsert: sending a different type replaces the old one.
 */
export class SetReactionDto {
  @IsEnum(ReactionType)
  type!: ReactionType;
}
