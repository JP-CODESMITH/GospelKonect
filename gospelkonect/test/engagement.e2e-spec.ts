import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

// Phase 5 end-to-end: comments (with replies and cascading deletes), the
// three reactions, and the tallies/viewerReaction every post response now
// carries — against real Postgres so the schema and the notifications land.
describe('Engagement (e2e)', () => {
  let app: INestApplication<App>;

  const stamp = Date.now().toString().slice(-9);
  const password = 'super-secret-1';

  let aliceToken = ''; // the author
  let bobToken = ''; // a commenter
  let carolToken = ''; // a second commenter

  let postId = '';
  let topCommentId = '';
  let replyId = '';

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

  const register = async (who: string): Promise<string> => {
    const email = `${who}-${stamp}@example.com`;
    const username = `${who}${stamp}`;
    await http().post('/api/v1/auth/register').send({ email, username, password }).expect(201);
    const login = await http().post('/api/v1/auth/login').send({ email, password }).expect(201);
    return login.body.accessToken as string;
  };

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const post = async (token: string, id: string): Promise<Record<string, any>> => {
    const res = await http().get(`/api/v1/posts/${id}`).set(auth(token)).expect(200);
    return res.body;
  };

  const comments = async (id: string): Promise<any[]> => {
    const res = await http().get(`/api/v1/posts/${id}/comments?limit=100`).expect(200);
    return res.body.items;
  };

  beforeAll(async () => {
    aliceToken = await register('engal');
    bobToken = await register('engbl');
    carolToken = await register('engcl');

    const created = await http()
      .post('/api/v1/posts')
      .set(auth(aliceToken))
      .send({ content: 'Bring it all to Jesus' })
      .expect(201);
    postId = created.body.id;
  });

  // --- comments -------------------------------------------------------------

  it('starts with no comments and zero tallies for an anonymous reader', async () => {
    const res = await http().get(`/api/v1/posts/${postId}`).expect(200);
    expect(res.body.commentCount).toBe(0);
    expect(res.body.reactions).toEqual({ LIKE: 0, AMEN: 0, LOVE: 0 });
    expect(res.body.viewerReaction).toBeNull();
  });

  it('accepts a comment and increments commentCount on the post', async () => {
    const res = await http()
      .post(`/api/v1/posts/${postId}/comments`)
      .set(auth(bobToken))
      .send({ content: 'Amen!' })
      .expect(201);
    expect(res.body.content).toBe('Amen!');
    expect(res.body.parentId).toBeNull();
    expect(res.body.author.username).toBeDefined();
    topCommentId = res.body.id;

    expect((await post(aliceToken, postId)).commentCount).toBe(1);
  });

  it('accepts a reply, and one more reply under it', async () => {
    const reply = await http()
      .post(`/api/v1/posts/${postId}/comments`)
      .set(auth(aliceToken))
      .send({ content: 'Thanks Bob', parentId: topCommentId })
      .expect(201);
    replyId = reply.body.id;
    expect(reply.body.parentId).toBe(topCommentId);

    // A reply to a reply: the thread nests to any depth via parentId.
    await http()
      .post(`/api/v1/posts/${postId}/comments`)
      .set(auth(carolToken))
      .send({ content: 'Same here', parentId: replyId })
      .expect(201);

    expect((await post(aliceToken, postId)).commentCount).toBe(3);
  });

  it('lists the conversation oldest first with parents intact', async () => {
    const items = await comments(postId);
    expect(items).toHaveLength(3);
    expect(items[0].id).toBe(topCommentId);
    expect(items[0].parentId).toBeNull();
    expect(items[1].parentId).toBe(topCommentId);
    expect(items[2].parentId).toBe(replyId);
    // No author internals leak into the payload.
    expect(items[0].author).not.toHaveProperty('passwordHash');
    expect(items[0].author).not.toHaveProperty('email');
  });

  it('rejects a blank comment, an unknown post and a parent from another post', async () => {
    await http()
      .post(`/api/v1/posts/${postId}/comments`)
      .set(auth(bobToken))
      .send({ content: '   ' })
      .expect(400);

    await http()
      .post('/api/v1/posts/00000000-0000-4000-8000-000000000000/comments')
      .set(auth(bobToken))
      .send({ content: 'hi' })
      .expect(404);

    // A comment on another post cannot become a parent here.
    const other = await http()
      .post('/api/v1/posts')
      .set(auth(aliceToken))
      .send({ content: 'another post' })
      .expect(201);
    const otherComment = await http()
      .post(`/api/v1/posts/${other.body.id}/comments`)
      .set(auth(bobToken))
      .send({ content: 'elsewhere' })
      .expect(201);

    await http()
      .post(`/api/v1/posts/${postId}/comments`)
      .set(auth(carolToken))
      .send({ content: 'nope', parentId: otherComment.body.id })
      .expect(400);
  });

  it('notifies the post author of a comment and the parent author of a reply', async () => {
    const inbox = await http().get('/api/v1/notifications').set(auth(aliceToken)).expect(200);
    const commentNotice = inbox.body.items.find(
      (n: { type: string; entityId: string }) => n.type === 'COMMENT' && n.entityId === topCommentId,
    );
    expect(commentNotice).toBeDefined();
    expect(commentNotice.actor.username).toBe(`engbl${stamp}`);

    const bobInbox = await http().get('/api/v1/notifications').set(auth(bobToken)).expect(200);
    const replyNotice = bobInbox.body.items.find(
      (n: { type: string; entityId: string }) => n.type === 'REPLY' && n.entityId === replyId,
    );
    expect(replyNotice).toBeDefined();
    expect(replyNotice.actor.username).toBe(`engal${stamp}`);
  });

  it('lets only the author edit a comment', async () => {
    const edited = await http()
      .patch(`/api/v1/comments/${topCommentId}`)
      .set(auth(bobToken))
      .send({ content: 'Amen, indeed!' })
      .expect(200);
    expect(edited.body.content).toBe('Amen, indeed!');

    await http()
      .patch(`/api/v1/comments/${topCommentId}`)
      .set(auth(carolToken))
      .send({ content: 'not mine' })
      .expect(403);

    await http()
      .patch('/api/v1/comments/00000000-0000-4000-8000-000000000000')
      .set(auth(bobToken))
      .send({ content: 'ghost' })
      .expect(404);
  });

  it('deletes a reply together with everything under it', async () => {
    await http().delete(`/api/v1/comments/${replyId}`).set(auth(aliceToken)).expect(204);

    const items = await comments(postId);
    // The top-level comment survived; the reply AND the reply-to-the-reply did not.
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(topCommentId);
    expect((await post(aliceToken, postId)).commentCount).toBe(1);

    // The reply's own notification is gone with it (orphan cleanup).
    const bobInbox = await http().get('/api/v1/notifications').set(auth(bobToken)).expect(200);
    expect(bobInbox.body.items.some((n: { entityId: string }) => n.entityId === replyId)).toBe(false);
  });

  // --- reactions ------------------------------------------------------------

  it('reacts to a post and reports the tallies plus the viewer’s own choice', async () => {
    const res = await http()
      .put(`/api/v1/posts/${postId}/reactions`)
      .set(auth(aliceToken))
      .send({ type: 'LIKE' })
      .expect(200);
    expect(res.body).toEqual({ reactions: { LIKE: 1, AMEN: 0, LOVE: 0 }, viewerReaction: 'LIKE' });

    const seen = await post(aliceToken, postId);
    expect(seen.reactions.LIKE).toBe(1);
    expect(seen.viewerReaction).toBe('LIKE');

    // Anonymous readers still see the tally, never someone else's choice.
    const anon = await http().get(`/api/v1/posts/${postId}`).expect(200);
    expect(anon.body.reactions.LIKE).toBe(1);
    expect(anon.body.viewerReaction).toBeNull();
  });

  it('replaces an existing reaction instead of adding a second one', async () => {
    await http()
      .put(`/api/v1/posts/${postId}/reactions`)
      .set(auth(aliceToken))
      .send({ type: 'LOVE' })
      .expect(200);

    const seen = await post(aliceToken, postId);
    expect(seen.reactions).toEqual({ LIKE: 0, AMEN: 0, LOVE: 1 });
    expect(seen.viewerReaction).toBe('LOVE');
  });

  it('rejects an unknown reaction type and an unknown post', async () => {
    await http()
      .put(`/api/v1/posts/${postId}/reactions`)
      .set(auth(bobToken))
      .send({ type: 'FIRE' })
      .expect(400);

    await http()
      .put('/api/v1/posts/00000000-0000-4000-8000-000000000000/reactions')
      .set(auth(bobToken))
      .send({ type: 'LIKE' })
      .expect(404);
  });

  it('removes the caller’s reaction and answers with the new tallies', async () => {
    await http().delete(`/api/v1/posts/${postId}/reactions`).set(auth(aliceToken)).expect(200);

    const seen = await post(aliceToken, postId);
    expect(seen.reactions).toEqual({ LIKE: 0, AMEN: 0, LOVE: 0 });
    expect(seen.viewerReaction).toBeNull();
  });

  it('carries the tallies into the timeline and the feed', async () => {
    await http()
      .put(`/api/v1/posts/${postId}/reactions`)
      .set(auth(carolToken))
      .send({ type: 'AMEN' })
      .expect(200);

    const timeline = await http()
      .get(`/api/v1/users/engal${stamp}/posts?limit=100`)
      .expect(200);
    const inTimeline = timeline.body.items.find((p: { id: string }) => p.id === postId);
    expect(inTimeline.reactions).toEqual({ LIKE: 0, AMEN: 1, LOVE: 0 });
    expect(inTimeline.commentCount).toBe(1);

    const feed = await http().get('/api/v1/feed?page=1&limit=100').set(auth(carolToken)).expect(200);
    const inFeed = feed.body.items.find((p: { id: string }) => p.id === postId);
    expect(inFeed.reactions.AMEN).toBe(1);
    expect(inFeed.viewerReaction).toBe('AMEN');
  });

  it('cascade-deletes the conversation when the post goes away', async () => {
    await http().delete(`/api/v1/posts/${postId}`).set(auth(aliceToken)).expect(204);

    await http().get(`/api/v1/posts/${postId}/comments`).expect(404);
    await http().get(`/api/v1/posts/${postId}`).expect(404);
  });
});
