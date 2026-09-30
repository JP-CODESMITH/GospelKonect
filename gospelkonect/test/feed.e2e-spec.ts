import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

// Phase 6 end-to-end: the personalised home timeline against real Postgres and
// real Redis (so the cache invalidation path is exercised, not mocked).
describe('Feed (e2e)', () => {
  let app: INestApplication<App>;

  const stamp = Date.now().toString().slice(-9);
  const password = 'super-secret-1';

  let meToken = '';
  let followedToken = '';
  let strangerToken = '';
  let followedId = '';

  // Created in this order, so they are strictly increasing in createdAt:
  // mine (tier 0) < followed's (tier 0 while followed) < stranger's (tier 1).
  let myPostId = '';
  let followedPostId = '';
  let strangerPostId = '';

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

  const register = async (who: string): Promise<{ token: string; id: string; username: string }> => {
    const username = `${who}${stamp}`;
    const email = `${who}-${stamp}@example.com`;
    await http().post('/api/v1/auth/register').send({ email, username, password }).expect(201);
    const login = await http()
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);
    const me = await http()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    return { token: login.body.accessToken, id: me.body.id, username };
  };

  const publish = async (token: string, content: string): Promise<string> => {
    const res = await http()
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content })
      .expect(201);
    return res.body.id as string;
  };

  const feed = async (query = 'limit=100') => {
    const res = await http()
      .get(`/api/v1/feed?${query}`)
      .set('Authorization', `Bearer ${meToken}`)
      .expect(200);
    return res.body as {
      items: { id: string; author: { id: string } }[];
      meta: { page?: number; limit: number; total: number; totalPages: number; nextCursor: string | null };
    };
  };

  const indexOf = (body: Awaited<ReturnType<typeof feed>>, id: string): number =>
    body.items.findIndex((p) => p.id === id);

  beforeAll(async () => {
    const me = await register('feedme');
    const followed = await register('feedfol');
    const stranger = await register('feedstr');
    meToken = me.token;
    followedToken = followed.token;
    strangerToken = stranger.token;
    followedId = followed.id;

    myPostId = await publish(meToken, 'mine, always tier 0');
    followedPostId = await publish(followedToken, 'from someone I follow');
    strangerPostId = await publish(strangerToken, 'from a stranger');
  });

  it('requires a token — the timeline is personal', async () => {
    await http().get('/api/v1/feed').expect(401);
  });

  it('places followed authors and my own posts above public fill', async () => {
    // I follow the middle author first.
    await http()
      .post(`/api/v1/users/${followedId}/follow`)
      .set('Authorization', `Bearer ${meToken}`)
      .expect(204);

    const body = await feed();

    // Tier 0 (mine + followed, newest first) must come entirely before tier 1.
    // Posts were created in the order mine → followed → stranger, so inside
    // tier 0 the newer followed post sits above mine.
    expect(indexOf(body, followedPostId)).toBeLessThan(indexOf(body, myPostId));
    expect(indexOf(body, strangerPostId)).toBeGreaterThan(indexOf(body, myPostId));
    expect(indexOf(body, strangerPostId)).toBeGreaterThan(indexOf(body, followedPostId));

    // No password hashes or private fields leak through the feed.
    expect(body.items[0]).not.toHaveProperty('passwordHash');
    expect(body.items[0]).not.toHaveProperty('authorId');
  });

  it('reports total and nextCursor for the page it served', async () => {
    const body = await feed('limit=100');

    expect(body.meta.limit).toBe(100);
    expect(body.meta.page).toBe(1);
    // The posts table is shared with every other suite (and accumulates rows
    // across runs), so total counts everything while this page only carries
    // `limit` of them.
    expect(body.meta.total).toBeGreaterThanOrEqual(body.items.length);
    expect(body.meta.totalPages).toBeGreaterThanOrEqual(1);
    // A full page implies "probably more"; a short page implies "that is all".
    // toEqual, not toBe: vitest's toBe is reference equality and cannot carry
    // expect.any(String).
    expect(body.meta.nextCursor).toEqual(
      body.items.length === 100 ? expect.any(String) : null,
    );
  });

  it('serves an identical page while nothing is written (cache hit)', async () => {
    const first = await feed('limit=5');
    const second = await feed('limit=5');

    expect(second.items.map((p) => p.id)).toEqual(first.items.map((p) => p.id));
    expect(second.meta.total).toBe(first.meta.total);
  });

  it('shows a just-published post at the top (invalidation works)', async () => {
    // Warm the cache first — otherwise this asserts nothing about invalidation.
    await feed('limit=5');

    const newest = await publish(meToken, 'brand new, must not be cached away');

    const body = await feed('limit=5');
    expect(body.items[0]?.id).toBe(newest);
  });

  it('walks the whole feed by cursor without repeating or skipping rows', async () => {
    const seen: string[] = [];
    let cursor: string | null = null;
    let total = -1;

    for (let page = 0; page < 500; page++) {
      const body: Awaited<ReturnType<typeof feed>> = await feed(
        `limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
      );
      total = body.meta.total;
      seen.push(...body.items.map((p) => p.id));

      cursor = body.meta.nextCursor;
      if (!cursor || body.items.length === 0) break;
    }

    // No duplicates: the keyset predicate is strict about (createdAt, id).
    expect(new Set(seen).size).toBe(seen.length);
    // Every post in the database was handed out exactly once.
    expect(seen).toHaveLength(total);
    expect(seen).toContain(myPostId);
    expect(seen).toContain(followedPostId);
    expect(seen).toContain(strangerPostId);
  });

  it('pages by number as well as by cursor', async () => {
    const p1 = await feed('limit=2&page=1');
    const p2 = await feed('limit=2&page=2');

    expect(p1.meta.page).toBe(1);
    expect(p2.meta.page).toBe(2);
    expect(p1.items).toHaveLength(2);
    // Offset pages must not overlap.
    const overlap = p1.items.filter((a) => p2.items.some((b) => b.id === a.id));
    expect(overlap).toEqual([]);
  });

  it('rejects a malformed cursor with 400 rather than restarting', async () => {
    await http()
      .get('/api/v1/feed?cursor=definitely-not-a-cursor')
      .set('Authorization', `Bearer ${meToken}`)
      .expect(400);
  });

  it('demotes an unfollowed author into the public fill tier', async () => {
    await http()
      .delete(`/api/v1/users/${followedId}/follow`)
      .set('Authorization', `Bearer ${meToken}`)
      .expect(204);

    const body = await feed();

    // My own post stays in tier 0; theirs must now sort after it, even though
    // theirs is newer — which is exactly what the tier split buys.
    expect(indexOf(body, myPostId)).toBeLessThan(indexOf(body, followedPostId));

    // And restoring the follow pulls it back above mine.
    await http()
      .post(`/api/v1/users/${followedId}/follow`)
      .set('Authorization', `Bearer ${meToken}`)
      .expect(204);

    const again = await feed();
    expect(indexOf(again, followedPostId)).toBeLessThan(indexOf(again, myPostId));
  });

  it('rejects unauthenticated paging attempts', async () => {
    await http().get('/api/v1/feed?limit=5&page=2').expect(401);
    expect(followedToken).toBeTruthy();
    expect(strangerToken).toBeTruthy();
  });
});
