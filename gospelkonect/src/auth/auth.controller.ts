import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { isString } from '@nestjs/common/internal';
import { AuthService } from './auth.service.js'
import { CreateUserDtos } from '../dtos/authentication.dto.js';


@Controller('auth')
export class AuthController {
    @Post('login/:username/:password')
    login(
        // @Body()
    // CreateUserDtos:CreateUserDtos,
        @Param('username') username: string,
        @Param('password') password: string,
    ): any {
        if (isString(username) && isString(password)) {
            const authService = new AuthService();
            
            return authService.findUserByUsername(username);
        } else {
            return 'Invalid username or password.';
        }
    }
    @Get()
    getUsers(@Query('name') name:string){
        const users= [
            {
                id:1, name: 'John Paul Ogirima'
            },
            {
                id:2, name: 'Programmer'
            }
        ]
         if (name){
            return users.filter((user)=>{
                user.name.toLowerCase().includes(name.toLowerCase())
            })
         }

         return users;
    }
}
