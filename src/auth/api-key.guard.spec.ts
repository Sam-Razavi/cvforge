import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { ApiKeyGuard } from './api-key.guard';

const makeContext = (headers: Record<string, string>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  }) as unknown as ExecutionContext;

const mockPrisma = (record: unknown) => ({
  apiKey: {
    findUnique: jest.fn().mockResolvedValue(record),
    update: jest.fn().mockResolvedValue(undefined),
  },
});

describe('ApiKeyGuard', () => {
  it('throws when x-api-key header is missing', async () => {
    const guard = new ApiKeyGuard(mockPrisma(null) as never);
    await expect(guard.canActivate(makeContext({}))).rejects.toThrow(UnauthorizedException);
  });

  it('throws when key has wrong prefix', async () => {
    const guard = new ApiKeyGuard(mockPrisma(null) as never);
    await expect(
      guard.canActivate(makeContext({ 'x-api-key': 'sk-badprefix' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws when key hash is not found in DB', async () => {
    const guard = new ApiKeyGuard(mockPrisma(null) as never);
    await expect(
      guard.canActivate(makeContext({ 'x-api-key': 'cvf_aabbccdd' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws when key is inactive', async () => {
    const guard = new ApiKeyGuard(mockPrisma({ id: '1', active: false }) as never);
    await expect(
      guard.canActivate(makeContext({ 'x-api-key': 'cvf_aabbccdd' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('returns true and sets apiKeyId on valid key', async () => {
    const raw = 'deadbeef';
    const keyHash = createHash('sha256').update(raw).digest('hex');
    const prisma = mockPrisma({ id: 'key-1', active: true, keyHash });
    const guard = new ApiKeyGuard(prisma as never);
    const req: Record<string, unknown> = { headers: { 'x-api-key': `cvf_${raw}` } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(req['apiKeyId']).toBe('key-1');
    expect(prisma.apiKey.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'key-1' } }),
    );
  });
});
