import type { CursorParams } from './CursorParams.js';
import type { InfinityFetchResult } from './InfinityFetchResult.js';
import type { InfinityFetchRetryConfig } from './InfinityFetchRetryConfig.js';

export type CursorFetchConfig<TResponse, TItem> = {
  fetcher: (params: CursorParams) => Promise<TResponse>;
  /** Returns the cursor for the next page, or null/undefined when there are no more pages */
  getCursor: (response: TResponse) => string | null | undefined;
  /** Extracts items from a single page response */
  getItems: (response: TResponse) => TItem[];
  /** Optional: called once before the first fetch starts */
  onStart?: () => void;
  /** Optional: called once after all pages have been fetched */
  onEnd?: (result: InfinityFetchResult<TItem>) => void;
  /** Optional: called after each page is fetched */
  onPage?: (items: TItem[], response: TResponse, pageIndex: number) => void;
  /** Optional: maximum number of pages to fetch (safety limit) */
  maxPages?: number;
  /** Optional: milliseconds to wait between each page fetch */
  delay?: number;
  /** Optional: retry failed page fetches */
  retry?: InfinityFetchRetryConfig;
  /** Optional: signal to abort pagination early and return partial results */
  signal?: AbortSignal;
};
