import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig, checkMetaTokenExpiry } from './auth.js';

describe('loadConfig', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('loads required config from env vars', () => {
    vi.stubEnv('SHOPIFY_STORE_DOMAIN', 'woodabu.myshopify.com');
    vi.stubEnv('SHOPIFY_ACCESS_TOKEN', 'shpat_xxx');
    vi.stubEnv('META_SYSTEM_USER_TOKEN', 'token123');
    vi.stubEnv('META_TOKEN_EXPIRY', '2026-05-15');
    vi.stubEnv('META_PAGE_ID', 'page123');
    vi.stubEnv('META_PAGE_ACCESS_TOKEN', 'pagetoken');
    vi.stubEnv('META_AD_ACCOUNT_ID', 'act_123');
    vi.stubEnv('GOOGLE_ADS_CLIENT_ID', 'gid');
    vi.stubEnv('GOOGLE_ADS_CLIENT_SECRET', 'gsecret');
    vi.stubEnv('GOOGLE_ADS_REFRESH_TOKEN', 'grefresh');
    vi.stubEnv('GOOGLE_ADS_DEVELOPER_TOKEN', 'gdev');
    vi.stubEnv('GOOGLE_ADS_CUSTOMER_ID', 'gcust');
    vi.stubEnv('GA4_PROPERTY_ID', 'prop123');
    vi.stubEnv('GA4_SERVICE_ACCOUNT_KEY_PATH', 'credentials/ga4-service-account.json');

    const config = loadConfig();
    expect(config.shopify.storeDomain).toBe('woodabu.myshopify.com');
    expect(config.meta.systemUserToken).toBe('token123');
    expect(config.googleAds.clientId).toBe('gid');
    expect(config.ga4.propertyId).toBe('prop123');
  });

  it('throws if required env var is missing', () => {
    expect(() => loadConfig()).toThrow();
  });
});

describe('checkMetaTokenExpiry', () => {
  it('returns ok when token expiry is > 7 days away', () => {
    vi.setSystemTime(new Date('2026-03-15'));
    const result = checkMetaTokenExpiry('2026-05-15');
    expect(result.status).toBe('ok');
  });

  it('returns warning when token expires within 7 days', () => {
    vi.setSystemTime(new Date('2026-05-10'));
    const result = checkMetaTokenExpiry('2026-05-15');
    expect(result.status).toBe('warning');
    expect(result.daysRemaining).toBe(5);
  });

  it('returns expired when token is past expiry', () => {
    vi.setSystemTime(new Date('2026-05-20'));
    const result = checkMetaTokenExpiry('2026-05-15');
    expect(result.status).toBe('expired');
  });
});
