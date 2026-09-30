import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MediaService } from './media.service.js';
import { StorageBackendProvider } from './storage.js';

// MediaService — upload, read, delete, attachment validation, orphan cleanup.
// The backend is stubbed: these tests are about rules and row lifecycle, not
// about where bytes land (local vs bucket is decided once at boot).
describe('MediaService', () => {
  let service: MediaService;

  // Shape-compatible with StorageBackend; mode is mutable so one test can flip
  // it to prove the passthrough.
  const storage = {
    mode: 'local' as 'local' | 's3',
    put: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    redirectTarget: vi.fn(async (key: string) => `https://cdn.test/${key}`),
  };

  const prisma = {
    media: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  const png = (bytes = 1024) => ({
    buffer: Buffer.alloc(bytes),
    mimetype: 'image/png',
    size: bytes,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    storage.mode = 'local';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageBackendProvider, useValue: { backend: storage } },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    const row = {
      id: 'media_1',
      ownerId: 'user_1',
      kind: 'IMAGE' as const,
      mimeType: 'image/png',
      bytes: 1024,
      key: 'media/abc.png',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };
    // Defaults; individual tests override what they care about.
    prisma.media.create.mockResolvedValue(row);
    prisma.media.findUnique.mockResolvedValue({ ...row, posts: [] });
  });

  // --- upload ---------------------------------------------------------------

  it('stores bytes, then creates the row, and answers with a stable file URL', async () => {
    const result = await service.upload('user_1', png());

    expect(storage.put).toHaveBeenCalledWith(
      expect.stringMatching(/^media\/[0-9a-f-]{36}\.png$/),
      expect.any(Buffer),
      'image/png',
    );
    expect(prisma.media.create).toHaveBeenCalledWith({
      data: {
        ownerId: 'user_1',
        kind: 'IMAGE',
        mimeType: 'image/png',
        bytes: 1024,
        key: expect.stringMatching(/^media\//),
      },
    });
    expect(result.url).toBe('/api/v1/media/media_1/file');
    expect(result.bytes).toBe(1024);
  });

  it('rejects an empty upload before touching storage', async () => {
    await expect(
      service.upload('user_1', { buffer: Buffer.alloc(0), mimetype: 'image/png', size: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('rejects an unsupported content type', async () => {
    await expect(
      service.upload('user_1', { ...png(), mimetype: 'application/pdf' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('enforces the per-type cap: 10 MB images, 100 MB videos', async () => {
    await expect(service.upload('user_1', png(11 * 1024 * 1024))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    prisma.media.create.mockResolvedValueOnce({
      id: 'video_1',
      ownerId: 'user_1',
      kind: 'VIDEO' as const,
      mimeType: 'video/mp4',
      bytes: 1,
      key: 'media/abc.mp4',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    await expect(
      service.upload('user_1', { buffer: Buffer.alloc(1), mimetype: 'video/mp4', size: 1 }),
    ).resolves.toMatchObject({ kind: 'VIDEO' });
  });

  it('honours a custom cap (avatars stay at 2 MB) and imagesOnly', async () => {
    await expect(service.upload('user_1', png(3 * 1024 * 1024), { maxBytes: 2 * 1024 * 1024 }))
      .rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.upload('user_1', { buffer: Buffer.alloc(8), mimetype: 'video/mp4', size: 8 }, {
        imagesOnly: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('removes the object when the row cannot be saved', async () => {
    prisma.media.create.mockRejectedValueOnce(new Error('db down'));

    await expect(service.upload('user_1', png())).rejects.toThrow('db down');
    // No row means no URL, so the bytes would be unreachable — drop them.
    expect(storage.remove).toHaveBeenCalledWith(expect.stringMatching(/^media\//));
  });

  // --- read -----------------------------------------------------------------

  it('returns metadata by id, or 404', async () => {
    await expect(service.getById('media_1')).resolves.toMatchObject({ id: 'media_1' });

    prisma.media.findUnique.mockResolvedValue(null);
    await expect(service.getById('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('resolves the file endpoint target from the backend', async () => {
    prisma.media.findUnique.mockResolvedValue({ key: 'media/abc.png' });

    await expect(service.fileTarget('media_1')).resolves.toBe('https://cdn.test/media/abc.png');

    prisma.media.findUnique.mockResolvedValue(null);
    await expect(service.fileTarget('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  // --- delete ---------------------------------------------------------------

  it('deletes an unattached blob the caller owns', async () => {
    prisma.media.findUnique.mockResolvedValue({
      ownerId: 'user_1',
      key: 'media/abc.png',
      posts: [],
    });

    await expect(service.delete('media_1', 'user_1')).resolves.toBeUndefined();
    expect(prisma.media.delete).toHaveBeenCalledWith({ where: { id: 'media_1' } });
    expect(storage.remove).toHaveBeenCalledWith('media/abc.png');
  });

  it('answers 404, 403 and 409 for missing, foreign and attached media', async () => {
    prisma.media.findUnique.mockResolvedValue(null);
    await expect(service.delete('x', 'user_1')).rejects.toBeInstanceOf(NotFoundException);

    prisma.media.findUnique.mockResolvedValue({
      ownerId: 'user_2',
      key: 'media/a.png',
      posts: [],
    });
    await expect(service.delete('x', 'user_1')).rejects.toBeInstanceOf(ForbiddenException);

    prisma.media.findUnique.mockResolvedValue({
      ownerId: 'user_1',
      key: 'media/a.png',
      posts: [{ postId: 'post_1' }],
    });
    await expect(service.delete('x', 'user_1')).rejects.toBeInstanceOf(ConflictException);
    // Nothing is removed in any of the three rejection paths.
    expect(prisma.media.delete).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('removes avatars by URL, but leaves legacy /uploads paths to the caller', async () => {
    prisma.media.findUnique.mockResolvedValue({
      ownerId: 'user_1',
      key: 'media/old.png',
      posts: [],
    });

    await expect(service.deleteByUrl('/api/v1/media/media_1/file', 'user_1')).resolves.toBe(
      true,
    );
    expect(prisma.media.delete).toHaveBeenCalledWith({ where: { id: 'media_1' } });

    // Someone else's avatar: recognised as ours, but not deleted.
    prisma.media.findUnique.mockResolvedValue({
      ownerId: 'user_2',
      key: 'media/old.png',
      posts: [],
    });
    prisma.media.delete.mockClear();
    await expect(service.deleteByUrl('/api/v1/media/media_1/file', 'user_1')).resolves.toBe(
      true,
    );
    expect(prisma.media.delete).not.toHaveBeenCalled();

    // Pre-Phase 8 avatar: not ours at all.
    await expect(service.deleteByUrl('/uploads/avatars/pixel.png', 'user_1')).resolves.toBe(
      false,
    );
  });

  // --- attachments ----------------------------------------------------------

  it('validates attachment lists: count, duplicates, ownership, video rule', async () => {
    const ids = Array.from({ length: 5 }, (_, i) => `00000000-0000-4000-8000-00000000000${i}`);
    await expect(service.validateAttachments('user_1', ids)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.validateAttachments('user_1', [ids[0], ids[0]]),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.validateAttachments('user_1', [])).resolves.toEqual([]);

    // Unknown and foreign resolve to the same shape of answer.
    prisma.media.findMany.mockResolvedValueOnce([]);
    await expect(
      service.validateAttachments('user_1', ['00000000-0000-4000-8000-000000000000']),
    ).rejects.toBeInstanceOf(BadRequestException);

    // A video may stand alone, never beside anything else.
    prisma.media.findMany.mockResolvedValueOnce([
      { id: ids[0], kind: 'VIDEO' },
      { id: ids[1], kind: 'IMAGE' },
    ]);
    await expect(
      service.validateAttachments('user_1', [ids[0], ids[1]]),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.media.findMany.mockResolvedValueOnce([{ id: ids[0], kind: 'VIDEO' }]);
    await expect(service.validateAttachments('user_1', [ids[0]])).resolves.toEqual([ids[0]]);
  });

  it('returns ids in the order they were listed', async () => {
    const a = '00000000-0000-4000-8000-00000000000a';
    const b = '00000000-0000-4000-8000-00000000000b';
    // Prisma hands rows back unordered — the service must not.
    prisma.media.findMany.mockResolvedValue([
      { id: b, kind: 'IMAGE' },
      { id: a, kind: 'IMAGE' },
    ]);

    await expect(service.validateAttachments('user_1', [a, b])).resolves.toEqual([a, b]);
  });

  it('deletes only blobs that ended up unattached and owned', async () => {
    prisma.media.findMany.mockResolvedValue([
      { id: 'media_1', key: 'media/1.png' },
      { id: 'media_2', key: 'media/2.png' },
    ]);

    await service.deleteOrphans(['media_1', 'media_2'], 'user_1');

    expect(prisma.media.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['media_1', 'media_2'] }, ownerId: 'user_1', posts: { none: {} } },
      }),
    );
    expect(prisma.media.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['media_1', 'media_2'] } },
    });
    expect(storage.remove).toHaveBeenCalledTimes(2);

    prisma.media.findMany.mockResolvedValue([]);
    prisma.media.deleteMany.mockClear();
    await service.deleteOrphans(['media_3'], 'user_1');
    expect(prisma.media.deleteMany).not.toHaveBeenCalled();
  });

  it('reports which backend is active', () => {
    expect(service.mode).toBe('local');
    storage.mode = 's3';
    expect(service.mode).toBe('s3');
  });
});
