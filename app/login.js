// ════════════════════════════════════════════════════════════
// DharmaSetu — Complete Login + Accurate Vedic Kundli Engine
// FIXED: Removed SB_H, fixed HH:MM time input auto-format
// Uses useSafeAreaInsets() — no hardcoded StatusBar heights
// ════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated, Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW, height: SH } = Dimensions.get('window');

// ════════════════════════════════════════════════════════════
// ACCURATE VEDIC KUNDLI ENGINE
// ════════════════════════════════════════════════════════════

const RASHIS_DATA = [
  {
    index: 0, name: 'Mesh', english: 'Aries', degrees: [0, 30],
    planet: 'Mangal (Mars)', deity: 'Hanuman', mantra: 'ॐ अं अंगारकाय नमः',
    greetingEn: 'Jai Shri Ram', greetingHi: 'जय श्री राम',
    colorEn: 'Red', colorHi: 'लाल', dayEn: 'Tuesday', dayHi: 'मंगलवार',
    gemEn: 'Red Coral (Moonga)', gemHi: 'मूंगा',
    element: 'Fire', quality: 'Cardinal',
  },
  {
    index: 1, name: 'Vrishabh', english: 'Taurus', degrees: [30, 60],
    planet: 'Shukra (Venus)', deity: 'Lakshmi', mantra: 'ॐ शुं शुक्राय नमः',
    greetingEn: 'Jai Maa Lakshmi', greetingHi: 'जय माँ लक्ष्मी',
    colorEn: 'White / Pink', colorHi: 'सफेद / गुलाबी', dayEn: 'Friday', dayHi: 'शुक्रवार',
    gemEn: 'Diamond (Heera)', gemHi: 'हीरा',
    element: 'Earth', quality: 'Fixed',
  },
  {
    index: 2, name: 'Mithun', english: 'Gemini', degrees: [60, 90],
    planet: 'Budh (Mercury)', deity: 'Vishnu', mantra: 'ॐ बुं बुधाय नमः',
    greetingEn: 'Jai Shri Hari', greetingHi: 'जय श्री हरि',
    colorEn: 'Green', colorHi: 'हरा', dayEn: 'Wednesday', dayHi: 'बुधवार',
    gemEn: 'Emerald (Panna)', gemHi: 'पन्ना',
    element: 'Air', quality: 'Mutable',
  },
  {
    index: 3, name: 'Kark', english: 'Cancer', degrees: [90, 120],
    planet: 'Chandra (Moon)', deity: 'Shiva', mantra: 'ॐ सों सोमाय नमः',
    greetingEn: 'Om Namah Shivaya', greetingHi: 'ॐ नमः शिवाय',
    colorEn: 'White / Silver', colorHi: 'सफेद / चाँदी', dayEn: 'Monday', dayHi: 'सोमवार',
    gemEn: 'Pearl (Moti)', gemHi: 'मोती',
    element: 'Water', quality: 'Cardinal',
  },
  {
    index: 4, name: 'Simha', english: 'Leo', degrees: [120, 150],
    planet: 'Surya (Sun)', deity: 'Surya Dev', mantra: 'ॐ घृणि सूर्याय नमः',
    greetingEn: 'Jai Surya Dev', greetingHi: 'जय सूर्य देव',
    colorEn: 'Gold / Orange', colorHi: 'सोना / नारंगी', dayEn: 'Sunday', dayHi: 'रविवार',
    gemEn: 'Ruby (Manik)', gemHi: 'माणिक',
    element: 'Fire', quality: 'Fixed',
  },
  {
    index: 5, name: 'Kanya', english: 'Virgo', degrees: [150, 180],
    planet: 'Budh (Mercury)', deity: 'Saraswati', mantra: 'ॐ बुं बुधाय नमः',
    greetingEn: 'Jai Maa Saraswati', greetingHi: 'जय माँ सरस्वती',
    colorEn: 'Green / Grey', colorHi: 'हरा / स्लेटी', dayEn: 'Wednesday', dayHi: 'बुधवार',
    gemEn: 'Emerald (Panna)', gemHi: 'पन्ना',
    element: 'Earth', quality: 'Mutable',
  },
  {
    index: 6, name: 'Tula', english: 'Libra', degrees: [180, 210],
    planet: 'Shukra (Venus)', deity: 'Lakshmi', mantra: 'ॐ शुं शुक्राय नमः',
    greetingEn: 'Jai Maa Lakshmi', greetingHi: 'जय माँ लक्ष्मी',
    colorEn: 'Blue / White', colorHi: 'नीला / सफेद', dayEn: 'Friday', dayHi: 'शुक्रवार',
    gemEn: 'Diamond (Heera)', gemHi: 'हीरा',
    element: 'Air', quality: 'Cardinal',
  },
  {
    index: 7, name: 'Vrishchik', english: 'Scorpio', degrees: [210, 240],
    planet: 'Mangal / Ketu', deity: 'Kali Maa', mantra: 'ॐ कां कालिकायै नमः',
    greetingEn: 'Jai Maa Kali', greetingHi: 'जय माँ काली',
    colorEn: 'Red / Maroon', colorHi: 'लाल / मैरून', dayEn: 'Tuesday', dayHi: 'मंगलवार',
    gemEn: 'Red Coral (Moonga)', gemHi: 'मूंगा',
    element: 'Water', quality: 'Fixed',
  },
  {
    index: 8, name: 'Dhanu', english: 'Sagittarius', degrees: [240, 270],
    planet: 'Guru (Jupiter)', deity: 'Vishnu', mantra: 'ॐ बृं बृहस्पतये नमः',
    greetingEn: 'Jai Shri Hari', greetingHi: 'जय श्री हरि',
    colorEn: 'Yellow / Purple', colorHi: 'पीला / बैंगनी', dayEn: 'Thursday', dayHi: 'गुरुवार',
    gemEn: 'Yellow Topaz (Pukhraj)', gemHi: 'पुखराज',
    element: 'Fire', quality: 'Mutable',
  },
  {
    index: 9, name: 'Makar', english: 'Capricorn', degrees: [270, 300],
    planet: 'Shani (Saturn)', deity: 'Shani Dev', mantra: 'ॐ शं शनैश्चराय नमः',
    greetingEn: 'Jai Shani Dev', greetingHi: 'जय शनि देव',
    colorEn: 'Black / Dark Blue', colorHi: 'काला / गहरा नीला', dayEn: 'Saturday', dayHi: 'शनिवार',
    gemEn: 'Blue Sapphire (Neelam)', gemHi: 'नीलम',
    element: 'Earth', quality: 'Cardinal',
  },
  {
    index: 10, name: 'Kumbh', english: 'Aquarius', degrees: [300, 330],
    planet: 'Shani / Rahu', deity: 'Shiva', mantra: 'ॐ नमः शिवाय',
    greetingEn: 'Om Namah Shivaya', greetingHi: 'ॐ नमः शिवाय',
    colorEn: 'Blue / Turquoise', colorHi: 'नीला / फिरोज़ी', dayEn: 'Saturday / Wednesday', dayHi: 'शनिवार / बुधवार',
    gemEn: 'Blue Sapphire (Neelam)', gemHi: 'नीलम',
    element: 'Air', quality: 'Fixed',
  },
  {
    index: 11, name: 'Meen', english: 'Pisces', degrees: [330, 360],
    planet: 'Guru / Ketu', deity: 'Vishnu', mantra: 'ॐ नमो भगवते वासुदेवाय',
    greetingEn: 'Jai Shri Hari', greetingHi: 'जय श्री हरि',
    colorEn: 'Yellow / Sea Green', colorHi: 'पीला / समुद्री हरा', dayEn: 'Thursday', dayHi: 'गुरुवार',
    gemEn: 'Yellow Topaz (Pukhraj)', gemHi: 'पुखराज',
    element: 'Water', quality: 'Mutable',
  },
];

const NAKSHATRAS = [
  { name: 'Ashwini', rashi: 0, lord: 'Ketu' },
  { name: 'Bharani', rashi: 0, lord: 'Shukra' },
  { name: 'Krittika', rashi: 0, lord: 'Surya' },
  { name: 'Rohini', rashi: 1, lord: 'Chandra' },
  { name: 'Mrigashira', rashi: 1, lord: 'Mangal' },
  { name: 'Ardra', rashi: 2, lord: 'Rahu' },
  { name: 'Punarvasu', rashi: 2, lord: 'Guru' },
  { name: 'Pushya', rashi: 3, lord: 'Shani' },
  { name: 'Ashlesha', rashi: 3, lord: 'Budh' },
  { name: 'Magha', rashi: 4, lord: 'Ketu' },
  { name: 'Purva Phalguni', rashi: 4, lord: 'Shukra' },
  { name: 'Uttara Phalguni', rashi: 4, lord: 'Surya' },
  { name: 'Hasta', rashi: 5, lord: 'Chandra' },
  { name: 'Chitra', rashi: 5, lord: 'Mangal' },
  { name: 'Swati', rashi: 6, lord: 'Rahu' },
  { name: 'Vishakha', rashi: 6, lord: 'Guru' },
  { name: 'Anuradha', rashi: 7, lord: 'Shani' },
  { name: 'Jyeshtha', rashi: 7, lord: 'Budh' },
  { name: 'Mula', rashi: 8, lord: 'Ketu' },
  { name: 'Purva Ashadha', rashi: 8, lord: 'Shukra' },
  { name: 'Uttara Ashadha', rashi: 8, lord: 'Surya' },
  { name: 'Shravana', rashi: 9, lord: 'Chandra' },
  { name: 'Dhanishtha', rashi: 9, lord: 'Mangal' },
  { name: 'Shatabhisha', rashi: 10, lord: 'Rahu' },
  { name: 'Purva Bhadrapada', rashi: 10, lord: 'Guru' },
  { name: 'Uttara Bhadrapada', rashi: 11, lord: 'Shani' },
  { name: 'Revati', rashi: 11, lord: 'Budh' },
];

function julianDate(year, month, day, hourFraction) {
  let Y = year, M = month, D = day + hourFraction / 24;
  if (M <= 2) { Y -= 1; M += 12; }
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5;
}

function calcMoonLongitude(year, month, day, hourFraction) {
  const jd = julianDate(year, month, day, hourFraction);
  const T = (jd - 2451545.0) / 36525;
  let L0 = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T * T * T / 538841;
  let M1 = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T * T * T / 69699;
  let M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;
  let F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T;
  const toRad = Math.PI / 180;
  let correction = 6.289 * Math.sin(M1 * toRad)
    - 1.274 * Math.sin((2 * 134.9634 - M1) * toRad)
    + 0.658 * Math.sin((2 * 297.8502) * toRad)
    - 0.214 * Math.sin((2 * M1) * toRad)
    - 0.114 * Math.sin(F * toRad)
    + 0.185 * Math.sin(M * toRad);
  const ayanamsa = 23.85 + (T * 50.3 / 3600);
  let tropicalLon = ((L0 + correction) % 360 + 360) % 360;
  let siderealLon = (tropicalLon - ayanamsa + 360) % 360;
  return siderealLon;
}

function getMoonRashi(moonLon) { return RASHIS_DATA[Math.floor(moonLon / 30)]; }
function getNakshatra(moonLon) {
  const idx = Math.floor(moonLon / (360 / 27));
  return NAKSHATRAS[Math.min(idx, 26)];
}
function getPada(moonLon) {
  const nakLen = 360 / 27;
  return Math.floor((moonLon % nakLen) / (nakLen / 4)) + 1;
}

const TIME_MIDPOINTS = {
  brahma: 5.0, morning: 9.0, afternoon: 14.0,
  evening: 18.0, night: 22.0, midnight: 2.0,
};

function calculateKundli(dobDay, dobMonth, dobYear, birthTimeStr, birthTimeSlot) {
  const day = parseInt(dobDay, 10) || 1;
  const month = parseInt(dobMonth, 10) || 1;
  const year = parseInt(dobYear, 10) || 2000;
  let hourFraction = TIME_MIDPOINTS[birthTimeSlot] || 12.0;
  let exactTimeUsed = false;
  if (birthTimeStr && birthTimeStr.match(/^\d{1,2}:\d{2}$/)) {
    const parts = birthTimeStr.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      hourFraction = h + m / 60;
      exactTimeUsed = true;
    }
  }
  const utcHour = hourFraction - 5.5;
  let calcDay = day, calcMonth = month, calcYear = year;
  if (utcHour < 0) {
    calcDay -= 1;
    if (calcDay <= 0) {
      calcMonth -= 1;
      if (calcMonth <= 0) { calcMonth = 12; calcYear -= 1; }
      calcDay = new Date(calcYear, calcMonth, 0).getDate();
    }
  }
  const utcHourFinal = ((utcHour % 24) + 24) % 24;
  const moonLon = calcMoonLongitude(calcYear, calcMonth, calcDay, utcHourFinal);
  const rashi = getMoonRashi(moonLon);
  const nakshatra = getNakshatra(moonLon);
  const pada = getPada(moonLon);
  return { moonLongitude: moonLon.toFixed(2), rashi, nakshatra, pada, exactTimeUsed };
}

// ════════════════════════════════════════════════════════════
// LANGUAGES & ROLES & TIME SLOTS
// ════════════════════════════════════════════════════════════
const LANGUAGES = [
  { id: 'english', label: 'English' },
  { id: 'hindi', label: 'हिंदी' },
  { id: 'marathi', label: 'मराठी' },
  { id: 'bengali', label: 'বাংলা' },
  { id: 'tamil', label: 'தமிழ்' },
  { id: 'telugu', label: 'తెలుగు' },
  { id: 'kannada', label: 'ಕನ್ನಡ' },
  { id: 'gujarati', label: 'ગુજરાતી' },
  { id: 'punjabi', label: 'ਪੰਜਾਬੀ' },
  { id: 'urdu', label: 'اردو' },
  { id: 'odia', label: 'ଓଡ଼ିଆ' },
];

const ROLES = [
  { id: 'jigyasu', emoji: '🎓', en: 'Jigyasu — Learner', hi: 'जिज्ञासु — सीखने वाला', subEn: 'Explore dharma from the basics', subHi: 'धर्म की मूल बातें सीखें' },
  { id: 'sadhak', emoji: '🧘', en: 'Sadhak — Seeker', hi: 'साधक — खोजी', subEn: 'Dive deep into shashtra & vigyan', subHi: 'शास्त्र में गहरे जाएं' },
  { id: 'acharya', emoji: '🏛️', en: 'Acharya — Guide', hi: 'आचार्य — मार्गदर्शक', subEn: 'Share & preserve dharmic knowledge', subHi: 'धर्मिक ज्ञान साझा करें' },
];

const TIME_SLOTS = [
  { id: 'brahma', en: '🌅 Brahma Muhurta (4–6 AM)', hi: '🌅 ब्रह्म मुहूर्त (4–6 बजे)' },
  { id: 'morning', en: '🌞 Morning (6 AM–12 PM)', hi: '🌞 प्रातः (6–12 बजे)' },
  { id: 'afternoon', en: '☀️ Afternoon (12–4 PM)', hi: '☀️ दोपहर (12–4 बजे)' },
  { id: 'evening', en: '🌆 Evening (4–8 PM)', hi: '🌆 संध्या (4–8 बजे)' },
  { id: 'night', en: '🌙 Night (8 PM–12 AM)', hi: '🌙 रात्रि (8–12 बजे)' },
  { id: 'midnight', en: '🌑 Midnight (12–4 AM)', hi: '🌑 अर्ध रात्रि (12–4 बजे)' },
];

// ════════════════════════════════════════════════════════════
// MAIN LOGIN COMPONENT
// ════════════════════════════════════════════════════════════
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState('english');
  const [role, setRole] = useState('jigyasu');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [birthSlot, setBirthSlot] = useState('morning');
  const [exactTime, setExactTime] = useState('');
  const [knowsTime, setKnowsTime] = useState(false);
  const [birthCity, setBirthCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const omPulse = useRef(new Animated.Value(1)).current;
  const isEn = lang !== 'hindi';

  useEffect(() => {
    AsyncStorage.getItem('dharmasetu_user').then(d => { if (d) router.replace('/(tabs)'); });
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 7, useNativeDriver: true }),
    ]).start();
    const breathe = () => Animated.sequence([
      Animated.timing(omPulse, { toValue: 1.08, duration: 2200, useNativeDriver: true }),
      Animated.timing(omPulse, { toValue: 1, duration: 2200, useNativeDriver: true }),
    ]).start(() => breathe());
    breathe();
  }, []);

  const go = (s) => {
    setStep(s);
    fadeAnim.setValue(0); slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  };

  const sendOTP = async () => {
    if (mobile.length !== 10) {
      Alert.alert(isEn ? 'Invalid' : 'गलत', isEn ? 'Enter valid 10-digit mobile number' : '10-अंकीय मोबाइल नंबर दर्ज करें');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setOtpSent(true); setLoading(false);
    Alert.alert(isEn ? 'OTP Sent! 📱' : 'OTP भेजा! 📱', isEn ? `OTP sent to +91-${mobile}\n\nDemo mode: Enter 123456` : `+91-${mobile} पर OTP भेजा\n\nDemo mode: 123456 दर्ज करें`);
  };

  const verifyOTP = () => {
    if (otp === '123456' || otp.length === 6) { go(5); }
    else { Alert.alert(isEn ? 'Wrong OTP' : 'गलत OTP', isEn ? 'Enter correct OTP' : 'सही OTP दर्ज करें'); }
  };

  const complete = async () => {
    if (!dobDay || !dobMonth || !dobYear) {
      Alert.alert(isEn ? 'Required' : 'ज़रूरी', isEn ? 'Enter your date of birth' : 'जन्मतिथि दर्ज करें'); return;
    }
    if (!birthCity.trim()) {
      Alert.alert(isEn ? 'Required' : 'ज़रूरी', isEn ? 'Enter your birth city' : 'जन्म का शहर दर्ज करें'); return;
    }
    if (knowsTime && exactTime && !exactTime.match(/^\d{1,2}:\d{2}$/)) {
      Alert.alert(isEn ? 'Invalid time' : 'गलत समय', isEn ? 'Enter time as HH:MM (e.g. 14:30)' : 'HH:MM format में दर्ज करें (जैसे 14:30)'); return;
    }
    setLoading(true);
    const kundli = calculateKundli(dobDay, dobMonth, dobYear, knowsTime ? exactTime : '', birthSlot);
    const rashi = kundli.rashi;
    const nak = kundli.nakshatra;
    const userData = {
      name: name.trim() || (isEn ? 'Dharma Rakshak' : 'धर्म रक्षक'),
      mobile, role, language: lang,
      dob: `${dobDay}/${dobMonth}/${dobYear}`,
      birthTime: knowsTime ? exactTime : birthSlot,
      birthTimeType: knowsTime ? 'exact' : 'slot',
      birthCity: birthCity.trim(),
      rashi: rashi.name, rashiEnglish: rashi.english,
      nakshatra: nak.name,
      nakshatraPada: `${nak.name} - Pada ${kundli.pada}`,
      planet: rashi.planet, deity: rashi.deity,
      mantra: rashi.mantra,
      greeting: isEn ? rashi.greetingEn : rashi.greetingHi,
      luckyColor: isEn ? rashi.colorEn : rashi.colorHi,
      luckyDay: isEn ? rashi.dayEn : rashi.dayHi,
      luckyGem: isEn ? rashi.gemEn : rashi.gemHi,
      element: rashi.element,
      moonLon: kundli.moonLongitude,
      exactTimeUsed: kundli.exactTimeUsed,
      joinedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem('dharmasetu_user', JSON.stringify(userData));
    await AsyncStorage.setItem('dharmasetu_pts', '10');
    await AsyncStorage.setItem('dharmasetu_streak_count', '0');
    setResult(userData);
    setLoading(false);
    go(8);
  };

  // ── HH:MM auto-format handler ──────────────────────────
  const handleTimeInput = (v) => {
    // Remove anything that's not a digit
    const digits = v.replace(/\D/g, '');
    if (digits.length === 0) {
      setExactTime('');
    } else if (digits.length <= 2) {
      setExactTime(digits);
    } else {
      // Auto insert colon: "1430" → "14:30"
      const hh = digits.slice(0, 2);
      const mm = digits.slice(2, 4);
      setExactTime(`${hh}:${mm}`);
    }
  };

  const renderStep = () => {
    switch (step) {

      case 0: return (
        <View style={s.sw}>
          <Animated.View style={[s.omWrap, { transform: [{ scale: omPulse }] }]}>
            <View style={s.omBox}><Text style={{ fontSize: 40 }}>🕉</Text></View>
          </Animated.View>
          <Text style={s.brand}>DharmaSetu</Text>
          <Text style={s.brandHindi}>धर्मसेतु — सत्य का सेतु</Text>
          <Text style={s.brandSub}>{isEn ? 'Complete Sanatan Dharma guidance.\nAccurate Vedic Kundli. Your path.' : 'सनातन धर्म का सम्पूर्ण मार्गदर्शन।\nसटीक वैदिक कुंडली। आपका मार्ग।'}</Text>
          <TouchableOpacity style={s.btn} onPress={() => go(1)} activeOpacity={0.88}>
            <Text style={s.btnTxt}>{isEn ? 'Begin Your Journey →' : 'अपनी यात्रा शुरू करें →'}</Text>
          </TouchableOpacity>
        </View>
      );

      case 1: return (
        <View style={s.sw}>
          <Text style={s.stepTitle}>{isEn ? 'Choose Your Role' : 'अपनी भूमिका चुनें'}</Text>
          {ROLES.map(r => (
            <TouchableOpacity key={r.id} style={[s.optCard, role === r.id && s.optCardOn]} onPress={() => setRole(r.id)} activeOpacity={0.85}>
              <View style={[s.optIcon, role === r.id && s.optIconOn]}><Text style={{ fontSize: 20 }}>{r.emoji}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={[s.optTitle, role === r.id && s.optTitleOn]}>{isEn ? r.en : r.hi}</Text>
                <Text style={s.optSub}>{isEn ? r.subEn : r.subHi}</Text>
              </View>
              <View style={[s.radio, role === r.id && s.radioOn]}>{role === r.id && <View style={s.radioFill} />}</View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={s.btn} onPress={() => go(2)} activeOpacity={0.88}>
            <Text style={s.btnTxt}>{isEn ? 'Next →' : 'आगे →'}</Text>
          </TouchableOpacity>
        </View>
      );

      case 2: return (
        <View style={s.sw}>
          <Text style={s.stepTitle}>{isEn ? 'Choose Language' : 'भाषा चुनें'}</Text>
          <Text style={s.stepSub}>{isEn ? 'App will be fully shown in selected language' : 'App पूरी तरह इसी भाषा में दिखेगा'}</Text>
          <View style={s.langGrid}>
            {LANGUAGES.map(l => (
              <TouchableOpacity key={l.id} style={[s.langCard, lang === l.id && s.langCardOn]} onPress={() => setLang(l.id)} activeOpacity={0.85}>
                <Text style={[s.langTxt, lang === l.id && s.langTxtOn]}>{l.label}</Text>
                {lang === l.id && <Text style={{ fontSize: 11, color: '#E8620A', fontWeight: '700' }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.btn} onPress={() => go(3)} activeOpacity={0.88}>
            <Text style={s.btnTxt}>{isEn ? 'Next →' : 'आगे →'}</Text>
          </TouchableOpacity>
        </View>
      );

      case 3: return (
        <View style={s.sw}>
          <Text style={s.stepTitle}>{isEn ? 'Your Details' : 'आपकी जानकारी'}</Text>
          <Text style={s.fieldLabel}>{isEn ? 'Full Name' : 'पूरा नाम'}</Text>
          <TextInput style={s.inp} placeholder={isEn ? 'e.g. Ankit Soni' : 'जैसे: अंकित सोनी'} placeholderTextColor="rgba(253,246,237,0.3)" value={name} onChangeText={setName} maxLength={50} />
          <Text style={s.fieldLabel}>{isEn ? 'Mobile Number' : 'मोबाइल नंबर'}</Text>
          <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
            <View style={[s.inp, { paddingHorizontal: 12, justifyContent: 'center', width: 56 }]}>
              <Text style={{ color: '#F4A261', fontWeight: '700', fontSize: 14 }}>+91</Text>
            </View>
            <TextInput style={[s.inp, { flex: 1, marginBottom: 0 }]} placeholder={isEn ? '10-digit number' : '10-अंकीय नंबर'} placeholderTextColor="rgba(253,246,237,0.3)" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" maxLength={10} />
          </View>
          {!otpSent ? (
            <TouchableOpacity style={s.btn} onPress={sendOTP} disabled={loading} activeOpacity={0.88}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>{isEn ? 'Send OTP →' : 'OTP भेजें →'}</Text>}
            </TouchableOpacity>
          ) : (
            <>
              <Text style={s.fieldLabel}>{isEn ? 'Enter OTP' : 'OTP दर्ज करें'}</Text>
              <TextInput style={s.inp} placeholder={isEn ? '6-digit OTP' : '6-अंकीय OTP'} placeholderTextColor="rgba(253,246,237,0.3)" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} />
              <TouchableOpacity style={s.btn} onPress={verifyOTP} activeOpacity={0.88}>
                <Text style={s.btnTxt}>{isEn ? 'Verify →' : 'Verify करें →'}</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={{ marginTop: 14, paddingVertical: 8, alignItems: 'center' }} onPress={() => go(5)}>
            <Text style={{ color: 'rgba(253,246,237,0.25)', fontSize: 12 }}>{isEn ? 'Skip for now →' : 'अभी skip करें →'}</Text>
          </TouchableOpacity>
        </View>
      );

      case 5: return (
        <View style={s.sw}>
          <Text style={s.stepTitle}>{isEn ? 'Date of Birth' : 'जन्मतिथि'}</Text>
          <Text style={s.stepSub}>{isEn ? 'Required for accurate Vedic Kundli calculation' : 'सटीक वैदिक कुंडली गणना के लिए आवश्यक'}</Text>
          <Text style={s.fieldLabel}>{isEn ? 'Birth Date (DD / MM / YYYY)' : 'जन्म दिनांक (DD / MM / YYYY)'}</Text>
          <View style={{ flexDirection: 'row', width: '100%', gap: 8, alignItems: 'center' }}>
            <TextInput style={[s.inp, { flex: 1, textAlign: 'center', marginBottom: 0 }]} placeholder="DD" placeholderTextColor="rgba(253,246,237,0.3)" value={dobDay} onChangeText={setDobDay} keyboardType="number-pad" maxLength={2} />
            <Text style={{ color: 'rgba(253,246,237,0.3)', fontSize: 20 }}>/</Text>
            <TextInput style={[s.inp, { flex: 1, textAlign: 'center', marginBottom: 0 }]} placeholder="MM" placeholderTextColor="rgba(253,246,237,0.3)" value={dobMonth} onChangeText={setDobMonth} keyboardType="number-pad" maxLength={2} />
            <Text style={{ color: 'rgba(253,246,237,0.3)', fontSize: 20 }}>/</Text>
            <TextInput style={[s.inp, { flex: 2, textAlign: 'center', marginBottom: 0 }]} placeholder="YYYY" placeholderTextColor="rgba(253,246,237,0.3)" value={dobYear} onChangeText={setDobYear} keyboardType="number-pad" maxLength={4} />
          </View>
          <TouchableOpacity style={[s.btn, { marginTop: 20 }]} onPress={() => go(6)} activeOpacity={0.88}>
            <Text style={s.btnTxt}>{isEn ? 'Next →' : 'आगे →'}</Text>
          </TouchableOpacity>
        </View>
      );

      case 6: return (
        <View style={s.sw}>
          <Text style={s.stepTitle}>{isEn ? 'Birth Time' : 'जन्म समय'}</Text>
          <View style={s.toggleRow}>
            <Text style={s.toggleLabel}>{isEn ? 'I know my exact birth time' : 'मुझे सटीक जन्म समय पता है'}</Text>
            <Switch value={knowsTime} onValueChange={setKnowsTime} trackColor={{ false: 'rgba(200,130,40,0.2)', true: 'rgba(232,98,10,0.5)' }} thumbColor={knowsTime ? '#E8620A' : '#666'} />
          </View>
          {knowsTime ? (
            <>
              <Text style={s.stepSub}>{isEn ? 'Type digits — colon inserts automatically\nExample: type 1430 → shows 14:30' : 'अंक टाइप करें — colon अपने आप आएगा\nउदाहरण: 1430 टाइप करें → 14:30 दिखेगा'}</Text>
              <Text style={s.fieldLabel}>{isEn ? 'Time (HH:MM) — 24 hour format' : 'समय (HH:MM) — 24 घंटे format'}</Text>
              <TextInput
                style={[s.inp, { textAlign: 'center', fontSize: 26, letterSpacing: 6, fontWeight: '700' }]}
                placeholder="HH:MM"
                placeholderTextColor="rgba(253,246,237,0.25)"
                value={exactTime}
                onChangeText={handleTimeInput}
                keyboardType="number-pad"
                maxLength={5}
              />
              <Text style={{ fontSize: 11, color: '#27AE60', textAlign: 'center', marginTop: 6 }}>
                {isEn ? '⭐ Exact time gives highly accurate Kundli' : '⭐ सटीक समय से अधिक सटीक कुंडली मिलती है'}
              </Text>
            </>
          ) : (
            <>
              <Text style={s.stepSub}>{isEn ? 'Select approximate birth time' : 'अनुमानित जन्म समय चुनें'}</Text>
              {TIME_SLOTS.map(tm => (
                <TouchableOpacity key={tm.id} style={[s.optCard, birthSlot === tm.id && s.optCardOn]} onPress={() => setBirthSlot(tm.id)} activeOpacity={0.85}>
                  <Text style={[s.optTitle, birthSlot === tm.id && s.optTitleOn, { flex: 1 }]}>{isEn ? tm.en : tm.hi}</Text>
                  <View style={[s.radio, birthSlot === tm.id && s.radioOn]}>{birthSlot === tm.id && <View style={s.radioFill} />}</View>
                </TouchableOpacity>
              ))}
            </>
          )}
          <TouchableOpacity style={[s.btn, { marginTop: 16 }]} onPress={() => go(7)} activeOpacity={0.88}>
            <Text style={s.btnTxt}>{isEn ? 'Next →' : 'आगे →'}</Text>
          </TouchableOpacity>
        </View>
      );

      case 7: return (
        <View style={s.sw}>
          <Text style={s.stepTitle}>{isEn ? 'Birth City' : 'जन्म स्थान'}</Text>
          <Text style={s.stepSub}>{isEn ? 'City where you were born' : 'जहाँ आप पैदा हुए'}</Text>
          <Text style={s.fieldLabel}>{isEn ? 'City Name' : 'शहर का नाम'}</Text>
          <TextInput style={s.inp} placeholder={isEn ? 'e.g. Indore, MP' : 'जैसे: इंदौर, मध्य प्रदेश'} placeholderTextColor="rgba(253,246,237,0.3)" value={birthCity} onChangeText={setBirthCity} maxLength={100} />
          <TouchableOpacity style={s.btn} onPress={complete} disabled={loading} activeOpacity={0.88}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>{isEn ? '🕉 Calculate My Kundli →' : '🕉 मेरी कुंडली बनाएं →'}</Text>}
          </TouchableOpacity>
        </View>
      );

      case 8: {
        if (!result) return null;
        const r = RASHIS_DATA.find(x => x.name === result.rashi) || RASHIS_DATA[0];
        const rows = isEn ? [
          { k: 'Moon Sign (Chandra Rashi)', v: r.name + ' — ' + r.english },
          { k: 'Birth Star (Nakshatra)', v: result.nakshatraPada },
          { k: 'Ruling Planet', v: r.planet },
          { k: 'Your Deity (Ishta Dev)', v: r.deity },
          { k: 'Personal Mantra', v: r.mantra },
          { k: 'Lucky Color', v: r.colorEn },
          { k: 'Lucky Day', v: r.dayEn },
          { k: 'Lucky Gemstone', v: r.gemEn },
          { k: 'Element', v: r.element },
        ] : [
          { k: 'चंद्र राशि', v: r.name + ' — ' + r.english },
          { k: 'नक्षत्र', v: result.nakshatraPada },
          { k: 'स्वामी ग्रह', v: r.planet },
          { k: 'इष्ट देव', v: r.deity },
          { k: 'व्यक्तिगत मंत्र', v: r.mantra },
          { k: 'शुभ रंग', v: r.colorHi },
          { k: 'शुभ दिन', v: r.dayHi },
          { k: 'रत्न', v: r.gemHi },
          { k: 'तत्व', v: r.element },
        ];
        return (
          <View style={s.sw}>
            <Text style={{ fontSize: 50, marginBottom: 12 }}>🎉</Text>
            <Text style={[s.brand, { fontSize: 22 }]}>{isEn ? `Welcome, ${result.name}!` : `स्वागत है, ${result.name}!`}</Text>
            <Text style={{ fontSize: 13, color: '#C9830A', marginBottom: 6 }}>{isEn ? 'Your Vedic Kundli is ready' : 'आपकी वैदिक कुंडली तैयार है'}</Text>
            {result.exactTimeUsed && <Text style={{ fontSize: 11, color: '#27AE60', marginBottom: 12 }}>⭐ {isEn ? 'Calculated with exact birth time — high accuracy' : 'सटीक जन्म समय से गणना — उच्च सटीकता'}</Text>}
            <View style={s.kundliCard}>
              {rows.map(r2 => (
                <View key={r2.k} style={s.kundliRow}>
                  <Text style={s.kundliKey}>{r2.k}</Text>
                  <Text style={s.kundliVal}>{r2.v}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={s.btn} onPress={() => router.replace('/(tabs)')} activeOpacity={0.88}>
              <Text style={s.btnTxt}>{isEn ? `${r.greetingEn} — Enter App 🕉` : `${r.greetingHi} — App में प्रवेश करें 🕉`}</Text>
            </TouchableOpacity>
          </View>
        );
      }

      default: return null;
    }
  };

  const PROG_STEPS = [0, 1, 2, 3, 5, 6, 7];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#0A0400" translucent={false} />

      {[...Array(10)].map((_, i) => (
        <View key={i} style={[s.particle, {
          top: (SH * ((i * 173 + 50) % 100)) / 100,
          left: (SW * ((i * 137 + 30) % 100)) / 100,
          width: 1.5 + (i % 3), height: 1.5 + (i % 3), opacity: 0.07 + (i % 5) * 0.04,
        }]} />
      ))}

      {step < 8 && (
        <View style={s.dots}>
          {PROG_STEPS.map((_, i) => (
            <View key={i} style={[s.dot, step > i || (step === i) ? s.dotOn : {}]} />
          ))}
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {step < 8 && (
              <Text style={s.stepNum}>
                0{PROG_STEPS.indexOf(step) + 1} — {['Welcome', 'Role', 'Language', 'Profile', 'OTP', 'Birth Date', 'Birth Time', 'Birth City'][step] || ''}
              </Text>
            )}
            {renderStep()}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0400' },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20, paddingHorizontal: 16 },
  particle: { position: 'absolute', borderRadius: 50, backgroundColor: '#E8620A' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)' },
  dotOn: { backgroundColor: '#E8620A', width: 18 },
  card: { width: '100%', maxWidth: 420, alignItems: 'center', paddingVertical: 10 },
  stepNum: { fontSize: 10, color: 'rgba(253,246,237,0.25)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 },
  sw: { width: '100%', alignItems: 'center' },
  stepTitle: { fontSize: 22, fontWeight: '800', color: '#FDF6ED', marginBottom: 4, textAlign: 'center' },
  stepSub: { fontSize: 13, color: 'rgba(253,246,237,0.4)', marginBottom: 18, textAlign: 'center', lineHeight: 20 },
  omWrap: { marginBottom: 18 },
  omBox: { width: 80, height: 80, borderRadius: 22, backgroundColor: '#6B21A8', alignItems: 'center', justifyContent: 'center', shadowColor: '#6B21A8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 10 },
  brand: { fontSize: 30, fontWeight: '800', color: '#E8620A', marginBottom: 4, textAlign: 'center' },
  brandHindi: { fontSize: 15, color: '#C9830A', marginBottom: 8 },
  brandSub: { fontSize: 13, color: 'rgba(253,246,237,0.4)', marginBottom: 28, textAlign: 'center', lineHeight: 20 },
  optCard: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#160800', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: 'rgba(200,130,40,0.12)' },
  optCardOn: { borderColor: '#E8620A', backgroundColor: '#1E0A00' },
  optIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  optIconOn: { backgroundColor: 'rgba(232,98,10,0.14)' },
  optTitle: { fontSize: 14, fontWeight: '600', color: 'rgba(253,246,237,0.55)', marginBottom: 2 },
  optTitleOn: { color: '#FDF6ED' },
  optSub: { fontSize: 11, color: 'rgba(253,246,237,0.3)' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(200,130,40,0.3)', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: '#E8620A' },
  radioFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E8620A' },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%', marginBottom: 20 },
  langCard: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(200,130,40,0.15)', flexDirection: 'row', alignItems: 'center', gap: 5 },
  langCardOn: { borderColor: '#E8620A', backgroundColor: 'rgba(232,98,10,0.12)' },
  langTxt: { fontSize: 13, color: 'rgba(253,246,237,0.45)', fontWeight: '500' },
  langTxtOn: { color: '#F4A261' },
  fieldLabel: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '600', color: 'rgba(253,246,237,0.4)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 12 },
  inp: { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, color: '#FDF6ED', fontSize: 15, borderWidth: 1.5, borderColor: 'rgba(200,130,40,0.18)', marginBottom: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', backgroundColor: '#160800', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(200,130,40,0.18)' },
  toggleLabel: { fontSize: 13, color: '#FDF6ED', flex: 1 },
  btn: { width: '100%', backgroundColor: '#C45508', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 20, elevation: 5, shadowColor: '#E8620A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6 },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  kundliCard: { width: '100%', backgroundColor: '#160800', borderRadius: 18, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(240,165,0,0.2)' },
  kundliRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.07)' },
  kundliKey: { fontSize: 12, color: 'rgba(253,246,237,0.4)', fontWeight: '600', flex: 1 },
  kundliVal: { fontSize: 13, color: '#F4A261', fontWeight: '700', textAlign: 'right', flex: 1.5 },
});