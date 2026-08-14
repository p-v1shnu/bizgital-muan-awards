import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * Wraps handler output as { data, meta }.
 * A handler that already returns a `data` key — paginated lists build their own
 * `meta` — passes through untouched so it keeps control of the envelope.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((payload) => {
        if (payload && typeof payload === 'object' && 'data' in payload) return payload;
        return { data: payload };
      }),
    );
  }
}
