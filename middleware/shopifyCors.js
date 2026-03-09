const ALLOWED_METHODS = 'POST, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type';

function isAllowedShopifyOrigin(origin) {
  if (!origin) {
    return false;
  }

  try {
    const { hostname } = new URL(origin);
    return hostname === 'shopify.com' || hostname.endsWith('.shopify.com');
  } catch (error) {
    return false;
  }
}

function applyCorsHeaders(res, origin) {
  res.set('Access-Control-Allow-Origin', origin);
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', ALLOWED_METHODS);
  res.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);
}

function shopifyCorsOnly(req, res, next) {
  const origin = req.get('origin');

  if (!isAllowedShopifyOrigin(origin)) {
    console.info(
      JSON.stringify({
        event: 'cors_rejected_origin',
        status: 403,
        path: req.originalUrl,
        method: req.method,
        origin: origin || null,
      }),
    );
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  applyCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
}

module.exports = {
  shopifyCorsOnly,
};
