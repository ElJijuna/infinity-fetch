import { describe, expect, it, jest } from '@jest/globals';
import { cursorStream } from '../cursorFetch.js';
import { InfinityFetchError } from '../InfinityFetchError.js';
import { infinityFetchStream } from '../infinityFetchStream.js';
import { baseCursorConfig, type CursorResponse, makeCursorFetcher } from './helpers.js';

describe('infinityFetchStream', () => {
  it('yields one page at a time with its index', async () => {
    const fetcher = makeCursorFetcher([
      { items: [1, 2], done: false, next: 1 },
      { items: [3], done: true, next: 0 },
    ]);
    const pages: Array<{ items: number[]; pageIndex: number }> = [];

    for await (const page of infinityFetchStream({ ...baseCursorConfig, fetcher })) {
      pages.push({ items: page.items, pageIndex: page.pageIndex });
    }

    expect(pages).toEqual([
      { items: [1, 2], pageIndex: 0 },
      { items: [3], pageIndex: 1 },
    ]);
  });

  it('exposes the raw response on every page', async () => {
    const fetcher = makeCursorFetcher([{ items: [1], done: true, next: 0 }]);

    for await (const page of infinityFetchStream({ ...baseCursorConfig, fetcher })) {
      expect(page.response).toEqual({ items: [1], done: true, next: 0 });
    }
  });

  it('does not fetch the next page until the consumer asks for it', async () => {
    const fetcher = makeCursorFetcher([
      { items: [1], done: false, next: 1 },
      { items: [2], done: true, next: 0 },
    ]);
    const iterator = infinityFetchStream({ ...baseCursorConfig, fetcher });

    await iterator.next();

    expect(fetcher).toHaveBeenCalledTimes(1);

    await iterator.next();

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('stops fetching when the consumer breaks out of the loop', async () => {
    const fetcher = makeCursorFetcher([
      { items: [1], done: false, next: 1 },
      { items: [2], done: false, next: 2 },
      { items: [3], done: true, next: 0 },
    ]);

    for await (const page of infinityFetchStream({ ...baseCursorConfig, fetcher })) {
      expect(page.items).toEqual([1]);

      break;
    }

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('calls onEnd with a summary instead of the items', async () => {
    const onEnd = jest.fn();
    const fetcher = makeCursorFetcher([
      { items: [1, 2], done: false, next: 1 },
      { items: [3], done: true, next: 0 },
    ]);

    let seen = 0;

    for await (const page of infinityFetchStream({ ...baseCursorConfig, fetcher, onEnd })) {
      seen += page.items.length;
    }

    expect(seen).toBe(3);
    expect(onEnd).toHaveBeenCalledWith({ pages: 2, items: 3 });
  });

  it('calls onEnd when the consumer breaks early', async () => {
    const onEnd = jest.fn();
    const fetcher = makeCursorFetcher([
      { items: [1], done: false, next: 1 },
      { items: [2], done: true, next: 0 },
    ]);

    for await (const page of infinityFetchStream({ ...baseCursorConfig, fetcher, onEnd })) {
      expect(page.items).toEqual([1]);

      break;
    }

    expect(onEnd).toHaveBeenCalledWith({ pages: 1, items: 1 });
  });

  it('reports aborted in the summary when the signal fires', async () => {
    const controller = new AbortController();
    const onEnd = jest.fn();
    const fetcher = jest.fn(
      (_: { cursor: number }): Promise<CursorResponse> =>
        Promise.resolve({ items: [1], done: false, next: 1 }),
    );

    for await (const page of infinityFetchStream({
      ...baseCursorConfig,
      fetcher,
      onEnd,
      signal: controller.signal,
    })) {
      expect(page.items).toEqual([1]);

      controller.abort();
    }

    expect(onEnd).toHaveBeenCalledWith({ pages: 1, items: 1, aborted: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('throws InfinityFetchError with page context when a fetch fails', async () => {
    const cause = new Error('boom');
    const fetcher = jest.fn(
      (_: { cursor: number }): Promise<CursorResponse> => Promise.reject(cause),
    );

    let err: unknown;

    try {
      for await (const page of infinityFetchStream({ ...baseCursorConfig, fetcher })) {
        throw new Error(`unexpected page ${page.pageIndex}`);
      }
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(InfinityFetchError);
    expect((err as InfinityFetchError<unknown, number>).pageIndex).toBe(0);
    expect((err as InfinityFetchError<unknown, number>).cause).toBe(cause);
  });

  it('does not call onEnd when the stream fails', async () => {
    const onEnd = jest.fn();
    const fetcher = jest.fn(
      (_: { cursor: number }): Promise<CursorResponse> => Promise.reject(new Error('boom')),
    );

    await expect(
      (async () => {
        for await (const page of infinityFetchStream({ ...baseCursorConfig, fetcher, onEnd })) {
          throw new Error(`unexpected page ${page.pageIndex}`);
        }
      })(),
    ).rejects.toBeInstanceOf(InfinityFetchError);

    expect(onEnd).not.toHaveBeenCalled();
  });
});

describe('cursorStream', () => {
  it('streams cursor-based pages', async () => {
    type ApiResponse = { data: string[]; nextCursor: string | null };

    const pages: ApiResponse[] = [
      { data: ['a'], nextCursor: 'tok1' },
      { data: ['b'], nextCursor: null },
    ];

    let call = 0;

    const collected: string[] = [];

    for await (const page of cursorStream({
      fetcher: () => Promise.resolve(pages[call++]),
      getCursor: (r: ApiResponse) => r.nextCursor,
      getItems: (r: ApiResponse) => r.data,
    })) {
      collected.push(...page.items);
    }

    expect(collected).toEqual(['a', 'b']);
  });
});

describe('infinityFetchStream error passthrough', () => {
  it('does not double-wrap an InfinityFetchError thrown by a callback', async () => {
    const inner = new InfinityFetchError(0, { cursor: 0 }, [], new Error('inner'));
    const fetcher = makeCursorFetcher([{ items: [1], done: true, next: 0 }]);

    let err: unknown;

    try {
      for await (const page of infinityFetchStream({
        ...baseCursorConfig,
        fetcher,
        getItems: () => {
          throw inner;
        },
      })) {
        throw new Error(`unexpected page ${page.pageIndex}`);
      }
    } catch (e) {
      err = e;
    }

    expect(err).toBe(inner);
  });
});
