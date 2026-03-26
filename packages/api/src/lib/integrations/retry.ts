// ============================================================
// RETRY HELPER — exponential backoff
// ============================================================

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 500
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise<void>((r) =>
          setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1))
        );
      }
    }
  }
  throw lastError;
}
