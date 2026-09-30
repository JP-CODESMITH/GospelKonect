import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

// Phase 9 end-to-end: blocks (hidden feeds + refused follows), the report
// workflow, the Redis write throttle, and the admin console — against real
// Postgres and real Redis, in one pass so the interactions are covered too.
//
// Config is read per request (rate limits) and at app init (ADMIN_USERNAMES),
// which is why these are set at module scope rather than inside beforeAll.
const stamp = Date.now().toString().slice(-9);
const adminUsername = `modadmin${stamp}`;
process.env.ADMIN_USERNAMES = adminUsername;
// This file registers five accounts from one IP; keep registration open for
// the duration so the throttle's own default is not what fails the suite.
process.env.RATE_LIMIT_REGISTER = '100';
// Counted per account, and the counter advances even for requests the service
// later rejects — so the budget has to cover what each fixture files (4 for
// Bob, 4 for Carol), while Dave's SEVENTH request is the one that trips it
// (a fixed window admits `points` requests, then answers 429).
process.env.RATE_LIMIT_REPORTS = '6';

describe('Moderation (e2e)', () => {
  let app: INestApplication<App>;

  const password = 'super-secret-1';

  let adminToken = '';
  let aliceToken = '';
  let bobToken = '';
  let carolToken = '';
  let daveToken = '';

  let adminId = '';
  let aliceId = '';
  let bobId = '';
  let carolId = '';

  let alicePostId = '';
  let bobPostId = '';
  let carolCommentId = '';
  let aliceReportId = '';
  let bobReportIds: string[] = [];

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
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const register = async (
    who: string,
  ): Promise<{ token: string; id: string; username: string }> => {
    const username = `${who}${stamp}`;
    const email = `${who}-${stamp}@example.com`;
    await http().post('/api/v1/auth/register').send({ email, username, password }).expect(201);
    const login = await http().post('/api/v1/auth/login').send({ email, password }).expect(201);
    const me = await http()
      .get('/api/v1/auth/me')
      .set(auth(login.body.accessToken))
      .expect(200);
    return { token: login.body.accessToken, id: me.body.id, username };
  };

  const publish = async (token: string, content: string): Promise<string> => {
    const res = await http()
      .post('/api/v1/posts')
      .set(auth(token))
      .send({ content })
      .expect(201);
    return res.body.id as string;
  };

  const feedIds = async (token: string): Promise<string[]> => {
    const res = await http().get('/api/v1/feed?page=1&limit=100').set(auth(token)).expect(200);
    return res.body.items.map((post: { id: string }) => post.id);
  };

  const report = (
    token: string,
    targetType: string,
    targetId: string,
    reason = 'SPAM',
  ): request.Test =>
    http().post('/api/v1/reports').set(auth(token)).send({ targetType, targetId, reason });

  beforeAll(async () => {
    // The username must match ADMIN_USERNAMES exactly (modulo the case the
    // bootstrap lookup normalises), or the promotion never happens.
    const admin = await register('modadmin');
    const alice = await register('modsli');
    const bob = await register('modsbo');
    const carol = await register('modsla');
    const dave = await register('modsda');
    adminToken = admin.token;
    adminId = admin.id;
    aliceToken = alice.token;
    aliceId = alice.id;
    bobToken = bob.token;
    bobId = bob.id;
    carolToken = carol.token;
    carolId = carol.id;
    daveToken = dave.token;

    alicePostId = await publish(aliceToken, 'Alice speaks');
    bobPostId = await publish(bobToken, 'Bob speaks');
    // Carol needs content of her own for the account-removal check later.
    await publish(carolToken, 'Carol speaks');

    const comment = await http()
      .post(`/api/v1/posts/${alicePostId}/comments`)
      .set(auth(carolToken))
      .send({ content: 'A comment worth reporting' })
      .expect(201);
    carolCommentId = comment.body.id;
  });

  // --- roles ----------------------------------------------------------------

  it('promotes the account named in ADMIN_USERNAMES at login', async () => {
    const me = await http().get('/api/v1/auth/me').set(auth(adminToken)).expect(200);
    expect(me.body.username).toBe(adminUsername);
    expect(me.body.role).toBe('ADMIN');
    // Everyone else stays an ordinary account.
    const bob = await http().get('/api/v1/auth/me').set(auth(bobToken)).expect(200);
    expect(bob.body.role).toBe('USER');
  });

  it('locks every admin route to administrators', async () => {
    await http().get('/api/v1/admin/users').set(auth(bobToken)).expect(403);
    await http().get('/api/v1/admin/reports').set(auth(bobToken)).expect(403);
    await http().get('/api/v1/admin/users').expect(401);
    await http().get('/api/v1/admin/users').set(auth(adminToken)).expect(200);
  });

  // --- blocks ---------------------------------------------------------------

  it('blocks an account idempotently and lists the block', async () => {
    await http().post(`/api/v1/users/${bobId}/block`).set(auth(aliceToken)).expect(204);
    await http().post(`/api/v1/users/${bobId}/block`).set(auth(aliceToken)).expect(204);

    const blocks = await http().get('/api/v1/users/me/blocks').set(auth(aliceToken)).expect(200);
    expect(blocks.body.items.map((u: { id: string }) => u.id)).toContain(bobId);
  });

  it('refuses a follow in either direction once a block exists', async () => {
    await http().post(`/api/v1/users/${aliceId}/follow`).set(auth(bobToken)).expect(403);
    await http().post(`/api/v1/users/${bobId}/follow`).set(auth(aliceToken)).expect(403);
    // An uninvolved account is unaffected.
    await http().post(`/api/v1/users/${aliceId}/follow`).set(auth(daveToken)).expect(204);
  });

  it('hides both accounts from each other’s feeds and timelines', async () => {
    // Alice's post would otherwise appear in Bob's feed as tier-1 fill
    // (he does not follow her here), and Bob's in hers — the block must
    // remove both, in both tiers.
    expect(await feedIds(bobToken)).not.toContain(alicePostId);
    expect(await feedIds(aliceToken)).not.toContain(bobPostId);

    // The global list hides it for the signed-in viewer too…
    const asAlice = await http().get('/api/v1/posts?limit=100').set(auth(aliceToken)).expect(200);
    expect(asAlice.body.items.map((p: { id: string }) => p.id)).not.toContain(bobPostId);
    // …while an anonymous reader (who is in no block with anyone) still sees it.
    const anon = await http().get('/api/v1/posts?limit=100').expect(200);
    expect(anon.body.items.map((p: { id: string }) => p.id)).toContain(bobPostId);

    const bobTimeline = await http()
      .get(`/api/v1/users/${`modsbo${stamp}`}/posts?limit=100`)
      .set(auth(aliceToken))
      .expect(200);
    expect(bobTimeline.body.items.map((p: { id: string }) => p.id)).not.toContain(bobPostId);
  });

  it('keeps the profile readable but tells the client about the block', async () => {
    const aliceViewingBob = await http()
      .get(`/api/v1/users/${`modsbo${stamp}`}`)
      .set(auth(aliceToken))
      .expect(200);
    expect(aliceViewingBob.body.isBlocking).toBe(true);
    expect(aliceViewingBob.body.isBlockedBy).toBe(false);

    const bobViewingAlice = await http()
      .get(`/api/v1/users/${`modsli${stamp}`}`)
      .set(auth(bobToken))
      .expect(200);
    expect(bobViewingAlice.body.isBlocking).toBe(false);
    expect(bobViewingAlice.body.isBlockedBy).toBe(true);
    // The profile itself is still public data.
    expect(bobViewingAlice.body.username).toBe(`modsli${stamp}`);
  });

  it('leaves the blocked account out of discovery', async () => {
    const res = await http()
      .get(`/api/v1/users?search=modsli${stamp}`)
      .set(auth(bobToken))
      .expect(200);
    expect(res.body.items.map((u: { id: string }) => u.id)).not.toContain(aliceId);
  });

  it('lifts the block and restores follows', async () => {
    await http().delete(`/api/v1/users/${bobId}/block`).set(auth(aliceToken)).expect(204);
    await http().delete(`/api/v1/users/${bobId}/block`).set(auth(aliceToken)).expect(204);

    const blocks = await http().get('/api/v1/users/me/blocks').set(auth(aliceToken)).expect(200);
    expect(blocks.body.items.map((u: { id: string }) => u.id)).not.toContain(bobId);

    await http().post(`/api/v1/users/${aliceId}/follow`).set(auth(bobToken)).expect(204);
    expect(await feedIds(bobToken)).toContain(alicePostId);
  });

  // --- reports --------------------------------------------------------------

  it('files reports on a user, a post and a comment — and collapses repeats', async () => {
    const userReport = await report(bobToken, 'USER', aliceId).expect(201);
    aliceReportId = userReport.body.id;

    // The same open report twice must not create a second row in the queue.
    const repeat = await report(bobToken, 'USER', aliceId).expect(201);
    expect(repeat.body.id).toBe(aliceReportId);

    const postReport = await report(bobToken, 'POST', alicePostId).expect(201);
    const commentReport = await report(bobToken, 'COMMENT', carolCommentId).expect(201);
    bobReportIds = [userReport.body.id, postReport.body.id, commentReport.body.id];

    const mine = await http().get('/api/v1/reports/mine').set(auth(bobToken)).expect(200);
    expect(mine.body.meta.total).toBe(3);
    expect(mine.body.items.every((r: { reporter: { id: string } }) => r.reporter.id === bobId)).toBe(
      true,
    );
  });

  it('validates the target: 404 for a missing row, 400 for yourself', async () => {
    // Carol files these: rejected requests still consume her rate-limit
    // budget (the guard runs first), and this suite keeps each fixture
    // account's spending inside RATE_LIMIT_REPORTS on purpose.
    await report(carolToken, 'POST', '00000000-0000-4000-8000-000000000000').expect(404);
    await report(carolToken, 'COMMENT', '00000000-0000-4000-8000-000000000000').expect(404);
    await report(carolToken, 'USER', carolId).expect(400);
    // Bad shapes never reach the service (and the guard, being first, still
    // counted them — four requests, under the limit of five).
    await http()
      .post('/api/v1/reports')
      .set(auth(carolToken))
      .send({ targetType: 'POLAROID', targetId: aliceId, reason: 'SPAM' })
      .expect(400);
  });

  it('rate-limits reports per account (429 once the window is full)', async () => {
    // RATE_LIMIT_REPORTS=6 for this suite, keyed per account — Dave has his
    // own counter, and each of his six targets is distinct so no collapse
    // into an earlier report softens the count; the seventh is the 429.
    await report(daveToken, 'USER', aliceId).expect(201);
    await report(daveToken, 'POST', bobPostId).expect(201);
    await report(daveToken, 'COMMENT', carolCommentId).expect(201);
    await report(daveToken, 'USER', carolId).expect(201);
    await report(daveToken, 'USER', adminId).expect(201);
    await report(daveToken, 'POST', alicePostId).expect(201);
    await report(daveToken, 'USER', bobId).expect(429);

    // Bob is over the same limit? No: the counter is per account, so his
    // reports (filed before this test) are unaffected by Dave's exhaustion.
    const mine = await http().get('/api/v1/reports/mine').set(auth(bobToken)).expect(200);
    expect(mine.body.meta.total).toBe(3);
  });

  // --- suspension -----------------------------------------------------------

  it('suspends an account: token and login both stop working', async () => {
    const res = await http()
      .post(`/api/v1/admin/users/${aliceId}/suspend`)
      .set(auth(adminToken))
      .send({ days: 1, reason: 'test suspension' })
      .expect(201);
    expect(res.body.status).toBe('SUSPENDED');
    expect(res.body.suspendedReason).toBe('test suspension');

    const denied = await http()
      .post('/api/v1/posts')
      .set(auth(aliceToken))
      .send({ content: 'should not land' })
      .expect(403);
    expect(denied.body).toMatchObject({ code: 'ACCOUNT_SUSPENDED' });
    expect(denied.body.suspendedUntil).toBeTruthy();

    await http()
      .post('/api/v1/auth/login')
      .send({ email: `modsli-${stamp}@example.com`, password })
      .expect(403);

    const suspended = await http()
      .get('/api/v1/admin/suspensions')
      .set(auth(adminToken))
      .expect(200);
    expect(suspended.body.items.map((u: { id: string }) => u.id)).toContain(aliceId);
  });

  it('refuses self-suspension and self-demotion', async () => {
    await http()
      .post(`/api/v1/admin/users/${adminId}/suspend`)
      .set(auth(adminToken))
      .send({ days: 1 })
      .expect(400);
    await http()
      .patch(`/api/v1/admin/users/${adminId}/role`)
      .set(auth(adminToken))
      .send({ role: 'USER' })
      .expect(400);
  });

  it('lifts the suspension and the account works again', async () => {
    await http()
      .post(`/api/v1/admin/users/${aliceId}/unsuspend`)
      .set(auth(adminToken))
      .expect(201);

    await http()
      .post('/api/v1/posts')
      .set(auth(aliceToken))
      .send({ content: 'back from suspension' })
      .expect(201);
    const login = await http()
      .post('/api/v1/auth/login')
      .send({ email: `modsli-${stamp}@example.com`, password })
      .expect(201);
    expect(login.body.accessToken).toBeDefined();
  });

  // --- workflow + audit -----------------------------------------------------

  it('walks a report through the workflow and refuses a no-op transition', async () => {
    const reviewing = await http()
      .patch(`/api/v1/admin/reports/${aliceReportId}`)
      .set(auth(adminToken))
      .send({ status: 'REVIEWING' })
      .expect(200);
    expect(reviewing.body.status).toBe('REVIEWING');

    const resolved = await http()
      .patch(`/api/v1/admin/reports/${aliceReportId}`)
      .set(auth(adminToken))
      .send({ status: 'RESOLVED', resolution: 'post removed' })
      .expect(200);
    expect(resolved.body.status).toBe('RESOLVED');
    expect(resolved.body.resolution).toBe('post removed');

    // Closing twice is a client bug, not a decision.
    await http()
      .patch(`/api/v1/admin/reports/${aliceReportId}`)
      .set(auth(adminToken))
      .send({ status: 'RESOLVED' })
      .expect(400);
    await http()
      .patch(`/api/v1/admin/reports/${aliceReportId}`)
      .set(auth(adminToken))
      .send({ status: 'PENDING' })
      .expect(400);

    const queue = await http()
      .get('/api/v1/admin/reports?reportStatus=PENDING')
      .set(auth(adminToken))
      .expect(200);
    const pending = queue.body.items.map((r: { id: string }) => r.id);
    // The closed one is gone from the queue; Bob's other two are still there.
    expect(pending).not.toContain(aliceReportId);
    expect(pending).toContain(bobReportIds[1]);
    expect(pending).toContain(bobReportIds[2]);
  });

  it('shows the audit trail of what moderators did', async () => {
    const actions = await http().get('/api/v1/admin/actions').set(auth(adminToken)).expect(200);
    const verbs = actions.body.items.map((row: { action: string }) => row.action);
    expect(verbs).toContain('user.suspend');
    expect(verbs).toContain('user.unsuspend');
    expect(verbs).toContain('report.resolved');
  });

  // --- content + account removal -------------------------------------------

  it('removes reported content through the admin console', async () => {
    await http().delete(`/api/v1/admin/posts/${bobPostId}`).set(auth(adminToken)).expect(204);
    await http().get(`/api/v1/posts/${bobPostId}`).expect(404);

    await http().delete(`/api/v1/admin/comments/${carolCommentId}`).set(auth(adminToken)).expect(204);
    const comments = await http().get(`/api/v1/posts/${alicePostId}/comments`).expect(200);
    expect(comments.body.items.map((c: { id: string }) => c.id)).not.toContain(carolCommentId);

    const actions = await http().get('/api/v1/admin/actions').set(auth(adminToken)).expect(200);
    const verbs = actions.body.items.map((row: { action: string }) => row.action);
    expect(verbs).toContain('post.delete');
    expect(verbs).toContain('comment.delete');
  });

  it('removes an account entirely', async () => {
    const posts = await http()
      .get(`/api/v1/users/${`modsla${stamp}`}/posts?limit=100`)
      .expect(200);
    expect(posts.body.items.length).toBeGreaterThan(0);

    await http().delete(`/api/v1/admin/users/${carolId}`).set(auth(adminToken)).expect(204);

    await http().get(`/api/v1/users/${`modsla${stamp}`}`).expect(404);
    const after = await http()
      .get(`/api/v1/users/${`modsla${stamp}`}/posts?limit=100`)
      .expect(404);
    expect(after.status).toBe(404);

    // Her token no longer resolves to anything.
    await http().get('/api/v1/auth/me').set(auth(carolToken)).expect(401);
  });
});
