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
