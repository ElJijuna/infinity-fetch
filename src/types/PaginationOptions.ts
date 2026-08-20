import type { InfinityFetchResult } from './InfinityFetchResult.js';
import type { InfinityFetchRetryConfig } from './InfinityFetchRetryConfig.js';

/**
 * Options shared by every helper: lifecycle callbacks, stop conditions,
 * per-item transforms, pacing, retries and cancellation.
 *
 * `TItem` is what `getItems` returns; `TOut` is what ends up in the result,
 * which differs only when `mapItem` is provided.
 */
export type PaginationOptions<TResponse, TItem, TOut = TItem> = {
  /** Optional: called once before the first fetch starts */
  onStart?: () => unknown;
  /** Optional: called once after all pages have been fetched */
  onEnd?: (result: InfinityFetchResult<TOut>) => unknown;
  /** Optional: called after each page is fetched. Awaited, so it can apply backpressure */
  onPage?: (items: TOut[], response: TResponse, pageIndex: number) => unknown;
  /** Optional: maximum number of pages to fetch (safety limit) */
  maxPages?: number;
  /** Optional: stop once this many items have been collected. The last page is truncated */
  maxItems?: number;
  /** Optional: return true to stop after the current page (checked after `isLastPage`) */
  stopWhen?: (items: TOut[], response: TResponse, pageIndex: number) => boolean;
  /** Optional: transform each item. `index` is its zero-based position across all pages */
  mapItem?: (item: TItem, index: number) => TOut;
  /** Optional: keep only the items for which this returns true */
  filterItem?: (item: TOut, index: number) => boolean;
  /** Optional: drop items whose key was already seen on this or a previous page */
  dedupeBy?: (item: TOut) => unknown;
  /** Optional: milliseconds to wait between each page fetch */
  delay?: number;
  /** Optional: retry failed page fetches */
  retry?: InfinityFetchRetryConfig;
  /** Optional: signal to abort pagination early and return partial results */
  signal?: AbortSignal;
};
