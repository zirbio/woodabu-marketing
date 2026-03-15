import { describe, it, expect } from 'vitest';
import { formatAdTable, formatPostPreview, formatEmailSummary } from '../../staging/reviewer.js';
import { formatWeeklySummary } from '../../analytics/aggregator.js';
import { generateEmailHtml } from '../../staging/html-preview.js';

describe('Output Snapshot Tests', () => {
  describe('formatAdTable snapshots', () => {
    it('headline table matches snapshot', () => {
      const output = formatAdTable(['Muebles hechos a mano', 'Madera maciza sostenible', 'Diseño español único'], 'headline');
      expect(output).toMatchSnapshot();
    });

    it('description table matches snapshot', () => {
      const output = formatAdTable(['Muebles de madera maciza hechos a mano con garantía de por vida', 'Diseño artesanal sostenible'], 'description');
      expect(output).toMatchSnapshot();
    });

    it('table with OVER/WARN/OK statuses matches snapshot', () => {
      const output = formatAdTable([
        'Short',                    // OK (5 chars)
        'A'.repeat(29),             // WARN (29 chars)
        'A'.repeat(31),             // OVER (31 chars)
      ], 'headline');
      expect(output).toMatchSnapshot();
    });
  });

  describe('formatPostPreview snapshots', () => {
    it('post with image matches snapshot', () => {
      const output = formatPostPreview({
        copy: 'Cada mesa tiene una historia única.',
        hashtags: ['#woodabu', '#maderanatural', '#sostenible'],
        scheduledTime: '2026-03-20 10:00',
        imageUrl: 'https://cdn.shopify.com/mesa.jpg',
      });
      expect(output).toMatchSnapshot();
    });

    it('post without image matches snapshot', () => {
      const output = formatPostPreview({
        copy: 'Artesanía en madera.',
        hashtags: ['#woodabu'],
        scheduledTime: '2026-03-21 14:00',
        imageUrl: null,
      });
      expect(output).toMatchSnapshot();
    });
  });

  describe('formatEmailSummary snapshots', () => {
    it('email summary with 3 subjects matches snapshot', () => {
      const output = formatEmailSummary({
        subjects: ['Nueva colección primavera', 'Diseños exclusivos de temporada', 'Tu hogar merece lo mejor'],
        segment: 'Repeat buyers',
        productCount: 4,
        preheader: 'Descubre nuestra nueva colección de primavera',
      });
      expect(output).toMatchSnapshot();
    });
  });

  describe('formatWeeklySummary snapshots', () => {
    it('weekly summary with 3 channels matches snapshot', () => {
      const output = formatWeeklySummary({
        totalSpend: 500.00,
        totalConversions: 35,
        channels: [
          { name: 'google_ads', spend: 300, conversions: 20, roas: 2.5 },
          { name: 'meta', spend: 200, conversions: 15, roas: 1.8 },
          { name: 'organic', spend: 0, conversions: 50, roas: null },
        ],
        topChannels: [
          { name: 'google_ads', spend: 300, conversions: 20, roas: 2.5 },
          { name: 'meta', spend: 200, conversions: 15, roas: 1.8 },
          { name: 'organic', spend: 0, conversions: 50, roas: null },
        ],
        bottomChannels: [],
        topContent: [{ name: 'Mesa Roble', metric: 'units_sold', value: 8 }],
        recommendations: ['Increase budget on google_ads — ROAS of 2.5'],
      });
      expect(output).toMatchSnapshot();
    });

    it('weekly summary with organic (N/A ROAS) matches snapshot', () => {
      const output = formatWeeklySummary({
        totalSpend: 0,
        totalConversions: 50,
        channels: [{ name: 'organic', spend: 0, conversions: 50, roas: null }],
        topChannels: [{ name: 'organic', spend: 0, conversions: 50, roas: null }],
        bottomChannels: [],
        topContent: [],
        recommendations: [],
      });
      expect(output).toMatchSnapshot();
    });

    it('weekly summary with recommendation matches snapshot', () => {
      const output = formatWeeklySummary({
        totalSpend: 100,
        totalConversions: 5,
        channels: [{ name: 'google_ads', spend: 100, conversions: 5, roas: 3.0 }],
        topChannels: [{ name: 'google_ads', spend: 100, conversions: 5, roas: 3.0 }],
        bottomChannels: [],
        topContent: [],
        recommendations: ['Increase budget on google_ads — ROAS of 3.0'],
      });
      expect(output).toMatchSnapshot();
    });
  });

  describe('generateEmailHtml snapshots', () => {
    it('email with 2 products matches snapshot', () => {
      const result = generateEmailHtml({
        subject: 'Nueva colección',
        preheader: 'Descubre lo nuevo',
        bodyMjml: '<mj-section><mj-column><mj-text>Hola! Mira nuestros nuevos productos.</mj-text></mj-column></mj-section>',
        products: [
          { title: 'Mesa Roble', price: '899.00', imageUrl: 'https://cdn.shopify.com/mesa.jpg', url: 'https://woodabu.com/mesa' },
          { title: 'Silla Pino', price: '349.00', imageUrl: 'https://cdn.shopify.com/silla.jpg', url: 'https://woodabu.com/silla' },
        ],
      });
      expect(result.subject).toBe('Nueva colección');
      expect(result.html).toMatchSnapshot();
    });

    it('email without products matches snapshot', () => {
      const result = generateEmailHtml({
        subject: 'Novedades',
        preheader: 'Información importante',
        bodyMjml: '<mj-section><mj-column><mj-text>Solo texto, sin productos.</mj-text></mj-column></mj-section>',
        products: [],
      });
      expect(result.html).toMatchSnapshot();
    });
  });
});
