/**
 * Binary search for the word whose [start, end) span contains `nowMs`,
 * falling back to the last word whose start has passed — section 5.3.
 * Pure and DOM-free so it's unit-testable on its own.
 */
export function findWordIndexAtTime(timings: Array<[number, number]>, nowMs: number): number {
  if (timings.length === 0) return -1;

  let lo = 0;
  let hi = timings.length - 1;
  let result = 0;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [start] = timings[mid]!;
    if (start <= nowMs) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return result;
}
