export type InfinityFetchResult<TItem> = {
  /** All items collected across every page */
  items: TItem[];
  /** Number of pages fetched */
  pages: number;
  /** Present and true when the fetch was stopped early via AbortSignal */
  aborted?: true;
};
