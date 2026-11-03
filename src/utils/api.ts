/**
 * API client with automatic retries, backoff, and progress notification for 503 / transient errors.
 */

export interface FetchWithRetryOptions extends RequestInit {
  maxRetries?: number;
  initialDelayMs?: number;
  onRetry?: (attempt: number, maxRetries: number, delayMs: number, reason: string) => void;
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const { maxRetries = 3, initialDelayMs = 1500, onRetry, ...fetchOptions } = options;

  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      // Check if transient error (503 Service Unavailable, 429 Too Many Requests, 502/504 Bad Gateway)
      const isTransient =
        response.status === 503 ||
        response.status === 429 ||
        response.status === 502 ||
        response.status === 504;

      if (!isTransient || attempt > maxRetries) {
        return response;
      }

      const statusText = response.status === 503 ? 'Service Temporarily Unavailable (503)' : `Server Error (${response.status})`;
      if (onRetry) {
        onRetry(attempt, maxRetries, delay, statusText);
      }

      // Wait with backoff before next attempt
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.8, 6000);
    } catch (err: any) {
      if (attempt > maxRetries) {
        throw err;
      }

      const reason = err?.message || 'Network connection interrupted';
      if (onRetry) {
        onRetry(attempt, maxRetries, delay, reason);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.8, 6000);
    }
  }

  // Fallback final attempt
  return fetch(url, fetchOptions);
}
