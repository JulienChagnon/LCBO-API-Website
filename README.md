# Get_Sloshed

A lightweight LCBO browser that ranks in-stock products by alcohol value using:

```
ABV% * mL
---------
    $
```

It helps you find the strongest bang-for-your-buck options by store, price range, and drink type.

**Run Locally**

Option 1: Open `public/index.html` directly in a browser.

Option 2: Use the tiny local server:

```bash
node server.js
```

Then open `http://localhost:5173`.

**Configuration**

By default, `server.js` serves the UI and exposes a small REST-ish `/api` layer backed by the public LCBO.dev GraphQL endpoint from `https://lcbo.dev/`.

To proxy `/api` to your own REST API instead:

```bash
LCBO_API_MODE=proxy LCBO_API_BASE=http://localhost:3000 node server.js
```

The UI reads its base URL from `public/config.js` as `LCBO_API_BASE` (default `/api`).

**API Contract**

The frontend expects these endpoints under `LCBO_API_BASE`:

- `GET /products?q=term&per_page=30`
- `GET /stores?postal_code=XXXX&per_page=5`
- `GET /stores/:id/products?q=term&per_page=30`

If your API uses different paths or response shapes, update:

- `fetchProductsForTerm()` in `public/app.js`
- `fetchStoresByPostal()` in `public/app.js`
- `extractProducts()` and `extractStores()` in `public/app.js`

If the API is unavailable, the UI falls back to sample data so you can still test the flow.

**Scripts**

- `npm start` or `node server.js` runs the local server.
- `npm run probe:lcbo` runs a basic LCBO connectivity probe (`tools/lcbo-probe.js`).
