import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ShopifyClient } from './shopify.js';

const STORE = 'woodabu.myshopify.com';

const server = setupServer(
  http.post(`https://${STORE}/admin/api/2025-01/graphql.json`, async ({ request }) => {
    const body = await request.text();
    if (body.includes('products')) {
      return HttpResponse.json({
        data: {
          products: {
            edges: [
              { node: { id: 'gid://shopify/Product/1', title: 'Mesa Roble', handle: 'mesa-roble', description: 'Mesa de roble macizo', images: { edges: [{ node: { url: 'https://cdn.shopify.com/mesa.jpg' } }] }, variants: { edges: [{ node: { price: '899.00' } }] } } },
            ],
          },
        },
      });
    }
    if (body.includes('orders')) {
      return HttpResponse.json({
        data: {
          orders: {
            edges: [
              { node: { id: 'gid://shopify/Order/1', totalPriceSet: { shopMoney: { amount: '899.00' } }, lineItems: { edges: [{ node: { title: 'Mesa Roble', quantity: 1 } }] } } },
            ],
          },
        },
      });
    }
    return HttpResponse.json({ data: {} });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('ShopifyClient', () => {
  const config = { storeDomain: STORE, accessToken: 'shpat_test' };

  it('fetches products with images and prices', async () => {
    const client = new ShopifyClient(config);
    const products = await client.getProducts();
    expect(products).toHaveLength(1);
    expect(products[0].title).toBe('Mesa Roble');
    expect(products[0].price).toBe('899.00');
    expect(products[0].imageUrl).toContain('cdn.shopify.com');
  });

  it('fetches recent orders', async () => {
    const client = new ShopifyClient(config);
    const orders = await client.getRecentOrders();
    expect(orders).toHaveLength(1);
    expect(orders[0].totalPrice).toBe('899.00');
  });
});

describe('ShopifyClient error handling', () => {
  const config = { storeDomain: STORE, accessToken: 'shpat_test' };

  it('throws on HTTP error', async () => {
    server.use(
      http.post(`https://${STORE}/admin/api/2025-01/graphql.json`, () =>
        HttpResponse.json({}, { status: 401 }),
      ),
    );
    const client = new ShopifyClient(config);
    await expect(client.getProducts()).rejects.toThrow('401');
  });

  it('handles GraphQL errors in 200 response', async () => {
    server.use(
      http.post(`https://${STORE}/admin/api/2025-01/graphql.json`, () =>
        HttpResponse.json({
          errors: [{ message: 'Access denied' }],
          data: null,
        }),
      ),
    );
    const client = new ShopifyClient(config);
    await expect(client.getProducts()).rejects.toThrow('Access denied');
  });
});

describe('ShopifyClient email and segments', () => {
  const config = { storeDomain: STORE, accessToken: 'shpat_test' };

  it('fetches customer segments', async () => {
    server.use(
      http.post(`https://${STORE}/admin/api/2025-01/graphql.json`, () =>
        HttpResponse.json({
          data: {
            segments: {
              edges: [
                { node: { id: 'gid://shopify/Segment/1', name: 'Repeat buyers', query: 'orders_count > 1' } },
                { node: { id: 'gid://shopify/Segment/2', name: 'New customers', query: 'orders_count = 1' } },
              ],
            },
          },
        }),
      ),
    );
    const client = new ShopifyClient(config);
    const segments = await client.getCustomerSegments();
    expect(segments).toHaveLength(2);
    expect(segments[0].name).toBe('Repeat buyers');
  });

  it('creates email campaign draft', async () => {
    server.use(
      http.post(`https://${STORE}/admin/api/2025-01/graphql.json`, () =>
        HttpResponse.json({
          data: {
            emailMarketingCampaignCreate: {
              emailMarketingCampaign: { id: 'gid://shopify/EmailCampaign/1' },
              userErrors: [],
            },
          },
        }),
      ),
    );
    const client = new ShopifyClient(config);
    const result = await client.createEmailDraft({
      subject: 'Nueva colección Zero Waste',
      body: '<html><body>Content</body></html>',
    });
    expect(result.campaignId).toContain('EmailCampaign');
  });

  it('falls back gracefully if email mutation has userErrors', async () => {
    server.use(
      http.post(`https://${STORE}/admin/api/2025-01/graphql.json`, () =>
        HttpResponse.json({
          data: {
            emailMarketingCampaignCreate: {
              emailMarketingCampaign: null,
              userErrors: [{ message: 'Feature not available', field: ['input'] }],
            },
          },
        }),
      ),
    );
    const client = new ShopifyClient(config);
    const result = await client.createEmailDraft({ subject: 'Test', body: '<html></html>' });
    expect(result.fallback).toBe(true);
    expect(result.campaignId).toBeNull();
  });
});
