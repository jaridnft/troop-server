const apiUrl = `https://partners.shopify.com/${process.env.partnerId}/api/unstable/graphql.json`;
const port = process.env.PORT || 8080;
const whiteList = JSON.parse(process.env.whiteList || '[]');
const licenseMode = (process.env.LICENSE_MODE || 'live').toLowerCase();

const requestOptions = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/graphql',
    'X-Shopify-Access-Token': `${process.env.partnerToken}`,
  },
};

module.exports = {
  apiUrl,
  port,
  requestOptions,
  whiteList,
  licenseMode,
};
