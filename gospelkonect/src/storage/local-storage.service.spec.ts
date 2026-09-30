import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStorageService } from './local-storage.service.js';

// Filesystem-backed unit tests: each run gets its own temp directory so nothing
// is written into the repository's uploads/ folder.
describe('LocalStorageService', () => {
  let service: LocalStorageService;
  let root: string;

  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  const exists = async (path: string): Promise<boolean> =>
    stat(path).then(
      () => true,
      () => false,
    );

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'gospelkonect-upload-'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStorageService,
        // ConfigService only reads `upload.dir`, so a stub is enough and keeps
        // the test independent from .env.
        { provide: ConfigService, useValue: { get: () => root } },
      ],
    }).compile();

    service = module.get(LocalStorageService);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes the buffer under avatars/ and returns its public URL', async () => {
    const url = await service.saveAvatar(PNG, 'image/png');

    // The name is a UUID we generated — nothing from the request is used.
    expect(url).toMatch(/^\/uploads\/avatars\/[0-9a-f-]{36}\.png$/);

    const onDisk = join(root, url.replace('/uploads/', ''));
    expect(await exists(onDisk)).toBe(true);
    // Round-trips byte for byte.
    expect(await readFile(onDisk)).toEqual(PNG);
  });

  it('picks the extension from the content type, not the filename', async () => {
    const url = await service.saveAvatar(PNG, 'image/webp');
    expect(url.endsWith('.webp')).toBe(true);
  });

  it.each([
    ['image/svg+xml'],
    ['text/html'],
    ['application/json'],
    ['video/mp4'],
  ])('rejects %s with 400', async (mimetype) => {
    await expect(service.saveAvatar(PNG, mimetype)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    // Nothing may be written when the type is refused.
    expect(await readdir(join(root, 'avatars')).catch(() => [])).toEqual([]);
  });

  it('deletes an avatar it previously stored', async () => {
    const url = await service.saveAvatar(PNG, 'image/png');
    const onDisk = join(root, url.replace('/uploads/', ''));

    await service.deleteByUrl(url);
    expect(await exists(onDisk)).toBe(false);
  });

  it.each([
    // URL we never issued.
    'http://evil.example/uploads/avatars/x.png',
    '/somewhere/else/file.png',
    // Path traversal: normalises to root/../../etc/passwd, i.e. outside root.
    '/uploads/../../../etc/passwd',
    '/uploads/avatars/../../secret.txt',
    '',
  ])('refuses to delete %p', async (url) => {
    const stored = await service.saveAvatar(PNG, 'image/png');
    // If the containment guard were broken, unlink() would fire on whatever
    // path the caller supplied — so assert the stored file is still there.
    await service.deleteByUrl(url);

    expect(await exists(join(root, stored.replace('/uploads/', '')))).toBe(true);
    expect(await readdir(join(root, 'avatars'))).toHaveLength(1);
  });

  it('swallows a missing file instead of throwing', async () => {
    // Best-effort: a profile update must not fail because the old file was
    // already removed by hand.
    await expect(service.deleteByUrl('/uploads/avatars/gone.png')).resolves.toBeUndefined();
  });

  it('exposes the mime allow-list used by the controller', () => {
    expect(LocalStorageService.allowedMimeTypes).toEqual(
      expect.arrayContaining(['image/jpeg', 'image/png', 'image/webp']),
    );
    expect(LocalStorageService.allowedMimeTypes).not.toContain('image/svg+xml');
  });
});
