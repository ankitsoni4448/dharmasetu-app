'use strict';
/* global __dirname */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const screen = fs.readFileSync(path.join(__dirname, '..', 'app', 'mantra_library.js'), 'utf8');

assert.doesNotMatch(screen, /<View\b[^>]*>\s+<StatusBar\b/,
  'the root View must not contain a raw whitespace text node before StatusBar');
assert.match(screen, /testID="mantra-library-list"/);
assert.match(screen, /filters\.deity/);
assert.match(screen, /filters\.purpose/);
assert.match(screen, /filters\.contentType/);
assert.match(screen, /verificationLabel\(item\.verification_status\)/);
assert.match(screen, /fetchMantraCatalog\(backendFetch\)/);
assert.doesNotMatch(screen, /data\/mantra(?:V2|Index)/);

console.log('Mantra Library render contract tests: PASS');
