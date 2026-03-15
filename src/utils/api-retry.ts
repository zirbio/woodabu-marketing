export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number | null,
    public readonly url: string,
  ) {
    super(`${message} (status: ${statusCode}, url: ${url})`);
    this.name = 'ApiError';
  }
}

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  fetchFn?: typeof fetch;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  options: RetryOptions = {},
): Promise<Response> {
  const { retries = 1, baseDelayMs = 3000, fetchFn = fetch } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchFn(url, init);

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : baseDelayMs * Math.pow(2, attempt);

        if (attempt < retries) {
          await delay(waitMs);
          continue;
        }
        throw new ApiError('Rate limit exceeded', 429, url);
      }

      if (!response.ok && response.status >= 500 && attempt < retries) {
        await delay(baseDelayMs * Math.pow(2, attempt));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (lastError instanceof ApiError) throw lastError;

      if (attempt < retries) {
        await delay(baseDelayMs * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw new ApiError(
    lastError?.message ?? 'Request failed after retries',
    null,
    url,
  );
}
