import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './database/prisma.service';
import { HealthController } from './health.controller';

const mockRedis = {
  status: 'ready',
  connect: jest.fn().mockResolvedValue(undefined),
  ping: jest.fn().mockResolvedValue('PONG'),
  quit: jest.fn().mockResolvedValue(undefined),
};

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockRedis),
  // Controller uses a named import (`import { Redis } from 'ioredis'`), which
  // compiles to a property access under module:commonjs — provide it too.
  Redis: jest.fn().mockImplementation(() => mockRedis),
}));

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = { $queryRaw: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { getOrThrow: () => 'redis://localhost:6379' } },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('returns ok when all checks pass', async () => {
    const result = await controller.readiness();
    expect(result.ready).toBe(true);
    expect(result.checks).toEqual({ database: 'ok', redis: 'ok' });
  });

  it('throws 503 with the check report when the database is down', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('boom'));
    await expect(controller.readiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('throws 503 when redis is down', async () => {
    mockRedis.ping.mockRejectedValueOnce(new Error('boom'));
    await expect(controller.readiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('reconnects redis after a quit', async () => {
    mockRedis.status = 'end';
    await controller.readiness();
    expect(mockRedis.connect).toHaveBeenCalled();
    mockRedis.status = 'ready';
  });
});
