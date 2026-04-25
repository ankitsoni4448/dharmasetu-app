// ════════════════════════════════════════════════════════════════
// DharmaSetu — Real-Time Panchang Calculator
// Mathematical Vedic calendar — NO external API needed
// Works 100% offline — pure math
// ════════════════════════════════════════════════════════════════

const TITHIS = [
  'Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami',
  'Shashthi','Saptami','Ashtami','Navami','Dashami',
  'Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Purnima',
  'Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami',
  'Shashthi','Saptami','Ashtami','Navami','Dashami',
  'Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Amavasya',
];

const TITHIS_HI = [
  'प्रतिपदा','द्वितीया','तृतीया','चतुर्थी','पंचमी',
  'षष्ठी','सप्तमी','अष्टमी','नवमी','दशमी',
  'एकादशी','द्वादशी','त्रयोदशी','चतुर्दशी','पूर्णिमा',
  'प्रतिपदा','द्वितीया','तृतीया','चतुर्थी','पंचमी',
  'षष्ठी','सप्तमी','अष्टमी','नवमी','दशमी',
  'एकादशी','द्वादशी','त्रयोदशी','चतुर्दशी','अमावस्या',
];

const NAKSHATRAS = [
  'Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra',
  'Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni',
  'Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha',
  'Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana',
  'Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati',
];

const NAKSHATRAS_HI = [
  'अश्विनी','भरणी','कृत्तिका','रोहिणी','मृगशिरा','आर्द्रा',
  'पुनर्वसु','पुष्य','आश्लेषा','मघा','पूर्व फाल्गुनी',
  'उत्तर फाल्गुनी','हस्त','चित्रा','स्वाति','विशाखा','अनुराधा',
  'ज्येष्ठा','मूल','पूर्व आषाढ़ा','उत्तर आषाढ़ा','श्रवण',
  'धनिष्ठा','शतभिषा','पूर्व भाद्रपदा','उत्तर भाद्रपदा','रेवती',
];

const YOGAS = [
  'Vishkambha','Priti','Ayushman','Saubhagya','Shobhana','Atiganda',
  'Sukarman','Dhriti','Shula','Ganda','Vriddhi','Dhruva','Vyaghata',
  'Harshana','Vajra','Siddhi','Vyatipata','Variyan','Parigha','Shiva',
  'Siddha','Sadhya','Shubha','Shukla','Brahma','Indra','Vaidhriti',
];

const KARANAS = [
  'Bava','Balava','Kaulava','Taitila','Garaja','Vanija',
  'Vishti','Shakuni','Chatushpada','Naga','Kimstughna',
];

const VAAR =    ['Ravivaar',  'Somvaar',  'Mangalvaar', 'Budhvaar',  'Guruvaar',  'Shukravaar', 'Shanivaar'];
const VAAR_EN = ['Sunday',    'Monday',   'Tuesday',    'Wednesday', 'Thursday',  'Friday',     'Saturday'];
const VAAR_HI = ['रविवार',   'सोमवार',  'मंगलवार',   'बुधवार',   'गुरुवार',  'शुक्रवार',  'शनिवार'];
const VAAR_DEITY    = ['Surya Dev',   'Shiva Ji',  'Hanuman Ji', 'Ganesh Ji', 'Vishnu Ji', 'Lakshmi Mata', 'Shani Dev'];
const VAAR_DEITY_HI = ['सूर्य देव', 'शिव जी',   'हनुमान जी', 'गणेश जी',  'विष्णु जी','लक्ष्मी माता','शनि देव'];
const VAAR_MANTRA   = [
  'ॐ घृणि सूर्याय नमः',
  'ॐ नमः शिवाय',
  'ॐ नमो हनुमते रुद्रावताराय',
  'ॐ गं गणपतये नमः',
  'ॐ नमो भगवते वासुदेवाय',
  'ॐ श्रीं महालक्ष्म्यै नमः',
  'ॐ शं शनैश्चराय नमः',
];

// Rahu Kaal order by weekday (Sun=0 to Sat=6)
// Value = which 1/8th part of the day (1-indexed)
const RAHU_PART = [8, 2, 7, 5, 6, 4, 3];

// Auspicious Yogas
const AUSPICIOUS_YOGAS = ['Siddhi','Shubha','Shiva','Brahma','Priti','Saubhagya','Shobhana','Vriddhi','Dhruva','Harshana'];
const INAUSPICIOUS_YOGAS = ['Vishkambha','Ganda','Vajra','Vyatipata','Parigha','Vaidhriti','Atiganda','Shula','Vyaghata'];

// ── MATH FUNCTIONS ─────────────────────────────────────────────
function toRad(deg) { return deg * Math.PI / 180; }

function julianDay(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const a = Math.floor((14 - m) / 12);
  const yr = y + 4800 - a;
  const mo = m + 12 * a - 3;
  return d + Math.floor((153 * mo + 2) / 5) + 365 * yr +
    Math.floor(yr / 4) - Math.floor(yr / 100) +
    Math.floor(yr / 400) - 32045;
}

function moonLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0  = (218.3164477 + 481267.88123421 * T) % 360;
  const M   = (357.5291092 + 35999.0502909  * T) % 360;
  const Mm  = (134.9633964 + 477198.8675055 * T) % 360;
  const D   = (297.8501921 + 445267.1114034 * T) % 360;
  const Om  = (125.0445479 - 1934.1362608  * T) % 360;
  const F   = (93.2720950  + 483202.0175233 * T) % 360;

  const corr =
    6.288774 * Math.sin(toRad(Mm)) +
    1.274027 * Math.sin(toRad(2*D - Mm)) +
    0.658314 * Math.sin(toRad(2*D)) +
    0.213618 * Math.sin(toRad(2*Mm)) -
    0.185116 * Math.sin(toRad(M)) -
    0.114332 * Math.sin(toRad(2*F)) +
    0.058793 * Math.sin(toRad(2*D - 2*Mm)) +
    0.057066 * Math.sin(toRad(2*D - M - Mm)) +
    0.053322 * Math.sin(toRad(2*D + Mm)) +
    0.045758 * Math.sin(toRad(2*D - M));

  return ((L0 + corr) % 360 + 360) % 360;
}

function sunLongitude(jd) {
  const T  = (jd - 2451545.0) / 36525;
  const L0 = (280.46646 + 36000.76983 * T) % 360;
  const M  = (357.52911 + 35999.05029 * T) % 360;
  const C  =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(toRad(M)) +
    (0.019993 - 0.000101 * T) * Math.sin(toRad(2 * M)) +
    0.000289 * Math.sin(toRad(3 * M));
  return ((L0 + C) % 360 + 360) % 360;
}

function getSunriseSunset(date, lat = 22.7196, lon = 75.8577) {
  const jd = julianDay(date);
  const n  = jd - 2451545.0;
  const L  = (280.460 + 0.9856474 * n) % 360;
  const g  = toRad((357.528 + 0.9856003 * n) % 360);
  const lambda = toRad(L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g));
  const sinDec = 0.39782 * Math.sin(lambda);
  const cosDec = Math.cos(Math.asin(sinDec));
  const latRad  = toRad(lat);
  const cosH = (-0.01454 - sinDec * Math.sin(latRad)) / (cosDec * Math.cos(latRad));

  // Polar fallback
  if (Math.abs(cosH) > 1) return { sunrise: '06:00', sunset: '18:30' };

  const H     = Math.acos(cosH) * 180 / Math.PI;
  const UT_set  = ((H  + (L + 0.0657720 * n - 6.622)) % 360) / 15 - lon / 15;
  const UT_rise = ((360 - H + (L + 0.0657720 * n - 6.622)) % 360) / 15 - lon / 15;

  const fmt = h => {
    const hr  = Math.floor(((h % 24) + 24) % 24);
    const min = Math.round((((h % 24) + 24) % 24 - hr) * 60);
    return `${String(hr).padStart(2,'0')}:${String(Math.min(min,59)).padStart(2,'0')}`;
  };

  return { sunrise: fmt(UT_rise), sunset: fmt(UT_set) };
}

function getRahuKaal(date, sunrise, sunset) {
  const day  = date.getDay();
  const [srH, srM] = sunrise.split(':').map(Number);
  const [ssH, ssM] = sunset.split(':').map(Number);
  const total    = (ssH * 60 + ssM) - (srH * 60 + srM);
  const partMin  = total / 8;
  const part     = RAHU_PART[day] - 1;
  const startMin = srH * 60 + srM + part * partMin;
  const endMin   = startMin + partMin;
  const fmt = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(Math.round(m%60)).padStart(2,'0')}`;
  return `${fmt(startMin)} – ${fmt(endMin)}`;
}

function getAbhijitMuhurat(sunrise, sunset) {
  const [srH, srM] = sunrise.split(':').map(Number);
  const [ssH, ssM] = sunset.split(':').map(Number);
  const noonMin = (srH * 60 + srM + ssH * 60 + ssM) / 2;
  const fmt = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(Math.round(m%60)).padStart(2,'0')}`;
  return `${fmt(noonMin - 12)} – ${fmt(noonMin + 12)}`;
}

function getVikramSamvat(date) {
  // Vikram Samvat = Gregorian Year + 57 (approx, exact depends on Chaitra)
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 4 ? y + 57 : y + 56;
}

function getShakaSamvat(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 4 ? y - 78 : y - 79;
}

// ── SPECIAL EVENTS ─────────────────────────────────────────────
function getSpecialEvents(tithiIndex, day, lang) {
  const isH = lang === 'hindi';
  const events = [];

  // Tithi-based events
  if (tithiIndex === 10 || tithiIndex === 25) { // Ekadashi (both pakshas)
    events.push({ text: isH ? '🌿 एकादशी — विष्णु व्रत का दिन' : '🌿 Ekadashi — Vishnu Vrat day', color: '#27AE60' });
  }
  if (tithiIndex === 14) events.push({ text: isH ? '🌕 पूर्णिमा — अत्यंत शुभ' : '🌕 Purnima — Most auspicious', color: '#F4A261' });
  if (tithiIndex === 29) events.push({ text: isH ? '🌑 अमावस्या — पितृ तर्पण' : '🌑 Amavasya — Ancestor worship', color: '#9B59B6' });
  if (tithiIndex === 3 || tithiIndex === 18) events.push({ text: isH ? '🐘 संकट चतुर्थी — गणेश पूजा' : '🐘 Chaturthi — Ganesh Puja', color: '#E8620A' });
  if (tithiIndex === 7 || tithiIndex === 22) events.push({ text: isH ? '🔱 अष्टमी — दुर्गा पूजा' : '🔱 Ashtami — Durga Puja', color: '#C0392B' });

  // Weekday-based events
  if (day === 1) events.push({ text: isH ? '🔱 सोमवार — शिव अभिषेक करें' : '🔱 Monday — Perform Shiva Abhishek', color: '#6B21A8' });
  if (day === 2) events.push({ text: isH ? '🏹 मंगलवार — हनुमान चालीसा पढ़ें' : '🏹 Tuesday — Read Hanuman Chalisa', color: '#E74C3C' });
  if (day === 4) events.push({ text: isH ? '🪷 गुरुवार — विष्णु पूजा' : '🪷 Thursday — Vishnu Puja', color: '#F39C12' });
  if (day === 5) events.push({ text: isH ? '✨ शुक्रवार — लक्ष्मी पूजा' : '✨ Friday — Lakshmi Puja', color: '#F4A261' });
  if (day === 6) events.push({ text: isH ? '⚫ शनिवार — शनि तेल अर्पण' : '⚫ Saturday — Shani oil offering', color: '#7F8C8D' });

  return events;
}

// ── MAIN EXPORT ────────────────────────────────────────────────
export function getPanchang(date = new Date(), lat = 22.7196, lon = 75.8577, lang = 'hindi') {
  const isH = lang === 'hindi';

  // Julian day with time fraction
  const jd = julianDay(date) + date.getHours() / 24 + date.getMinutes() / 1440;

  const moonLon = moonLongitude(jd);
  const sunLon  = sunLongitude(jd);

  // Tithi: each tithi = 12° of separation
  const separation  = ((moonLon - sunLon) + 360) % 360;
  const tithiIndex  = Math.floor(separation / 12); // 0-29
  const tithi       = TITHIS[tithiIndex];
  const tithiHi     = TITHIS_HI[tithiIndex];
  const paksha      = tithiIndex < 15 ? 'Shukla Paksha' : 'Krishna Paksha';
  const pakshaHi    = tithiIndex < 15 ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष';
  const isEkadashi  = tithiIndex === 10 || tithiIndex === 25;

  // Nakshatra: 360/27 = 13.333° per nakshatra
  const nakIndex  = Math.floor(moonLon / (360 / 27)) % 27;
  const nakshatra = NAKSHATRAS[nakIndex];
  const nakshatraHi = NAKSHATRAS_HI[nakIndex];

  // Yoga: (moon + sun) / (360/27)
  const yogaIndex = Math.floor(((moonLon + sunLon) % 360) / (360 / 27)) % 27;
  const yoga      = YOGAS[yogaIndex];

  // Karana: half-tithi
  const karanaIndex = Math.floor(separation / 6) % 11;
  const karana      = KARANAS[karanaIndex];

  // Weekday
  const day       = date.getDay();
  const vaar      = isH ? VAAR_HI[day] : VAAR_EN[day];
  const vaarDeity = isH ? VAAR_DEITY_HI[day] : VAAR_DEITY[day];
  const vaarMantra = VAAR_MANTRA[day];

  // Sun times
  const { sunrise, sunset } = getSunriseSunset(date, lat, lon);
  const rahuKaal  = getRahuKaal(date, sunrise, sunset);
  const abhijit   = getAbhijitMuhurat(sunrise, sunset);

  // Auspiciousness
  const isAuspicious    = AUSPICIOUS_YOGAS.includes(yoga);
  const isInauspicious  = INAUSPICIOUS_YOGAS.includes(yoga);
  const auspiciousLabel = isAuspicious
    ? (isH ? '✨ शुभ दिन' : '✨ Auspicious')
    : isInauspicious
      ? (isH ? '⚠️ सावधान रहें' : '⚠️ Be Careful')
      : (isH ? '⚖️ सामान्य दिन' : '⚖️ Normal Day');
  const auspiciousColor = isAuspicious ? '#27AE60' : isInauspicious ? '#E74C3C' : '#C9830A';

  // Special events
  const specialEvents = getSpecialEvents(tithiIndex, day, lang);

  // Samvat
  const vikramSamvat = getVikramSamvat(date);
  const shakaSamvat  = getShakaSamvat(date);

  // Moon phase percentage
  const moonPhasePct = Math.round((separation / 360) * 100);

  return {
    // Core Panchang
    tithi:       isH ? tithiHi : tithi,
    tithiNum:    tithiIndex % 15 + 1,
    paksha:      isH ? pakshaHi : paksha,
    nakshatra:   isH ? nakshatraHi : nakshatra,
    yoga,
    karana,
    vaar,
    vaarDeity,
    vaarMantra,

    // Sun/Moon
    sunrise,
    sunset,
    rahuKaal,
    abhijit,
    moonLongitude: moonLon.toFixed(1),
    sunLongitude:  sunLon.toFixed(1),
    moonPhasePct,
    isEkadashi,

    // Status
    isAuspicious,
    isInauspicious,
    auspiciousLabel,
    auspiciousColor,
    specialEvents,

    // Calendar
    vikramSamvat,
    shakaSamvat,

    // Date string
    dateStr: date.toLocaleDateString(isH ? 'hi-IN' : 'en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }),
  };
}

// Quick check: is today Ekadashi?
export function isTodayEkadashi() {
  const p = getPanchang(new Date());
  return p.isEkadashi;
}

// Get next Ekadashi date (approximate — within next 20 days)
export function getNextEkadashi() {
  const today = new Date();
  for (let i = 1; i <= 20; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const p = getPanchang(d);
    if (p.isEkadashi) return { date: d, daysAway: i };
  }
  return null;
}