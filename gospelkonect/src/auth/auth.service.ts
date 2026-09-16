import { Injectable, Post } from '@nestjs/common';
// import { popScheduler } from 'rxjs/internal/util/args';


interface User { 
    username: string;
    password: string;
}


// const users: user[] = [
//     {
//         username: 'admin',
//         password: 'admin'
//     },
//     {
//         username: 'user',
//         password: 'user'
//     }
// ]


@Injectable()
export class AuthService {
    private users: User[]=[
          {
        username: 'admin',
        password: 'admin'
    },
    {
        username: 'user',
        password: 'user'
    }

]
findUserByUsername(name:string=''){
    return this.users.filter((user)=>{
        user.username.toLowerCase().includes(name.toLowerCase())
    })
}    
}
