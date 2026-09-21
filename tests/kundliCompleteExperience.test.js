'use strict';
/* global __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const p = require('../utils/kundliPresentation');
const screen = fs.readFileSync(path.join(__dirname, '..', 'app/my_kundli.js'), 'utf8');

test('normal-user overview explains the canonical headline facts', () => {
  for (const text of ['Your Kundli at a Glance', 'Your Rashi is the zodiac sign occupied by the Moon',
    'Lagna is the rising sign', 'Nakshatra is the lunar constellation', 'divided into four sections called Padas', 'Your Sun sign']) assert.match(screen, new RegExp(text));
  assert.match(screen, /Birth Profile/); assert.match(screen, /friendlyDate/); assert.match(screen, /friendlyTime/);
  assert.equal(p.certaintyPresentation('EXACT').label, 'Exact');
  assert.match(p.certaintyPresentation('APPROXIMATE').note, /may vary/);
});

test('D1 uses display-only high-contrast styling without rewriting SVG geometry', () => {
  assert.match(screen, /Your Birth Chart \(D1 \/ Rashi\)/); assert.match(screen, /What is this\?/);
  assert.match(screen, /svg line,svg polyline,svg polygon\{stroke:#5A210B!important/);
  assert.match(screen, /svg text\{fill:#321306!important/);
  assert.match(screen, /\$\{chart\.content\}/);
  assert.doesNotMatch(screen, /replace\([^\n]*chart\.content|calculateKundli|kundli_calc/);
});

test('planet degree presentation is bounded within the authoritative sign', () => {
  assert.equal(p.degreeWithinSign(340.18731554532144), '10°11′');
  assert.equal(p.degreeWithinSign(359.999), '29°59′');
  assert.equal(p.degreeWithinSign(0), '0°00′');
  assert.equal(p.planetDisplay({ name: 'Sun', sign: 'Meena', longitude: 340.18731554532144, house: 6 }).house, '6th House');
  assert.doesNotMatch(screen, /\$\{p\.longitude\}°/);
});

test('all houses have clearly generic educational labels', () => {
  assert.equal(p.HOUSE_EDUCATION.length, 12);
  assert.deepEqual(p.HOUSE_EDUCATION.map(x => x[0]), [1,2,3,4,5,6,7,8,9,10,11,12]);
  assert.match(screen, /House meanings are general Jyotish education/);
});

test('life cards use only ready canonical evidence and omit unsupported areas', () => {
  const areas = { status: 'READY', items: [{ id: 'MARRIAGE', status: 'READY', confidence: 'MODERATE', evidence: [
    { factor: 'HOUSE_STRUCTURE', house: 7, sign: 'Tula', lord: 'Venus', occupants: [] }], provenance: { calculation_version: 'kundli-k3-life-areas-v1' } },
  { id: 'UNKNOWN', status: 'READY', evidence: [{ factor: 'HOUSE_STRUCTURE', house: 3 }] }] };
  const cards = p.lifeAreaCards(areas);
  assert.equal(cards.length, 1); assert.equal(cards[0].title, 'Marriage & Relationships');
  assert.match(cards[0].text.join(' '), /House 7 is in Tula and is ruled by Venus/);
  assert.ok(cards[0].text.length >= 2);
  assert.doesNotMatch(cards[0].text.join(' '), /will|guarantee|spouse|marriage age/i);
  assert.deepEqual(p.lifeAreaCards({ status: 'UNAVAILABLE', items: areas.items }), []);
});

test('advanced disclosure hides empty and diagnostic sections', () => {
  assert.match(screen, /Advanced Kundli Details/); assert.match(screen, /accessibilityState=\{\{ expanded: open \}\}/);
  assert.match(screen, /normalized\.dasha\?\.status === 'AVAILABLE'/);
  assert.match(screen, /yogas\.length > 0/); assert.match(screen, /doshas\.length > 0/);
  assert.match(screen, /Navamsha chart is not available for this Kundli/); assert.match(screen, /Bhava chart is not available for this Kundli/);
  assert.doesNotMatch(screen, /Provider modules|moduleStatus|Provider data available|Major Yogas|Chandra Yogas|Soorya Yogas|Inauspicious Yogas| READY/);
});

test('edit, scrolling, route stability and final build identity remain', () => {
  assert.match(screen, /<ScrollView/); assert.match(screen, /paddingBottom:insets\.bottom\+90/);
  assert.match(screen, /router\.push\('\/birth_details'\)/); assert.doesNotMatch(screen, /Redirect/);
  assert.match(screen, /\[KundliBuild\] kundli-phase1-final-complete-20260921/);
});
