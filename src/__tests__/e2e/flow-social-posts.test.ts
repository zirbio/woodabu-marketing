import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';

import {
  server,
  resetToDefaults,
} from './helpers/msw-server.js';
import { stubAllEnvVars } from './helpers/env-stub.js';

import { loadConfig } from '../../utils/auth.js';
import { MetaClient } from '../../apis/meta.js';
import { ShopifyClient } from '../../apis/shopify.js';
import {
  formatPostPreview,
  type PostPreviewInput,
} from '../../staging/reviewer.js';

describe('Social Posts — E2E', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
    stubAllEnvVars();
  });

  afterEach(() => {
    resetToDefaults();
    vi.unstubAllEnvs();
    stubAllEnvVars();
  });

  afterAll(() => {
    server.close();
  });

  describe('happy path', () => {
    it('fetches page engagement insights', async () => {
      const config = loadConfig();
      const metaClient = new MetaClient(config.meta);
      const pageInsights = await metaClient.getPageInsights();

      expect(pageInsights).toBeDefined();
      const data = pageInsights as { data: unknown[] };
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    it('fetches products from Shopify for post content', async () => {
      const config = loadConfig();
      const shopifyClient = new ShopifyClient(config.shopify);
      const products = await shopifyClient.getProducts();

      expect(products).toHaveLength(3);
      expect(products[0].handle).toBe('mesa-roble-macizo');
    });

    it('formats a post preview with all fields', () => {
      const input: PostPreviewInput = {
        copy: 'Descubre nuestra nueva Mesa Roble Macizo, hecha a mano con madera sostenible.',
        hashtags: ['#woodabu', '#muebles', '#sostenible'],
        scheduledTime: '2026-03-20T10:00:00Z',
        imageUrl: 'https://cdn.shopify.com/mesa-roble.jpg',
      };

      const preview = formatPostPreview(input);
      expect(preview).toContain('**Copy:**');
      expect(preview).toContain('Mesa Roble Macizo');
      expect(preview).toContain('#woodabu #muebles #sostenible');
      expect(preview).toContain('**Scheduled:**');
      expect(preview).toContain('**Image:**');
      expect(preview).toContain('mesa-roble.jpg');
    });

    it('FULL PIPELINE: fetch engagement -> fetch products -> format preview', async () => {
      const config = loadConfig();

      // 1. Fetch page engagement
      const metaClient = new MetaClient(config.meta);
      const pageInsights = await metaClient.getPageInsights();
      expect(pageInsights).toBeDefined();

      // 2. Fetch products
      const shopifyClient = new ShopifyClient(config.shopify);
      const products = await shopifyClient.getProducts();
      expect(products.length).toBeGreaterThan(0);

      // 3. Generate post content from products
      const product = products[0];
      const copy = `Descubre nuestra ${product.title}, hecha a mano con madera sostenible. ${product.price} EUR`;
      const hashtags = ['#woodabu', '#muebles', '#sostenible'];

      // 4. Format preview
      const preview = formatPostPreview({
        copy,
        hashtags,
        scheduledTime: '2026-03-20T10:00:00Z',
        imageUrl: product.imageUrl,
      });
      expect(preview).toContain(product.title);
    });
  });

  describe('post formatting', () => {
    it('formats preview with multiple hashtags', () => {
      const input: PostPreviewInput = {
        copy: 'Check out our new collection',
        hashtags: ['#woodabu', '#furniture', '#handmade', '#sustainable', '#madrid'],
        scheduledTime: '2026-03-20T10:00:00Z',
        imageUrl: null,
      };

      const preview = formatPostPreview(input);
      expect(preview).toContain('#woodabu #furniture #handmade #sustainable #madrid');
    });
  });

  describe('edge cases', () => {
    it('formatPostPreview with empty copy string', () => {
      const input: PostPreviewInput = {
        copy: '',
        hashtags: ['#woodabu'],
        scheduledTime: '2026-03-20T10:00:00Z',
        imageUrl: null,
      };

      const preview = formatPostPreview(input);
      expect(preview).toContain('**Copy:** ');
      expect(preview).not.toContain('**Image:**');
    });

    it('formatPostPreview without image omits image line', () => {
      const input: PostPreviewInput = {
        copy: 'Some post copy',
        hashtags: ['#tag'],
        scheduledTime: '2026-03-20T10:00:00Z',
        imageUrl: null,
      };

      const preview = formatPostPreview(input);
      expect(preview).not.toContain('**Image:**');
    });

    it('formatPostPreview with image includes image line', () => {
      const input: PostPreviewInput = {
        copy: 'Some post copy',
        hashtags: ['#tag'],
        scheduledTime: '2026-03-20T10:00:00Z',
        imageUrl: 'https://cdn.shopify.com/test.jpg',
      };

      const preview = formatPostPreview(input);
      expect(preview).toContain('**Image:** https://cdn.shopify.com/test.jpg');
    });

  });
});
