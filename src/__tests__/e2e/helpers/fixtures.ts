// Typed mock data replicating real API responses for E2E tests

// ─── Meta API Fixtures ───────────────────────────────────────
export const metaInsightsResponse = {
  data: [
    { campaign_id: 'c1', campaign_name: 'Spring Sale', impressions: '12000', clicks: '600', ctr: '0.05', spend: '250.00', actions: [{ action_type: 'purchase', value: '15' }, { action_type: 'link_click', value: '200' }] },
    { campaign_id: 'c2', campaign_name: 'Summer Promo', impressions: '8000', clicks: '320', ctr: '0.04', spend: '180.00', actions: [{ action_type: 'purchase', value: '8' }] },
    { campaign_id: 'c3', campaign_name: 'Brand Awareness', impressions: '25000', clicks: '500', ctr: '0.02', spend: '300.00', actions: [{ action_type: 'link_click', value: '150' }] },
  ],
};

export const metaInsightsEmptyResponse = { data: [] };

export const metaCreateAdResponse = { id: 'ad_e2e_789' };

export const metaSchedulePostResponse = { id: 'post_e2e_999' };

export const metaPageInsightsResponse = {
  data: [
    { name: 'page_impressions', values: [{ value: 15000 }] },
    { name: 'page_engaged_users', values: [{ value: 3200 }] },
  ],
};

// ─── Shopify API Fixtures ────────────────────────────────────
export const shopifyProductsResponse = {
  data: {
    products: {
      edges: [
        { node: { id: 'gid://shopify/Product/1', title: 'Mesa Roble Macizo', handle: 'mesa-roble-macizo', description: 'Mesa de comedor de roble macizo sostenible', images: { edges: [{ node: { url: 'https://cdn.shopify.com/mesa-roble.jpg' } }] }, variants: { edges: [{ node: { price: '1299.00' } }] } } },
        { node: { id: 'gid://shopify/Product/2', title: 'Cabecero Castaño', handle: 'cabecero-castano', description: 'Cabecero tallado en madera de castaño', images: { edges: [{ node: { url: 'https://cdn.shopify.com/cabecero.jpg' } }] }, variants: { edges: [{ node: { price: '749.00' } }] } } },
        { node: { id: 'gid://shopify/Product/3', title: 'Estantería Pino', handle: 'estanteria-pino', description: 'Estantería modular de pino reciclado', images: { edges: [{ node: { url: 'https://cdn.shopify.com/estanteria.jpg' } }] }, variants: { edges: [{ node: { price: '449.00' } }] } } },
      ],
    },
  },
};

export const shopifyProductsEmptyResponse = {
  data: { products: { edges: [] } },
};

export const shopifyOrdersResponse = {
  data: {
    orders: {
      edges: [
        { node: { id: 'gid://shopify/Order/1', totalPriceSet: { shopMoney: { amount: '1299.00' } }, lineItems: { edges: [{ node: { title: 'Mesa Roble Macizo', quantity: 1 } }] } } },
        { node: { id: 'gid://shopify/Order/2', totalPriceSet: { shopMoney: { amount: '1498.00' } }, lineItems: { edges: [{ node: { title: 'Cabecero Castaño', quantity: 2 } }] } } },
      ],
    },
  },
};

export const shopifySegmentsResponse = {
  data: {
    segments: {
      edges: [
        { node: { id: 'gid://shopify/Segment/1', name: 'Repeat buyers', query: 'orders_count > 1' } },
        { node: { id: 'gid://shopify/Segment/2', name: 'New customers', query: 'orders_count = 1' } },
        { node: { id: 'gid://shopify/Segment/3', name: 'High value', query: 'total_spent > 1000' } },
      ],
    },
  },
};

export const shopifySegmentsEmptyResponse = {
  data: { segments: { edges: [] } },
};

export const shopifyEmailSuccessResponse = {
  data: {
    emailMarketingCampaignCreate: {
      emailMarketingCampaign: { id: 'gid://shopify/EmailCampaign/e2e_1' },
      userErrors: [],
    },
  },
};

export const shopifyEmailUserErrorResponse = {
  data: {
    emailMarketingCampaignCreate: {
      emailMarketingCampaign: null,
      userErrors: [{ message: 'Feature not available on this plan', field: ['input'] }],
    },
  },
};

// ─── GA4 API Fixtures ────────────────────────────────────────
export const ga4TrafficResponse = [
  {
    rows: [
      { dimensionValues: [{ value: 'Organic Search' }, { value: '20260315' }], metricValues: [{ value: '2500' }, { value: '75' }, { value: '3.0' }] },
      { dimensionValues: [{ value: 'Paid Search' }, { value: '20260315' }], metricValues: [{ value: '1200' }, { value: '48' }, { value: '4.0' }] },
      { dimensionValues: [{ value: 'Social' }, { value: '20260315' }], metricValues: [{ value: '800' }, { value: '20' }, { value: '2.5' }] },
      { dimensionValues: [{ value: 'Direct' }, { value: '20260315' }], metricValues: [{ value: '600' }, { value: '15' }, { value: '2.5' }] },
    ],
  },
];

export const ga4EmptyResponse = [{ rows: undefined }];

// ─── Google Ads API Fixtures ─────────────────────────────────
export const googleAdsPerformanceRows = [
  { ad_group_ad: { ad: { id: '1', responsive_search_ad: { headlines: [{ text: 'Muebles Sostenibles' }, { text: 'Madera Maciza' }] } } }, metrics: { clicks: 250, impressions: 5000, ctr: 0.05, cost_micros: 12500000, conversions: 12 }, campaign: { id: 'c1', name: 'Brand Search' } },
  { ad_group_ad: { ad: { id: '2', responsive_search_ad: { headlines: [{ text: 'Mesa Roble' }] } } }, metrics: { clicks: 180, impressions: 4000, ctr: 0.045, cost_micros: 9000000, conversions: 8 }, campaign: { id: 'c1', name: 'Brand Search' } },
  { ad_group_ad: { ad: { id: '3', responsive_search_ad: { headlines: [{ text: 'Envío Gratis' }] } } }, metrics: { clicks: 300, impressions: 8000, ctr: 0.0375, cost_micros: 15000000, conversions: 15 }, campaign: { id: 'c2', name: 'Generic Furniture' } },
  { ad_group_ad: { ad: { id: '4', responsive_search_ad: { headlines: [{ text: 'Descuento 20%' }] } } }, metrics: { clicks: 50, impressions: 3000, ctr: 0.0167, cost_micros: 2500000, conversions: 2 }, campaign: { id: 'c2', name: 'Generic Furniture' } },
  { ad_group_ad: { ad: { id: '5' } }, metrics: { clicks: 10, impressions: 500, ctr: 0.02, cost_micros: 500000, conversions: 0 }, campaign: { id: 'c2', name: 'Generic Furniture' } },
];

export const googleAdsMutateResponse = {
  results: [{ resource_name: 'customers/123/adGroupAds/e2e_456' }],
};

export const googleAdsMutateAltResponse = {
  mutate_operation_responses: [{ ad_group_ad_result: { resource_name: 'customers/123/adGroupAds/e2e_789' } }],
};

// ─── RSA Fixtures ────────────────────────────────────────────
export const validHeadlines15 = [
  'Muebles hechos a mano',
  'Madera maciza sostenible',
  'Diseño español único',
  'Envío gratis península',
  'Garantía de por vida',
  'Artesanía en madera',
  'Mesa roble macizo',
  'Cabecero castaño',
  'Estantería modular',
  'Banco de jardín',
  'Escritorio nogal',
  'Silla ergonómica',
  'Cómoda cerezo',
  'Mesita auxiliar',
  'Perchero entrada',
];

export const validDescriptions4 = [
  'Muebles de madera maciza hechos a mano en Madrid con garantía de por vida',
  'Diseño artesanal sostenible para tu hogar. Materiales certificados FSC',
  'Cada pieza es única y personalizable según tus necesidades y espacio',
  'Compra ahora con envío gratis a toda la península y devolución fácil',
];

export const headlinesWith3Invalid = [
  ...validHeadlines15.slice(0, 12),
  'Este headline es demasiado largo para Google Ads',
  'Otro headline excesivamente largo para validar',
  'Un tercer headline que supera el máximo de chars',
];

// ─── Email Fixtures ──────────────────────────────────────────
export const emailProducts = [
  { title: 'Mesa Roble Macizo', price: '1299.00', imageUrl: 'https://cdn.shopify.com/mesa-roble.jpg', url: 'https://woodabu.com/mesa-roble-macizo' },
  { title: 'Cabecero Castaño', price: '749.00', imageUrl: 'https://cdn.shopify.com/cabecero.jpg', url: 'https://woodabu.com/cabecero-castano' },
];

// ─── Insight Report Fixtures ─────────────────────────────────
export const sampleInsightReport = {
  date: '2026-03-15',
  type: 'weekly' as const,
  channels: {
    google_ads: {
      top_performers: [{ id: 'ad_1', headline: 'Muebles Sostenibles', ctr: 0.05, roas: 3.2 }],
      patterns: ['High CTR on brand terms', 'Low CPC on weekends'],
    },
    meta: {
      top_performers: [{ id: 'ad_2', text: 'Post about sustainability', engagement_rate: 0.08, reach: 15000 }],
      patterns: ['Sustainability content performs best'],
    },
  },
  recommendations: [
    { action: 'increase_budget', target: 'google_ads_brand', reason: 'ROAS > 3.0' },
    { action: 'create_similar', target: 'meta_sustainability', reason: 'High engagement' },
  ],
};

export const sampleInsightReportMinimal = {
  date: '2026-03-08',
  type: 'weekly' as const,
  channels: {},
  recommendations: [],
};
