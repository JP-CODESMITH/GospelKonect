import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { join } from 'node:path';
import { AppModule } from './../src/app.module.js';
// Mirrors main.ts: the local backend answers with a /uploads path, so the test
// app has to serve that directory the same way production does.
import { projectRoot } from './../src/config/project-root.js';

// Phase 8 end-to-end: the upload pipeline against real Postgres, real Redis and
// the LOCAL storage backend (vitest runs without a Composer bucket, so the
// file endpoint redirects to /uploads/... instead of a signed URL).
describe('Media (e2e)', () => {
  let app: INestApplication<App>;

  const stamp = Date.now().toString().slice(-9);
  const aliceEmail = `media-a-${stamp}@example.com`;
  const aliceName = `mediaa${stamp}`;
  const bobEmail = `media-b-${stamp}@example.com`;
  const bobName = `mediab${stamp}`;
  const password = 'super-secret-1';

  let aliceToken = '';
  let bobToken = '';

  // 1x1 transparent PNG — a real image body so type checks see valid bytes.
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  // The uploads created here, cleaned through the API itself in the tests.
  let imageId = '';
  let imageUrl = '';
  let deleteTargetId = '';
  let postId = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Mirror the bootstrap configuration from src/main.ts.
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    app.useStaticAssets(join(projectRoot(), app.get(ConfigService).get('upload.dir') ?? 'uploads'), {
      prefix: '/uploads',
    });
    await app.init();

    aliceToken = await register(aliceEmail, aliceName);
    bobToken = await register(bobEmail, bobName);
  });

  afterAll(async () => {
    // Anything the assertions did not remove (e.g. the video) still gets
    // cleaned so repeated runs do not accumulate rows.
    for (const id of [postId, imageId, deleteTargetId]) {
      if (id) {
        await http()
          .delete(`/api/v1/media/${id}`)
          .set('Authorization', `Bearer ${aliceToken}`)
          .catch(() => undefined);
      }
    }
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  const register = async (email: string, username: string): Promise<string> => {
    await http().post('/api/v1/auth/register').send({ email, username, password }).expect(201);
    const login = await http()
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);
    return login.body.accessToken as string;
  };

  /** Uploads one file as the given token and returns the 201 body. */
  const upload = async (token: string, body: Buffer, type: string, name = 'file') => {
    const res = await http()
      .post('/api/v1/media')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', body, { filename: name, contentType: type })
      .expect(201);
    return res.body as {
      id: string;
      kind: string;
      mimeType: string;
      bytes: number;
      url: string;
      createdAt: string;
    };
  };

  // --- upload ---------------------------------------------------------------

  it('rejects an anonymous upload', async () => {
    await http()
      .post('/api/v1/media')
      .attach('file', PNG, { filename: 'pixel.png', contentType: 'image/png' })
      .expect(401);
  });

  it('uploads an image and answers with a stable file URL', async () => {
    const media = await upload(aliceToken, PNG, 'image/png', 'pixel.png');

    expect(media.kind).toBe('IMAGE');
    expect(media.mimeType).toBe('image/png');
    expect(media.bytes).toBe(PNG.length);
    expect(media.url).toBe(`/api/v1/media/${media.id}/file`);
    expect(media.id).toMatch(/^[0-9a-f-]{36}$/);

    imageId = media.id;
    imageUrl = media.url;
  });

  it('rejects an unsupported type and an empty file', async () => {
    await http()
      .post('/api/v1/media')
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('file', Buffer.from('not media'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      })
      .expect(400);

    await http()
      .post('/api/v1/media')
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('file', Buffer.alloc(0), { filename: 'empty.png', contentType: 'image/png' })
      .expect(400);
  });

  it('stores a video as kind VIDEO', async () => {
    const media = await upload(aliceToken, Buffer.from('fake-mp4'), 'video/mp4', 'clip.mp4');
    expect(media.kind).toBe('VIDEO');
    deleteTargetId = media.id; // reused by the delete tests below
  });

  // --- read -----------------------------------------------------------------

  it('serves metadata publicly', async () => {
    const meta = await http().get(`/api/v1/media/${imageId}`).expect(200);
    expect(meta.body).toMatchObject({
      id: imageId,
      kind: 'IMAGE',
      mimeType: 'image/png',
      bytes: PNG.length,
      url: imageUrl,
    });
  });

  it('redirects the file endpoint to storage, and the bytes come back', async () => {
    const res = await http().get(`/api/v1/media/${imageId}/file`).expect(302);
    // Local backend: a static path main.ts serves. (Under Composer this is a
    // signed bucket URL instead — same endpoint, different target.)
    expect(res.headers.location).toMatch(/^\/uploads\/media\/.+\.png$/);

    const fetched = await http().get(res.headers.location as string).expect(200);
    expect(Buffer.from(fetched.body as Buffer).equals(PNG)).toBe(true);
  });

  it('404s for media that never existed', async () => {
    await http().get('/api/v1/media/00000000-0000-4000-8000-000000000000').expect(404);
    await http()
      .get('/api/v1/media/00000000-0000-4000-8000-000000000000/file')
      .expect(404);
  });

  // --- delete ---------------------------------------------------------------

  it('refuses deletion by a stranger, then lets the owner remove it', async () => {
    await http()
      .delete(`/api/v1/media/${deleteTargetId}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .expect(403);

    await http()
      .delete(`/api/v1/media/${deleteTargetId}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(204);

    await http().get(`/api/v1/media/${deleteTargetId}`).expect(404);
    deleteTargetId = ''; // already gone
  });

  // --- post attachments -----------------------------------------------------

  it('publishes a post with attachments, in the listed order', async () => {
    const second = await upload(aliceToken, PNG, 'image/png', 'pixel-2.png');

    const post = await http()
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'two pics', mediaIds: [imageId, second.id] })
      .expect(201);

    expect(post.body.media).toHaveLength(2);
    expect(post.body.media.map((m: { id: string }) => m.id)).toEqual([imageId, second.id]);
    expect(post.body.media[0]).toMatchObject({
      kind: 'IMAGE',
      mimeType: 'image/png',
      url: `/api/v1/media/${imageId}/file`,
    });
    postId = post.body.id as string;

    // The same shape comes back on a read (and, by POST_SELECT, on the feeds).
    const read = await http().get(`/api/v1/posts/${postId}`).expect(200);
    expect(read.body.media).toHaveLength(2);

    await http()
      .delete(`/api/v1/media/${second.id}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(409); // attached to the post above
  });

  it('rejects foreign, duplicated and over-count attachment ids', async () => {
    // Bob may not attach Alice's blob.
    await http()
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ content: 'stolen', mediaIds: [imageId] })
      .expect(400);

    await http()
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'dupe', mediaIds: [imageId, imageId] })
      .expect(400);

    await http()
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        content: 'too many',
        mediaIds: Array.from({ length: 5 }, () => imageId),
      })
      .expect(400);
  });

  it('refuses to delete media a post still uses, then cleans it up with the post', async () => {
    await http()
      .delete(`/api/v1/media/${imageId}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(409);

    await http()
      .delete(`/api/v1/posts/${postId}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(204);
    postId = '';

    // The blob had no other post: both the row and the file are gone.
    await http().get(`/api/v1/media/${imageId}`).expect(404);
    await http().get(`/api/v1/media/${imageId}/file`).expect(404);
    imageId = '';
  });
});
