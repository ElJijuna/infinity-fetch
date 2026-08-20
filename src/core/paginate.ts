import { InfinityFetchError } from '../InfinityFetchError.js';
import type {
  FetchContext,
  InfinityFetchConfig,
  InfinityFetchPage,
  InfinityFetchRetryConfig,
} from '../types/index.js';
import { wait } from '../utils/wait.js';
import { PageFailure } from './PageFailure.js';

async function fetchWithRetry<TResponse, TParams extends object>(
  fetcher: (params: TParams, context: FetchContext) => Promise<TResponse>,
  params: TParams,
  pageIndex: number,
  retry: InfinityFetchRetryConfig | undefined,
  signal: AbortSignal | undefined,
): Promise<TResponse> {
  const maxRetries = retry?.maxRetries ?? 0;

  let attempt = 0;

  while (true) {
    try {
      return await fetcher(params, { pageIndex, attempt, signal });
    } catch (error) {
      attempt++;

      if (attempt > maxRetries || signal?.aborted) {
        throw error;
      }

      const shouldRetry = retry?.retryWhen ? await retry.retryWhen(error, attempt) : true;

      if (!shouldRetry) {
        throw error;
      }

      const retryDelay =
        typeof retry?.delay === 'function' ? retry.delay(attempt, error) : retry?.delay;

      if (retryDelay) {
        await wait(retryDelay, signal);
      }
    }
  }
}

/**
 * Internal pagination engine shared by every public entry point.
 *
 * Yields one page at a time and returns `true` when it stopped because the signal
 * aborted. Failures are thrown as `PageFailure` so callers can attach the items
 * they collected; an `InfinityFetchError` raised by a user callback passes through
 * untouched so it is never double-wrapped.
 */
export async function* paginate<TResponse, TParams extends object, TItem, TOut>(
  config: Omit<InfinityFetchConfig<TResponse, TParams, TItem, TOut>, 'onEnd'>,
): AsyncGenerator<InfinityFetchPage<TResponse, TOut>, boolean, void> {
  const {
    fetcher,
    initialParams,
    isLastPage,
    getNextParams,
    getItems,
    onStart,
    onPage,
    maxPages = Number.POSITIVE_INFINITY,
    maxItems = Number.POSITIVE_INFINITY,
    stopWhen,
    mapItem,
    filterItem,
    dedupeBy,
    delay,
    retry,
    signal,
  } = config;

  await onStart?.();

  const seen = dedupeBy ? new Set<unknown>() : undefined;

  let params = initialParams;
  let pageIndex = 0;
  let itemIndex = 0;
  let collected = 0;

  while (pageIndex < maxPages && collected < maxItems) {
    if (signal?.aborted) {
      return true;
    }

    let response: TResponse;

    const pageItems: TOut[] = [];

    let committedItems: TOut[] | undefined;

    try {
      response = await fetchWithRetry(fetcher, params, pageIndex, retry, signal);

      for (const item of await getItems(response)) {
        const index = itemIndex++;
        const mapped = (mapItem ? mapItem(item, index) : item) as TOut;

        if (filterItem && !filterItem(mapped, index)) {
          continue;
        }

        if (seen && dedupeBy) {
          const key = dedupeBy(mapped);

          if (seen.has(key)) {
            continue;
          }

          seen.add(key);
        }

        pageItems.push(mapped);

        if (collected + pageItems.length >= maxItems) {
          break;
        }
      }

      committedItems = pageItems;

      await onPage?.(pageItems, response, pageIndex);
    } catch (error) {
      if (signal?.aborted) {
        return true;
      }

      if (error instanceof InfinityFetchError) {
        throw error;
      }

      throw new PageFailure(pageIndex, params, error, committedItems);
    }

    collected += pageItems.length;
    pageIndex++;

    yield { items: pageItems, response, pageIndex: pageIndex - 1 };

    try {
      if (isLastPage(response) || stopWhen?.(pageItems, response, pageIndex - 1)) {
        return false;
      }

      params = getNextParams(response, params);
    } catch (error) {
      if (signal?.aborted) {
        return true;
      }

      if (error instanceof InfinityFetchError) {
        throw error;
      }

      throw new PageFailure(pageIndex, params, error);
    }

    if (delay) {
      await wait(delay, signal);
    }
  }

  return false;
}
