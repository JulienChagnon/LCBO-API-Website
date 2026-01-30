# Get_Sloshed

A small JavaScript app that suggests cheap, interesting LCBO pairings based on a mixer you already have.

## Run it

Option 1: Open `public/index.html` directly in a browser.

Option 2: Use the included tiny server:

```
node server.js
```

Then open `http://localhost:5173`.

## Configure the LCBO API

Edit `public/config.js` and update `LCBO_API_BASE` to the base URL for your LCBO API instance. The app assumes these endpoints:

- `GET /products?q=term&per_page=30`
- `GET /stores?postal_code=XXXX&per_page=5`
- `GET /stores/:id/products?q=term&per_page=30`

If your API uses different paths or response shapes, tweak:

- `fetchProductsForTerm()`
- `fetchStoresByPostal()`
- `extractProducts()` / `extractStores()`

If the API is unavailable, the UI falls back to sample data so you can still test the flow.
