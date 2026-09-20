'use strict';
const TIME_KNOWLEDGE = Object.freeze([
  { value: 'EXACT', label: 'I know the exact time' },
  { value: 'APPROXIMATE', label: 'I know approximately' },
  { value: 'PERIOD_ONLY', label: 'I only know part of the day' },
  { value: 'UNKNOWN', label: "I don't know" },
]);
const TIME_PERIODS = Object.freeze([
  ['BEFORE_SUNRISE', 'Brahma Muhurta / Before Sunrise'], ['EARLY_MORNING', 'Early Morning'],
  ['MORNING', 'Morning'], ['AROUND_NOON', 'Around Noon'], ['AFTERNOON', 'Afternoon'],
  ['EVENING', 'Evening'], ['NIGHT', 'Night'], ['LATE_NIGHT', 'Late Night'],
]);
function generationEligible(certainty, birthTime) {
  return ['EXACT', 'APPROXIMATE'].includes(certainty) && /^([01]\d|2[0-3]):[0-5]\d$/.test(String(birthTime || ''));
}
function timePayload(certainty, birthTime, period) {
  if (certainty === 'PERIOD_ONLY') return { birthTime: null, birthTimeCertainty: certainty, birthTimePeriod: period || null };
  if (certainty === 'UNKNOWN') return { birthTime: null, birthTimeCertainty: certainty, birthTimePeriod: null };
  return { birthTime, birthTimeCertainty: certainty, birthTimePeriod: null };
}
function validMapPoint(point) {
  const latitude = Number(point?.latitude); const longitude = Number(point?.longitude);
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}
function confirmMapLocation(point, context = {}) {
  if (!validMapPoint(point)) return { valid: false, reason: 'INVALID_COORDINATES' };
  for (const [key, reason] of [['villageCity', 'VILLAGE_CITY_REQUIRED'], ['state', 'STATE_REQUIRED'], ['country', 'COUNTRY_REQUIRED']]) {
    if (typeof context[key] !== 'string' || !context[key].trim()) return { valid: false, reason };
  }
  return { valid: true, locationSelection: { source: 'MAP_CONFIRMED',
    latitude: Number(point.latitude), longitude: Number(point.longitude) } };
}
function isStep3Ready(locationSelection, context) {
  return confirmMapLocation(locationSelection, context).valid && locationSelection?.source === 'MAP_CONFIRMED';
}
module.exports = { TIME_KNOWLEDGE, TIME_PERIODS, generationEligible, timePayload, validMapPoint,
  confirmMapLocation, isStep3Ready };
