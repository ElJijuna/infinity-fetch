import type { FetchContext } from './FetchContext.js';
import type { LinkParams } from './LinkParams.js';
import type { PaginationOptions } from './PaginationOptions.js';
import type { StreamConfig } from './StreamConfig.js';

export type LinkFetchConfig<TResponse, TItem, TOut = TItem> = PaginationOptions<
  TResponse,
  TItem,
  TOut
> & {
  /** URL of the first page */
  url: string;
  fetcher: (params: LinkParams, context: FetchContext) => Promise<TResponse>;
  /** Extracts items from a single page response. May be async */
  getItems: (response: TResponse) => TItem[] | Promise<TItem[]>;
  /** Link relation to follow. Defaults to `'next'` */
  rel?: string;
  /**
   * Optional: returns the raw `Link` header value.
   * Defaults to `response.headers.get('link')`, which works with a `fetch` Response.
   */
  getLinkHeader?: (response: TResponse) => string | null | undefined;
};

export type LinkStreamConfig<TResponse, TItem, TOut = TItem> = StreamConfig<
  LinkFetchConfig<TResponse, TItem, TOut>
>;
