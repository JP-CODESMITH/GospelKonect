import { Controller, Param, Post } from '@nestjs/common';
import { isString } from '@nestjs/common/internal';


@Controller('auth')
export class AuthController {
    @Post('login/:username/:password')
    login(
        @Param('username') username: string,
        @Param('password') password: string,
    ): string {
        if (isString(username) && isString(password)) {
            return `User ${username} logged in successfully!`;
        } else {
            return 'Invalid username or password.';
        }
    }
}
