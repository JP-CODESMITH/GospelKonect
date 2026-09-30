import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  // Plain string: app.controller.spec.ts and test/app.e2e-spec.ts both assert
  // exactly 'Hello World!'. The earlier '<h1>...</h1>' wrapper failed them.
  getHello(): string {
    return 'Hello World!';
  }
}
