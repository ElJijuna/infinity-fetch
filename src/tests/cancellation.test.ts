import { describe, expect, it, jest } from '@jest/globals';
import { infinityFetch } from '../infinityFetch.js';
import { wait } from '../utils/wait.js';
import type { CursorResponse } from './helpers.js';
import { baseCursorConfig, makeCursorFetcher } from './helpers.js';

describe('fetcher context', () => {
  it('forwards the config signal so the fetcher can abort its request', async () => {
    const controller = new AbortController();
    const seen: Array<AbortSignal | undefined> = [];
    const fetcher = jest.fn((_params: { cursor: number }, context) => {
      seen.push(context.signal);

      return Promise.resolve<CursorResponse>({ items: [1], done: true, next: 0 });
    });

    await infinityFetch({ ...baseCursorConfig, fetcher, signal: controller.signal });

    expect(seen).toEqual([controller.signal]);
  });

  it('reports the page index and the retry number', async () => {
    const seen: Array<{ pageIndex: number; attempt: number }> = [];

    let call = 0;

    const fetcher = jest.fn((_params: { cursor: number }, context) => {
      seen.push({ pageIndex: context.pageIndex, attempt: context.attempt });

      if (call++ === 1) {
        return Promise.reject(new Error('transient'));
      }

      return Promise.resolve<CursorResponse>(
        call === 1 ? { items: [1], done: false, next: 1 } : { items: [2], done: true, next: 0 },
      );
    });

    await infinityFetch({ ...baseCursorConfig, fetcher, retry: { maxRetries: 1 } });

    expect(seen).toEqual([
      { pageIndex: 0, attempt: 0 },
      { pageIndex: 1, attempt: 0 },
      { pageIndex: 1, attempt: 1 },
    ]);
  });
});

describe('abortable waiting', () => {
  it('resolves wait() immediately when the signal is already aborted', async () => {
    jest.useFakeTimers();

    const controller = new AbortController();

    controller.abort();

    await expect(wait(10_000, controller.signal)).resolves.toBeUndefined();

    jest.useRealTimers();
  });

  it('cuts the between-page delay short instead of waiting it out', async () => {
    jest.useFakeTimers();

    const controller = new AbortController();
    const fetcher = makeCursorFetcher([
      { items: [1], done: false, next: 1 },
      { items: [2], done: true, next: 0 },
    ]);
    const promise = infinityFetch({
      ...baseCursorConfig,
      fetcher,
      delay: 60_000,
      signal: controller.signal,
    });

    await jest.advanceTimersByTimeAsync(10);
    controller.abort();
    await jest.advanceTimersByTimeAsync(10);

    const result = await promise;

    expect(result.aborted).toBe(true);
    expect(result.items).toEqual([1]);
    expect(fetcher).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('cuts the retry delay short and stops retrying once aborted', async () => {
    jest.useFakeTimers();

    const controller = new AbortController();
    const fetcher = jest.fn((_params: { cursor: number }): Promise<CursorResponse> => {
      controller.abort();

      return Promise.reject(new Error('network'));
    });
    const promise = infinityFetch({
      ...baseCursorConfig,
      fetcher,
      retry: { maxRetries: 5, delay: 60_000 },
      signal: controller.signal,
    });

    await jest.advanceTimersByTimeAsync(10);

    const result = await promise;

    expect(result.aborted).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});
