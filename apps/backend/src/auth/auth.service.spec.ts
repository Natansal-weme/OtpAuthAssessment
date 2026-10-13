import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';

// TODO: Candidate to implement
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });
});
