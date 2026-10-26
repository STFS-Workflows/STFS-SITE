import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/projekty');
  await page.locator('.project-card').first().waitFor();
  assert.equal(await page.locator('.project-card').count(), 2);
  await page.waitForFunction(() => [...document.querySelectorAll('.project-art img')].every(img => img.complete && img.naturalWidth > 0));
  await page.locator('#projectSearch').fill('nieistniejacyprojekt');
  assert.equal(await page.locator('.project-card').count(), 0);
  assert.equal(await page.locator('#emptyProjects').isVisible(), true);
  await page.locator('#projectSearch').fill('Gonsior');
  assert.equal(await page.locator('.project-card').count(), 1);
  await page.locator('#projectSearch').fill('');
  await page.locator('.project-card').first().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('.project-card')].every(node => getComputedStyle(node).opacity === '1'));
  await page.locator('#projectSearch').blur();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: join(tmpdir(), 'stfs-projekty-desktop.png'), fullPage: true });
  await page.locator('.project-card').first().click();
  await page.locator('iframe').waitFor();
  const frame = page.frameLocator('iframe');
  await frame.locator('h1').waitFor();
  assert.ok((await frame.locator('h1').textContent()).length > 5);
  const embedded = page.frames().find(frame => frame.url().includes('/showcases/gonsior/'));
  assert.ok(await embedded.evaluate(() => document.documentElement.scrollHeight > innerHeight), 'Preview must contain a full scrollable page');
  await page.locator('.chapter').first().scrollIntoViewIfNeeded();
  await page.locator('.chapter.visible').first().waitFor();
  assert.equal(await page.locator('.chapter').count(), 3);
  for (const chapter of await page.locator('.chapter').all()) {
    await chapter.scrollIntoViewIfNeeded();
    await chapter.evaluate(node => new Promise(resolve => {
      const check = () => getComputedStyle(node).opacity === '1' ? resolve() : requestAnimationFrame(check);
      check();
    }));
  }
  await embedded.evaluate(() => scrollTo(0, 0));
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: join(tmpdir(), 'stfs-projekt-desktop.png'), fullPage: true });
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/projekty', '/projekt?slug=dom-przyjec-gonsior', '/opinie']) {
      await page.goto(base + route);
      await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${route} overflows at ${width}px`);
    }
  }
  await page.locator('#reviews[aria-busy="false"]').waitFor();
  assert.notEqual(await page.locator('#reviewStatus').textContent(), 'Pobieramy opinie…');
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({ path: join(tmpdir(), 'stfs-opinie-mobile.png'), fullPage: true });
  await page.route('**/api/reviews', route => route.fulfill({ json: { status: 'unconfigured', demo: true, reviews: [] } }));
  await page.goto(base + '/opinie');
  await page.locator('#reviews[aria-busy="false"]').waitFor();
  assert.equal(await page.getByRole('note').isVisible(), true);
  assert.match(await page.getByRole('note').textContent(), /Nie dotyczą STFS/);
  await page.unroute('**/api/reviews');
  await page.goto(base + '/projekt?slug=unknown');
  assert.equal(await page.locator('h1').textContent(), 'Nie znaleziono projektu.');
  const protectedResponse = await page.request.get(base + '/server.mjs');
  assert.ok([403, 404].includes(protectedResponse.status()));
  assert.deepEqual(errors, [], 'Unexpected JavaScript errors');
  console.log('PASS: projects, search, embedded preview, animated chapters, reviews, 4 viewport widths, unknown project and server source protection.');
  console.log('Screenshots saved to: ' + tmpdir());
} finally {
  await browser.close();
}
