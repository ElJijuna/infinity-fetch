import { infinityFetch } from './infinityFetch.js';
import type {
  InfinityFetchResult,
  PagedFetchConfig,
  PagedParams,
  PagedResponse,
} from './types/index.js';

/**
 * Convenience wrapper for offset-based paginated APIs.
 * Auto-iterates using `isLastPage` and `nextPageStart` from the response.
 *
 * @example
 * const result = await pagedFetch({
 *   fetcher: (params) => api.items(params),
 *   limit: 100,
 * });
 */
export function pagedFetch<TItem>(
  config: PagedFetchConfig<TItem>,
): Promise<InfinityFetchResult<TItem>> {
  return infinityFetch<PagedResponse<TItem>, PagedParams, TItem>({
    fetcher: config.fetcher,
    initialParams: { start: 0, limit: config.limit ?? 100 },
    isLastPage: (response) => response.isLastPage,
    getNextParams: (response, currentParams) => {
      if (response.nextPageStart === undefined) {
        throw new Error('Missing nextPageStart in non-final paged response');
      }

      return {
        start: response.nextPageStart,
        limit: currentParams.limit,
      };
    },
    getItems: (response) => response.values,
    onStart: config.onStart,
    onEnd: config.onEnd,
    onPage: config.onPage,
    maxPages: config.maxPages,
    delay: config.delay,
    retry: config.retry,
    signal: config.signal,
  });
}
