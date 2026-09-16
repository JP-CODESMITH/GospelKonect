import { Test, TestingModule } from '@nestjs/testing';
// NOTE (fix): the service class is named HashingService, not HashService. The old
// import silently resolved to undefined and Nest failed to instantiate the module.
import { HashingService } from './hash.service.js';

describe('HashingService', () => {
  let service: HashingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HashingService],
    }).compile();

    service = module.get<HashingService>(HashingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
