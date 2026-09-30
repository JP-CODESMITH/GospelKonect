import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
// Swagger decorators — the app already builds an OpenAPI doc in main.ts, so
// these make the new routes appear in it instead of being undocumented.
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService, type AuthSession } from './auth.service.js';
import { CreateUserDtos, LoginUserDtos, LogoutUserDtos, RefreshUserDtos } from '../dtos/authentication.dto.js';
import { AccessTokenGuard } from './guards/access-token.guard.js';
import { LoginRateLimitGuard } from './guards/login-rate-limit.guard.js';
import { RateLimit, RateLimitGuard } from '../security/rate-limit.guard.js';
import { RefreshTokenGuard } from './guards/refresh-token.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { AccessTokenPayload } from './token/token.service.js';

// Response shape for /auth/me — the Prisma User minus passwordHash.
// Typed loosely here to keep the controller decoupled from Prisma's generated types.
interface PublicUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@ApiTags('auth') // Groups every route below under "auth" in the Swagger UI.
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Creates an account. Returns the new user only — the client then calls
   * /auth/login to get tokens, matching the Register → Login flow.
   */
  @Post('register')
  // Registration is the spammer's entry point: 30 an hour per IP, and the
  // failed-login limiter still applies on top for the password-guessing case.
  @UseGuards(RateLimitGuard)
  @RateLimit({ scope: 'register', points: 30, windowSec: 3600 })
  @ApiOperation({ summary: 'Create a new account' })
  @ApiCreatedResponse({ description: 'Account created' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiConflictResponse({ description: 'Email or username already in use' })
  async registerUser(@Body() body: CreateUserDtos): Promise<PublicUser> {
    // NOTE (fix): no manual field checks or try/catch here. The DTO decorators
    // plus the global ValidationPipe already reject bad input with 400, and
    // service errors (400/409) must propagate so Nest sets the right status.
    return this.authService.registerUser(body.password, body.username, body.email);
  }

  /**
   * Exchanges email + password for an access/refresh token pair. Guarded by
   * LoginRateLimitGuard so brute force attempts are rejected with 429 before
   * any password hashing work is done.
   */
  @Post('login')
  @UseGuards(LoginRateLimitGuard)
  @ApiOperation({ summary: 'Exchange credentials for a token pair' })
  @ApiCreatedResponse({ description: 'Tokens issued' })
  @ApiUnauthorizedResponse({ description: 'Bad email or password' })
  async login(
    @Body() body: LoginUserDtos,
    // Needed for the rate-limit key (email + IP) and to clear it on success.
    @Req() req: Request,
  ): Promise<AuthSession> {
    return this.authService.login(body.password, body.email, req.ip ?? 'unknown');
  }

  /**
   * Rotates a valid refresh token into a brand-new pair. The presented refresh
   * token is revoked as part of the exchange, so it can never be replayed.
   */
  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  @ApiOperation({ summary: 'Rotate a refresh token into a new token pair' })
  // RefreshTokenGuard reads `refreshToken` off the body itself, so there is no
  // @Body() param here — this decorator exists purely to document the payload.
  @ApiBody({ type: RefreshUserDtos })
  @ApiCreatedResponse({ description: 'New tokens issued' })
  @ApiUnauthorizedResponse({ description: 'Refresh token missing, expired or revoked' })
  async refresh(@Req() req: Request): Promise<AuthSession> {
    // RefreshTokenGuard already verified the token and attached its claims.
    const { claims } = req.refreshToken!;
    return this.authService.refresh(claims.sub, claims.jti);
  }

  /**
   * Logs this session out: revokes its refresh token and deny-lists the access
   * token that was used to make the request, so it stops working immediately.
   */
  @Post('logout')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth() // Tells Swagger to offer the Authorize button for this route.
  @HttpCode(HttpStatus.NO_CONTENT) // Nothing to return; 204 avoids an empty JSON body.
  @ApiOperation({ summary: 'Log out of the current session' })
  @ApiNoContentResponse({ description: 'Session terminated' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async logout(
    @Req() req: Request,
    @CurrentUser() user: AccessTokenPayload,
    @Body() body: LogoutUserDtos,
  ): Promise<void> {
    // Guard guarantees both fields exist; the non-null assertions document that.
    return this.authService.logout(user.sub, req.accessToken!, user.jti, body.refreshToken);
  }

  /**
   * Logs the user out of every device: all refresh sessions are revoked and the
   * access token used here is deny-listed.
   */
  @Post('logout-all')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth() // Tells Swagger to offer the Authorize button for this route.
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Log out of every session' })
  @ApiNoContentResponse({ description: 'All sessions terminated' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async logoutAll(
    @Req() req: Request,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<void> {
    return this.authService.logoutAll(user.sub, req.accessToken!, user.jti);
  }

  /**
   * Returns the caller's own account. The reference implementation of a
   * protected route — every other guarded endpoint should follow this pattern.
   */
  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth() // Tells Swagger to offer the Authorize button for this route.
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiOkResponse({ description: 'Current user' })
  @ApiUnauthorizedResponse({ description: 'Missing, expired or revoked access token' })
  async me(@CurrentUser() user: AccessTokenPayload): Promise<PublicUser> {
    return this.authService.me(user.sub) as Promise<PublicUser>;
  }
}
