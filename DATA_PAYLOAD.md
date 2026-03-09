# `/data` Payload Contract

This document defines the Shopify Liquid payload shape for `POST /data`.

## Endpoint

- Method: `POST`
- Path: `/data`
- Content-Type: `application/json`
- CORS: only `shopify.com` and `*.shopify.com` origins are allowed.

## Hosted Frontend Script

You can host the frontend sender script from this app at:

- Path: `/analytics.js`

Theme include example:

```html
<script src="https://YOUR-API-HOST/analytics.js"></script>
```

## Target Payload Shape

Use this JSON shape from Liquid:

```json
{
  "merchant": {
    "email": "merchant@example.com"
  },
  "store": {
    "shopify_id": 123456789,
    "domain": "example.myshopify.com"
  },
  "theme": {
    "shopify_id": 987654321,
    "name": "Dawn",
    "version": "14.0.0",
    "preset": "default",
    "role": "main"
  }
}
```

## Shopify Liquid Example

```liquid
{%- capture data_payload -%}
{
  "merchant": {
    "email": {{ shop.email | json }}
  },
  "store": {
    "shopify_id": {{ shop.id | json }},
    "domain": {{ shop.domain | json }}
  },
  "theme": {
    "shopify_id": {{ theme.id | json }},
    "name": {{ theme.name | json }},
    "version": {{ theme.version | json }},
    "preset": {{ theme.preset | json }},
    "role": {{ theme.role | json }}
  }
}
{%- endcapture -%}
```

Example send:

```html
<script
  src="https://YOUR-API-HOST/analytics.js"
  data-json='{{ data_payload | strip_newlines | json }}'>
</script>
```

## Shopify Fields Used

- `shop.email`
- `shop.id`
- `shop.domain`
- `theme.id`
- `theme.name`
- `theme.version`
- `theme.preset`
- `theme.role`

## Backend Mapping

- Merchants are resolved by `merchant.email`.
- Stores are resolved by `store.shopify_id`.
- Theme records are resolved by `(store.shopify_id, theme.shopify_id)`.
- `theme.name`, `theme.version`, `theme.preset`, and `theme.role` are persisted for reference.

## Sample Query

```sql
SELECT
  m.email AS merchant_email,
  s.shopify_id AS store_shopify_id,
  s.domain AS store_domain,
  st.shopify_id AS theme_shopify_id,
  st.name AS theme_name,
  st.version AS theme_version,
  st.preset AS theme_preset,
  st.role AS theme_role
FROM merchants m
JOIN stores s ON s.merchant_id = m.id
JOIN store_themes st ON st.store_id = s.id
WHERE m.email = ?
ORDER BY s.shopify_id, st.shopify_id;
```
