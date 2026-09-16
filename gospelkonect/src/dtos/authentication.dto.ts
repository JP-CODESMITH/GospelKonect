import { IsEmail, IsString, Length } from 'class-validator';

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
