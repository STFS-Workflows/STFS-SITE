import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReadStream } from 'node:fs';
import { realpath, stat, readFile } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
try { process.loadEnvFile(path.join(ROOT, '.env')); } catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

function integer(value, fallback, min, max) {
  if (value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`Expected integer between ${min} and ${max}`);
  }
  return number;
}

export function mapsUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const valid = (['google.com', 'www.google.com', 'google.pl', 'www.google.pl'].includes(host) && url.pathname.startsWith('/maps'))
      || host === 'maps.google.com' || host === 'maps.google.pl'
      || (host === 'maps.app.goo.gl' && url.pathname.length > 1)
      || (host === 'goo.gl' && url.pathname.startsWith('/maps/'))
      || (host === 'share.google' && url.pathname.length > 1);
    return valid && url.protocol === 'https:' && !url.username && !url.password && !url.port ? url.href : null;
  } catch { return null; }
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif',
  '.ico': 'image/x-icon', '.gif': 'image/gif', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
};
const SITE_FILES = new Set([
  'index.html', 'projekty.html', 'projekt.html', 'portfolio.js', 'portfolio.css',
  'script.js', 'styles.css', 'page-transition.js', 'page-transition.css', 'showcase-bridge.js', 'walkthrough.css', 'coverflow.css', 'project-brand.css', 'landing-reviews.css', 'landing-reviews.js', 'process-journey.css', 'process-journey.js', 'workflow-demo.css', 'workflow-demo.js', 'logo_stfs.jpg', 'favicon.svg', 'favicon.ico', 'robots.txt', 'sitemap.xml',
  'polityka-prywatnosci.html', 'regulamin.html',
]);
const SHOWCASE_FILES = new Set([
  'index.html', 'gonsior.css', 'gonsior.js', 'premium.css', 'premium.js',
  'script.js', 'styles.css', 'refinement.css', 'venue-integrations.js',
  'polityka-prywatnosci.html', 'regulamin.html', 'robots.txt', 'sitemap.xml',
]);
const PUBLIC_FOLDERS = new Set(['assets', 'images', 'fonts']);
const ASSET_EXTENSIONS = new Set(Object.keys(MIME).filter(ext => !['.html', '.txt', '.xml'].includes(ext)));
const SHOWCASE_CSP = "connect-src 'none'; form-action 'none'; frame-src 'none'; default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; base-uri 'none'; object-src 'none'; sandbox allow-scripts";

function safeSegments(rawPath) {
  let decoded;
  try { decoded = decodeURIComponent(rawPath); } catch { return null; }
  // Reject before URL normalization, including Windows separators, ADS and double encoding.
  if (!decoded.startsWith('/') || /[\\:%\x00-\x1f\x7f]/.test(decoded)) return null;
  const segments = decoded.split('/').filter(Boolean);
  if (segments.some(part => part.startsWith('.') || /[. ]$/.test(part)
    || /^(?:node_modules|git|workflows|n8n-workflows|ops|docs|scripts|dist)$/i.test(part)
    || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) return null;
  return segments;
}

function allowed(parts, showcase) {
  if (parts.length === 1) return (showcase ? SHOWCASE_FILES : SITE_FILES).has(parts[0]);
  if (!PUBLIC_FOLDERS.has(parts[0])) return false;
  return ASSET_EXTENSIONS.has(path.extname(parts.at(-1)).toLowerCase())
    && !parts.some(part => /^(?:credentials|service-account|package(?:-lock)?)\./i.test(part));
}

function contained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function send(res, code, body, method = 'GET', headers = {}) {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(method === 'HEAD' ? undefined : body);
}

export function extractReviewsDOM({ limit, profileUrl }) {
  const text = (node, selector) => node.querySelector(selector)?.textContent?.trim() || null;
  const reviews = [];
  const seen = new Set();
  for (const node of document.querySelectorAll('[data-review-id]')) {
    const id = node.getAttribute('data-review-id');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const author = text(node, '.d4r55') || text(node, '[class*="author"]');
    const label = node.querySelector('[role="img"][aria-label]')?.getAttribute('aria-label') || '';
    const match = label.match(/([0-5](?:[.,]\d+)?)\s*(?:stars?|gwiazdk)/i);
    const rating = match ? Number(match[1].replace(',', '.')) : null;
    if (!author || rating === null || rating < 1 || rating > 5) continue;
    const link = node.querySelector('a[href*="reviewid="], a[href*="!1sCh"], a[href*="/reviews/"]')?.href;
    const url = link && /^https:\/\/(?:www\.)?google\.(?:com|pl)\//i.test(link) ? link : profileUrl;
    reviews.push({ author, rating, text: text(node, '.wiI7pd') || '', date: text(node, '.rsqaWe'), url });
    if (reviews.length >= limit) break;
  }
  // Only use dedicated place summary elements; never derive totals from sampled cards.
  const summary = document.querySelector('.F7nice');
  const ratingText = summary?.querySelector('[aria-hidden="true"]')?.textContent?.trim();
  const ratingValue = ratingText && /^[0-5](?:[.,]\d+)?$/.test(ratingText) ? Number(ratingText.replace(',', '.')) : null;
  const countLabel = summary?.querySelector('[aria-label*="reviews"], [aria-label*="opini"]')?.getAttribute('aria-label');
  const countMatch = countLabel?.match(/([\d\s\u00a0\u202f.,]+)\s*(?:reviews?|opini)/i);
  const countValue = countMatch ? Number(countMatch[1].replace(/\D/g, '')) : null;
  return { reviews, rating: ratingValue >= 1 && ratingValue <= 5 ? ratingValue : null,
    count: Number.isSafeInteger(countValue) && countValue >= 0 ? countValue : null };
}

export async function scrapeReviews({ profileUrl, limit = 20, timeoutMs = 45000, channel, browserType }) {
  let browser;
  let expired = false;
  const deadline = Date.now() + timeoutMs;
  const timer = setTimeout(() => { expired = true; void browser?.close().catch(() => {}); }, timeoutMs);
  const remaining = () => {
    if (expired || Date.now() >= deadline) throw new Error('timeout');
    return Math.max(1, deadline - Date.now());
  };
  try {
    const chromium = browserType || (await import('playwright')).chromium;
    browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}), timeout: remaining() });
    remaining();
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();
    page.setDefaultTimeout(Math.min(5000, remaining()));
    // Never let an unexpected redirect navigate to a non-Google destination.
    await context.route('**/*', route => {
      const request = route.request();
      if (request.isNavigationRequest()) {
        const url = new URL(request.url());
        const host = url.hostname;
        if (url.protocol !== 'https:' || !/^(?:[a-z0-9-]+\.)*(?:google\.com|google\.pl|googleusercontent\.com|gstatic\.com|goo\.gl|share\.google)$/.test(host)) return route.abort();
      }
      return route.continue();
    });
    const checkBarrier = async () => {
      remaining();
      const blocked = await page.evaluate(() => {
        const body = document.body?.innerText || '';
        return /(?:consent|accounts)\.google\./i.test(location.hostname)
          || /\/sorry\//i.test(location.pathname)
          || Boolean(document.querySelector('iframe[src*="recaptcha"], iframe[src*="captcha"], #captcha-form, input[type="password"]'))
          || /unusual traffic|verify (?:that )?you(?:'re| are) (?:a )?human|before you continue to Google|nietypowy ruch|zanim przejdziesz do Google/i.test(body);
      });
      if (blocked) throw new Error('blocked');
    };
    const response = await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: remaining() });
    if (response && response.status() >= 400) throw new Error('upstream_error');
    await checkBarrier();
    // A Maps profile may open the overview first. Only activate the public Reviews tab.
    const tab = page.getByRole('tab', { name: /reviews|opinie/i }).first();
    await Promise.race([
      page.locator('[data-review-id]').first().waitFor({ timeout: Math.min(10000, remaining()) }),
      tab.waitFor({ timeout: Math.min(10000, remaining()) }),
    ]).catch(() => {});
    await checkBarrier();
    if (await tab.count()) await tab.click({ timeout: Math.min(5000, remaining()) });
    const byId = new Map();
    let result = { reviews: [], rating: null, count: null };
    let stagnant = 0;
    for (let round = 0; round < 15 && byId.size < limit && stagnant < 3; round++) {
      await checkBarrier();
      // Expand visible public review text, without logging in or touching consent/challenge UI.
      const more = page.locator('[data-review-id] button').filter({ hasText: /^(More|Więcej)$/i });
      for (let i = 0, count = Math.min(await more.count(), limit); i < count; i++) {
        await checkBarrier();
        await more.nth(i).click({ timeout: Math.min(1000, remaining()) }).catch(() => {});
      }
      result = await page.evaluate(extractReviewsDOM, { limit, profileUrl });
      const before = byId.size;
      for (const review of result.reviews) {
        const key = JSON.stringify([review.author, review.date, review.text, review.rating]);
        if (byId.size < limit) byId.set(key, review);
      }
      stagnant = byId.size === before ? stagnant + 1 : 0;
      if (byId.size >= limit) break;
      await page.evaluate(() => {
        const feed = document.querySelector('[role="feed"]') || document.querySelector('[data-review-id]')?.parentElement?.parentElement;
        feed?.scrollBy(0, 1000);
      });
      await page.waitForTimeout(Math.min(700, remaining()));
    }
    await checkBarrier();
    return { ...result, reviews: [...byId.values()] };
  } catch (error) {
    if (expired || Date.now() >= deadline) throw new Error('timeout');
    throw error;
  } finally {
    clearTimeout(timer);
    await browser?.close();
  }
}

export function createReviewsService({ profileUrl = '', demo = false, refreshMs = 3600000, timeoutMs = 45000, limit = 20, channel, scrape = scrapeReviews } = {}) {
  const configuredUrl = mapsUrl(profileUrl);
  let cache = { status: profileUrl ? 'stale' : 'unconfigured', profileUrl: configuredUrl,
    rating: null, count: null, updatedAt: null, reviews: [],
    reason: profileUrl ? (configuredUrl ? 'loading' : 'invalid_profile_url') : 'missing_profile_url' };
  let inFlight = null;
  let timer;
  let stopped = false;
  const refresh = () => {
    if (stopped || !configuredUrl) return Promise.resolve();
    if (inFlight) return inFlight;
    inFlight = (async () => {
      try {
        const result = await scrape({ profileUrl: configuredUrl, timeoutMs, limit, channel });
        // An empty DOM is inconclusive (selector changes, incomplete load, etc.).
        if (!result.reviews.length && result.count !== 0) throw new Error('no_reviews_extracted');
        cache = { ...result, status: 'ok', profileUrl: configuredUrl, updatedAt: new Date().toISOString(), reason: null };
      } catch (error) {
        const known = ['blocked', 'timeout', 'upstream_error', 'no_reviews_extracted'];
        cache = { ...cache, status: 'stale', reason: known.includes(error.message) ? error.message : 'scrape_failed' };
        console.warn(`Reviews refresh: ${cache.reason}`);
      } finally { inFlight = null; }
    })();
    return inFlight;
  };
  return {
    snapshot: () => ({ ...structuredClone(cache), demo }), refresh,
    start() {
      if (stopped || timer || !configuredUrl) return;
      void refresh();
      timer = setInterval(() => void refresh(), refreshMs);
      timer.unref();
    },
    async stop() { stopped = true; clearInterval(timer); await inFlight; },
  };
}

export function createServer({ root = ROOT, templatesRoot = process.env.STFS_TEMPLATES_ROOT || 'E:/Projects/Projects/STFS-Templates', reviews = createReviewsService() } = {}) {
  const mounts = {
    gonsior: path.join(templatesRoot, 'clients', 'Dom-Przyjec-Gonsior'),
    premium: path.join(templatesRoot, 'clients', 'Dom-Przyjec-Premium-Radlin'),
  };
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    // Bind is loopback-only; reject DNS-rebinding Host headers too.
    if (!/^(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(req.headers.host || '')) return send(res, 403, 'Forbidden', req.method);
    if (!['GET', 'HEAD'].includes(req.method)) return send(res, 405, 'Method not allowed', req.method, { Allow: 'GET, HEAD' });
    try {
      const rawPath = (req.url || '/').split('?')[0];
      const parts = safeSegments(rawPath);
      if (!parts) return send(res, 403, 'Forbidden', req.method);
      const pathname = `/${parts.join('/')}`;
      if (pathname === '/opinie' || pathname === '/opinie.html') {
        return send(res, 308, '', req.method, { Location: '/#opinie' });
      }
      if (pathname === '/api/reviews') {
        return send(res, 200, JSON.stringify(reviews.snapshot()), req.method, { 'Content-Type': 'application/json; charset=utf-8' });
      }
      let base = root;
      let files = parts;
      let showcase = false;
      if (parts[0] === 'showcases') {
        if (!Object.hasOwn(mounts, parts[1])) return send(res, 404, 'Not found', req.method);
        base = mounts[parts[1]];
        showcase = true;
        res.setHeader('Content-Security-Policy', SHOWCASE_CSP);
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        if (parts.length === 2 && !rawPath.endsWith('/')) {
          return send(res, 308, '', req.method, { Location: `${pathname}/${(req.url || '').includes('?') ? `?${req.url.split('?').slice(1).join('?')}` : ''}` });
        }
        files = parts.slice(2);
      } else if (parts.length === 1 && ['projekty', 'projekt', 'polityka-prywatnosci', 'regulamin'].includes(parts[0])) {
        if (rawPath.endsWith('/')) return send(res, 308, '', req.method, { Location: pathname + ((req.url || '').includes('?') ? `?${req.url.split('?').slice(1).join('?')}` : '') });
        files = [`${parts[0]}.html`];
      }
      if (!files.length) files = ['index.html'];
      if (!allowed(files, showcase)) return send(res, 404, 'Not found', req.method);
      const realRoot = await realpath(base);
      const target = await realpath(path.join(base, ...files));
      if (!contained(realRoot, target)) return send(res, 403, 'Forbidden', req.method);
      const info = await stat(target);
      if (!info.isFile()) return send(res, 404, 'Not found', req.method);
      if (showcase && path.extname(target) === '.html') {
        const html = (await readFile(target, 'utf8')).replace('</head>', '<script src="/showcase-bridge.js" defer></script></head>');
        return send(res, 200, html, req.method, { 'Content-Type': MIME['.html'] });
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream',
        'Content-Length': info.size, 'Cache-Control': 'no-store' });
      if (req.method === 'HEAD') res.end();
      else await pipeline(createReadStream(target), res);
    } catch (error) {
      if (res.headersSent) return res.destroy();
      send(res, ['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500, ['ENOENT', 'ENOTDIR'].includes(error.code) ? 'Not found' : 'Internal server error', req.method);
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const reviews = createReviewsService({
    profileUrl: process.env.GOOGLE_MAPS_URL || '',
    demo: process.env.REVIEWS_DEMO === 'true',
    refreshMs: integer(process.env.REVIEWS_REFRESH_MS, 3600000, 1000, 2147483647),
    timeoutMs: integer(process.env.REVIEWS_TIMEOUT_MS, 45000, 1000, 120000),
    limit: integer(process.env.REVIEWS_LIMIT, 20, 1, 100),
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  });
  const server = createServer({ reviews });
  const port = integer(process.env.PORT, 4173, 1, 65535);
  server.on('error', error => { console.error(`Local server: ${error.message}`); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => {
    console.log(`STFS local server: http://127.0.0.1:${port}`);
    reviews.start();
  });
  const stop = async () => {
    server.close();
    server.closeAllConnections();
    await reviews.stop();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
