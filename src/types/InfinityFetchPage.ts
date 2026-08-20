/** A single page yielded by the streaming helpers */
export type InfinityFetchPage<TResponse, TItem> = {
  /** Items of this page, after `mapItem`, `filterItem` and `dedupeBy` have been applied */
  items: TItem[];
  /** The raw response returned by the fetcher */
  response: TResponse;
  /** Zero-based index of this page */
  pageIndex: number;
};
