import { describe, expect, it, jest } from '@jest/globals';
import { InfinityFetchError } from '../InfinityFetchError.js';
import { infinityFetch } from '../infinityFetch.js';
import { type CursorResponse, makeCursorFetcher, type TestParams } from './helpers.js';

describe('infinityFetch', () => {
  it('fetches a single page when isLastPage is true on first response', async () => {
    const fetcher = makeCursorFetcher([{ items: [1, 2, 3], done: true, next: 0 }]);
    const { items, pages } = await infinityFetch({
      fetcher,
      initialParams: { cursor: 0 },
      isLastPage: (r) => r.done,
      getNextParams: (r) => ({ cursor: r.next }),
      getItems: (r) => r.items,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith({ cursor: 0 });
    expect(items).toEqual([1, 2, 3]);
    expect(pages).toBe(1);
  });

  it('accumulates items across multiple pages', async () => {
    const fetcher = makeCursorFetcher([
      { items: [1, 2], done: false, next: 2 },
      { items: [3, 4], done: false, next: 4 },
      { items: [5], done: true, next: 0 },
    ]);
    const { items, pages } = await infinityFetch({
      fetcher,
      initialParams: { cursor: 0 },
      isLastPage: (r) => r.done,
      getNextParams: (r) => ({ cursor: r.next }),
      getItems: (r) => r.items,
    });

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(items).toEqual([1, 2, 3, 4, 5]);
    expect(pages).toBe(3);
  });

  it('passes updated params to each subsequent fetch', async () => {
    const fetcher = makeCursorFetcher([
      { items: [], done: false, next: 100 },
      { items: [], done: true, next: 0 },
    ]);

    await infinityFetch({
      fetcher,
      initialParams: { cursor: 0 },
      isLastPage: (r) => r.done,
      getNextParams: (r) => ({ cursor: r.next }),
      getItems: (r) => r.items,
    });

    expect(fetcher).toHaveBeenNthCalledWith(1, { cursor: 0 });
    expect(fetcher).toHaveBeenNthCalledWith(2, { cursor: 100 });
  });

  it('stops at maxPages even if isLastPage never returns true', async () => {
    const infinite: CursorResponse = { items: [1], done: false, next: 1 };
    const fetcher = jest.fn((_: TestParams): Promise<CursorResponse> => Promise.resolve(infinite));
    const { items, pages } = await infinityFetch({
      fetcher,
      initialParams: { cursor: 0 },
      isLastPage: (r) => r.done,
      getNextParams: (r) => ({ cursor: r.next }),
      getItems: (r) => r.items,
      maxPages: 3,
    });

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(items).toEqual([1, 1, 1]);
    expect(pages).toBe(3);
  });

  it('calls onPage callback with correct pageIndex', async () => {
    const fetcher = makeCursorFetcher([
      { items: [10], done: false, next: 1 },
      { items: [20], done: true, next: 0 },
    ]);
    const onPage = jest.fn();

    await infinityFetch({
      fetcher,
      initialParams: { cursor: 0 },
      isLastPage: (r) => r.done,
      getNextParams: (r) => ({ cursor: r.next }),
      getItems: (r) => r.items,
      onPage,
    });

    expect(onPage).toHaveBeenCalledTimes(2);
    expect(onPage).toHaveBeenNthCalledWith(1, [10], expect.any(Object), 0);
    expect(onPage).toHaveBeenNthCalledWith(2, [20], expect.any(Object), 1);
  });

  it('calls onStart before the first fetch and onEnd after the last', async () => {
    const order: string[] = [];
    const fetcher = makeCursorFetcher([
      { items: [1], done: false, next: 1 },
      { items: [2], done: true, next: 0 },
    ]);

    await infinityFetch({
      fetcher: (params) => {
        order.push('fetch');

        return fetcher(params);
      },
      initialParams: { cursor: 0 },
      isLastPage: (r) => r.done,
      getNextParams: (r) => ({ cursor: r.next }),
      getItems: (r) => r.items,
      onStart: () => order.push('start'),
      onEnd: () => order.push('end'),
    });

    expect(order).toEqual(['start', 'fetch', 'fetch', 'end']);
  });

  it('passes the final result to onEnd', async () => {
    const fetcher = makeCursorFetcher([
      { items: [1, 2], done: false, next: 2 },
      { items: [3], done: true, next: 0 },
    ]);
    const onEnd = jest.fn();

    await infinityFetch({
      fetcher,
      initialParams: { cursor: 0 },
      isLastPage: (r) => r.done,
      getNextParams: (r) => ({ cursor: r.next }),
      getItems: (r) => r.items,
      onEnd,
    });

    expect(onEnd).toHaveBeenCalledWith({ items: [1, 2, 3], pages: 2 });
  });

  it('waits delay milliseconds between page fetches', async () => {
    jest.useFakeTimers();
    const fetcher = makeCursorFetcher([
      { items: [1], done: false, next: 1 },
      { items: [2], done: false, next: 2 },
      { items: [3], done: true, next: 0 },
    ]);
    const timestamps: number[] = [];
    const wrappedFetcher = jest.fn((params: TestParams) => {
      timestamps.push(Date.now());

      return fetcher(params);
    });
    const promise = infinityFetch({
      fetcher: wrappedFetcher,
      initialParams: { cursor: 0 },
      isLastPage: (r) => r.done,
      getNextParams: (r) => ({ cursor: r.next }),
      getItems: (r) => r.items,
      delay: 500,
    });

    await jest.runAllTimersAsync();
    await promise;

    expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(500);
    expect(timestamps[2] - timestamps[1]).toBeGreaterThanOrEqual(500);
    jest.useRealTimers();
  });

  it('returns empty items and pages=1 when the first page has no items', async () => {
    const fetcher = makeCursorFetcher([{ items: [], done: true, next: 0 }]);
    const { items, pages } = await infinityFetch({
      fetcher,
      initialParams: { cursor: 0 },
      isLastPage: (r) => r.done,
      getNextParams: (r) => ({ cursor: r.next }),
      getItems: (r) => r.items,
    });

    expect(items).toEqual([]);
    expect(pages).toBe(1);
  });

  it('retries a failed page fetch and continues with the successful response', async () => {
    const error = new Error('temporary failure');
    const fetcher = jest.fn((params: TestParams): Promise<CursorResponse> => {
      if (fetcher.mock.calls.length === 1) {
        return Promise.reject(error);
      }

      return Promise.resolve({ items: [params.cursor + 1], done: true, next: 0 });
    });
    const retryWhen = jest.fn(() => true);
    const { items, pages } = await infinityFetch({
      fetcher,
      initialParams: { cursor: 0 },
      isLastPage: (r) => r.done,
      getNextParams: (r) => ({ cursor: r.next }),
      getItems: (r) => r.items,
      retry: {
        maxRetries: 1,
        retryWhen,
      },
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(retryWhen).toHaveBeenCalledWith(error, 1);
    expect(items).toEqual([1]);
    expect(pages).toBe(1);
  });

  it('throws InfinityFetchError after maxRetries is exhausted', async () => {
    const cause = new Error('still failing');
    const fetcher = jest.fn((_: TestParams): Promise<CursorResponse> => Promise.reject(cause));
    const onPage = jest.fn();

    await expect(
      infinityFetch({
        fetcher,
        initialParams: { cursor: 0 },
        isLastPage: (r) => r.done,
        getNextParams: (r) => ({ cursor: r.next }),
        getItems: (r) => r.items,
        onPage,
        retry: {
          maxRetries: 2,
        },
      }),
    ).rejects.toThrow(InfinityFetchError);

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(onPage).not.toHaveBeenCalled();
  });

  it('does not retry when retryWhen returns false', async () => {
    const cause = new Error('not retryable');
    const fetcher = jest.fn((_: TestParams): Promise<CursorResponse> => Promise.reject(cause));
    const retryWhen = jest.fn(() => false);

    let err: unknown;

    try {
      await infinityFetch({
        fetcher,
        initialParams: { cursor: 0 },
        isLastPage: (r) => r.done,
        getNextParams: (r) => ({ cursor: r.next }),
        getItems: (r) => r.items,
        retry: {
          maxRetries: 3,
          retryWhen,
        },
      });
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(InfinityFetchError);
    expect((err as InfinityFetchError<TestParams, number>).cause).toBe(cause);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(retryWhen).toHaveBeenCalledWith(cause, 1);
  });

  it('waits retry delay before retrying a failed page fetch', async () => {
    jest.useFakeTimers();
    const error = new Error('temporary failure');
    const fetcher = jest.fn((_: TestParams): Promise<CursorResponse> => {
      if (fetcher.mock.calls.length === 1) {
        return Promise.reject(error);
      }

      return Promise.resolve({ items: [1], done: true, next: 0 });
    });
    const retryDelay = jest.fn(() => 500);
    const promise = infinityFetch({
      fetcher,
      initialParams: { cursor: 0 },
      isLastPage: (r) => r.done,
      getNextParams: (r) => ({ cursor: r.next }),
      getItems: (r) => r.items,
      retry: {
        maxRetries: 1,
        delay: retryDelay,
      },
    });

    await jest.runAllTimersAsync();
    await promise;

    expect(retryDelay).toHaveBeenCalledWith(1, error);
    expect(fetcher).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
