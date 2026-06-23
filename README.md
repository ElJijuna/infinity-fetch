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

Automatically re-invokes a fetch function across pages until a stop condition is met — accumulating all results into a single array. Zero dependencies.

---

## How it works

```
                    ┌─────────────────────────────────────────────────────┐
                    │                   infinityFetch                     │
                    └────────────────────────┬────────────────────────────┘
                                             │
                                             ▼
                    ┌────────────────────────────────────────┐
                    │          fetcher(params)               │
                    └────────────────┬───────────────────────┘
                                     │
                    ┌────────────────▼───────────────────────┐
                    │             Response                   │
                    └──────┬─────────────────────┬───────────┘
                           │                     │
                    isLastPage?                  no
                           │                     │
                          yes            getNextParams()
                           │                     │
                           │                     ▼
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

Three convenience wrappers sit on top of `infinityFetch`:

| Helper | Pagination style |
|---|---|
| `pagedFetch` | Offset-based — `{ start, limit, isLastPage, nextPageStart }` |
| `cursorFetch` | Cursor/token-based — `getCursor` returns the next cursor or `null` |
| `infinityFetch` | Generic — you supply `isLastPage` and `getNextParams` |

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

### `infinityFetch` — generic, fully configurable

Use this when your API has a different response shape:

```typescript
import { infinityFetch } from 'infinity-fetch';

const { items, pages } = await infinityFetch({
  fetcher: (params) => github.issues.list(params),
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

### Cancellation with `AbortSignal`

All three helpers accept a `signal` option. When the signal fires, pagination stops immediately and returns whatever items were collected up to that point — no error is thrown.

```typescript
const controller = new AbortController();

setTimeout(() => controller.abort(), 3000); // cancel after 3 seconds

const { items, pages, aborted } = await cursorFetch({
  fetcher: ({ cursor }) => api.items({ cursor }),
  getCursor: (r) => r.nextCursor ?? null,
  getItems:  (r) => r.data,
  signal: controller.signal,
});

if (aborted) {
  console.log(`Cancelled — got ${items.length} items across ${pages} pages`);
}
```

`aborted` is `true` in the result only when the signal fired. When pagination completes normally, the field is absent.

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

---

## API Reference

### `pagedFetch<TItem>(config)`

| Option | Type | Default | Description |
|---|---|---|---|
| `fetcher` | `(params: PagedParams) => Promise<PagedResponse<TItem>>` | required | Function that fetches one page |
| `limit` | `number` | `100` | Items per page |
| `maxPages` | `number` | `Infinity` | Maximum pages to fetch (safety limit) |
| `delay` | `number` | — | Milliseconds to wait between each page fetch |
| `retry` | `InfinityFetchRetryConfig` | — | Retry failed page fetches |
| `signal` | `AbortSignal` | — | Cancel pagination and return partial results |
| `onStart` | `() => void` | — | Called once before the first fetch |
| `onEnd` | `(result: InfinityFetchResult<TItem>) => void` | — | Called once after all pages are done, or when cancelled — receives `{ items, pages, aborted: true }` on cancellation |
| `onPage` | `(items, response, pageIndex) => void` | — | Called after each individual page |

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

**Returns:** `Promise<InfinityFetchResult<TItem>>`

**Throws:** `InfinityFetchError` on fetch failure. Also throws if a non-final page response is missing `nextPageStart`.

---

### `cursorFetch<TResponse, TItem>(config)`

| Option | Type | Default | Description |
|---|---|---|---|
| `fetcher` | `(params: CursorParams) => Promise<TResponse>` | required | Function that fetches one page |
| `getCursor` | `(response: TResponse) => string \| null \| undefined` | required | Returns the next cursor, or `null`/`undefined` on the last page |
| `getItems` | `(response: TResponse) => TItem[]` | required | Extracts items from a response |
| `maxPages` | `number` | `Infinity` | Maximum pages to fetch (safety limit) |
| `delay` | `number` | — | Milliseconds to wait between each page fetch |
| `retry` | `InfinityFetchRetryConfig` | — | Retry failed page fetches |
| `signal` | `AbortSignal` | — | Cancel pagination and return partial results |
| `onStart` | `() => void` | — | Called once before the first fetch |
| `onEnd` | `(result: InfinityFetchResult<TItem>) => void` | — | Called once after all pages are done, or when cancelled — receives `{ items, pages, aborted: true }` on cancellation |
| `onPage` | `(items, response, pageIndex) => void` | — | Called after each individual page |

**`CursorParams`**
```typescript
{ cursor: string | null }  // null on the first request (no prior cursor)
```

**Returns:** `Promise<InfinityFetchResult<TItem>>`

**Throws:** `InfinityFetchError` on fetch failure (after retries are exhausted).

---

### `infinityFetch<TResponse, TParams, TItem>(config)`

| Option | Type | Default | Description |
|---|---|---|---|
| `fetcher` | `(params: TParams) => Promise<TResponse>` | required | Function that fetches one page |
| `initialParams` | `TParams` | required | Parameters for the first request |
| `isLastPage` | `(response: TResponse) => boolean` | required | Returns `true` to stop iteration |
| `getNextParams` | `(response: TResponse, currentParams: TParams) => TParams` | required | Computes params for the next page |
| `getItems` | `(response: TResponse) => TItem[]` | required | Extracts items from a response |
| `maxPages` | `number` | `Infinity` | Maximum pages to fetch (safety limit) |
| `delay` | `number` | — | Milliseconds to wait between each page fetch |
| `retry` | `InfinityFetchRetryConfig` | — | Retry failed page fetches |
| `signal` | `AbortSignal` | — | Cancel pagination and return partial results |
| `onStart` | `() => void` | — | Called once before the first fetch |
| `onEnd` | `(result: InfinityFetchResult<TItem>) => void` | — | Called once after all pages are done, or when cancelled — receives `{ items, pages, aborted: true }` on cancellation |
| `onPage` | `(items, response, pageIndex) => void` | — | Called after each individual page |

**Returns:** `Promise<InfinityFetchResult<TItem>>`

**Throws:** `InfinityFetchError` on fetch failure (after retries are exhausted).

---

### Shared types

```typescript
type InfinityFetchResult<TItem> = {
  items: TItem[];     // all items collected across every page
  pages: number;      // total number of pages fetched
  aborted?: true;     // present only when an AbortSignal fired
};
```

**`InfinityFetchRetryConfig`**

| Field | Type | Default | Description |
|---|---|---|---|
| `maxRetries` | `number` | `0` | Extra attempts per page. With `0`, any failure throws immediately. Total attempts = `maxRetries + 1`. |
| `delay` | `number \| (attempt, error) => number` | — | Wait between retries of the **same page** (`attempt` is 1-based). Different from `config.delay`, which separates consecutive pages. |
| `retryWhen` | `(error, attempt) => boolean \| Promise<boolean>` | retry all errors | If it returns `false`, the error is thrown immediately without exhausting `maxRetries`. `attempt` is 1-based. |

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
  InfinityFetchConfig,
  InfinityFetchResult,
  InfinityFetchRetryConfig,
  PagedFetchConfig,
  PagedParams,
  PagedResponse,
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
