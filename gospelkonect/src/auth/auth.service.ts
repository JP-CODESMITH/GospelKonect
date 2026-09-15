import { Injectable } from '@nestjs/common';


export type user ={
    username: string;
    password: string;
}


const users: user[] = [
    {
        username: 'admin',
        password: 'admin'
    },
    {
        username: 'user',
        password: 'user'
    }
]


@Injectable()
export class AuthService {
    async findUserByUsername(username: string): Promise<user | undefined> {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(users.find(user => user.username === username));
            }, 1000);
        });
    }
}
