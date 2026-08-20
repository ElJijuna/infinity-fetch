import { infinityFetch } from './infinityFetch.js';
import { infinityFetchStream } from './infinityFetchStream.js';
import type {
  InfinityFetchConfig,
  InfinityFetchPage,
  InfinityFetchResult,
  PagedFetchConfig,
  PagedParams,
  PagedResponse,
  PagedStreamConfig,
} from './types/index.js';

function toCoreConfig<TItem>(
  config: Omit<PagedFetchConfig<TItem>, 'onEnd'>,
): Omit<InfinityFetchConfig<PagedResponse<TItem>, PagedParams, TItem>, 'onEnd'> {
  const { limit = 100, ...options } = config;

  return {
    ...options,
    initialParams: { start: 0, limit },
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
  };
}

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
  return infinityFetch({ ...toCoreConfig(config), onEnd: config.onEnd });
}

/**
 * Streaming counterpart of {@link pagedFetch}: yields one page at a time.
 *
 * @example
 * for await (const { items } of pagedStream({ fetcher: (params) => api.items(params) })) {
 *   await handle(items);
 * }
 */
export function pagedStream<TItem>(
  config: PagedStreamConfig<TItem>,
): AsyncGenerator<InfinityFetchPage<PagedResponse<TItem>, TItem>, void, void> {
  return infinityFetchStream({ ...toCoreConfig(config), onEnd: config.onEnd });
}
