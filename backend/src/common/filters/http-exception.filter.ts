import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

import { recordServerError } from '../server-errors';

/**
 * Every "is this slug free?" in the codebase is a read followed by a write, and
 * two people saving the same new name in the same second both pass the read.
 * The database still refuses the second — that is what the unique index is for
 * — but it arrived here as an unhandled error and went out as a 500 with a
 * stack trace, for something the person could have fixed by picking another
 * name. Translating the database's own answers once, here, covers every one of
 * those places at the same time.
 */
function fromPrisma(exception: unknown) {
  if (!(exception instanceof Prisma.PrismaClientKnownRequestError)) return undefined;

  const target = exception.meta?.target;
  const field = Array.isArray(target) ? target.join(', ') : String(target ?? 'value');

  switch (exception.code) {
    case 'P2002':
      return { status: HttpStatus.CONFLICT, message: `That ${field} is already taken`, error: 'Conflict' };
    case 'P2025':
      return { status: HttpStatus.NOT_FOUND, message: 'Record not found', error: 'Not Found' };
    case 'P2003':
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'That record is still referenced by something else',
        error: 'Bad Request',
      };
    default:
      return undefined;
  }
}

/** Every error leaves the API in one shape: { statusCode, message, error, details? } */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Express middleware throws plain errors carrying a status — an oversized
    // body is the one that reaches here in practice. Answering 500 to it told
    // the sender to retry a request that will never fit, and logged a stack
    // trace for something that is not a fault in the server.
    const middlewareStatus =
      typeof (exception as { status?: unknown })?.status === 'number'
        ? ((exception as { status: number }).status)
        : undefined;

    const prisma = fromPrisma(exception);

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : (prisma?.status ?? middlewareStatus ?? HttpStatus.INTERNAL_SERVER_ERROR);

    let message = 'Internal server error';
    let error = 'InternalServerError';
    let details: unknown;

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        // Nest's own exceptions answer with an object carrying its own `error`;
        // ones built from a bare string do not, and every one of those was going
        // out labelled InternalServerError. A rate-limited visitor was told 429
        // and "InternalServerError" in the same breath, which sends whoever
        // reads it looking for a fault in the server.
        error = HttpStatus[status] ?? 'Error';
      } else {
        const asRecord = body as Record<string, unknown>;
        // class-validator returns message as string[]; keep it under details
        // so the shape of `message` stays predictable for clients.
        if (Array.isArray(asRecord.message)) {
          message = 'Validation failed';
          details = asRecord.message;
        } else {
          message = String(asRecord.message ?? message);
        }
        error = String(asRecord.error ?? exception.name);
      }
    } else if (prisma) {
      message = prisma.message;
      error = prisma.error;
    } else if (middlewareStatus !== undefined) {
      message =
        middlewareStatus === HttpStatus.PAYLOAD_TOO_LARGE
          ? 'That request body is too large.'
          : String((exception as { message?: unknown }).message ?? message);
      error = HttpStatus[middlewareStatus] ?? 'Error';
    } else {
      this.logger.error(
        `Unhandled ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // Counted here because every 5xx the API sends passes through this filter,
    // including the ones nothing in the code meant to send. What reads the count
    // is /health/errors, which is what an outside watcher can see (monitoring.md
    // §6): a site that answers every page while every save fails looks healthy
    // from the outside otherwise.
    //
    // The probes are left out of their own measurement, and that is not tidiness:
    // /health/errors answers 503 once the count passes the threshold, so counting
    // that would make every check add one and hold the alarm open by itself. The
    // same goes for /health/storage, whose 503 means images are gone — watched on
    // purpose as a thing that can wait until morning (monitoring.md §10), and it
    // must not set off the alarm that wakes someone.
    const isProbe = /\/health(\/|$)/.test(request.path);
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR && !isProbe) recordServerError();

    response.status(status).json({ statusCode: status, message, error, details });
  }
}
