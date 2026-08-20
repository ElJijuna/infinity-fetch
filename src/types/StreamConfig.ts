import type { InfinityFetchSummary } from './InfinityFetchSummary.js';

/**
 * Turns a buffered config into its streaming counterpart: everything stays the same
 * except `onEnd`, which receives a summary instead of the collected items.
 */
export type StreamConfig<TConfig> = Omit<TConfig, 'onEnd'> & {
  /** Optional: called once after the last page, or after the consumer stops iterating */
  onEnd?: (summary: InfinityFetchSummary) => unknown;
};
