import { PageFailure } from './core/PageFailure.js';
import { paginate } from './core/paginate.js';
import { InfinityFetchError } from './InfinityFetchError.js';
import type { InfinityFetchPage, InfinityFetchStreamConfig } from './types/index.js';

/**
 * Same pagination as {@link infinityFetch}, but yields one page at a time instead of
 * collecting everything — memory stays flat no matter how many pages there are.
 *
 * Breaking out of the loop stops the pagination; `onEnd` still runs, with the counts
 * gathered up to that point.
 *
 * @example
 * for await (const { items, pageIndex } of infinityFetchStream({
 *   fetcher: (params, { signal }) => api.list(params, { signal }),
 *   initialParams: { cursor: 0 },
 *   isLastPage: (r) => r.done,
 *   getNextParams: (r) => ({ cursor: r.next }),
 *   getItems: (r) => r.items,
 * })) {
 *   await db.insertMany(items);
 * }
 */
export async function* infinityFetchStream<TResponse, TParams extends object, TItem>(
  config: InfinityFetchStreamConfig<TResponse, TParams, TItem>,
): AsyncGenerator<InfinityFetchPage<TResponse, TItem>, void, void> {
  const iterator = paginate<TResponse, TParams, TItem>(config)[Symbol.asyncIterator]();

  let pages = 0;
  let items = 0;
  let aborted = false;
  let failed = false;

  try {
    while (true) {
      const next = await iterator.next();

      if (next.done) {
        aborted = next.value;

        break;
      }

      pages = next.value.pageIndex + 1;
      items += next.value.items.length;

      yield next.value;
    }
  } catch (error) {
    failed = true;

    if (error instanceof PageFailure) {
      throw new InfinityFetchError(error.pageIndex, error.params as TParams, [], error.reason);
    }

    throw error;
  } finally {
    await iterator.return?.(false);

    if (!failed) {
      await config.onEnd?.(
        aborted || config.signal?.aborted ? { pages, items, aborted: true } : { pages, items },
      );
    }
  }
}
