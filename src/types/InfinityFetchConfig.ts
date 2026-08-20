import type { FetchContext } from './FetchContext.js';
import type { PaginationOptions } from './PaginationOptions.js';
import type { StreamConfig } from './StreamConfig.js';

export type InfinityFetchConfig<TResponse, TParams extends object, TItem> = PaginationOptions<
  TResponse,
  TItem
> & {
  /** The function that fetches a single page */
  fetcher: (params: TParams, context: FetchContext) => Promise<TResponse>;
  /** Initial parameters for the first request */
  initialParams: TParams;
  /** Returns true when no more pages should be fetched */
  isLastPage: (response: TResponse) => boolean;
  /** Returns the params for the next page request */
  getNextParams: (response: TResponse, currentParams: TParams) => TParams;
  /** Extracts items from a single page response */
  getItems: (response: TResponse) => TItem[];
};

export type InfinityFetchStreamConfig<TResponse, TParams extends object, TItem> = StreamConfig<
  InfinityFetchConfig<TResponse, TParams, TItem>
>;
