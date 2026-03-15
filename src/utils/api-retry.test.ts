import { describe, it, expect, vi } from 'vitest';
import { fetchWithRetry, ApiError } from './api-retry.js';

describe('fetchWithRetry', () => {
  it('returns response on success', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    const result = await fetchWithRetry('https://example.com', {}, { fetchFn: mockFetch });
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries once on network error then succeeds', async () => {
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue(new Response('ok', { status: 200 }));
    const result = await fetchWithRetry('https://example.com', {}, { fetchFn: mockFetch, retries: 1, baseDelayMs: 10 });
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('respects Retry-After header on 429', async () => {
    const headers429 = new Headers({ 'Retry-After': '1' });
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response('rate limited', { status: 429, headers: headers429 }))
      .mockResolvedValue(new Response('ok', { status: 200 }));
    const result = await fetchWithRetry('https://example.com', {}, { fetchFn: mockFetch, retries: 1, baseDelayMs: 10 });
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws ApiError after exhausting retries', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await expect(
      fetchWithRetry('https://example.com', {}, { fetchFn: mockFetch, retries: 2, baseDelayMs: 10 })
    ).rejects.toThrow(ApiError);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});

describe('ApiError', () => {
  it('includes status code and url', () => {
    const err = new ApiError('Meta API error', 429, 'https://graph.facebook.com/...');
    expect(err.statusCode).toBe(429);
    expect(err.url).toContain('graph.facebook.com');
    expect(err.message).toContain('429');
  });
});

describe('fetchWithRetry — retry behavior', () => {
  it('retries on 500 server error then succeeds', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response('error', { status: 500 }))
      .mockResolvedValue(new Response('ok', { status: 200 }));
    const result = await fetchWithRetry('https://example.com', {}, { fetchFn: mockFetch, retries: 1, baseDelayMs: 1 });
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on 400 Bad Request', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('bad request', { status: 400 }));
    const result = await fetchWithRetry('https://example.com', {}, { fetchFn: mockFetch, retries: 2, baseDelayMs: 1 });
    expect(result.status).toBe(400);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on 401 Unauthorized', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('unauthorized', { status: 401 }));
    const result = await fetchWithRetry('https://example.com', {}, { fetchFn: mockFetch, retries: 2, baseDelayMs: 1 });
    expect(result.status).toBe(401);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on 403 Forbidden', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('forbidden', { status: 403 }));
    const result = await fetchWithRetry('https://example.com', {}, { fetchFn: mockFetch, retries: 2, baseDelayMs: 1 });
    expect(result.status).toBe(403);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('429 without Retry-After uses exponential backoff', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValue(new Response('ok', { status: 200 }));
    const result = await fetchWithRetry('https://example.com', {}, { fetchFn: mockFetch, retries: 1, baseDelayMs: 1 });
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws ApiError with status 429 after retry exhaustion on persistent rate limit', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('rate limited', { status: 429 }));
    await expect(
      fetchWithRetry('https://example.com', {}, { fetchFn: mockFetch, retries: 2, baseDelayMs: 1 })
    ).rejects.toThrow(ApiError);
    try {
      await fetchWithRetry('https://example.com', {}, { fetchFn: mockFetch, retries: 2, baseDelayMs: 1 });
    } catch (e) {
      expect((e as ApiError).statusCode).toBe(429);
    }
  });

  it('retries = 0 means no retries (single attempt)', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await expect(
      fetchWithRetry('https://example.com', {}, { fetchFn: mockFetch, retries: 0, baseDelayMs: 1 })
    ).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries = 2 means 3 total attempts', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await expect(
      fetchWithRetry('https://example.com', {}, { fetchFn: mockFetch, retries: 2, baseDelayMs: 1 })
    ).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('500 on last retry attempt returns the 500 response (does not throw)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('server error', { status: 500 }));
    const result = await fetchWithRetry('https://example.com', {}, { fetchFn: mockFetch, retries: 1, baseDelayMs: 1 });
    expect(result.status).toBe(500);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('ApiError — URL redaction', () => {
  it('redacts access_token param', () => {
    const err = new ApiError('test', 400, 'https://api.example.com?access_token=secret123');
    expect(err.url).toContain('REDACTED');
    expect(err.url).not.toContain('secret123');
  });

  it('redacts token param', () => {
    const err = new ApiError('test', 400, 'https://api.example.com?token=mytoken');
    expect(err.url).toContain('REDACTED');
    expect(err.url).not.toContain('mytoken');
  });

  it('redacts key param', () => {
    const err = new ApiError('test', 400, 'https://api.example.com?key=mykey');
    expect(err.url).toContain('REDACTED');
    expect(err.url).not.toContain('mykey');
  });

  it('redacts secret param', () => {
    const err = new ApiError('test', 400, 'https://api.example.com?secret=mysecret');
    expect(err.url).toContain('REDACTED');
    expect(err.url).not.toContain('mysecret');
  });

  it('does NOT redact non-sensitive params like campaign_id', () => {
    const err = new ApiError('test', 400, 'https://api.example.com?campaign_id=c123');
    expect(err.url).toContain('campaign_id=c123');
  });

  it('redacts multiple sensitive params simultaneously', () => {
    const err = new ApiError('test', 400, 'https://api.example.com?access_token=abc&key=def&campaign_id=c1');
    expect(err.url).not.toContain('abc');
    expect(err.url).not.toContain('def');
    expect(err.url).toContain('campaign_id=c1');
  });

  it('handles URL with no query params', () => {
    const err = new ApiError('test', 400, 'https://api.example.com/path');
    expect(err.url).toBe('https://api.example.com/path');
  });

  it('handles malformed URL without crashing', () => {
    const err = new ApiError('test', 400, 'not-a-url');
    expect(err.url).toBe('not-a-url');
  });
});

describe('URL redaction in ApiError', () => {
  it('redacts access_token from error URL', () => {
    const err = new ApiError('fail', 401, 'https://graph.facebook.com/v19.0/insights?access_token=secret123&fields=id');
    expect(err.url).not.toContain('secret123');
    expect(err.url).toMatch(/REDACTED/);
    expect(err.url).toContain('fields=id');
  });

  it('redacts multiple sensitive params', () => {
    const err = new ApiError('fail', 401, 'https://api.example.com?token=abc&secret=xyz&safe=ok');
    expect(err.url).not.toContain('abc');
    expect(err.url).not.toContain('xyz');
    expect(err.url).toContain('safe=ok');
  });

  it('handles URLs without sensitive params', () => {
    const err = new ApiError('fail', 500, 'https://api.example.com/path?page=1');
    expect(err.url).toBe('https://api.example.com/path?page=1');
  });
});
