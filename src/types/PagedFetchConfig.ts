import type { FetchContext } from './FetchContext.js';
import type { PagedParams } from './PagedParams.js';
import type { PagedResponse } from './PagedResponse.js';
import type { PaginationOptions } from './PaginationOptions.js';

export type PagedFetchConfig<TItem> = PaginationOptions<PagedResponse<TItem>, TItem> & {
  fetcher: (params: PagedParams, context: FetchContext) => Promise<PagedResponse<TItem>>;
  /** Items per page. Defaults to 100. */
  limit?: number;
};
