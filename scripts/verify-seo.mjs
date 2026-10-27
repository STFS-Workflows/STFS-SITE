import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ javaScriptEnabled: false });
  for (const [route, canonical, heading] of [
    ['/', 'https://stfs.pl/', /automatyzacje AI/i],
    ['/projekty', 'https://stfs.pl/projekty', /projekty stron internetowych/i]
  ]) {
    const response = await page.goto(base + route);
    assert.equal(response.status(), 200, route);
    assert.equal(await page.locator('h1').count(), 1, `${route}: one H1`);
    assert.match(await page.locator('h1').textContent(), heading);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), canonical);
    assert.ok((await page.title()).length > 0);
    assert.ok((await page.locator('meta[name="description"]').getAttribute('content')).length > 0);
    assert.equal(await page.locator('meta[name="robots"][content*="noindex"]').count(), 0);
  }
  assert.equal(await page.locator('#projectGrid a[href^="/projekt?"]').count(), 2);
  const robots = await page.request.get(base + '/robots.txt');
  assert.match(await robots.text(), /https:\/\/stfs\.pl\/sitemap\.xml/);
  const sitemap = await page.request.get(base + '/sitemap.xml');
  const xml = await sitemap.text();
  assert.match(xml, /<loc>https:\/\/stfs\.pl\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/stfs\.pl\/projekty<\/loc>/);
  await page.goto(base + '/');
  assert.equal(await page.locator('#uslugi h2').evaluate(node => getComputedStyle(node).opacity), '1', 'Service heading must remain visible without JavaScript');
  assert.equal(await page.locator('#uslugi .service-card').first().evaluate(node => getComputedStyle(node).opacity), '1', 'Service content must remain visible without JavaScript');
  const organization = JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent());
  assert.equal(organization['@type'], 'Organization');
  assert.equal(organization.address.addressLocality, 'Katowice');
  assert.equal(organization.taxID, '6343077933');
  assert.equal(await page.locator('a[href="/projekty"]').count() > 0, true);
  assert.equal(await page.locator('#opinie').count(), 1);
  const preview = await page.request.get(base + '/showcases/premium/');
  assert.match(preview.headers()['x-robots-tag'] || '', /noindex/i);
  console.log('PASS: no-JS headings and project links, canonicals, sitemap, organization data and preview noindex.');
} finally { await browser.close(); }
