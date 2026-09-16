import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { HashingService } from './hash/hash.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    // NOTE (fix): AuthService now depends on HashingService and PrismaService, so
    // the test module must provide them (mocked) or Nest fails to resolve them.
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: HashingService, useValue: { hashPassword: async () => 'hashed', comparePassword: async () => true } },
        { provide: PrismaService, useValue: { user: { findFirst: async () => null, create: async (args: unknown) => args } } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
