import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { vi } from 'vitest';
import {
  metaInsightsResponse,
  metaPageInsightsResponse,
  shopifyProductsResponse,
  shopifyOrdersResponse,
  shopifySegmentsResponse,
  ga4TrafficResponse,
  googleAdsPerformanceRows,
  googleAdsMutateResponse,
} from './fixtures.js';

const META_BASE = 'https://graph.facebook.com/v19.0';
const SHOPIFY_BASE = 'https://woodabu-test.myshopify.com/admin/api/2025-01/graphql.json';

const defaultHandlers = [
  // Meta handlers
  http.get(`${META_BASE}/:accountId/insights`, () =>
    HttpResponse.json(metaInsightsResponse),
  ),
  http.get(`${META_BASE}/:pageId/insights`, () =>
    HttpResponse.json(metaPageInsightsResponse),
  ),

  // Shopify handler — routes based on query content
  http.post(SHOPIFY_BASE, async ({ request }) => {
    const body = await request.text();
    if (body.includes('segments')) {
      return HttpResponse.json({
        data: {
          segments: shopifySegmentsResponse.data.segments,
        },
      });
    }
    if (body.includes('orders')) {
      return HttpResponse.json(shopifyOrdersResponse);
    }
    // Default: products
    return HttpResponse.json(shopifyProductsResponse);
  }),
];

export const server = setupServer(...defaultHandlers);

export function resetToDefaults(): void {
  server.resetHandlers();
}

// GA4 mock — vi.mock('@google-analytics/data')
export const ga4RunReportMock = vi.fn().mockResolvedValue(ga4TrafficResponse);

export function createGA4Mock() {
  return {
    BetaAnalyticsDataClient: vi.fn().mockImplementation(function () {
      return { runReport: ga4RunReportMock };
    }),
  };
}

// Google Ads mock — vi.mock('google-ads-api')
export const googleAdsReportMock = vi.fn().mockResolvedValue(googleAdsPerformanceRows);
export const googleAdsMutateMock = vi.fn().mockResolvedValue(googleAdsMutateResponse);

export function createGoogleAdsMock() {
  const mockCustomer = {
    report: googleAdsReportMock,
    mutateResources: googleAdsMutateMock,
    credentials: { customer_id: 'gads_e2e_customer_123' },
  };

  return {
    GoogleAdsApi: vi.fn().mockImplementation(function () {
      return {
        Customer: vi.fn().mockImplementation(function () {
          return mockCustomer;
        }),
      };
    }),
  };
}
