import type { FetchContext } from './FetchContext.js';
import type { PageParams } from './PageParams.js';
import type { PaginationOptions } from './PaginationOptions.js';
import type { StreamConfig } from './StreamConfig.js';

export type PageFetchConfig<TResponse, TItem, TOut = TItem> = PaginationOptions<
  TResponse,
  TItem,
  TOut
> & {
  fetcher: (params: PageParams, context: FetchContext) => Promise<TResponse>;
  /** Extracts items from a single page response. May be async */
  getItems: (response: TResponse) => TItem[] | Promise<TItem[]>;
  /** First page number. Defaults to 1 */
  startPage?: number;
  /** Items per page. Defaults to 100 */
  perPage?: number;
  /** Optional: total number of pages, read from the response. Stops once it is reached */
  getTotalPages?: (response: TResponse) => number | null | undefined;
  /**
   * Optional: custom last-page check.
   * Defaults to "the page returned fewer items than `perPage`".
   */
  isLastPage?: (response: TResponse, items: TItem[], page: number) => boolean;
};

export type PageStreamConfig<TResponse, TItem, TOut = TItem> = StreamConfig<
  PageFetchConfig<TResponse, TItem, TOut>
>;
