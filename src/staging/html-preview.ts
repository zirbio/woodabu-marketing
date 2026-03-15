import mjml2html from 'mjml';

export interface EmailProduct {
  title: string;
  price: string;
  imageUrl: string;
  url: string;
}

export interface EmailInput {
  subject: string;
  preheader: string;
  bodyMjml: string;
  products: EmailProduct[];
}

export function compileMjml(mjmlContent: string): string {
  const result = mjml2html(mjmlContent, { validationLevel: 'strict' });
  if (result.errors.length > 0) {
    throw new Error(`MJML compilation errors: ${result.errors.map((e) => e.message).join(', ')}`);
  }
  return result.html;
}

function productCardsMjml(products: EmailProduct[]): string {
  return products
    .map(
      (p) => `
    <mj-section>
      <mj-column>
        <mj-image src="${p.imageUrl}" alt="${p.title}" width="300px" />
        <mj-text font-size="18px" font-weight="bold">${p.title}</mj-text>
        <mj-text font-size="16px" color="#8B6914">${p.price} &euro;</mj-text>
        <mj-button href="${p.url}" background-color="#8B6914">Ver producto</mj-button>
      </mj-column>
    </mj-section>`
    )
    .join('\n');
}

export function generateEmailHtml(input: EmailInput): { html: string; subject: string } {
  const fullMjml = `
<mjml>
  <mj-head>
    <mj-preview>${input.preheader}</mj-preview>
    <mj-attributes>
      <mj-all font-family="Georgia, serif" />
      <mj-text font-size="16px" line-height="1.6" color="#333333" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f5f0eb">
    ${input.bodyMjml}
    ${input.products.length > 0 ? productCardsMjml(input.products) : ''}
  </mj-body>
</mjml>`;

  return {
    html: compileMjml(fullMjml),
    subject: input.subject,
  };
}
