import type { InfinityFetchResult } from './InfinityFetchResult.js';
import type { InfinityFetchRetryConfig } from './InfinityFetchRetryConfig.js';

export type InfinityFetchConfig<TResponse, TParams extends object, TItem> = {
  /** The function that fetches a single page */
  fetcher: (params: TParams) => Promise<TResponse>;
  /** Initial parameters for the first request */
  initialParams: TParams;
  /** Returns true when no more pages should be fetched */
  isLastPage: (response: TResponse) => boolean;
  /** Returns the params for the next page request */
  getNextParams: (response: TResponse, currentParams: TParams) => TParams;
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
