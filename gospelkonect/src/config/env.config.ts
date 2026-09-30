// Centralised environment/config loader. ConfigModule.forRoot({ load: [envConfig] })
// calls this factory once at boot and exposes the result on ConfigService.
export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },

  corsOrigin: process.env.CORS_ORIGIN ?? '*',

  // --- Authentication (Phase 2) -------------------------------------------
  // Grouped under `auth` so every consumer reads an `auth.*` path, e.g.
  // configService.get('auth.jwtSecret'). Keys placed at the top level instead
  // would resolve to undefined silently.
  auth: {
    // Secret signing both access and refresh JWTs. Required in production so a
    // leaked repo can never mint forgeable tokens; dev gets a local default.
    jwtSecret: (() => {
      const secret = process.env.JWT_SECRET?.trim();
      if (secret) return secret;
      if ((process.env.NODE_ENV ?? 'development') === 'production') {
        throw new Error('JWT_SECRET must be set when NODE_ENV=production');
      }
      return 'gospelkonect-dev-only-secret-do-not-use-in-production';
    })(),

    // Access tokens are stateless while valid, so this bounds how long a leaked
    // one works. Keep it short. Seconds, because it doubles as the Redis
    // deny-list TTL on logout.
    accessTtlSeconds: parseInt(process.env.ACCESS_TOKEN_TTL_SECONDS ?? '900', 10),

    // Refresh lifetime in seconds because it doubles as the Redis key TTL.
    refreshTtlSeconds: parseInt(process.env.REFRESH_TOKEN_TTL_SECONDS ?? '604800', 10),

    // Failed-login rate limit enforced by LoginRateLimitGuard.
    loginMaxAttempts: parseInt(process.env.LOGIN_MAX_ATTEMPTS ?? '5', 10),
    loginWindowSeconds: parseInt(process.env.LOGIN_WINDOW_SECONDS ?? '900', 10),
  },

  // --- Phase 9: safety & moderation ---------------------------------------
  // Comma-separated usernames that become ADMIN at boot and at login. The
  // first administrator of an environment is provisioned here rather than by
  // a hand-written SQL statement.
  admin: {
    usernames: process.env.ADMIN_USERNAMES ?? '',
  },

  // --- Phase 3: avatar uploads --------------------------------------------
  upload: {
    // Directory the uploaded files land in, relative to the process cwd.
    // main.ts serves it statically at the /uploads URL prefix. Read here
    // (after dotenv) rather than at decoration time, which is too early.
    dir: process.env.UPLOAD_DIR ?? 'uploads',
  },

  // --- Phase 8: media storage ----------------------------------------------
  // Present only when an object-storage bucket is wired to this service —
  // Composer injects all four (dev and the platform alike). All four or none:
  // a partial set is a misconfiguration, not a reason to fall back to disk.
  media: {
    endpoint: process.env.COMPOSER_API_MEDIA_URL,
    bucket: process.env.COMPOSER_API_MEDIA_BUCKET,
    accessKeyId: process.env.COMPOSER_API_MEDIA_ACCESSKEYID,
    secretAccessKey: process.env.COMPOSER_API_MEDIA_SECRETACCESSKEY,
  },
});
