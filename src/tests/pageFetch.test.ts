import { describe, expect, it, jest } from '@jest/globals';
import { pageFetch, pageStream } from '../pageFetch.js';
import type { PageParams } from '../types/index.js';
import { ctx } from './helpers.js';

type PageResponse = { results: string[]; totalPages?: number };

function makePageFetcher(pages: PageResponse[]) {
  return jest.fn((params: PageParams): Promise<PageResponse> => {
    return Promise.resolve(pages[params.page - 1] ?? { results: [] });
  });
}

describe('pageFetch', () => {
  it('starts at page 1 with perPage 100 by default', async () => {
    const fetcher = makePageFetcher([{ results: ['a'] }]);

    await pageFetch({ fetcher, getItems: (r) => r.results });

    expect(fetcher).toHaveBeenCalledWith({ page: 1, perPage: 100 }, ctx(0));
  });

  it('stops when a page returns fewer items than perPage', async () => {
    const fetcher = makePageFetcher([
      { results: ['a', 'b'] },
      { results: ['c', 'd'] },
      { results: ['e'] },
    ]);
    const result = await pageFetch({ fetcher, getItems: (r) => r.results, perPage: 2 });

    expect(result.items).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(result.pages).toBe(3);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('stops on an empty page', async () => {
    const fetcher = makePageFetcher([{ results: ['a', 'b'] }, { results: [] }]);
    const result = await pageFetch({ fetcher, getItems: (r) => r.results, perPage: 2 });

    expect(result.items).toEqual(['a', 'b']);
    expect(result.pages).toBe(2);
  });

  it('increments the page number on every request', async () => {
    const fetcher = makePageFetcher([{ results: ['a'] }, { results: ['b'] }, { results: [] }]);

    await pageFetch({ fetcher, getItems: (r) => r.results, perPage: 1 });

    expect(fetcher).toHaveBeenNthCalledWith(1, { page: 1, perPage: 1 }, ctx(0));
    expect(fetcher).toHaveBeenNthCalledWith(2, { page: 2, perPage: 1 }, ctx(1));
    expect(fetcher).toHaveBeenNthCalledWith(3, { page: 3, perPage: 1 }, ctx(2));
  });

  it('honours a custom startPage', async () => {
    const fetcher = makePageFetcher([{ results: ['a'] }, { results: ['b'] }, { results: ['c'] }]);
    const result = await pageFetch({
      fetcher,
      getItems: (r) => r.results,
      perPage: 1,
      startPage: 2,
    });

    expect(fetcher).toHaveBeenNthCalledWith(1, { page: 2, perPage: 1 }, ctx(0));
    expect(result.items).toEqual(['b', 'c']);
  });

  it('stops once getTotalPages is reached, even on a full page', async () => {
    const fetcher = makePageFetcher([
      { results: ['a'], totalPages: 2 },
      { results: ['b'], totalPages: 2 },
      { results: ['c'], totalPages: 2 },
    ]);
    const result = await pageFetch({
      fetcher,
      getItems: (r) => r.results,
      getTotalPages: (r) => r.totalPages,
      perPage: 1,
    });

    expect(result.items).toEqual(['a', 'b']);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('uses a custom isLastPage over the default heuristic', async () => {
    const fetcher = makePageFetcher([{ results: ['a'] }, { results: ['b'] }, { results: ['c'] }]);
    const result = await pageFetch({
      fetcher,
      getItems: (r) => r.results,
      perPage: 10,
      isLastPage: (_response, _items, page) => page >= 2,
    });

    expect(result.items).toEqual(['a', 'b']);
  });

  it('respects maxPages', async () => {
    const fetcher = makePageFetcher([{ results: ['a'] }, { results: ['b'] }, { results: ['c'] }]);
    const result = await pageFetch({
      fetcher,
      getItems: (r) => r.results,
      perPage: 1,
      maxPages: 2,
    });

    expect(result.pages).toBe(2);
    expect(result.items).toEqual(['a', 'b']);
  });

  it('supports an async getItems', async () => {
    const fetcher = makePageFetcher([{ results: ['a'] }]);
    const result = await pageFetch({
      fetcher,
      getItems: (r) => Promise.resolve(r.results),
      perPage: 10,
    });

    expect(result.items).toEqual(['a']);
  });
});

describe('pageStream', () => {
  it('streams page-number based responses', async () => {
    const fetcher = makePageFetcher([{ results: ['a'] }, { results: ['b'] }, { results: [] }]);
    const collected: string[] = [];

    for await (const page of pageStream({ fetcher, getItems: (r) => r.results, perPage: 1 })) {
      collected.push(...page.items);
    }

    expect(collected).toEqual(['a', 'b']);
  });
});
