import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { HashingService } from './hash/hash.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Module({
  controllers: [AuthController],
  // NOTE (fix): PrismaService added so it can be injected into AuthService.
  // Without this, Nest cannot resolve the new constructor dependency.
  providers: [AuthService, HashingService, PrismaService],
})
export class AuthModule {}
