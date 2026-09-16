// auth.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { HashingService } from './hash/hash.service.js';

@Injectable()
export class AuthService {
  // NOTE (fix): PrismaService is injected via the constructor (Nest DI) instead of
  // `require()` + `new` per request. Reason: this project is ESM ("type": "module"),
  // so `require()` throws at runtime, and a new client per request leaks DB
  // connections. The injected instance is created once by Nest and shared.
  constructor(
    private readonly hashingService: HashingService,
    private readonly prisma: PrismaService,
  ) {}

  async registerUser(password: string, username: string, email: string) {
    // NOTE (fix): basic length guard kept here so the service is safe even when
    // called directly (e.g. in tests) with the global ValidationPipe bypassed.
    // Detailed format rules (valid email, etc.) live on the DTO via class-validator.
    if (
      password.length < 8 ||
      password.length > 128 ||
      username.length < 3 ||
      username.length > 50 ||
      email.length < 5 ||
      email.length > 100
    ) {
      throw new BadRequestException(
        'Input does not meet the required criteria',
      );
    }

    // NOTE (fix): check the unique fields first so we return 409 Conflict with a
    // clear message instead of leaking a raw Prisma P2002 error.
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      throw new ConflictException('Email or username already in use');
    }

    const passwordHash = await this.hashingService.hashPassword(password);

    // NOTE (fix): the old code wrote `{ name, email, password }`, which never worked:
    //  - `password` is not a column (the schema uses `passwordHash`),
    //  - `username` (required + unique in the schema) was never set,
    //  - `$connect()` resolves to void, so `db.user.create` crashed.
    // Corrected below to write the real columns, awaited directly on the injected
    // client. `name` is required by the schema but the register DTO only carries
    // `username`, so `name` defaults to `username` for now. If a separate display
    // name is added to the DTO later, pass it here instead of `username`.
    const user = await this.prisma.user.create({
      data: {
        name: username,
        username,
        email,
        passwordHash,
      },
    });

    // NOTE (fix): never return the password hash to callers. It is stripped here
    // so the controller response cannot leak credentials.
    const { passwordHash: _omitted, ...safeUser } = user;
    return safeUser;
  }

  async login(password: string, email: string): Promise<boolean> {
    // NOTE (fix): look up by unique email only. The previous version passed
    // `{ email, passwordHash }` to findUnique, which Prisma rejects because that
    // combination is not a defined unique constraint.
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // NOTE (fix): explicit not-found guard. Previously this relied on a TypeError
    // (`null.passwordHash`) falling into the catch below, which worked by accident
    // and was hard to read. Same 401 message either way so callers cannot tell
    // "unknown email" apart from "wrong password" (no user enumeration).
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // NOTE (fix): verify with argon2.verify via comparePassword. Re-hashing the
    // input and comparing strings can never match (fresh random salt per hash).
    // comparePassword already returns false on internal verify errors, so no
    // try/catch is needed here.
    // NOTE (fix): no broad try/catch around this method anymore. Catching every
    // error as 401 masked real failures (DB down, timeouts) as "wrong password".
    // Unexpected errors now propagate as 500s so outages are visible.
    const isPasswordValid = await this.hashingService.comparePassword(
      password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return true;
  }
}
