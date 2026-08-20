import { describe, expect, it, jest } from '@jest/globals';
import { cursorFetch } from '../cursorFetch.js';
import type { CursorParams } from '../types/index.js';

describe('cursorFetch', () => {
  type ApiResponse = { data: string[]; nextCursor: string | null };

  function makeResponse(data: string[], nextCursor: string | null): ApiResponse {
    return { data, nextCursor };
  }

  it('fetches a single page when getCursor returns null', async () => {
    const fetcher = jest.fn(
      (_: CursorParams): Promise<ApiResponse> => Promise.resolve(makeResponse(['a', 'b'], null)),
    );
    const { items, pages } = await cursorFetch({
      fetcher,
      getCursor: (r) => r.nextCursor,
      getItems: (r) => r.data,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith({ cursor: null });
    expect(items).toEqual(['a', 'b']);
    expect(pages).toBe(1);
  });

  it('accumulates items across multiple pages', async () => {
    let call = 0;

    const responses = [
      makeResponse(['a', 'b'], 'cursor1'),
      makeResponse(['c', 'd'], 'cursor2'),
      makeResponse(['e'], null),
    ];
    const fetcher = jest.fn(
      (_: CursorParams): Promise<ApiResponse> => Promise.resolve(responses[call++]),
    );
    const { items, pages } = await cursorFetch({
      fetcher,
      getCursor: (r) => r.nextCursor,
      getItems: (r) => r.data,
    });

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(items).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(pages).toBe(3);
  });

  it('passes the correct cursor to each subsequent fetch', async () => {
    let call = 0;

    const responses = [
      makeResponse(['a'], 'tok1'),
      makeResponse(['b'], 'tok2'),
      makeResponse(['c'], null),
    ];
    const fetcher = jest.fn(
      (_: CursorParams): Promise<ApiResponse> => Promise.resolve(responses[call++]),
    );

    await cursorFetch({ fetcher, getCursor: (r) => r.nextCursor, getItems: (r) => r.data });

    expect(fetcher).toHaveBeenNthCalledWith(1, { cursor: null });
    expect(fetcher).toHaveBeenNthCalledWith(2, { cursor: 'tok1' });
    expect(fetcher).toHaveBeenNthCalledWith(3, { cursor: 'tok2' });
  });

  it('stops at maxPages even when cursor is not null', async () => {
    const fetcher = jest.fn(
      (_: CursorParams): Promise<ApiResponse> =>
        Promise.resolve(makeResponse(['x'], 'always-more')),
    );
    const { items, pages } = await cursorFetch({
      fetcher,
      getCursor: (r) => r.nextCursor,
      getItems: (r) => r.data,
      maxPages: 2,
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(items).toEqual(['x', 'x']);
    expect(pages).toBe(2);
  });

  it('calls onEnd with the final result', async () => {
    const fetcher = jest.fn(
      (_: CursorParams): Promise<ApiResponse> => Promise.resolve(makeResponse(['a', 'b'], null)),
    );
    const onEnd = jest.fn();

    await cursorFetch({ fetcher, getCursor: (r) => r.nextCursor, getItems: (r) => r.data, onEnd });

    expect(onEnd).toHaveBeenCalledWith({ items: ['a', 'b'], pages: 1 });
  });

  it('passes retry config through to infinityFetch', async () => {
    let call = 0;

    const fetcher = jest.fn((_: CursorParams): Promise<ApiResponse> => {
      if (call++ === 0) {
        return Promise.reject(new Error('temporary failure'));
      }

      return Promise.resolve(makeResponse(['a'], null));
    });
    const { items, pages } = await cursorFetch({
      fetcher,
      getCursor: (r) => r.nextCursor,
      getItems: (r) => r.data,
      retry: { maxRetries: 1 },
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(items).toEqual(['a']);
    expect(pages).toBe(1);
  });
});
