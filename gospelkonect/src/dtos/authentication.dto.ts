import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class CreateUserDtos {
  // NOTE (fix): validation decorators added so the global ValidationPipe
  // (whitelist: true, forbidNonWhitelisted: true) actually validates the register
  // body. Without decorators every property counts as non-whitelisted, so even a
  // correct request was rejected with 400 before reaching the service.
  @IsString()
  @Length(3, 50)
  username: string;

  @IsEmail()
  @Length(5, 100)
  email: string;

  @IsString()
  @Length(8, 128)
  password: string;
}


export class LoginUserDtos {
  @IsEmail()
  @Length(5, 100)
  email: string;

  @IsString()
  @Length(8, 128)
  password: string;
}

// Body of POST /auth/refresh. A refresh token is a credential, so it travels in
// the body (never as a header that proxies and access logs would record).
export class RefreshUserDtos {
  @IsString()
  @Length(20, 4096)
  refreshToken: string;
}

// Body of POST /auth/logout. The refresh token is optional: omitting it makes
// the service close every session instead of just this one (fails safe).
export class LogoutUserDtos {
  @IsOptional()
  @IsString()
  @Length(20, 4096)
  refreshToken?: string;
}
