// LocalStorageService — writes avatar images to disk and hands back the URL
// that main.ts serves them from.
//
// Deliberately behind a small interface (save/delete by URL) so the backing
// store can be swapped for Prisma Storage or S3 later without touching the
// controller: only this file knows about the filesystem.

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// node:fs/promises is the promise API — every method here is async anyway, and
// it keeps the event loop free while a file is written.
import { mkdir, unlink, writeFile } from 'node:fs/promises';
// path.join is used instead of string concatenation so a leading/trailing slash
// in UPLOAD_DIR can never produce a broken path.
import { join, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

// Allowed avatar types mapped to the extension written to disk. Deriving the
// extension from the CONTENT type (not the filename) means a client can't
// upload "avatar.png" that is actually an .html or .svg script.
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

// Absolute cap on one avatar upload, enforced by multer BEFORE the bytes are
// buffered in memory. Exported because multer's options are evaluated at import
// time — before ConfigModule has read .env — so this cannot come from Config.
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

// Public URL prefix that main.ts maps to the upload directory.
const PUBLIC_PREFIX = '/uploads';
// Subfolder used for avatars so other asset types can be added later.
const AVATAR_FOLDER = 'avatars';

@Injectable()
export class LocalStorageService {
  private readonly logger = new Logger(LocalStorageService.name);

  // Resolved once so every call uses the same absolute directory.
  private readonly rootDir: string;

  constructor(config: ConfigService) {
    // ?? 'uploads' mirrors the default in env.config.ts.
    this.rootDir = resolve(config.get<string>('upload.dir') ?? 'uploads');
  }

  /** Content types accepted for an avatar upload. */
  static get allowedMimeTypes(): string[] {
    return Object.keys(EXTENSION_BY_MIME);
  }

  /**
   * Writes one avatar buffer and returns its public URL (e.g.
   * /uploads/avatars/9f3c….png). Rejects unsupported content types — the
   * filename is never trusted, only the declared MIME type.
   */
  async saveAvatar(buffer: Buffer, mimetype: string): Promise<string> {
    const extension = EXTENSION_BY_MIME[mimetype];
    if (!extension) {
      throw new BadRequestException(
        `Unsupported image type. Allowed: ${LocalStorageService.allowedMimeTypes.join(', ')}`,
      );
    }

    const folder = join(this.rootDir, AVATAR_FOLDER);
    // Recursive: mkdir would otherwise throw if the directory doesn't exist yet.
    await mkdir(folder, { recursive: true });

    // randomUUID makes collisions impossible and stops a filename from being
    // controlled by the uploader (no path traversal via the filename).
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(join(folder, filename), buffer);

    return `${PUBLIC_PREFIX}/${AVATAR_FOLDER}/${filename}`;
  }

  /**
   * Best-effort removal of a previously stored avatar. Failures are logged, not
   * thrown: deleting an old image must never fail a profile update that has
   * already succeeded.
   */
  async deleteByUrl(url: string): Promise<void> {
    try {
      // Only accept URLs we issued. Anything else (absolute paths, `..`, other
      // hosts) is ignored rather than resolved, which closes path traversal.
      if (!url.startsWith(`${PUBLIC_PREFIX}/`)) return;

      const relative = url.slice(PUBLIC_PREFIX.length + 1); // strip "/uploads/"
      const target = resolve(join(this.rootDir, relative));

      // resolve() normalises "..", so compare against the root to confirm the
      // final path is still inside the upload directory before deleting.
      if (target !== this.rootDir && !target.startsWith(this.rootDir + sep)) return;

      await unlink(target);
    } catch (err) {
      this.logger.warn(
        `Could not delete old avatar ${url}: ${(err as Error).message}`,
      );
    }
  }
}
