import { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

function makeHost(res: { status: jest.Mock; json: jest.Mock }): ArgumentsHost {
  return {
    switchToHttp: () => ({ getResponse: () => res }),
  } as unknown as ArgumentsHost;
}

describe('PrismaExceptionFilter', () => {
  let res: { status: jest.Mock; json: jest.Mock };
  let filter: PrismaExceptionFilter;

  beforeEach(() => {
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    filter = new PrismaExceptionFilter();
  });

  it.each([
    ['P2025', 404],
    ['P2002', 409],
    ['P2003', 400],
  ])('maps %s to %i', (code, status) => {
    const err = new Prisma.PrismaClientKnownRequestError('msg', {
      code,
      clientVersion: '6',
    });
    filter.catch(err, makeHost(res));
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: status }));
  });

  it('maps unknown prisma codes to 500', () => {
    const err = new Prisma.PrismaClientKnownRequestError('msg', {
      code: 'P9999',
      clientVersion: '6',
    });
    filter.catch(err, makeHost(res));
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
