import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  meta?: any;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data is already structured with success or meta, pass through
        if (data && typeof data === 'object' && 'meta' in data && 'data' in data) {
          return {
            success: true,
            data: data.data,
            meta: data.meta,
          };
        }
        return {
          success: true,
          data,
        };
      }),
    );
  }
}
