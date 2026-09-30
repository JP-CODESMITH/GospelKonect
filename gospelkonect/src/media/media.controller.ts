// MediaController — the upload/read/delete surface for blobs.
//
//   POST   /media            authenticated multipart upload (field "file")
//   GET    /media/:id        public metadata (id, kind, type, size, url)
//   GET    /media/:id/file   public bytes: 302 to a signed URL (bucket) or to
//                            the static /uploads path (local disk)
//   DELETE /media/:id        owner-only removal (409 while still attached)
//
// Bytes always flow through here — there is no direct-to-storage signing —
// so validation, size caps and ownership live in one place.

import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token/token.service.js';
import { MEDIA_MAX_BYTES } from './media.constants.js';
import { MediaService, type UploadedMedia } from './media.service.js';
import { RateLimit, RateLimitGuard } from '../security/rate-limit.guard.js';

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * Uploads one image or video. Multer hard-caps the request at 100 MB while
   * streaming (a multer LIMIT_FILE_SIZE surfaces as 413); the per-type caps —
   * 10 MB images, 100 MB videos — are enforced by MediaService afterwards.
   */
  @Post()
  @UseGuards(AccessTokenGuard, RateLimitGuard)
  @RateLimit({ scope: 'media', points: 60, windowSec: 60 })
  @UseInterceptors(
    FileInterceptor('file', {
      // Explicit memory storage: the buffer is what MediaService validates
      // and hands to the backend, and the caps are small enough for it.
      storage: memoryStorage(),
      limits: { fileSize: MEDIA_MAX_BYTES },
      // First gate: only image/* and video/* reach the service, which then
      // checks the concrete type against its allow-list.
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
          cb(new BadRequestException('Only image or video files are allowed'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload media (field "file")' })
  @ApiCreatedResponse({ description: 'Media stored; url points at /media/:id/file' })
  @ApiBadRequestResponse({ description: 'Unsupported type, empty or over the per-type cap' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async upload(
    @CurrentUser() user: AccessTokenPayload,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UploadedMedia> {
    // A wrong field name or an empty body arrives as undefined, not an error.
    if (!file) {
      throw new BadRequestException('Expected a "file" field with an image or video');
    }
    return this.mediaService.upload(user.sub, file);
  }

  /** Metadata for one blob. Public: a post embeds it, so it must be readable. */
  @Get(':id')
  @ApiOperation({ summary: 'Media metadata' })
  @ApiOkResponse({ description: 'The metadata' })
  @ApiNotFoundResponse({ description: 'No such media' })
  async getOne(@Param('id') id: string): Promise<UploadedMedia> {
    return this.mediaService.getById(id);
  }

  /**
   * The bytes. Public and unauthenticated on purpose (an <img> tag carries no
   * token); we answer with a redirect so the file itself still streams
   * straight from storage and never proxies through NestJS.
   */
  @Get(':id/file')
  @ApiOperation({ summary: 'Download the bytes (redirects to storage)' })
  @ApiOkResponse({ description: '302 to the storage URL' })
  @ApiNotFoundResponse({ description: 'No such media' })
  async file(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const target = await this.mediaService.fileTarget(id);
    // Short client-side caching of the redirect itself; the signed target
    // behind it stays valid for 24h anyway.
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.redirect(HttpStatus.FOUND, target);
  }

  /** Removes an unattached blob you own. 409 while a post still uses it. */
  @Delete(':id')
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete your media' })
  @ApiNoContentResponse({ description: 'Media deleted' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'The media belongs to another user' })
  @ApiConflictResponse({ description: 'Still attached to a post' })
  @ApiNotFoundResponse({ description: 'No such media' })
  async remove(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<void> {
    return this.mediaService.delete(id, user.sub);
  }
}
