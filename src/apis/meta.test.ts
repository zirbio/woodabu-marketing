import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MetaClient } from './meta.js';

const API_BASE = 'https://graph.facebook.com/v19.0';

const server = setupServer(
  http.get(`${API_BASE}/act_123/insights`, () =>
    HttpResponse.json({
      data: [
        { campaign_id: 'c1', campaign_name: 'Spring', impressions: '5000', clicks: '250', ctr: '0.05', spend: '100.50', actions: [{ action_type: 'purchase', value: '10' }] },
      ],
    }),
  ),
  http.post(`${API_BASE}/act_123/ads`, () =>
    HttpResponse.json({ id: 'ad_789' }),
  ),
  http.post(`${API_BASE}/page_456/feed`, () =>
    HttpResponse.json({ id: 'post_999' }),
  ),
  http.get(`${API_BASE}/page_456/insights`, () =>
    HttpResponse.json({
      data: [{ name: 'page_impressions', values: [{ value: 10000 }] }],
    }),
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('MetaClient', () => {
  const config = {
    systemUserToken: 'sut_test',
    tokenExpiry: '2026-12-31',
    adAccountId: 'act_123',
    pageId: 'page_456',
    pageAccessToken: 'pat_test',
  };

  it('fetches ad campaign insights', async () => {
    const client = new MetaClient(config);
    const insights = await client.getAdInsights();
    expect(insights).toHaveLength(1);
    expect(insights[0].campaignName).toBe('Spring');
    expect(insights[0].ctr).toBe(0.05);
  });

  it('creates ad as draft', async () => {
    const client = new MetaClient(config);
    const result = await client.createAdDraft({
      campaignId: 'c1',
      primaryText: 'Test primary',
      headline: 'Test headline',
      description: 'Test desc',
    });
    expect(result.adId).toBe('ad_789');
  });

  it('schedules a page post', async () => {
    const client = new MetaClient(config);
    const result = await client.schedulePost({
      message: 'Test post',
      scheduledTime: Math.floor(Date.now() / 1000) + 3600,
    });
    expect(result.postId).toBe('post_999');
  });

  it('fetches page insights', async () => {
    const client = new MetaClient(config);
    const insights = await client.getPageInsights();
    expect(insights).toBeDefined();
  });
});

describe('MetaClient error handling', () => {
  const config = {
    systemUserToken: 'sut_test',
    tokenExpiry: '2026-12-31',
    adAccountId: 'act_123',
    pageId: 'page_456',
    pageAccessToken: 'pat_test',
  };

  it('throws on 500 server error', async () => {
    server.use(
      http.get(`${API_BASE}/act_123/insights`, () =>
        HttpResponse.json({ error: { message: 'Internal error' } }, { status: 500 }),
      ),
    );
    const client = new MetaClient(config);
    await expect(client.getAdInsights()).rejects.toThrow('500');
  });
});
