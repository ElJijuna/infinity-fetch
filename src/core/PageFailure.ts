/**
 * Internal carrier for a failure that happened while fetching or processing a page.
 * Public entry points convert it into an `InfinityFetchError`, adding the items
 * they had collected so far. Never leaves the package.
 */
export class PageFailure extends Error {
  readonly pageIndex: number;
  readonly params: unknown;
  readonly reason: unknown;
  /**
   * Items of the failing page that were already handed to `onPage`. Set only when the
   * failure came from `onPage` itself, so callers can report them as collected.
   */
  readonly committedItems: unknown[] | undefined;

  constructor(pageIndex: number, params: unknown, reason: unknown, committedItems?: unknown[]) {
    super(`infinity-fetch failed on page ${pageIndex}`);
    this.name = 'PageFailure';
    this.pageIndex = pageIndex;
    this.params = params;
    this.reason = reason;
    this.committedItems = committedItems;
  }
}
