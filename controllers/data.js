const { InputError, persistDataPayload } = require('../services/data');

function getPayloadIdentifiers(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      storeShopifyId: null,
      themeShopifyId: null,
    };
  }

  return {
    storeShopifyId: payload.store?.shopify_id ?? payload.store?.id ?? null,
    themeShopifyId: payload.theme?.shopify_id ?? payload.theme?.id ?? null,
  };
}

function logDataIngest(eventName, details) {
  console.info(
    JSON.stringify({
      event: eventName,
      ...details,
    }),
  );
}

async function receiveData(req, res) {
  const payload = req.body;
  const { storeShopifyId, themeShopifyId } = getPayloadIdentifiers(payload);

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    logDataIngest('data_ingest_rejected_invalid_payload', {
      status: 400,
      path: req.originalUrl,
      method: req.method,
      storeShopifyId,
      themeShopifyId,
    });

    return res.status(400).json({
      error: 'Invalid payload. Expected a JSON object.',
    });
  }

  try {
    const {
      merchant,
      store,
      storeTheme,
      merchantCreated,
      storeCreated,
      storeThemeCreated,
    } = await persistDataPayload(payload);

    const statusCode = merchantCreated || storeCreated || storeThemeCreated ? 201 : 200;
    logDataIngest('data_ingest_processed', {
      status: statusCode,
      path: req.originalUrl,
      method: req.method,
      storeShopifyId: store?.shopify_id ?? storeShopifyId,
      themeShopifyId: storeTheme?.shopify_id ?? themeShopifyId,
      merchantCreated,
      storeCreated,
      storeThemeCreated,
    });

    return res.status(statusCode).json({
      accepted: true,
      message: 'Data payload processed.',
      merchantCreated,
      storeCreated,
      storeThemeCreated,
      merchant,
      store,
      storeTheme,
    });
  } catch (error) {
    if (error instanceof InputError) {
      logDataIngest('data_ingest_rejected_input_error', {
        status: error.statusCode,
        path: req.originalUrl,
        method: req.method,
        storeShopifyId,
        themeShopifyId,
        error: error.message,
      });

      return res.status(error.statusCode).json({ error: error.message });
    }

    logDataIngest('data_ingest_failed', {
      status: 500,
      path: req.originalUrl,
      method: req.method,
      storeShopifyId,
      themeShopifyId,
      error: error.message,
    });
    console.error('Error storing data payload:', error.message);
    return res.status(500).json({ error: 'Could not store data payload.' });
  }
}

module.exports = {
  receiveData,
};
