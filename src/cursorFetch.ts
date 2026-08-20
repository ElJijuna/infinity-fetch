import { infinityFetch } from './infinityFetch.js';
import { infinityFetchStream } from './infinityFetchStream.js';
import type {
  CursorFetchConfig,
  CursorParams,
  CursorStreamConfig,
  InfinityFetchConfig,
  InfinityFetchPage,
  InfinityFetchResult,
} from './types/index.js';

function toCoreConfig<TResponse, TItem, TOut>(
  config: Omit<CursorFetchConfig<TResponse, TItem, TOut>, 'onEnd'>,
): Omit<InfinityFetchConfig<TResponse, CursorParams, TItem, TOut>, 'onEnd'> {
  const { getCursor, ...options } = config;

  return {
    ...options,
    initialParams: { cursor: null },
    isLastPage: (response) => {
      const cursor = getCursor(response);

      return cursor === null || cursor === undefined;
    },
    getNextParams: (response) => ({ cursor: getCursor(response) as string }),
  };
}

/**
 * Convenience wrapper for cursor-based paginated APIs.
 * Auto-iterates using the cursor returned by `getCursor`. Stops when `getCursor` returns null or undefined.
 *
 * @example
 * const result = await cursorFetch({
 *   fetcher: ({ cursor }) => api.items({ cursor, perPage: 50 }),
 *   getCursor: (r) => r.nextCursor ?? null,
 *   getItems: (r) => r.data,
 * });
 */
export function cursorFetch<TResponse, TItem, TOut = TItem>(
  config: CursorFetchConfig<TResponse, TItem, TOut>,
): Promise<InfinityFetchResult<TOut>> {
  return infinityFetch({ ...toCoreConfig(config), onEnd: config.onEnd });
}

/**
 * Streaming counterpart of {@link cursorFetch}: yields one page at a time.
 *
 * @example
 * for await (const { items } of cursorStream({
 *   fetcher: ({ cursor }) => api.items({ cursor }),
 *   getCursor: (r) => r.nextCursor ?? null,
 *   getItems: (r) => r.data,
 * })) {
 *   await handle(items);
 * }
 */
export function cursorStream<TResponse, TItem, TOut = TItem>(
  config: CursorStreamConfig<TResponse, TItem, TOut>,
): AsyncGenerator<InfinityFetchPage<TResponse, TOut>, void, void> {
  return infinityFetchStream({ ...toCoreConfig(config), onEnd: config.onEnd });
}
