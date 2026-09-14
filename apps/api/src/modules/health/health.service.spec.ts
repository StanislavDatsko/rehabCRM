import { describe, expect, it } from 'vitest';
import { HealthService } from './health.service';
import type { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { RedisService } from '../../infrastructure/redis/redis.service';
import type { StorageService } from '../../infrastructure/storage/storage.service';

describe('HealthService', () => {
  it('reports liveness without touching infrastructure', () => {
    const service = new HealthService(
      {} as PrismaService,
      {} as RedisService,
      {} as StorageService,
    );
    expect(service.live()).toEqual({ status: 'ok', service: 'rehabcrm-api' });
  });

  it('reports degraded when an optional dependency is down', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(null, { status: 200 });
    const service = new HealthService(
      { isReachable: async () => true } as PrismaService,
      { isReachable: async () => false } as RedisService,
      { isReachable: async () => true } as StorageService,
    );
    const ready = await service.ready();
    expect(ready.status).toBe('degraded');
    expect(ready.checks.redis).toBe('down');
    globalThis.fetch = originalFetch;
  });

  it('reports down when PostgreSQL is unavailable', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(null, { status: 200 });
    const service = new HealthService(
      { isReachable: async () => false } as PrismaService,
      { isReachable: async () => true } as RedisService,
      { isReachable: async () => true } as StorageService,
    );
    expect((await service.ready()).status).toBe('down');
    globalThis.fetch = originalFetch;
  });

  it('bounds a hung dependency probe', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(null, { status: 200 });
    const service = new HealthService(
      { isReachable: async () => true } as PrismaService,
      { isReachable: () => new Promise<boolean>(() => {}) } as RedisService,
      { isReachable: async () => true } as StorageService,
    );
    const startedAt = Date.now();
    const ready = await service.ready();
    expect(ready.checks.redis).toBe('down');
    expect(Date.now() - startedAt).toBeLessThan(2_500);
    globalThis.fetch = originalFetch;
  });
});
