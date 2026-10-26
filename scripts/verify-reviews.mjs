import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mapsUrl, createReviewsService, extractReviewsDOM } from '../server.mjs';

assert.equal(mapsUrl('https://example.com/maps'), null);
assert.equal(mapsUrl('http://www.google.com/maps/place/example'), null);
assert.ok(mapsUrl('https://www.google.com/maps/place/example'));
assert.equal(createReviewsService().snapshot().status, 'unconfigured');
assert.equal(createReviewsService({ demo: true }).snapshot().demo, true);
let rejectNext = false;
let calls = 0;
const service = createReviewsService({ profileUrl: 'https://www.google.com/maps/place/example', scrape: async () => {
  calls++;
  if (rejectNext) throw new Error('blocked');
  await new Promise(resolve => setTimeout(resolve, 10));
  return { reviews: [{ author: 'Fixture', rating: 4, text: 'Test only' }], rating: 4, count: 1 };
} });
await Promise.all([service.refresh(), service.refresh()]);
assert.equal(calls, 1, 'Concurrent refreshes should share one request');
assert.equal(service.snapshot().status, 'ok');
rejectNext = true;
await service.refresh();
assert.equal(service.snapshot().status, 'stale');
assert.equal(service.snapshot().reviews.length, 1, 'A failed refresh should preserve previous reviews');
await service.stop();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.setContent('<div class="F7nice"><span aria-hidden="true">4.8</span><span aria-label="1,234 reviews"></span></div><div data-review-id="fixture"><span class="d4r55">Fixture author</span><span role="img" aria-label="5 stars"></span><span class="wiI7pd">Fixture text</span><span class="rsqaWe">one week ago</span></div>');
  const extracted = await page.evaluate(extractReviewsDOM, { limit: 10, profileUrl: 'https://www.google.com/maps/place/example' });
  assert.equal(extracted.reviews.length, 1);
  assert.equal(extracted.reviews[0].author, 'Fixture author');
  assert.equal(extracted.reviews[0].rating, 5);
  assert.equal(extracted.rating, 4.8);
  assert.equal(extracted.count, 1234);
} finally { await browser.close(); }
console.log('PASS: Google URL validation, unconfigured state, no overlapping refresh, stale cache preservation and review extraction fixture.');
