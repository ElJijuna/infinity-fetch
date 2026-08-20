/**
 * Resolves after `milliseconds`, or as soon as `signal` aborts — whichever comes first.
 * Never rejects: an aborted wait simply resolves early.
 */
export function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
