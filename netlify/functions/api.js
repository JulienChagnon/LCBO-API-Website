const LCBO_GRAPHQL_ENDPOINT = process.env.LCBO_GRAPHQL_ENDPOINT || 'https://api.lcbo.dev/graphql';
const STORE_RADIUS_KM = Number(process.env.LCBO_STORE_RADIUS_KM || '10');

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

function clampInt(value, min, max, fallback) {
  const num = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(num, min), max);
}

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
  const category =
    product.primaryCategory ||
    product.primary_category ||
    product.primary_category_name ||
    product.category ||
    '';
  const nameText = normalizeMatchText(name);
  const categoryText = normalizeMatchText(category);
  return DRINK_TYPE_MATCHERS.some((type) => {
    if (!selectedTypes.has(type.key)) return false;
    return textMatchesTerms(categoryText, type.matchTerms) || textMatchesTerms(nameText, type.matchTerms);
  });
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

function resolveCorsHeaders(event) {
  const configured = (process.env.CORS_ALLOW_ORIGIN || '*').trim();
  const requestOrigin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
  if (!configured || configured === '*') {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
  }
  const allowed = configured.split(',').map((entry) => entry.trim()).filter(Boolean);
  const origin = allowed.includes(requestOrigin) ? requestOrigin : allowed[0];
  return {
    'Access-Control-Allow-Origin': origin || '*',
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function jsonResponse(event, statusCode, payload) {
  const cors = resolveCorsHeaders(event);
  return {
    statusCode,
    headers: {
      ...cors,
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    },
    body: JSON.stringify(payload)
  };
}

async function safeJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function gqlRequest(query, variables) {
  const response = await fetch(LCBO_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store'
  });

  if (!response.ok) throw new Error(`GraphQL request failed (${response.status})`);
  const payload = await response.json();
  if (payload && Array.isArray(payload.errors) && payload.errors.length) {
    const message = payload.errors[0] && payload.errors[0].message ? payload.errors[0].message : 'GraphQL error';
    throw new Error(message);
  }
  return payload ? payload.data || null : null;
}

function extractPostalCandidates(value) {
  const rawInput = String(value || '').toUpperCase().trim();
  if (!rawInput) return [];
  const embeddedMatch = rawInput.match(/[A-Z]\\d[A-Z]\\s?\\d[A-Z]\\d/);
  const extracted = embeddedMatch ? embeddedMatch[0] : rawInput;
  const normalized = extracted.replace(/[^A-Z0-9]/g, '').trim();
  if (!normalized) return [];
  const candidates = [];
  if (normalized.length >= 3 && /^[A-Z]\\d[A-Z]/.test(normalized.slice(0, 3))) {
    candidates.push(normalized.slice(0, 3));
  }
  if (!candidates.includes(extracted)) candidates.push(extracted);
  return candidates;
}

async function geocodePostal(postalOrAddress) {
  const candidates = extractPostalCandidates(postalOrAddress);
  if (!candidates.length) return null;

  const fsa = candidates.find((candidate) => /^[A-Z]\\d[A-Z]$/.test(candidate.replace(/\\s+/g, '')));
  if (fsa) {
    const token = encodeURIComponent(fsa.trim().toLowerCase());
    const data = await safeJson(`https://api.zippopotam.us/ca/${token}`);
    const place = data && Array.isArray(data.places) ? data.places[0] : null;
    const latitude = place ? Number(place.latitude) : NaN;
    const longitude = place ? Number(place.longitude) : NaN;
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  const token = encodeURIComponent(String(candidates[candidates.length - 1]).trim());
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ca&q=${token}`;
  const results = await safeJson(nominatimUrl, {
    headers: {
      'User-Agent': 'get-sloshed-netlify-function/1.0',
      Accept: 'application/json'
    }
  });
  const hit = Array.isArray(results) ? results[0] : null;
  const latitude = hit ? Number(hit.lat) : NaN;
  const longitude = hit ? Number(hit.lon) : NaN;
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return { latitude, longitude };
  }

  const openMeteoToken = encodeURIComponent(`${String(candidates[candidates.length - 1]).trim()} Canada`);
  const openMeteo = await safeJson(
    `https://geocoding-api.open-meteo.com/v1/search?name=${openMeteoToken}&count=1&language=en&format=json&country_code=CA`
  );
  const geo = openMeteo && Array.isArray(openMeteo.results) ? openMeteo.results[0] : null;
  const latitude2 = geo ? Number(geo.latitude) : NaN;
  const longitude2 = geo ? Number(geo.longitude) : NaN;
  if (Number.isFinite(latitude2) && Number.isFinite(longitude2)) {
    return { latitude: latitude2, longitude: longitude2 };
  }

  return null;
}

function resolveSubPath(event) {
  const path = String(event.path || '/');
  const withoutFn = path.replace(/^\\/\\.netlify\\/functions\\/api/, '');
  const withoutApi = withoutFn.replace(/^\\/api/, '');
  const normalized = withoutApi || '/';
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

exports.handler = async (event) => {
  const cors = resolveCorsHeaders(event);
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { ...cors, 'cache-control': 'no-store' }, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(event, 405, { error: 'Method not allowed' });
  }

  const pathname = resolveSubPath(event);
  const qs = event.queryStringParameters || {};

  try {
    if (pathname === '/health') {
      return jsonResponse(event, 200, { ok: true, mode: 'netlify' });
    }

    if (pathname === '/products') {
      const term = String(qs.q || '');
      const first = clampInt(qs.per_page, 1, 50, 30);
      const preferAbv = String(qs.abv || '') === '1';
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
        .map((edge) => (edge && edge.node ? edge.node : null))
        .map((node) => {
          const invEdges = node && node.inventories && Array.isArray(node.inventories.edges) ? node.inventories.edges : [];
          const qty = invEdges[0] && invEdges[0].node ? Number(invEdges[0].node.quantity) : 0;
          if (!qty) return null;
          return toLegacyProduct(node, qty);
        })
        .filter(Boolean);

      return jsonResponse(event, 200, { result: products });
    }

    if (pathname === '/stores') {
      const postal = String(qs.postal_code || qs.q || qs.postal || '');
      const coords = await geocodePostal(postal);
      if (!coords) return jsonResponse(event, 200, { result: [] });

      const first = clampInt(qs.per_page, 1, 10, 5);
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
        radiusKm: Number.isFinite(STORE_RADIUS_KM) ? STORE_RADIUS_KM : 10,
        first
      });

      const edges = data && data.stores && Array.isArray(data.stores.edges) ? data.stores.edges : [];
      const stores = edges.map((edge) => toLegacyStore(edge && edge.node)).filter(Boolean);
      return jsonResponse(event, 200, { result: stores });
    }

    const m = pathname.match(/^\\/stores\\/([^/]+)\\/products$/);
    if (m) {
      const storeId = decodeURIComponent(m[1]);
      const term = String(qs.q || '').trim().toLowerCase();
      const selectedTypes = parseTypesParam(qs.types);
      const desired = clampInt(qs.per_page, 1, selectedTypes.size ? 800 : 400, 120);

      const pageSize = 50;
      const maxPages = Math.min(30, Math.ceil(desired / pageSize) + 4);
      const start = Date.now();

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
      const seen = new Set();
      const collected = [];

      while (collected.length < desired && pages < maxPages) {
        if (Date.now() - start > 8000) break;
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
          const legacy = toLegacyProduct(product, qty);
          if (!legacy || !legacy.id) return;
          if (seen.has(legacy.id)) return;
          if (selectedTypes.size && !productMatchesAnySelectedType(legacy, selectedTypes)) return;
          if (term) {
            const name = String(legacy.name || '').toLowerCase();
            if (!name.includes(term)) return;
          }
          seen.add(legacy.id);
          collected.push(legacy);
        });

        const pageInfo = inventories ? inventories.pageInfo : null;
        if (!pageInfo || !pageInfo.hasNextPage || !pageInfo.endCursor) break;
        after = pageInfo.endCursor;
        pages += 1;
      }

      return jsonResponse(event, 200, { result: collected.slice(0, desired) });
    }

    return jsonResponse(event, 404, { error: 'Not found' });
  } catch (error) {
    return jsonResponse(event, 502, { error: error && error.message ? error.message : 'Upstream error' });
  }
};

