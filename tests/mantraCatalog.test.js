'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../utils/mantraCatalog');

const valid = {
  id: 'catalog-one',
  canonical_name: 'Catalog name',
  sanskrit_text: 'fixture-content',
  deity_ids: ['Deity'],
  purpose_ids: ['Purpose'],
  mantra_content_type: 'MANTRA',
  verification_status: 'REVIEW_REQUIRED',
  is_active: true,
};

function response(body, ok = true) {
  return { ok, json: async () => body };
}

test('catalog success normalizes backend records and supports filtering', async () => {
  let requested;
  const rows = await catalog.fetchMantraCatalog(async path => {
    requested = path;
    return response({ success: true, mantras: [valid] });
  });
  assert.equal(requested, '/mantras?page=1&limit=100');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].canonical_name, 'Catalog name');
  assert.equal(rows[0].audio.normal_url, null);
  assert.equal(catalog.filterMantras(rows, { query: 'catalog', deity: 'Deity' }).length, 1);
  assert.deepEqual(catalog.filtersFor(rows).purpose, ['All', 'Purpose']);
});

test('empty backend catalog remains empty', async () => {
  const rows = await catalog.fetchMantraCatalog(async () => response({ success: true, mantras: [] }));
  assert.deepEqual(rows, []);
});

test('backend failure rejects without substituting static records', async () => {
  await assert.rejects(
    catalog.fetchMantraCatalog(async () => response({ success: false, error: 'MANTRA_CATALOG_UNAVAILABLE' }, false)),
    error => error.code === 'MANTRA_CATALOG_UNAVAILABLE',
  );
});

test('malformed and inactive records are discarded while optional fields remain safe', () => {
  const rows = catalog.normalizeMantraList([
    null,
    { id: 'missing-content', canonical_name: 'Missing' },
    { ...valid, id: 'inactive', is_active: false },
    valid,
  ]);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].practice, {});
  assert.deepEqual(rows[0].source_references, []);
  assert.equal(rows[0].meanings.hi, null);
  assert.equal(rows[0].transliteration_simple, null);
});

test('verification labels use stored canonical status only', () => {
  assert.equal(catalog.verificationLabel('VERIFIED'), 'Verified');
  assert.equal(catalog.verificationLabel('REVIEW_REQUIRED'), 'Review required');
  assert.equal(catalog.verificationLabel('RESTRICTED'), 'Restricted');
  assert.equal(catalog.verificationLabel('AI_CONFIDENT'), 'Unverified');
  assert.equal(catalog.normalizeMantraRecord({ ...valid, verification_status: 'AI_CONFIDENT' }).verification_status, 'UNVERIFIED');
});

test('detail lookup uses the backend id contract and returns null for an empty result', async () => {
  const id = 'not-cached';
  let requested;
  const result = await catalog.fetchMantraById(async path => {
    requested = path;
    return response({ success: true, mantras: [] });
  }, id);
  assert.equal(requested, '/mantras?id=not-cached&limit=1');
  assert.equal(result, null);
});

test('successful full refresh replaces stale cache entries', async () => {
  await catalog.fetchMantraCatalog(async () => response({ success: true, mantras: [{ ...valid, id: 'stale-record' }] }));
  assert.equal(catalog._catalogById.has('stale-record'), true);
  await catalog.fetchMantraCatalog(async () => response({ success: true, mantras: [{ ...valid, id: 'current-record' }] }));
  assert.equal(catalog._catalogById.has('stale-record'), false);
  assert.equal(catalog._catalogById.has('current-record'), true);
});

test('failed full refresh preserves the last successful snapshot', async () => {
  await catalog.fetchMantraCatalog(async () => response({ success: true, mantras: [{ ...valid, id: 'preserved-record' }] }));
  await assert.rejects(catalog.fetchMantraCatalog(async () => response({ success: false }, false)));
  assert.equal(catalog._catalogById.has('preserved-record'), true);
});

test('successful direct ID lookup caches only its valid normalized record', async () => {
  catalog._catalogById.clear(); let calls = 0;
  const fetch = async () => { calls += 1; return response({ success: true, mantras: [{ ...valid, id: 'direct-record' }] }); };
  assert.equal((await catalog.fetchMantraById(fetch, 'direct-record')).id, 'direct-record');
  assert.equal((await catalog.fetchMantraById(fetch, 'direct-record')).id, 'direct-record');
  assert.equal(calls, 1);
});

function records(count, start = 0) {
  return Array.from({ length: count }, (_, index) => ({ ...valid, id: `record-${start + index}` }));
}

test('paginated catalog loads 108 records across two pages', async () => {
  const pages = [records(100), records(8, 100)]; let call = 0;
  const rows = await catalog.fetchMantraCatalog(async () => response({ success: true, mantras: pages[call], has_more: call++ === 0 }));
  assert.equal(rows.length, 108); assert.equal(call, 2);
});

test('paginated catalog loads more than 200 records', async () => {
  const pages = [records(100), records(100, 100), records(5, 200)]; let call = 0;
  const rows = await catalog.fetchMantraCatalog(async () => { const index = call++; return response({ success: true, mantras: pages[index], has_more: index < 2 }); });
  assert.equal(rows.length, 205); assert.equal(call, 3);
});

test('exactly 100 records requests the possible next page', async () => {
  let call = 0;
  const rows = await catalog.fetchMantraCatalog(async () => { const first = call++ === 0; return response({ success: true, mantras: first ? records(100) : [], has_more: first }); });
  assert.equal(rows.length, 100); assert.equal(call, 2);
});

test('later page failure preserves the installed snapshot', async () => {
  await catalog.fetchMantraCatalog(async () => response({ success: true, mantras: [{ ...valid, id: 'last-good' }], has_more: false }));
  let call = 0;
  await assert.rejects(catalog.fetchMantraCatalog(async () => call++ === 0
    ? response({ success: true, mantras: records(100), has_more: true })
    : response({ success: false, error: 'MANTRA_CATALOG_UNAVAILABLE' }, false)));
  assert.equal(catalog._catalogById.has('last-good'), true);
});

test('duplicate IDs across pages keep the first normalized occurrence', async () => {
  let call = 0;
  const rows = await catalog.fetchMantraCatalog(async () => { const first = call++ === 0; return response({ success: true,
    mantras: [{ ...valid, id: 'duplicate', canonical_name: first ? 'First' : 'Second' }], has_more: first }); });
  assert.equal(rows.length, 1); assert.equal(rows[0].canonical_name, 'First');
});

test('maximum page guard fails explicitly without replacing the snapshot', async () => {
  await catalog.fetchMantraCatalog(async () => response({ success: true, mantras: [{ ...valid, id: 'before-limit' }] }));
  await assert.rejects(catalog.fetchMantraCatalog(async () => response({ success: true, mantras: [valid], has_more: true })),
    error => error.code === 'MANTRA_CATALOG_PAGE_LIMIT');
  assert.equal(catalog._catalogById.has('before-limit'), true);
});

test('direct lookup started before a new snapshot cannot reinsert a removed ID', async () => {
  await catalog.fetchMantraCatalog(async () => response({ success: true, mantras: [] }));
  let resolveDirect; const directResponse = new Promise(resolve => { resolveDirect = resolve; });
  const pending = catalog.fetchMantraById(() => directResponse, 'removed-id');
  await catalog.fetchMantraCatalog(async () => response({ success: true, mantras: [{ ...valid, id: 'new-id' }] }));
  resolveDirect(response({ success: true, mantras: [{ ...valid, id: 'removed-id' }] }));
  assert.equal(await pending, null);
  assert.equal(catalog._catalogById.has('removed-id'), false);
});

test('older full refresh cannot overwrite a newer installed refresh', async () => {
  let resolveOld; const oldResponse = new Promise(resolve => { resolveOld = resolve; });
  const oldRefresh = catalog.fetchMantraCatalog(() => oldResponse);
  await catalog.fetchMantraCatalog(async () => response({ success: true, mantras: [{ ...valid, id: 'newer' }] }));
  resolveOld(response({ success: true, mantras: [{ ...valid, id: 'older' }] }));
  await oldRefresh;
  assert.equal(catalog._catalogById.has('newer'), true); assert.equal(catalog._catalogById.has('older'), false);
});

test('older refresh failure cannot replace a newer successful snapshot with an error', async () => {
  let rejectOld; const oldResponse = new Promise((resolve, reject) => { rejectOld = reject; });
  const oldRefresh = catalog.fetchMantraCatalog(() => oldResponse);
  await catalog.fetchMantraCatalog(async () => response({ success: true, mantras: [{ ...valid, id: 'newest' }] }));
  rejectOld(new Error('late failure'));
  const rows = await oldRefresh;
  assert.deepEqual(rows.map(row => row.id), ['newest']); assert.equal(catalog._catalogById.has('newest'), true);
});

test('direct lookup rejects a valid record whose ID does not match the request', async () => {
  catalog._catalogById.clear();
  const result = await catalog.fetchMantraById(async () => response({ success: true, mantras: [{ ...valid, id: 'other-id' }] }), 'requested-id');
  assert.equal(result, null); assert.equal(catalog._catalogById.has('other-id'), false);
});
