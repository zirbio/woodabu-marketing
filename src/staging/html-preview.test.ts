import { describe, it, expect } from 'vitest';
import { generateEmailHtml, compileMjml } from './html-preview.js';

describe('compileMjml', () => {
  it('compiles valid MJML to HTML', () => {
    const mjml = `<mjml><mj-body><mj-section><mj-column><mj-text>Hello</mj-text></mj-column></mj-section></mj-body></mjml>`;
    const html = compileMjml(mjml);
    expect(html).toContain('Hello');
    expect(html).toContain('<!doctype html>');
  });

  it('throws on invalid MJML', () => {
    expect(() => compileMjml('<invalid>')).toThrow();
  });
});

describe('generateEmailHtml', () => {
  it('generates email with subject, preheader, and body', () => {
    const result = generateEmailHtml({
      subject: 'Test Subject',
      preheader: 'Preview text',
      bodyMjml: '<mj-section><mj-column><mj-text>Content here</mj-text></mj-column></mj-section>',
      products: [{ title: 'Mesa Roble', price: '899.00', imageUrl: 'https://example.com/mesa.jpg', url: 'https://woodabu.com/mesa' }],
    });
    expect(result.html).toContain('Content here');
    expect(result.html).toContain('Mesa Roble');
    expect(result.html).not.toContain('<script');
  });

  it('includes product cards', () => {
    const result = generateEmailHtml({
      subject: 'Newsletter',
      preheader: 'New arrivals',
      bodyMjml: '<mj-section><mj-column><mj-text>Intro</mj-text></mj-column></mj-section>',
      products: [
        { title: 'Mesa Roble', price: '899.00', imageUrl: 'https://example.com/mesa.jpg', url: 'https://woodabu.com/mesa' },
        { title: 'Cabecero Castaño', price: '649.00', imageUrl: 'https://example.com/cab.jpg', url: 'https://woodabu.com/cabecero' },
      ],
    });
    expect(result.html).toContain('Mesa Roble');
    expect(result.html).toContain('Cabecero Castaño');
    expect(result.html).toContain('899');
  });
});
