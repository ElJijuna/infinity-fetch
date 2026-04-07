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
                         initialParams = { start: 0, limit: 100 }
                                             │
                                             ▼
                    ┌────────────────────────────────────────┐
                    │          fetcher(params)               │
                    │   api.project('x').repo('y').commits() │
                    └────────────────┬───────────────────────┘
                                     │
                    ┌────────────────▼───────────────────────┐
                    │             Response                    │
                    │  { values, isLastPage, nextPageStart,  │
                    │    size, limit, start }                 │
                    └──────┬─────────────────────┬───────────┘
                           │                     │
                    isLastPage?                  no
                           │                     │
                          yes            getNextParams()
                           │          { start: nextPageStart }
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

---

## Installation

```bash
npm install infinity-fetch
```

---

## Usage

### `pagedFetch` — for Bitbucket-style paginated APIs

If your API returns `{ values, isLastPage, nextPageStart, size, limit, start }`, use the built-in helper:

```typescript
import { pagedFetch } from 'infinity-fetch';

const { items, pages } = await pagedFetch({
  fetcher: (params) => api.project('my-project').repo('my-repo').commits(params),
  limit: 100, // items per page, defaults to 100
});

console.log(`${items.length} commits fetched across ${pages} pages`);
```

With progress tracking and safety limit:

```typescript
const { items, pages } = await pagedFetch({
  fetcher: (params) => api.project('my-project').repo('my-repo').commits(params),
  limit: 100,
  maxPages: 20,
  onPage: (pageItems, _response, pageIndex) => {
    console.log(`Page ${pageIndex + 1}: ${pageItems.length} commits`);
  },
});
```

---

### `infinityFetch` — generic, fully configurable

Use this when your API has a different response shape:

```typescript
import { infinityFetch } from 'infinity-fetch';

const { items, pages } = await infinityFetch({
  // The function that performs a single page request
  fetcher: (params) => github.issues.list(params),

  // Parameters for the very first request
  initialParams: { page: 1, per_page: 50 },

  // When to stop — return true on the last page
  isLastPage: (response) => response.data.length < 50,

  // How to compute params for the next page
  getNextParams: (_response, currentParams) => ({
    ...currentParams,
    page: currentParams.page + 1,
  }),

  // Which field holds the items
  getItems: (response) => response.data,

  // Optional: safety cap on number of pages
  maxPages: 100,

  // Optional: called after each page
  onPage: (pageItems, _response, pageIndex) => {
    console.log(`Page ${pageIndex + 1}: ${pageItems.length} items`);
  },
});

console.log(`${items.length} issues fetched across ${pages} pages`);
```

---

## API Reference

### `pagedFetch<TItem>(config)`

| Option | Type | Default | Description |
|---|---|---|---|
| `fetcher` | `(params: PagedParams) => Promise<PagedResponse<TItem>>` | required | Function that fetches one page |
| `limit` | `number` | `100` | Items per page |
| `maxPages` | `number` | `Infinity` | Maximum pages to fetch (safety limit) |
| `onPage` | `(items, response, pageIndex) => void` | — | Called after each page |

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
| `onPage` | `(items, response, pageIndex) => void` | — | Called after each page |

**Returns:** `Promise<InfinityFetchResult<TItem>>`

```typescript
type InfinityFetchResult<TItem> = {
  items: TItem[];  // all items collected across every page
  pages: number;   // total number of pages fetched
};
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

### Setting up repository secrets

For the release pipeline to work, add these secrets in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `NPM_TOKEN` | npm automation token (`npm token create --type automation`) |

`GITHUB_TOKEN` is provided automatically by GitHub Actions — no setup needed.

### Enabling GitHub Pages

Go to **Settings → Pages** and set the source to **GitHub Actions**.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full release history.

---

## License

[MIT](LICENSE)
