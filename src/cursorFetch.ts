import { infinityFetch } from './infinityFetch.js';
import type { CursorFetchConfig, CursorParams, InfinityFetchResult } from './types/index.js';

/**
 * Convenience wrapper for cursor-based paginated APIs.
 * Auto-iterates using the cursor returned by `getCursor`. Stops when `getCursor` returns null or undefined.
 *
 * @example
 * const result = await cursorFetch({
 *   fetcher: ({ cursor }) => api.items({ cursor, perPage: 50 }),
 *   getCursor: (r) => r.nextCursor ?? null,
 *   getItems: (r) => r.data,
 * });
 */
export function cursorFetch<TResponse, TItem>(
  config: CursorFetchConfig<TResponse, TItem>,
): Promise<InfinityFetchResult<TItem>> {
  return infinityFetch<TResponse, CursorParams, TItem>({
    fetcher: config.fetcher,
    initialParams: { cursor: null },
    isLastPage: (response) => {
      const cursor = config.getCursor(response);

      return cursor === null || cursor === undefined;
    },
    getNextParams: (response) => ({ cursor: config.getCursor(response) as string }),
    getItems: config.getItems,
    onStart: config.onStart,
    onEnd: config.onEnd,
    onPage: config.onPage,
    maxPages: config.maxPages,
    delay: config.delay,
    retry: config.retry,
    signal: config.signal,
  });
}
