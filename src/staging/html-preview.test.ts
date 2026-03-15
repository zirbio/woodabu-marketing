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

describe('XSS prevention via generateEmailHtml', () => {
  const baseInput = (products: Array<{title: string; price: string; imageUrl: string; url: string}>) => ({
    subject: 'Test',
    preheader: 'Preview',
    bodyMjml: '<mj-section><mj-column><mj-text>Content</mj-text></mj-column></mj-section>',
    products,
  });

  it('escapes <script> in product titles', () => {
    const result = generateEmailHtml(baseInput([
      { title: '<script>alert("xss")</script>', price: '100', imageUrl: 'https://example.com/img.jpg', url: 'https://example.com' },
    ]));
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('&lt;script&gt;');
  });

  it('escapes <img onerror> in product titles', () => {
    const result = generateEmailHtml(baseInput([
      { title: '<img onerror=alert(1)>', price: '100', imageUrl: 'https://example.com/img.jpg', url: 'https://example.com' },
    ]));
    expect(result.html).not.toContain('<img onerror');
    expect(result.html).toContain('&lt;img');
  });

  it('escapes HTML in product prices', () => {
    const result = generateEmailHtml(baseInput([
      { title: 'Mesa', price: '<b>100</b>', imageUrl: 'https://example.com/img.jpg', url: 'https://example.com' },
    ]));
    expect(result.html).not.toContain('<b>100</b>');
  });

  it('escapes HTML in preheader text', () => {
    const result = generateEmailHtml({
      subject: 'Test',
      preheader: '<script>alert(1)</script>',
      bodyMjml: '<mj-section><mj-column><mj-text>Content</mj-text></mj-column></mj-section>',
      products: [],
    });
    expect(result.html).not.toContain('<script>alert(1)</script>');
  });

  it('handles nested injection attempts', () => {
    const result = generateEmailHtml(baseInput([
      { title: '"><script>alert(1)</script>', price: '100', imageUrl: 'https://example.com/img.jpg', url: 'https://example.com' },
    ]));
    expect(result.html).not.toContain('<script>');
  });

  it('handles SVG injection', () => {
    const result = generateEmailHtml(baseInput([
      { title: '<svg onload=alert(1)>', price: '100', imageUrl: 'https://example.com/img.jpg', url: 'https://example.com' },
    ]));
    expect(result.html).not.toContain('<svg');
  });
});

describe('URL validation via generateEmailHtml', () => {
  const baseInput = (url: string) => ({
    subject: 'Test',
    preheader: 'Preview',
    bodyMjml: '<mj-section><mj-column><mj-text>Content</mj-text></mj-column></mj-section>',
    products: [{ title: 'Mesa', price: '100', imageUrl: 'https://example.com/img.jpg', url }],
  });

  it('accepts https URLs', () => {
    const result = generateEmailHtml(baseInput('https://woodabu.com/mesa'));
    expect(result.html).toContain('woodabu.com');
  });

  it('accepts http URLs', () => {
    const result = generateEmailHtml(baseInput('http://woodabu.com/mesa'));
    expect(result.html).toContain('woodabu.com');
  });

  it('rejects javascript: protocol → uses #', () => {
    const result = generateEmailHtml(baseInput('javascript:alert(1)'));
    expect(result.html).not.toContain('javascript:');
  });

  it('rejects data: protocol → uses #', () => {
    const result = generateEmailHtml(baseInput('data:text/html,<h1>test</h1>'));
    expect(result.html).not.toContain('data:text');
  });

  it('rejects empty string → uses #', () => {
    const result = generateEmailHtml(baseInput(''));
    // Empty URL fails new URL() → returns '#'
    expect(result.html).toContain('#');
  });
});

describe('generateEmailHtml — edge cases', () => {
  it('generates email without product cards when products = []', () => {
    const result = generateEmailHtml({
      subject: 'Test',
      preheader: 'Preview',
      bodyMjml: '<mj-section><mj-column><mj-text>Main content</mj-text></mj-column></mj-section>',
      products: [],
    });
    expect(result.html).toContain('Main content');
    expect(result.html).not.toContain('Ver producto');
  });

  it('renders multiple product cards', () => {
    const result = generateEmailHtml({
      subject: 'Test',
      preheader: 'Preview',
      bodyMjml: '<mj-section><mj-column><mj-text>Intro</mj-text></mj-column></mj-section>',
      products: [
        { title: 'Mesa', price: '899', imageUrl: 'https://example.com/a.jpg', url: 'https://example.com/a' },
        { title: 'Silla', price: '499', imageUrl: 'https://example.com/b.jpg', url: 'https://example.com/b' },
        { title: 'Banco', price: '299', imageUrl: 'https://example.com/c.jpg', url: 'https://example.com/c' },
      ],
    });
    expect(result.html).toContain('Mesa');
    expect(result.html).toContain('Silla');
    expect(result.html).toContain('Banco');
  });

  it('includes preheader in HTML', () => {
    const result = generateEmailHtml({
      subject: 'Test',
      preheader: 'Special preview text',
      bodyMjml: '<mj-section><mj-column><mj-text>Content</mj-text></mj-column></mj-section>',
      products: [],
    });
    expect(result.html).toContain('Special preview text');
  });

  it('includes font-family Georgia', () => {
    const result = generateEmailHtml({
      subject: 'Test',
      preheader: 'Preview',
      bodyMjml: '<mj-section><mj-column><mj-text>Content</mj-text></mj-column></mj-section>',
      products: [],
    });
    expect(result.html).toContain('Georgia');
  });

  it('includes background-color #f5f0eb', () => {
    const result = generateEmailHtml({
      subject: 'Test',
      preheader: 'Preview',
      bodyMjml: '<mj-section><mj-column><mj-text>Content</mj-text></mj-column></mj-section>',
      products: [],
    });
    expect(result.html).toContain('#f5f0eb');
  });
});

describe('compileMjml — edge cases', () => {
  it('compiles complex nested structure', () => {
    const mjml = `<mjml>
      <mj-body>
        <mj-section>
          <mj-column>
            <mj-text>Header</mj-text>
            <mj-image src="https://example.com/img.jpg" />
            <mj-button href="https://example.com">Click</mj-button>
          </mj-column>
        </mj-section>
        <mj-section>
          <mj-column><mj-text>Footer</mj-text></mj-column>
        </mj-section>
      </mj-body>
    </mjml>`;
    const html = compileMjml(mjml);
    expect(html).toContain('Header');
    expect(html).toContain('Footer');
    expect(html).toContain('Click');
  });

  it('throws descriptive error on invalid MJML', () => {
    expect(() => compileMjml('<mjml><invalid-tag>oops</invalid-tag></mjml>')).toThrow();
  });
});

describe('XSS prevention', () => {
  it('escapes HTML in product titles', () => {
    const result = generateEmailHtml({
      subject: 'Test',
      preheader: 'Preview',
      bodyMjml: '<mj-section><mj-column><mj-text>Body</mj-text></mj-column></mj-section>',
      products: [{ title: '<script>alert("xss")</script>', price: '100', imageUrl: 'https://example.com/img.jpg', url: 'https://example.com' }],
    });
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('&lt;script&gt;');
  });

  it('escapes HTML in preheader', () => {
    const result = generateEmailHtml({
      subject: 'Test',
      preheader: '<img src=x onerror=alert(1)>',
      bodyMjml: '<mj-section><mj-column><mj-text>Body</mj-text></mj-column></mj-section>',
      products: [],
    });
    expect(result.html).not.toContain('<img src=x onerror');
    expect(result.html).toContain('&lt;img');
  });

  it('rejects javascript: URLs in products', () => {
    const result = generateEmailHtml({
      subject: 'Test',
      preheader: 'Preview',
      bodyMjml: '<mj-section><mj-column><mj-text>Body</mj-text></mj-column></mj-section>',
      products: [{ title: 'Product', price: '100', imageUrl: 'javascript:alert(1)', url: 'javascript:void(0)' }],
    });
    expect(result.html).not.toContain('javascript:');
  });
});
