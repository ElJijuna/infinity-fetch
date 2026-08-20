import type { InfinityFetchResult } from './InfinityFetchResult.js';
import type { InfinityFetchRetryConfig } from './InfinityFetchRetryConfig.js';

/**
 * Options shared by every helper: lifecycle callbacks, pacing, retries and cancellation.
 *
 * Callbacks are typed `=> unknown` rather than `=> void | Promise<void>`: a union return
 * type would reject any callback that happens to return a value. They are awaited.
 */
export type PaginationOptions<TResponse, TItem> = {
  /** Optional: called once before the first fetch starts */
  onStart?: () => unknown;
  /** Optional: called once after all pages have been fetched */
  onEnd?: (result: InfinityFetchResult<TItem>) => unknown;
  /** Optional: called after each page is fetched. Awaited, so it can apply backpressure */
  onPage?: (items: TItem[], response: TResponse, pageIndex: number) => unknown;
  /** Optional: maximum number of pages to fetch (safety limit) */
  maxPages?: number;
  /** Optional: milliseconds to wait between each page fetch */
  delay?: number;
  /** Optional: retry failed page fetches */
  retry?: InfinityFetchRetryConfig;
  /** Optional: signal to abort pagination early and return partial results */
  signal?: AbortSignal;
};
