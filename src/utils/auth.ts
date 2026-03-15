export interface AppConfig {
  shopify: {
    storeDomain: string;
    accessToken: string;
  };
  meta: {
    systemUserToken: string;
    tokenExpiry: string;
    adAccountId: string;
    pageId: string;
    pageAccessToken: string;
  };
  googleAds: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    developerToken: string;
    customerId: string;
  };
  ga4: {
    propertyId: string;
    serviceAccountKeyPath: string;
  };
}

export interface TokenExpiryCheck {
  status: 'ok' | 'warning' | 'expired';
  daysRemaining: number;
  message?: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  return {
    shopify: {
      storeDomain: requireEnv('SHOPIFY_STORE_DOMAIN'),
      accessToken: requireEnv('SHOPIFY_ACCESS_TOKEN'),
    },
    meta: {
      systemUserToken: requireEnv('META_SYSTEM_USER_TOKEN'),
      tokenExpiry: requireEnv('META_TOKEN_EXPIRY'),
      adAccountId: requireEnv('META_AD_ACCOUNT_ID'),
      pageId: requireEnv('META_PAGE_ID'),
      pageAccessToken: requireEnv('META_PAGE_ACCESS_TOKEN'),
    },
    googleAds: {
      clientId: requireEnv('GOOGLE_ADS_CLIENT_ID'),
      clientSecret: requireEnv('GOOGLE_ADS_CLIENT_SECRET'),
      refreshToken: requireEnv('GOOGLE_ADS_REFRESH_TOKEN'),
      developerToken: requireEnv('GOOGLE_ADS_DEVELOPER_TOKEN'),
      customerId: requireEnv('GOOGLE_ADS_CUSTOMER_ID'),
    },
    ga4: {
      propertyId: requireEnv('GA4_PROPERTY_ID'),
      serviceAccountKeyPath: requireEnv('GA4_SERVICE_ACCOUNT_KEY_PATH'),
    },
  };
}

const WARN_DAYS = 7;

export function checkMetaTokenExpiry(expiryDate: string): TokenExpiryCheck {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return {
      status: 'expired',
      daysRemaining,
      message: `Meta token expired ${Math.abs(daysRemaining)} days ago. Renew at Meta Business App.`,
    };
  }

  if (daysRemaining <= WARN_DAYS) {
    return {
      status: 'warning',
      daysRemaining,
      message: `Meta token expires in ${daysRemaining} days. Renew soon at Meta Business App.`,
    };
  }

  return { status: 'ok', daysRemaining };
}
