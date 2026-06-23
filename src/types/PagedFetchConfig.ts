import type { InfinityFetchResult } from './InfinityFetchResult.js';
import type { InfinityFetchRetryConfig } from './InfinityFetchRetryConfig.js';
import type { PagedParams } from './PagedParams.js';
import type { PagedResponse } from './PagedResponse.js';

export type PagedFetchConfig<TItem> = {
  fetcher: (params: PagedParams) => Promise<PagedResponse<TItem>>;
  /** Items per page. Defaults to 100. */
  limit?: number;
  /** Optional: called once before the first fetch starts */
  onStart?: () => void;
  /** Optional: called once after all pages have been fetched */
  onEnd?: (result: InfinityFetchResult<TItem>) => void;
  /** Called after each page is fetched */
  onPage?: (items: TItem[], response: PagedResponse<TItem>, pageIndex: number) => void;
  /** Maximum number of pages to fetch (safety limit) */
  maxPages?: number;
  /** Optional: milliseconds to wait between each page fetch */
  delay?: number;
  /** Optional: retry failed page fetches */
  retry?: InfinityFetchRetryConfig;
  /** Optional: signal to abort pagination early and return partial results */
  signal?: AbortSignal;
};
