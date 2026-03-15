import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';

import {
  server,
  resetToDefaults,
} from './helpers/msw-server.js';
import { stubAllEnvVars } from './helpers/env-stub.js';
import {
  shopifyProductsResponse,
  shopifySegmentsResponse,
  shopifyEmailSuccessResponse,
  shopifyEmailUserErrorResponse,
  emailProducts,
} from './helpers/fixtures.js';

import { loadConfig } from '../../utils/auth.js';
import { ShopifyClient, type EmailDraftInput, type EmailDraftResult } from '../../apis/shopify.js';
import {
  generateEmailHtml,
  compileMjml,
  type EmailInput,
  type EmailProduct,
} from '../../staging/html-preview.js';
import {
  formatEmailSummary,
  applyDecisions,
  type EmailSummaryInput,
  type StagedItem,
  type ReviewDecision,
} from '../../staging/reviewer.js';

const SHOPIFY_BASE = 'https://woodabu-test.myshopify.com/admin/api/2025-01/graphql.json';

describe('Email Campaign — E2E', () => {
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
    it('fetches customer segments from Shopify', async () => {
      const config = loadConfig();
      const shopifyClient = new ShopifyClient(config.shopify);
      const segments = await shopifyClient.getCustomerSegments();

      expect(segments).toHaveLength(3);
      expect(segments[0].name).toBe('Repeat buyers');
      expect(segments[0].query).toBe('orders_count > 1');
    });

    it('fetches products from Shopify for email content', async () => {
      const config = loadConfig();
      const shopifyClient = new ShopifyClient(config.shopify);
      const products = await shopifyClient.getProducts();

      expect(products).toHaveLength(3);
      expect(products[0].title).toBe('Mesa Roble Macizo');
      expect(products[0].imageUrl).toContain('mesa-roble');
    });

    it('generates MJML -> HTML email with products', () => {
      const input: EmailInput = {
        subject: 'Novedades Woodabu',
        preheader: 'Descubre nuestros muebles artesanales',
        bodyMjml: `
          <mj-section>
            <mj-column>
              <mj-text>Hola, descubre las novedades de Woodabu.</mj-text>
            </mj-column>
          </mj-section>`,
        products: emailProducts,
      };

      const result = generateEmailHtml(input);
      expect(result.subject).toBe('Novedades Woodabu');
      expect(result.html).toContain('<!doctype html>');
      expect(result.html).toContain('novedades de Woodabu');
      // Product cards should be present
      expect(result.html).toContain('Mesa Roble Macizo');
      expect(result.html).toContain('1299.00');
    });

    it('verifies HTML output contains all product data', () => {
      const input: EmailInput = {
        subject: 'Test',
        preheader: 'Preview',
        bodyMjml: `
          <mj-section>
            <mj-column>
              <mj-text>Test body</mj-text>
            </mj-column>
          </mj-section>`,
        products: emailProducts,
      };

      const result = generateEmailHtml(input);
      expect(result.html).toContain('Mesa Roble Macizo');
      expect(result.html).toContain('749.00');
      expect(result.html).toContain('Ver producto');
      expect(result.html).toContain('woodabu.com');
    });

    it('generates email HTML without products', () => {
      const input: EmailInput = {
        subject: 'Newsletter',
        preheader: 'Woodabu weekly news',
        bodyMjml: `
          <mj-section>
            <mj-column>
              <mj-text>This week at Woodabu...</mj-text>
            </mj-column>
          </mj-section>`,
        products: [],
      };

      const result = generateEmailHtml(input);
      expect(result.html).toContain('This week at Woodabu');
      expect(result.html).not.toContain('Ver producto');
    });

    it('formats email summary correctly', () => {
      const summaryInput: EmailSummaryInput = {
        subjects: ['Novedades Woodabu', 'Nuevos muebles artesanales'],
        segment: 'Repeat buyers',
        productCount: 2,
        preheader: 'Descubre nuestros muebles artesanales',
      };

      const summary = formatEmailSummary(summaryInput);
      expect(summary).toContain('## Email Campaign Summary');
      expect(summary).toContain('Novedades Woodabu');
      expect(summary).toContain('Nuevos muebles artesanales');
      expect(summary).toContain('Repeat buyers');
      expect(summary).toContain('2 products');
      expect(summary).toContain('Descubre nuestros muebles artesanales');
    });

    it('stages email and approves via review flow', () => {
      const staged: StagedItem[] = [
        { id: 'email1', content: 'Novedades Woodabu — Repeat buyers segment' },
      ];

      const decisions: ReviewDecision[] = [
        { id: 'email1', action: 'approve' },
      ];

      const result = applyDecisions(staged, decisions);
      expect(result).toHaveLength(1);
      expect(result[0].content).toContain('Novedades Woodabu');
    });

    it('creates email draft via Shopify', async () => {
      const config = loadConfig();
      const shopifyClient = new ShopifyClient(config.shopify);

      const emailInput: EmailDraftInput = {
        subject: 'Novedades Woodabu',
        body: '<html><body>Email content</body></html>',
      };

      const result = await shopifyClient.createEmailDraft(emailInput);
      expect(result.campaignId).toBe('gid://shopify/EmailCampaign/e2e_1');
      expect(result.fallback).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('FULL PIPELINE: segments -> products -> MJML -> HTML -> summary -> stage -> approve -> create draft', async () => {
      const config = loadConfig();
      const shopifyClient = new ShopifyClient(config.shopify);

      // 1. Fetch segments
      const segments = await shopifyClient.getCustomerSegments();
      expect(segments.length).toBeGreaterThan(0);
      const targetSegment = segments[0];

      // 2. Fetch products
      const products = await shopifyClient.getProducts();
      expect(products.length).toBeGreaterThan(0);

      // 3. Map to EmailProduct
      const emailProds: EmailProduct[] = products.slice(0, 2).map((p) => ({
        title: p.title,
        price: p.price,
        imageUrl: p.imageUrl ?? '',
        url: `https://woodabu.com/${p.handle}`,
      }));

      // 4. Generate MJML -> HTML
      const emailHtml = generateEmailHtml({
        subject: 'Novedades Woodabu',
        preheader: 'Descubre nuestros muebles artesanales',
        bodyMjml: `
          <mj-section>
            <mj-column>
              <mj-text>Hola, descubre las novedades de Woodabu.</mj-text>
            </mj-column>
          </mj-section>`,
        products: emailProds,
      });
      expect(emailHtml.html).toContain('<!doctype html>');

      // 5. Format summary
      const summary = formatEmailSummary({
        subjects: [emailHtml.subject],
        segment: targetSegment.name,
        productCount: emailProds.length,
        preheader: 'Descubre nuestros muebles artesanales',
      });
      expect(summary).toContain(targetSegment.name);

      // 6. Stage and approve
      const staged: StagedItem[] = [{ id: 'email_pipeline', content: emailHtml.subject }];
      const decisions: ReviewDecision[] = [{ id: 'email_pipeline', action: 'approve' }];
      const approved = applyDecisions(staged, decisions);
      expect(approved).toHaveLength(1);

      // 7. Create draft via Shopify
      const draftResult = await shopifyClient.createEmailDraft({
        subject: emailHtml.subject,
        body: emailHtml.html,
      });
      expect(draftResult.campaignId).toBeDefined();
      expect(draftResult.fallback).toBe(false);
    });
  });

  describe('email creation fallback', () => {
    it('userErrors trigger fallback with error message', async () => {
      server.use(
        http.post(SHOPIFY_BASE, async ({ request }) => {
          const body = await request.text();
          if (body.includes('emailMarketingCampaignCreate')) {
            return HttpResponse.json(shopifyEmailUserErrorResponse);
          }
          return HttpResponse.json(shopifyProductsResponse);
        }),
      );

      const config = loadConfig();
      const shopifyClient = new ShopifyClient(config.shopify);
      const result = await shopifyClient.createEmailDraft({
        subject: 'Test',
        body: '<html>test</html>',
      });

      expect(result.fallback).toBe(true);
      expect(result.campaignId).toBeNull();
      expect(result.error).toContain('Feature not available');
    });

    it('API unreachable triggers fallback', async () => {
      server.use(
        http.post(SHOPIFY_BASE, async ({ request }) => {
          const body = await request.text();
          if (body.includes('emailMarketingCampaignCreate')) {
            return HttpResponse.json(
              { errors: [{ message: 'Service unavailable' }] },
              { status: 503 },
            );
          }
          return HttpResponse.json(shopifyProductsResponse);
        }),
      );

      const config = loadConfig();
      const shopifyClient = new ShopifyClient(config.shopify);
      const result = await shopifyClient.createEmailDraft({
        subject: 'Test',
        body: '<html>test</html>',
      });

      // The catch block in createEmailDraft catches the thrown error and returns fallback
      expect(result.fallback).toBe(true);
      expect(result.campaignId).toBeNull();
      expect(result.error).toBe('Email API unavailable');
    });

    it('network error triggers fallback', async () => {
      server.use(
        http.post(SHOPIFY_BASE, async ({ request }) => {
          const body = await request.text();
          if (body.includes('emailMarketingCampaignCreate')) {
            return HttpResponse.error();
          }
          return HttpResponse.json(shopifyProductsResponse);
        }),
      );

      const config = loadConfig();
      const shopifyClient = new ShopifyClient(config.shopify);
      const result = await shopifyClient.createEmailDraft({
        subject: 'Test',
        body: '<html>test</html>',
      });

      expect(result.fallback).toBe(true);
      expect(result.campaignId).toBeNull();
      expect(result.error).toBe('Email API unavailable');
    });
  });

  describe('MJML compilation edge cases', () => {
    it('invalid MJML throws an error', () => {
      expect(() => compileMjml('<mj-invalid>bad</mj-invalid>')).toThrow();
    });

    it('complex nested structure compiles successfully', () => {
      const complexMjml = `
<mjml>
  <mj-head>
    <mj-preview>Preview text</mj-preview>
    <mj-attributes>
      <mj-all font-family="Georgia, serif" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f5f0eb">
    <mj-section>
      <mj-column>
        <mj-text font-size="24px" font-weight="bold">Woodabu</mj-text>
      </mj-column>
    </mj-section>
    <mj-section>
      <mj-column width="50%">
        <mj-image src="https://cdn.shopify.com/test.jpg" alt="Product" width="250px" />
      </mj-column>
      <mj-column width="50%">
        <mj-text>Product description</mj-text>
        <mj-button href="https://woodabu.com" background-color="#8B6914">Shop now</mj-button>
      </mj-column>
    </mj-section>
    <mj-section>
      <mj-column>
        <mj-divider border-color="#8B6914" />
        <mj-text font-size="12px" color="#999">Footer</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

      const html = compileMjml(complexMjml);
      expect(html).toContain('<!doctype html>');
      expect(html).toContain('Woodabu');
      expect(html).toContain('Product description');
      expect(html).toContain('Shop now');
    });

    it('XSS content is escaped in generated HTML output', () => {
      const xssProduct: EmailProduct = {
        title: '<script>alert("xss")</script>',
        price: '100',
        imageUrl: 'https://cdn.shopify.com/safe.jpg',
        url: 'https://woodabu.com/product',
      };

      const result = generateEmailHtml({
        subject: 'Test XSS',
        preheader: 'Safe preview',
        bodyMjml: `
          <mj-section>
            <mj-column>
              <mj-text>Body text</mj-text>
            </mj-column>
          </mj-section>`,
        products: [xssProduct],
      });

      // The <script> tag should be escaped, not present as raw HTML
      expect(result.html).not.toContain('<script>alert("xss")</script>');
      expect(result.html).toContain('&lt;script&gt;');
    });

    it('javascript: protocol URLs are sanitized to #', () => {
      const dangerousProduct: EmailProduct = {
        title: 'Safe Title',
        price: '100',
        imageUrl: 'javascript:alert(1)',
        url: 'javascript:alert(2)',
      };

      const result = generateEmailHtml({
        subject: 'Test',
        preheader: 'Preview',
        bodyMjml: `
          <mj-section>
            <mj-column>
              <mj-text>Body</mj-text>
            </mj-column>
          </mj-section>`,
        products: [dangerousProduct],
      });

      // javascript: URLs should be replaced with #
      expect(result.html).not.toContain('javascript:');
    });

    it('generateEmailHtml escapes preheader content', () => {
      const result = generateEmailHtml({
        subject: 'Test',
        preheader: 'Text with <html> & "quotes"',
        bodyMjml: `
          <mj-section>
            <mj-column>
              <mj-text>Body</mj-text>
            </mj-column>
          </mj-section>`,
        products: [],
      });

      // escapeHtml should have converted & to &amp;
      expect(result.html).toContain('&amp;');
      // Raw <html> inside preheader should be escaped
      expect(result.html).not.toContain('Text with <html>');
    });
  });
});
