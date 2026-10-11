import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Maps Prisma errors to HTTP responses so services can use
 * findUniqueOrThrow/create without leaking 500s.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host
      .switchToHttp()
      .getResponse<{ status: (n: number) => { json: (b: unknown) => unknown } }>();
    const { status, body } = this.map(exception);
    if (status >= 500) this.logger.error(exception.message);
    res.status(status).json(body);
  }

  private map(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    body: Record<string, unknown>;
  } {
    switch (exception.code) {
      case 'P2025': // record not found (findUniqueOrThrow / update / delete)
        return { status: HttpStatus.NOT_FOUND, body: { statusCode: 404, message: 'Resource not found' } };
      case 'P2002': // unique constraint violation (e.g. duplicate image sha256)
        return { status: HttpStatus.CONFLICT, body: { statusCode: 409, message: 'Resource already exists' } };
      case 'P2003': // foreign key violation (e.g. nonexistent datasetId)
        return {
          status: HttpStatus.BAD_REQUEST,
          body: { statusCode: 400, message: 'Referenced resource does not exist' },
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          body: { statusCode: 500, message: 'Internal server error' },
        };
    }
  }
}
