import { InfinityFetchError } from './InfinityFetchError.js';
import type {
  InfinityFetchConfig,
  InfinityFetchResult,
  InfinityFetchRetryConfig,
} from './types/index.js';
import { wait } from './utils/wait.js';

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
