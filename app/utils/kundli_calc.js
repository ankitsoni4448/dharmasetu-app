// DharmaSetu — Kundli Calculation Utilities
// FILE: app/utils/kundli_calc.js
//
// Phase 1: Improved static Lahiri-ayanamsa calculation (no API needed)
// Phase 2: Prokerala API via backend /kundli/calculate (credentials in .env)
// ════════════════════════════════════════════════════════════════

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://dharmasetu-backend-2c65.onrender.com';

// ── RASHI DATA ──────────────────────────────────────────────────
export const RASHIS = [
  { id:0,  name:'Mesh',      nameEn:'Aries',       planet:'Mangal',   deity:'Kartik',    element:'Fire',  quality:'Cardinal' },
  { id:1,  name:'Vrishabh',  nameEn:'Taurus',      planet:'Shukra',   deity:'Lakshmi',   element:'Earth', quality:'Fixed'    },
  { id:2,  name:'Mithun',    nameEn:'Gemini',       planet:'Budh',     deity:'Vishnu',    element:'Air',   quality:'Mutable'  },
  { id:3,  name:'Kark',      nameEn:'Cancer',       planet:'Chandra',  deity:'Shiva',     element:'Water', quality:'Cardinal' },
  { id:4,  name:'Simha',     nameEn:'Leo',          planet:'Surya',    deity:'Surya',     element:'Fire',  quality:'Fixed'    },
  { id:5,  name:'Kanya',     nameEn:'Virgo',        planet:'Budh',     deity:'Saraswati', element:'Earth', quality:'Mutable'  },
  { id:6,  name:'Tula',      nameEn:'Libra',        planet:'Shukra',   deity:'Lakshmi',   element:'Air',   quality:'Cardinal' },
  { id:7,  name:'Vrishchik', nameEn:'Scorpio',      planet:'Mangal',   deity:'Kali',      element:'Water', quality:'Fixed'    },
  { id:8,  name:'Dhanu',     nameEn:'Sagittarius',  planet:'Guru',     deity:'Vishnu',    element:'Fire',  quality:'Mutable'  },
  { id:9,  name:'Makar',     nameEn:'Capricorn',    planet:'Shani',    deity:'Shani',     element:'Earth', quality:'Cardinal' },
  { id:10, name:'Kumbh',     nameEn:'Aquarius',     planet:'Shani',    deity:'Shiva',     element:'Air',   quality:'Fixed'    },
  { id:11, name:'Meen',      nameEn:'Pisces',       planet:'Guru',     deity:'Vishnu',    element:'Water', quality:'Mutable'  },
];

// ── NAKSHATRA DATA (27 + 1 = 28) ────────────────────────────────
export const NAKSHATRAS = [
  { id:0,  name:'Ashwini',           lord:'Ketu',    deity:'Ashwini Kumaras',  pada:4 },
  { id:1,  name:'Bharani',           lord:'Shukra',  deity:'Yama',             pada:4 },
  { id:2,  name:'Krittika',          lord:'Surya',   deity:'Agni',             pada:4 },
  { id:3,  name:'Rohini',            lord:'Chandra', deity:'Brahma',           pada:4 },
  { id:4,  name:'Mrigashira',        lord:'Mangal',  deity:'Soma',             pada:4 },
  { id:5,  name:'Ardra',             lord:'Rahu',    deity:'Rudra',            pada:4 },
  { id:6,  name:'Punarvasu',         lord:'Guru',    deity:'Aditi',            pada:4 },
  { id:7,  name:'Pushya',            lord:'Shani',   deity:'Brihaspati',       pada:4 },
  { id:8,  name:'Ashlesha',          lord:'Budh',    deity:'Sarpa',            pada:4 },
  { id:9,  name:'Magha',             lord:'Ketu',    deity:'Pitaras',          pada:4 },
  { id:10, name:'Purva Phalguni',    lord:'Shukra',  deity:'Bhaga',            pada:4 },
  { id:11, name:'Uttara Phalguni',   lord:'Surya',   deity:'Aryaman',          pada:4 },
  { id:12, name:'Hasta',             lord:'Chandra', deity:'Surya',            pada:4 },
  { id:13, name:'Chitra',            lord:'Mangal',  deity:'Vishvakarman',     pada:4 },
  { id:14, name:'Swati',             lord:'Rahu',    deity:'Vayu',             pada:4 },
  { id:15, name:'Vishakha',          lord:'Guru',    deity:'Indra-Agni',       pada:4 },
  { id:16, name:'Anuradha',          lord:'Shani',   deity:'Mitra',            pada:4 },
  { id:17, name:'Jyeshtha',          lord:'Budh',    deity:'Indra',            pada:4 },
  { id:18, name:'Moola',             lord:'Ketu',    deity:'Nirrti',           pada:4 },
  { id:19, name:'Purva Ashadha',     lord:'Shukra',  deity:'Apas',             pada:4 },
  { id:20, name:'Uttara Ashadha',    lord:'Surya',   deity:'Vishvadevas',      pada:4 },
  { id:21, name:'Shravana',          lord:'Chandra', deity:'Vishnu',           pada:4 },
  { id:22, name:'Dhanishtha',        lord:'Mangal',  deity:'Ashta Vasus',      pada:4 },
  { id:23, name:'Shatabhisha',       lord:'Rahu',    deity:'Varuna',           pada:4 },
  { id:24, name:'Purva Bhadrapada',  lord:'Guru',    deity:'Aja Ekapad',       pada:4 },
  { id:25, name:'Uttara Bhadrapada', lord:'Shani',   deity:'Ahir Budhnya',     pada:4 },
  { id:26, name:'Revati',            lord:'Budh',    deity:'Pushan',           pada:4 },
];

// ── DASHA LORDS (Vimshottari, 120-year cycle) ───────────────────
export const DASHA_LORDS = ['Ketu','Shukra','Surya','Chandra','Mangal','Rahu','Guru','Shani','Budh'];
export const DASHA_YEARS  = [7,     20,      6,      10,       7,       18,    16,    19,     17    ];

// Nakshatra → Dasha lord mapping (each lord rules 3 nakshatras in sequence)
const NAK_TO_DASHA = [0,1,2,3,4,5,6,7,8,0,1,2,3,4,5,6,7,8,0,1,2,3,4,5,6,7,8];

// ════════════════════════════════════════════════════════════════
// CORE CALCULATION — Improved Tropical → Sidereal (Lahiri)
// Much more accurate than the original simple DOB-based lookup
// ════════════════════════════════════════════════════════════════

/**
 * Julian Day Number from Gregorian calendar
 */
function julianDay(year, month, day, hour = 12) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) +
    Math.floor(y / 400) - 32045 + (hour - 12) / 24;
}

/**
 * Lahiri Ayanamsa in degrees for a given Julian Day
 * Approximation valid 1900–2100
 */
function lahiriAyanamsa(jd) {
  const T = (jd - 2451545.0) / 36525; // Julian centuries from J2000
  return 23.85 + 0.0137 * T; // ~23.85° in 2000, increases ~50.3"/year
}

/**
 * Mean Moon Longitude (ecliptic, tropical) from Julian Day
 * Accurate to ~0.5° — sufficient for Rashi determination
 */
function moonLongitudeTropical(jd) {
  const T = (jd - 2451545.0) / 36525;
  // Brown's simplified theory
  let L = 218.3164477 + 481267.88123421 * T
    - 0.0015786 * T * T
    + T * T * T / 538841
    - T * T * T * T / 65194000;
  // Main lunar anomaly correction
  const M  = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * Math.PI / 180;
  const Mm = (134.96298 + 477198.867398 * T + 0.0086972 * T * T) * Math.PI / 180;
  const F  = (93.27191  + 483202.017538 * T - 0.0036825 * T * T) * Math.PI / 180;
  const D  = (297.85036 + 445267.111480 * T - 0.0019142 * T * T) * Math.PI / 180;
  // Main corrections (degrees)
  L += 6.289 * Math.sin(Mm)
    - 1.274 * Math.sin(2 * D - Mm)
    + 0.658 * Math.sin(2 * D)
    - 0.186 * Math.sin(M)
    - 0.059 * Math.sin(2 * D - 2 * Mm)
    - 0.057 * Math.sin(2 * D - M - Mm)
    + 0.053 * Math.sin(2 * D + Mm)
    + 0.046 * Math.sin(2 * D - M)
    + 0.041 * Math.sin(Mm - M)
    - 0.035 * Math.sin(D)
    - 0.031 * Math.sin(Mm + M)
    - 0.015 * Math.sin(2 * F - 2 * D)
    + 0.011 * Math.sin(Mm - 4 * D);
  return ((L % 360) + 360) % 360;
}

/**
 * Approximate Sun longitude (tropical) from Julian Day
 * Accurate to ~0.01°
 */
function sunLongitudeTropical(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T;
  const M  = (357.52911 + 35999.05029 * T) * Math.PI / 180;
  const C  = (1.914602 - 0.004817 * T) * Math.sin(M)
           + 0.019993 * Math.sin(2 * M)
           + 0.000289 * Math.sin(3 * M);
  return ((L0 + C) % 360 + 360) % 360;
}

/**
 * Get Rashi index (0-11) from sidereal longitude
 */
function rashiFromLongitude(siderealDeg) {
  return Math.floor(((siderealDeg % 360) + 360) % 360 / 30);
}

/**
 * Get Nakshatra index (0-26) from sidereal moon longitude
 */
function nakshatraFromLongitude(siderealDeg) {
  return Math.floor(((siderealDeg % 360) + 360) % 360 / (360 / 27));
}

// ════════════════════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════════════════════

/**
 * Calculate Moon Rashi (sidereal, Lahiri ayanamsa)
 * @param {number} day   - 1-31
 * @param {number} month - 1-12
 * @param {number} year  - e.g. 1990
 * @param {number} hour  - 0-23, default 12
 * @returns {{ rashi: string, rashiEn: string, planet: string, deity: string, element: string }}
 */
export function getRashi(day, month, year, hour = 12) {
  try {
    const jd = julianDay(year, month, day, hour);
    const moonTrop = moonLongitudeTropical(jd);
    const ayanamsa = lahiriAyanamsa(jd);
    const moonSide = ((moonTrop - ayanamsa) % 360 + 360) % 360;
    const idx = rashiFromLongitude(moonSide);
    const r = RASHIS[idx];
    return {
      rashi:     r.name,
      rashiEn:   r.nameEn,
      planet:    r.planet,
      deity:     r.deity,
      element:   r.element,
      quality:   r.quality,
      moonDeg:   moonSide.toFixed(2),
      source:    'calculated',
    };
  } catch(e) {
    console.error('[kundli_calc] getRashi error:', e.message);
    return { rashi: 'Mesh', rashiEn: 'Aries', planet: 'Mangal', deity: 'Kartik', element: 'Fire', source: 'fallback' };
  }
}

/**
 * Calculate Nakshatra from birth date/time
 */
export function getNakshatra(day, month, year, hour = 12) {
  try {
    const jd = julianDay(year, month, day, hour);
    const moonTrop = moonLongitudeTropical(jd);
    const ayanamsa = lahiriAyanamsa(jd);
    const moonSide = ((moonTrop - ayanamsa) % 360 + 360) % 360;
    const idx = nakshatraFromLongitude(moonSide);
    const nak = NAKSHATRAS[idx];
    const dashaLordIdx = NAK_TO_DASHA[idx];
    return {
      nakshatra:  nak.name,
      lord:       nak.lord,
      deity:      nak.deity,
      dashaLord:  DASHA_LORDS[dashaLordIdx],
      dashaYears: DASHA_YEARS[dashaLordIdx],
      moonDeg:    moonSide.toFixed(2),
    };
  } catch(e) {
    console.error('[kundli_calc] getNakshatra error:', e.message);
    return { nakshatra: 'Ashwini', lord: 'Ketu', deity: 'Ashwini Kumaras', dashaLord: 'Ketu', dashaYears: 7 };
  }
}

/**
 * Get approximate Lagna (Ascendant sign) from birth time + location
 * The ascendant changes ~every 2 hours, so birth time + coordinates are critical.
 * This is an approximation; use Prokerala API for precise Lagna.
 *
 * @param {number} lat  - latitude
 * @param {number} lng  - longitude
 * @param {number} day/month/year/hour
 */
export function getLagna(lat, lng, day, month, year, hour = 12) {
  try {
    const jd = julianDay(year, month, day, hour);
    const sunTrop  = sunLongitudeTropical(jd);
    const ayanamsa = lahiriAyanamsa(jd);
    const sunSide  = ((sunTrop - ayanamsa) % 360 + 360) % 360;
    // Approximate: Lagna ≈ Sun sign + 2h offset per 30° + latitude correction
    const latCorrection = lat ? (lat / 90) * 15 : 0;
    const lagnaApprox   = ((sunSide + (hour - 6) * 15 + latCorrection) % 360 + 360) % 360;
    const idx   = rashiFromLongitude(lagnaApprox);
    return RASHIS[idx].name;
  } catch(e) {
    return 'Mesh';
  }
}

/**
 * Full kundli calculation — tries Prokerala API first, falls back to local calc
 * @param {{ dob, tob, birthCity, lat, lng }} userData
 */
export async function getFullKundli(userData = {}) {
  const { dob, tob, birthCity, lat, lng } = userData;
  if (!dob) return null;

  // Try backend (which calls Prokerala)
  try {
    const res = await fetch(`${BACKEND}/kundli/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dob, tob: tob || '12:00', city: birthCity || '', lat, lng }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return { ...data, source: data.source || 'prokerala' };
    }
  } catch(e) {
    console.log('[kundli_calc] API fallback:', e.message);
  }

  // Local calculation fallback
  const parts = (dob || '').split('-');
  if (parts.length < 3) return null;
  const [year, month, day] = parts.map(Number);
  const timeParts = (tob || '12:00').split(':').map(Number);
  const hour = timeParts[0] || 12;

  const rashiData    = getRashi(day, month, year, hour);
  const nakshatraData = getNakshatra(day, month, year, hour);
  const lagna        = getLagna(lat || 23.0, lng || 80.0, day, month, year, hour);

  return {
    success:   true,
    source:    'local',
    rashi:     rashiData.rashi,
    rashiEn:   rashiData.rashiEn,
    nakshatra: nakshatraData.nakshatra,
    planet:    rashiData.planet,
    deity:     rashiData.deity,
    element:   rashiData.element,
    lagna,
    dashaLord: nakshatraData.dashaLord,
    dashaYears:nakshatraData.dashaYears,
    moonDeg:   rashiData.moonDeg,
  };
}

/**
 * Vikram Samvat year from Gregorian year+month
 */
export function getVikramSamvat(year, month) {
  return month >= 4 ? year + 57 : year + 56;
}

/**
 * Zodiac compatibility (basic Vedic)
 */
export function getRashiCompatibility(rashi1, rashi2) {
  const FRIENDLY = {
    Mesh:      ['Simha','Dhanu','Kumbh'],
    Vrishabh:  ['Kanya','Makar','Kark'],
    Mithun:    ['Tula','Kumbh','Mesh'],
    Kark:      ['Vrishchik','Meen','Vrishabh'],
    Simha:     ['Mesh','Dhanu','Tula'],
    Kanya:     ['Vrishabh','Makar','Mithun'],
    Tula:      ['Mithun','Kumbh','Simha'],
    Vrishchik: ['Kark','Meen','Dhanu'],
    Dhanu:     ['Mesh','Simha','Vrishchik'],
    Makar:     ['Vrishabh','Kanya','Meen'],
    Kumbh:     ['Mithun','Tula','Kark'],
    Meen:      ['Kark','Vrishchik','Makar'],
  };
  const friends = FRIENDLY[rashi1] || [];
  if (friends.includes(rashi2)) return { score: 8, label: 'Excellent', color: '#27AE60' };
  if (rashi1 === rashi2)        return { score: 7, label: 'Good',      color: '#3498DB'  };
  return                               { score: 5, label: 'Neutral',   color: '#C9830A'  };
}
