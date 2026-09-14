import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { parseApiEnv } from '@repo/config/api-env';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    const env = parseApiEnv();
    this.client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }

  async isReachable(): Promise<boolean> {
    try {
      if (this.client.status === 'wait') {
        await this.client.connect();
      }
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}
