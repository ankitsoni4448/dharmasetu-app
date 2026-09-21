'use strict';

const SIGN_ENGLISH = Object.freeze({
  Mesha: 'Aries', Vrishabha: 'Taurus', Vrishabh: 'Taurus', Mithuna: 'Gemini', Mithun: 'Gemini',
  Karka: 'Cancer', Simha: 'Leo', Kanya: 'Virgo', Tula: 'Libra', Vrischika: 'Scorpio', Vrishchika: 'Scorpio', Vrishchik: 'Scorpio',
  Dhanu: 'Sagittarius', Makara: 'Capricorn', Makar: 'Capricorn', Kumbha: 'Aquarius', Kumbh: 'Aquarius', Meena: 'Pisces', Meen: 'Pisces',
});
const HOUSE_EDUCATION = Object.freeze([
  [1, 'Self & identity'], [2, 'Family, resources & speech'], [3, 'Communication, effort & siblings'],
  [4, 'Home, mother & foundations'], [5, 'Learning, creativity & children'], [6, 'Health routines, service & challenges'],
  [7, 'Partnership & marriage'], [8, 'Transformation & shared matters'], [9, 'Dharma, teachers & higher learning'],
  [10, 'Career, work & public role'], [11, 'Gains, networks & aspirations'], [12, 'Rest, retreat, expenditure & spirituality'],
]);
const LIFE_AREA_LABELS = Object.freeze({
  PERSONALITY: 'Personality & Self', EDUCATION: 'Education & Learning', CAREER: 'Career & Work',
  FINANCE: 'Money & Resources', MARRIAGE: 'Marriage & Relationships', PROPERTY: 'Family & Home',
  HEALTH: 'Health & Daily Life', SPIRITUALITY: 'Spirituality & Dharma',
});

function signLabel(sign) { return sign ? `${sign}${SIGN_ENGLISH[sign] ? ` (${SIGN_ENGLISH[sign]})` : ''}` : ''; }
function ordinal(value) {
  const n = Number(value); const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`;
}
function degreeWithinSign(longitude) {
  const absolute = Number(longitude);
  if (!Number.isFinite(absolute)) return null;
  const within = ((absolute % 30) + 30) % 30;
  let degrees = Math.floor(within); let minutes = Math.round((within - degrees) * 60);
  if (minutes === 60) minutes = 59;
  return `${degrees}°${String(minutes).padStart(2, '0')}′`;
}
function planetDisplay(planet = {}) {
  return { name: planet.name || '', sign: signLabel(planet.sign), house: planet.house != null && Number.isInteger(Number(planet.house)) ? `${ordinal(planet.house)} House` : '',
    degree: planet.longitude == null ? null : degreeWithinSign(planet.longitude), absoluteLongitude: planet.longitude != null && Number.isFinite(Number(planet.longitude)) ? `${Number(planet.longitude).toFixed(4)}°` : null };
}
function friendlyDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return value || 'Unknown';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)));
}
function friendlyTime(value) {
  const match = String(value || '').match(/^(\d{2}):(\d{2})/); if (!match) return 'Unknown';
  const hour = Number(match[1]); return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`;
}
function certaintyPresentation(certainty, period) {
  if (certainty === 'EXACT') return { label: 'Exact', note: null };
  if (certainty === 'APPROXIMATE') return { label: 'Approximate', note: 'Some time-sensitive Kundli details may vary because your birth time is approximate.' };
  if (certainty === 'PERIOD_ONLY') return { label: period ? `Part of day: ${String(period).toLowerCase().replaceAll('_', ' ')}` : 'Part of day known', note: 'A clock time was not supplied, so time-sensitive details are limited.' };
  return { label: 'Unknown', note: 'A birth time was not supplied, so time-sensitive details are limited.' };
}
function lifeAreaCards(lifeAreas) {
  if (lifeAreas?.status !== 'READY' || !Array.isArray(lifeAreas.items)) return [];
  return lifeAreas.items.filter(item => LIFE_AREA_LABELS[item.id] && ['READY', 'LIMITED'].includes(item.status)).map(item => {
    const houses = (item.evidence || []).filter(e => e.factor === 'HOUSE_STRUCTURE');
    const details = [`This area uses the calculated structure of ${item.relevant_houses?.map(number => `House ${number}`).join(' and ') || 'the relevant houses'} in your canonical Kundli.`];
    details.push(...houses.map(h => `House ${h.house}${h.sign ? ` is in ${h.sign}` : ''}${h.lord ? ` and is ruled by ${h.lord}` : ''}${h.occupants?.length ? `, with ${h.occupants.join(', ')}` : ''}.`));
    const aspects = (item.evidence || []).filter(e => e.factor === 'HOUSE_RECEIVES_DRISHTI');
    if (aspects.length) details.push(`Recorded classical aspects to this area come from ${[...new Set(aspects.map(a => a.source_planet))].join(', ')}.`);
    return { id: item.id, title: LIFE_AREA_LABELS[item.id], confidence: item.confidence,
      text: details.slice(0, 3), disclaimer: item.disclaimer || null, provenance: item.provenance };
  }).filter(card => card.text.length);
}

module.exports = { SIGN_ENGLISH, HOUSE_EDUCATION, LIFE_AREA_LABELS, signLabel, ordinal, degreeWithinSign,
  planetDisplay, friendlyDate, friendlyTime, certaintyPresentation, lifeAreaCards };
