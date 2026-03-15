const API_VERSION = '2025-01';

export interface ShopifyConfig {
  storeDomain: string;
  accessToken: string;
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  imageUrl: string | null;
  price: string;
}

export interface Order {
  id: string;
  totalPrice: string;
  lineItems: Array<{ title: string; quantity: number }>;
}

export interface CustomerSegment {
  id: string;
  name: string;
  query: string;
}

export interface EmailDraftInput {
  subject: string;
  body: string;
}

export interface EmailDraftResult {
  campaignId: string | null;
  fallback: boolean;
  error?: string;
}

export class ShopifyClient {
  private readonly endpoint: string;
  private readonly headers: Record<string, string>;

  constructor(private readonly config: ShopifyConfig) {
    this.endpoint = `https://${config.storeDomain}/admin/api/${API_VERSION}/graphql.json`;
    this.headers = {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': config.accessToken,
    };
  }

  private async query(graphql: string, variables?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const body = variables ? { query: graphql, variables } : { query: graphql };
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Shopify API error: ${response.status}`);
    const json = await response.json() as { data: Record<string, unknown> | null; errors?: Array<{ message: string }> };
    if (json.errors && json.errors.length > 0) {
      throw new Error(`Shopify GraphQL error: ${json.errors.map((e) => e.message).join(', ')}`);
    }
    if (!json.data) {
      throw new Error('Shopify API returned null data');
    }
    return json.data;
  }

  async getProducts(first = 50): Promise<Product[]> {
    const safeFirst = Math.max(1, Math.min(250, Math.floor(first)));
    const data = await this.query(`{
      products(first: ${safeFirst}) {
        edges {
          node {
            id title handle description
            images(first: 1) { edges { node { url } } }
            variants(first: 1) { edges { node { price } } }
          }
        }
      }
    }`);

    const products = data.products as { edges: Array<{ node: Record<string, unknown> }> };
    return products.edges.map(({ node }) => {
      const images = node.images as { edges: Array<{ node: { url: string } }> };
      const variants = node.variants as { edges: Array<{ node: { price: string } }> };
      return {
        id: String(node.id),
        title: String(node.title),
        handle: String(node.handle),
        description: String(node.description),
        imageUrl: images.edges[0]?.node.url ?? null,
        price: variants.edges[0]?.node.price ?? '0',
      };
    });
  }

  async getRecentOrders(first = 50): Promise<Order[]> {
    const safeFirst = Math.max(1, Math.min(250, Math.floor(first)));
    const data = await this.query(`{
      orders(first: ${safeFirst}, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            totalPriceSet { shopMoney { amount } }
            lineItems(first: 10) { edges { node { title quantity } } }
          }
        }
      }
    }`);

    const orders = data.orders as { edges: Array<{ node: Record<string, unknown> }> };
    return orders.edges.map(({ node }) => {
      const priceSet = node.totalPriceSet as { shopMoney: { amount: string } };
      const items = node.lineItems as { edges: Array<{ node: { title: string; quantity: number } }> };
      return {
        id: String(node.id),
        totalPrice: priceSet.shopMoney.amount,
        lineItems: items.edges.map(({ node: li }) => ({ title: li.title, quantity: li.quantity })),
      };
    });
  }

  async getCustomerSegments(): Promise<CustomerSegment[]> {
    const data = await this.query(`{
      segments(first: 50) {
        edges {
          node { id name query }
        }
      }
    }`);

    const segments = data.segments as { edges: Array<{ node: { id: string; name: string; query: string } }> };
    return segments.edges.map(({ node }) => ({
      id: node.id,
      name: node.name,
      query: node.query,
    }));
  }

  async createEmailDraft(input: EmailDraftInput): Promise<EmailDraftResult> {
    try {
      const data = await this.query(
        `mutation CreateEmailDraft($subject: String!, $body: String!) {
          emailMarketingCampaignCreate(input: {
            subject: $subject
            body: $body
          }) {
            emailMarketingCampaign { id }
            userErrors { message field }
          }
        }`,
        { subject: input.subject, body: input.body }
      );

      const result = data.emailMarketingCampaignCreate as {
        emailMarketingCampaign: { id: string } | null;
        userErrors: Array<{ message: string; field: string[] }>;
      };

      if (result.userErrors.length > 0) {
        return {
          campaignId: null,
          fallback: true,
          error: result.userErrors.map((e) => e.message).join(', '),
        };
      }

      return {
        campaignId: result.emailMarketingCampaign?.id ?? null,
        fallback: false,
      };
    } catch {
      return { campaignId: null, fallback: true, error: 'Email API unavailable' };
    }
  }
}
