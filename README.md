# Licenses Check: How It's Used

This check answers one simple question:

**"Has this store purchased this theme?"**

## Endpoint and parameters

- URL: `GET /`
- Required parameters:
  - `shop` (store domain, example: `example.myshopify.com`)
  - `theme` (theme name, example: `Dawn`)

Example request:

```bash
curl "https://YOUR-API-HOST/?shop=example.myshopify.com&theme=Dawn"
```

## What happens

A storefront sends the store and theme details to this service. The service then:
- Looks up recent Shopify theme purchase records for that store.
- Checks an internal allow-list used for exceptions or manual approvals.
- Returns a clear yes/no result (`purchased: true` or `false`).

In practice, this helps decide whether a shop should be treated as licensed for a specific theme.

## What is returned

The response includes:

- `shop`
- `theme` (lowercase)
- `purchased` (`true` or `false`)

Example response:

```json
{
  "shop": "example.myshopify.com",
  "theme": "dawn",
  "purchased": true
}
```

---

# `/data` POST: How `analytics.js` Is Loaded, What It Collects, and How Data Is Stored

## How `analytics.js` is loaded

The storefront includes a small script called `analytics.js` from this app.

When the page loads, that script runs automatically in the shop's theme.

- Script URL: `GET /analytics.js`

Theme include example:

```html
<script
  src="https://YOUR-API-HOST/analytics.js"
  data-json='{"merchant":{"email":"merchant@example.com"},"store":{"shopify_id":123456789,"domain":"example.myshopify.com"},"theme":{"shopify_id":987654321,"name":"Dawn","version":"14.0.0","preset":"default","role":"main"}}'>
</script>
```

## What information it gathers

The script reads theme/store details provided on the page and prepares a payload that usually includes:

- Merchant contact email
- Store ID and store domain
- Theme ID
- Optional theme details (name, version, preset, role)

It is designed to be lightweight and respectful:

- It skips sending if important required details are missing.
- It skips development themes.
- It avoids sending repeatedly all day by remembering the last successful send in the browser.

## Where the information goes

The script sends this payload to the app's data endpoint:

- URL: `POST /data`
- Required data to send:
  - merchant email
  - store Shopify ID
  - store domain
  - theme Shopify ID

Only approved Shopify origins are allowed to send to this endpoint.

## How it is stored in the database

When data arrives, the backend:

1. Validates that the payload is complete and usable.
2. Saves or updates the merchant record (by email).
3. Saves or updates the store record (by Shopify store ID).
4. Saves or updates the theme record for that store (by theme ID).

This means repeated sends keep records up to date instead of creating duplicates.

It also tracks when a theme moves from a demo state to a purchasable state, and records a purchase date when that transition happens.
