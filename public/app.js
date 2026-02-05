const DEFAULT_CONFIG = {
  apiBase: '/api',
  requestTimeoutMs: 45000,
  perPage: 50,
  resultsLimit: 18,
  storePostalParam: 'postal_code',
  graphqlEndpoint: 'https://api.lcbo.dev/graphql',
  storeRadiusKm: 10,
  storeFetchMax: 800,
  mediaFiles: [
    'Media/coorslight.png',
    'Media/cutwater.png',
    'Media/fireball.png',
    'Media/malibu.png',
    'Media/mikes.png',
    'Media/pbr.png',
    'Media/smirIce.png',
    'Media/twistedTea.png'
  ],
  mediaFileScales: {},
  mediaMinSize: 60,
  mediaMaxSize: 140
};

const CONFIG = {
  apiBase: (window.APP_CONFIG && window.APP_CONFIG.LCBO_API_BASE) || DEFAULT_CONFIG.apiBase,
  requestTimeoutMs:
    (window.APP_CONFIG && window.APP_CONFIG.REQUEST_TIMEOUT_MS) || DEFAULT_CONFIG.requestTimeoutMs,
  perPage: Number.isFinite(Number(window.APP_CONFIG && window.APP_CONFIG.PER_PAGE))
    ? Number(window.APP_CONFIG && window.APP_CONFIG.PER_PAGE)
    : DEFAULT_CONFIG.perPage,
  resultsLimit: Number.isFinite(Number(window.APP_CONFIG && window.APP_CONFIG.RESULTS_LIMIT))
    ? Math.max(Number(window.APP_CONFIG && window.APP_CONFIG.RESULTS_LIMIT), 1)
    : DEFAULT_CONFIG.resultsLimit,
  storePostalParam:
    (window.APP_CONFIG && window.APP_CONFIG.STORE_POSTAL_PARAM) ||
    DEFAULT_CONFIG.storePostalParam,
  graphqlEndpoint:
    (window.APP_CONFIG && window.APP_CONFIG.LCBO_GRAPHQL_ENDPOINT) ||
    DEFAULT_CONFIG.graphqlEndpoint,
  storeRadiusKm: Number.isFinite(Number(window.APP_CONFIG && window.APP_CONFIG.LCBO_STORE_RADIUS_KM))
    ? Number(window.APP_CONFIG && window.APP_CONFIG.LCBO_STORE_RADIUS_KM)
    : DEFAULT_CONFIG.storeRadiusKm,
  storeFetchMax: Number.isFinite(Number(window.APP_CONFIG && window.APP_CONFIG.STORE_FETCH_MAX))
    ? Number(window.APP_CONFIG && window.APP_CONFIG.STORE_FETCH_MAX)
    : DEFAULT_CONFIG.storeFetchMax,
  mediaFiles:
    (window.APP_CONFIG && window.APP_CONFIG.MEDIA_FILES) || DEFAULT_CONFIG.mediaFiles,
  mediaFileScales:
    (window.APP_CONFIG && window.APP_CONFIG.MEDIA_FILE_SCALES) || DEFAULT_CONFIG.mediaFileScales,
  mediaMinSize: Number.isFinite(Number(window.APP_CONFIG && window.APP_CONFIG.MEDIA_MIN_SIZE))
    ? Number(window.APP_CONFIG && window.APP_CONFIG.MEDIA_MIN_SIZE)
    : DEFAULT_CONFIG.mediaMinSize,
  mediaMaxSize: Number.isFinite(Number(window.APP_CONFIG && window.APP_CONFIG.MEDIA_MAX_SIZE))
    ? Number(window.APP_CONFIG && window.APP_CONFIG.MEDIA_MAX_SIZE)
    : DEFAULT_CONFIG.mediaMaxSize
};

const PRICE_RANGE = {
  min: 10,
  max: 80,
  defaultMin: 15,
  defaultMax: 60
};

const DRINK_TYPE_DEFS = [
  {
    key: 'beer',
    label: 'Beer',
    categories: ['beer'],
    keywords: ['beer', 'ale', 'lager', 'ipa', 'pilsner', 'stout', 'porter', 'hefe', 'wheat', 'sour', 'gose', 'lambic', 'radler']
  },
  {
    key: 'wine',
    label: 'Wine',
    categories: ['wine', 'sparkling', 'fortified', 'port', 'sherry', 'vermouth'],
    keywords: ['wine', 'sparkling', 'champagne', 'prosecco', 'rose', 'riesling', 'chardonnay', 'merlot', 'cabernet', 'pinot', 'sauvignon', 'shiraz', 'port', 'sherry', 'vermouth']
  },
  { key: 'vodka', label: 'Vodka', categories: ['vodka'], keywords: ['vodka'] },
  { key: 'gin', label: 'Gin', categories: ['gin'], keywords: ['gin'] },
  { key: 'rum', label: 'Rum', categories: ['rum'], keywords: ['rum'] },
  {
    key: 'whiskey',
    label: 'Whiskey',
    categories: ['whiskey', 'whisky', 'scotch', 'bourbon', 'rye'],
    keywords: ['whiskey', 'whisky', 'scotch', 'bourbon', 'rye']
  },
  { key: 'tequila', label: 'Tequila', categories: ['tequila', 'mezcal'], keywords: ['tequila', 'mezcal'] },
  { key: 'seltzer', label: 'Seltzer', categories: ['seltzer'], keywords: ['seltzer', 'hard seltzer'] },
  {
    key: 'rtd',
    label: 'Coolers',
    categories: ['ready-to-drink', 'cooler', 'cocktail', 'premix'],
    keywords: [
      'ready-to-drink',
      'ready to drink',
      'rtd',
      'cooler',
      'premix',
      'pre-mixed',
      'hard lemonade',
      'hard tea',
      'hard iced tea',
      'hard soda',
      'spiked lemonade',
      'cocktail',
      'mixed drink',
      'twisted tea',
      'smirnoff ice',
      "mike's",
      'mikes'
    ]
  }
];

const NON_SPIRIT_KEYS = new Set(['beer', 'wine', 'seltzer', 'rtd']);
const SPIRIT_KEYS = new Set(['vodka', 'gin', 'rum', 'whiskey', 'tequila']);
const SPIRIT_MISC_TERMS = ['liqueur', 'amaro', 'bitters', 'schnapps', 'creme', 'cream liqueur', 'irish cream'];
const TOTAL_DRINK_TYPES = DRINK_TYPE_DEFS.length;

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

function makeTypesParam(selectedTypes) {
  if (!selectedTypes || !selectedTypes.size) return '';
  return Array.from(selectedTypes)
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .sort()
    .join(',');
}

const DRINK_TYPE_MATCHERS = DRINK_TYPE_DEFS.map((type) => ({
  ...type,
  matchTerms: [...(type.categories || []), ...(type.keywords || [])]
    .map(normalizeMatchTerm)
    .filter(Boolean)
}));

const SPIRIT_MISC_MATCH_TERMS = SPIRIT_MISC_TERMS.map(normalizeMatchTerm).filter(Boolean);

const NON_ALCOHOLIC_NAME_TERMS = [
  'non-alcoholic',
  'non alcoholic',
  'alcohol-free',
  'alcohol free',
  'dealcoholized',
  'de-alcoholized',
  'zero alcohol',
  'no alcohol',
  'non alc',
  'nonalc'
];

const NON_ALCOHOLIC_CATEGORY_TERMS = [
  'non-alcoholic',
  'alcohol-free',
  'no/low',
  'low alcohol',
  'zero alcohol',
  'dealcoholized'
];

const BAG_CATEGORY_TERMS = ['bag', 'bags'];
const BAG_NAME_REGEX = /\b(gift\s*bag|shopping\s*bag|tote|carrier\s*bag|lcbo\s*bag|bag)\b/i;

const MOCK_PRODUCTS = [
  { id: 'mock-1', name: 'Budget Vodka', primary_category: 'Vodka', price_in_cents: 2295, inventory_count: 24, alcohol_percent: 40, unit_volume_ml: 750 },
  { id: 'mock-15', name: 'Ontario Lager 4-Pack', primary_category: 'Beer', price_in_cents: 1495, inventory_count: 28, alcohol_percent: 5, unit_volume_ml: 473, bottles_per_pack: 4 }
];

const state = {
  storeId: '',
  storeName: '',
  stores: [],
  storeLookupLoading: false,
  resultsLoading: false,
  apiFailed: false,
  apiError: '',
  usedMock: false,
  productCache: new Map(),
  lastProducts: [],
  lastStoreId: ''
};

let storeLookupTimer = null;
let storeLookupToken = 0;
let lastStoreQuery = '';
let drinkTypeRefreshTimer = null;
let drinkTypeRefreshToken = 0;

const elements = {
  form: document.getElementById('pairing-form'),
  postal: document.getElementById('postal'),
  storeOptions: document.getElementById('store-options'),
  storePicker: document.getElementById('store-picker'),
  minPrice: document.getElementById('minPrice'),
  maxPrice: document.getElementById('maxPrice'),
  minPriceValue: document.getElementById('minPriceValue'),
  maxPriceValue: document.getElementById('maxPriceValue'),
  priceRange: document.getElementById('priceRange'),
  status: document.getElementById('status'),
  pairings: document.getElementById('pairings'),
  resultsTitle: document.getElementById('results-title'),
  resultsMetaText: document.getElementById('results-meta-text'),
  resultsSection: document.querySelector('.results'),
  findStores: document.getElementById('find-stores'),
  reset: document.getElementById('reset'),
  selectAllTypes: document.getElementById('select-all-types'),
  unselectAllTypes: document.getElementById('unselect-all-types'),
  drinkTypeInputs: Array.from(document.querySelectorAll('input[name="drinkType"]'))
};

function storeOptionLabel(store) {
  const name = store.name || `Store ${store.id || ''}`.trim();
  const detail = storeOptionDetail(store);
  return detail ? `${name} - ${detail}` : name;
}

function storeOptionDetail(store) {
  const line = store && (store.address_line_1 || store.address) ? store.address_line_1 || store.address : '';
  const city = store && store.city ? store.city : '';
  const postal = store && store.postal_code ? store.postal_code : '';
  return [line, city, postal].filter(Boolean).join(', ');
}

function getCheckedStoreValue() {
  if (!elements.storeOptions) return '';
  const checked = elements.storeOptions.querySelector('input[name="store-choice"]:checked');
  return checked ? checked.value.trim() : '';
}

function rebuildStoreOptions(stores, selectedId = null) {
  if (!elements.storeOptions) return;
  const desired =
    selectedId !== null && selectedId !== undefined
      ? String(selectedId)
      : getCheckedStoreValue();

  elements.storeOptions.innerHTML = '';

  (stores || []).forEach((store) => {
    if (!store || !store.id) return;
    const optionId = `store-choice-${store.id}`;
    const optionWrap = document.createElement('div');
    optionWrap.className = 'store-option';
    const optionInput = document.createElement('input');
    optionInput.type = 'radio';
    optionInput.name = 'store-choice';
    optionInput.id = optionId;
    optionInput.value = String(store.id);
    const optionLabel = document.createElement('label');
    optionLabel.className = 'store-label';
    optionLabel.setAttribute('for', optionId);
    const title = document.createElement('span');
    title.className = 'store-title';
    title.textContent = store.name || `Store ${store.id}`;
    const detail = document.createElement('span');
    detail.className = 'store-detail';
    detail.textContent = storeOptionDetail(store);
    optionLabel.appendChild(title);
    if (detail.textContent) optionLabel.appendChild(detail);
    optionWrap.appendChild(optionInput);
    optionWrap.appendChild(optionLabel);
    elements.storeOptions.appendChild(optionWrap);
  });

  const options = Array.from(elements.storeOptions.querySelectorAll('input[name="store-choice"]'));
  const match = desired ? options.find((opt) => opt.value === desired) : null;
  if (match) {
    match.checked = true;
  } else if (options[0]) {
    options[0].checked = true;
  }
}

function findStoreById(storeId) {
  const id = String(storeId || '');
  if (!id) return null;
  return (state.stores || []).find((store) => String(store.id) === id) || null;
}

function getStoreSelection() {
  const raw = getCheckedStoreValue();
  if (!raw) {
    return { mode: 'auto', id: '', name: '' };
  }
  const store = findStoreById(raw);
  return {
    mode: 'specific',
    id: raw,
    name: store ? store.name || '' : ''
  };
}

function normalizePostalCode(value) {
  return (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
}

function formatPostalCode(value) {
  const compact = normalizePostalCode(value);
  if (compact.length <= 3) return compact;
  return `${compact.slice(0, 3)} ${compact.slice(3)}`;
}

function normalizeStoreQuery(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (isPostalLike(raw)) return normalizePostalCode(raw);
  return raw;
}

function isPostalLike(value) {
  const compact = normalizePostalCode(value);
  if (compact.length === 3) {
    return /^[A-Z]\d[A-Z]$/.test(compact);
  }
  if (compact.length === 6) {
    return /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(compact);
  }
  return false;
}

function toDollars(cents) {
  const value = Number(cents);
  if (!Number.isFinite(value)) return 'N/A';
  return `$${(value / 100).toFixed(2)}`;
}

function toDollarsValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'N/A';
  return `$${numeric.toFixed(2)}`;
}

function getSelectedDrinkTypes() {
  const inputs = elements.drinkTypeInputs || [];
  const selected = inputs.filter((input) => input && input.checked).map((input) => input.value);
  return new Set(selected);
}

function setAllDrinkTypes(checked) {
  const inputs = elements.drinkTypeInputs || [];
  inputs.forEach((input) => {
    if (input) {
      input.checked = checked;
    }
  });
  scheduleDrinkTypeRefresh();
}

function getPriceRangeCents() {
  const minValue = Number(elements.minPrice ? elements.minPrice.value : PRICE_RANGE.defaultMin);
  const maxValue = Number(elements.maxPrice ? elements.maxPrice.value : PRICE_RANGE.defaultMax);
  const min = Number.isFinite(minValue) ? minValue : PRICE_RANGE.defaultMin;
  const max = Number.isFinite(maxValue) ? maxValue : PRICE_RANGE.defaultMax;
  return {
    minPriceCents: Math.round(Math.min(min, max) * 100),
    maxPriceCents: Math.round(Math.max(min, max) * 100)
  };
}

function updatePriceRange() {
  if (!elements.minPrice || !elements.maxPrice) return;
  let minValue = Number(elements.minPrice.value);
  let maxValue = Number(elements.maxPrice.value);
  if (!Number.isFinite(minValue)) minValue = PRICE_RANGE.defaultMin;
  if (!Number.isFinite(maxValue)) maxValue = PRICE_RANGE.defaultMax;

  if (minValue > maxValue) {
    if (document.activeElement === elements.minPrice) {
      maxValue = minValue;
      elements.maxPrice.value = String(maxValue);
    } else {
      minValue = maxValue;
      elements.minPrice.value = String(minValue);
    }
  }

  if (elements.minPriceValue) elements.minPriceValue.textContent = toDollarsValue(minValue);
  if (elements.maxPriceValue) elements.maxPriceValue.textContent = toDollarsValue(maxValue);

  if (elements.priceRange) {
    const rangeMin = Number(elements.minPrice.min) || PRICE_RANGE.min;
    const rangeMax = Number(elements.minPrice.max) || PRICE_RANGE.max;
    const minRatio = (minValue - rangeMin) / (rangeMax - rangeMin);
    const maxRatio = (maxValue - rangeMin) / (rangeMax - rangeMin);
    const clampedMin = Math.max(0, Math.min(1, minRatio));
    const clampedMax = Math.max(0, Math.min(1, maxRatio));
    elements.priceRange.style.setProperty('--range-min', clampedMin.toString());
    elements.priceRange.style.setProperty('--range-max', clampedMax.toString());
  }
}

function scheduleDrinkTypeRefresh() {
  if (!state.storeId || !state.lastProducts.length) {
    if (state.lastProducts.length) applyFiltersAndRender();
    return;
  }
  if (drinkTypeRefreshTimer) {
    clearTimeout(drinkTypeRefreshTimer);
  }
  drinkTypeRefreshTimer = setTimeout(() => {
    drinkTypeRefreshTimer = null;
    refreshProductsForFilters();
  }, 250);
}

async function refreshProductsForFilters() {
  if (!state.storeId) {
    applyFiltersAndRender();
    return;
  }
  const token = ++drinkTypeRefreshToken;
  state.apiFailed = false;
  state.apiError = '';
  state.usedMock = false;
  setResultsLoading(true, { placeholders: true });
  setResultsMeta('Refreshing in-stock products for your filters...');

  const selectedTypes = getSelectedDrinkTypes();
  const limit = getFetchLimitForSelectedTypes(selectedTypes, { storeScoped: true });
  const products = await fetchProductsForSelectedTypes(state.storeId, selectedTypes, {
    force: true,
    fetchLimit: limit
  });

  if (token !== drinkTypeRefreshToken) return;
  state.lastProducts = products || [];
  state.lastStoreId = state.storeId || '';
  setResultsLoading(false);

  if (state.apiFailed) {
    setStatus(
      `Could not reach the LCBO API (${state.apiError}). Showing sample data instead. Update config.js with your API base.`,
      'warn'
    );
  } else if (state.usedMock) {
    setStatus('Using sample data. Update config.js to connect a live LCBO API.', 'warn');
  }

  applyFiltersAndRender();
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

function buildFormulaElement() {
  const wrap = document.createElement('span');
  wrap.className = 'formula';

  const fraction = document.createElement('span');
  fraction.className = 'fraction';

  const top = document.createElement('span');
  top.className = 'top';
  top.textContent = 'ABV% * mL';

  const bottom = document.createElement('span');
  bottom.className = 'bottom';
  bottom.textContent = '$';

  fraction.appendChild(top);
  fraction.appendChild(bottom);
  wrap.appendChild(fraction);

  return wrap;
}

function setResultsMeta(message) {
  if (!elements.resultsMetaText) return;
  if (typeof message === 'string') {
    elements.resultsMetaText.textContent = message;
    return;
  }
  elements.resultsMetaText.textContent = '';
  if (message) {
    elements.resultsMetaText.appendChild(message);
  }
}

function getResultsTitle() {
  const label = 'Top alcohol value';
  if (state.storeName) return `${label} at ${state.storeName} LCBO`;
  if (state.storeId) return `${label} at Store ${state.storeId} LCBO`;
  return `${label} at LCBO`;
}

function setResultsTitle() {
  if (!elements.resultsTitle) return;
  elements.resultsTitle.textContent = getResultsTitle();
}

function initWaterScene() {
  const root = document.documentElement;
  if (!root) return;

  let ticking = false;

  const syncScroll = () => {
    ticking = false;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    root.style.setProperty('--water-scroll', `-${scrollY}px`);
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(syncScroll);
  };

  syncScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
}

function initFloatingMedia() {
  const canvas = document.getElementById('media-canvas');
  if (!canvas) return;

  const prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const isMobileViewport = () => {
    if (window.matchMedia) return window.matchMedia('(max-width: 700px)').matches;
    return (window.innerWidth || 0) <= 700;
  };

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const minSpriteSize = Math.min(CONFIG.mediaMinSize, CONFIG.mediaMaxSize);
  const maxSpriteSize = Math.max(CONFIG.mediaMinSize, CONFIG.mediaMaxSize);
  const baseSpriteSize = Math.round((minSpriteSize + maxSpriteSize) / 2);

  let lastMobileViewport = isMobileViewport();
  const resolveMaxSprites = () => (lastMobileViewport ? 3 : 14);

  const settings = {
    manifestUrl: 'media-manifest.json',
    maxSprites: resolveMaxSprites(),
    minSize: baseSpriteSize,
    maxSize: baseSpriteSize,
    minSpeed: 18,
    maxSpeed: 90,
    minRotationSpeed: 0.2,
    maxRotationSpeed: 0.7
  };

  let width = 0;
  let height = 0;
  let worldWidth = 0;
  let worldHeight = 0;
  let dpr = window.devicePixelRatio || 1;
  let sprites = [];
  let loadedImages = [];
  let drag = null;
  let lastTime = performance.now();
  const blockerSelector = '[data-media-blocker]';
  const blockerPadding = Math.max(12, Math.round(settings.maxSize * 0.55));
  const blockerBridgeMaxGap = Math.max(96, Math.round(settings.maxSize * 1.25));
  let blockers = [];
  let lastBlockerUpdate = 0;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const randBetween = (min, max) => min + Math.random() * (max - min);
  const getScrollX = () => window.scrollX || window.pageXOffset || 0;
  const getScrollY = () => window.scrollY || window.pageYOffset || 0;
  const toWorldPoint = (clientX, clientY) => ({
    x: Number(clientX) + getScrollX(),
    y: Number(clientY) + getScrollY()
  });
  const getWorldBounds = () => ({
    width: worldWidth || width,
    height: worldHeight || height
  });
  const resolveMediaUrl = (item) => {
    if (!item) return null;
    if (/^https?:/i.test(item)) return item;
    const cleaned = String(item).replace(/^[\\/]+/, '');
    try {
      return new URL(cleaned, document.baseURI).toString();
    } catch {
      return cleaned;
    }
  };
  const normalizeMediaList = (files) =>
    (files || [])
      .filter((entry) => typeof entry === 'string')
      .map((entry) => resolveMediaUrl(entry))
      .filter((entry) => entry && entry.toLowerCase().endsWith('.png'));

  const normalizeMediaKey = (value) => {
    if (!value) return '';
    const raw = String(value).trim().replace(/\\/g, '/');
    if (!raw) return '';
    const lower = raw.toLowerCase();
    if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('file://')) {
      try {
        const url = new URL(lower);
        return url.pathname.replace(/^\/+/, '');
      } catch {
        return lower.replace(/^\/+/, '');
      }
    }
    return lower.replace(/^\/+/, '');
  };

  const buildMediaScaleMap = (scales) => {
    const map = new Map();
    if (!scales || typeof scales !== 'object') return map;
    Object.entries(scales).forEach(([key, value]) => {
      const scale = Number(value);
      if (!Number.isFinite(scale) || scale <= 0) return;
      const normalizedKey = normalizeMediaKey(key);
      if (normalizedKey) {
        map.set(normalizedKey, scale);
        const filename = normalizedKey.split('/').pop();
        if (filename) map.set(filename, scale);
      }
    });
    return map;
  };

  const mediaScaleMap = buildMediaScaleMap(CONFIG.mediaFileScales);

  const resolveMediaScale = (src) => {
    const normalized = normalizeMediaKey(src);
    if (normalized && mediaScaleMap.has(normalized)) return mediaScaleMap.get(normalized);
    const filename = normalized.split('/').pop();
    if (filename && mediaScaleMap.has(filename)) return mediaScaleMap.get(filename);
    return 1;
  };

  const resize = () => {
    const nextWidth = Math.max(window.innerWidth, 1);
    const nextHeight = Math.max(window.innerHeight, 1);
    const nextDpr = window.devicePixelRatio || 1;

    const doc = document.documentElement;
    const body = document.body;
    const pageWidth = Math.max(
      nextWidth,
      doc ? doc.scrollWidth : 0,
      body ? body.scrollWidth : 0,
      doc ? doc.offsetWidth : 0,
      body ? body.offsetWidth : 0,
      doc ? doc.clientWidth : 0,
      body ? body.clientWidth : 0
    );
    const pageHeight = Math.max(
      nextHeight,
      doc ? doc.scrollHeight : 0,
      body ? body.scrollHeight : 0,
      doc ? doc.offsetHeight : 0,
      body ? body.offsetHeight : 0,
      doc ? doc.clientHeight : 0,
      body ? body.clientHeight : 0
    );

    worldWidth = pageWidth;
    worldHeight = pageHeight;

    const nextCanvasWidth = Math.floor(nextWidth * nextDpr);
    const nextCanvasHeight = Math.floor(nextHeight * nextDpr);
    const viewportChanged =
      nextWidth !== width ||
      nextHeight !== height ||
      nextDpr !== dpr ||
      nextCanvasWidth !== canvas.width ||
      nextCanvasHeight !== canvas.height;

    width = nextWidth;
    height = nextHeight;
    dpr = nextDpr;

    if (viewportChanged) {
      canvas.width = nextCanvasWidth;
      canvas.height = nextCanvasHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    updateBlockers();
  };

  const syncViewportMaxSprites = (options = {}) => {
    const shouldRebuild = !!options.rebuild;
    const nextMobile = isMobileViewport();
    if (nextMobile === lastMobileViewport) return;
    lastMobileViewport = nextMobile;
    settings.maxSprites = resolveMaxSprites();
    if (shouldRebuild && loadedImages.length) {
      buildSprites(loadedImages);
    } else if (sprites.length > settings.maxSprites) {
      sprites = sprites.slice(0, settings.maxSprites);
    }
  };

  const updateBlockers = () => {
    if (!width || !height) return;
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const maxWidth = worldWidth || width;
    const maxHeight = worldHeight || height;
    const nodes = Array.from(document.querySelectorAll(blockerSelector));
    const next = [];
    nodes.forEach((node) => {
      const rect = node.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) return;
      const left = rect.left + scrollX - blockerPadding;
      const right = rect.right + scrollX + blockerPadding;
      const top = rect.top + scrollY - blockerPadding;
      const bottom = rect.bottom + scrollY + blockerPadding;
      if (right <= 0 || left >= maxWidth || bottom <= 0 || top >= maxHeight) return;
      next.push({ left, right, top, bottom });
    });
    const bridges = [];
    const sorted = [...next].sort((a, b) => a.top - b.top);
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const upper = sorted[i];
      const lower = sorted[i + 1];
      const gap = lower.top - upper.bottom;
      if (gap <= 0 || gap > blockerBridgeMaxGap) continue;
      const overlapLeft = Math.max(upper.left, lower.left);
      const overlapRight = Math.min(upper.right, lower.right);
      if (overlapRight <= overlapLeft) continue;
      bridges.push({
        left: overlapLeft,
        right: overlapRight,
        top: upper.bottom,
        bottom: lower.top
      });
    }
    blockers = next.concat(bridges);
    lastBlockerUpdate = performance.now();
  };

  const circleHitsRect = (sprite, rect) => {
    const nearestX = clamp(sprite.x, rect.left, rect.right);
    const nearestY = clamp(sprite.y, rect.top, rect.bottom);
    const dx = sprite.x - nearestX;
    const dy = sprite.y - nearestY;
    return dx * dx + dy * dy < sprite.radius * sprite.radius;
  };

  const resolveBlocker = (sprite, rect) => {
    const nearestX = clamp(sprite.x, rect.left, rect.right);
    const nearestY = clamp(sprite.y, rect.top, rect.bottom);
    let dx = sprite.x - nearestX;
    let dy = sprite.y - nearestY;
    const distSq = dx * dx + dy * dy;
    const radius = sprite.radius;
    if (distSq >= radius * radius) return;

    if (distSq === 0) {
      const toLeft = Math.abs(sprite.x - rect.left);
      const toRight = Math.abs(rect.right - sprite.x);
      const toTop = Math.abs(sprite.y - rect.top);
      const toBottom = Math.abs(rect.bottom - sprite.y);
      const min = Math.min(toLeft, toRight, toTop, toBottom);
      if (min === toLeft) {
        sprite.x = rect.left - radius;
        sprite.vx = -Math.abs(sprite.vx);
      } else if (min === toRight) {
        sprite.x = rect.right + radius;
        sprite.vx = Math.abs(sprite.vx);
      } else if (min === toTop) {
        sprite.y = rect.top - radius;
        sprite.vy = -Math.abs(sprite.vy);
      } else {
        sprite.y = rect.bottom + radius;
        sprite.vy = Math.abs(sprite.vy);
      }
      return;
    }

    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const ny = dy / dist;
    sprite.x = nearestX + nx * (radius + 0.5);
    sprite.y = nearestY + ny * (radius + 0.5);
    const dot = sprite.vx * nx + sprite.vy * ny;
    if (dot < 0) {
      sprite.vx -= 2 * dot * nx;
      sprite.vy -= 2 * dot * ny;
    }
  };

  const resolveBlockers = (sprite) => {
    if (!blockers.length) return;
    blockers.forEach((rect) => resolveBlocker(sprite, rect));
  };

  const loadImages = async (files) => {
    const results = [];
    await Promise.all(
      files.map(
        (src) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              img.__mediaScale = resolveMediaScale(src);
              results.push(img);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = src;
          })
      )
    );
    return results;
  };

  const createSprite = (img) => {
    const maxDim = Math.max(img.width, img.height) || 1;
    const scaleMultiplier = Number(img.__mediaScale);
    const normalizedScale =
      Number.isFinite(scaleMultiplier) && scaleMultiplier > 0 ? scaleMultiplier : 1;
    const target = randBetween(settings.minSize, settings.maxSize) * normalizedScale;
    const scale = target / maxDim;
    const spriteWidth = img.width * scale;
    const spriteHeight = img.height * scale;
    const radius = Math.max(spriteWidth, spriteHeight) / 2;
    const speed = randBetween(settings.minSpeed, settings.maxSpeed);
    const angle = randBetween(0, Math.PI * 2);
    let rotationSpeed = randBetween(-settings.maxRotationSpeed, settings.maxRotationSpeed);
    if (Math.abs(rotationSpeed) < settings.minRotationSpeed) {
      rotationSpeed = Math.sign(rotationSpeed || 1) * settings.minRotationSpeed;
    }

    return {
      img,
      x: randBetween(radius, Math.max(radius, (worldWidth || width) - radius)),
      y: randBetween(radius, Math.max(radius, (worldHeight || height) - radius)),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: randBetween(0, Math.PI * 2),
      rotationSpeed,
      width: spriteWidth,
      height: spriteHeight,
      radius
    };
  };

  const isOverlapping = (a, b) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distSq = dx * dx + dy * dy;
    const minDist = a.radius + b.radius;
    return distSq < minDist * minDist;
  };

  const buildSprites = (images) => {
    if (!images.length) {
      canvas.classList.add('hidden');
      return;
    }

    const count = Math.min(images.length, settings.maxSprites);
    const selected = images.length > count ? [...images].sort(() => 0.5 - Math.random()).slice(0, count) : images;
    updateBlockers();

    sprites = selected.map((img) => {
      let sprite = createSprite(img);
      let attempts = 0;
      while (
        attempts < 35 &&
        (sprites.some((existing) => isOverlapping(existing, sprite)) ||
          blockers.some((rect) => circleHitsRect(sprite, rect)))
      ) {
        sprite = createSprite(img);
        attempts += 1;
      }
      return sprite;
    });
  };

  const resolveWall = (sprite) => {
    const boundsWidth = worldWidth || width;
    const boundsHeight = worldHeight || height;
    if (sprite.x - sprite.radius < 0) {
      sprite.x = sprite.radius;
      sprite.vx = Math.abs(sprite.vx);
    } else if (sprite.x + sprite.radius > boundsWidth) {
      sprite.x = boundsWidth - sprite.radius;
      sprite.vx = -Math.abs(sprite.vx);
    }

    if (sprite.y - sprite.radius < 0) {
      sprite.y = sprite.radius;
      sprite.vy = Math.abs(sprite.vy);
    } else if (sprite.y + sprite.radius > boundsHeight) {
      sprite.y = boundsHeight - sprite.radius;
      sprite.vy = -Math.abs(sprite.vy);
    }
  };

  const resolveCollisions = (lockedSprite = null) => {
    for (let i = 0; i < sprites.length; i += 1) {
      for (let j = i + 1; j < sprites.length; j += 1) {
        const a = sprites[i];
        const b = sprites[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = a.radius + b.radius;
        if (dist === 0 || dist >= minDist) continue;

        const nx = dx / dist;
        const ny = dy / dist;

        const va = a.vx * nx + a.vy * ny;
        const vb = b.vx * nx + b.vy * ny;
        const diff = va - vb;

        const lockA = lockedSprite && a === lockedSprite;
        const lockB = lockedSprite && b === lockedSprite;

        if (!lockA) {
          a.vx -= diff * nx;
          a.vy -= diff * ny;
        }
        if (!lockB) {
          b.vx += diff * nx;
          b.vy += diff * ny;
        }

        const overlap = minDist - dist;
        if (lockA && !lockB) {
          b.x += nx * overlap;
          b.y += ny * overlap;
        } else if (lockB && !lockA) {
          a.x -= nx * overlap;
          a.y -= ny * overlap;
        } else {
          const correction = overlap / 2;
          a.x -= nx * correction;
          a.y -= ny * correction;
          b.x += nx * correction;
          b.y += ny * correction;
        }
      }
    }
  };

  const findSpriteIndexAt = (worldX, worldY) => {
    const grabPadding = 10;
    for (let i = sprites.length - 1; i >= 0; i -= 1) {
      const sprite = sprites[i];
      const dx = worldX - sprite.x;
      const dy = worldY - sprite.y;
      const radius = sprite.radius + grabPadding;
      if (dx * dx + dy * dy <= radius * radius) return i;
    }
    return -1;
  };

  const startDrag = (pointer, options = {}) => {
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;
    const idx = findSpriteIndexAt(worldX, worldY);
    if (idx < 0) return false;

    const sprite = sprites[idx];
    sprites.splice(idx, 1);
    sprites.push(sprite);

    drag = {
      sprite,
      pointerId: pointer.pointerId,
      touchId: pointer.touchId,
      offsetX: sprite.x - worldX,
      offsetY: sprite.y - worldY,
      targetX: sprite.x,
      targetY: sprite.y,
      lastPointerX: worldX,
      lastPointerY: worldY,
      lastTime: Number.isFinite(pointer.time) ? pointer.time : performance.now(),
      velocityX: 0,
      velocityY: 0,
      pullX: 0,
      pullY: 0,
      alpha: 1,
      source: options.source || 'pointer'
    };

    canvas.style.cursor = 'grabbing';
    return true;
  };

  const updateDrag = (pointer) => {
    if (!drag || !drag.sprite) return;
    const sprite = drag.sprite;
    const { width: boundsWidth, height: boundsHeight } = getWorldBounds();
    const now = Number.isFinite(pointer.time) ? pointer.time : performance.now();
    const dt = Math.max((now - drag.lastTime) / 1000, 0.001);

    const worldX = pointer.worldX;
    const worldY = pointer.worldY;
    const dx = worldX - drag.lastPointerX;
    const dy = worldY - drag.lastPointerY;

    const velocityScale = 1.35;
    const maxThrow = settings.maxSpeed * 6;
    const nextVx = clamp((dx / dt) * velocityScale, -maxThrow, maxThrow);
    const nextVy = clamp((dy / dt) * velocityScale, -maxThrow, maxThrow);

    drag.velocityX = nextVx;
    drag.velocityY = nextVy;

    const viewportWidth = Math.max(window.innerWidth || 0, 1);
    const viewportHeight = Math.max(window.innerHeight || 0, 1);
    const maxPull = 220;
    const edgeThreshold = 2;
    const prevPullX = Number.isFinite(drag.pullX) ? drag.pullX : 0;
    const prevPullY = Number.isFinite(drag.pullY) ? drag.pullY : 0;

    const clientX = Number(pointer.clientX);
    const clientY = Number(pointer.clientY);
    const movementX = Number(pointer.movementX);
    const movementY = Number(pointer.movementY);

    let directPullX = 0;
    let directPullY = 0;

    if (Number.isFinite(clientX)) {
      if (clientX < 0) directPullX = clientX;
      else if (clientX > viewportWidth) directPullX = clientX - viewportWidth;
    }

    if (Number.isFinite(clientY)) {
      if (clientY < 0) directPullY = clientY;
      else if (clientY > viewportHeight) directPullY = clientY - viewportHeight;
    }

    let pullX = directPullX;
    let pullY = directPullY;

    const atLeftEdge = Number.isFinite(clientX) && clientX <= edgeThreshold;
    const atRightEdge = Number.isFinite(clientX) && clientX >= viewportWidth - edgeThreshold;
    const atTopEdge = Number.isFinite(clientY) && clientY <= edgeThreshold;
    const atBottomEdge = Number.isFinite(clientY) && clientY >= viewportHeight - edgeThreshold;

    if (pullX === 0) {
      if (Number.isFinite(movementX)) {
        const pushingOut =
          (atLeftEdge && movementX < 0) ||
          (atRightEdge && movementX > 0);
        const pullingIn =
          (atLeftEdge && movementX > 0) ||
          (atRightEdge && movementX < 0);
        if (pushingOut || pullingIn) {
          pullX = prevPullX + movementX;
        } else {
          pullX = prevPullX * 0.85;
        }
      } else {
        pullX = prevPullX * 0.85;
      }
    }

    if (pullY === 0) {
      if (Number.isFinite(movementY)) {
        const pushingOut =
          (atTopEdge && movementY < 0) ||
          (atBottomEdge && movementY > 0);
        const pullingIn =
          (atTopEdge && movementY > 0) ||
          (atBottomEdge && movementY < 0);
        if (pushingOut || pullingIn) {
          pullY = prevPullY + movementY;
        } else {
          pullY = prevPullY * 0.85;
        }
      } else {
        pullY = prevPullY * 0.85;
      }
    }

    pullX = clamp(pullX, -maxPull, maxPull);
    pullY = clamp(pullY, -maxPull, maxPull);
    if (Math.abs(pullX) < 0.5) pullX = 0;
    if (Math.abs(pullY) < 0.5) pullY = 0;
    drag.pullX = pullX;
    drag.pullY = pullY;

    const pullMagnitude = Math.hypot(pullX, pullY);
    const pullRatio = clamp(pullMagnitude / maxPull, 0, 1);
    drag.alpha = 1 - pullRatio * 0.65;

    const overshootLimit = Math.min(maxPull, Math.round(settings.maxSize * 3));
    const applyPullX = directPullX === 0 ? pullX : 0;
    const applyPullY = directPullY === 0 ? pullY : 0;
    const targetX = worldX + drag.offsetX + applyPullX;
    const targetY = worldY + drag.offsetY + applyPullY;

    drag.targetX = clamp(targetX, -overshootLimit, boundsWidth + overshootLimit);
    drag.targetY = clamp(targetY, -overshootLimit, boundsHeight + overshootLimit);

    drag.lastPointerX = worldX;
    drag.lastPointerY = worldY;
    drag.lastTime = now;
  };

  const endDrag = () => {
    if (!drag || !drag.sprite) {
      drag = null;
      canvas.style.cursor = 'default';
      return;
    }

    const sprite = drag.sprite;
    const maxPull = 220;
    const maxVelocity = settings.maxSpeed * 7;
    const catapultStrength = maxVelocity / maxPull;
    const catapultVx = -drag.pullX * catapultStrength;
    const catapultVy = -drag.pullY * catapultStrength;

    let vx = drag.velocityX + catapultVx;
    let vy = drag.velocityY + catapultVy;
    const speed = Math.hypot(vx, vy);
    if (speed > maxVelocity && speed > 0) {
      const scale = maxVelocity / speed;
      vx *= scale;
      vy *= scale;
    }

    sprite.vx = vx;
    sprite.vy = vy;
    const throwSpeed = Math.hypot(sprite.vx, sprite.vy);
    if (throwSpeed > 1) {
      const signed = Math.random() < 0.5 ? -1 : 1;
      sprite.rotationSpeed = signed * clamp(throwSpeed / 320, settings.minRotationSpeed, settings.maxRotationSpeed * 2.2);
    }

    drag = null;
    canvas.style.cursor = 'default';
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    const scrollX = getScrollX();
    const scrollY = getScrollY();
    ctx.save();
    ctx.translate(-scrollX, -scrollY);
    sprites.forEach((sprite) => {
      ctx.save();
      if (drag && drag.sprite === sprite && Number.isFinite(drag.alpha)) {
        ctx.globalAlpha = clamp(drag.alpha, 0, 1);
      }
      ctx.translate(sprite.x, sprite.y);
      ctx.rotate(sprite.rotation);
      ctx.drawImage(sprite.img, -sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height);
      ctx.restore();
    });
    ctx.restore();
  };

  const step = (timestamp) => {
    const delta = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;
    if (timestamp - lastBlockerUpdate > 200) {
      updateBlockers();
    }

    const draggedSprite = drag && drag.sprite ? drag.sprite : null;

    sprites.forEach((sprite) => {
      if (draggedSprite && sprite === draggedSprite) return;
      sprite.x += sprite.vx * delta;
      sprite.y += sprite.vy * delta;
      sprite.rotation += sprite.rotationSpeed * delta;
      resolveWall(sprite);
    });

    if (draggedSprite && drag) {
      draggedSprite.x = drag.targetX;
      draggedSprite.y = drag.targetY;
      draggedSprite.vx = drag.velocityX;
      draggedSprite.vy = drag.velocityY;
      draggedSprite.rotation += draggedSprite.rotationSpeed * delta;
      if (!drag.pullX && !drag.pullY) resolveWall(draggedSprite);
    }

    resolveCollisions(draggedSprite);
    sprites.forEach((sprite) => {
      if (draggedSprite && sprite === draggedSprite) return;
      resolveBlockers(sprite);
    });
    draw();
    requestAnimationFrame(step);
  };

  const init = async () => {
    resize();
    let pngs = [];
    try {
      const response = await fetch(settings.manifestUrl, { cache: 'no-store', mode: 'cors' });
      if (response.ok) {
        const payload = await response.json();
        const files = Array.isArray(payload) ? payload : payload.files;
        pngs = normalizeMediaList(files);
      }
    } catch {
      // Ignore and fall back to configured media files.
    }

    if (!pngs.length) {
      pngs = normalizeMediaList(CONFIG.mediaFiles);
    }

    if (!pngs.length) {
      canvas.classList.add('hidden');
      return;
    }

    const images = await loadImages(pngs);
    loadedImages = images;
    syncViewportMaxSprites({ rebuild: false });
    buildSprites(loadedImages);
    if (sprites.length) {
      requestAnimationFrame(step);
    }
  };

  window.addEventListener('resize', () => {
    resize();
    syncViewportMaxSprites({ rebuild: true });
  });

  window.addEventListener('scroll', () => {
    updateBlockers();
  }, { passive: true });

  if ('ResizeObserver' in window && document.body) {
    const observer = new ResizeObserver(() => {
      resize();
      syncViewportMaxSprites({ rebuild: true });
    });
    observer.observe(document.body);
  }

  const onPointerDown = (event) => {
    if (!event || event.pointerType === 'touch' || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (!sprites.length) return;
    if (drag) return;
    const point = toWorldPoint(event.clientX, event.clientY);
    const started = startDrag(
      { worldX: point.x, worldY: point.y, pointerId: event.pointerId, time: event.timeStamp },
      { source: 'pointer' }
    );
    if (!started) return;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Ignore.
    }
    if (event.cancelable) event.preventDefault();
  };

  const onPointerMove = (event) => {
    if (!event) return;
    if (event.pointerType === 'touch') return;
    if (drag && drag.pointerId === event.pointerId) {
      const point = toWorldPoint(event.clientX, event.clientY);
      updateDrag({
        worldX: point.x,
        worldY: point.y,
        clientX: event.clientX,
        clientY: event.clientY,
        movementX: event.movementX,
        movementY: event.movementY,
        time: event.timeStamp
      });
      if (event.cancelable) event.preventDefault();
      return;
    }

    if (!drag && event.pointerType === 'mouse') {
      const point = toWorldPoint(event.clientX, event.clientY);
      const hit = findSpriteIndexAt(point.x, point.y) >= 0;
      canvas.style.cursor = hit ? 'grab' : 'default';
    }
  };

  const onPointerUp = (event) => {
    if (!drag || !event) return;
    if (event.pointerType === 'touch') return;
    if (drag.pointerId !== event.pointerId) return;
    if (event.cancelable) event.preventDefault();
    endDrag();
  };

  const onPointerCancel = (event) => {
    if (!drag || !event) return;
    if (event.pointerType === 'touch') return;
    if (drag.pointerId !== event.pointerId) return;
    endDrag();
  };

  const touchById = (touches, id) => {
    for (let i = 0; i < touches.length; i += 1) {
      const t = touches[i];
      if (t && t.identifier === id) return t;
    }
    return null;
  };

  const onTouchStart = (event) => {
    if (!event || drag || !sprites.length) return;
    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch) return;
    const point = toWorldPoint(touch.clientX, touch.clientY);
    const started = startDrag(
      { worldX: point.x, worldY: point.y, touchId: touch.identifier, time: event.timeStamp },
      { source: 'touch' }
    );
    if (!started) return;
    if (event.cancelable) event.preventDefault();
  };

  const onTouchMove = (event) => {
    if (!event || !drag || drag.source !== 'touch') return;
    const touch = touchById(event.touches, drag.touchId);
    if (!touch) return;
    const point = toWorldPoint(touch.clientX, touch.clientY);
    updateDrag({
      worldX: point.x,
      worldY: point.y,
      clientX: touch.clientX,
      clientY: touch.clientY,
      time: event.timeStamp
    });
    if (event.cancelable) event.preventDefault();
  };

  const onTouchEnd = (event) => {
    if (!event || !drag || drag.source !== 'touch') return;
    const ended = touchById(event.changedTouches, drag.touchId);
    if (!ended) return;
    if (event.cancelable) event.preventDefault();
    endDrag();
  };

  const onTouchCancel = (event) => {
    if (!event || !drag || drag.source !== 'touch') return;
    endDrag();
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('lostpointercapture', onPointerCancel);

  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', onTouchCancel, { passive: false });

  init();
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const SIZE_PACK_FIRST_REGEX = /(\d+)\s*(?:x|\u00d7|\*)\s*(\d+(?:\.\d+)?)\s?(ml|l)\b/i;
const SIZE_PACK_AFTER_REGEX = /(\d+(?:\.\d+)?)\s?(ml|l)\s*(?:x|\u00d7|\*)\s*(\d+)\b/i;
const SIZE_SINGLE_REGEX = /(\d+(?:\.\d+)?)\s?(ml|l)\b/i;
const SIZE_PACK_SIMPLE_REGEX = /(\d+)\s*(?:x|\u00d7|\*)\s*(\d+)/i;
const PACK_WORD_REGEX = /(\d+)\s*[- ]?\s*(?:pack|pk|case|ct|count)\b/i;
const PACK_CONTAINER_REGEX = /(\d+)\s*(?:x|\u00d7|\*)?\s*(?:cans?|bottles?|btls?|btl|tallboys?|stubbies?)\b/i;
const MIN_UNIT_ML = 30;

function trimNumber(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    if (Math.abs(numeric - Math.round(numeric)) < 0.0001) return String(Math.round(numeric));
    return String(numeric);
  }
  return String(value);
}

function formatVolumeLabel(volumeMl) {
  const ml = Number(volumeMl);
  if (!Number.isFinite(ml) || ml <= 0) return '';
  if (ml >= 1000) {
    const liters = ml / 1000;
    return `${trimNumber(Math.round(liters * 100) / 100)} L`;
  }
  return `${Math.round(ml)} mL`;
}

function formatAbvLabel(abvPercent) {
  if (!Number.isFinite(abvPercent) || abvPercent <= 0) return '';
  const rounded = Math.round(abvPercent * 10) / 10;
  return `ABV: ${trimNumber(rounded)}%`;
}

function formatScoreValue(score) {
  if (!Number.isFinite(score) || score <= 0) return null;
  const rounded = Math.round(score * 100) / 100;
  if (!Number.isFinite(rounded) || rounded <= 0) return null;
  return rounded.toFixed(2);
}

function formatAbvPerDollarLabel(product) {
  if (!product) return '';

  const score = abvSizePriceScore(product);
  const displayScore = formatScoreValue(score / 100);
  if (!displayScore) return '';
  return `%*mL/$: ${displayScore}`;
}

function getDisplayCategory(rawCategory, name) {
  const categoryText = normalizeMatchText(rawCategory);
  const nameText = normalizeMatchText(name);

  for (const type of DRINK_TYPE_MATCHERS) {
    if (textMatchesTerms(categoryText, type.matchTerms) || textMatchesTerms(nameText, type.matchTerms)) {
      return type.label;
    }
  }

  const segments = String(rawCategory || '')
    .split(/[|>]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const fallback =
    segments.find((segment) => segment.toLowerCase() !== 'products') ||
    segments[0] ||
    '';
  return fallback;
}

function extractAbvFromName(name) {
  if (!name) return null;
  const match = String(name).match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function parseSizeLabel(rawLabel) {
  if (!rawLabel) return null;
  const label = String(rawLabel).replace(/\s+/g, ' ').trim();
  if (!label) return null;

  let packCount = null;
  let unitVolume = null;
  let unit = null;
  let match = label.match(SIZE_PACK_FIRST_REGEX);

  if (match) {
    packCount = Number(match[1]);
    unitVolume = Number(match[2]);
    unit = match[3];
  } else {
    match = label.match(SIZE_PACK_AFTER_REGEX);
    if (match) {
      unitVolume = Number(match[1]);
      unit = match[2];
      packCount = Number(match[3]);
    } else {
      match = label.match(SIZE_PACK_SIMPLE_REGEX);
      if (match) {
        packCount = Number(match[1]);
        unitVolume = Number(match[2]);
      } else {
        match = label.match(SIZE_SINGLE_REGEX);
        if (match) {
          unitVolume = Number(match[1]);
          unit = match[2];
        }
      }
    }
  }

  if (Number.isFinite(unitVolume) && unitVolume > 0) {
    if (unit && unit.toLowerCase() === 'l') {
      unitVolume = unitVolume * 1000;
    }
  }

  if (!Number.isFinite(unitVolume) || unitVolume <= 0) return null;

  if (!Number.isFinite(packCount) || packCount <= 0) {
    const packMatch = label.match(PACK_WORD_REGEX);
    if (packMatch) packCount = Number(packMatch[1]);
  }
  if (!Number.isFinite(packCount) || packCount <= 0) {
    const packMatch = label.match(PACK_CONTAINER_REGEX);
    if (packMatch) packCount = Number(packMatch[1]);
  }
  if (!Number.isFinite(packCount) || packCount <= 0) packCount = 1;

  return {
    unitVolumeMl: unitVolume,
    packCount,
    totalVolumeMl: unitVolume * packCount,
    sizeLabel:
      packCount > 1
        ? `${trimNumber(packCount)} x ${formatVolumeLabel(unitVolume)}`
        : formatVolumeLabel(unitVolume)
  };
}

function parsePackCountLabel(rawLabel) {
  if (!rawLabel) return null;
  const label = String(rawLabel).replace(/\s+/g, ' ').trim();
  if (!label) return null;
  let match = label.match(PACK_WORD_REGEX);
  if (match) return Number(match[1]);
  match = label.match(PACK_CONTAINER_REGEX);
  if (match) return Number(match[1]);
  return null;
}

function normalizeUnitVolumeMl(candidate, packCount, labelInfo) {
  const value = Number(candidate);
  if (!Number.isFinite(value) || value <= 0) return null;
  const labelUnit = labelInfo && Number.isFinite(labelInfo.unitVolumeMl) ? labelInfo.unitVolumeMl : null;

  if (packCount && packCount > 1 && value <= MIN_UNIT_ML) {
    return labelUnit && labelUnit > MIN_UNIT_ML ? labelUnit : null;
  }

  if (labelUnit && packCount && packCount > 1) {
    const perUnit = value / packCount;
    if (perUnit >= MIN_UNIT_ML && Math.abs(perUnit - labelUnit) <= 5) {
      return perUnit;
    }
  }

  if (!labelUnit && packCount && packCount > 1 && value >= 1000) {
    const perUnit = value / packCount;
    if (perUnit >= MIN_UNIT_ML && perUnit <= 2000 && Math.abs(perUnit * packCount - value) <= 2) {
      return perUnit;
    }
  }

  if (labelUnit && value <= MIN_UNIT_ML && labelUnit > MIN_UNIT_ML) {
    return null;
  }

  return value;
}

function normalizeLooseVolumeMl(candidate, packCount) {
  const value = Number(candidate);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value >= MIN_UNIT_ML) return value;
  if ((!packCount || packCount <= 1) && value >= 0.2 && value <= 5) {
    return value * 1000;
  }
  return null;
}

function extractSizeInfo(raw) {
  const packCountRaw =
    safeNumber(raw.bottles_per_pack) ??
    safeNumber(raw.bottlesPerPack) ??
    safeNumber(raw.total_package_units);

  let packCount = Number.isFinite(packCountRaw) && packCountRaw > 0 ? packCountRaw : null;

  const packageLabel =
    raw.selling_package ||
    raw.sellingPackage ||
    raw.package ||
    raw.container ||
    '';

  const packageLabelClean = String(packageLabel || '').replace(/\s+/g, ' ').trim();
  const name = raw.name || raw.product_name || raw.title || '';

  const labelInfo = parseSizeLabel(packageLabelClean) || parseSizeLabel(name);

  if ((!packCount || packCount <= 1) && labelInfo && labelInfo.packCount > 1) {
    packCount = labelInfo.packCount;
  }

  const unitVolumeCandidates = [
    safeNumber(raw.unit_volume_ml),
    safeNumber(raw.unitVolumeMl),
    safeNumber(raw.volume_in_milliliters)
  ];

  let unitVolumeMl = null;
  if (labelInfo && Number.isFinite(labelInfo.unitVolumeMl)) {
    unitVolumeMl = labelInfo.unitVolumeMl;
  }

  if (!Number.isFinite(unitVolumeMl)) {
    for (const candidate of unitVolumeCandidates) {
      if (candidate > 0) {
        unitVolumeMl = candidate;
        break;
      }
    }
  }

  if (Number.isFinite(unitVolumeMl)) {
    const count = packCount && packCount > 1 ? packCount : 1;
    let sizeLabel =
      count > 1
        ? `${trimNumber(count)} x ${formatVolumeLabel(unitVolumeMl)}`
        : formatVolumeLabel(unitVolumeMl);
    if (!sizeLabel && packageLabelClean && /\d/.test(packageLabelClean)) sizeLabel = packageLabelClean;
    return {
      unitVolumeMl,
      packCount: count,
      totalVolumeMl: unitVolumeMl * count,
      sizeLabel
    };
  }

  return { unitVolumeMl: null, packCount: null, totalVolumeMl: null, sizeLabel: '' };
}

function normalizeProduct(raw) {
  const stripPetFromTitle = (value) => {
    if (!value) return value;
    const text = String(value);
    const stripped = text.replace(/\s*(?:,|-)?\s*(?:\(\s*pet\s*\)|\[\s*pet\s*\]|\bpet\b)\s*$/i, '');
    return stripped.replace(/\s{2,}/g, ' ').trim();
  };

  const name = stripPetFromTitle(raw.name || raw.product_name || raw.title || 'Unnamed product');
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

  const abvRaw =
    safeNumber(raw.alcohol_content) ??
    safeNumber(raw.alcohol_percent) ??
    safeNumber(raw.alcoholPercent) ??
    safeNumber(raw.alcoholContent) ??
    safeNumber(raw.alcohol_by_volume) ??
    safeNumber(raw.abv) ??
    safeNumber(raw.abv_percent);

  let abvPercent = null;
  const abvFromName = extractAbvFromName(name);
  if (Number.isFinite(abvRaw)) {
    if (abvRaw > 100) {
      abvPercent = abvRaw / 100;
    } else if (abvRaw >= 1) {
      abvPercent = abvRaw;
    } else if (abvRaw > 0) {
      abvPercent = abvRaw;
    }
  }
  if (!Number.isFinite(abvPercent) && Number.isFinite(abvFromName)) {
    abvPercent = abvFromName;
  } else if (Number.isFinite(abvFromName) && Number.isFinite(abvPercent)) {
    if (abvPercent < 1 && abvFromName >= 1) {
      abvPercent = abvFromName;
    }
  }

  const sizeInfo = extractSizeInfo(raw);
  const alcoholMl =
    Number.isFinite(sizeInfo.totalVolumeMl) && Number.isFinite(abvPercent)
      ? (sizeInfo.totalVolumeMl * abvPercent) / 100
      : null;

  const rawCategory =
    raw.primary_category ||
    raw.category ||
    raw.secondary_category ||
    raw.type ||
    raw.style;

  const rawId = raw.id || raw.product_id || raw.sku || raw.code;
  const fallbackId = [name, sizeInfo.sizeLabel || '', sizeInfo.unitVolumeMl || '', sizeInfo.packCount || '']
    .filter((value) => value !== null && value !== undefined && value !== '')
    .join('::');
  const variantTag = [
    Number.isFinite(sizeInfo.unitVolumeMl) ? `ml:${sizeInfo.unitVolumeMl}` : '',
    Number.isFinite(sizeInfo.packCount) ? `pk:${sizeInfo.packCount}` : '',
    Number.isFinite(priceCents) ? `cents:${priceCents}` : ''
  ]
    .filter(Boolean)
    .join('::');
  const stableId = rawId ? (variantTag ? `${rawId}::${variantTag}` : String(rawId)) : fallbackId;

  return {
    id: stableId,
    name,
    category: rawCategory,
    displayCategory: getDisplayCategory(rawCategory, name),
    priceCents,
    inventoryCount: inventory,
    image: raw.image_thumb_url || raw.image_url || raw.image,
    abvPercent,
    pricePerAlcoholMl:
      safeNumber(raw.price_per_alcohol_ml) ??
      safeNumber(raw.pricePerAlcoholMl),
    sizeLabel: sizeInfo.sizeLabel,
    unitVolumeMl: sizeInfo.unitVolumeMl,
    packCount: sizeInfo.packCount,
    totalVolumeMl: sizeInfo.totalVolumeMl,
    alcoholMl
  };
}

function isInStock(product) {
  if (product.inventoryCount === null || product.inventoryCount === undefined) return true;
  return product.inventoryCount > 0;
}

function isNonAlcoholicProduct(product) {
  const name = String(product.name || '').toLowerCase();
  const category = String(product.category || '').toLowerCase();
  if (NON_ALCOHOLIC_CATEGORY_TERMS.some((term) => category.includes(term))) return true;
  if (NON_ALCOHOLIC_NAME_TERMS.some((term) => name.includes(term))) return true;
  if (/\b0(?:\.0+)?\s*%/.test(name)) return true;
  return false;
}

function isBagProduct(product) {
  const category = String(product.category || '').toLowerCase();
  if (category.includes('bag in box') || category.includes('bag-in-box')) return false;
  if (BAG_CATEGORY_TERMS.some((term) => category.includes(term))) return true;
  const name = String(product.name || '').toLowerCase();
  if (BAG_NAME_REGEX.test(name)) {
    if (name.includes('bag in box') || name.includes('bag-in-box')) return false;
    return true;
  }
  return false;
}

function extractDrinkTypeMatches(product) {
  const categoryText = normalizeMatchText(
    [product.category, product.displayCategory].filter(Boolean).join(' ')
  );
  const nameText = normalizeMatchText(product.name);
  const categoryMatches = new Set();
  const nameMatches = new Set();

  DRINK_TYPE_MATCHERS.forEach((type) => {
    if (textMatchesTerms(categoryText, type.matchTerms)) {
      categoryMatches.add(type.key);
    }
    if (textMatchesTerms(nameText, type.matchTerms)) {
      nameMatches.add(type.key);
    }
  });

  const matches = new Set();
  const hasNonSpiritCategory = Array.from(categoryMatches).some((key) => NON_SPIRIT_KEYS.has(key));

  if (hasNonSpiritCategory) {
    categoryMatches.forEach((key) => {
      if (NON_SPIRIT_KEYS.has(key)) matches.add(key);
    });
    nameMatches.forEach((key) => {
      if (NON_SPIRIT_KEYS.has(key)) matches.add(key);
    });
  } else if (categoryMatches.size) {
    categoryMatches.forEach((key) => matches.add(key));
    nameMatches.forEach((key) => {
      if (SPIRIT_KEYS.has(key)) matches.add(key);
    });
  } else {
    nameMatches.forEach((key) => matches.add(key));
  }

  if (!matches.size && textMatchesTerms(`${categoryText} ${nameText}`, SPIRIT_MISC_MATCH_TERMS)) {
    SPIRIT_KEYS.forEach((key) => matches.add(key));
  }

  return matches;
}

function matchesDrinkType(product, selectedTypes) {
  if (!selectedTypes || !selectedTypes.size) return false;
  const matches = extractDrinkTypeMatches(product);
  if (!matches.size) return false;
  return Array.from(matches).some((key) => selectedTypes.has(key));
}

function filterAlcoholValueProducts(products, filters) {
  const { minPriceCents, maxPriceCents, selectedTypes } = filters || {};
  return dedupeProducts(
    (products || [])
      .map(normalizeProduct)
      .filter((product) => {
        if (!product.name || product.priceCents === null) return false;
        if (!isInStock(product)) return false;
        if (Number.isFinite(minPriceCents) && product.priceCents < minPriceCents) return false;
        if (Number.isFinite(maxPriceCents) && product.priceCents > maxPriceCents) return false;
        if (isBagProduct(product)) return false;
        if (isNonAlcoholicProduct(product)) return false;
        if (!matchesDrinkType(product, selectedTypes)) return false;
        return true;
      })
  );
}

function sortProductsByAbvValue(products) {
  return [...(products || [])].sort((a, b) => {
    const scoreDiff = abvSizePriceScore(b) - abvSizePriceScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    if (Number.isFinite(a.priceCents) && Number.isFinite(b.priceCents) && a.priceCents !== b.priceCents) {
      return a.priceCents - b.priceCents;
    }
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

function abvSizePriceScore(product) {
  if (!product) return 0;
  const price = Number(product.priceCents) / 100;
  if (
    Number.isFinite(price) &&
    price > 0 &&
    Number.isFinite(product.abvPercent) &&
    Number.isFinite(product.totalVolumeMl)
  ) {
    return (product.abvPercent * product.totalVolumeMl) / price;
  }
  const perAlcoholMl = Number(product.pricePerAlcoholMl);
  if (Number.isFinite(perAlcoholMl) && perAlcoholMl > 0) {
    return 100 / perAlcoholMl;
  }
  return 0;
}

function dedupeProducts(products) {
  const seen = new Set();
  return (products || []).filter((product) => {
    if (!product || !product.id) return false;
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

function makeUrl(path) {
  if (!CONFIG.apiBase) return null;
  const trimmedBase = CONFIG.apiBase.replace(/\/$/, '');
  const trimmedPath = path.startsWith('/') ? path : `/${path}`;
  return `${trimmedBase}${trimmedPath}`;
}

async function fetchJson(url, options = {}) {
  if (!url) return null;
  const tokenGuard = typeof options.tokenGuard === 'function' ? options.tokenGuard : null;
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
      // Try to surface a useful message from JSON errors (our local server returns { error }).
      if (contentType.includes('application/json')) {
        try {
          const payload = await response.json();
          const message = payload && (payload.error || payload.message);
          throw new Error(message ? `Request failed: ${response.status} (${message})` : `Request failed: ${response.status}`);
        } catch {
          // fall through
        }
      }
      throw new Error(`Request failed: ${response.status}`);
    }
    if (!contentType.includes('application/json')) {
      throw new Error('Response was not JSON');
    }

    return await response.json();
  } catch (error) {
    if (!tokenGuard || tokenGuard()) {
      state.apiFailed = true;
      state.apiError = error.message || 'API error';
    }
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

function fallbackAllProducts() {
  state.usedMock = true;
  return [...MOCK_PRODUCTS];
}

function getFetchLimit(options = {}) {
  const { storeScoped = false } = options;
  const base = Number(CONFIG.perPage);
  const desired =
    Number.isFinite(CONFIG.resultsLimit) && CONFIG.resultsLimit > 0
      ? CONFIG.resultsLimit * 6
      : null;
  let limit = 50;
  if (Number.isFinite(base) && base > 0 && Number.isFinite(desired)) {
    limit = Math.max(base, desired);
  } else if (Number.isFinite(base) && base > 0) {
    limit = base;
  } else if (Number.isFinite(desired) && desired > 0) {
    limit = desired;
  }

  if (storeScoped) {
    const storeMax = Number.isFinite(CONFIG.storeFetchMax) ? CONFIG.storeFetchMax : 200;
    const boosted =
      Number.isFinite(CONFIG.resultsLimit) && CONFIG.resultsLimit > 0
        ? CONFIG.resultsLimit * 12
        : null;
    if (Number.isFinite(boosted) && boosted > limit) {
      limit = boosted;
    }
    if (Number.isFinite(storeMax) && storeMax > 0) {
      limit = Math.min(limit, storeMax);
    }
  }

  return limit;
}

function needsBulkNonSpirits(selectedTypes) {
  if (!selectedTypes || !selectedTypes.size) return false;
  return (
    selectedTypes.has('beer') ||
    selectedTypes.has('rtd') ||
    selectedTypes.has('seltzer')
  );
}

function getFetchLimitForSelectedTypes(selectedTypes, options = {}) {
  const { storeScoped = false } = options;
  const baseLimit = getFetchLimit({ storeScoped });
  if (!storeScoped) return baseLimit;
  if (!selectedTypes || !selectedTypes.size) return baseLimit;
  const needsBulk = needsBulkNonSpirits(selectedTypes);
  if (needsBulk) {
    return CONFIG.storeFetchMax || 800;
  }
  return baseLimit;
}

function makeAllProductsCacheKey(storeId, preferAbv, fetchLimit) {
  const limitTag = Number.isFinite(fetchLimit) && fetchLimit > 0 ? fetchLimit : 'default';
  return `all-products::${storeId || 'all'}::${preferAbv ? 'abv' : 'price'}::${limitTag}`;
}

async function fetchAllProducts(storeId, preferAbv = true, options = {}) {
  const { force = false, fetchLimit = null } = options;
  const selectedTypes = options.selectedTypes || null;
  const typesParam = makeTypesParam(selectedTypes);
  const bulkNonSpirits = needsBulkNonSpirits(selectedTypes);
  const isFilteredTypes =
    !!storeId && typesParam && selectedTypes && selectedTypes.size < TOTAL_DRINK_TYPES && !bulkNonSpirits;
  const limit =
    Number.isFinite(fetchLimit) && fetchLimit > 0
      ? fetchLimit
      : getFetchLimit({ storeScoped: !!storeId });
  const cacheKey = `${makeAllProductsCacheKey(storeId, preferAbv, limit)}::types=${isFilteredTypes ? typesParam : 'all'}`;
  if (!force && state.productCache.has(cacheKey)) {
    return state.productCache.get(cacheKey);
  }

  const params = new URLSearchParams({
    q: '',
    per_page: String(limit)
  });
  if (isFilteredTypes) {
    params.set('types', typesParam);
  }
  if (preferAbv) {
    params.set('abv', '1');
  }

  let products = [];

  if (storeId) {
    const storeUrl = makeUrl(`/stores/${storeId}/products?${params.toString()}`);
    const storeData = await fetchJson(storeUrl);
    products = extractProducts(storeData);
    if (!products.length && state.apiFailed) {
      try {
        let fallback = [];
        if (preferAbv) {
          try {
            fallback = await fetchStoreTopValueProductsByGraphql(storeId, '', preferAbv, limit);
          } catch {
            fallback = [];
          }
        }
        if (!fallback.length) {
          fallback = await fetchStoreProductsByGraphql(storeId, '', preferAbv, limit);
        }
        if (fallback.length) {
          state.apiFailed = false;
          state.apiError = '';
          products = fallback;
        }
      } catch (error) {
        state.apiFailed = true;
        state.apiError = error && error.message ? error.message : 'GraphQL error';
      }
    }
  } else {
    const generalUrl = makeUrl(`/products?${params.toString()}`);
    const data = await fetchJson(generalUrl);
    products = extractProducts(data);
    if (!products.length && state.apiFailed) {
      try {
        const fallback = await fetchProductsByGraphql('', preferAbv, limit);
        if (fallback.length) {
          state.apiFailed = false;
          state.apiError = '';
          products = fallback;
        }
      } catch (error) {
        state.apiFailed = true;
        state.apiError = error && error.message ? error.message : 'GraphQL error';
      }
    }
  }

  if (!products.length) {
    products = fallbackAllProducts();
  }

  state.productCache.set(cacheKey, products);
  return products;
}

function setHasAnyFromSet(values, allowed) {
  if (!values || !values.size || !allowed || !allowed.size) return false;
  for (const value of values) {
    if (allowed.has(value)) return true;
  }
  return false;
}

function getFetchModesForSelectedTypes(selectedTypes) {
  const hasSpirits = setHasAnyFromSet(selectedTypes, SPIRIT_KEYS);
  const hasNonSpirits = setHasAnyFromSet(selectedTypes, NON_SPIRIT_KEYS);
  const needsBulk = needsBulkNonSpirits(selectedTypes);

  if (hasSpirits && hasNonSpirits) {
    return [true, false];
  }
  if (hasNonSpirits) {
    return needsBulk ? [false, true] : [false];
  }
  return [true];
}

async function fetchProductsForSelectedTypes(storeId, selectedTypes, options = {}) {
  const modes = getFetchModesForSelectedTypes(selectedTypes);
  const needsBulk = needsBulkNonSpirits(selectedTypes);

  const results = [];
  let anyRealData = false;
  let anyMockData = false;
  let mockList = null;
  let anyFailure = false;
  let firstError = '';

  for (const preferAbv of modes) {
    state.apiFailed = false;
    state.apiError = '';
    state.usedMock = false;

    const effectiveFetchLimit =
      storeId
        ? needsBulk
          ? getFetchLimitForSelectedTypes(selectedTypes, { storeScoped: true })
          : preferAbv
            ? getFetchLimit({ storeScoped: true })
            : getFetchLimitForSelectedTypes(selectedTypes, { storeScoped: true })
        : options.fetchLimit;

    const list = await fetchAllProducts(storeId, preferAbv, {
      ...options,
      fetchLimit: effectiveFetchLimit,
      selectedTypes
    });
    const callFailed = state.apiFailed;
    const callError = state.apiError;
    const callUsedMock = state.usedMock;

    if (callFailed) {
      anyFailure = true;
    }
    if (callFailed && !firstError) firstError = callError || 'API error';

    if (Array.isArray(list) && list.length) {
      if (callUsedMock) {
        anyMockData = true;
        mockList = list;
      } else {
        anyRealData = true;
        results.push(...list);
      }
    } else if (callUsedMock) {
      anyMockData = true;
    }
  }

  // If we got any real data, ignore any mock fallback from other fetch modes.
  if (anyRealData) {
    state.apiFailed = false;
    state.apiError = '';
    state.usedMock = false;
    return dedupeProducts(results);
  }

  if (mockList) {
    state.usedMock = true;
    state.apiFailed = anyFailure;
    state.apiError = anyFailure && firstError ? firstError : '';
    return dedupeProducts(mockList);
  }

  state.usedMock = false;
  state.apiFailed = anyFailure;
  state.apiError = anyFailure && firstError ? firstError : '';
  return [];
}

async function fetchStoresByQuery(query, options = {}) {
  const raw = (query || '').trim();
  if (!raw) return [];
  const tokenGuard = typeof options.tokenGuard === 'function' ? options.tokenGuard : null;

  const variants = [];
  if (isPostalLike(raw)) {
    const normalized = normalizePostalCode(raw);
    const spaced = normalized.length > 3 ? `${normalized.slice(0, 3)} ${normalized.slice(3)}` : '';
    [normalized, spaced, raw].forEach((value) => {
      if (value && !variants.includes(value)) variants.push(value);
    });
  } else {
    variants.push(raw);
  }

  for (const candidate of variants) {
    const params = new URLSearchParams({
      [CONFIG.storePostalParam]: candidate,
      per_page: '4'
    });
    const url = makeUrl(`/stores?${params.toString()}`);
    const data = await fetchJson(url, { tokenGuard });
    const stores = extractStores(data);
    if (stores.length) return stores;
    if (state.apiFailed) {
      try {
        const fallback = await fetchStoresByGraphql(candidate, 4);
        if (fallback.length) {
          state.apiFailed = false;
          state.apiError = '';
          return fallback;
        }
      } catch (error) {
        if (!tokenGuard || tokenGuard()) {
          state.apiFailed = true;
          state.apiError = error && error.message ? error.message : 'GraphQL error';
        }
      }
      return [];
    }
  }

  return [];
}

function renderProductLine(product) {
  const line = document.createElement('li');
  line.className = 'product-line';

  const left = document.createElement('div');
  left.className = 'product-left';

  const hasImage = product && product.image;
  const thumb = document.createElement(hasImage ? 'img' : 'div');
  thumb.className = 'product-thumb';
  if (hasImage) {
    thumb.src = product.image;
    thumb.alt = product.name || 'Product';
    thumb.loading = 'lazy';
    thumb.decoding = 'async';
  } else {
    thumb.setAttribute('aria-hidden', 'true');
  }

  const text = document.createElement('div');
  text.className = 'product-text';

  const name = document.createElement('div');
  name.className = 'product-name';
  name.textContent = product && product.name ? product.name : 'Unnamed product';
  text.appendChild(name);

  const detailParts = [];
  if (product && product.sizeLabel) detailParts.push(product.sizeLabel);
  const displayCategory =
    product && (product.displayCategory || product.category)
      ? product.displayCategory || product.category
      : '';
  if (displayCategory) detailParts.push(displayCategory);
  if (detailParts.length) {
    const size = document.createElement('div');
    size.className = 'product-size';
    size.textContent = detailParts.join('  ');
    text.appendChild(size);
  }

  const abvLabel = product ? formatAbvLabel(product.abvPercent) : '';
  if (abvLabel) {
    const abv = document.createElement('div');
    abv.className = 'product-abv';
    abv.textContent = abvLabel;
    text.appendChild(abv);
  }

  const abvPerDollarLabel = formatAbvPerDollarLabel(product);
  if (abvPerDollarLabel) {
    const abvValue = document.createElement('div');
    abvValue.className = 'product-value';
    abvValue.textContent = abvPerDollarLabel;
    text.appendChild(abvValue);
  }

  left.appendChild(thumb);
  left.appendChild(text);

  const price = document.createElement('div');
  price.className = 'product-price';
  price.textContent =
    product && product.priceCents !== null && product.priceCents !== undefined
      ? toDollars(product.priceCents)
      : 'N/A';

  line.appendChild(left);
  line.appendChild(price);

  return line;
}

function renderAllProducts(products) {
  elements.pairings.innerHTML = '';

  if (!products.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No in-stock products matched those filters.';
    elements.pairings.appendChild(empty);
    return;
  }

  products.forEach((product, index) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.style.animationDelay = `${index * 0.03}s`;

    const list = document.createElement('ul');
    list.appendChild(renderProductLine(product));
    card.appendChild(list);

    elements.pairings.appendChild(card);
  });
}

function applyFiltersAndRender() {
  const sourceProducts = state.lastProducts || [];
  setResultsLoading(false);
  const selectedTypes = getSelectedDrinkTypes();
  const { minPriceCents, maxPriceCents } = getPriceRangeCents();
  const filtered = sourceProducts.length
    ? filterAlcoholValueProducts(sourceProducts, {
        minPriceCents,
        maxPriceCents,
        selectedTypes
      })
    : [];
  const sorted = sourceProducts.length ? sortProductsByAbvValue(filtered) : [];
  const isFilteredTypes =
    selectedTypes && selectedTypes.size && selectedTypes.size < TOTAL_DRINK_TYPES;
  const displayLimit =
    !isFilteredTypes && Number.isFinite(CONFIG.resultsLimit) && CONFIG.resultsLimit > 0
      ? CONFIG.resultsLimit
      : null;
  const visible = displayLimit ? sorted.slice(0, displayLimit) : sorted;
  renderAllProducts(visible);
  const meta = document.createElement('span');
  meta.append('Sorted by alcohol value (');
  meta.appendChild(buildFormulaElement());
  meta.append(').');
  setResultsMeta(meta);
}

function renderResultsLoadingPlaceholders(count = 6) {
  if (!elements.pairings) return;
  elements.pairings.innerHTML = '';
  const total = Math.max(1, Math.min(Number(count) || 6, 12));
  for (let i = 0; i < total; i += 1) {
    const card = document.createElement('article');
    card.className = 'card skeleton';
    card.setAttribute('aria-hidden', 'true');
    elements.pairings.appendChild(card);
  }
}

function setResultsLoading(loading, options = {}) {
  const next = !!loading;
  const { placeholders = false, placeholderCount = 6 } = options;
  state.resultsLoading = next;

  if (elements.pairings) {
    if (next) {
      elements.pairings.setAttribute('aria-busy', 'true');
    } else {
      elements.pairings.removeAttribute('aria-busy');
    }
  }

  if (elements.resultsSection) {
    elements.resultsSection.classList.toggle('loading', next);
  }

  if (next && placeholders) {
    renderResultsLoadingPlaceholders(placeholderCount);
  }
}

function renderStoreLoadingPlaceholders(count = 3) {
  if (!elements.storeOptions) return;
  elements.storeOptions.innerHTML = '';
  const total = Math.max(1, Math.min(Number(count) || 3, 6));
  for (let i = 0; i < total; i += 1) {
    const optionWrap = document.createElement('div');
    optionWrap.className = 'store-option skeleton';
    const skeleton = document.createElement('div');
    skeleton.className = 'store-skeleton';
    skeleton.setAttribute('aria-hidden', 'true');
    optionWrap.appendChild(skeleton);
    elements.storeOptions.appendChild(optionWrap);
  }
}

function setStoreLookupLoading(loading, options = {}) {
  const next = !!loading;
  const { placeholders = false, placeholderCount = 3 } = options;
  state.storeLookupLoading = next;

  if (elements.findStores) {
    elements.findStores.classList.toggle('loading', next);
  }

  if (elements.storeOptions) {
    if (next) {
      elements.storeOptions.setAttribute('aria-busy', 'true');
    } else {
      elements.storeOptions.removeAttribute('aria-busy');
    }
  }

  if (elements.storePicker) {
    elements.storePicker.classList.toggle('loading', next);
    if (next || state.stores.length) {
      elements.storePicker.classList.remove('hidden');
    } else {
      elements.storePicker.classList.add('hidden');
    }
  }

  if (next && placeholders) {
    renderStoreLoadingPlaceholders(placeholderCount);
  }
}

function renderStores(stores, selectedId = null) {
  state.stores = Array.isArray(stores) ? stores : [];
  rebuildStoreOptions(state.stores, selectedId);

  if (elements.storePicker) {
    if (state.stores.length || state.storeLookupLoading) {
      elements.storePicker.classList.remove('hidden');
    } else {
      elements.storePicker.classList.add('hidden');
    }
  }
}

function handleStoreSelection() {
  const previousStoreId = state.lastStoreId;
  const selection = getStoreSelection();

  if (selection.mode === 'auto') {
    state.storeId = '';
    state.storeName = '';
    setStatus('Using the nearest store based on your search.', 'info');
    setResultsTitle();
    if (previousStoreId) {
      state.lastProducts = [];
      elements.pairings.innerHTML = '';
    }
    return;
  }

  state.storeId = selection.id;
  state.storeName = selection.name || '';
  setStatus(`Using store ${state.storeName || state.storeId}.`, 'info');
  setResultsTitle();

  if (previousStoreId && previousStoreId !== state.storeId) {
    state.lastProducts = [];
    elements.pairings.innerHTML = '';
  }
}

async function fetchExternalJson(url, options = {}) {
  if (!url) return null;
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.headers || {})
      },
      body: options.body,
      cache: 'no-store',
      mode: 'cors'
    });
    if (!response.ok) return null;
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

async function gqlRequest(query, variables) {
  if (!CONFIG.graphqlEndpoint) {
    throw new Error('Missing GraphQL endpoint');
  }
  const response = await fetch(CONFIG.graphqlEndpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
    mode: 'cors'
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed (${response.status})`);
  }

  const payload = await response.json();
  if (payload && Array.isArray(payload.errors) && payload.errors.length) {
    const message =
      payload.errors[0] && payload.errors[0].message
        ? payload.errors[0].message
        : 'GraphQL error';
    throw new Error(message);
  }
  return payload ? payload.data || null : null;
}

async function geocodePostalClient(postalRaw) {
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
  if (!candidates.includes(extracted)) candidates.push(extracted);

  for (const candidate of candidates) {
    const token = encodeURIComponent(String(candidate).trim().toLowerCase());
    const data = await fetchExternalJson(`https://api.zippopotam.us/ca/${token}`);
    const place = data && Array.isArray(data.places) ? data.places[0] : null;
    const latitude = place ? Number(place.latitude) : NaN;
    const longitude = place ? Number(place.longitude) : NaN;
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  // Browser-safe fallback: Open-Meteo's geocoding API tends to allow CORS,
  // unlike many free geocoders.
  for (const candidate of candidates) {
    const token = encodeURIComponent(`${String(candidate).trim()} Canada`);
    const data = await fetchExternalJson(
      `https://geocoding-api.open-meteo.com/v1/search?name=${token}&count=1&language=en&format=json&country_code=CA`
    );
    const first = data && Array.isArray(data.results) ? data.results[0] : null;
    const latitude = first ? Number(first.latitude) : NaN;
    const longitude = first ? Number(first.longitude) : NaN;
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  const token = encodeURIComponent(extracted);
  const results = await fetchExternalJson(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ca&q=${token}`
  );
  const first = Array.isArray(results) ? results[0] : null;
  const latitude = first ? Number(first.lat) : NaN;
  const longitude = first ? Number(first.lon) : NaN;
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return { latitude, longitude };
  }

  return null;
}

function toLegacyStoreFromGraphql(node) {
  if (!node) return null;
  const id = node.externalId || node.id;
  if (!id) return null;
  return {
    id: String(id),
    name: node.name || `Store ${id}`,
    address_line_1: node.address || '',
    city: node.city || '',
    postal_code: node.postalCode || ''
  };
}

function toLegacyProductFromGraphql(node, inventoryCount) {
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

async function fetchStoreCoordsByGraphql(storeId) {
  if (!storeId) return null;
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

async function fetchStoresByGraphql(queryRaw, limit = 4) {
  const coords = await geocodePostalClient(queryRaw);
  if (!coords) return [];

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
    radiusKm: Number.isFinite(CONFIG.storeRadiusKm) ? CONFIG.storeRadiusKm : 10,
    first: Math.min(Math.max(Number(limit) || 4, 1), 10)
  });

  const edges = data && data.stores && Array.isArray(data.stores.edges) ? data.stores.edges : [];
  return edges.map((edge) => toLegacyStoreFromGraphql(edge && edge.node)).filter(Boolean);
}

async function fetchProductsByGraphql(term, preferAbv, limit = 50) {
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

  const data = await gqlRequest(query, {
    term: term || '',
    first: Math.min(Math.max(Number(limit) || 30, 1), 50),
    sortBy
  });

  const edges = data && data.products && Array.isArray(data.products.edges) ? data.products.edges : [];
  return edges
    .map((edge) => edge && edge.node)
    .map((node) => {
      const invEdges = node && node.inventories && Array.isArray(node.inventories.edges) ? node.inventories.edges : [];
      const qty = invEdges[0] && invEdges[0].node ? Number(invEdges[0].node.quantity) : 0;
      if (!qty) return null;
      return toLegacyProductFromGraphql(node, qty);
    })
    .filter(Boolean);
}

async function fetchStoreTopValueProductsByGraphql(storeId, term, preferAbv, limit = 50) {
  if (!storeId) return [];
  const coords = await fetchStoreCoordsByGraphql(storeId);
  if (!coords) return [];

  const desired = Math.min(Math.max(Number(limit) || 30, 1), 200);
  const pageSize = Math.min(desired, 50);
  const sortBy = preferAbv ? 'PRICE_PER_ALCOHOL_ML' : 'PRICE';
  const radiusKm = Number.isFinite(CONFIG.storeRadiusKm) ? CONFIG.storeRadiusKm : 10;
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
  const products = [];
  const seen = new Set();

  while (products.length < desired && pages < maxPages) {
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
      const inventories =
        node.inventories && Array.isArray(node.inventories.edges)
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
      const legacy = toLegacyProductFromGraphql(node, matchedQty);
      if (!legacy || seen.has(legacy.id)) return;
      seen.add(legacy.id);
      products.push(legacy);
    });

    const pageInfo = connection ? connection.pageInfo : null;
    if (!pageInfo || !pageInfo.hasNextPage || !pageInfo.endCursor) break;
    after = pageInfo.endCursor;
    pages += 1;
  }

  return products.slice(0, desired);
}

async function fetchStoreProductsByGraphql(storeId, term, preferAbv, limit = 50) {
  if (!storeId) return [];
  const desired = Math.min(Math.max(Number(limit) || 30, 1), 200);
  const pageSize = Math.min(desired, 50);
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
  const maxPages = Math.ceil(desired / pageSize) + 2;
  const products = [];

  while (products.length < desired && pages < maxPages) {
    const data = await gqlRequest(query, { storeId: String(storeId), first: pageSize, after });
    const store = data && data.store ? data.store : null;
    const inventoryConnection = store && store.inventories ? store.inventories : null;
    const edges =
      inventoryConnection && Array.isArray(inventoryConnection.edges)
        ? inventoryConnection.edges
        : [];

    edges.forEach((edge) => {
      const inventory = edge && edge.node ? edge.node : null;
      const product = inventory && inventory.product ? inventory.product : null;
      const qty = inventory ? Number(inventory.quantity) : 0;
      if (!qty || !product) return;
      const legacy = toLegacyProductFromGraphql(product, qty);
      if (legacy) products.push(legacy);
    });

    const pageInfo = inventoryConnection ? inventoryConnection.pageInfo : null;
    if (!pageInfo || !pageInfo.hasNextPage || !pageInfo.endCursor) break;
    after = pageInfo.endCursor;
    pages += 1;
  }

  return dedupeProducts(products).slice(0, desired);
}

function scheduleStoreLookup() {
  if (!elements.postal) return;
  const queryRaw = elements.postal.value.trim();
  const normalizedQuery = normalizeStoreQuery(queryRaw);
  if (!normalizedQuery) {
    if (storeLookupTimer) {
      clearTimeout(storeLookupTimer);
      storeLookupTimer = null;
    }
    lastStoreQuery = '';
    storeLookupToken += 1;
    setStoreLookupLoading(false);
    renderStores([]);
    return;
  }
  if (normalizedQuery === lastStoreQuery) {
    if (storeLookupTimer) {
      clearTimeout(storeLookupTimer);
      storeLookupTimer = null;
    }
    setStoreLookupLoading(false);
    return;
  }
  if (storeLookupTimer) {
    clearTimeout(storeLookupTimer);
  }
  renderStores([]);
  const token = ++storeLookupToken;
  setStoreLookupLoading(true, { placeholders: true });
  storeLookupTimer = setTimeout(() => {
    storeLookupTimer = null;
    if (token !== storeLookupToken) return;
    handleFindStores({ silent: true, query: queryRaw, token });
  }, 400);
}

async function handleFindStores(options = {}) {
  const { silent = false, query: queryOverride = null, token: tokenOverride = null } = options;
  if (!silent) {
    clearStatus();
  }
  state.apiFailed = false;
  state.apiError = '';
  const queryRaw = (queryOverride ?? elements.postal.value).trim();
  const normalizedQuery = normalizeStoreQuery(queryRaw);
  if (!normalizedQuery) {
    if (!silent) {
      setStatus('Enter a postal code or store address to find nearby stores.', 'warn');
    }
    setStoreLookupLoading(false);
    renderStores([]);
    return;
  }
  if (silent && normalizedQuery === lastStoreQuery) {
    setStoreLookupLoading(false);
    return;
  }
  if (storeLookupTimer) {
    clearTimeout(storeLookupTimer);
    storeLookupTimer = null;
  }

  const token = tokenOverride !== null && tokenOverride !== undefined ? tokenOverride : ++storeLookupToken;
  if (token !== storeLookupToken) return;
  lastStoreQuery = normalizedQuery;

  if (isPostalLike(queryRaw)) {
    elements.postal.value = formatPostalCode(queryRaw);
  }

  setStoreLookupLoading(true, { placeholders: silent });
  if (!silent) {
    setStatus('Looking up stores...', 'info');
  }
  const stores = await fetchStoresByQuery(queryRaw, {
    tokenGuard: () => token === storeLookupToken
  });

  if (token !== storeLookupToken) return;

  setStoreLookupLoading(false);

  if (state.apiFailed) {
    if (!silent || queryRaw.length >= 3) {
      setStatus(
        `Could not reach the LCBO API (${state.apiError}). Check the API base in config.js.`,
        'warn'
      );
    }
    if (silent) {
      renderStores([]);
    }
    return;
  }

  if (!stores.length) {
    renderStores([]);
    if (!silent) {
      setStatus('No stores found. Try a nearby postal code.', 'warn');
    }
    return;
  }
  if (!silent) {
    clearStatus();
  }
  renderStores(stores);
}

async function resolveStoreSelection(options = {}) {
  const { requireLocation = false } = options;
  const selection = getStoreSelection();
  state.storeId = selection.id;
  state.storeName = selection.name;

  if (selection.mode === 'auto') {
    const queryRaw = elements.postal.value.trim();
    if (queryRaw) {
      if (isPostalLike(queryRaw)) {
        elements.postal.value = formatPostalCode(queryRaw);
      }
      setResultsMeta('Finding nearby stores for your search...');
      const stores = await fetchStoresByQuery(queryRaw);
      if (!state.apiFailed && stores.length) {
        const nearest = stores[0];
        state.storeId = nearest.id || '';
        state.storeName = nearest.name || '';
        renderStores(stores, state.storeId);
        setStatus(`Using nearby store ${state.storeName || state.storeId}.`, 'info');
      } else if (!state.apiFailed) {
        renderStores([]);
        const message = requireLocation
          ? 'No stores found for that search. Try a nearby postal code.'
          : 'No stores found for that search. Showing results for all stores.';
        setStatus(message, 'warn');
        if (requireLocation) return null;
      }
    } else if (requireLocation) {
      setStatus('Enter a postal code or select a store to see in-stock products.', 'warn');
      return null;
    } else {
      state.storeId = '';
      state.storeName = '';
    }
  }

  return selection;
}

async function handleSearch() {
  clearStatus();
  state.apiFailed = false;
  state.apiError = '';
  state.usedMock = false;
  setResultsLoading(true, { placeholders: true });

  const selection = await resolveStoreSelection({ requireLocation: true });
  setResultsTitle();

  if (!selection) {
    setResultsLoading(false);
    elements.pairings.innerHTML = '';
    setResultsMeta('Select a store to see in-stock products.');
    return;
  }

  setResultsMeta('Loading in-stock products...');
  const selectedTypes = getSelectedDrinkTypes();
  const fetchLimit = getFetchLimitForSelectedTypes(selectedTypes, { storeScoped: true });
  const products = await fetchProductsForSelectedTypes(state.storeId || null, selectedTypes, {
    fetchLimit
  });
  state.lastProducts = products || [];
  state.lastStoreId = state.storeId || '';
  setResultsLoading(false);

  if (state.apiFailed) {
    setStatus(
      `Could not reach the LCBO API (${state.apiError}). Showing sample data instead. Update config.js with your API base.`,
      'warn'
    );
  } else if (state.usedMock) {
    setStatus('Using sample data. Update config.js to connect a live LCBO API.', 'warn');
  }

  applyFiltersAndRender();
}

function handleReset() {
  elements.form.reset();
  if (elements.minPrice) elements.minPrice.value = String(PRICE_RANGE.defaultMin);
  if (elements.maxPrice) elements.maxPrice.value = String(PRICE_RANGE.defaultMax);
  updatePriceRange();
  elements.pairings.innerHTML = '';
  state.storeId = '';
  state.storeName = '';
  state.stores = [];
  state.lastProducts = [];
  state.lastStoreId = '';
  setResultsLoading(false);
  rebuildStoreOptions([]);
  if (elements.storePicker) {
    elements.storePicker.classList.add('hidden');
  }
  if (storeLookupTimer) {
    clearTimeout(storeLookupTimer);
    storeLookupTimer = null;
  }
  storeLookupToken = 0;
  setStoreLookupLoading(false);
  if (drinkTypeRefreshTimer) {
    clearTimeout(drinkTypeRefreshTimer);
    drinkTypeRefreshTimer = null;
  }
  drinkTypeRefreshToken = 0;
  lastStoreQuery = '';
  clearStatus();
  setResultsMeta('Ready when you are.');
  setResultsTitle();
  document.body.classList.add('no-scroll');
}

if (elements.minPrice) {
  elements.minPrice.addEventListener('input', () => {
    updatePriceRange();
    if (state.lastProducts.length) applyFiltersAndRender();
  });
}

if (elements.maxPrice) {
  elements.maxPrice.addEventListener('input', () => {
    updatePriceRange();
    if (state.lastProducts.length) applyFiltersAndRender();
  });
}

if (elements.postal) {
  elements.postal.addEventListener('input', () => {
    scheduleStoreLookup();
  });
}

elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  handleSearch();
  document.body.classList.remove('no-scroll');
});

elements.findStores.addEventListener('click', (event) => {
  event.preventDefault();
  handleFindStores();
});

if (elements.storeOptions) {
  elements.storeOptions.addEventListener('change', (event) => {
    const target = event.target;
    if (target && target.matches('input[name="store-choice"]')) {
      handleStoreSelection();
    }
  });
}

if (elements.drinkTypeInputs && elements.drinkTypeInputs.length) {
  elements.drinkTypeInputs.forEach((input) => {
    input.addEventListener('change', () => {
      scheduleDrinkTypeRefresh();
    });
  });
}

if (elements.selectAllTypes) {
  elements.selectAllTypes.addEventListener('click', (event) => {
    event.preventDefault();
    setAllDrinkTypes(true);
  });
}

if (elements.unselectAllTypes) {
  elements.unselectAllTypes.addEventListener('click', (event) => {
    event.preventDefault();
    setAllDrinkTypes(false);
  });
}

if (elements.reset) {
  elements.reset.addEventListener('click', (event) => {
    event.preventDefault();
    handleReset();
  });
}

updatePriceRange();
setResultsMeta('Ready when you are.');
setResultsTitle();
initFloatingMedia();
document.body.classList.add('no-scroll');
