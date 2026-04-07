export type InfinityFetchResult<TItem> = {
  /** All items collected across every page */
  items: TItem[];
  /** Number of pages fetched */
  pages: number;
};

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
};

export async function infinityFetch<TResponse, TParams extends object, TItem>(
  config: InfinityFetchConfig<TResponse, TParams, TItem>
): Promise<InfinityFetchResult<TItem>> {
  const {
    fetcher,
    initialParams,
    isLastPage,
    getNextParams,
    getItems,
    onStart,
    onEnd,
    onPage,
    maxPages = Infinity,
  } = config;

  onStart?.();

  const items: TItem[] = [];
  let params = initialParams;
  let pageIndex = 0;

  while (pageIndex < maxPages) {
    const response = await fetcher(params);
    const pageItems = getItems(response);
    items.push(...pageItems);
    onPage?.(pageItems, response, pageIndex);

    pageIndex++;

    if (isLastPage(response)) break;

    params = getNextParams(response, params);
  }

  const result = { items, pages: pageIndex };
  onEnd?.(result);
  return result;
}
