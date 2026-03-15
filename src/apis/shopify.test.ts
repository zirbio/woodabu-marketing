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
