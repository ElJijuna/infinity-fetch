/** Context passed as the second argument to every `fetcher` call */
export type FetchContext = {
  /** Zero-based index of the page being fetched */
  pageIndex: number;
  /** Retry number for this page: 0 on the first try, 1 on the first retry, and so on */
  attempt: number;
  /** The `signal` from the config, forwarded so the fetcher can abort the in-flight request */
  signal?: AbortSignal;
};
