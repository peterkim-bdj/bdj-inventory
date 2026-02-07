import type { ShopifyProduct } from './types';

const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, query: "status:active") {
      edges {
        node {
          id
          title
          descriptionHtml
          vendor
          productType
          status
          featuredImage {
            url
          }
          variants(first: 100) {
            edges {
              node {
                id
                sku
                barcode
                price
                compareAtPrice
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export interface ShopifyClientConfig {
  domain: string;
  accessToken: string;
  apiVersion: string;
}

export class ShopifyApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
  ) {
    super(message);
    this.name = 'ShopifyApiError';
  }
}

async function graphqlRequest(
  config: ShopifyClientConfig,
  query: string,
  variables: Record<string, unknown>,
  retries = 3,
): Promise<unknown> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(
      `https://${config.domain}/admin/api/${config.apiVersion}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': config.accessToken,
        },
        body: JSON.stringify({ query, variables }),
      },
    );

    if (response.status === 401) {
      throw new ShopifyApiError(
        'Invalid access token',
        401,
        'SHOPIFY_AUTH_FAILED',
      );
    }

    if (response.status === 429) {
      if (attempt < retries - 1) {
        const retryAfter = Number(response.headers.get('Retry-After') || '2');
        await new Promise((r) => setTimeout(r, retryAfter * 1000 * (attempt + 1)));
        continue;
      }
      throw new ShopifyApiError(
        'Rate limited by Shopify',
        429,
        'SHOPIFY_RATE_LIMIT',
      );
    }

    if (response.status >= 500) {
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw new ShopifyApiError(
        `Shopify server error: ${response.status}`,
        response.status,
        'SHOPIFY_API_ERROR',
      );
    }

    if (!response.ok) {
      throw new ShopifyApiError(
        `Shopify API error: ${response.status}`,
        response.status,
        'SHOPIFY_API_ERROR',
      );
    }

    const data = await response.json();

    if (data.errors) {
      throw new ShopifyApiError(
        data.errors[0]?.message ?? 'GraphQL error',
        200,
        'SHOPIFY_API_ERROR',
      );
    }

    return data.data;
  }

  throw new ShopifyApiError('Max retries exceeded', 0, 'SHOPIFY_API_ERROR');
}

export async function fetchAllProducts(
  config: ShopifyClientConfig,
): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const data = (await graphqlRequest(config, PRODUCTS_QUERY, {
      first: 50,
      after: cursor,
    })) as {
      products: {
        edges: Array<{ node: ShopifyProduct; cursor: string }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    };

    const { edges, pageInfo } = data.products;

    for (const edge of edges) {
      products.push(edge.node);
    }

    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  }

  return products;
}
