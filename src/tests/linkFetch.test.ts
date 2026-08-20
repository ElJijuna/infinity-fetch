import { describe, expect, it, jest } from '@jest/globals';
import { linkFetch, linkStream } from '../linkFetch.js';
import type { LinkParams } from '../types/index.js';
import { parseLinkHeader } from '../utils/parseLinkHeader.js';
import { ctx } from './helpers.js';

type FakeResponse = {
  headers: { get: (name: string) => string | null };
  json: () => Promise<string[]>;
};

function makeResponse(items: string[], link: string | null): FakeResponse {
  return {
    headers: { get: (name) => (name.toLowerCase() === 'link' ? link : null) },
    json: () => Promise.resolve(items),
  };
}

describe('parseLinkHeader', () => {
  it('returns an empty map for missing headers', () => {
    expect(parseLinkHeader(null)).toEqual({});
    expect(parseLinkHeader(undefined)).toEqual({});
    expect(parseLinkHeader('')).toEqual({});
  });

  it('parses multiple relations', () => {
    const header =
      '<https://api/x?page=2>; rel="next", <https://api/x?page=9>; rel="last", <https://api/x?page=1>; rel="first"';

    expect(parseLinkHeader(header)).toEqual({
      next: 'https://api/x?page=2',
      last: 'https://api/x?page=9',
      first: 'https://api/x?page=1',
    });
  });

  it('handles unquoted rel values and extra attributes', () => {
    expect(parseLinkHeader('<https://api/x>; type=text/html; rel=next')).toEqual({
      next: 'https://api/x',
    });
  });

  it('maps every relation of a space-separated rel', () => {
    expect(parseLinkHeader('<https://api/x>; rel="next last"')).toEqual({
      next: 'https://api/x',
      last: 'https://api/x',
    });
  });

  it('keeps URLs that contain commas intact', () => {
    const header = '<https://api/x?ids=1,2,3>; rel="next", <https://api/x?page=1>; rel="prev"';

    expect(parseLinkHeader(header)).toEqual({
      next: 'https://api/x?ids=1,2,3',
      prev: 'https://api/x?page=1',
    });
  });

  it('ignores sections without a rel attribute', () => {
    expect(parseLinkHeader('<https://api/x>; type=text/html')).toEqual({});
  });

  it('ignores malformed sections', () => {
    expect(parseLinkHeader('garbage, <https://api/x>; rel="next"')).toEqual({
      next: 'https://api/x',
    });
  });
});

describe('linkFetch', () => {
  it('follows rel="next" until the header stops providing one', async () => {
    const responses = [
      makeResponse(['a'], '<https://api/x?page=2>; rel="next"'),
      makeResponse(['b'], '<https://api/x?page=3>; rel="next"'),
      makeResponse(['c'], '<https://api/x?page=1>; rel="prev"'),
    ];

    let call = 0;

    const fetcher = jest.fn((_params: LinkParams) => Promise.resolve(responses[call++]));
    const result = await linkFetch({
      url: 'https://api/x?page=1',
      fetcher,
      getItems: (response) => response.json(),
    });

    expect(result.items).toEqual(['a', 'b', 'c']);
    expect(result.pages).toBe(3);
    expect(fetcher).toHaveBeenNthCalledWith(1, { url: 'https://api/x?page=1' }, ctx(0));
    expect(fetcher).toHaveBeenNthCalledWith(2, { url: 'https://api/x?page=2' }, ctx(1));
    expect(fetcher).toHaveBeenNthCalledWith(3, { url: 'https://api/x?page=3' }, ctx(2));
  });

  it('stops after one page when there is no Link header at all', async () => {
    const fetcher = jest.fn((_params: LinkParams) => Promise.resolve(makeResponse(['a'], null)));
    const result = await linkFetch({
      url: 'https://api/x',
      fetcher,
      getItems: (response) => response.json(),
    });

    expect(result.items).toEqual(['a']);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('follows a custom rel', async () => {
    const responses = [
      makeResponse(['a'], '<https://api/x?page=2>; rel="nextPage"'),
      makeResponse(['b'], null),
    ];

    let call = 0;

    const result = await linkFetch({
      url: 'https://api/x',
      fetcher: () => Promise.resolve(responses[call++]),
      getItems: (response) => response.json(),
      rel: 'nextPage',
    });

    expect(result.items).toEqual(['a', 'b']);
  });

  it('accepts a custom getLinkHeader for responses that are not fetch Responses', async () => {
    const responses = [
      { data: ['a'], link: '<https://api/x?page=2>; rel="next"' },
      { data: ['b'], link: null },
    ];

    let call = 0;

    const result = await linkFetch({
      url: 'https://api/x',
      fetcher: () => Promise.resolve(responses[call++]),
      getItems: (response) => response.data,
      getLinkHeader: (response) => response.link,
    });

    expect(result.items).toEqual(['a', 'b']);
  });

  it('treats a response without headers as the last page', async () => {
    const result = await linkFetch({
      url: 'https://api/x',
      fetcher: () => Promise.resolve({ data: ['a'] }),
      getItems: (response) => response.data,
    });

    expect(result.items).toEqual(['a']);
    expect(result.pages).toBe(1);
  });
});

describe('linkStream', () => {
  it('streams Link-header pages', async () => {
    const responses = [
      makeResponse(['a'], '<https://api/x?page=2>; rel="next"'),
      makeResponse(['b'], null),
    ];

    let call = 0;

    const collected: string[] = [];

    for await (const page of linkStream({
      url: 'https://api/x',
      fetcher: () => Promise.resolve(responses[call++]),
      getItems: (response) => response.json(),
    })) {
      collected.push(...page.items);
    }

    expect(collected).toEqual(['a', 'b']);
  });
});
