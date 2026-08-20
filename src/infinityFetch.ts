import { PageFailure } from './core/PageFailure.js';
import { paginate } from './core/paginate.js';
import { InfinityFetchError } from './InfinityFetchError.js';
import type { InfinityFetchConfig, InfinityFetchResult } from './types/index.js';

/**
 * Fetches every page of a paginated API and returns all items at once.
 *
 * Use {@link infinityFetchStream} instead when the dataset is too large to hold in memory.
 *
 * @example
 * const { items, pages } = await infinityFetch({
 *   fetcher: (params, { signal }) => api.list(params, { signal }),
 *   initialParams: { cursor: 0 },
 *   isLastPage: (r) => r.done,
 *   getNextParams: (r) => ({ cursor: r.next }),
 *   getItems: (r) => r.items,
 * });
 */
export async function infinityFetch<TResponse, TParams extends object, TItem, TOut = TItem>(
  config: InfinityFetchConfig<TResponse, TParams, TItem, TOut>,
): Promise<InfinityFetchResult<TOut>> {
  const items: TOut[] = [];
  const iterator = paginate<TResponse, TParams, TItem, TOut>(config)[Symbol.asyncIterator]();

  let pages = 0;
  let aborted = false;

  try {
    while (true) {
      const next = await iterator.next();

      if (next.done) {
        aborted = next.value;

        break;
      }

      for (const item of next.value.items) {
        items.push(item);
      }

      pages = next.value.pageIndex + 1;
    }
  } catch (error) {
    if (error instanceof PageFailure) {
      for (const item of (error.committedItems ?? []) as TOut[]) {
        items.push(item);
      }

      throw new InfinityFetchError(error.pageIndex, error.params as TParams, items, error.reason);
    }

    throw error;
  }

  const result: InfinityFetchResult<TOut> = aborted
    ? { items, pages, aborted: true }
    : { items, pages };

  await config.onEnd?.(result);

  return result;
}
