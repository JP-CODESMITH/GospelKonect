import { Module } from '@nestjs/common';
// JwtModule signs and verifies every token in this app. Registered globally so
// TokenService is the only class that has to care about the secret.
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { HashingService } from './hash/hash.service.js';
import { TokenService } from './token/token.service.js';
import { LoginRateLimitService } from './rate-limit/rate-limit.service.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true, // Makes JwtService injectable without re-importing JwtModule.
      inject: [ConfigService], // Needed to read env.config.ts below.
      useFactory: (config: ConfigService) => ({
        // Signs and verifies both token types; per-token lifetimes are passed
        // at each sign() call because access and refresh durations differ.
        secret: config.get<string>('auth.jwtSecret'),
      }),
    }),
  ],
  controllers: [AuthController],
  // PrismaService is no longer listed here: it now comes from the @Global
  // PrismaModule imported once in AppModule, so Nest creates ONE client
  // shared by Auth and Users instead of one pool per module.
  providers: [
    AuthService,
    HashingService,
    TokenService,
    LoginRateLimitService,
  ],
  // Exported so guards used by other modules can resolve TokenService.
  exports: [TokenService],
})
export class AuthModule {}
