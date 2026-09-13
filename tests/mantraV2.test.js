/* global __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function loadData() {
  const legacyContext = { module:{exports:{}} };
  vm.runInNewContext(read('data/mantras.js').replace(/export const /g, 'const ') + '\nmodule.exports={MANTRAS};', legacyContext);
  const context = { module:{exports:{}}, MANTRAS:legacyContext.module.exports.MANTRAS, Set };
  const source = read('data/mantraV2.js').replace(/^import .*$/m, '').replace(/export const /g, 'const ').replace(/export function /g, 'function ') + '\nmodule.exports={MANTRAS_V2,CONTENT_TYPES,getMantraById};';
  vm.runInNewContext(source, context);
  return context.module.exports;
}
const { MANTRAS_V2, CONTENT_TYPES, getMantraById } = loadData();
function loadIndex() {
  const context={module:{exports:{}},MANTRAS_V2,Set};
  const source=read('data/mantraIndex.js').replace(/^import .*$/m,'').replace(/export const /g,'const ').replace(/export function /g,'function ')+'\nmodule.exports={MANTRA_FILTERS,searchMantras};';
  vm.runInNewContext(source,context); return context.module.exports;
}
const { MANTRA_FILTERS, searchMantras }=loadIndex();

test('all 29 legacy entries migrate with stable unique IDs and Sanskrit text', () => {
  assert.equal(MANTRAS_V2.length, 29);
  assert.equal(new Set(MANTRAS_V2.map(item=>item.id)).size, 29);
  assert.ok(MANTRAS_V2.every(item=>item.sanskrit_text && CONTENT_TYPES.includes(item.content_type)));
  assert.ok(MANTRAS_V2.every(item=>getMantraById(item.id)?.id===item.id));
});
test('legacy claims are review-only and do not become practice defaults', () => {
  assert.ok(MANTRAS_V2.every(item=>item.verification_status==='REVIEW_REQUIRED'));
  assert.ok(MANTRAS_V2.every(item=>Object.values(item.practice).every(value=>value===null)));
  assert.equal(MANTRAS_V2.filter(item=>item.verification_status==='VERIFIED').length,0);
});
test('library uses FlatList and exposes combined filters without entry slicing', () => {
  const library=read('app/mantra_library.js');
  assert.match(library,/testID="mantra-library-list"/); assert.match(library,/searchMantras\(\{ query, deity, purpose, contentType \}\)/);
  assert.doesNotMatch(library,/MANTRAS\.slice/);
});
test('search, deity, purpose and content-type filters operate on V2 records', () => {
  assert.ok(searchMantras({query:'Gayatri'}).some(item=>item.id==='gayatri'));
  assert.ok(searchMantras({deity:'Shiva'}).every(item=>item.deity_ids.includes('Shiva')));
  assert.equal(searchMantras({purpose:'UNSPECIFIED'}).length,29);
  assert.ok(searchMantras({contentType:'PRAYER'}).every(item=>item.content_type==='PRAYER'));
  assert.ok(MANTRA_FILTERS.purpose.includes('UNSPECIFIED'));
});
test('detail, japa, share, safe-area and count semantics are wired', () => {
  const detail=read('app/mantra_detail.js'), japa=read('app/mantra_japa.js');
  assert.match(detail,/Share\.share/); assert.match(detail,/Synthetic aid/); assert.match(detail,/paddingBottom:insets\.bottom/);
  assert.match(japa,/\[11,21,27,54,108\]/); assert.match(japa,/complete 108-repetition/); assert.doesNotMatch(japa,/slice\(0,15\)/);
});
test('stable-ID storage converts old snapshots and audio handles absent files', () => {
  const storage=read('utils/mantraLibraryStorage.js'), manifest=read('utils/mantraAudioManifest.js'), audio=read('utils/mantraAudio.js');
  assert.match(storage,/typeof item === 'string' \? item : item\?\.id/); assert.match(manifest,/BASE_URL && filename \?/); assert.match(audio,/stopSpeaking\(\)/);
});
