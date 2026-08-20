import { jest } from '@jest/globals';

export type CursorResponse = { items: number[]; done: boolean; next: number };
export type TestParams = { cursor: number };

export function makeCursorFetcher(pages: CursorResponse[]) {
  let call = 0;

  return jest.fn((_params: TestParams): Promise<CursorResponse> => {
    return Promise.resolve(pages[call++]);
  });
}
