const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const port = process.env.PORT || 5173;
const apiPrefix = '/api';
const apiMode = (process.env.LCBO_API_MODE || 'lcbodev').toLowerCase(); // 'lcbodev' | 'proxy'
const apiTarget = process.env.LCBO_API_BASE || 'http://localhost:3000'; // only used in proxy mode

const lcboGraphqlEndpoint = process.env.LCBO_GRAPHQL_ENDPOINT || 'https://api.lcbo.dev/graphql';
const storeSearchRadiusKm = Number(process.env.LCBO_STORE_RADIUS_KM || '10');
const mediaDir = path.join(publicDir, 'Media');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
};

const DRINK_TYPE_DEFS = [
  { key: 'beer', categories: ['beer'], keywords: ['beer', 'ale', 'lager', 'ipa', 'pilsner', 'stout', 'porter', 'wheat', 'sour'] },
  { key: 'wine', categories: ['wine', 'sparkling', 'fortified', 'port', 'sherry', 'vermouth'], keywords: ['wine', 'sparkling', 'champagne', 'prosecco', 'rose'] },
  { key: 'vodka', categories: ['vodka'], keywords: ['vodka'] },
  { key: 'gin', categories: ['gin'], keywords: ['gin'] },
  { key: 'rum', categories: ['rum'], keywords: ['rum'] },
  { key: 'whiskey', categories: ['whiskey', 'whisky', 'scotch', 'bourbon', 'rye'], keywords: ['whiskey', 'whisky', 'scotch', 'bourbon', 'rye'] },
  { key: 'tequila', categories: ['tequila', 'mezcal'], keywords: ['tequila', 'mezcal'] },
  { key: 'seltzer', categories: ['seltzer'], keywords: ['seltzer'] },
  {
    key: 'rtd',
    categories: ['ready-to-drink', 'cooler', 'cocktail', 'premix'],
    keywords: [
      'ready-to-drink',
      'ready to drink',
      'rtd',
      'cooler',
      'premix',
      'pre-mixed',
      'mixed drink',
      'hard tea',
      'hard iced tea',
      'twisted tea',
      'smirnoff ice'
    ]
  }
];

function normalizeMatchTerm(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeMatchText(value) {
  const normalized = normalizeMatchTerm(value);
  return normalized ? ` ${normalized} ` : ' ';
}

function textMatchesTerms(text, terms) {
  if (!text || !terms || !terms.length) return false;
  return terms.some((term) => {
    if (!term) return false;
    if (text.includes(` ${term} `)) return true;
    // Basic plural support (beer -> beers, mixed drink -> mixed drinks).
    if (!term.endsWith('s') && text.includes(` ${term}s `)) return true;
    return false;
  });
}

const DRINK_TYPE_MATCHERS = DRINK_TYPE_DEFS.map((type) => ({
  ...type,
  matchTerms: [...(type.categories || []), ...(type.keywords || [])].map(normalizeMatchTerm).filter(Boolean)
}));

const DRINK_TYPE_KEYS = new Set(DRINK_TYPE_MATCHERS.map((type) => type.key));

function parseTypesParam(raw) {
  const keys = String(raw || '')
    .split(',')
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  const selected = new Set();
  keys.forEach((key) => {
    if (DRINK_TYPE_KEYS.has(key)) selected.add(key);
  });
  return selected;
}

function productMatchesAnySelectedType(product, selectedTypes) {
  if (!selectedTypes || !selectedTypes.size) return true;
  if (!product) return false;
  const name = product.name || '';
  const category = product.primaryCategory || product.primary_category || product.primary_category_name || product.category || '';
  const nameText = normalizeMatchText(name);
  const categoryText = normalizeMatchText(category);
  return DRINK_TYPE_MATCHERS.some((type) => {
    if (!selectedTypes.has(type.key)) return false;
    return textMatchesTerms(categoryText, type.matchTerms) || textMatchesTerms(nameText, type.matchTerms);
  });
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server error');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function httpsJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const targetUrl = new URL(url);
    const req = https.request(
      {
        protocol: targetUrl.protocol,
        hostname: targetUrl.hostname,
        port: targetUrl.port || 443,
        method: options.method || 'GET',
        path: `${targetUrl.pathname}${targetUrl.search}`,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Get_Sloshed/1.0 (local dev)',
          ...(options.headers || {})
        }
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let parsed = null;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch (err) {
            reject(new Error(`Non-JSON response (${res.statusCode}): ${raw.slice(0, 200)}`));
            return;
          }
          if (res.statusCode && res.statusCode >= 400) {
            const msg = parsed && parsed.error ? parsed.error : `HTTP ${res.statusCode}`;
            reject(new Error(msg));
            return;
          }
          resolve(parsed);
        });
      }
    );

    req.on('error', reject);

    if (options.body) req.write(options.body);
    req.end();
  });
}

async function gqlRequest(query, variables) {
  const body = JSON.stringify({ query, variables });
  const response = await httpsJson(lcboGraphqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body
  });

  if (!response) throw new Error('Empty GraphQL response');
  if (Array.isArray(response.errors) && response.errors.length) {
    const message = response.errors[0] && response.errors[0].message ? response.errors[0].message : 'GraphQL error';
    throw new Error(message);
  }
  return response.data || null;
}

async function geocodePostal(postalRaw) {
  // LCBO.dev needs latitude/longitude for nearby stores.
  // We derive approximate coordinates from the Canadian postal "FSA" (first 3 chars)
  // via Zippopotam.us (free, no auth).
  const rawInput = String(postalRaw || '').toUpperCase().trim();
  if (!rawInput) return null;

  const embeddedMatch = rawInput.match(/[A-Z]\d[A-Z]\s?\d[A-Z]\d/);
  const extracted = embeddedMatch ? embeddedMatch[0] : rawInput;

  const normalized = extracted.replace(/[^A-Z0-9]/g, '').trim();
  if (!normalized) return null;

  const candidates = [];
  if (/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(normalized)) {
    candidates.push(normalized);
    candidates.push(`${normalized.slice(0, 3)} ${normalized.slice(3)}`);
  }
  if (normalized.length >= 3 && /^[A-Z]\d[A-Z]/.test(normalized.slice(0, 3))) {
    const fsa = normalized.slice(0, 3);
    if (!candidates.includes(fsa)) candidates.push(fsa);
  }
  // As a last resort, try the raw input (covers cases where spacing matters).
  if (!candidates.includes(extracted)) candidates.push(extracted);

  for (const candidate of candidates) {
    try {
      const token = encodeURIComponent(String(candidate).trim().toLowerCase());
      const data = await httpsJson(`https://api.zippopotam.us/ca/${token}`);
      const place = data && Array.isArray(data.places) ? data.places[0] : null;
      const latitude = place ? Number(place.latitude) : NaN;
      const longitude = place ? Number(place.longitude) : NaN;
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
      }
    } catch {
      // Try the next candidate if available.
    }
  }

  // Fallback: use OpenStreetMap Nominatim to resolve postal codes / addresses that
  // Zippopotam doesn't recognize (or if it is temporarily unavailable).
  try {
    const token = encodeURIComponent(extracted);
    const results = await httpsJson(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ca&q=${token}`
    );
    const first = Array.isArray(results) ? results[0] : null;
    const latitude = first ? Number(first.lat) : NaN;
    const longitude = first ? Number(first.lon) : NaN;
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  } catch {
    // Ignore.
  }

  return null;
}

function toLegacyStore(node) {
  if (!node) return null;
  const id = node.externalId || node.id;
  if (!id) return null;
  return {
    id: String(id),
    name: node.name || `Store ${id}`,
    address_line_1: node.address || node.addressLine1 || '',
    city: node.city || '',
    postal_code: node.postalCode || ''
  };
}

function toLegacyProduct(node, inventoryCount) {
  if (!node) return null;
  const sku = node.sku || node.id;
  if (!sku) return null;
  return {
    id: String(sku),
    sku: String(sku),
    name: node.name || '',
    primary_category: node.primaryCategory || '',
    price_in_cents: node.priceInCents,
    inventory_count: inventoryCount,
    alcohol_percent: node.alcoholPercent ?? null,
    unit_volume_ml: node.unitVolumeMl ?? null,
    selling_package: node.sellingPackage || '',
    bottles_per_pack: node.bottlesPerPack ?? null,
    price_per_alcohol_ml: node.pricePerAlcoholMl ?? null,
    image_thumb_url: node.thumbnailUrl || node.imageUrl || '',
    image_url: node.imageUrl || node.thumbnailUrl || ''
  };
}

async function fetchStoreCoordinates(storeId) {
  const query = `
    query StoreCoords($storeId: String!) {
      store(id: $storeId) {
        externalId
        latitude
        longitude
      }
    }
  `;

  const data = await gqlRequest(query, { storeId: String(storeId) });
  const store = data && data.store ? data.store : null;
  if (!store) return null;

  const latitude = Number(store.latitude);
  const longitude = Number(store.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    externalId: String(store.externalId || storeId),
    latitude,
    longitude
  };
}

async function fetchTopValueProductsForStore(storeId, term, desired, preferAbv) {
  const coords = await fetchStoreCoordinates(storeId);
  if (!coords) return [];

  const sortBy = preferAbv ? 'PRICE_PER_ALCOHOL_ML' : 'PRICE';
  const pageSize = Math.min(desired, 50);
  const radiusKm = Number.isFinite(storeSearchRadiusKm) ? storeSearchRadiusKm : 10;
  const maxPages = Math.max(2, Math.ceil(desired / pageSize) + 4);

  const query = `
    query ProductsForStoreValue(
      $term: String!
      $first: Int!
      $after: String
      $sortBy: ProductSortField!
      $latitude: Float!
      $longitude: Float!
      $radiusKm: Float!
    ) {
      products(
        filters: { search: $term, isBuyable: true }
        pagination: { first: $first, after: $after }
        sortBy: $sortBy
        sortDirection: ASC
      ) {
        edges {
          node {
            sku
            name
            primaryCategory
            priceInCents
            thumbnailUrl
            alcoholPercent
            unitVolumeMl
            sellingPackage
            bottlesPerPack
            pricePerAlcoholMl
            inventories(
              filters: {
                latitude: $latitude
                longitude: $longitude
                radiusKm: $radiusKm
                minQuantity: 1
              }
              pagination: { first: 25 }
            ) {
              edges {
                node {
                  quantity
                  store { externalId }
                }
              }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  let after = null;
  let pages = 0;
  const collected = [];
  const seen = new Set();

  while (collected.length < desired && pages < maxPages) {
    const data = await gqlRequest(query, {
      term: term || '',
      first: pageSize,
      after,
      sortBy,
      latitude: coords.latitude,
      longitude: coords.longitude,
      radiusKm
    });

    const connection = data && data.products ? data.products : null;
    const edges = connection && Array.isArray(connection.edges) ? connection.edges : [];

    edges.forEach((edge) => {
      const node = edge && edge.node ? edge.node : null;
      if (!node) return;
      const inventories = node.inventories && Array.isArray(node.inventories.edges)
        ? node.inventories.edges
        : [];
      let matchedQty = null;
      inventories.some((invEdge) => {
        const inv = invEdge && invEdge.node ? invEdge.node : null;
        const store = inv && inv.store ? inv.store : null;
        const externalId = store ? store.externalId : null;
        if (externalId && String(externalId) === String(storeId)) {
          const qty = Number(inv.quantity);
          if (Number.isFinite(qty) && qty > 0) matchedQty = qty;
          return true;
        }
        return false;
      });
      if (matchedQty === null) return;
      const legacy = toLegacyProduct(node, matchedQty);
      if (!legacy || seen.has(legacy.id)) return;
      seen.add(legacy.id);
      collected.push(legacy);
    });

    const pageInfo = connection ? connection.pageInfo : null;
    if (!pageInfo || !pageInfo.hasNextPage || !pageInfo.endCursor) break;
    after = pageInfo.endCursor;
    pages += 1;
  }

  return collected.slice(0, desired);
}

async function handleLcboDevProducts(req, res, requestUrl) {
  const term = requestUrl.searchParams.get('q') || '';
  const first = Math.min(Math.max(Number(requestUrl.searchParams.get('per_page') || '30'), 1), 50);
  const preferAbv = requestUrl.searchParams.get('abv') === '1';
  const sortBy = preferAbv ? 'PRICE_PER_ALCOHOL_ML' : 'PRICE';

  const query = `
    query Products($term: String!, $first: Int!, $sortBy: ProductSortField!) {
      products(
        filters: { search: $term, isBuyable: true }
        pagination: { first: $first }
        sortBy: $sortBy
        sortDirection: ASC
      ) {
        edges {
          node {
            sku
            name
            primaryCategory
            priceInCents
            thumbnailUrl
            alcoholPercent
            unitVolumeMl
            sellingPackage
            bottlesPerPack
            pricePerAlcoholMl
            inventories(filters: { minQuantity: 1 }, pagination: { first: 1 }) {
              edges { node { quantity } }
            }
          }
        }
      }
    }
  `;

  const data = await gqlRequest(query, { term, first, sortBy });
  const edges = data && data.products && Array.isArray(data.products.edges) ? data.products.edges : [];
  const products = edges
    .map((edge) => edge && edge.node)
    .map((node) => {
      const invEdges = node && node.inventories && Array.isArray(node.inventories.edges) ? node.inventories.edges : [];
      const qty = invEdges[0] && invEdges[0].node ? Number(invEdges[0].node.quantity) : 0;
      if (!qty) return null; // enforce "in stock somewhere"
      return toLegacyProduct(node, qty);
    })
    .filter(Boolean);

  sendJson(res, 200, { result: products });
}

async function handleLcboDevStores(req, res, requestUrl) {
  const postal =
    requestUrl.searchParams.get('postal_code') ||
    requestUrl.searchParams.get('q') ||
    requestUrl.searchParams.get('postal') ||
    '';

  const coords = await geocodePostal(postal);
  if (!coords) {
    sendJson(res, 200, { result: [] });
    return;
  }

  const first = Math.min(Math.max(Number(requestUrl.searchParams.get('per_page') || '5'), 1), 10);

  const query = `
    query Stores($latitude: Float!, $longitude: Float!, $radiusKm: Float!, $first: Int!) {
      stores(
        filters: { latitude: $latitude, longitude: $longitude, radiusKm: $radiusKm }
        pagination: { first: $first }
      ) {
        edges {
          node {
            externalId
            name
            address
            city
          }
        }
      }
    }
  `;

  const data = await gqlRequest(query, {
    latitude: coords.latitude,
    longitude: coords.longitude,
    radiusKm: Number.isFinite(storeSearchRadiusKm) ? storeSearchRadiusKm : 10,
    first
  });

  const edges = data && data.stores && Array.isArray(data.stores.edges) ? data.stores.edges : [];
  const stores = edges.map((edge) => toLegacyStore(edge && edge.node)).filter(Boolean);
  sendJson(res, 200, { result: stores });
}

async function handleLcboDevStoreProducts(req, res, requestUrl, storeId) {
  const term = String(requestUrl.searchParams.get('q') || '').trim().toLowerCase();
  const selectedTypes = parseTypesParam(requestUrl.searchParams.get('types'));
  const maxDesired = selectedTypes.size ? 1500 : 300;
  const desired = Math.min(Math.max(Number(requestUrl.searchParams.get('per_page') || '30'), 1), maxDesired);

  const pageSize = 50;

  const query = `
    query StoreProducts($storeId: String!, $first: Int!, $after: String) {
      store(id: $storeId) {
        inventories(
          filters: { minQuantity: 1 }
          pagination: { first: $first, after: $after }
        ) {
          edges {
            node {
              quantity
              product {
                sku
                name
                primaryCategory
                priceInCents
                thumbnailUrl
                alcoholPercent
                unitVolumeMl
                sellingPackage
                bottlesPerPack
                pricePerAlcoholMl
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  `;

  let after = null;
  let pages = 0;
  const baseMaxPages = Math.ceil(desired / pageSize) + 2;
  const maxPages = selectedTypes.size ? 80 : baseMaxPages;
  const collected = [];

  while (collected.length < desired && pages < maxPages) {
    try {
      const data = await gqlRequest(query, { storeId: String(storeId), first: pageSize, after });
      const store = data && data.store ? data.store : null;
      const inventories = store && store.inventories ? store.inventories : null;
      const edges = inventories && Array.isArray(inventories.edges) ? inventories.edges : [];

      if (!edges.length) break;

      edges.forEach((edge) => {
        const inventory = edge && edge.node ? edge.node : null;
        const product = inventory && inventory.product ? inventory.product : null;
        const qty = inventory ? Number(inventory.quantity) : 0;
        if (!qty || !product) return;
        if (selectedTypes.size && !productMatchesAnySelectedType(product, selectedTypes)) return;
        const legacy = toLegacyProduct(product, qty);
        if (legacy) collected.push(legacy);
      });

      const pageInfo = inventories ? inventories.pageInfo : null;
      if (!pageInfo || !pageInfo.hasNextPage || !pageInfo.endCursor) break;
      after = pageInfo.endCursor;
      pages += 1;
    } catch (e) {
      console.error('Page fetch error:', e.message);
      break;
    }
  }

  const seen = new Set();
  const products = collected
    .filter((product) => {
      if (!product || !product.id) return false;
      if (seen.has(product.id)) return false;
      seen.add(product.id);
      if (!term) return true;
      const name = String(product.name || '').toLowerCase();
      return name.includes(term);
    })
    .slice(0, desired);

  sendJson(res, 200, { result: products });
}

async function handleLcboDevApi(req, res, requestUrl) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const pathname = requestUrl.pathname || '/';
  const trimmed = pathname.replace(/^\/api/, '') || '/';
  if (trimmed === '/health') {
    sendJson(res, 200, { ok: true, mode: 'lcbodev' });
    return;
  }

  if (trimmed === '/products') {
    await handleLcboDevProducts(req, res, requestUrl);
    return;
  }

  if (trimmed === '/stores') {
    await handleLcboDevStores(req, res, requestUrl);
    return;
  }

  // /stores/:id/products
  const m = trimmed.match(/^\/stores\/([^/]+)\/products$/);
  if (m) {
    await handleLcboDevStoreProducts(req, res, requestUrl, m[1]);
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
}

function proxyApi(req, res) {
  const targetUrl = new URL(apiTarget);
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const trimmedPath = requestUrl.pathname.replace(/^\/api/, '');
  const proxyPath = `${targetUrl.pathname.replace(/\/$/, '')}${trimmedPath || '/'}${requestUrl.search}`;

  const headers = { ...req.headers };
  delete headers.origin;
  delete headers.referer;
  headers.host = targetUrl.host;

  const transport = targetUrl.protocol === 'https:' ? https : http;
  const proxyReq = transport.request(
    {
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      method: req.method,
      path: proxyPath,
      headers
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    }
  );

  proxyReq.on('error', (error) => {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Proxy error: ${error.message}`);
  });

  req.pipe(proxyReq, { end: true });
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const requestPath = decodeURIComponent(requestUrl.pathname || '/');
  if (requestPath === '/media-manifest.json') {
    fs.readdir(mediaDir, { withFileTypes: true }, (err, entries) => {
      if (err) {
        sendJson(res, 200, { files: [] });
        return;
      }
      const files = entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
        .map((entry) => `/Media/${entry.name}`);
      sendJson(res, 200, { files });
    });
    return;
  }
  if (requestPath.startsWith(apiPrefix)) {
    if (apiMode === 'proxy') {
      proxyApi(req, res);
    } else {
      handleLcboDevApi(req, res, requestUrl).catch((error) => {
        sendJson(res, 502, { error: error && error.message ? error.message : 'Upstream error' });
      });
    }
    return;
  }
  const normalizedPath = requestPath === '/' ? '/index.html' : requestPath;
  const safePath = path.normalize(normalizedPath).replace(/^(\.\.[/\\])+/, '');
  const relativePath = safePath.replace(/^[/\\]+/, '');
  const filePath = path.join(publicDir, relativePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    serveFile(res, filePath);
  });
});

server.listen(port, () => {
  console.log(`Get_Sloshed running at http://localhost:${port}`);
});
