import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/');
  const line = page.locator('.process-line');
  await line.waitFor();
  const top = await line.evaluate(node => node.getBoundingClientRect().top + scrollY);
  await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), top - 700);
  await page.waitForFunction(() => document.querySelectorAll('.process-step')[0].classList.contains('is-active'));
  await page.evaluate(() => document.fonts.ready);
  const descriptions = ['Poznajemy Twoje potrzeby', 'Analizujemy sytuację', 'Zmieniamy ustalenia', 'Mierzymy efekty'];
  for (let index = 0; index < 4; index++) {
    const progress = (index + .5) / 4;
    const geometry = await line.evaluate(node => ({ top: node.getBoundingClientRect().top + scrollY, height: node.getBoundingClientRect().height }));
    await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), geometry.top - (900 * .82 - progress * (900 * .5 + geometry.height)));
    await page.waitForFunction(i => document.querySelectorAll('.process-step')[i].classList.contains('is-active'), index);
    assert.equal(await page.locator('.process-current-count').textContent(), `ETAP ${index + 1} / 4`);
    assert.ok((await page.locator('.process-current-copy').textContent()).includes(descriptions[index]));
  }
  const reverseGeometry = await line.evaluate(node => ({ top: node.getBoundingClientRect().top + scrollY, height: node.getBoundingClientRect().height }));
  await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), reverseGeometry.top - (900 * .82 - .375 * (900 * .5 + reverseGeometry.height)));
  await page.waitForFunction(() => document.querySelectorAll('.process-step')[1].classList.contains('is-active'));
  assert.ok((await page.locator('.process-current-copy').textContent()).includes(descriptions[1]));
  await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), top - 90);
  await page.waitForFunction(() => document.querySelectorAll('.process-step')[3].classList.contains('is-active'));
  assert.equal(await page.locator('.process-step.is-complete').count(), 3);
  const demo = page.locator('[data-workflow-demo]');
  await demo.scrollIntoViewIfNeeded();
  assert.match(await demo.textContent(), /SYMULACJA/);
  await page.waitForFunction(() => document.querySelector('[data-demo-step="1"]').hasAttribute('aria-current'), null, { timeout: 8000 });
  await page.locator('[data-demo-toggle]').click();
  await page.locator('[data-demo-step="2"]').click();
  assert.equal(await page.locator('[data-demo-count]').textContent(), '3 / 5');
  assert.match(await page.locator('[data-demo-panel]:visible').textContent(), /Dziękujemy za miłe słowa/);
  await page.locator('[data-demo-step="4"]').click();
  assert.match(await page.locator('[data-demo-panel]:visible').textContent(), /nic nie zostało opublikowane/);
  await page.locator('[data-demo-replay]').click();
  assert.equal(await page.locator('[data-demo-count]').textContent(), '1 / 5');
  await page.locator('[data-demo-toggle]').click();
  assert.deepEqual(errors, []);
  for (const width of [390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px overflow`);
  }
  await page.setViewportSize({ width: 390, height: 500 });
  await page.goto(base + '/');
  await page.locator('#navToggle').click();
  assert.equal(await page.locator('#navToggle').getAttribute('aria-expanded'), 'true');
  await page.locator('#navMobile a.btn').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('#navMobile a.btn').isVisible(), true, 'The mobile consultation link must remain reachable');
  const reduced = await browser.newPage({ reducedMotion: 'reduce' });
  await reduced.goto(base + '/');
  assert.equal(await reduced.locator('.process-animated').count(), 0);
  assert.equal(await reduced.locator('.process-current').isHidden(), true);
  assert.equal(await reduced.locator('[data-demo-toggle]').textContent(), 'Odtwórz ▶');
  await reduced.locator('[data-demo-step="1"]').click();
  assert.match(await reduced.locator('[data-demo-panel]:visible').textContent(), /AI analizuje/);
  await reduced.close();
  console.log('PASS: scroll-linked steps, simulated five-stage workflow, controls, mobile and reduced motion.');
} finally { await browser.close(); }
