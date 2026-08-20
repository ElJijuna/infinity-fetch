import type { CursorParams } from './CursorParams.js';
import type { FetchContext } from './FetchContext.js';
import type { PaginationOptions } from './PaginationOptions.js';

export type CursorFetchConfig<TResponse, TItem> = PaginationOptions<TResponse, TItem> & {
  fetcher: (params: CursorParams, context: FetchContext) => Promise<TResponse>;
  /** Returns the cursor for the next page, or null/undefined when there are no more pages */
  getCursor: (response: TResponse) => string | null | undefined;
  /** Extracts items from a single page response */
  getItems: (response: TResponse) => TItem[];
};
