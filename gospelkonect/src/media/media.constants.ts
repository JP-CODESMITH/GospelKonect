// Upload rules for Phase 8. Everything a client can get wrong is decided
// here, once, so the controller, the service and the tests agree.

import { BadRequestException } from '@nestjs/common';
import type { MediaKind } from '@prisma/client';

// Accepted content types mapped to the extension the stored key gets. The
// extension comes from the MIME type, never from the client's filename, so
// "avatar.png" that is really HTML can't be served as HTML from our origin.
export const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

export const VIDEO_EXTENSIONS: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

// Per-type byte caps, checked after multer has buffered the file. Images are
// small; a video may be two orders of magnitude larger but never unbounded.
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024; // 100 MB

// Multer's own hard stop, evaluated at import time (before ConfigModule
// exists), which is why it is a constant like AVATAR_MAX_BYTES: reject while
// streaming rather than after 100 MB of Buffer exists.
export const MEDIA_MAX_BYTES = VIDEO_MAX_BYTES;

// A post carries at most four images, or a single video — never both.
export const MAX_ATTACHMENTS = 4;

// Key prefix inside the bucket / uploads directory.
export const MEDIA_KEY_PREFIX = 'media';

/** The media kind a MIME type maps to, or 400 when it is not uploadable. */
export function kindFor(mimetype: string): MediaKind {
  if (mimetype in IMAGE_EXTENSIONS) return 'IMAGE';
  if (mimetype in VIDEO_EXTENSIONS) return 'VIDEO';
  throw new BadRequestException(
    `Unsupported media type "${mimetype}". Allowed: ${[
      ...Object.keys(IMAGE_EXTENSIONS),
      ...Object.keys(VIDEO_EXTENSIONS),
    ].join(', ')}`,
  );
}

/** File extension for a supported MIME type ('.jpg' style, no dot). */
export function extensionFor(mimetype: string): string {
  return IMAGE_EXTENSIONS[mimetype] ?? VIDEO_EXTENSIONS[mimetype] ?? 'bin';
}

/** Byte cap for one upload of the given kind. */
export function maxBytesFor(kind: MediaKind): number {
  return kind === 'VIDEO' ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
}
