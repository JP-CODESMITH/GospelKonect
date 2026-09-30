// MediaService — the upload pipeline behind every blob on the platform:
// post attachments and profile pictures alike.
//
// Split of responsibility:
//   bytes  → StorageBackend (bucket under Composer, uploads/ otherwise)
//   metadata → the Media table in PostgreSQL (owner, kind, type, size, key)
//   URL    → a stable /api/v1/media/<id>/file link, never a signed one
//
// Ownership is enforced for every mutation: a media row belongs to whoever
// uploaded it, and only the owner may delete it — except when it is still
// attached to a post, which answers 409 rather than silently breaking a
// published post.

import {
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { randomUUID } from 'node:crypto';
import {
  extensionFor,
  kindFor,
  MAX_ATTACHMENTS,
  MEDIA_KEY_PREFIX,
  maxBytesFor,
} from './media.constants.js';
import { StorageBackendProvider, type StorageBackend } from './storage.js';
import { toMediaDto, type MediaDto } from './media.types.js';

/** One upload: the wire shape plus when it was created. */
export interface UploadedMedia extends MediaDto {
  createdAt: Date;
}

/** Rules the attachment list of one post must satisfy. */
export interface AttachmentRules {
  /** Hard cap per post (4). */
  max?: number;
  /** Avatar-style uploads: images only. */
  imagesOnly?: boolean;
  /** Override the per-type byte cap (avatars keep the 2 MB limit). */
  maxBytes?: number;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly storage: StorageBackend;

  constructor(
    private readonly prisma: PrismaService,
    providers: StorageBackendProvider,
  ) {
    this.storage = providers.backend;
  }

  /** 's3' under Composer, 'local' otherwise — surfaced for diagnostics/tests. */
  get mode(): 's3' | 'local' {
    return this.storage.mode;
  }

  /**
   * Stores one uploaded file and returns its metadata. The sequence matters:
   * bytes first, row second — a failed write leaves no dangling row — with a
   * compensating delete if the row itself cannot be saved.
   */
  async upload(
    ownerId: string,
    file: Pick<Express.Multer.File, 'buffer' | 'mimetype' | 'size'>,
    rules: AttachmentRules = {},
  ): Promise<UploadedMedia> {
    if (!file || file.size === 0) {
      throw new BadRequestException('Expected a "file" field with content');
    }

    // Type first: an unsupported MIME type is rejected before any sizing or
    // I/O, and the extension is derived from it (never from the filename).
    const kind = kindFor(file.mimetype);
    if (rules.imagesOnly && kind !== 'IMAGE') {
      throw new BadRequestException('Only image files are allowed');
    }

    const cap = rules.maxBytes ?? maxBytesFor(kind);
    if (file.size > cap) {
      throw new BadRequestException(
        `${kind === 'VIDEO' ? 'Video' : 'Image'} exceeds the ${formatBytes(cap)} limit`,
      );
    }

    const key = `${MEDIA_KEY_PREFIX}/${randomUUID()}.${extensionFor(file.mimetype)}`;
    await this.storage.put(key, file.buffer, file.mimetype);

    try {
      const row = await this.prisma.media.create({
        data: { ownerId, kind, mimeType: file.mimetype, bytes: file.size, key },
      });
      return { ...toMediaDto(row), createdAt: row.createdAt };
    } catch (err) {
      // The row is the source of truth for the URL; without it the bytes are
      // unreachable, so drop them rather than leak an orphan object.
      await this.storage.remove(key).catch(() => undefined);
      throw err;
    }
  }

  /** Public metadata for one blob: id, kind, type, size, URL. */
  async getById(id: string): Promise<UploadedMedia> {
    const row = await this.prisma.media.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Media not found');
    return { ...toMediaDto(row), createdAt: row.createdAt };
  }

  /**
   * The redirect target for GET /media/:id/file — a signed storage URL under
   * Composer, a static /uploads/... path otherwise. 404 when the blob is gone.
   */
  async fileTarget(id: string): Promise<string> {
    const row = await this.prisma.media.findUnique({
      where: { id },
      select: { key: true },
    });
    if (!row) throw new NotFoundException('Media not found');
    return this.storage.redirectTarget(row.key);
  }

  /**
   * Deletes one blob. 404 for an unknown id, 403 for someone else's, 409 when
   * it is still attached to a post — deleting it there would leave a published
   * post pointing at nothing, so the post must be edited or deleted first.
   */
  /**
   * Removes stored objects by key, with no ownership or attachment checks.
   * Moderation only: by the time this runs the row (account, post) is already
   * gone, so there is nothing left to ask permission of. Best effort — a
   * missing object must not fail the deletion that triggered it.
   */
  async deleteObjects(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.storage.remove(key).catch((err: Error) => {
        this.logger.debug(`object cleanup skipped for ${key}: ${err.message}`);
      });
    }
  }

  async delete(id: string, actorId: string): Promise<void> {
    const row = await this.prisma.media.findUnique({
      where: { id },
      select: { ownerId: true, key: true, posts: { select: { postId: true } } },
    });
    if (!row) throw new NotFoundException('Media not found');
    if (row.ownerId !== actorId) {
      throw new ForbiddenException('You can only delete your own media');
    }
    if (row.posts.length > 0) {
      throw new ConflictException('Media is still attached to a post');
    }
    await this.prisma.media.delete({ where: { id } });
    await this.bestEffortRemove(row.key);
  }

  /**
   * Removes a blob by the URL stored in User.avatar. Returns true when the
   * URL was one of ours (and the row is gone), false when it is a legacy
   * /uploads/... path the caller should hand to LocalStorageService instead.
   */
  async deleteByUrl(url: string, ownerId: string): Promise<boolean> {
    // Ids are UUIDs in practice; the pattern stays permissive (and safe — it
    // is a match, not a path) so test doubles and future id formats still work.
    const match = /^\/api\/v1\/media\/([A-Za-z0-9_-]{1,64})\/file$/.exec(url);
    if (!match) return false;

    const row = await this.prisma.media.findUnique({
      where: { id: match[1] },
      select: { ownerId: true, key: true, posts: { select: { postId: true } } },
    });
    // Missing or attached: nothing to do, and never touch someone else's row.
    if (row && row.ownerId === ownerId && row.posts.length === 0) {
      await this.prisma.media.delete({ where: { id: match[1] } });
      await this.bestEffortRemove(row.key);
    }
    return true;
  }

  /**
   * Validates the mediaIds of a post body and returns them in request order.
   * Every failure is a 400 with the same "unknown media" wording for missing
   * and foreign ids alike, so the API never confirms which ids exist.
   */
  async validateAttachments(ownerId: string, mediaIds: string[]): Promise<string[]> {
    if (mediaIds.length === 0) return [];
    if (mediaIds.length > MAX_ATTACHMENTS) {
      throw new BadRequestException(`A post carries at most ${MAX_ATTACHMENTS} attachments`);
    }
    if (new Set(mediaIds).size !== mediaIds.length) {
      throw new BadRequestException('Duplicate media ids');
    }

    const owned = await this.prisma.media.findMany({
      where: { id: { in: mediaIds }, ownerId },
      select: { id: true, kind: true },
    });
    if (owned.length !== mediaIds.length) {
      throw new BadRequestException('Unknown media id');
    }

    // Either up to four images, or one video standing alone.
    const kinds = new Set(owned.map((row) => row.kind));
    if (kinds.has('VIDEO') && !(owned.length === 1 && owned[0].kind === 'VIDEO')) {
      throw new BadRequestException(
        'A post carries either up to 4 images or a single video, not a mix',
      );
    }

    // Prisma returns rows in no particular order; mediaIds already IS the
    // caller's order, and every id in it was proven to exist and belong here.
    return mediaIds;
  }

  /**
   * Cleans up after a post was deleted: any of the given blobs that are now
   * unattached (and still belong to this owner) lose their row and their
   * bytes. Shared blobs — attached to another post — survive.
   */
  async deleteOrphans(mediaIds: string[], ownerId: string): Promise<void> {
    if (mediaIds.length === 0) return;
    const orphans = await this.prisma.media.findMany({
      where: { id: { in: mediaIds }, ownerId, posts: { none: {} } },
      select: { id: true, key: true },
    });
    if (orphans.length === 0) return;
    await this.prisma.media.deleteMany({ where: { id: { in: orphans.map((o) => o.id) } } });
    for (const orphan of orphans) {
      await this.bestEffortRemove(orphan.key);
    }
  }

  // --- helpers --------------------------------------------------------------

  /** Storage deletes never fail a request that already succeeded in the DB. */
  private async bestEffortRemove(key: string): Promise<void> {
    try {
      await this.storage.remove(key);
    } catch (err) {
      this.logger.warn(`Could not remove ${key}: ${(err as Error).message}`);
    }
  }
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${bytes / (1024 * 1024)} MB` : `${bytes} bytes`;
}
