window.APP_CONFIG = {
  LCBO_API_BASE: '/api',
  REQUEST_TIMEOUT_MS: 45000, // Increased to 45s to allow full store scans
  STORE_POSTAL_PARAM: 'postal_code',
  LCBO_GRAPHQL_ENDPOINT: 'https://api.lcbo.dev/graphql',
  LCBO_STORE_RADIUS_KM: 10,
  PER_PAGE: 120,
  STORE_FETCH_MAX: 1000, // Increased max fetch
  RESULTS_LIMIT: 24, // Show a few more results
  MEDIA_FILE_SCALES: {
    'Media/malibu.png': 2,
    'Media/smirIce.png': 2,
    'Media/fireball.png': 2
  },
  MEDIA_MIN_SIZE: 60,
  MEDIA_MAX_SIZE: 60
};
