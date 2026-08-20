import { jest } from '@jest/globals';

export type CursorResponse = { items: number[]; done: boolean; next: number };
export type TestParams = { cursor: number };

export function makeCursorFetcher(pages: CursorResponse[]) {
  let call = 0;

  return jest.fn((_params: TestParams): Promise<CursorResponse> => {
    return Promise.resolve(pages[call++]);
  });
}

/** Config shared by the suites that paginate over `CursorResponse` pages */
export const baseCursorConfig = {
  initialParams: { cursor: 0 },
  isLastPage: (r: CursorResponse) => r.done,
  getNextParams: (r: CursorResponse) => ({ cursor: r.next }),
  getItems: (r: CursorResponse) => r.items,
};

/** The context object the engine passes as the fetcher's second argument */
export function ctx(pageIndex: number, attempt = 0, signal?: AbortSignal) {
  return { pageIndex, attempt, signal };
}
