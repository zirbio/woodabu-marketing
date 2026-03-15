import { vi } from 'vitest';

const ALL_ENV_VARS: Record<string, string> = {
  SHOPIFY_STORE_DOMAIN: 'woodabu-test.myshopify.com',
  SHOPIFY_ACCESS_TOKEN: 'shpat_e2e_test_token',
  META_SYSTEM_USER_TOKEN: 'sut_e2e_test_token',
  META_TOKEN_EXPIRY: '2026-12-31',
  META_AD_ACCOUNT_ID: 'act_e2e_123',
  META_PAGE_ID: 'page_e2e_456',
  META_PAGE_ACCESS_TOKEN: 'pat_e2e_test_token',
  GOOGLE_ADS_CLIENT_ID: 'gads_e2e_client_id',
  GOOGLE_ADS_CLIENT_SECRET: 'gads_e2e_client_secret',
  GOOGLE_ADS_REFRESH_TOKEN: 'gads_e2e_refresh_token',
  GOOGLE_ADS_DEVELOPER_TOKEN: 'gads_e2e_dev_token',
  GOOGLE_ADS_CUSTOMER_ID: 'gads_e2e_customer_123',
  GA4_PROPERTY_ID: 'properties/e2e_123',
  GA4_SERVICE_ACCOUNT_KEY_PATH: 'credentials/e2e-test.json',
};

export function stubAllEnvVars(): void {
  for (const [key, value] of Object.entries(ALL_ENV_VARS)) {
    vi.stubEnv(key, value);
  }
}

export function stubExpiredToken(): void {
  stubAllEnvVars();
  vi.stubEnv('META_TOKEN_EXPIRY', '2026-01-01');
}

export function stubWarningToken(): void {
  stubAllEnvVars();
  // Set expiry to within 7 days from a known reference
  const warn = new Date();
  warn.setDate(warn.getDate() + 5);
  vi.stubEnv('META_TOKEN_EXPIRY', warn.toISOString().slice(0, 10));
}

export function getEnvVarNames(): string[] {
  return Object.keys(ALL_ENV_VARS);
}

export { ALL_ENV_VARS };
