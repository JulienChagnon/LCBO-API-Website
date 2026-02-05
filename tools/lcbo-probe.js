const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const targetUrl =
  process.env.LCBO_URL ||
  'https://www.lcbo.com/en/products#t=clp-products&sort=relevancy&layout=card&f:@stores_stock=[true]';
const outDir = path.join(__dirname, '..', 'tmp');
const logFile = path.join(outDir, 'lcbo-network.log');
const requestLogFile = path.join(outDir, 'lcbo-requests.jsonl');
const htmlDumpFile = path.join(outDir, 'lcbo-page.html');
const coveoRequestFile = path.join(outDir, 'coveo-search-request.json');
const coveoResponseFile = path.join(outDir, 'coveo-search-response.json');

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(logFile, '');
fs.writeFileSync(requestLogFile, '');

const seen = new Set();
let capturedCoveoRequest = false;
let capturedCoveoResponse = false;

function shouldLog(url, contentType) {
  const lc = url.toLowerCase();
  if (lc.includes('graphql')) return true;
  if (lc.includes('/search')) return true;
  if (lc.includes('product')) return true;
  if (lc.includes('inventory')) return true;
  if (lc.includes('store')) return true;
  if (contentType && contentType.includes('application/json')) return true;
  return false;
}

function sanitizeFileName(value) {
  return value.replace(/[^a-z0-9]+/gi, '_').slice(0, 120);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });

  page.on('request', (request) => {
    const url = request.url();
    const method = request.method();
    const headers = request.headers();
    const postData = request.postData() || '';
    const entry = {
      method,
      url,
      headers: {
        accept: headers.accept,
        'content-type': headers['content-type'],
        authorization: headers.authorization,
        'x-api-key': headers['x-api-key'],
        'x-coveo-authorization': headers['x-coveo-authorization']
      },
      postData: postData ? postData.slice(0, 20000) : ''
    };
    if (shouldLog(url, headers['content-type'] || '')) {
      fs.appendFileSync(requestLogFile, `${JSON.stringify(entry)}\n`);
    }
    if (!capturedCoveoRequest && url.includes('platform.cloud.coveo.com/rest/search/v2')) {
      capturedCoveoRequest = true;
      fs.writeFileSync(
        coveoRequestFile,
        JSON.stringify({ method, url, headers, postData }, null, 2)
      );
    }
  });

  page.on('response', async (response) => {
    const url = response.url();
    if (seen.has(url) && !url.includes('platform.cloud.coveo.com/rest/search/v2')) return;
    const headers = response.headers();
    const contentType = (headers['content-type'] || '').toLowerCase();
    if (!shouldLog(url, contentType)) return;

    seen.add(url);
    const line = `[${response.status()}] ${response.request().method()} ${url}`;
    fs.appendFileSync(logFile, `${line}\n`);

    if (contentType.includes('application/json')) {
      try {
        const body = await response.text();
        if (!capturedCoveoResponse && url.includes('platform.cloud.coveo.com/rest/search/v2')) {
          capturedCoveoResponse = true;
          fs.writeFileSync(coveoResponseFile, body.slice(0, 2000000));
        }
        if (body.length <= 2000000) {
          const fileName = sanitizeFileName(url) + '.json';
          fs.writeFileSync(path.join(outDir, fileName), body);
        } else {
          const fileName = sanitizeFileName(url) + '.json.truncated';
          fs.writeFileSync(path.join(outDir, fileName), body.slice(0, 2000000));
        }
      } catch (error) {
        fs.appendFileSync(logFile, `  !! failed to read JSON body: ${error.message}\n`);
      }
    }
  });

  await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(5000);
  try {
    const html = await page.content();
    fs.writeFileSync(htmlDumpFile, html);
  } catch (error) {
    fs.appendFileSync(logFile, `  !! failed to save HTML: ${error.message}\n`);
  }

  await browser.close();
  console.log(`Logged ${seen.size} endpoints to ${logFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
