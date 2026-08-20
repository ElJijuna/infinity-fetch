/** Final report handed to `onEnd` by the streaming helpers, which do not retain items */
export type InfinityFetchSummary = {
  /** Number of pages fetched */
  pages: number;
  /** Number of items yielded across every page */
  items: number;
  /** Present and true when the stream was stopped early via AbortSignal */
  aborted?: true;
};
