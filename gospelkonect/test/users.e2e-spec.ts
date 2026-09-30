import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

// Phase 3 end-to-end: profile reads/edits, the follow graph, discovery and the
// avatar upload, all against the real Postgres + Redis.
describe('Users (e2e)', () => {
  let app: INestApplication<App>;

  // Two accounts, unique per run so a previous run's rows can't collide.
  const stamp = Date.now().toString().slice(-9);
  const aliceEmail = `alice-${stamp}@example.com`;
  const aliceName = `alice${stamp}`;
  const bobEmail = `bob-${stamp}@example.com`;
  const bobName = `bob${stamp}`;
  const password = 'super-secret-1';

  let aliceToken = '';
  let bobToken = '';
  let bobId = '';

  // Media ids created by the upload tests; removed through the API itself in
  // afterAll so repeated runs leave neither rows nor objects behind.
  const writtenMedia: string[] = [];

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
    await app.init();
  });

  afterAll(async () => {
    // Avatars are Media rows now: delete them through the pipeline that made
    // them, which removes the row and the stored bytes together.
    await Promise.all(
      writtenMedia.map((id) =>
        http()
          .delete(`/api/v1/media/${id}`)
          .set('Authorization', `Bearer ${aliceToken}`)
          .then(
            () => undefined,
            () => undefined,
          ),
      ),
    );
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  /** /api/v1/media/<id>/file → <id>. */
  const mediaIdOf = (url: string): string => url.split('/')[4];

  /** Registers an account and returns its access token. */
  const register = async (email: string, username: string): Promise<string> => {
    await http()
      .post('/api/v1/auth/register')
      .send({ email, username, password })
      .expect(201);

    const login = await http()
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);
    return login.body.accessToken as string;
  };

  // 1x1 transparent PNG — a real image body so the type check sees valid bytes.
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  it('creates two accounts', async () => {
    aliceToken = await register(aliceEmail, aliceName);
    bobToken = await register(bobEmail, bobName);

    const me = await http()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${bobToken}`)
      .expect(200);
    bobId = me.body.id as string;
    expect(bobId).toBeTruthy();
  });

  // --- profile reads --------------------------------------------------------

  it('serves a profile by username without leaking the password hash', async () => {
    const res = await http().get(`/api/v1/users/${bobName}`).expect(200);

    expect(res.body.username).toBe(bobName);
    expect(res.body).not.toHaveProperty('passwordHash');
    // Email is private: another user's profile must not carry it.
    expect(res.body.email).toBeUndefined();
    expect(res.body.counts).toEqual({ followers: 0, following: 0 });
  });

  it('resolves a username case-insensitively', async () => {
    const res = await http().get(`/api/v1/users/${bobName.toUpperCase()}`).expect(200);
    expect(res.body.username).toBe(bobName);
  });

  it('404s on an unknown username', async () => {
    await http().get('/api/v1/users/no-such-handle-xyz').expect(404);
  });

  // --- profile edits --------------------------------------------------------

  it('updates name, username and bio', async () => {
    const res = await http()
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ name: 'Alice Wonder', username: `${aliceName}_x`, bio: 'Sings alto' })
      .expect(200);

    expect(res.body.name).toBe('Alice Wonder');
    expect(res.body.username).toBe(`${aliceName}_x`);
    expect(res.body.bio).toBe('Sings alto');
    // The old handle must stop resolving.
    await http().get(`/api/v1/users/${aliceName}`).expect(404);
    await http().get(`/api/v1/users/${aliceName}_x`).expect(200);
  });

  it('rejects a username with punctuation (400), an unknown field (400) and a taken handle (409)', async () => {
    await http()
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ username: 'not a handle!' })
      .expect(400);

    // forbidNonWhitelisted: an unrecognised key is a client bug, not a no-op.
    await http()
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ nickname: 'sneaky' })
      .expect(400);

    await http()
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ username: bobName })
      .expect(409);
  });

  it('refuses to edit a profile without a token', async () => {
    await http().patch('/api/v1/users/me').send({ name: 'Nope' }).expect(401);
  });

  // --- follow graph ---------------------------------------------------------

  it('lets alice follow bob, idempotently', async () => {
    await http()
      .post(`/api/v1/users/${bobId}/follow`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(204);

    // Repeating must stay 204 — the composite key makes it a no-op, not a 409.
    await http()
      .post(`/api/v1/users/${bobId}/follow`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(204);
  });

  it('refuses following yourself', async () => {
    const res = await http()
      .post(`/api/v1/users/${bobId}/follow`)
      .set('Authorization', `Bearer ${bobToken}`)
      .expect(400);
    expect(res.body.message).toMatch(/cannot follow yourself/i);
  });

  it('404s when the target account does not exist', async () => {
    await http()
      .post('/api/v1/users/00000000-0000-4000-8000-000000000000/follow')
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(404);
  });

  it('shows the relationship on the followed profile', async () => {
    // As alice: I follow bob.
    const asAlice = await http()
      .get(`/api/v1/users/${bobName}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(200);
    expect(asAlice.body.counts).toEqual({ followers: 1, following: 0 });
    expect(asAlice.body.isFollowing).toBe(true);
    expect(asAlice.body.isFollowedBy).toBe(false);

    // As bob: alice follows me, and I do not follow her back.
    const asBob = await http()
      .get(`/api/v1/users/${aliceName}_x`)
      .set('Authorization', `Bearer ${bobToken}`)
      .expect(200);
    expect(asBob.body.counts).toEqual({ followers: 0, following: 1 });
    expect(asBob.body.isFollowing).toBe(false);
    expect(asBob.body.isFollowedBy).toBe(true);

    // Anonymous: no flags set, counts still correct.
    const anon = await http().get(`/api/v1/users/${bobName}`).expect(200);
    expect(anon.body.isFollowing).toBe(false);
    expect(anon.body.isFollowedBy).toBe(false);
  });

  it('lists followers and following with pagination metadata', async () => {
    const followers = await http()
      .get(`/api/v1/users/${bobName}/followers`)
      .set('Authorization', `Bearer ${bobToken}`)
      .expect(200);
    expect(followers.body.items.map((u: { username: string }) => u.username)).toEqual([
      `${aliceName}_x`,
    ]);
    expect(followers.body.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });

    const following = await http()
      .get(`/api/v1/users/${aliceName}_x/following`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(200);
    expect(following.body.items.map((u: { username: string }) => u.username)).toEqual([bobName]);

    // Past the end: empty page, but the total is still reported.
    const empty = await http().get(`/api/v1/users/${bobName}/followers?page=2`).expect(200);
    expect(empty.body.items).toEqual([]);
    expect(empty.body.meta.total).toBe(1);
  });

  it('rejects invalid pagination (400) rather than coercing it', async () => {
    await http().get('/api/v1/users?limit=0').expect(400);
    await http().get('/api/v1/users?page=-1').expect(400);
    await http().get('/api/v1/users?limit=101').expect(400);
    await http().get('/api/v1/users?sort=hax').expect(400);
  });

  it('unfollows idempotently and the count drops', async () => {
    await http()
      .delete(`/api/v1/users/${bobId}/follow`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(204);
    await http()
      .delete(`/api/v1/users/${bobId}/follow`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(204);

    const res = await http().get(`/api/v1/users/${bobName}`).expect(200);
    expect(res.body.counts).toEqual({ followers: 0, following: 0 });
  });

  // --- discovery ------------------------------------------------------------

  it('finds users by name or username and excludes the caller', async () => {
    // Search for the full handle: earlier runs left other bob* accounts behind,
    // and a 4-character prefix would page past this run's user.
    const found = await http()
      .get(`/api/v1/users?search=${bobName}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(200);

    const names = found.body.items.map((u: { username: string }) => u.username);
    expect(names).toContain(bobName);
    expect(names).not.toContain(`${aliceName}_x`); // never yourself
    expect(found.body.meta.total).toBeGreaterThanOrEqual(1);

    // Anonymous discovery still works, just without relationship flags.
    const anon = await http().get('/api/v1/users?search=nothing-matches-this').expect(200);
    expect(anon.body.items).toEqual([]);
    expect(anon.body.meta).toMatchObject({ page: 1, total: 0 });
  });

  // --- avatar upload --------------------------------------------------------

  it('stores an uploaded avatar and replaces it without leaving the old one', async () => {
    const first = await http()
      .post('/api/v1/users/me/avatar')
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('file', PNG, { filename: 'pixel.png', contentType: 'image/png' })
      .expect(201);

    // Phase 8: an avatar is an ordinary Media row, so its URL is the stable
    // file endpoint rather than a path into the uploads directory.
    expect(first.body.avatar).toMatch(/^\/api\/v1\/media\/[0-9a-f-]{36}\/file$/);
    const firstId = mediaIdOf(first.body.avatar as string);
    writtenMedia.push(firstId);
    // Reachable: the endpoint redirects (302) to wherever the bytes live.
    await http().get(`/api/v1/media/${firstId}/file`).expect(302);

    const second = await http()
      .post('/api/v1/users/me/avatar')
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('file', PNG, { filename: 'pixel-again.png', contentType: 'image/png' })
      .expect(201);

    expect(second.body.avatar).not.toBe(first.body.avatar);
    // The superseded avatar is gone — row and bytes — not archived.
    await http().get(`/api/v1/media/${firstId}`).expect(404);
    writtenMedia.splice(writtenMedia.indexOf(firstId), 1);
    writtenMedia.push(mediaIdOf(second.body.avatar as string));

    // The stored URL is what the profile reports.
    const profile = await http().get(`/api/v1/users/${aliceName}_x`).expect(200);
    expect(profile.body.avatar).toBe(second.body.avatar);
  });

  it('rejects a non-image upload', async () => {
    await http()
      .post('/api/v1/users/me/avatar')
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('file', Buffer.from('not an image'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });

  it('rejects a missing file field and an unauthenticated upload', async () => {
    // Wrong field name → nothing for the interceptor to collect.
    await http()
      .post('/api/v1/users/me/avatar')
      .set('Authorization', `Bearer ${aliceToken}`)
      .field('image', 'nope')
      .expect(400);

    await http()
      .post('/api/v1/users/me/avatar')
      .attach('file', PNG, { filename: 'pixel.png', contentType: 'image/png' })
      .expect(401);
  });
});
