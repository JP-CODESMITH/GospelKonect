import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

// Phase 7 end-to-end: notifications created by the two triggers this phase
// ships (follow and @mention), read back through the inbox endpoints, against
// real Postgres so the enum/index work is exercised rather than mocked.
describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;

  const stamp = Date.now().toString().slice(-9);
  const password = 'super-secret-1';

  let meToken = '';
  let aliceToken = '';
  let bobToken = '';
  let meId = '';

  let mentionPostId = '';

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

  type Inbox = {
    items: {
      id: string;
      type: string;
      entityType: string | null;
      entityId: string | null;
      readAt: string | null;
      actor: { id: string; username: string };
    }[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  };

  const inbox = async (token: string, query = ''): Promise<Inbox> => {
    const res = await http()
      .get(`/api/v1/notifications${query ? `?${query}` : ''}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body as Inbox;
  };

  const unreadCount = async (token: string): Promise<number> => {
    const res = await http()
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body.count as number;
  };

  const markRead = async (token: string, body: unknown): Promise<number> => {
    const res = await http()
      .post('/api/v1/notifications/read')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(200);
    return res.body.updated as number;
  };

  beforeAll(async () => {
    const me = await register('notifme');
    const alice = await register('notifali');
    const bob = await register('notifbob');
    meToken = me.token;
    aliceToken = alice.token;
    bobToken = bob.token;
    meId = me.id;
  });

  it('requires a token on every inbox endpoint', async () => {
    await http().get('/api/v1/notifications').expect(401);
    await http().get('/api/v1/notifications/unread-count').expect(401);
    await http().post('/api/v1/notifications/read').send({}).expect(401);
    expect(meToken).toBeTruthy();
  });

  it('records a follow as NEW_FOLLOWER for the followee', async () => {
    await http()
      .post(`/api/v1/users/${meId}/follow`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(204);

    expect(await unreadCount(meToken)).toBe(1);

    const body = await inbox(meToken);
    expect(body.items[0]).toMatchObject({
      type: 'NEW_FOLLOWER',
      readAt: null,
      actor: { username: `notifali${stamp}` },
    });
  });

  it('does not re-notify when the same follow is repeated', async () => {
    // A second POST is a 204 no-op (row already exists), not a new event.
    await http()
      .post(`/api/v1/users/${meId}/follow`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(204);

    expect(await unreadCount(meToken)).toBe(1);
  });

  it('never notifies you about mentioning yourself', async () => {
    await publish(meToken, `self shoutout @me${stamp}`);

    expect(await unreadCount(meToken)).toBe(1);
  });

  it('records a mention as MENTION for the mentioned account', async () => {
    const postId = await publish(meToken, `hello @notifali${stamp}`);

    const body = await inbox(aliceToken);
    expect(await unreadCount(aliceToken)).toBe(1);
    expect(body.items[0]).toMatchObject({
      type: 'MENTION',
      entityType: 'post',
      entityId: postId,
      actor: { username: `notifme${stamp}` },
    });
  });

  it('notifies every account a post mentions', async () => {
    mentionPostId = await publish(
      bobToken,
      `cc @notifme${stamp} and @notifali${stamp}`,
    );

    expect(await unreadCount(meToken)).toBe(2); // follow + this mention
    expect(await unreadCount(aliceToken)).toBe(2); // two mentions

    const body = await inbox(meToken);
    expect(body.items[0]).toMatchObject({ type: 'MENTION', entityId: mentionPostId });
    // Newest first: the mention sits above the older follow event.
    expect(body.items[1].type).toBe('NEW_FOLLOWER');
  });

  it('drops notifications for a post that is later deleted', async () => {
    await http()
      .delete(`/api/v1/posts/${mentionPostId}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .expect(204);

    const mine = await inbox(meToken);
    const alice = await inbox(aliceToken);

    // Notifications are polymorphic, so the deleter has to clean up.
    expect(mine.meta.total).toBe(1);
    expect(alice.meta.total).toBe(1);
    expect(mine.items.some((n) => n.entityId === mentionPostId)).toBe(false);
    expect(alice.items.some((n) => n.entityId === mentionPostId)).toBe(false);
  });

  it('pages the inbox and never repeats a row', async () => {
    // One more event so `me` has something to page across.
    await publish(bobToken, `paging @notifme${stamp}`);

    const p1 = await inbox(meToken, 'limit=1&page=1');
    const p2 = await inbox(meToken, 'limit=1&page=2');

    expect(p1.meta).toMatchObject({ page: 1, limit: 1, total: 2, totalPages: 2 });
    expect(p2.meta).toMatchObject({ page: 2, limit: 1, total: 2 });
    expect(p1.items).toHaveLength(1);
    expect(p2.items).toHaveLength(1);
    expect(p1.items[0].id).not.toBe(p2.items[0].id);
    expect(p1.items[0].readAt).toBeNull();
  });

  it('filters to unread with ?unread=true', async () => {
    const all = await inbox(meToken);
    const unread = await inbox(meToken, 'unread=true');

    expect(unread.items).toHaveLength(all.meta.total);
    expect(unread.items.every((n) => n.readAt === null)).toBe(true);
  });

  it('marks a single notification read without touching the rest', async () => {
    const before = await inbox(meToken);
    const target = before.items[0];

    expect(await markRead(meToken, { ids: [target.id] })).toBe(1);

    const after = await inbox(meToken);
    expect(after.items.find((n) => n.id === target.id)?.readAt).not.toBeNull();
    expect(await unreadCount(meToken)).toBe(before.meta.total - 1);
  });

  it("refuses to let one account mark another's notifications read", async () => {
    const mineUnread = await inbox(meToken, 'unread=true');
    expect(mineUnread.items).toHaveLength(1);

    // Alice passes my id: filtered out by the userId scoping, so 0 rows change.
    expect(await markRead(aliceToken, { ids: [mineUnread.items[0].id] })).toBe(0);
    expect(await unreadCount(meToken)).toBe(1);
  });

  it('marks everything read when no ids are given', async () => {
    expect(await markRead(meToken, {})).toBe(1);

    expect(await unreadCount(meToken)).toBe(0);
    expect((await inbox(meToken, 'unread=true')).items).toHaveLength(0);
    // Marking read keeps the rows: the inbox is history, not a queue.
    expect((await inbox(meToken)).meta.total).toBe(2);
  });

  it('rejects malformed input rather than guessing', async () => {
    // Non-UUID id: rejected by the DTO, not silently ignored.
    await http()
      .post('/api/v1/notifications/read')
      .set('Authorization', `Bearer ${meToken}`)
      .send({ ids: ['not-a-uuid'] })
      .expect(400);

    // Unknown query parameter (whitelist + forbidNonWhitelisted).
    await http()
      .get('/api/v1/notifications?bogus=1')
      .set('Authorization', `Bearer ${meToken}`)
      .expect(400);

    // A non-boolean unread flag.
    await http()
      .get('/api/v1/notifications?unread=maybe')
      .set('Authorization', `Bearer ${meToken}`)
      .expect(400);
  });
});
