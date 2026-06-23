export type InfinityFetchRetryConfig = {
  /** Optional: maximum retry attempts per page */
  maxRetries?: number;
  /** Optional: milliseconds to wait before each retry */
  delay?: number | ((attempt: number, error: unknown) => number);
  /** Optional: returns true when a failed fetch should be retried */
  retryWhen?: (error: unknown, attempt: number) => boolean | Promise<boolean>;
};
