import { describe, it, expect, jest } from '@jest/globals';
import { infinityFetch } from './infinityFetch.js';
import { pagedFetch, PagedResponse, PagedParams } from './pagedFetch.js';

type CursorResponse = { items: number[]; done: boolean; next: number };
type CursorParams = { cursor: number };

function makeCursorFetcher(pages: CursorResponse[]) {
  let call = 0;
  return jest.fn((_params: CursorParams): Promise<CursorResponse> => {
    return Promise.resolve(pages[call++]);
  });
}

// --- infinityFetch ---

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
    const fetcher = jest.fn((_: CursorParams): Promise<CursorResponse> => Promise.resolve(infinite));

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
      fetcher: (params) => { order.push('fetch'); return fetcher(params); },
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
});

// --- pagedFetch ---

describe('pagedFetch', () => {
  function makePagedResponse<T>(
    values: T[],
    isLastPage: boolean,
    nextPageStart?: number
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
    const fetcher = jest.fn((_: PagedParams): Promise<PagedResponse<number>> => Promise.resolve(page));

    const { items, pages } = await pagedFetch({ fetcher, maxPages: 2 });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(items).toEqual([1, 1]);
    expect(pages).toBe(2);
  });
});
