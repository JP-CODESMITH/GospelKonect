import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

// Phase 4 end-to-end: publish → read → feed → edit → delete → author timeline,
// against the real Postgres.
describe('Posts (e2e)', () => {
  let app: INestApplication<App>;

  const stamp = Date.now().toString().slice(-9);
  const authorEmail = `author-${stamp}@example.com`;
  const authorName = `author${stamp}`;
  const otherEmail = `other-${stamp}@example.com`;
  const otherName = `other${stamp}`;
  const password = 'super-secret-1';

  let authorToken = '';
  let otherToken = '';

  // Ids created by this suite, so timeline assertions can be scoped to our own
  // rows (the global feed also contains posts left by earlier runs).
  const created: string[] = [];

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

  /** Creates a post as the author and records its id. */
  const publish = async (content: string): Promise<string> => {
    const res = await http()
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ content })
      .expect(201);
    created.push(res.body.id as string);
    return res.body.id as string;
  };

  it('sets up two accounts', async () => {
    authorToken = await register(authorEmail, authorName);
    otherToken = await register(otherEmail, otherName);
  });

  // --- create ---------------------------------------------------------------

  it('publishes a post with its author embedded and no private fields', async () => {
    const res = await http()
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ content: 'First post on GospelKonect' })
      .expect(201);

    created.push(res.body.id as string);

    expect(res.body.content).toBe('First post on GospelKonect');
    expect(typeof res.body.createdAt).toBe('string');
    expect(typeof res.body.updatedAt).toBe('string');
    expect(res.body.author).toEqual({
      id: expect.any(String),
      name: expect.any(String),
      username: authorName,
      avatar: null,
    });
    expect(res.body).not.toHaveProperty('authorId');
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body.author).not.toHaveProperty('passwordHash');
  });

  it('refuses to publish without a token', async () => {
    await http().post('/api/v1/posts').send({ content: 'anonymous' }).expect(401);
  });

  it('rejects invalid content before touching the database', async () => {
    const cases: unknown[] = [
      { content: '' },
      { content: '   ' }, // blank after trim
      { content: 'a'.repeat(1001) }, // over the limit
      { content: 42 }, // not a string
      {}, // missing
      { content: 'ok', image: 'http://x/y.png' }, // unknown field
    ];

    for (const body of cases) {
      await http()
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${authorToken}`)
        .send(body)
        .expect(400);
    }
  });

  // --- read -----------------------------------------------------------------

  it('reads one post by id', async () => {
    const id = await publish('read me');

    const res = await http().get(`/api/v1/posts/${id}`).expect(200);
    expect(res.body.id).toBe(id);
    expect(res.body.content).toBe('read me');
    expect(res.body.author.username).toBe(authorName);
  });

  it('404s an unknown post id', async () => {
    await http().get('/api/v1/posts/00000000-0000-4000-8000-000000000000').expect(404);
  });

  it('lists the global feed newest-first without requiring a token', async () => {
    const res = await http().get('/api/v1/posts?limit=10').expect(200);

    expect(res.body.items.length).toBeGreaterThan(0);
    // createdAt must never increase as we walk down the feed.
    const dates = res.body.items.map((p: { createdAt: string }) => Date.parse(p.createdAt));
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
    }
    expect(res.body.meta).toEqual({
      page: 1,
      limit: 10,
      total: expect.any(Number),
      totalPages: expect.any(Number),
    });
  });

  it('rejects invalid pagination on the feed', async () => {
    await http().get('/api/v1/posts?limit=0').expect(400);
    await http().get('/api/v1/posts?page=-1').expect(400);
    await http().get('/api/v1/posts?sort=hot').expect(400);
  });

  // --- edit -----------------------------------------------------------------

  it('lets the author edit their post and refreshes updatedAt', async () => {
    const id = await publish('original body');
    const before = await http().get(`/api/v1/posts/${id}`).expect(200);

    const res = await http()
      .patch(`/api/v1/posts/${id}`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ content: 'edited body' })
      .expect(200);

    expect(res.body.id).toBe(id);
    expect(res.body.content).toBe('edited body');
    // Prisma's @updatedAt — an edit must be newer than the publish.
    expect(Date.parse(res.body.updatedAt)).toBeGreaterThanOrEqual(
      Date.parse(before.body.updatedAt),
    );
    expect(res.body.author.username).toBe(authorName);
  });

  it('403s when someone else tries to edit a post', async () => {
    const id = await publish('mine, not yours');

    await http()
      .patch(`/api/v1/posts/${id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ content: 'hijacked' })
      .expect(403);

    // The body must be untouched.
    const check = await http().get(`/api/v1/posts/${id}`).expect(200);
    expect(check.body.content).toBe('mine, not yours');
  });

  it('404s an edit to a post that does not exist', async () => {
    await http()
      .patch('/api/v1/posts/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ content: 'ghost edit' })
      .expect(404);
  });

  // --- author timeline ------------------------------------------------------

  it("pages one author's posts, newest first", async () => {
    // The timeline holds every post this author has made in the suite so far,
    // so work from a baseline rather than assuming a count of 0.
    const before = await http()
      .get(`/api/v1/users/${authorName}/posts?limit=1`)
      .expect(200);
    const baseline = before.body.meta.total as number;

    const a = await publish('timeline one');
    const b = await publish('timeline two');
    const c = await publish('timeline three');

    const page1 = await http()
      .get(`/api/v1/users/${authorName}/posts?page=1&limit=2`)
      .expect(200);
    expect(page1.body.meta).toEqual({
      page: 1,
      limit: 2,
      total: baseline + 3,
      totalPages: Math.ceil((baseline + 3) / 2),
    });

    const page2 = await http()
      .get(`/api/v1/users/${authorName}/posts?page=2&limit=2`)
      .expect(200);
    expect(page2.body.meta).toEqual({
      page: 2,
      limit: 2,
      total: baseline + 3,
      totalPages: Math.ceil((baseline + 3) / 2),
    });

    const ids = [...page1.body.items, ...page2.body.items].map((p: { id: string }) => p.id);
    // The three just-published posts are the newest, so they must be spread
    // across these two pages with no id repeated between them.
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining([a, b, c]));

    // Newest-first holds across the page boundary as well.
    const dates = [...page1.body.items, ...page2.body.items].map((p: { createdAt: string }) =>
      Date.parse(p.createdAt),
    );
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
    }
  });

  it('404s a timeline for an unknown handle, rather than returning an empty page', async () => {
    await http().get('/api/v1/users/no-such-handle-xyz/posts').expect(404);
  });

  // --- delete ---------------------------------------------------------------

  it('403s a delete by a non-author', async () => {
    const id = await publish('still here');

    await http()
      .delete(`/api/v1/posts/${id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);

    await http().get(`/api/v1/posts/${id}`).expect(200);
  });

  it('hard-deletes the author’s own post', async () => {
    const id = await publish('about to go');

    await http()
      .delete(`/api/v1/posts/${id}`)
      .set('Authorization', `Bearer ${authorToken}`)
      .expect(204);

    await http().get(`/api/v1/posts/${id}`).expect(404);
    // It is gone from the timeline too, so the count drops.
    const timeline = await http()
      .get(`/api/v1/users/${authorName}/posts?limit=100`)
      .expect(200);
    expect(timeline.body.items.map((p: { id: string }) => p.id)).not.toContain(id);
    expect(timeline.body.meta.total).toBe(created.length - 1);
  });

  it('refuses an unauthenticated delete', async () => {
    const id = await publish('protected');
    await http().delete(`/api/v1/posts/${id}`).expect(401);
    await http().get(`/api/v1/posts/${id}`).expect(200);
  });
});
