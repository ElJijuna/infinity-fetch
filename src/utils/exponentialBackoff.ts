export type ExponentialBackoffOptions = {
  /** Delay for the first retry, in milliseconds. Defaults to 100 */
  base?: number;
  /** Multiplier applied on every subsequent retry. Defaults to 2 */
  factor?: number;
  /** Upper bound for the delay, in milliseconds. Defaults to 30000 */
  max?: number;
  /**
   * Spread the delay over `[d/2, d]` so parallel clients do not retry in lockstep.
   * Defaults to true.
   */
  jitter?: boolean;
};

/**
 * Builds a `retry.delay` function with exponential backoff and (by default) jitter.
 *
 * @example
 * await pagedFetch({
 *   fetcher,
 *   retry: { maxRetries: 5, delay: exponentialBackoff({ base: 200, max: 10_000 }) },
 * });
 */
export function exponentialBackoff(
  options: ExponentialBackoffOptions = {},
): (attempt: number) => number {
  const { base = 100, factor = 2, max = 30_000, jitter = true } = options;

  return (attempt) => {
    const delay = Math.min(max, base * factor ** Math.max(0, attempt - 1));

    return jitter ? Math.round(delay / 2 + Math.random() * (delay / 2)) : delay;
  };
}
