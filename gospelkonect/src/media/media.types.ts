// The wire shape of an uploaded blob, shared by the media endpoints and by
// every post response that embeds attachments.
//
// `url` is deliberately a STABLE relative link (/api/v1/media/<id>/file), not
// a signed storage URL: signed links expire, avatars would go stale inside
// User.avatar, and every list endpoint would need a signature round trip. The
// file endpoint redirects (302) to a fresh signed URL — bytes still stream
// straight from storage, never through NestJS.

import type { MediaKind } from '@prisma/client';

export interface MediaDto {
  id: string;
  kind: MediaKind;
  mimeType: string;
  bytes: number;
  url: string;
}

/** The public, unauthenticated endpoint serving one blob's bytes. */
export const mediaFileUrl = (id: string): string => `/api/v1/media/${id}/file`;

/** Media rows as embedded in a post (id through url, no storage key). */
export const toMediaDto = (media: {
  id: string;
  kind: MediaKind;
  mimeType: string;
  bytes: number;
}): MediaDto => ({ ...media, url: mediaFileUrl(media.id) });
