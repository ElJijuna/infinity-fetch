import { describe, expect, it, jest } from '@jest/globals';
import { infinityFetch } from '../infinityFetch.js';
import { baseCursorConfig, makeCursorFetcher } from './helpers.js';

describe('maxItems', () => {
  it('stops and truncates the page once the limit is reached', async () => {
    const fetcher = makeCursorFetcher([
      { items: [1, 2, 3], done: false, next: 1 },
      { items: [4, 5, 6], done: false, next: 2 },
      { items: [7, 8, 9], done: true, next: 0 },
    ]);
    const result = await infinityFetch({ ...baseCursorConfig, fetcher, maxItems: 4 });

    expect(result.items).toEqual([1, 2, 3, 4]);
    expect(result.pages).toBe(2);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not fetch a second page when the first already fills the limit', async () => {
    const fetcher = makeCursorFetcher([{ items: [1, 2], done: false, next: 1 }]);
    const result = await infinityFetch({ ...baseCursorConfig, fetcher, maxItems: 2 });

    expect(result.items).toEqual([1, 2]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('stopWhen', () => {
  it('stops after the page where the predicate returns true', async () => {
    const fetcher = makeCursorFetcher([
      { items: [1, 2], done: false, next: 1 },
      { items: [3, 99], done: false, next: 2 },
      { items: [4], done: true, next: 0 },
    ]);
    const result = await infinityFetch({
      ...baseCursorConfig,
      fetcher,
      stopWhen: (items) => items.includes(99),
    });

    expect(result.items).toEqual([1, 2, 3, 99]);
    expect(result.pages).toBe(2);
  });

  it('receives the page items, the response and the page index', async () => {
    const stopWhen = jest.fn(() => false);
    const fetcher = makeCursorFetcher([
      { items: [7], done: false, next: 1 },
      { items: [8], done: true, next: 0 },
    ]);

    await infinityFetch({ ...baseCursorConfig, fetcher, stopWhen });

    expect(stopWhen).toHaveBeenNthCalledWith(1, [7], { items: [7], done: false, next: 1 }, 0);
  });

  it('is not called when isLastPage already ended the pagination', async () => {
    const stopWhen = jest.fn(() => false);
    const fetcher = makeCursorFetcher([{ items: [7], done: true, next: 0 }]);

    await infinityFetch({ ...baseCursorConfig, fetcher, stopWhen });

    expect(stopWhen).not.toHaveBeenCalled();
  });
});

describe('mapItem', () => {
  it('transforms every item and changes the result type', async () => {
    const fetcher = makeCursorFetcher([
      { items: [1, 2], done: false, next: 1 },
      { items: [3], done: true, next: 0 },
    ]);
    const result = await infinityFetch({
      ...baseCursorConfig,
      fetcher,
      mapItem: (item, index) => `${index}:${item}`,
    });

    expect(result.items).toEqual(['0:1', '1:2', '2:3']);
  });

  it('passes the mapped items to onPage', async () => {
    const onPage = jest.fn();
    const fetcher = makeCursorFetcher([{ items: [1], done: true, next: 0 }]);

    await infinityFetch({ ...baseCursorConfig, fetcher, mapItem: (n) => n * 10, onPage });

    expect(onPage).toHaveBeenNthCalledWith(1, [10], expect.any(Object), 0);
  });
});

describe('filterItem', () => {
  it('keeps only matching items but still counts the page', async () => {
    const fetcher = makeCursorFetcher([
      { items: [1, 2, 3], done: false, next: 1 },
      { items: [4, 5], done: true, next: 0 },
    ]);
    const result = await infinityFetch({
      ...baseCursorConfig,
      fetcher,
      filterItem: (item) => item % 2 === 0,
    });

    expect(result.items).toEqual([2, 4]);
    expect(result.pages).toBe(2);
  });

  it('runs after mapItem', async () => {
    const fetcher = makeCursorFetcher([{ items: [1, 2, 3], done: true, next: 0 }]);
    const result = await infinityFetch({
      ...baseCursorConfig,
      fetcher,
      mapItem: (item) => item * 2,
      filterItem: (item) => item > 2,
    });

    expect(result.items).toEqual([4, 6]);
  });
});

describe('dedupeBy', () => {
  it('drops repeated keys across pages', async () => {
    const fetcher = makeCursorFetcher([
      { items: [1, 2, 2], done: false, next: 1 },
      { items: [2, 3], done: true, next: 0 },
    ]);
    const result = await infinityFetch({
      ...baseCursorConfig,
      fetcher,
      dedupeBy: (item) => item,
    });

    expect(result.items).toEqual([1, 2, 3]);
  });

  it('counts only deduped items towards maxItems', async () => {
    const fetcher = makeCursorFetcher([
      { items: [1, 1, 1], done: false, next: 1 },
      { items: [2], done: true, next: 0 },
    ]);
    const result = await infinityFetch({
      ...baseCursorConfig,
      fetcher,
      dedupeBy: (item) => item,
      maxItems: 2,
    });

    expect(result.items).toEqual([1, 2]);
    expect(result.pages).toBe(2);
  });
});
