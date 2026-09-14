import { Injectable } from '@nestjs/common';
import type {
  HealthInfoResponse,
  HealthLiveResponse,
  HealthReadyResponse,
  HealthStatus,
} from '@repo/contracts';
import { parseApiEnv } from '@repo/config/api-env';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { StorageService } from '../../infrastructure/storage/storage.service';

@Injectable()
export class HealthService {
  private readonly env = parseApiEnv();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
  ) {}

  live(): HealthLiveResponse {
    return { status: 'ok', service: 'rehabcrm-api' };
  }

  async ready(): Promise<HealthReadyResponse> {
    const [databaseReachable, redisReachable, storageReachable, identityReachable] =
      await Promise.all([
        this.prisma.isReachable(),
        this.redis.isReachable(),
        this.storage.isReachable(),
        this.identityReachable(),
      ]);
    const database: HealthStatus = databaseReachable ? 'ok' : 'down';
    const redis: HealthStatus = redisReachable ? 'ok' : 'down';
    const identityProvider: HealthStatus = identityReachable ? 'ok' : 'down';
    const objectStorage: HealthStatus = storageReachable ? 'ok' : 'down';
    const status: HealthStatus =
      database === 'down'
        ? 'down'
        : [redis, identityProvider, objectStorage].every((value) => value === 'ok')
          ? 'ok'
          : 'degraded';
    return {
      status,
      service: 'rehabcrm-api',
      checks: { database, redis, identityProvider, objectStorage },
    };
  }

  info(): HealthInfoResponse {
    return {
      service: 'rehabcrm-api',
      version: this.env.APP_VERSION,
      commitSha: this.env.APP_COMMIT_SHA,
      schemaVersion: this.env.DATABASE_SCHEMA_VERSION,
      deploymentEnvironment: this.env.DEPLOYMENT_ENV,
    };
  }

  private async identityReachable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.env.OIDC_ISSUER}/.well-known/openid-configuration`, {
        signal: AbortSignal.timeout(3_000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
