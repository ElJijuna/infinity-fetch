import { describe, expect, it, jest } from '@jest/globals';
import { InfinityFetchError } from '../InfinityFetchError.js';
import { infinityFetch } from '../infinityFetch.js';
import type { CursorResponse, TestParams } from './helpers.js';

describe('InfinityFetchError', () => {
  const baseConfig = {
    initialParams: { cursor: 0 },
    isLastPage: (r: CursorResponse) => r.done,
    getNextParams: (r: CursorResponse) => ({ cursor: r.next }),
    getItems: (r: CursorResponse) => r.items,
  };

  it('wraps fetcher errors with page context after retries are exhausted', async () => {
    const cause = new Error('network error');
    const fetcher = jest.fn(
      (_: { cursor: number }): Promise<CursorResponse> => Promise.reject(cause),
    );

    let err: unknown;

    try {
      await infinityFetch({ ...baseConfig, fetcher });
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(InfinityFetchError);
    expect((err as InfinityFetchError<TestParams, number>).pageIndex).toBe(0);
    expect((err as InfinityFetchError<TestParams, number>).params).toEqual({ cursor: 0 });
    expect((err as InfinityFetchError<TestParams, number>).itemsSoFar).toEqual([]);
    expect((err as InfinityFetchError<TestParams, number>).cause).toBe(cause);
    expect((err as InfinityFetchError<TestParams, number>).message).toMatch(/page 0/);
  });

  it('carries items collected on previous pages in itemsSoFar', async () => {
    const cause = new Error('fail on page 1');

    let call = 0;

    const fetcher = jest.fn((_: { cursor: number }): Promise<CursorResponse> => {
      if (call++ === 1) {
        return Promise.reject(cause);
      }

      return Promise.resolve({ items: [10, 20], done: false, next: 1 });
    });

    let err: unknown;

    try {
      await infinityFetch({ ...baseConfig, fetcher });
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(InfinityFetchError);
    expect((err as InfinityFetchError<TestParams, number>).pageIndex).toBe(1);
    expect((err as InfinityFetchError<TestParams, number>).itemsSoFar).toEqual([10, 20]);
    expect((err as InfinityFetchError<TestParams, number>).cause).toBe(cause);
  });

  it('wraps errors thrown by getItems', async () => {
    const cause = new Error('bad items');
    const fetcher = jest.fn(
      (_: { cursor: number }): Promise<CursorResponse> =>
        Promise.resolve({ items: [], done: false, next: 1 }),
    );

    let err: unknown;

    try {
      await infinityFetch({
        ...baseConfig,
        fetcher,
        getItems: () => {
          throw cause;
        },
      });
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(InfinityFetchError);
    expect((err as InfinityFetchError<TestParams, number>).cause).toBe(cause);
  });

  it('wraps errors thrown by getNextParams', async () => {
    const cause = new Error('bad params');
    const fetcher = jest.fn(
      (_: { cursor: number }): Promise<CursorResponse> =>
        Promise.resolve({ items: [1], done: false, next: 1 }),
    );

    let err: unknown;

    try {
      await infinityFetch({
        ...baseConfig,
        fetcher,
        getNextParams: () => {
          throw cause;
        },
      });
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(InfinityFetchError);
    expect((err as InfinityFetchError<TestParams, number>).cause).toBe(cause);
    expect((err as InfinityFetchError<TestParams, number>).itemsSoFar).toEqual([1]);
  });

  it('wraps errors thrown by isLastPage', async () => {
    const cause = new Error('bad response');
    const fetcher = jest.fn(
      (_: { cursor: number }): Promise<CursorResponse> =>
        Promise.resolve({ items: [], done: false, next: 1 }),
    );

    let err: unknown;

    try {
      await infinityFetch({
        ...baseConfig,
        fetcher,
        isLastPage: () => {
          throw cause;
        },
      });
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(InfinityFetchError);
    expect((err as InfinityFetchError<TestParams, number>).cause).toBe(cause);
  });

  it('wraps errors thrown by onPage', async () => {
    const cause = new Error('render failed');
    const fetcher = jest.fn(
      (_: { cursor: number }): Promise<CursorResponse> =>
        Promise.resolve({ items: [1], done: true, next: 0 }),
    );

    let err: unknown;

    try {
      await infinityFetch({
        ...baseConfig,
        fetcher,
        onPage: () => {
          throw cause;
        },
      });
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(InfinityFetchError);
    expect((err as InfinityFetchError<TestParams, number>).cause).toBe(cause);
  });

  it('does not double-wrap an InfinityFetchError thrown by a callback', async () => {
    const inner = new InfinityFetchError(0, { cursor: 0 }, [], new Error('inner'));
    const fetcher = jest.fn(
      (_: { cursor: number }): Promise<CursorResponse> =>
        Promise.resolve({ items: [], done: false, next: 1 }),
    );

    let err: unknown;

    try {
      await infinityFetch({
        ...baseConfig,
        fetcher,
        getItems: () => {
          throw inner;
        },
      });
    } catch (e) {
      err = e;
    }

    expect(err).toBe(inner);
  });

  it('uses String(cause) in the message when cause is not an Error', async () => {
    const fetcher = jest.fn(
      (_: { cursor: number }): Promise<CursorResponse> => Promise.reject('timeout'),
    );

    let err: unknown;

    try {
      await infinityFetch({ ...baseConfig, fetcher });
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(InfinityFetchError);
    expect((err as InfinityFetchError<TestParams, number>).cause).toBe('timeout');
    expect((err as InfinityFetchError<TestParams, number>).message).toContain('timeout');
  });
});
