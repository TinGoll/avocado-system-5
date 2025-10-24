import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

type MaybeArray<T> = T | T[];
type ListResponse<T, M = undefined> = M extends undefined
  ? { items: T[] }
  : { items: T[]; meta: M };

@Injectable()
export class WrapItemsInterceptor<T>
  implements NestInterceptor<MaybeArray<T>, ListResponse<T> | T>
{
  intercept(
    _: ExecutionContext,
    next: CallHandler<MaybeArray<T>>,
  ): Observable<ListResponse<T> | T> {
    return next.handle().pipe(
      map((data) => {
        if (Array.isArray(data)) {
          return { items: data, meta: { count: data.length } };
        }

        if (data && typeof data === 'object' && 'items' in data) {
          return data as ListResponse<T>;
        }

        return data;
      }),
    );
  }
}
