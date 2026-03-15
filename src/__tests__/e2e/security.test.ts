import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTmpInsightsDir, cleanupTmpInsightsDir } from './helpers/tmp-insights-dir.js';
import { createGA4Mock, createGoogleAdsMock } from './helpers/msw-server.js';

vi.mock('@google-analytics/data', () => createGA4Mock());
vi.mock('google-ads-api', () => createGoogleAdsMock());

import { generateEmailHtml, type EmailInput } from '../../staging/html-preview.js';
import { ApiError } from '../../utils/api-retry.js';
import { InsightsStore, type InsightReport } from '../../analytics/insights-store.js';

function makeEmailInput(overrides: Partial<EmailInput> = {}): EmailInput {
  return {
    subject: 'Test Subject',
    preheader: overrides.preheader ?? 'Preview text',
    bodyMjml: '<mj-section><mj-column><mj-text>Hello</mj-text></mj-column></mj-section>',
    products: overrides.products ?? [
      {
        title: 'Mesa Roble',
        price: '1299',
        imageUrl: 'https://cdn.shopify.com/mesa.jpg',
        url: 'https://woodabu.com/mesa',
      },
    ],
    ...overrides,
  };
}

describe('Security — E2E', () => {
  describe('XSS in email HTML', () => {
    it('escapes <script> tags in product title', () => {
      const input = makeEmailInput({
        products: [
          {
            title: '<script>alert("xss")</script>',
            price: '999',
            imageUrl: 'https://cdn.shopify.com/img.jpg',
            url: 'https://woodabu.com/mesa',
          },
        ],
      });

      const result = generateEmailHtml(input);
      expect(result.html).not.toContain('<script>');
      expect(result.html).toContain('&lt;script&gt;');
    });

    it('escapes <img onerror> in product title', () => {
      const input = makeEmailInput({
        products: [
          {
            title: '<img onerror="alert(1)" src=x>',
            price: '999',
            imageUrl: 'https://cdn.shopify.com/img.jpg',
            url: 'https://woodabu.com/mesa',
          },
        ],
      });

      const result = generateEmailHtml(input);
      // The raw <img> tag must be escaped — no unescaped HTML tag injection
      expect(result.html).toContain('&lt;img');
      expect(result.html).toContain('&gt;');
      // The onerror handler is neutralized: quotes are escaped so it cannot break out of an attribute
      expect(result.html).toContain('&quot;alert(1)&quot;');
    });

    it('escapes event handler injection in product title', () => {
      const input = makeEmailInput({
        products: [
          {
            title: '" onmouseover="alert(1)',
            price: '999',
            imageUrl: 'https://cdn.shopify.com/img.jpg',
            url: 'https://woodabu.com/mesa',
          },
        ],
      });

      const result = generateEmailHtml(input);
      // Double quotes are escaped so injection cannot break out of attribute context
      expect(result.html).toContain('&quot; onmouseover=&quot;alert(1)');
      // The alt attribute should contain the escaped content, meaning the double quotes
      // that would break out of the attribute are entity-encoded
      expect(result.html).toContain('alt="&quot;');
      // No raw unescaped double-quote that would allow attribute injection
      expect(result.html).not.toContain('alt="" onmouseover=');
    });

    it('escapes double-quote in alt attributes', () => {
      const input = makeEmailInput({
        products: [
          {
            title: 'Mesa "Premium" Edition',
            price: '999',
            imageUrl: 'https://cdn.shopify.com/img.jpg',
            url: 'https://woodabu.com/mesa',
          },
        ],
      });

      const result = generateEmailHtml(input);
      // In the alt attribute, the quotes should be escaped
      expect(result.html).toContain('&quot;Premium&quot;');
    });

    it('escapes HTML in prices', () => {
      const input = makeEmailInput({
        products: [
          {
            title: 'Mesa',
            price: '<script>alert(1)</script>999',
            imageUrl: 'https://cdn.shopify.com/img.jpg',
            url: 'https://woodabu.com/mesa',
          },
        ],
      });

      const result = generateEmailHtml(input);
      expect(result.html).not.toContain('<script>alert(1)</script>999');
      expect(result.html).toContain('&lt;script&gt;');
    });

    it('escapes HTML in preheader', () => {
      const input = makeEmailInput({
        preheader: '<script>document.cookie</script>',
      });

      const result = generateEmailHtml(input);
      expect(result.html).not.toContain('<script>document.cookie</script>');
      expect(result.html).toContain('&lt;script&gt;');
    });

    it('escapes nested injection attempts', () => {
      const input = makeEmailInput({
        products: [
          {
            title: '"><script>alert(1)</script><a href="',
            price: '999',
            imageUrl: 'https://cdn.shopify.com/img.jpg',
            url: 'https://woodabu.com/mesa',
          },
        ],
      });

      const result = generateEmailHtml(input);
      expect(result.html).not.toContain('<script>alert(1)</script>');
    });

    it('escapes SVG injection in product title', () => {
      const input = makeEmailInput({
        products: [
          {
            title: '<svg onload="alert(1)">',
            price: '999',
            imageUrl: 'https://cdn.shopify.com/img.jpg',
            url: 'https://woodabu.com/mesa',
          },
        ],
      });

      const result = generateEmailHtml(input);
      expect(result.html).not.toContain('<svg');
      expect(result.html).toContain('&lt;svg');
    });

    it('escapes style injection in product title', () => {
      const input = makeEmailInput({
        products: [
          {
            title: '<style>body{background:red}</style>',
            price: '999',
            imageUrl: 'https://cdn.shopify.com/img.jpg',
            url: 'https://woodabu.com/mesa',
          },
        ],
      });

      const result = generateEmailHtml(input);
      expect(result.html).not.toContain('<style>body{background:red}</style>');
      expect(result.html).toContain('&lt;style&gt;');
    });

    it('handles empty string without error', () => {
      const input = makeEmailInput({
        products: [
          {
            title: '',
            price: '',
            imageUrl: 'https://cdn.shopify.com/img.jpg',
            url: 'https://woodabu.com/mesa',
          },
        ],
      });

      const result = generateEmailHtml(input);
      expect(result.html).toBeDefined();
      expect(typeof result.html).toBe('string');
    });
  });

  describe('URL validation', () => {
    it('accepts https URLs', () => {
      const input = makeEmailInput({
        products: [
          {
            title: 'Mesa',
            price: '999',
            imageUrl: 'https://cdn.shopify.com/img.jpg',
            url: 'https://woodabu.com/mesa',
          },
        ],
      });

      const result = generateEmailHtml(input);
      expect(result.html).toContain('cdn.shopify.com');
      expect(result.html).toContain('woodabu.com');
    });

    it('accepts http URLs', () => {
      const input = makeEmailInput({
        products: [
          {
            title: 'Mesa',
            price: '999',
            imageUrl: 'http://cdn.shopify.com/img.jpg',
            url: 'http://woodabu.com/mesa',
          },
        ],
      });

      const result = generateEmailHtml(input);
      expect(result.html).toContain('http://cdn.shopify.com');
    });

    it('rejects javascript: URLs', () => {
      const input = makeEmailInput({
        products: [
          {
            title: 'Mesa',
            price: '999',
            imageUrl: 'javascript:alert(1)',
            url: 'javascript:alert(document.cookie)',
          },
        ],
      });

      const result = generateEmailHtml(input);
      expect(result.html).not.toContain('javascript:');
      // validateUrl returns '#' for invalid protocols
      expect(result.html).toContain('#');
    });

    it('rejects data: URLs', () => {
      const input = makeEmailInput({
        products: [
          {
            title: 'Mesa',
            price: '999',
            imageUrl: 'data:text/html,<script>alert(1)</script>',
            url: 'data:text/html,<h1>hi</h1>',
          },
        ],
      });

      const result = generateEmailHtml(input);
      expect(result.html).not.toContain('data:text/html');
    });

    it('rejects ftp: URLs', () => {
      const input = makeEmailInput({
        products: [
          {
            title: 'Mesa',
            price: '999',
            imageUrl: 'ftp://evil.com/payload',
            url: 'ftp://evil.com/file',
          },
        ],
      });

      const result = generateEmailHtml(input);
      expect(result.html).not.toContain('ftp://');
    });

    it('rejects vbscript: URLs', () => {
      const input = makeEmailInput({
        products: [
          {
            title: 'Mesa',
            price: '999',
            imageUrl: 'vbscript:MsgBox("xss")',
            url: 'vbscript:MsgBox("xss")',
          },
        ],
      });

      const result = generateEmailHtml(input);
      expect(result.html).not.toContain('vbscript:');
    });

    it('rejects empty string URLs', () => {
      const input = makeEmailInput({
        products: [
          {
            title: 'Mesa',
            price: '999',
            imageUrl: '',
            url: '',
          },
        ],
      });

      const result = generateEmailHtml(input);
      // Empty string fails URL parsing → validateUrl returns '#'
      expect(result.html).toBeDefined();
    });

    it('rejects malformed URLs', () => {
      const input = makeEmailInput({
        products: [
          {
            title: 'Mesa',
            price: '999',
            imageUrl: 'not a url at all',
            url: '://broken',
          },
        ],
      });

      const result = generateEmailHtml(input);
      // Malformed URLs fall through to catch block → '#'
      expect(result.html).toBeDefined();
      expect(result.html).not.toContain('not a url at all');
    });

    it('escapes URL query params containing < >', () => {
      const input = makeEmailInput({
        products: [
          {
            title: 'Mesa',
            price: '999',
            imageUrl: 'https://cdn.shopify.com/img.jpg?tag=<script>',
            url: 'https://woodabu.com/mesa?q=<bold>',
          },
        ],
      });

      const result = generateEmailHtml(input);
      // The escapeHtml called on the URL should escape angle brackets
      expect(result.html).not.toContain('?tag=<script>');
      expect(result.html).toContain('&lt;script&gt;');
    });
  });

  describe('Token redaction in errors', () => {
    it('redacts access_token from URL', () => {
      const err = new ApiError('Request failed', 401, 'https://api.example.com/data?access_token=secret123');
      // URL class may encode brackets: [REDACTED] → %5BREDACTED%5D
      expect(err.url).not.toContain('secret123');
      expect(err.url).toMatch(/REDACTED/);
      expect(err.message).not.toContain('secret123');
      expect(err.message).toMatch(/REDACTED/);
    });

    it('redacts token from URL', () => {
      const err = new ApiError('Request failed', 401, 'https://api.example.com/data?token=mytoken456');
      expect(err.url).not.toContain('mytoken456');
      expect(err.url).toMatch(/REDACTED/);
    });

    it('redacts key from URL', () => {
      const err = new ApiError('Request failed', 403, 'https://api.example.com/data?key=apikey789');
      expect(err.url).not.toContain('apikey789');
      expect(err.url).toMatch(/REDACTED/);
    });

    it('redacts secret from URL', () => {
      const err = new ApiError('Request failed', 500, 'https://api.example.com/data?secret=topsecret');
      expect(err.url).not.toContain('topsecret');
      expect(err.url).toMatch(/REDACTED/);
    });

    it('preserves non-sensitive params (campaign_id)', () => {
      const err = new ApiError('Request failed', 404, 'https://api.example.com/data?campaign_id=camp_123&access_token=secret');
      expect(err.url).toContain('campaign_id=camp_123');
      expect(err.url).not.toContain('=secret');
    });

    it('redacts multiple sensitive params simultaneously', () => {
      const err = new ApiError(
        'Request failed',
        500,
        'https://api.example.com/data?access_token=tok1&key=key2&secret=sec3&token=tok4&campaign_id=safe',
      );
      expect(err.url).not.toContain('=tok1');
      expect(err.url).not.toContain('=key2');
      expect(err.url).not.toContain('=sec3');
      expect(err.url).not.toContain('=tok4');
      expect(err.url).toContain('campaign_id=safe');
      // 4 sensitive params → 4 REDACTED occurrences
      const redactedCount = (err.url.match(/REDACTED/g) || []).length;
      expect(redactedCount).toBe(4);
    });

    it('handles malformed URL without crash', () => {
      const err = new ApiError('Request failed', 500, 'not a valid url at all');
      // Should not throw — redactUrl catches the error and returns original
      expect(err.url).toBe('not a valid url at all');
      expect(err.statusCode).toBe(500);
    });
  });

  describe('Path traversal prevention', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = createTmpInsightsDir();
    });

    afterEach(() => {
      cleanupTmpInsightsDir();
    });

    it('rejects ../ in date field via regex validation', () => {
      const store = new InsightsStore(tmpDir);
      const report = {
        date: '../../../etc/passwd',
        type: 'weekly' as const,
        channels: {},
        recommendations: [],
      };

      expect(() => store.save(report)).toThrow('Invalid date format');
    });

    it('rejects type with invalid value via whitelist', () => {
      const store = new InsightsStore(tmpDir);
      const report = {
        date: '2026-03-15',
        type: '../../hack' as InsightReport['type'],
        channels: {},
        recommendations: [],
      };

      expect(() => store.save(report)).toThrow('Invalid report type');
    });
  });
});
