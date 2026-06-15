import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;

  getClient(): Redis {
    if (!this.client) {
      const url = process.env.REDIS_URL || 'redis://localhost:6379';
      this.client = new Redis(url, { maxRetriesPerRequest: 3 });
    }
    return this.client;
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }
}
