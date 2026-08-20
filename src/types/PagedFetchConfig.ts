import type { FetchContext } from './FetchContext.js';
import type { PagedParams } from './PagedParams.js';
import type { PagedResponse } from './PagedResponse.js';
import type { PaginationOptions } from './PaginationOptions.js';
import type { StreamConfig } from './StreamConfig.js';

export type PagedFetchConfig<TItem, TOut = TItem> = PaginationOptions<
  PagedResponse<TItem>,
  TItem,
  TOut
> & {
  fetcher: (params: PagedParams, context: FetchContext) => Promise<PagedResponse<TItem>>;
  /** Items per page. Defaults to 100. */
  limit?: number;
};

export type PagedStreamConfig<TItem, TOut = TItem> = StreamConfig<PagedFetchConfig<TItem, TOut>>;
