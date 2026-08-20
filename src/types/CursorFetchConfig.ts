import type { CursorParams } from './CursorParams.js';
import type { FetchContext } from './FetchContext.js';
import type { PaginationOptions } from './PaginationOptions.js';
import type { StreamConfig } from './StreamConfig.js';

export type CursorFetchConfig<TResponse, TItem, TOut = TItem> = PaginationOptions<
  TResponse,
  TItem,
  TOut
> & {
  fetcher: (params: CursorParams, context: FetchContext) => Promise<TResponse>;
  /** Returns the cursor for the next page, or null/undefined when there are no more pages */
  getCursor: (response: TResponse) => string | null | undefined;
  /** Extracts items from a single page response. May be async */
  getItems: (response: TResponse) => TItem[] | Promise<TItem[]>;
};

export type CursorStreamConfig<TResponse, TItem, TOut = TItem> = StreamConfig<
  CursorFetchConfig<TResponse, TItem, TOut>
>;
