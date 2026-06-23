export class InfinityFetchError<TParams, TItem> extends Error {
  readonly pageIndex: number;
  readonly params: TParams;
  readonly itemsSoFar: TItem[];
  readonly cause: unknown;

  constructor(pageIndex: number, params: TParams, itemsSoFar: TItem[], cause: unknown) {
    super(
      `infinity-fetch failed on page ${pageIndex}: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    this.name = 'InfinityFetchError';
    this.cause = cause;
    this.pageIndex = pageIndex;
    this.params = params;
    this.itemsSoFar = itemsSoFar;
  }
}
