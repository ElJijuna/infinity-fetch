export type InfinityFetchResult<TItem> = {
  /** All items collected across every page */
  items: TItem[];
  /** Number of pages fetched */
  pages: number;
  /** Present and true when the fetch was stopped early via AbortSignal */
  aborted?: true;
};

export class InfinityFetchError<TParams, TItem> extends Error {
  readonly pageIndex: number;
  readonly params: TParams;
  readonly itemsSoFar: TItem[];
  readonly cause: unknown;

  constructor(pageIndex: number, params: TParams, itemsSoFar: TItem[], cause: unknown) {
    super(
      `infinity-fetch failed on page ${pageIndex}: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    this.name = 'InfinityFetchError';
    this.cause = cause;
    this.pageIndex = pageIndex;
    this.params = params;
    this.itemsSoFar = itemsSoFar;
  }
}

export type InfinityFetchRetryConfig = {
  /** Optional: maximum retry attempts per page */
  maxRetries?: number;
  /** Optional: milliseconds to wait before each retry */
  delay?: number | ((attempt: number, error: unknown) => number);
  /** Optional: returns true when a failed fetch should be retried */
  retryWhen?: (error: unknown, attempt: number) => boolean | Promise<boolean>;
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
  /** Optional: milliseconds to wait between each page fetch */
  delay?: number;
  /** Optional: retry failed page fetches */
  retry?: InfinityFetchRetryConfig;
  /** Optional: signal to abort pagination early and return partial results */
  signal?: AbortSignal;
};

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithRetry<TResponse, TParams extends object>(
  fetcher: (params: TParams) => Promise<TResponse>,
  params: TParams,
  retry: InfinityFetchRetryConfig | undefined,
): Promise<TResponse> {
  const maxRetries = retry?.maxRetries ?? 0;

  let attempt = 0;

  while (true) {
    try {
      return await fetcher(params);
    } catch (error) {
      attempt++;

      if (attempt > maxRetries) {
        throw error;
      }

      const shouldRetry = retry?.retryWhen ? await retry.retryWhen(error, attempt) : true;

      if (!shouldRetry) {
        throw error;
      }

      const retryDelay =
        typeof retry?.delay === 'function' ? retry.delay(attempt, error) : retry?.delay;

      if (retryDelay) {
        await wait(retryDelay);
      }
    }
  }
}

export async function infinityFetch<TResponse, TParams extends object, TItem>(
  config: InfinityFetchConfig<TResponse, TParams, TItem>,
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
    delay,
    retry,
    signal,
  } = config;

  onStart?.();

  const items: TItem[] = [];

  let params = initialParams;
  let pageIndex = 0;

  while (pageIndex < maxPages) {
    if (signal?.aborted) {
      const result: InfinityFetchResult<TItem> = { items, pages: pageIndex, aborted: true };

      onEnd?.(result);

      return result;
    }

    try {
      const response = await fetchWithRetry(fetcher, params, retry);
      const pageItems = getItems(response);

      items.push(...pageItems);
      onPage?.(pageItems, response, pageIndex);

      pageIndex++;

      if (isLastPage(response)) {
        break;
      }

      params = getNextParams(response, params);

      if (delay) {
        await wait(delay);
      }
    } catch (error) {
      if (signal?.aborted) {
        const result: InfinityFetchResult<TItem> = { items, pages: pageIndex, aborted: true };

        onEnd?.(result);

        return result;
      }

      if (error instanceof InfinityFetchError) {
        throw error;
      }

      throw new InfinityFetchError(pageIndex, params, [...items], error);
    }
  }

  const result = { items, pages: pageIndex };

  onEnd?.(result);

  return result;
}
