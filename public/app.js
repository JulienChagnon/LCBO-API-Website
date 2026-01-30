const DEFAULT_CONFIG = {
  apiBase: 'https://github.com/heycarsten/lcbo-api',
  requestTimeoutMs: 8000,
  perPage: 30,
  maxPairings: 12
};

const CONFIG = {
  apiBase: (window.APP_CONFIG && window.APP_CONFIG.LCBO_API_BASE) || DEFAULT_CONFIG.apiBase,
  requestTimeoutMs:
    (window.APP_CONFIG && window.APP_CONFIG.REQUEST_TIMEOUT_MS) || DEFAULT_CONFIG.requestTimeoutMs,
  perPage: DEFAULT_CONFIG.perPage,
  maxPairings: DEFAULT_CONFIG.maxPairings
};

const MIXER_ALIASES = {
  coke: ['coke', 'cola', 'pepsi', 'diet coke', 'diet cola', 'rc'],
  sprite: ['sprite', '7up', 'seven up', 'lemon lime', 'lemon-lime', 'citrus soda'],
  'orange-juice': ['orange juice', 'orange', 'oj'],
  'ginger-ale': ['ginger ale', 'ginger beer'],
  'tonic-water': ['tonic', 'tonic water'],
  'cranberry-juice': ['cranberry', 'cranberry juice'],
  'pineapple-juice': ['pineapple', 'pineapple juice'],
  lemonade: ['lemonade', 'lemonade soda'],
  'iced-tea': ['iced tea', 'tea'],
  'club-soda': ['club soda', 'soda water', 'sparkling water']
};

const MIXER_PROFILES = {
  coke: {
    label: 'cola',
    baseSpirits: ['rum', 'bourbon', 'rye whiskey', 'spiced rum'],
    modifiers: ['coffee liqueur', 'orange liqueur', 'cherry liqueur'],
    mixNote: 'Tall glass, lots of ice.'
  },
  sprite: {
    label: 'lemon-lime soda',
    baseSpirits: ['vodka', 'gin', 'white rum', 'tequila'],
    modifiers: ['elderflower liqueur', 'orange liqueur', 'peach schnapps'],
    mixNote: 'Light and crisp.'
  },
  'orange-juice': {
    label: 'orange juice',
    baseSpirits: ['vodka', 'tequila', 'white rum'],
    modifiers: ['triple sec', 'amaretto', 'peach schnapps'],
    mixNote: 'Juicy and bright.'
  },
  'ginger-ale': {
    label: 'ginger ale',
    baseSpirits: ['bourbon', 'rye whiskey', 'dark rum'],
    modifiers: ['amaro', 'orange liqueur'],
    mixNote: 'Spicy and warm.'
  },
  'tonic-water': {
    label: 'tonic water',
    baseSpirits: ['gin', 'vodka', 'white rum'],
    modifiers: ['elderflower liqueur', 'orange liqueur'],
    mixNote: 'Bitter and clean.'
  },
  'cranberry-juice': {
    label: 'cranberry juice',
    baseSpirits: ['vodka', 'white rum', 'gin'],
    modifiers: ['orange liqueur', 'peach schnapps'],
    mixNote: 'Tart and refreshing.'
  },
  'pineapple-juice': {
    label: 'pineapple juice',
    baseSpirits: ['dark rum', 'tequila', 'vodka'],
    modifiers: ['coconut liqueur', 'orange liqueur'],
    mixNote: 'Tropical and smooth.'
  },
  lemonade: {
    label: 'lemonade',
    baseSpirits: ['vodka', 'gin', 'whiskey'],
    modifiers: ['amaro', 'elderflower liqueur'],
    mixNote: 'Zesty and crisp.'
  },
  'iced-tea': {
    label: 'iced tea',
    baseSpirits: ['bourbon', 'vodka', 'white rum'],
    modifiers: ['peach schnapps', 'orange liqueur'],
    mixNote: 'Smooth and easy.'
  },
  'club-soda': {
    label: 'club soda',
    baseSpirits: ['gin', 'vodka', 'tequila'],
    modifiers: ['amaro', 'orange liqueur', 'bitters'],
    mixNote: 'Super clean.'
  }
};

const GENERIC_PROFILE = {
  label: 'your mixer',
  baseSpirits: ['vodka', 'gin', 'rum', 'tequila'],
  modifiers: ['orange liqueur', 'amaro', 'bitters'],
  mixNote: 'Balance with ice.'
};

const MOCK_PRODUCTS = [
  {
    id: 'mock-1',
    name: 'Budget Vodka',
    primary_category: 'Vodka',
    price_in_cents: 2295,
    inventory_count: 24
  },
  {
    id: 'mock-2',
    name: 'Dry Gin',
    primary_category: 'Gin',
    price_in_cents: 2695,
    inventory_count: 16
  },
  {
    id: 'mock-3',
    name: 'Light Rum',
    primary_category: 'Rum',
    price_in_cents: 2495,
    inventory_count: 18
  },
  {
    id: 'mock-4',
    name: 'Dark Rum',
    primary_category: 'Rum',
    price_in_cents: 2795,
    inventory_count: 11
  },
  {
    id: 'mock-5',
    name: 'Blanco Tequila',
    primary_category: 'Tequila',
    price_in_cents: 3195,
    inventory_count: 8
  },
  {
    id: 'mock-6',
    name: 'Rye Whiskey',
    primary_category: 'Whiskey',
    price_in_cents: 2895,
    inventory_count: 14
  },
  {
    id: 'mock-7',
    name: 'Bourbon',
    primary_category: 'Whiskey',
    price_in_cents: 3095,
    inventory_count: 10
  },
  {
    id: 'mock-8',
    name: 'Coffee Liqueur',
    primary_category: 'Liqueur',
    price_in_cents: 1995,
    inventory_count: 22
  },
  {
    id: 'mock-9',
    name: 'Orange Liqueur',
    primary_category: 'Liqueur',
    price_in_cents: 2095,
    inventory_count: 15
  },
  {
    id: 'mock-10',
    name: 'Peach Schnapps',
    primary_category: 'Liqueur',
    price_in_cents: 1895,
    inventory_count: 12
  },
  {
    id: 'mock-11',
    name: 'Amaro',
    primary_category: 'Liqueur',
    price_in_cents: 2595,
    inventory_count: 6
  },
  {
    id: 'mock-12',
    name: 'Elderflower Liqueur',
    primary_category: 'Liqueur',
    price_in_cents: 2795,
    inventory_count: 5
  },
  {
    id: 'mock-13',
    name: 'Coconut Liqueur',
    primary_category: 'Liqueur',
    price_in_cents: 2195,
    inventory_count: 7
  },
  {
    id: 'mock-14',
    name: 'Bitters',
    primary_category: 'Bitters',
    price_in_cents: 1595,
    inventory_count: 18
  }
];

const state = {
  storeId: '',
  storeName: '',
  apiFailed: false,
  apiError: '',
  usedMock: false,
  productCache: new Map()
};

const elements = {
  form: document.getElementById('pairing-form'),
  mixer: document.getElementById('mixer'),
  postal: document.getElementById('postal'),
  store: document.getElementById('store'),
  maxPrice: document.getElementById('maxPrice'),
  maxPriceValue: document.getElementById('maxPriceValue'),
  status: document.getElementById('status'),
  pairings: document.getElementById('pairings'),
  resultsMeta: document.getElementById('results-meta'),
  findStores: document.getElementById('find-stores'),
  storeResults: document.getElementById('store-results'),
  storesList: document.getElementById('stores-list'),
  reset: document.getElementById('reset')
};

function normalizeMixerInput(input) {
  const clean = (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return null;

  if (MIXER_PROFILES[clean]) return clean;

  for (const [key, aliases] of Object.entries(MIXER_ALIASES)) {
    if (aliases.some((alias) => clean.includes(alias))) {
      return key;
    }
  }

  return null;
}

function toDollars(cents) {
  const value = Number(cents);
  if (!Number.isFinite(value)) return 'N/A';
  return `$${(value / 100).toFixed(2)}`;
}

function setStatus(message, tone = 'info') {
  elements.status.textContent = message;
  elements.status.dataset.tone = tone;
  elements.status.classList.add('show');
}

function clearStatus() {
  elements.status.textContent = '';
  elements.status.classList.remove('show');
}

function setResultsMeta(message) {
  elements.resultsMeta.textContent = message;
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeProduct(raw) {
  const priceCents =
    safeNumber(raw.price_in_cents) ??
    safeNumber(raw.regular_price_in_cents) ??
    safeNumber(raw.price_cents) ??
    safeNumber(raw.price) ??
    safeNumber(raw.regular_price) ??
    safeNumber(raw.retail_price);

  const inventory =
    safeNumber(raw.inventory_count) ??
    safeNumber(raw.store_inventory_count) ??
    safeNumber(raw.stock) ??
    safeNumber(raw.quantity) ??
    safeNumber(raw.total_inventory_count);

  return {
    id: raw.id || raw.product_id || raw.sku || raw.code || raw.name,
    name: raw.name || raw.product_name || raw.title || 'Unnamed product',
    category:
      raw.primary_category ||
      raw.category ||
      raw.secondary_category ||
      raw.type ||
      raw.style,
    priceCents,
    inventoryCount: inventory,
    image: raw.image_thumb_url || raw.image_url || raw.image
  };
}

function isInStock(product) {
  if (product.inventoryCount === null || product.inventoryCount === undefined) return true;
  return product.inventoryCount > 0;
}

function filterProducts(products, maxPriceCents) {
  return products
    .map(normalizeProduct)
    .filter((product) => {
      if (!product.name || product.priceCents === null) return false;
      if (product.priceCents > maxPriceCents) return false;
      return isInStock(product);
    });
}

function pickCheapest(products) {
  if (!products.length) return null;
  return products.reduce((best, current) => {
    if (!best) return current;
    return current.priceCents < best.priceCents ? current : best;
  }, null);
}

function makeUrl(path) {
  if (!CONFIG.apiBase) return null;
  const trimmedBase = CONFIG.apiBase.replace(/\/$/, '');
  const trimmedPath = path.startsWith('/') ? path : `/${path}`;
  return `${trimmedBase}${trimmedPath}`;
}

async function fetchJson(url) {
  if (!url) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    if (!contentType.includes('application/json')) {
      throw new Error('Response was not JSON');
    }

    return await response.json();
  } catch (error) {
    state.apiFailed = true;
    state.apiError = error.message || 'API error';
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractProducts(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.result)) return data.result;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.products)) return data.products;
  return [];
}

function extractStores(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.result)) return data.result;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.stores)) return data.stores;
  return [];
}

function fallbackProducts(term) {
  state.usedMock = true;
  const lower = term.toLowerCase();
  const tokens = lower.split(/\s+/).filter(Boolean);
  return MOCK_PRODUCTS.filter((product) => {
    const name = product.name.toLowerCase();
    const category = (product.primary_category || '').toLowerCase();
    return tokens.some((token) => name.includes(token) || category.includes(token));
  });
}

async function fetchProductsForTerm(term, storeId) {
  const cacheKey = `${storeId || 'all'}::${term}`;
  if (state.productCache.has(cacheKey)) {
    return state.productCache.get(cacheKey);
  }

  const params = new URLSearchParams({
    q: term,
    per_page: String(CONFIG.perPage)
  });

  let products = [];

  if (storeId) {
    const storeUrl = makeUrl(`/stores/${storeId}/products?${params.toString()}`);
    const storeData = await fetchJson(storeUrl);
    products = extractProducts(storeData);
  }

  if (!products.length) {
    const generalUrl = makeUrl(`/products?${params.toString()}`);
    const data = await fetchJson(generalUrl);
    products = extractProducts(data);
  }

  if (!products.length) {
    products = fallbackProducts(term);
  }

  state.productCache.set(cacheKey, products);
  return products;
}

async function fetchStoresByPostal(postal) {
  const params = new URLSearchParams({
    postal_code: postal,
    per_page: '5'
  });
  const url = makeUrl(`/stores?${params.toString()}`);
  const data = await fetchJson(url);
  return extractStores(data);
}

function buildRecipe(profile, base, modifier) {
  const baseName = base.category || base.name;
  const modifierName = modifier ? modifier.category || modifier.name : null;
  if (modifierName) {
    return `Mix 1.5 oz ${baseName} + 0.5 oz ${modifierName} + ${profile.label}. ${profile.mixNote}`;
  }
  return `Mix 2 oz ${baseName} + ${profile.label}. ${profile.mixNote}`;
}

async function buildPairings(profile, maxPriceCents, storeId) {
  const uniqueTerms = Array.from(
    new Set([...(profile.baseSpirits || []), ...(profile.modifiers || [])])
  );

  await Promise.all(uniqueTerms.map((term) => fetchProductsForTerm(term, storeId)));

  const baseCandidates = (profile.baseSpirits || [])
    .map((term) => pickCheapest(filterProducts(state.productCache.get(`${storeId || 'all'}::${term}`) || [], maxPriceCents)))
    .filter(Boolean);

  const modifierCandidates = (profile.modifiers || [])
    .map((term) => pickCheapest(filterProducts(state.productCache.get(`${storeId || 'all'}::${term}`) || [], maxPriceCents)))
    .filter(Boolean);

  const pairings = [];

  baseCandidates.forEach((base) => {
    pairings.push({
      title: `${capitalize(profile.label)} + ${base.name}`,
      products: [base],
      totalPriceCents: base.priceCents,
      interesting: false,
      recipe: buildRecipe(profile, base, null)
    });
  });

  baseCandidates.forEach((base) => {
    modifierCandidates.forEach((modifier) => {
      if (base.id === modifier.id) return;
      pairings.push({
        title: `${capitalize(profile.label)} + ${base.name} + ${modifier.name}`,
        products: [base, modifier],
        totalPriceCents: base.priceCents + modifier.priceCents,
        interesting: true,
        recipe: buildRecipe(profile, base, modifier)
      });
    });
  });

  return pairings
    .sort((a, b) => {
      if (a.interesting !== b.interesting) {
        return a.interesting ? -1 : 1;
      }
      return a.totalPriceCents - b.totalPriceCents;
    })
    .slice(0, CONFIG.maxPairings);
}

function capitalize(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function renderPairings(pairings, mixerLabel) {
  elements.pairings.innerHTML = '';

  if (!pairings.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No pairings found with that budget. Try a higher max price.';
    elements.pairings.appendChild(empty);
    return;
  }

  pairings.forEach((pairing, index) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.style.animationDelay = `${index * 0.05}s`;

    if (pairing.interesting) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = 'Interesting';
      card.appendChild(badge);
    }

    const title = document.createElement('h3');
    title.textContent = pairing.title;
    card.appendChild(title);

    const list = document.createElement('ul');
    pairing.products.forEach((product) => {
      const li = document.createElement('li');
      const category = product.category ? ` (${product.category})` : '';
      li.textContent = `${product.name}${category} - ${toDollars(product.priceCents)}`;
      list.appendChild(li);
    });
    card.appendChild(list);

    const recipe = document.createElement('p');
    recipe.className = 'recipe';
    recipe.textContent = pairing.recipe;
    card.appendChild(recipe);

    const meta = document.createElement('div');
    meta.className = 'meta';

    const total = document.createElement('span');
    total.textContent = `Total: ${toDollars(pairing.totalPriceCents)}`;
    meta.appendChild(total);

    const store = document.createElement('span');
    store.textContent = state.storeName
      ? `Store: ${state.storeName}`
      : state.storeId
        ? `Store ID: ${state.storeId}`
        : 'All stores';
    meta.appendChild(store);

    card.appendChild(meta);

    elements.pairings.appendChild(card);
  });

  setResultsMeta(`Showing ${pairings.length} pairings for ${mixerLabel}.`);
}

function renderStores(stores) {
  elements.storesList.innerHTML = '';
  if (!stores.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No stores found. Try a nearby postal code.';
    elements.storesList.appendChild(empty);
    return;
  }

  stores.forEach((store) => {
    const card = document.createElement('div');
    card.className = 'store-item';

    const title = document.createElement('h4');
    title.textContent = store.name || `Store ${store.id || ''}`;
    card.appendChild(title);

    const address = document.createElement('p');
    const line = store.address_line_1 || store.address || '';
    const city = store.city || '';
    address.textContent = [line, city].filter(Boolean).join(', ');
    card.appendChild(address);

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Use this store';
    button.addEventListener('click', () => {
      state.storeId = store.id || '';
      state.storeName = store.name || '';
      elements.store.value = state.storeId;
      setStatus(`Using store ${state.storeName || state.storeId}.`, 'info');
    });
    card.appendChild(button);

    elements.storesList.appendChild(card);
  });

  elements.storeResults.classList.remove('hidden');
}

async function handleFindStores() {
  clearStatus();
  const postal = elements.postal.value.trim();
  if (!postal) {
    setStatus('Enter a postal code to find nearby stores.', 'warn');
    return;
  }

  setStatus('Looking up stores...', 'info');
  const stores = await fetchStoresByPostal(postal);

  if (state.apiFailed) {
    setStatus(
      `Could not reach the LCBO API (${state.apiError}). Check the API base in config.js.`,
      'warn'
    );
    return;
  }

  clearStatus();
  renderStores(stores);
}

async function handlePairings() {
  clearStatus();
  state.apiFailed = false;
  state.apiError = '';
  state.usedMock = false;

  const mixerInput = elements.mixer.value.trim();
  const mixerKey = normalizeMixerInput(mixerInput);
  const profile = mixerKey ? MIXER_PROFILES[mixerKey] : GENERIC_PROFILE;
  const mixerLabel = mixerKey ? profile.label : 'your mixer';

  const maxPriceCents = Math.round(Number(elements.maxPrice.value) * 100);

  state.storeId = elements.store.value.trim();
  if (!state.storeId) {
    state.storeName = '';
  }

  elements.pairings.innerHTML = '';
  setResultsMeta('Scanning LCBO products...');

  const pairings = await buildPairings(profile, maxPriceCents, state.storeId || null);

  if (state.apiFailed) {
    setStatus(
      `Could not reach the LCBO API (${state.apiError}). Showing sample data instead. Update config.js with your API base.`,
      'warn'
    );
  } else if (state.usedMock) {
    setStatus('Using sample data. Update config.js to connect a live LCBO API.', 'warn');
  }

  renderPairings(pairings, mixerLabel);
}

function handleReset() {
  elements.form.reset();
  elements.maxPrice.value = '30';
  elements.maxPriceValue.textContent = '$30';
  elements.pairings.innerHTML = '';
  elements.storeResults.classList.add('hidden');
  state.storeId = '';
  state.storeName = '';
  clearStatus();
  setResultsMeta('Ready when you are.');
}

elements.maxPrice.addEventListener('input', (event) => {
  elements.maxPriceValue.textContent = `$${event.target.value}`;
});

elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  handlePairings();
});

elements.findStores.addEventListener('click', (event) => {
  event.preventDefault();
  handleFindStores();
});

elements.reset.addEventListener('click', (event) => {
  event.preventDefault();
  handleReset();
});

setResultsMeta('Ready when you are.');
