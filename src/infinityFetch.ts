import { PageFailure } from './core/PageFailure.js';
import { paginate } from './core/paginate.js';
import { InfinityFetchError } from './InfinityFetchError.js';
import type { InfinityFetchConfig, InfinityFetchResult } from './types/index.js';

/**
 * Fetches every page of a paginated API and returns all items at once.
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
export async function infinityFetch<TResponse, TParams extends object, TItem>(
  config: InfinityFetchConfig<TResponse, TParams, TItem>,
): Promise<InfinityFetchResult<TItem>> {
  const items: TItem[] = [];
  const iterator = paginate<TResponse, TParams, TItem>(config)[Symbol.asyncIterator]();

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
      for (const item of (error.committedItems ?? []) as TItem[]) {
        items.push(item);
      }

      throw new InfinityFetchError(error.pageIndex, error.params as TParams, items, error.reason);
    }

    throw error;
  }

  const result: InfinityFetchResult<TItem> = aborted
    ? { items, pages, aborted: true }
    : { items, pages };

  await config.onEnd?.(result);

  return result;
}
