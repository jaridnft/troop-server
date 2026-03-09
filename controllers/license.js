const { evaluateLicense } = require('../services/license');

async function checkLicense(req, res) {
  const { shop, theme } = req.query;

  if (!shop || !theme) {
    return res.status(400).send('Missing required query parameters: shop and theme');
  }

  try {
    const validationOutcome = await evaluateLicense(shop, theme);
    res.send(validationOutcome);
  } catch (error) {
    res.send('Error with request to API');
    console.error('Error:', error.message);
  }
}

module.exports = {
  checkLicense,
};
