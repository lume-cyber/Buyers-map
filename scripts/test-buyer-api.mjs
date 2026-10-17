import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buyerDirectory } from '../src/data/buyerDirectory.js';

// Run only against a disposable service copy: this suite adds and deletes records.
const base = process.env.BUYER_TEST_URL || 'http://127.0.0.1:8173/';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Tests are restricted to a local disposable service');
const credential = readFileSync(new URL('../deployment/.private/deletion-password.txt', import.meta.url), 'utf8');
const password = credential.split('\n')[2];
let passed = 0;
async function call(payload, expected = 200, extra = {}) {
  const response = await fetch(new URL('api/buyers.php', base), payload === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Buyer-Request': '1', ...extra }, body: JSON.stringify(payload),
  });
  const data = await response.json();
  assert.equal(response.status, expected, data.error || 'Unexpected response');
  passed++;
  return data;
}
const initial = await call();
assert.equal(initial.buyers.length, buyerDirectory.length);
await call({ action: 'add', country: 'Bangladesh' }, 422);
await call({ action: 'add', buyer: '   ', country: 'Bangladesh' }, 422);
await call({ action: 'add', buyer: 'Test' }, 422);
await call({ action: 'add', buyer: 'Test', country: 'Atlantis' }, 422);
await call({ action: 'add', buyer: 'Test', country: 'Bangladesh', website: 'javascript:alert(1)' }, 422);
await call({ action: 'add', buyer: 'Test', country: 'Bangladesh', website: 'https://user:password@example.com' }, 422);
await call({ action: 'add', buyer: 'Test', country: 'Bangladesh' }, 403, { 'X-Buyer-Request': '' });
await call({ action: 'add', buyer: 'Test', country: 'Bangladesh' }, 403, { Origin: 'https://unrelated.example' });
const added = await call({ action: 'add', buyer: 'Test Buyer', country: 'Bangladesh' });
assert.equal(added.buyers.length, buyerDirectory.length + 1);
assert.equal(added.buyer.website, '');
assert.ok(Number.isFinite(added.buyer.lat));
await call({ action: 'add', buyer: ' test buyer ', country: 'Bangladesh' }, 409);
const full = await call({ action: 'add', buyer: 'Textile Test', country: 'India', city: 'Delhi', website: 'https://example.com', categories: 'Knitwear', group: 'Test Group', notes: '<script>alert(1)</script>' });
assert.equal(full.buyer.website, 'https://example.com');
assert.equal(full.buyer.city, 'Delhi');
await call({ action: 'delete', id: added.buyer.id }, 422);
await call({ action: 'delete', id: added.buyer.id, password: 'incorrect' }, 403);
assert.ok((await call()).buyers.some(item => item.id === added.buyer.id));
await call({ action: 'delete', id: added.buyer.id, password });
assert.ok(!(await call()).buyers.some(item => item.id === added.buyer.id));
await call({ action: 'delete', id: added.buyer.id, password }, 404);
const seedId = initial.buyers[0].id;
await call({ action: 'delete', id: seedId, password });
assert.ok(!(await call()).buyers.some(item => item.id === seedId));
const parallel = await Promise.all(Array.from({ length: 4 }, (_, i) => call({ action: 'add', buyer: 'Concurrent ' + i, country: 'Bangladesh' })));
const persisted = await call();
assert.ok(parallel.every(result => persisted.buyers.some(item => item.id === result.buyer.id)), 'Concurrent writes lost data');
assert.ok(persisted.revision > initial.revision);
for (const path of ['api/private/config.php', 'api/private/directory.php']) {
  const response = await fetch(new URL(path, base));
  const body = await response.text();
  assert.ok(!body.includes('passwordHash') && !body.includes('Test Buyer') && !body.includes(password), 'Private data exposed');
  passed++;
}
for (let i = 0; i < 5; i++) await call({ action: 'delete', id: full.buyer.id, password: 'wrong-' + i }, 403);
await call({ action: 'delete', id: full.buyer.id, password }, 429);
assert.ok((await call()).buyers.some(item => item.id === full.buyer.id));
console.log(`${passed} API checks passed: validation, optional fields, public additions, protected deletion, persistence, concurrent writes, private data guards and password throttling.`);
