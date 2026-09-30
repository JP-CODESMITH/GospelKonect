import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

// End-to-end walk of the whole Phase 2 flow against the real Postgres and Redis:
//   register -> login -> protected route -> refresh -> logout -> rejected
// Needs DATABASE_URL and REDIS_URL to point at running services.
describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  // Unique per run so a leftover row from a previous run can't 409 this one.
  const email = `e2e-${Date.now()}@example.com`;
  const username = `e2e${Date.now().toString().slice(-8)}`;
  const password = 'super-secret-1';

  // Tokens handed back by the login step and consumed by later steps.
  let accessToken = '';
  let refreshToken = '';

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

  it('registers an account and never echoes the password hash', async () => {
    const res = await http()
      .post('/api/v1/auth/register')
      .send({ email, username, password })
      .expect(201);

    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body.email).toBe(email);
    expect(res.body.username).toBe(username);
  });

  it('rejects a duplicate registration with 409', async () => {
    await http()
      .post('/api/v1/auth/register')
      .send({ email, username, password })
      .expect(409);
  });

  it('rejects an invalid email with 400 before any database work', async () => {
    await http()
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', username: 'someone', password })
      .expect(400);
  });

  it('logs in and returns an access/refresh token pair', async () => {
    const res = await http()
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);

    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.user).not.toHaveProperty('passwordHash');

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('rejects a wrong password with 401', async () => {
    await http()
      .post('/api/v1/auth/login')
      .send({ email, password: 'definitely-wrong-1' })
      .expect(401);
  });

  it('serves the protected /auth/me route to a valid access token', async () => {
    const res = await http()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.email).toBe(email);
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('refuses /auth/me without a token', async () => {
    await http().get('/api/v1/auth/me').expect(401);
  });

  it('refuses /auth/me with a garbage token', async () => {
    await http()
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not.a.real.token')
      .expect(401);
  });

  it('rotates the refresh token into a new pair', async () => {
    const res = await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(201);

    expect(res.body.accessToken).not.toBe(accessToken);
    expect(res.body.refreshToken).not.toBe(refreshToken);

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('rejects a refresh token that has already been rotated', async () => {
    // The pair returned above superseded the previous refresh token; replaying
    // it must fail, which is what makes token theft detectable.
    const rotated = await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(201);

    await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    // Keep the newest pair so later steps still have a live session.
    accessToken = rotated.body.accessToken;
    refreshToken = rotated.body.refreshToken;
  });

  it('logs out and immediately invalidates the access token used', async () => {
    await http()
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(204);

    // The deny-list must stop it working now, not at its 15 minute expiry.
    await http()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);
  });

  it('refuses the revoked refresh token after logout', async () => {
    await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });

  it('can log out of every device', async () => {
    const login = await http().post('/api/v1/auth/login').send({ email, password }).expect(201);

    await http()
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(204);

    // Its own access token dies with it...
    await http()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(401);

    // ...and so does its refresh token.
    await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(401);
  });
});
