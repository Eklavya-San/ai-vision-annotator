import { Controller, Get, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { PrismaService } from './database/prisma.service';

@Controller('health')
export class HealthController implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.redis = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  @Get()
  health() {
    return {
      status: 'ok',
      service: 'ai-vision-annotator-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async readiness() {
    const checks: Record<string, string> = {};

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    try {
      await this.pingRedis();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
      // Leave the connection in a restartable state for the next probe.
      if (this.redis.status !== 'end') await this.redis.quit().catch(() => undefined);
    }

    const ready = Object.values(checks).every((status) => status === 'ok');
    const body = {
      status: ready ? 'ok' : 'degraded',
      ready,
      checks,
      timestamp: new Date().toISOString(),
    };
    if (!ready) throw new ServiceUnavailableException(body);
    return body;
  }

  /** Ping Redis, reconnecting after a previous quit(). */
  private async pingRedis(): Promise<void> {
    if (this.redis.status === 'end' || this.redis.status === 'close') {
      await this.redis.connect();
    }
    await this.redis.ping();
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }
}
