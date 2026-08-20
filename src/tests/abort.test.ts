import { describe, expect, it, jest } from '@jest/globals';
import { infinityFetch } from '../infinityFetch.js';
import type { CursorResponse } from './helpers.js';

describe('AbortSignal', () => {
  const baseConfig = {
    initialParams: { cursor: 0 },
    isLastPage: (r: CursorResponse) => r.done,
    getNextParams: (r: CursorResponse) => ({ cursor: r.next }),
    getItems: (r: CursorResponse) => r.items,
  };

  it('returns empty partial result when signal is already aborted before first fetch', async () => {
    const controller = new AbortController();

    controller.abort();
    const fetcher = jest.fn(
      (_: { cursor: number }): Promise<CursorResponse> =>
        Promise.resolve({ items: [1], done: true, next: 0 }),
    );
    const result = await infinityFetch({ ...baseConfig, fetcher, signal: controller.signal });

    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toEqual({ items: [], pages: 0, aborted: true });
  });

  it('returns partial result with items collected before abort', async () => {
    const controller = new AbortController();

    let call = 0;

    const fetcher = jest.fn((_: { cursor: number }): Promise<CursorResponse> => {
      if (call++ === 1) {
        controller.abort();
      }

      return Promise.resolve({ items: [call], done: false, next: call });
    });
    const result = await infinityFetch({ ...baseConfig, fetcher, signal: controller.signal });

    expect(result.aborted).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it('calls onEnd with aborted: true when signal fires', async () => {
    const controller = new AbortController();

    controller.abort();
    const onEnd = jest.fn();

    await infinityFetch({
      ...baseConfig,
      fetcher: jest.fn((_: { cursor: number }) =>
        Promise.resolve({ items: [], done: true, next: 0 }),
      ),
      signal: controller.signal,
      onEnd,
    });

    expect(onEnd).toHaveBeenCalledWith({ items: [], pages: 0, aborted: true });
  });

  it('does not set aborted when signal is not triggered', async () => {
    const controller = new AbortController();
    const fetcher = jest.fn(
      (_: { cursor: number }): Promise<CursorResponse> =>
        Promise.resolve({ items: [1], done: true, next: 0 }),
    );
    const result = await infinityFetch({ ...baseConfig, fetcher, signal: controller.signal });

    expect(result.aborted).toBeUndefined();
    expect(result.items).toEqual([1]);
  });

  it('returns partial result when fetcher throws due to abort', async () => {
    const controller = new AbortController();
    const fetcher = jest.fn((_: { cursor: number }): Promise<CursorResponse> => {
      controller.abort();

      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    });
    const result = await infinityFetch({ ...baseConfig, fetcher, signal: controller.signal });

    expect(result.aborted).toBe(true);
    expect(result.items).toEqual([]);
  });
});
