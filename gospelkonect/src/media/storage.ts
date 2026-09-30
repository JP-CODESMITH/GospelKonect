// Storage backends behind one tiny interface: where the BYTES go.
//
//   s3    — a Composer bucket (dev emulator or the platform), reached through
//           Bun's built-in S3 client. Composer boots the service with Bun, and
//           the bucket rejects anonymous reads (measured: 403), so the public
//           URL we hand out is our own /media/:id/file endpoint, which
//           redirects to a signed link that expires in 24h.
//   local — the uploads directory served by main.ts at /uploads. Used
//           whenever no bucket is configured (plain `node dist/main.js`,
//           vitest, e2e): same code path, different store, and the redirect
//           target becomes an ordinary static URL.
//
// The mode is chosen once at boot from config.media.*; a partially configured
// bucket is a hard error rather than a silent fallback to the wrong place.

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { projectRoot } from '../config/project-root.js';

export interface StorageBackend {
  readonly mode: 's3' | 'local';
  /** Writes one blob. Keys are server-generated and never user input. */
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  /** Best-effort removal: a missing object is not an error to the caller. */
  remove(key: string): Promise<void>;
  /** Where GET /media/:id/file redirects to. */
  redirectTarget(key: string): Promise<string>;
}

/** The three Bun.s3 operations the backend uses (see src/types/bun.d.ts). */
type BunClient = {
  write(key: string, data: Buffer, options: { type: string }): Promise<unknown>;
  delete(key: string): Promise<unknown>;
  presign(key: string): Promise<string>;
};

/** Composer's four bucket variables, or none of them. */
interface BucketConfig {
  endpoint?: string;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

/** Disk backend: <uploads>/<key>, served by main.ts at /uploads/<key>. */
class LocalBackend implements StorageBackend {
  readonly mode = 'local' as const;
  // Resolved from the project root, not cwd: under Composer dev cwd is the
  // service artifact directory, and files written there vanish on rebuild.
  private readonly rootDir: string;
  // The static prefix main.ts mounts the upload directory at.
  private readonly staticPrefix = '/uploads';

  constructor(uploadDir: string) {
    this.rootDir = join(projectRoot(), uploadDir);
  }

  async put(key: string, data: Buffer): Promise<void> {
    const target = this.pathFor(key);
    // uploads/media may not exist on a fresh checkout.
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data);
  }

  async remove(key: string): Promise<void> {
    try {
      await unlink(this.pathFor(key));
    } catch {
      // Already gone: removal is best-effort by contract.
    }
  }

  async redirectTarget(key: string): Promise<string> {
    return `${this.staticPrefix}/${key}`;
  }

  /**
   * Absolute path for a key, re-checked against the root so a key can never
   * walk out of the upload directory (path traversal defence in depth — keys
   * are server-generated anyway, but the check costs nothing).
   */
  private pathFor(key: string): string {
    const target = resolve(join(this.rootDir, key));
    if (target !== this.rootDir && !target.startsWith(this.rootDir + sep)) {
      throw new Error(`Media key escapes the upload directory: ${key}`);
    }
    return target;
  }
}

/** Bucket backend: Bun.s3 against the Composer-injected endpoint. */
class S3Backend implements StorageBackend {
  readonly mode = 's3' as const;
  private readonly client: BunClient;

  constructor(config: Required<BucketConfig>) {
    // Fail fast with an actionable message instead of "Bun is not defined"
    // on the first upload: only Composer's runtime provides the global. The
    // guard also narrows Bun's type for the constructor call below.
    if (typeof Bun === 'undefined') {
      throw new Error(
        'A media bucket is configured but this process is not running under Bun. ' +
          'Start the service with `bun run composer:dev`, or unset ' +
          'COMPOSER_API_MEDIA_* to fall back to local disk.',
      );
    }
    this.client = new Bun.S3Client({
      endpoint: config.endpoint,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      bucket: config.bucket,
    });
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    await this.client.write(key, data, { type: contentType });
  }

  async remove(key: string): Promise<void> {
    await this.client.delete(key);
  }

  async redirectTarget(key: string): Promise<string> {
    // Bun's default expiry is 24h; clients re-request /media/:id/file for
    // each render, so a long-lived signature is never cached anywhere.
    return this.client.presign(key);
  }
}

/**
 * Picks the backend from config: all four bucket variables → S3, none → disk,
 * anything in between → boot error.
 */
@Injectable()
export class StorageBackendProvider {
  readonly backend: StorageBackend;

  constructor(config: ConfigService) {
    const bucket = config.get<BucketConfig>('media') ?? {};
    const values = Object.values(bucket);
    const present = values.filter((value) => value !== undefined && value !== '');
    if (present.length > 0 && present.length < values.length) {
      throw new Error(
        'Incomplete media bucket configuration: COMPOSER_API_MEDIA_URL, ' +
          'COMPOSER_API_MEDIA_BUCKET, COMPOSER_API_MEDIA_ACCESSKEYID and ' +
          'COMPOSER_API_MEDIA_SECRETACCESSKEY must all be set (or all be unset).',
      );
    }
    this.backend =
      present.length === 0
        ? new LocalBackend(config.get<string>('upload.dir') ?? 'uploads')
        : new S3Backend(bucket as Required<BucketConfig>);
  }
}
