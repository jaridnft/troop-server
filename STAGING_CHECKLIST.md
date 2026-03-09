# Heroku Staging Smoke Test Checklist

## 1) Deploy and boot

- Create a Heroku app for staging.
- Provision Heroku Postgres and ensure the add-on status is available.
- Set app config vars: `NODE_ENV=production`, `LICENSE_MODE=mock`, `whiteList=[]`, `partnerId`, `partnerToken`.
- Deploy the app and confirm dyno state is `up`.
- In web logs, confirm there is no startup error from `initDb()`.

## 2) License endpoint (mock mode)

- Ensure `LICENSE_MODE=mock` is set on the Heroku app.
- Open:
  - `https://<staging-host>/?shop=store.myshopify.com&theme=origin`
  - `https://<staging-host>/?shop=store.myshopify.com&theme=unlicensed`
- Expected:
  - First response has `"purchased": true`.
  - Second response has `"purchased": false`.

## 3) Analytics script load

- Open `https://<staging-host>/analytics.js` in browser.
- Expected: JavaScript file is served with HTTP 200.

## 4) Data path request test

- Send a first insert:

```bash
curl -i -X POST "https://<staging-host>/data" \
  -H "Origin: https://admin.shopify.com" \
  -H "Content-Type: application/json" \
  --data '{
    "merchant": {"email": "merchant@example.com"},
    "store": {"shopify_id": "12345", "domain": "example.myshopify.com"},
    "theme": {"shopify_id": "100", "name": "Origin", "role": "main"}
  }'
```

- Send the same payload again.
- Expected:
  - First response: `201` with created flags true/false based on inserts.
  - Repeat response: `200` with all created flags false.

## 5) Log visibility

- In Heroku logs, confirm structured events appear:
  - `data_ingest_processed`
  - `data_ingest_rejected_invalid_payload` (if you send a bad body)
  - `data_ingest_rejected_input_error` (if validation fails)
  - `data_ingest_failed` (unexpected errors)
  - `cors_rejected_origin` (if Origin is not Shopify)

## 6) DB row verification

- In Heroku Postgres shell (`heroku pg:psql`), verify rows were written:
  - `SELECT COUNT(*) FROM merchants;`
  - `SELECT COUNT(*) FROM stores;`
  - `SELECT COUNT(*) FROM store_themes;`
