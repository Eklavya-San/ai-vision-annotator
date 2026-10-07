import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Controller('health')
export class HealthController {
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
      await this.redis.connect();
      await this.redis.ping();
      checks.redis = 'ok';
      await this.redis.quit();
    } catch {
      checks.redis = 'error';
    }

    const ready = Object.values(checks).every((status) => status === 'ok');
    return {
      status: ready ? 'ok' : 'degraded',
      ready,
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
