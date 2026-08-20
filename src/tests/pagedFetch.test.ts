import { describe, expect, it, jest } from '@jest/globals';
import { pagedFetch } from '../pagedFetch.js';
import type { PagedParams, PagedResponse } from '../types/index.js';

describe('pagedFetch', () => {
  function makePagedResponse<T>(
    values: T[],
    isLastPage: boolean,
    nextPageStart?: number,
  ): PagedResponse<T> {
    return { values, isLastPage, nextPageStart, size: values.length, limit: 100, start: 0 };
  }

  function makePagedFetcher<T>(pages: PagedResponse<T>[]) {
    let call = 0;

    return jest.fn((_params: PagedParams): Promise<PagedResponse<T>> => {
      return Promise.resolve(pages[call++]);
    });
  }

  it('fetches all pages using isLastPage and nextPageStart', async () => {
    const fetcher = makePagedFetcher([
      makePagedResponse(['a', 'b'], false, 100),
      makePagedResponse(['c'], true),
    ]);
    const { items, pages } = await pagedFetch({ fetcher });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenNthCalledWith(1, { start: 0, limit: 100 });
    expect(fetcher).toHaveBeenNthCalledWith(2, { start: 100, limit: 100 });
    expect(items).toEqual(['a', 'b', 'c']);
    expect(pages).toBe(2);
  });

  it('uses custom limit', async () => {
    const fetcher = makePagedFetcher([makePagedResponse([], true)]);

    await pagedFetch({ fetcher, limit: 25 });

    expect(fetcher).toHaveBeenCalledWith({ start: 0, limit: 25 });
  });

  it('respects maxPages limit', async () => {
    const page = makePagedResponse([1], false, 100);
    const fetcher = jest.fn(
      (_: PagedParams): Promise<PagedResponse<number>> => Promise.resolve(page),
    );
    const { items, pages } = await pagedFetch({ fetcher, maxPages: 2 });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(items).toEqual([1, 1]);
    expect(pages).toBe(2);
  });

  it('calls onStart before the first fetch and onEnd with the final result', async () => {
    const order: string[] = [];
    const fetcher = makePagedFetcher([
      makePagedResponse(['a'], false, 100),
      makePagedResponse(['b'], true),
    ]);
    const onEnd = jest.fn((result: { items: string[]; pages: number }) => {
      order.push('end');
      expect(result).toEqual({ items: ['a', 'b'], pages: 2 });
    });

    await pagedFetch({
      fetcher: (params) => {
        order.push('fetch');

        return fetcher(params);
      },
      onStart: () => order.push('start'),
      onEnd,
    });

    expect(order).toEqual(['start', 'fetch', 'fetch', 'end']);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('throws when a non-final page does not provide nextPageStart', async () => {
    const fetcher = makePagedFetcher([makePagedResponse(['a'], false)]);

    await expect(pagedFetch({ fetcher })).rejects.toThrow(
      'Missing nextPageStart in non-final paged response',
    );
  });

  it('passes retry config through to infinityFetch', async () => {
    const page = makePagedResponse(['a'], true);
    const fetcher = jest.fn((_: PagedParams): Promise<PagedResponse<string>> => {
      if (fetcher.mock.calls.length === 1) {
        return Promise.reject(new Error('temporary failure'));
      }

      return Promise.resolve(page);
    });
    const { items, pages } = await pagedFetch({
      fetcher,
      retry: {
        maxRetries: 1,
      },
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(items).toEqual(['a']);
    expect(pages).toBe(1);
  });
});
