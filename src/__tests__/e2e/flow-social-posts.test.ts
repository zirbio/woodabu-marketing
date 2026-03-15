import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';

import {
  server,
  resetToDefaults,
} from './helpers/msw-server.js';
import { stubAllEnvVars } from './helpers/env-stub.js';
import {
  metaPageInsightsResponse,
  metaSchedulePostResponse,
  shopifyProductsResponse,
} from './helpers/fixtures.js';

import { loadConfig } from '../../utils/auth.js';
import { MetaClient, type SchedulePostInput } from '../../apis/meta.js';
import { ShopifyClient } from '../../apis/shopify.js';
import {
  formatPostPreview,
  applyDecisions,
  type PostPreviewInput,
  type StagedItem,
  type ReviewDecision,
} from '../../staging/reviewer.js';

const META_BASE = 'https://graph.facebook.com/v19.0';

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

    it('stages posts and applies review decisions', () => {
      const staged: StagedItem[] = [
        { id: 'post1', content: 'Descubre nuestra Mesa Roble Macizo #woodabu' },
        { id: 'post2', content: 'Cabecero Castaño: artesanía en madera #sostenible' },
        { id: 'post3', content: 'Estantería modular de pino reciclado #eco' },
      ];

      const decisions: ReviewDecision[] = [
        { id: 'post1', action: 'approve' },
        { id: 'post2', action: 'edit', newContent: 'Cabecero Castaño tallado a mano #woodabu #artesanal' },
        { id: 'post3', action: 'skip' },
      ];

      const result = applyDecisions(staged, decisions);
      expect(result).toHaveLength(2);
      expect(result[0].content).toContain('Mesa Roble');
      expect(result[1].content).toContain('tallado a mano');
    });

    it('schedules a post with published:false', async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(`${META_BASE}/:pageId/feed`, async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json(metaSchedulePostResponse);
        }),
      );

      const config = loadConfig();
      const metaClient = new MetaClient(config.meta);
      const scheduledTime = Math.floor(Date.now() / 1000) + 86400;
      const result = await metaClient.schedulePost({
        message: 'Descubre nuestra Mesa Roble Macizo #woodabu',
        scheduledTime,
      });

      expect(result.postId).toBe('post_e2e_999');
      expect(capturedBody.published).toBe(false);
      expect(capturedBody.scheduled_publish_time).toBe(scheduledTime);
    });

    it('FULL PIPELINE: fetch engagement -> fetch products -> format -> stage -> review -> schedule', async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(`${META_BASE}/:pageId/feed`, async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json(metaSchedulePostResponse);
        }),
      );

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

      // 5. Stage and review
      const staged: StagedItem[] = [{ id: 'post1', content: copy }];
      const decisions: ReviewDecision[] = [{ id: 'post1', action: 'approve' }];
      const approved = applyDecisions(staged, decisions);
      expect(approved).toHaveLength(1);

      // 6. Schedule post
      const scheduledTime = Math.floor(Date.now() / 1000) + 86400;
      const result = await metaClient.schedulePost({
        message: `${approved[0].content} ${hashtags.join(' ')}`,
        scheduledTime,
        link: `https://woodabu.com/${product.handle}`,
      });

      expect(result.postId).toBeDefined();
      expect(capturedBody.published).toBe(false);
      expect(capturedBody.link).toContain('woodabu.com');
    });
  });

  describe('post options', () => {
    it('includes link when provided', async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(`${META_BASE}/:pageId/feed`, async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json(metaSchedulePostResponse);
        }),
      );

      const config = loadConfig();
      const metaClient = new MetaClient(config.meta);
      await metaClient.schedulePost({
        message: 'Test post with link',
        scheduledTime: Math.floor(Date.now() / 1000) + 3600,
        link: 'https://woodabu.com/mesa-roble-macizo',
      });

      expect(capturedBody.link).toBe('https://woodabu.com/mesa-roble-macizo');
    });

    it('omits link when not provided', async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(`${META_BASE}/:pageId/feed`, async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json(metaSchedulePostResponse);
        }),
      );

      const config = loadConfig();
      const metaClient = new MetaClient(config.meta);
      await metaClient.schedulePost({
        message: 'Test post without link',
        scheduledTime: Math.floor(Date.now() / 1000) + 3600,
      });

      expect(capturedBody).not.toHaveProperty('link');
    });

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

    it('applyDecisions with regenerate action filters out the item', () => {
      const staged: StagedItem[] = [
        { id: 'p1', content: 'Content to regenerate' },
      ];
      const decisions: ReviewDecision[] = [
        { id: 'p1', action: 'regenerate' },
      ];
      const result = applyDecisions(staged, decisions);
      expect(result).toHaveLength(0);
    });
  });
});
