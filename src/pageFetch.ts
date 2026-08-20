import { infinityFetch } from './infinityFetch.js';
import { infinityFetchStream } from './infinityFetchStream.js';
import type {
  InfinityFetchConfig,
  InfinityFetchPage,
  InfinityFetchResult,
  PageFetchConfig,
  PageParams,
  PageStreamConfig,
} from './types/index.js';

function toCoreConfig<TResponse, TItem>(
  config: Omit<PageFetchConfig<TResponse, TItem>, 'onEnd'>,
): Omit<InfinityFetchConfig<TResponse, PageParams, TItem>, 'onEnd'> {
  const { getItems, getTotalPages, isLastPage, startPage = 1, perPage = 100, ...options } = config;

  let currentPage = startPage;
  let lastItems: TItem[] = [];
  let totalPages: number | null | undefined;

  return {
    ...options,
    initialParams: { page: startPage, perPage },
    getItems: async (response) => {
      lastItems = await getItems(response);
      totalPages = getTotalPages?.(response);

      return lastItems;
    },
    isLastPage: (response) => {
      if (isLastPage) {
        return isLastPage(response, lastItems, currentPage);
      }

      if (typeof totalPages === 'number') {
        return currentPage >= startPage + totalPages - 1;
      }

      return lastItems.length < perPage;
    },
    getNextParams: (_response, currentParams) => {
      currentPage = currentParams.page + 1;

      return { page: currentPage, perPage: currentParams.perPage };
    },
  };
}

/**
 * Convenience wrapper for page-number APIs (`?page=1&per_page=50`).
 *
 * Stops when a page returns fewer items than `perPage`, or when `getTotalPages`
 * is reached, or when a custom `isLastPage` returns true.
 *
 * @example
 * const { items } = await pageFetch({
 *   fetcher: ({ page, perPage }) => api.list(`?page=${page}&per_page=${perPage}`),
 *   getItems: (r) => r.results,
 *   perPage: 50,
 * });
 */
export function pageFetch<TResponse, TItem>(
  config: PageFetchConfig<TResponse, TItem>,
): Promise<InfinityFetchResult<TItem>> {
  return infinityFetch({ ...toCoreConfig(config), onEnd: config.onEnd });
}

/**
 * Streaming counterpart of {@link pageFetch}: yields one page at a time.
 *
 * @example
 * for await (const { items } of pageStream({
 *   fetcher: ({ page }) => api.list(page),
 *   getItems: (r) => r.results,
 * })) {
 *   await handle(items);
 * }
 */
export function pageStream<TResponse, TItem>(
  config: PageStreamConfig<TResponse, TItem>,
): AsyncGenerator<InfinityFetchPage<TResponse, TItem>, void, void> {
  return infinityFetchStream({ ...toCoreConfig(config), onEnd: config.onEnd });
}
