const https = require('https');
const { apiUrl, requestOptions, whiteList } = require('../config');

function getPostQuery(shopUrl) {
  return `{
    transactions(
      first: 10,
      myshopifyDomain: "${shopUrl}"
      types: [THEME_SALE]
    ) {
      edges {
        node {
          id
          __typename
          ... on ThemeSale {
            theme {
              name
            }
            shop {
              name
              myshopifyDomain
            }
          }
        }
      }
    }
  }`;
}

function postToAPI(shop) {
  let apiData = '';

  return new Promise((resolve, reject) => {
    const request = https.request(apiUrl, requestOptions, (response) => {
      response.on('error', reject);

      response.on('data', (chunk) => {
        apiData += chunk;
      });

      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Shopify API returned ${response.statusCode}`));
          return;
        }

        try {
          apiData = JSON.parse(apiData);
          resolve(apiData);
        } catch (error) {
          reject(new Error('Invalid JSON from Shopify API'));
        }
      });
    });

    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy(new Error('Shopify API request timed out'));
    });

    request.write(getPostQuery(shop));
    request.end();
  });
}

function validateResponse(data, queryStringTheme, querystringShop) {
  const edges = data?.data?.transactions?.edges;
  const queryResults = Array.isArray(edges) ? edges : [];
  let purchased = false;
  const normalizedTheme = queryStringTheme.toLowerCase();

  queryResults.forEach((queryResult) => {
    const themeName = queryResult?.node?.theme?.name?.toLowerCase();
    if (themeName === normalizedTheme) {
      purchased = true;
    }
  });

  whiteList.forEach((item) => {
    if (item.store == querystringShop && item.theme == normalizedTheme) {
      purchased = true;
    }
  });

  const result = {
    shop: querystringShop,
    theme: normalizedTheme,
    purchased,
  };

  return result;
}

async function evaluateLicense(shop, theme) {
  if (!shop || !theme) {
    throw new Error('Missing required query parameters: shop and theme');
  }

  const data = await postToAPI(shop);
  return validateResponse(data, theme, shop);
}

module.exports = {
  evaluateLicense,
};
