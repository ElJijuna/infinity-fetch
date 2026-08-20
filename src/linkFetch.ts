import { infinityFetch } from './infinityFetch.js';
import { infinityFetchStream } from './infinityFetchStream.js';
import type {
  InfinityFetchConfig,
  InfinityFetchPage,
  InfinityFetchResult,
  LinkFetchConfig,
  LinkParams,
  LinkStreamConfig,
} from './types/index.js';
import { parseLinkHeader } from './utils/parseLinkHeader.js';

/** Reads the `Link` header from anything shaped like a `fetch` Response */
function readLinkHeader(response: unknown): string | null | undefined {
  const headers = (response as { headers?: { get?: (name: string) => string | null } } | null)
    ?.headers;

  return typeof headers?.get === 'function' ? headers.get('link') : undefined;
}

function toCoreConfig<TResponse, TItem, TOut>(
  config: Omit<LinkFetchConfig<TResponse, TItem, TOut>, 'onEnd'>,
): Omit<InfinityFetchConfig<TResponse, LinkParams, TItem, TOut>, 'onEnd'> {
  const { url, rel = 'next', getLinkHeader = readLinkHeader, ...options } = config;
  const nextUrl = (response: TResponse): string | undefined =>
    parseLinkHeader(getLinkHeader(response))[rel];

  return {
    ...options,
    initialParams: { url },
    isLastPage: (response) => nextUrl(response) === undefined,
    getNextParams: (response) => ({ url: nextUrl(response) as string }),
  };
}

/**
 * Convenience wrapper for APIs that paginate with an RFC 5988 `Link` header
 * (GitHub, GitLab, and most `Link`-based REST APIs).
 *
 * By default the header is read from `response.headers`, so the fetcher can return
 * the raw `fetch` Response and `getItems` can be `(r) => r.json()`.
 *
 * @example
 * const { items } = await linkFetch({
 *   url: 'https://api.github.com/users/octocat/repos?per_page=100',
 *   fetcher: ({ url }, { signal }) => fetch(url, { signal }),
 *   getItems: (response) => response.json(),
 * });
 */
export function linkFetch<TResponse, TItem, TOut = TItem>(
  config: LinkFetchConfig<TResponse, TItem, TOut>,
): Promise<InfinityFetchResult<TOut>> {
  return infinityFetch({ ...toCoreConfig(config), onEnd: config.onEnd });
}

/**
 * Streaming counterpart of {@link linkFetch}: yields one page at a time.
 *
 * @example
 * for await (const { items } of linkStream({
 *   url: 'https://api.github.com/repos/x/y/issues',
 *   fetcher: ({ url }, { signal }) => fetch(url, { signal }),
 *   getItems: (response) => response.json(),
 * })) {
 *   await handle(items);
 * }
 */
export function linkStream<TResponse, TItem, TOut = TItem>(
  config: LinkStreamConfig<TResponse, TItem, TOut>,
): AsyncGenerator<InfinityFetchPage<TResponse, TOut>, void, void> {
  return infinityFetchStream({ ...toCoreConfig(config), onEnd: config.onEnd });
}
