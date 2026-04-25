// ════════════════════════════════════════════════
// DharmaSetu — Real-Time Panchang Calculator
// Mathematical Vedic calendar — no external API needed
// ════════════════════════════════════════════════

const TITHIS = [
  'Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami',
  'Shashthi','Saptami','Ashtami','Navami','Dashami',
  'Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Purnima/Amavasya'
];

const NAKSHATRAS = [
  'Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra',
  'Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni',
  'Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha',
  'Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana',
  'Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'
];

const YOGAS = [
  'Vishkambha','Priti','Ayushman','Saubhagya','Shobhana','Atiganda',
  'Sukarman','Dhriti','Shula','Ganda','Vriddhi','Dhruva','Vyaghata',
  'Harshana','Vajra','Siddhi','Vyatipata','Variyan','Parigha','Shiva',
  'Siddha','Sadhya','Shubha','Shukla','Brahma','Indra','Vaidhriti'
];

const KARANAS = [
  'Bava','Balava','Kaulava','Taitila','Garaja','Vanija',
  'Vishti','Shakuni','Chatushpada','Naga','Kimstughna'
];

const VAAR = ['Ravivaar','Somvaar','Mangalvaar','Budhvaar','Guruvaar','Shukravaar','Shanivaar'];
const VAAR_EN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const VAAR_DEITY = ['Surya Dev','Shiva Ji','Hanuman Ji','Ganesh Ji','Vishnu Ji','Lakshmi Mata','Shani Dev'];

// Calculate Julian Day Number
function julianDay(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const a = Math.floor((14 - m) / 12);
  const yr = y + 4800 - a;
  const mo = m + 12 * a - 3;
  return d + Math.floor((153 * mo + 2) / 5) + 365 * yr +
    Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045;
}

// Moon longitude (simplified VSOP87)
function moonLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 218.3164477 + 481267.88123421 * T;
  const M = (357.5291092 + 35999.0502909 * T) % 360;
  const Mm = (134.9633964 + 477198.8675055 * T) % 360;
  const D = (297.8501921 + 445267.1114034 * T) % 360;
  const Om = (125.0445479 - 1934.1362608 * T) % 360;
  
  const toRad = x => x * Math.PI / 180;
  
  // Main correction terms
  const corr = 
    6.288774 * Math.sin(toRad(Mm)) +
    1.274027 * Math.sin(toRad(2*D - Mm)) +
    0.658314 * Math.sin(toRad(2*D)) +
    0.213618 * Math.sin(toRad(2*Mm)) -
    0.185116 * Math.sin(toRad(M)) -
    0.114332 * Math.sin(toRad(2*Om));
  
  return ((L0 + corr) % 360 + 360) % 360;
}

// Sun longitude
function sunLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T;
  const M = (357.52911 + 35999.05029 * T) % 360;
  const toRad = x => x * Math.PI / 180;
  const C = (1.914602 - 0.004817 * T) * Math.sin(toRad(M)) +
            0.019993 * Math.sin(toRad(2*M));
  return ((L0 + C) % 360 + 360) % 360;
}

// Sunrise/Sunset calculation
function getSunriseSunset(date, lat, lon) {
  const jd = julianDay(date);
  const n = jd - 2451545.0;
  const L = (280.460 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180;
  const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2*g)) * Math.PI / 180;
  const sinDec = 0.39782 * Math.sin(lambda);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (-0.01454 - sinDec * Math.sin(lat * Math.PI / 180)) / (cosDec * Math.cos(lat * Math.PI / 180));
  
  if (Math.abs(cosH) > 1) return { sunrise: '06:00', sunset: '18:00' }; // polar fallback
  
  const H = Math.acos(cosH) * 180 / Math.PI;
  const UT_set  = (H + L + 0.0657720 * n - 6.622) % 24 - lon / 15;
  const UT_rise = (360 - H + L + 0.0657720 * n - 6.622) % 24 - lon / 15;
  
  const fmt = h => {
    const hr = Math.floor(((h % 24) + 24) % 24);
    const min = Math.round((((h % 24) + 24) % 24 - hr) * 60);
    return `${String(hr).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  };
  return { sunrise: fmt(UT_rise), sunset: fmt(UT_set) };
}

// Rahu Kaal (7 parts of day, Rahu gets one based on weekday)
const RAHU_ORDER = [8, 2, 7, 5, 6, 4, 3]; // index for each weekday (1=1st part, 8=8th)
function getRahuKaal(date, sunrise, sunset) {
  const day = date.getDay(); // 0=Sun
  const [srH, srM] = sunrise.split(':').map(Number);
  const [ssH, ssM] = sunset.split(':').map(Number);
  const totalMin = (ssH * 60 + ssM) - (srH * 60 + srM);
  const partMin = totalMin / 8;
  const rahuPart = RAHU_ORDER[day] - 1;
  const startMin = srH * 60 + srM + rahuPart * partMin;
  const endMin = startMin + partMin;
  
  const fmt = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(Math.round(m%60)).padStart(2,'0')}`;
  return `${fmt(startMin)} – ${fmt(endMin)}`;
}

// Abhijit Muhurat (midday auspicious time — ~24 min around solar noon)
function getAbhijitMuhurat(sunrise, sunset) {
  const [srH, srM] = sunrise.split(':').map(Number);
  const [ssH, ssM] = sunset.split(':').map(Number);
  const noonMin = (srH * 60 + srM + ssH * 60 + ssM) / 2;
  const fmt = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(Math.round(m%60)).padStart(2,'0')}`;
  return `${fmt(noonMin - 12)} – ${fmt(noonMin + 12)}`;
}

export function getPanchang(date = new Date(), lat = 22.7196, lon = 75.8577) {
  const jd = julianDay(date) + date.getHours() / 24 + date.getMinutes() / 1440;
  const moonLon = moonLongitude(jd);
  const sunLon  = sunLongitude(jd);
  
  // Tithi: (moonLon - sunLon) / 12, integer part = tithi number
  const tithiIndex = Math.floor(((moonLon - sunLon + 360) % 360) / 12);
  const tithi = TITHIS[tithiIndex % 15];
  const paksha = tithiIndex < 15 ? 'Shukla Paksha' : 'Krishna Paksha';
  const pakshaHi = tithiIndex < 15 ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष';
  
  // Nakshatra: moonLon / (360/27)
  const nakIndex = Math.floor(moonLon / (360 / 27));
  const nakshatra = NAKSHATRAS[nakIndex % 27];
  
  // Yoga: (moonLon + sunLon) / (360/27)
  const yogaIndex = Math.floor(((moonLon + sunLon) % 360) / (360 / 27));
  const yoga = YOGAS[yogaIndex % 27];
  
  // Karana: half-tithi
  const karanaIndex = Math.floor(((moonLon - sunLon + 360) % 360) / 6) % 11;
  const karana = KARANAS[karanaIndex];
  
  // Vaar
  const day = date.getDay();
  const vaar = VAAR[day];
  const vaarEn = VAAR_EN[day];
  const vaarDeity = VAAR_DEITY[day];
  
  // Sunrise/Sunset
  const { sunrise, sunset } = getSunriseSunset(date, lat, lon);
  const rahuKaal = getRahuKaal(date, sunrise, sunset);
  const abhijit  = getAbhijitMuhurat(sunrise, sunset);
  
  // Auspicious check
  const inauspicious = ['Vishkambha','Ganda','Vajra','Vyatipata','Parigha','Vaidhriti'].includes(yoga);
  const auspicious    = ['Siddhi','Shubha','Shiva','Brahma','Priti','Saubhagya','Shobhana'].includes(yoga);
  
  // Tithi special events
  const specialEvents = [];
  if (tithiIndex % 15 === 10) specialEvents.push('🌿 Ekadashi — Vishnu Vrat');
  if (tithiIndex % 15 === 14 && tithiIndex < 15) specialEvents.push('🌕 Purnima');
  if (tithiIndex % 15 === 14 && tithiIndex >= 15) specialEvents.push('🌑 Amavasya — Pitru Tarpan');
  if (tithiIndex % 15 === 3) specialEvents.push('🐘 Chaturthi — Ganesh Puja');
  if (day === 1) specialEvents.push('🔱 Somvaar — Shiva Puja');
  if (day === 2) specialEvents.push('🏹 Mangalvaar — Hanuman Puja');
  if (day === 4) specialEvents.push('🪷 Guruvaar — Vishnu Puja');
  
  return {
    tithi, tithiNum: tithiIndex % 15 + 1,
    paksha, pakshaHi,
    nakshatra, yoga, karana,
    vaar, vaarEn, vaarDeity,
    sunrise, sunset,
    rahuKaal, abhijit,
    inauspicious, auspicious,
    specialEvents,
    moonLongitude: moonLon.toFixed(2),
    samvat: getSamvat(date),
  };
}

function getSamvat(date) {
  // Vikram Samvat = Gregorian + 57 (approximately)
  return date.getFullYear() + 57;
}

export function getDailyMuhurat(date = new Date()) {
  const day = date.getDay();
  const muhurats = [
    { name: 'Sarvartha Siddhi', days: [0,1,3,5], good: true },
    { name: 'Amrit Siddhi',     days: [0,2,4,6], good: true },
    { name: 'Ravi Pushya',      days: [0],        extra: 'Most auspicious of year' },
    { name: 'Guru Pushya',      days: [4],        extra: 'Second most auspicious' },
  ];
  return muhurats.filter(m => m.days.includes(day));
}