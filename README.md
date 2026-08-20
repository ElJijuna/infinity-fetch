# infinity-fetch 🚀

[![npm version](https://img.shields.io/npm/v/infinity-fetch.svg?style=flat-square)](https://www.npmjs.com/package/infinity-fetch)
[![npm downloads](https://img.shields.io/npm/dm/infinity-fetch.svg?style=flat-square)](https://www.npmjs.com/package/infinity-fetch)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/infinity-fetch?style=flat-square)](https://bundlephobia.com/package/infinity-fetch)
[![License: MIT](https://img.shields.io/npm/l/infinity-fetch.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![CI](https://img.shields.io/github/actions/workflow/status/ElJijuna/infinity-fetch/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/ElJijuna/infinity-fetch/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/actions/workflow/status/ElJijuna/infinity-fetch/release.yml?branch=main&style=flat-square&label=Release)](https://github.com/ElJijuna/infinity-fetch/actions/workflows/release.yml)
[![Docs](https://img.shields.io/badge/docs-github%20pages-blue?style=flat-square)](https://eljijuna.github.io/infinity-fetch/)
[![Changelog](https://img.shields.io/badge/changelog-CHANGELOG.md-orange?style=flat-square)](CHANGELOG.md)
[![Issues](https://img.shields.io/github/issues/ElJijuna/infinity-fetch?style=flat-square)](https://github.com/ElJijuna/infinity-fetch/issues)
[![Last commit](https://img.shields.io/github/last-commit/ElJijuna/infinity-fetch?style=flat-square)](https://github.com/ElJijuna/infinity-fetch/commits/main)

> Configurable recursive fetch for paginated APIs. Works in Node.js and browsers.

Automatically re-invokes a fetch function across pages until a stop condition is met — either accumulating
every result into a single array, or streaming them page by page so memory stays flat. Offset, page-number,
cursor and `Link`-header pagination out of the box, with retries, backoff and cancellation. Zero dependencies.

---

## How it works

```
                    ┌─────────────────────────────────────────────────────┐
                    │                   infinityFetch                     │
                    └────────────────────────┬────────────────────────────┘
                                             │
                                             ▼
                    ┌────────────────────────────────────────┐
                    │       fetcher(params, context)         │
                    └────────────────┬───────────────────────┘
                                     │
                    ┌────────────────▼───────────────────────┐
                    │             Response                   │
                    └──────┬─────────────────────┬───────────┘
                           │                     │
                    isLastPage?                  no
                    maxPages / maxItems?         │
                    stopWhen?            getNextParams()
                           │                     │
                          yes                    ▼
                           │        ┌────────────────────────┐
                           │        │   fetcher(nextParams)  │  ← repeats
                           │        └────────────────────────┘
                           │
                           ▼
              ┌──────────────────────────────────────┐
              │   return { items[], pages: number }  │
              │   items  → all pages accumulated     │
              │   pages  → total iterations done     │
              └──────────────────────────────────────┘
```

Four convenience wrappers sit on top of `infinityFetch`, one per pagination style:


| Helper | Pagination style |
|---|---|
| `pagedFetch` | Offset-based — `{ start, limit, isLastPage, nextPageStart }` |
| `pageFetch` | Page-number — `?page=1&per_page=50` |
| `cursorFetch` | Cursor/token-based — `getCursor` returns the next cursor or `null` |
| `linkFetch` | RFC 5988 `Link: <…>; rel="next"` header (GitHub, GitLab, …) |
| `infinityFetch` | Generic — you supply `isLastPage` and `getNextParams` |

Every one of them has a streaming twin — `pagedStream`, `pageStream`, `cursorStream`,
`linkStream`, `infinityFetchStream` — that yields one page at a time instead of
collecting everything in memory.

---

## Installation

```bash
npm install infinity-fetch
```

---

## Usage

### `pagedFetch` — offset-based pagination

If your API returns `{ values, isLastPage, nextPageStart, size, limit, start }`, use the built-in helper:

```typescript
import { pagedFetch } from 'infinity-fetch';

const { items, pages } = await pagedFetch({
  fetcher: (params) => api.project('my-project').repo('my-repo').commits(params),
  limit: 100, // items per page, defaults to 100
});

console.log(`${items.length} commits fetched across ${pages} pages`);
```

With loading state, progress tracking, and a delay between pages:

```typescript
const { items, pages } = await pagedFetch({
  fetcher: (params) => api.project('my-project').repo('my-repo').commits(params),
  limit: 100,
  maxPages: 20,
  delay: 200,
  onStart: () => setLoading(true),
  onEnd:   () => setLoading(false),
  onPage: (pageItems, _response, pageIndex) => {
    console.log(`Page ${pageIndex + 1}: ${pageItems.length} commits`);
  },
});
```

---

### `pageFetch` — page-number pagination

For the most common REST shape of all — `?page=1&per_page=50`:

```typescript
import { pageFetch } from 'infinity-fetch';

const { items } = await pageFetch({
  fetcher: ({ page, perPage }) => api.get(`/products?page=${page}&per_page=${perPage}`),
  getItems: (r) => r.results,
  perPage: 50,
});
```

Pagination stops on the first page that returns **fewer items than `perPage`** (including an
empty page). If the API reports how many pages there are, say so and the heuristic is skipped:

```typescript
const { items } = await pageFetch({
  fetcher: ({ page, perPage }) => api.get(`/products?page=${page}&per_page=${perPage}`),
  getItems: (r) => r.results,
  getTotalPages: (r) => r.meta.total_pages,
  startPage: 1,
  perPage: 100,
});
```

Or take over the stop condition entirely with `isLastPage`, which also receives the raw items
and the current page number:

```typescript
isLastPage: (response, items, page) => response.meta.next === null || page >= 20,
```

---

### `cursorFetch` — cursor-based pagination

Use this when your API returns a cursor (or token) to request the next page, and `null`/`undefined` when there are no more pages:

```typescript
import { cursorFetch } from 'infinity-fetch';

const { items, pages } = await cursorFetch({
  fetcher: ({ cursor }) => github.issues({ cursor, perPage: 50 }),
  getCursor: (r) => r.pageInfo.endCursor ?? null,
  getItems:  (r) => r.data,
});
```

With full options:

```typescript
const { items, pages } = await cursorFetch({
  fetcher: ({ cursor }) => stripe.charges.list({ starting_after: cursor ?? undefined }),
  getCursor: (r) => r.has_more ? r.data.at(-1)?.id ?? null : null,
  getItems:  (r) => r.data,
  maxPages: 50,
  delay: 100,
  onEnd: ({ items, pages }) => console.log(`${items.length} charges in ${pages} pages`),
  retry: { maxRetries: 2 },
});
```

---

### `linkFetch` — `Link` header pagination

For APIs that advertise the next page in an RFC 5988 `Link` header. The header is read from
`response.headers` by default, so the fetcher can hand back the raw `fetch` Response and
`getItems` can simply be `(r) => r.json()`:

```typescript
import { linkFetch } from 'infinity-fetch';

const { items, pages } = await linkFetch({
  url: 'https://api.github.com/repos/facebook/react/issues?per_page=100',
  fetcher: ({ url }, { signal }) => fetch(url, {
    signal,
    headers: { authorization: `Bearer ${token}` },
  }),
  getItems: (response) => response.json(),
});
```

Pagination follows `rel="next"` and stops as soon as the header no longer offers one. Point it
at a different relation with `rel`, or read the header from somewhere else with `getLinkHeader`:

```typescript
const { items } = await linkFetch({
  url: '/api/items',
  fetcher: ({ url }) => client.get(url),        // e.g. axios
  getItems: (r) => r.data,
  getLinkHeader: (r) => r.headers.link,
});
```

The parser is exported on its own too:

```typescript
import { parseLinkHeader } from 'infinity-fetch';

parseLinkHeader('<https://api/x?page=2>; rel="next", <https://api/x?page=9>; rel="last"');
// { next: 'https://api/x?page=2', last: 'https://api/x?page=9' }
```

---

### `infinityFetch` — generic, fully configurable

Use this when your API has a different response shape:

```typescript
import { infinityFetch } from 'infinity-fetch';

const { items, pages } = await infinityFetch({
  fetcher: (params, { signal }) => github.issues.list(params, { signal }),
  initialParams: { page: 1, per_page: 50 },
  isLastPage: (response) => response.data.length < 50,
  getNextParams: (_response, currentParams) => ({
    ...currentParams,
    page: currentParams.page + 1,
  }),
  getItems: (response) => response.data,
  maxPages: 100,
  delay: 200,
  retry: {
    maxRetries: 3,
    delay: (attempt) => attempt * 500,
    retryWhen: (error) => error instanceof Response && error.status >= 500,
  },
  onStart: () => setLoading(true),
  onEnd: ({ items, pages }) => {
    setLoading(false);
    console.log(`Done: ${items.length} items across ${pages} pages`);
  },
  onPage: (pageItems, _response, pageIndex) => {
    console.log(`Page ${pageIndex + 1}: ${pageItems.length} items`);
  },
});
```

---

### Streaming — one page at a time

Buffered helpers keep every item in memory. When the dataset is large (or unbounded), use the
streaming twin instead: it yields a page as soon as it arrives and never accumulates.

```typescript
import { pageStream } from 'infinity-fetch';

for await (const { items, pageIndex } of pageStream({
  fetcher: ({ page, perPage }) => api.get(`/events?page=${page}&per_page=${perPage}`),
  getItems: (r) => r.results,
  perPage: 500,
})) {
  await db.insertMany(items);            // memory stays flat
  console.log(`page ${pageIndex} written`);
}
```

Streaming is lazy and honours backpressure: the next page is not requested until you ask for it,
and `break` stops the pagination for good.

```typescript
for await (const { items } of cursorStream({ fetcher, getCursor, getItems })) {
  const match = items.find((item) => item.id === wanted);

  if (match) break;                      // no further requests are made
}
```

Every helper has one:

| Buffered | Streaming |
|---|---|
| `infinityFetch` | `infinityFetchStream` |
| `pagedFetch` | `pagedStream` |
| `pageFetch` | `pageStream` |
| `cursorFetch` | `cursorStream` |
| `linkFetch` | `linkStream` |

They take exactly the same config, except `onEnd`, which receives a summary instead of the items
it never held:

```typescript
onEnd: ({ pages, items, aborted }) => console.log(`${items} items in ${pages} pages`),
```

Each iteration yields `{ items, response, pageIndex }`, so the raw response is there when you
need a header, a total, or an ETag.

---

### Limits and transforms

Beyond `maxPages`, pagination can stop on the data itself, and items can be reshaped on the way out.

```typescript
const { items } = await cursorFetch({
  fetcher,
  getCursor,
  getItems,
  maxItems: 500,                              // stop at 500 items (last page is truncated)
  stopWhen: (pageItems) => pageItems.some((i) => i.createdAt < since),
  mapItem: (issue) => ({ id: issue.id, title: issue.title }),
  filterItem: (issue) => !issue.draft,
  dedupeBy: (issue) => issue.id,              // drops repeats, across pages too
});
```

| Option | What it does |
|---|---|
| `maxItems` | Stops once that many items have been collected; the page that crosses the limit is truncated, and no further page is requested |
| `stopWhen` | Runs after each page (`items`, `response`, `pageIndex`) — return `true` to stop. Skipped when `isLastPage` already ended the run |
| `mapItem` | Transforms every item, and the result type with it. Receives the item's index across all pages |
| `filterItem` | Drops items that do not match, after `mapItem` |
| `dedupeBy` | Drops items whose key was already seen, on this or any previous page |

The pipeline runs in that order — `mapItem` → `filterItem` → `dedupeBy` → `maxItems` — and
`onPage` and the stream both see the final items. Filtered and deduped items do not count
towards `maxItems`.

---

### Cancellation with `AbortSignal`

Every helper accepts a `signal`. When it fires, pagination stops and returns whatever items were
collected up to that point — no error is thrown.

```typescript
const controller = new AbortController();

setTimeout(() => controller.abort(), 3000); // cancel after 3 seconds

const { items, pages, aborted } = await cursorFetch({
  fetcher: ({ cursor }, { signal }) => api.items({ cursor }, { signal }),
  getCursor: (r) => r.nextCursor ?? null,
  getItems:  (r) => r.data,
  signal: controller.signal,
});

if (aborted) {
  console.log(`Cancelled — got ${items.length} items across ${pages} pages`);
}
```

`aborted` is `true` in the result only when the signal fired. When pagination completes normally,
the field is absent.

The signal reaches every part of the run: it is **forwarded to the fetcher** through the context
argument (so the in-flight HTTP request is cancelled too, not just the loop), and it cuts short
any `delay` between pages and any pending retry delay.

---

### The fetcher context

Every fetcher is called with a second argument describing the current attempt:

```typescript
fetcher: (params, { signal, pageIndex, attempt }) => fetch(url, { signal }),
```

| Field | Type | Description |
|---|---|---|
| `signal` | `AbortSignal \| undefined` | The `signal` from the config — pass it to `fetch` so cancellation reaches the network |
| `pageIndex` | `number` | Zero-based index of the page being fetched |
| `attempt` | `number` | `0` on the first try, `1` on the first retry, and so on |

The argument is optional: existing one-argument fetchers keep working unchanged.

---

### Retries and backoff

```typescript
import { exponentialBackoff, pagedFetch } from 'infinity-fetch';

const { items } = await pagedFetch({
  fetcher,
  retry: {
    maxRetries: 5,
    delay: exponentialBackoff({ base: 200, max: 10_000 }),
    retryWhen: (error) => error.status >= 500 || error.status === 429,
  },
});
```

`exponentialBackoff({ base = 100, factor = 2, max = 30_000, jitter = true })` returns a
`retry.delay` function. With the defaults, retries wait ~100 ms, 200 ms, 400 ms, 800 ms… each
spread over `[d/2, d]` so parallel clients do not retry in lockstep. Pass `jitter: false` for
exact delays.

---

### Error handling with `InfinityFetchError`

When a fetch fails (after exhausting retries), `infinityFetch` throws an `InfinityFetchError` with full context about where the failure occurred:

```typescript
import { infinityFetch, InfinityFetchError } from 'infinity-fetch';

try {
  const { items } = await infinityFetch({ /* ... */ });
} catch (error) {
  if (error instanceof InfinityFetchError) {
    console.error(`Failed on page ${error.pageIndex}`);
    console.error(`Params at failure:`, error.params);
    console.error(`Items collected before failure:`, error.itemsSoFar);
    console.error(`Root cause:`, error.cause);
  }
}
```

| Property | Type | Description |
|---|---|---|
| `pageIndex` | `number` | Zero-based index of the page that failed |
| `params` | `TParams` | Parameters that were passed to the fetcher |
| `itemsSoFar` | `TItem[]` | All items collected from pages before the failure |
| `cause` | `unknown` | The original error thrown by the fetcher |
| `message` | `string` | `"infinity-fetch failed on page N: <cause message>"` |

Errors raised by your own callbacks (`getItems`, `getNextParams`, `isLastPage`, `onPage`) are
wrapped the same way, so a failure always tells you which page it came from. `onEnd` is **not**
called when the run throws. The streaming helpers throw the same error, with `itemsSoFar` empty —
they never held the items.

---

## API Reference

### Shared options

Accepted by `infinityFetch`, `pagedFetch`, `pageFetch`, `cursorFetch`, `linkFetch` and all of
their streaming twins.

| Option | Type | Default | Description |
|---|---|---|---|
| `maxPages` | `number` | `Infinity` | Maximum pages to fetch (safety limit) |
| `maxItems` | `number` | `Infinity` | Stop once this many items are collected; the last page is truncated |
| `stopWhen` | `(items, response, pageIndex) => boolean` | — | Return `true` to stop after the current page |
| `mapItem` | `(item, index) => TOut` | — | Transform each item; `index` counts across all pages |
| `filterItem` | `(item, index) => boolean` | — | Keep only matching items, after `mapItem` |
| `dedupeBy` | `(item) => unknown` | — | Drop items whose key was already seen |
| `delay` | `number` | — | Milliseconds to wait between each page fetch |
| `retry` | `InfinityFetchRetryConfig` | — | Retry failed page fetches |
| `signal` | `AbortSignal` | — | Cancel pagination and return partial results |
| `onStart` | `() => unknown` | — | Called once before the first fetch. Awaited |
| `onEnd` | `(result: InfinityFetchResult<TOut>) => unknown` | — | Called once after all pages are done, or when cancelled — receives `{ items, pages, aborted: true }` on cancellation. Not called when the run throws. Awaited |
| `onPage` | `(items, response, pageIndex) => unknown` | — | Called after each individual page. Awaited, so it can apply backpressure |

In the streaming helpers, `onEnd` instead receives `InfinityFetchSummary` — `{ pages, items, aborted? }`.

---

### `pagedFetch<TItem>(config)` · `pagedStream<TItem>(config)`

| Option | Type | Default | Description |
|---|---|---|---|
| `fetcher` | `(params: PagedParams, context: FetchContext) => Promise<PagedResponse<TItem>>` | required | Function that fetches one page |
| `limit` | `number` | `100` | Items per page |

**`PagedParams`**
```typescript
{ start: number; limit: number }
```

**`PagedResponse<TItem>`** — expected response shape:
```typescript
{
  values: TItem[];
  isLastPage: boolean;
  nextPageStart?: number;
  size: number;
  limit: number;
  start: number;
}
```

**Returns:** `Promise<InfinityFetchResult<TItem>>` — `pagedStream` returns `AsyncGenerator<InfinityFetchPage<PagedResponse<TItem>, TItem>>`

**Throws:** `InfinityFetchError` on fetch failure. Also throws if a non-final page response is missing `nextPageStart`.

---

### `pageFetch<TResponse, TItem>(config)` · `pageStream<TResponse, TItem>(config)`

| Option | Type | Default | Description |
|---|---|---|---|
| `fetcher` | `(params: PageParams, context: FetchContext) => Promise<TResponse>` | required | Function that fetches one page |
| `getItems` | `(response: TResponse) => TItem[] \| Promise<TItem[]>` | required | Extracts items from a response |
| `startPage` | `number` | `1` | First page number |
| `perPage` | `number` | `100` | Items per page |
| `getTotalPages` | `(response: TResponse) => number \| null \| undefined` | — | Total page count read from the response; stops once reached |
| `isLastPage` | `(response: TResponse, items: TItem[], page: number) => boolean` | — | Custom stop condition, replacing the default heuristic |

**`PageParams`**
```typescript
{ page: number; perPage: number }
```

Without `isLastPage` or `getTotalPages`, pagination stops on the first page returning fewer than `perPage` items.

**Returns:** `Promise<InfinityFetchResult<TItem>>` — `pageStream` returns `AsyncGenerator<InfinityFetchPage<TResponse, TItem>>`

---

### `cursorFetch<TResponse, TItem>(config)` · `cursorStream<TResponse, TItem>(config)`

| Option | Type | Default | Description |
|---|---|---|---|
| `fetcher` | `(params: CursorParams, context: FetchContext) => Promise<TResponse>` | required | Function that fetches one page |
| `getCursor` | `(response: TResponse) => string \| null \| undefined` | required | Returns the next cursor, or `null`/`undefined` on the last page |
| `getItems` | `(response: TResponse) => TItem[] \| Promise<TItem[]>` | required | Extracts items from a response |

**`CursorParams`**
```typescript
{ cursor: string | null }  // null on the first request (no prior cursor)
```

**Returns:** `Promise<InfinityFetchResult<TItem>>` — `cursorStream` returns `AsyncGenerator<InfinityFetchPage<TResponse, TItem>>`

---

### `linkFetch<TResponse, TItem>(config)` · `linkStream<TResponse, TItem>(config)`

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | required | URL of the first page |
| `fetcher` | `(params: LinkParams, context: FetchContext) => Promise<TResponse>` | required | Function that fetches one page |
| `getItems` | `(response: TResponse) => TItem[] \| Promise<TItem[]>` | required | Extracts items from a response |
| `rel` | `string` | `'next'` | Link relation to follow |
| `getLinkHeader` | `(response: TResponse) => string \| null \| undefined` | `response.headers.get('link')` | Where to read the raw `Link` header from |

**`LinkParams`**
```typescript
{ url: string }
```

**Returns:** `Promise<InfinityFetchResult<TItem>>` — `linkStream` returns `AsyncGenerator<InfinityFetchPage<TResponse, TItem>>`

---

### `infinityFetch<TResponse, TParams, TItem>(config)` · `infinityFetchStream<…>(config)`

| Option | Type | Default | Description |
|---|---|---|---|
| `fetcher` | `(params: TParams, context: FetchContext) => Promise<TResponse>` | required | Function that fetches one page |
| `initialParams` | `TParams` | required | Parameters for the first request |
| `isLastPage` | `(response: TResponse) => boolean` | required | Returns `true` to stop iteration |
| `getNextParams` | `(response: TResponse, currentParams: TParams) => TParams` | required | Computes params for the next page |
| `getItems` | `(response: TResponse) => TItem[] \| Promise<TItem[]>` | required | Extracts items from a response |

**Returns:** `Promise<InfinityFetchResult<TItem>>` — `infinityFetchStream` returns `AsyncGenerator<InfinityFetchPage<TResponse, TItem>>`

**Throws:** `InfinityFetchError` on fetch failure (after retries are exhausted).

---

### `exponentialBackoff(options?)`

| Option | Type | Default | Description |
|---|---|---|---|
| `base` | `number` | `100` | Delay for the first retry, in milliseconds |
| `factor` | `number` | `2` | Multiplier applied on every subsequent retry |
| `max` | `number` | `30000` | Upper bound for the delay |
| `jitter` | `boolean` | `true` | Spread the delay over `[d/2, d]` |

**Returns:** `(attempt: number) => number`, ready to drop into `retry.delay`.

---

### `parseLinkHeader(header)`

Parses an RFC 5988 `Link` header into a `{ rel: url }` map. Returns `{}` for `null`, `undefined`
or an unparseable header.

---

### Shared types

```typescript
type InfinityFetchResult<TItem> = {
  items: TItem[];     // all items collected across every page
  pages: number;      // total number of pages fetched
  aborted?: true;     // present only when an AbortSignal fired
};

type InfinityFetchPage<TResponse, TItem> = {
  items: TItem[];     // this page's items, after map/filter/dedupe
  response: TResponse;// the raw response
  pageIndex: number;  // zero-based index of this page
};

type InfinityFetchSummary = {
  pages: number;      // pages fetched
  items: number;      // items yielded across every page
  aborted?: true;     // present only when an AbortSignal fired
};

type FetchContext = {
  pageIndex: number;      // zero-based index of the page being fetched
  attempt: number;        // 0 on the first try, 1 on the first retry, …
  signal?: AbortSignal;   // the signal from the config
};
```

**`InfinityFetchRetryConfig`**

| Field | Type | Default | Description |
|---|---|---|---|
| `maxRetries` | `number` | `0` | Extra attempts per page. With `0`, any failure throws immediately. Total attempts = `maxRetries + 1`. |
| `delay` | `number \| (attempt, error) => number` | — | Wait between retries of the **same page** (`attempt` is 1-based). Different from `config.delay`, which separates consecutive pages. |
| `retryWhen` | `(error, attempt) => boolean \| Promise<boolean>` | retry all errors | If it returns `false`, the error is thrown immediately without exhausting `maxRetries`. `attempt` is 1-based. |

An aborted signal also stops the retry loop: no further attempt is made and no retry delay is waited out.

```typescript
class InfinityFetchError<TParams, TItem> extends Error {
  readonly pageIndex: number;   // zero-based index of the failed page
  readonly params: TParams;     // params passed to the fetcher
  readonly itemsSoFar: TItem[]; // items collected before the failure
  readonly cause: unknown;      // original error
}
```

### Type exports

All public types are available as named imports:

```typescript
import type {
  CursorFetchConfig,
  CursorParams,
  CursorStreamConfig,
  ExponentialBackoffOptions,
  FetchContext,
  InfinityFetchConfig,
  InfinityFetchPage,
  InfinityFetchResult,
  InfinityFetchRetryConfig,
  InfinityFetchStreamConfig,
  InfinityFetchSummary,
  LinkFetchConfig,
  LinkParams,
  LinkStreamConfig,
  PagedFetchConfig,
  PagedParams,
  PagedResponse,
  PagedStreamConfig,
  PageFetchConfig,
  PageParams,
  PageStreamConfig,
  PaginationOptions,
  StreamConfig,
} from 'infinity-fetch';
```

---

## Compatibility

| Environment | Support |
|---|---|
| Node.js 18+ | ✅ |
| Node.js 20+ | ✅ |
| Modern browsers | ✅ |
| Deno / Bun | ✅ |
| ESM | ✅ |
| TypeScript | ✅ (types included) |

---

## Contributing

Commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) spec — this drives automatic versioning and changelog generation via semantic-release.

| Commit prefix | Triggers |
|---|---|
| `fix:` | Patch release (`0.0.x`) |
| `feat:` | Minor release (`0.x.0`) |
| `feat!:` / `BREAKING CHANGE:` | Major release (`x.0.0`) |
| `chore:`, `docs:`, `test:` | No release |

```bash
git commit -m "feat: add onPage callback to pagedFetch"
git commit -m "fix: handle missing nextPageStart gracefully"
git commit -m "feat!: rename items field to data"
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full release history.

---

## License

[MIT](LICENSE)
