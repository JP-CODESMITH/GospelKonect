import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

// Marked @Global so PrismaService is injectable anywhere after AppModule
// imports this once — without it every new module would re-declare the
// provider and Nest would create a second PrismaClient (a second pool).
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
