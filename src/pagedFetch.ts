import { infinityFetch, InfinityFetchResult } from './infinityFetch.js';

/** Common shape for Bitbucket-style paginated APIs */
export type PagedResponse<TItem> = {
  values: TItem[];
  isLastPage: boolean;
  nextPageStart?: number;
  size: number;
  limit: number;
  start: number;
};

export type PagedParams = {
  start: number;
  limit: number;
};

export type PagedFetchConfig<TItem> = {
  fetcher: (params: PagedParams) => Promise<PagedResponse<TItem>>;
  /** Items per page. Defaults to 100. */
  limit?: number;
  /** Called after each page is fetched */
  onPage?: (items: TItem[], response: PagedResponse<TItem>, pageIndex: number) => void;
  /** Maximum number of pages to fetch (safety limit) */
  maxPages?: number;
};

/**
 * Convenience wrapper for Bitbucket-style paginated APIs.
 * Auto-iterates using `isLastPage` and `nextPageStart` from the response.
 *
 * @example
 * const commits = await pagedFetch({
 *   fetcher: (params) => api.project('my-project').repo('my-repo').commits(params),
 *   limit: 100,
 * });
 */
export function pagedFetch<TItem>(config: PagedFetchConfig<TItem>): Promise<InfinityFetchResult<TItem>> {
  return infinityFetch<PagedResponse<TItem>, PagedParams, TItem>({
    fetcher: config.fetcher,
    initialParams: { start: 0, limit: config.limit ?? 100 },
    isLastPage: (response) => response.isLastPage,
    getNextParams: (response, currentParams) => ({
      start: response.nextPageStart ?? 0,
      limit: currentParams.limit,
    }),
    getItems: (response) => response.values,
    onPage: config.onPage,
    maxPages: config.maxPages,
  });
}
