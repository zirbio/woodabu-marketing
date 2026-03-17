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

describe('MetaClient — getAdInsights edge cases', () => {
  const config = {
    systemUserToken: 'sut_test',
    tokenExpiry: '2026-12-31',
    adAccountId: 'act_123',
    pageId: 'page_456',
    pageAccessToken: 'pat_test',
  };

  it('extracts conversions only from "purchase" action type', async () => {
    server.use(
      http.get(`${API_BASE}/act_123/insights`, () =>
        HttpResponse.json({
          data: [{ campaign_id: 'c1', campaign_name: 'Test', impressions: '100', clicks: '10', ctr: '0.1', spend: '50', actions: [{ action_type: 'purchase', value: '10' }, { action_type: 'link_click', value: '50' }] }],
        }),
      ),
    );
    const client = new MetaClient(config);
    const insights = await client.getAdInsights();
    expect(insights[0].conversions).toBe(10);
  });

  it('returns 0 conversions when no purchase action exists', async () => {
    server.use(
      http.get(`${API_BASE}/act_123/insights`, () =>
        HttpResponse.json({
          data: [{ campaign_id: 'c1', campaign_name: 'Test', impressions: '100', clicks: '10', ctr: '0.1', spend: '50', actions: [{ action_type: 'link_click', value: '50' }] }],
        }),
      ),
    );
    const client = new MetaClient(config);
    const insights = await client.getAdInsights();
    expect(insights[0].conversions).toBe(0);
  });

  it('returns 0 conversions when actions array is null/undefined', async () => {
    server.use(
      http.get(`${API_BASE}/act_123/insights`, () =>
        HttpResponse.json({
          data: [{ campaign_id: 'c1', campaign_name: 'Test', impressions: '100', clicks: '10', ctr: '0.1', spend: '50' }],
        }),
      ),
    );
    const client = new MetaClient(config);
    const insights = await client.getAdInsights();
    expect(insights[0].conversions).toBe(0);
    expect(typeof insights[0].conversions).toBe('number');
  });

  it('handles multiple campaigns in response', async () => {
    server.use(
      http.get(`${API_BASE}/act_123/insights`, () =>
        HttpResponse.json({
          data: Array.from({ length: 5 }, (_, i) => ({
            campaign_id: `c${i}`, campaign_name: `Campaign ${i}`, impressions: '1000', clicks: '50', ctr: '0.05', spend: '100', actions: [{ action_type: 'purchase', value: '5' }],
          })),
        }),
      ),
    );
    const client = new MetaClient(config);
    const insights = await client.getAdInsights();
    expect(insights).toHaveLength(5);
    insights.forEach((insight) => {
      expect(insight.conversions).toBe(5);
      expect(insight.impressions).toBe(1000);
    });
  });

  it('handles empty data array', async () => {
    server.use(
      http.get(`${API_BASE}/act_123/insights`, () =>
        HttpResponse.json({ data: [] }),
      ),
    );
    const client = new MetaClient(config);
    const insights = await client.getAdInsights();
    expect(insights).toEqual([]);
  });

  it('converts string metric values to numbers', async () => {
    server.use(
      http.get(`${API_BASE}/act_123/insights`, () =>
        HttpResponse.json({
          data: [{ campaign_id: 'c1', campaign_name: 'Test', impressions: '5000', clicks: '250', ctr: '0.05', spend: '100.50', actions: [] }],
        }),
      ),
    );
    const client = new MetaClient(config);
    const insights = await client.getAdInsights();
    expect(typeof insights[0].impressions).toBe('number');
    expect(insights[0].impressions).toBe(5000);
    expect(typeof insights[0].clicks).toBe('number');
    expect(insights[0].clicks).toBe(250);
  });

  it('sends correct Authorization header', async () => {
    let capturedAuth = '';
    server.use(
      http.get(`${API_BASE}/act_123/insights`, ({ request }) => {
        capturedAuth = request.headers.get('Authorization') ?? '';
        return HttpResponse.json({ data: [] });
      }),
    );
    const client = new MetaClient(config);
    await client.getAdInsights();
    expect(capturedAuth).toBe('Bearer sut_test');
  });

  it('uses correct API version v19.0 in URL', async () => {
    let capturedUrl = '';
    server.use(
      http.get(`${API_BASE}/act_123/insights`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ data: [] });
      }),
    );
    const client = new MetaClient(config);
    await client.getAdInsights();
    expect(capturedUrl).toContain('/v19.0/');
  });

  it('throws on 401 unauthorized', async () => {
    server.use(
      http.get(`${API_BASE}/act_123/insights`, () =>
        HttpResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      ),
    );
    const client = new MetaClient(config);
    await expect(client.getAdInsights()).rejects.toThrow('401');
  });

  it('throws on 403 forbidden', async () => {
    server.use(
      http.get(`${API_BASE}/act_123/insights`, () =>
        HttpResponse.json({ error: 'Forbidden' }, { status: 403 }),
      ),
    );
    const client = new MetaClient(config);
    await expect(client.getAdInsights()).rejects.toThrow('403');
  });
});

