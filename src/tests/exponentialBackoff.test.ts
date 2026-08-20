import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { exponentialBackoff } from '../utils/exponentialBackoff.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('exponentialBackoff', () => {
  it('doubles the delay on every attempt when jitter is off', () => {
    const delay = exponentialBackoff({ base: 100, jitter: false });

    expect(delay(1)).toBe(100);
    expect(delay(2)).toBe(200);
    expect(delay(3)).toBe(400);
    expect(delay(4)).toBe(800);
  });

  it('honours a custom factor', () => {
    const delay = exponentialBackoff({ base: 50, factor: 3, jitter: false });

    expect(delay(1)).toBe(50);
    expect(delay(2)).toBe(150);
    expect(delay(3)).toBe(450);
  });

  it('never exceeds max', () => {
    const delay = exponentialBackoff({ base: 1000, max: 3000, jitter: false });

    expect(delay(1)).toBe(1000);
    expect(delay(2)).toBe(2000);
    expect(delay(3)).toBe(3000);
    expect(delay(10)).toBe(3000);
  });

  it('defaults to base 100 with jitter, staying within [d/2, d]', () => {
    const delay = exponentialBackoff();

    for (let attempt = 1; attempt <= 5; attempt++) {
      const expected = 100 * 2 ** (attempt - 1);
      const value = delay(attempt);

      expect(value).toBeGreaterThanOrEqual(expected / 2);
      expect(value).toBeLessThanOrEqual(expected);
    }
  });

  it('spreads the delay with jitter', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);

    expect(exponentialBackoff({ base: 400 })(1)).toBe(200);

    jest.spyOn(Math, 'random').mockReturnValue(1);

    expect(exponentialBackoff({ base: 400 })(1)).toBe(400);
  });

  it('treats attempt 0 like the first attempt', () => {
    expect(exponentialBackoff({ base: 100, jitter: false })(0)).toBe(100);
  });
});
