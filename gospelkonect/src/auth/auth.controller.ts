import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js'
import { CreateUserDtos, LoginUserDtos } from '../dtos/authentication.dto.js';


@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}
    @Post('login')
    async login(@Body() body: LoginUserDtos): Promise<boolean> {
        return this.authService.login(body.password, body.email);
    }
    @Post('register')
    async registerUser(@Body() body: CreateUserDtos): Promise<unknown> {
        // NOTE (fix): no manual field checks or try/catch here. The DTO decorators
        // plus the global ValidationPipe already reject bad input with 400, and
        // service errors (400/409) must propagate so Nest sets the right status.
        // The old try/catch returned every error as a 200 string, hiding failures.
        // Args are (password, username, email) to match AuthService.registerUser,
        // which now saves `username` to the schema's username column.
        return this.authService.registerUser(body.password, body.username, body.email);
    }
}
