// ════════════════════════════════════════════════════════════════
// DharmaSetu — Home Screen FIXED v5
//
// FIXES APPLIED:
//  1. isMountedRef — all async callbacks check before setState (memory leak fix)
//  2. AI Insight: 10s timeout (was 45s), loading UI, fallback response on failure
//  3. AI Insight: aiTimeoutRef properly cleaned on unmount
//  4. AI Insight: fetchAIInsight is stable — no re-creation on every render
//  5. Japa Counter reset: setCount(0) now also persists to AsyncStorage
//  6. Japa Counter target change: persists reset to AsyncStorage
//  7. Panchang: lang prop passed correctly to all consumers
//  8. PanchangCard: cancelled flag prevents setState after unmount
//  9. loadUser: no setState after unmount (isMountedRef guard)
// 10. fetchAIInsight: wrapped in useCallback, aiTimeoutRef cleared in cleanup
// 11. Race condition fix: only ONE fetchAIInsight fires at a time (fetchingRef lock)
// ════════════════════════════════════════════════════════════════
import React from 'react';
import * as Location from 'expo-location';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TextInput } from 'react-native';
import {
  Alert, Animated, ScrollView, Share, StyleSheet,
  Text, TouchableOpacity, Vibration, View, ActivityIndicator,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  FESTIVALS_2025_2026,
  EKADASHI_2025_2026,
} from '../hinduCalendar';

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://dharmasetu-backend-2c65.onrender.com/api/panchang/today';

// ── DAILY SHLOKS (30 hardcoded) ──────────────────────────────────
const DAILY_SHLOKS = [
  { id: 0,  ref: 'Bhagavad Gita 2.47',   san: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥', hi: 'तुम्हारा अधिकार केवल कर्म करने में है, उसके फल में नहीं।', en: 'You have a right to perform your duty, never to its fruits.' },
  { id: 1,  ref: 'Bhagavad Gita 2.20',   san: 'न जायते म्रियते वा कदाचिन् नायं भूत्वा भविता वा न भूयः।', hi: 'आत्मा न कभी जन्म लेती है और न मरती है।', en: 'The soul is never born nor dies at any time.' },
  { id: 2,  ref: 'Bhagavad Gita 6.5',    san: 'उद्धरेदात्मनात्मानं नात्मानमवसादयेत्।', hi: 'अपने आप को खुद उठाओ, अपने आप को नीचे मत गिराओ।', en: 'Elevate yourself through the power of your own mind.' },
  { id: 3,  ref: 'Bhagavad Gita 9.22',   san: 'अनन्याश्चिन्तयन्तो मां ये जनाः पर्युपासते।', hi: 'जो लोग अनन्य भाव से मेरी उपासना करते हैं, मैं उनका योगक्षेम वहन करता हूँ।', en: 'Those who worship me with devotion — I carry what they lack and preserve what they have.' },
  { id: 4,  ref: 'Bhagavad Gita 4.7',    san: 'यदा यदा हि धर्मस्य ग्लानिर्भवति भारत।', hi: 'जब-जब धर्म की हानि होती है, मैं अवतार लेता हूँ।', en: 'Whenever dharma declines, I manifest myself.' },
  { id: 5,  ref: 'Bhagavad Gita 18.66',  san: 'सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज।', hi: 'सब धर्मों को छोड़कर केवल मेरी शरण में आओ।', en: 'Abandon all duties and surrender unto me alone.' },
  { id: 6,  ref: 'Bhagavad Gita 3.27',   san: 'प्रकृतेः क्रियमाणानि गुणैः कर्माणि सर्वशः।', hi: 'सब कार्य प्रकृति के गुणों द्वारा होते हैं, अहंकारी आत्मा खुद को कर्ता मानता है।', en: 'All actions are performed by the qualities of nature; the self-deluded soul thinks itself the doer.' },
  { id: 7,  ref: 'Bhagavad Gita 2.14',   san: 'मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः।', hi: 'सुख-दुख तो इन्द्रियों के विषयों का स्पर्श है, ये आते-जाते रहते हैं।', en: 'Contact with matter gives rise to heat and cold, pleasure and pain. Endure them.' },
  { id: 8,  ref: 'Isha Upanishad 1',      san: 'ईशावास्यमिदँ सर्वं यत्किञ्च जगत्यां जगत्।', hi: 'यह सम्पूर्ण जगत् ईश्वर से व्याप्त है।', en: 'All this — whatever exists in this universe — is pervaded by the Lord.' },
  { id: 9,  ref: 'Katha Upanishad 1.2.19',san: 'अयं आत्मा ब्रह्म।', hi: 'यह आत्मा ही ब्रह्म है।', en: 'This self is Brahman.' },
  { id: 10, ref: 'Bhagavad Gita 13.28',   san: 'समं पश्यन् हि सर्वत्र समवस्थितमीश्वरम्।', hi: 'जो सभी में परमेश्वर को समान रूप से देखता है, वही वास्तव में देखता है।', en: 'One who sees the Supreme everywhere, in every being, truly sees.' },
  { id: 11, ref: 'Bhagavad Gita 12.13',   san: 'अद्वेष्टा सर्वभूतानां मैत्रः करुण एव च।', hi: 'जो सभी प्राणियों से द्वेष नहीं रखता, सबका मित्र है — वह मुझे प्रिय है।', en: 'One who has no hatred toward any being, who is friendly — such a devotee is dear to me.' },
  { id: 12, ref: 'Bhagavad Gita 2.63',    san: 'क्रोधाद्भवति संमोहः संमोहात्स्मृतिविभ्रमः।', hi: 'क्रोध से मोह, मोह से स्मृतिभ्रंश, स्मृतिभ्रंश से बुद्धिनाश होता है।', en: 'From anger comes delusion, from delusion loss of memory, then destruction of intelligence.' },
  { id: 13, ref: 'Bhagavad Gita 5.22',    san: 'ये हि संस्पर्शजा भोगा दुःखयोनय एव ते।', hi: 'जो भोग इन्द्रियों के संपर्क से उत्पन्न होते हैं वे दुख के कारण हैं।', en: 'Pleasures born of sense contact are sources of suffering.' },
  { id: 14, ref: 'Bhagavad Gita 11.33',   san: 'तस्मात्त्वमुत्तिष्ठ यशो लभस्व।', hi: 'इसलिए उठो, और यश प्राप्त करो।', en: 'Therefore arise, and attain glory.' },
  { id: 15, ref: 'Mandukya Upanishad 2',   san: 'सर्वं ह्येतद् ब्रह्म।', hi: 'यह सब कुछ ब्रह्म है।', en: 'All this is indeed Brahman.' },
  { id: 16, ref: 'Bhagavad Gita 7.19',     san: 'बहूनां जन्मनामन्ते ज्ञानवान्मां प्रपद्यते।', hi: 'अनेक जन्मों के बाद ज्ञानी पुरुष मुझे प्राप्त करता है।', en: 'After many births, the man of wisdom takes refuge in me.' },
  { id: 17, ref: 'Bhagavad Gita 3.35',     san: 'श्रेयान्स्वधर्मो विगुणः परधर्मात्स्वनुष्ठितात्।', hi: 'दूसरे के धर्म का अच्छी तरह पालन करने से अपना अपूर्ण धर्म श्रेष्ठ है।', en: "Better is one's own dharma, even if imperfect, than the dharma of another well performed." },
  { id: 18, ref: 'Bhagavad Gita 4.38',     san: 'न हि ज्ञानेन सदृशं पवित्रमिह विद्यते।', hi: 'इस संसार में ज्ञान के समान पवित्र करने वाला कोई नहीं है।', en: 'Nothing in this world purifies like spiritual knowledge.' },
  { id: 19, ref: 'Taittiriya Upanishad',    san: 'सत्यं वद। धर्मं चर।', hi: 'सत्य बोलो। धर्म का आचरण करो।', en: 'Speak truth. Practice righteousness.' },
  { id: 20, ref: 'Bhagavad Gita 16.1-3',   san: 'अभयं सत्त्वसंशुद्धिर् ज्ञानयोगव्यवस्थितिः।', hi: 'निर्भयता, अंतःकरण की पवित्रता, ज्ञान में दृढ़ता — ये दैवी गुण हैं।', en: 'Fearlessness, purity of heart, steadfastness in knowledge — these are divine qualities.' },
  { id: 21, ref: 'Bhagavad Gita 2.22',     san: 'वासांसि जीर्णानि यथा विहाय।', hi: 'जैसे मनुष्य पुराने वस्त्र उतारकर नए पहनता है, वैसे ही आत्मा शरीर बदलती है।', en: 'As a person discards worn-out garments and puts on others that are new, the soul discards the worn-out body.' },
  { id: 22, ref: 'Mundaka Upanishad 3.1.6', san: 'नायमात्मा बलहीनेन लभ्यः।', hi: 'यह आत्मा कमज़ोर द्वारा प्राप्त नहीं की जा सकती।', en: 'This self cannot be attained by the weak.' },
  { id: 23, ref: 'Bhagavad Gita 6.19',     san: 'यथा दीपो निवातस्थो नेङ्गते सोपमा स्मृता।', hi: 'जैसे वायु रहित स्थान में दीपक नहीं कांपता, वैसे योगी का मन स्थिर रहता है।', en: 'As a lamp in a windless place does not flicker — so is the disciplined mind of a yogi.' },
  { id: 24, ref: 'Bhagavad Gita 8.7',      san: 'तस्मात्सर्वेषु कालेषु मामनुस्मर युध्य च।', hi: 'इसलिए हर समय मेरा स्मरण करो और युद्ध करो।', en: 'Therefore remember me at all times and fight.' },
  { id: 25, ref: 'Kena Upanishad 1.3',     san: 'न तत्र चक्षुर्गच्छति न वाग्गच्छति।', hi: 'वहाँ न आँख जाती है, न वाणी — वह ब्रह्म है।', en: 'That which eye does not see, nor speech reaches — that is Brahman.' },
  { id: 26, ref: 'Bhagavad Gita 10.8',     san: 'अहं सर्वस्य प्रभवो मत्तः सर्वं प्रवर्तते।', hi: 'मैं सबका उद्गम हूँ, सब मुझसे ही प्रवृत्त होते हैं।', en: 'I am the origin of all. Everything proceeds from me.' },
  { id: 27, ref: 'Bhagavad Gita 4.11',     san: 'ये यथा मां प्रपद्यन्ते तांस्तथैव भजाम्यहम्।', hi: 'जो जिस प्रकार मुझे भजते हैं, मैं भी उन्हें उसी प्रकार फल देता हूँ।', en: 'As men approach me, so I reward them. My path men follow in all ways.' },
  { id: 28, ref: 'Bhagavad Gita 18.65',    san: 'मन्मना भव मद्भक्तो मद्याजी मां नमस्कुरु।', hi: 'मुझमें मन लगाओ, मेरे भक्त बनो, मुझे नमस्कार करो।', en: 'Fix your mind on me, be devoted to me, worship me, bow down to me.' },
  { id: 29, ref: 'Rig Veda 1.89.1',        san: 'आ नो भद्राः क्रतवो यन्तु विश्वतः।', hi: 'चारों ओर से हमारे पास शुभ विचार आएँ।', en: 'Let noble thoughts come to us from all directions.' },
];

// ── QUICK ACTIONS CONFIG ─────────────────────────────────────────
const QUICK_ACTIONS = [
  { id: 'chat',     emoji: '💬', hi: 'DharmaChat',    en: 'DharmaChat',    route: '/(tabs)/explore',    color: '#E8620A' },
  { id: 'katha',    emoji: '📖', hi: 'कथा वॉल्ट',   en: 'Katha Vault',   route: '/katha_vault',       color: '#C9830A' },
  { id: 'payment',  emoji: '⭐', hi: 'Premium',       en: 'Premium',       route: '/payment',           color: '#27AE60' },
  { id: 'kundli',   emoji: '🔯', hi: 'कुंडली',       en: 'Kundli',        route: '/kundli',            color: '#6B21A8' },
  { id: 'mantra',   emoji: '📿', hi: 'मंत्र',         en: 'Mantras',       route: '/mantra_library',    color: '#3498DB' },
  { id: 'factcheck',emoji: '🛡️',hi: 'Fact Check',   en: 'Fact Check',    action: 'factcheck',         color: '#9B59B6' },
];

// ── MOODS ────────────────────────────────────────────────────────
const MOODS = [
  { key: 'anxiety',        emoji: '😰', hiLabel: 'चिंता',         enLabel: 'Anxiety',        color: '#6B21A8',
    mantra: 'ॐ नमः शिवाय', shlok: 'नैनं छिद्रन्ति शस्त्राणि नैनं दहति पावकः।', shlokEn: 'BG 2.23 — The soul cannot be harmed. You are safe.',
    breathHi: '4-7-8: श्वास लें 4 सेकंड, रोकें 7, छोड़ें 8', breathEn: '4-7-8: Inhale 4s, Hold 7s, Exhale 8s',
    actHi: 'शिव चालीसा पढ़ें। पास के मंदिर जाएं।', actEn: 'Read Shiv Chalisa. Visit nearest mandir.' },
  { key: 'anger',          emoji: '😠', hiLabel: 'क्रोध',         enLabel: 'Anger',          color: '#E74C3C',
    mantra: 'ॐ शांतिः शांतिः शांतिः', shlok: 'क्रोधाद्भवति संमोहः। — BG 2.63', shlokEn: 'Anger leads to delusion, then destruction of intelligence.',
    breathHi: 'नाक से 6 सेकंड श्वास लें, 2 रोकें, मुँह से 6 में छोड़ें', breathEn: 'Inhale nose 6s, Hold 2s, Exhale mouth 6s',
    actHi: 'ठंडा पानी पिएं। 108 बार ओम जपें।', actEn: 'Drink cold water. Chant Om 108 times.' },
  { key: 'sadness',        emoji: '😢', hiLabel: 'उदासी',         enLabel: 'Sadness',        color: '#3498DB',
    mantra: 'हरे कृष्ण हरे कृष्ण, कृष्ण कृष्ण हरे हरे', shlok: 'वासांसि जीर्णानि यथा विहाय — BG 2.22', shlokEn: 'All endings are new beginnings. The soul is eternal.',
    breathHi: '5-5-5 श्वास: समान लय में श्वास लें, रोकें, छोड़ें', breathEn: 'Box breathing 5-5-5: equal rhythm soothes the heart',
    actHi: 'सुंदर काण्ड पढ़ें। हनुमान की शक्ति लें।', actEn: 'Read Sundara Kanda. Draw strength from Hanuman.' },
  { key: 'low_confidence', emoji: '😟', hiLabel: 'आत्मविश्वास',  enLabel: 'Low Confidence', color: '#E8620A',
    mantra: 'ॐ नमो हनुमते रुद्रावताराय', shlok: 'उद्धरेदात्मनात्मानं — BG 6.5', shlokEn: 'Elevate yourself through the power of your own mind.',
    breathHi: '4-0-4 शक्ति श्वास: गहरा लें, सीधे छोड़ें', breathEn: '4-0-4 Power breath: Deep inhale, direct exhale',
    actHi: 'सूर्य नमस्कार 12 बार करें। हनुमान चालीसा पढ़ें।', actEn: 'Do 12 Surya Namaskars. Read Hanuman Chalisa.' },
  { key: 'gratitude',      emoji: '🙏', hiLabel: 'कृतज्ञता',     enLabel: 'Gratitude',      color: '#27AE60',
    mantra: 'ॐ श्रीं महालक्ष्म्यै नमः', shlok: 'सर्वे भवन्तु सुखिनः। सर्वे सन्तु निरामयाः।', shlokEn: 'May all beings be happy. May all be free from suffering.',
    breathHi: 'श्वास लेते हुए "धन्यवाद" मन में कहें', breathEn: 'Say "thank you" in mind as you inhale',
    actHi: 'आज किसी को कुछ दें। दान से लक्ष्मी आती हैं।', actEn: 'Give something today. Lakshmi flows through generosity.' },
  { key: 'focus',          emoji: '🎯', hiLabel: 'एकाग्रता',     enLabel: 'Need Focus',     color: '#C9830A',
    mantra: 'ॐ ऐं सरस्वत्यै नमः', shlok: 'कर्मण्येवाधिकारस्ते — BG 2.47', shlokEn: 'Focus on action, not result. This is peak performance.',
    breathHi: 'भ्रामरी: कान बंद करें, गुनगुनाएं 5 बार', breathEn: 'Bhramari: Close ears with thumbs, hum deeply 5 times',
    actHi: '20 मिनट का timer। बस एक काम।', actEn: 'Set 20-min timer. One task only.' },
];

const JAPA_MANTRAS = [
  { m: 'ॐ नमः शिवाय',              short: 'Shiva',  color: '#6B21A8' },
  { m: 'ॐ नमो भगवते वासुदेवाय',    short: 'Vishnu', color: '#3498DB' },
  { m: 'ॐ श्री राम जय राम जय जय राम', short: 'Ram', color: '#E8620A' },
  { m: 'ॐ गं गणपतये नमः',          short: 'Ganesh', color: '#F39C12' },
  { m: 'हरे कृष्ण हरे राम',         short: 'Krishna',color: '#27AE60' },
];

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════

// ── LOCAL FALLBACK (used when API is offline) ─────────────────
function getLocalFallback() {
  const d = new Date();
  const day = d.getDay();
  const VAAR_HI   = ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'];
  const VAAR_EN   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const DEITIES   = ['Surya Dev','Shiva Ji','Hanuman Ji','Ganesh Ji','Vishnu Ji','Lakshmi Mata','Shani Dev'];
  const MANTRAS   = ['ॐ घृणि सूर्याय नमः','ॐ नमः शिवाय','ॐ नमो हनुमते रुद्रावताराय',
    'ॐ गं गणपतये नमः','ॐ नमो भगवते वासुदेवाय','ॐ श्रीं महालक्ष्म्यै नमः','ॐ शं शनैश्चराय नमः'];
  const TITHIS    = ['Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami','Shashthi','Saptami',
    'Ashtami','Navami','Dashami','Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Purnima'];
  const NAKS      = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu',
    'Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati'];
  const doy = Math.floor((d - new Date(d.getFullYear(),0,0)) / 86400000);
  const yr  = d.getMonth() >= 3 ? d.getFullYear() + 57 : d.getFullYear() + 56;
  return {
    tithi: TITHIS[doy % 15], nakshatra: NAKS[doy % 15], yoga: 'Shubha', karana: 'Bava',
    weekday: VAAR_EN[day], sunrise: '06:12', sunset: '18:44',
    paksha: doy % 30 < 15 ? 'Shukla Paksha' : 'Krishna Paksha',
    vaar: VAAR_HI[day] + ' / ' + VAAR_EN[day],
    vaarDeity: DEITIES[day], vaarMantra: MANTRAS[day],
    auspiciousLabel: '⚖️ सामान्य दिन', auspiciousColor: '#C9830A',
    vikramSamvat: yr, rahuKaal: 'See almanac', abhijit: '11:48 – 12:12',
    specialEvents: [],
    dateStr: d.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' }),
    _isFallback: true,
  };
}

function getDharmicInsight(data) {
  if (!data) return null;
  let title = '🧠 Dharmic Insight';
  let points = [];
  const tithi = (data.tithi || '').toLowerCase();
  const vaar  = (data.vaar  || '').toLowerCase();

  if (tithi.includes('ekadashi')) {
    title = '🌿 Ekadashi Guidance';
    points.push('Fasting is highly beneficial today');
    points.push('Chant Vishnu mantra: ॐ नमो भगवते वासुदेवाय');
    points.push('Avoid tamasic food (onion, garlic, non-veg)');
  }
  if (vaar.includes('monday') || vaar.includes('सोमवार')) {
    points.push('Worship Lord Shiva today');
    points.push('Chant: ॐ नमः शिवाय');
  }
  if (vaar.includes('tuesday') || vaar.includes('मंगलवार')) {
    points.push('Good day for Hanuman worship');
    points.push('Chant Hanuman mantra');
  }
  if (vaar.includes('saturday') || vaar.includes('शनिवार')) {
    points.push('Offer oil to Shani Dev');
    points.push('Avoid starting risky work');
  }
  if (data.rahuKaal && data.rahuKaal !== 'See almanac') {
    points.push(`Avoid important work during Rahu Kaal (${data.rahuKaal})`);
  }
  if (points.length === 0) {
    points.push('Focus on karma and discipline today');
    points.push('Do your duties without attachment');
  }
  return { title, points };
}

// ── PANCHANGCARD ─────────────────────────────────────────────────
// FIX: lang prop added, cancelled flag, loading state, offline fallback
function PanchangCard({ lang }) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [city, setCity] = React.useState('');
  const [inputCity, setInputCity] = React.useState('');
  const isH = lang === 'hindi';

  const getTodayKey = () => {
    const d = new Date();
    return `panchang_${d.getDate()}_${d.getMonth()}_${d.getFullYear()}`;
  };

  React.useEffect(() => {
    AsyncStorage.getItem('user_city').then(c => {
      if (c) { setCity(c); setInputCity(c); }
    });
  }, []);

  React.useEffect(() => {
    // FIX: cancelled flag prevents setState after unmount
    let cancelled = false;

    async function load() {
      if (!cancelled) setLoading(true);
      try {
        const cacheKey = getTodayKey();

        // STEP 1 — CHECK CACHE
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          await AsyncStorage.setItem('today_panchang', JSON.stringify(parsed));
          if (!cancelled) { setData(parsed); setLoading(false); }
          return;
        }

        let lat = null, lng = null;
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({});
            lat = loc.coords.latitude;
            lng = loc.coords.longitude;
          }
        } catch { }

        let url = API_URL;
        if (lat && lng) url += `?lat=${lat}&lng=${lng}`;
        else if (city) url += `?city=${encodeURIComponent(city)}`;
        else url += '?city=Delhi';

        // STEP 2 — API CALL with timeout
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(tid);
        const json = await res.json();
        const finalData = json.data || getLocalFallback();

        await AsyncStorage.setItem('today_panchang', JSON.stringify(finalData));
        await AsyncStorage.setItem(cacheKey, JSON.stringify(finalData));
        if (!cancelled) setData(finalData);

      } catch (e) {
        console.log('[Panchang] fetch error:', e.message);
        // FIX: always show fallback on error, never freeze
        if (!cancelled) setData(getLocalFallback());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [city]);

  const saveCity = async () => {
    if (!inputCity.trim()) { Alert.alert('', isH ? 'शहर का नाम दर्ज करें' : 'Enter city name'); return; }
    await AsyncStorage.setItem('user_city', inputCity.trim());
    const cacheKey = getTodayKey();
    await AsyncStorage.removeItem(cacheKey);
    setCity(inputCity.trim());
    setLoading(true);
    Alert.alert(isH ? 'सेव हो गया' : 'Saved', isH ? 'शहर अपडेट हो गया' : 'City updated');
  };

  if (loading) {
    return (
      <View style={s.card}>
        <Text style={s.cardTitle}>📅 Panchang</Text>
        {/* FIX: loading indicator instead of blank screen */}
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <ActivityIndicator color="#E8620A" size="small" />
          <Text style={{ color: 'rgba(253,246,237,0.4)', fontSize: 12, marginTop: 8 }}>
            {isH ? 'पंचांग लोड हो रहा है...' : 'Loading Panchang...'}
          </Text>
        </View>
      </View>
    );
  }

  const safeData = data || getLocalFallback();

  return (
    <View style={s.card}>
      {/* HEADER */}
      <View style={s.panHdr}>
        <View>
          <Text style={s.panTitle}>📅 {isH ? 'पंचांग' : 'Panchang'}</Text>
          <Text style={s.panSamvat}>
            {isH ? 'विक्रम संवत' : 'Vikram Samvat'}: {safeData.vikramSamvat}
          </Text>
        </View>
        <View style={[s.auPill, { borderColor: safeData.auspiciousColor }]}>
          <Text style={[s.auTxt, { color: safeData.auspiciousColor }]}>
            {safeData.auspiciousLabel}
          </Text>
        </View>
      </View>

      {/* GRID */}
      <View style={s.panGrid}>
        {[
          { lbl: isH ? 'तिथि' : 'Tithi',         val: safeData.tithi },
          { lbl: isH ? 'नक्षत्र' : 'Nakshatra',   val: safeData.nakshatra },
          { lbl: isH ? 'वार' : 'Vaar',             val: safeData.vaar },
          { lbl: isH ? 'राहु काल' : 'Rahu Kaal',  val: safeData.rahuKaal },
          { lbl: isH ? 'अभिजित' : 'Abhijit',      val: safeData.abhijit },
          { lbl: isH ? 'पक्ष' : 'Paksha',          val: safeData.paksha },
        ].map(({ lbl, val }) => (
          <View key={lbl} style={s.panCell}>
            <Text style={s.panCellLbl}>{lbl}</Text>
            <Text style={s.panCellVal}>{val}</Text>
          </View>
        ))}
      </View>

      {/* SUN */}
      <View style={s.sunRow}>
        <View style={s.sunItem}>
          <Text style={s.sunLbl}>🌅 {isH ? 'सूर्योदय' : 'Sunrise'}</Text>
          <Text style={s.sunVal}>{safeData.sunrise}</Text>
        </View>
        <View style={s.sunItem}>
          <Text style={s.sunLbl}>🌇 {isH ? 'सूर्यास्त' : 'Sunset'}</Text>
          <Text style={s.sunVal}>{safeData.sunset}</Text>
        </View>
      </View>

      {/* DEITY */}
      <View style={s.deityBox}>
        <Text style={s.deityTxt}>{safeData.vaarDeity}</Text>
        <Text style={s.deityMantra}>{safeData.vaarMantra}</Text>
      </View>

      {/* AI INSIGHT */}
      {(() => {
        const insight = getDharmicInsight(safeData);
        if (!insight) return null;
        return (
          <View style={{ backgroundColor:'rgba(39,174,96,0.08)', borderRadius:12, padding:12, borderWidth:1, borderColor:'rgba(39,174,96,0.3)', marginBottom:10 }}>
            <Text style={{ fontSize:13, fontWeight:'800', color:'#27AE60', marginBottom:6 }}>{insight.title}</Text>
            {insight.points.map((p, i) => (
              <Text key={i} style={{ fontSize:12, color:'rgba(253,246,237,0.8)', marginBottom:4 }}>• {p}</Text>
            ))}
          </View>
        );
      })()}

      {/* LOCATION */}
      <View style={{ marginTop: 10 }}>
        <TextInput
          placeholder={isH ? 'शहर बदलें' : 'Change City'}
          placeholderTextColor="#999"
          value={inputCity}
          onChangeText={setInputCity}
          style={{ borderWidth:1, borderColor:'#444', padding:10, borderRadius:8, color:'#fff' }}
        />
        <TouchableOpacity
          onPress={saveCity}
          style={{ backgroundColor:'#E8620A', padding:10, borderRadius:8, marginTop:10 }}>
          <Text style={{ color:'#fff', textAlign:'center' }}>
            {isH ? 'स्थान अपडेट करें' : 'Update Location'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── DAILY SHLOK ─────────────────────────────────────────────────
function DailyShlok({ lang, onAsk }) {
  const isH = lang === 'hindi';
  const dayOfYear = useMemo(() => {
    return Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  }, []);
  const shlok = DAILY_SHLOKS[dayOfYear % DAILY_SHLOKS.length];

  const share = async () => {
    try {
      await Share.share({
        message: `🕉 *आज का श्लोक — DharmaSetu*\n━━━━━━━━━━━━━━━\n*${shlok.ref}*\n\n${shlok.san}\n\n📖 ${isH ? shlok.hi : shlok.en}\n━━━━━━━━━━━━━━━\n🙏 DharmaSetu App — जय सनातन धर्म 🔱`,
      });
    } catch {}
  };

  return (
    <View style={s.card}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <Text style={s.cardTitle}>📿 {isH ? 'आज का श्लोक' : "Today's Shlok"}</Text>
        <TouchableOpacity onPress={share} style={s.shareSmBtn}><Text style={{ fontSize:14 }}>📤</Text></TouchableOpacity>
      </View>
      <View style={s.shlokSanBox}><Text style={s.shlokSan}>{shlok.san}</Text></View>
      <View style={s.shlokRefBox}><Text style={s.shlokRef}>📖 {shlok.ref}</Text></View>
      <Text style={s.shlokMeaning}>{isH ? shlok.hi : shlok.en}</Text>
      <TouchableOpacity
        style={s.askShlokBtn}
        onPress={() => onAsk(isH
          ? `इस श्लोक का विस्तृत अर्थ और जीवन में उपयोग बताएं: "${shlok.san}" — ${shlok.ref}`
          : `Explain this shlok in detail and how to apply it in modern life: "${shlok.san}" — ${shlok.ref}`
        )}
        activeOpacity={0.85}>
        <Text style={s.askShlokBtnTxt}>🕉 {isH ? 'DharmaChat से गहरा अर्थ जानें →' : 'Ask DharmaChat for deeper meaning →'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── FESTIVAL COUNTDOWN ──────────────────────────────────────────
function FestivalCountdown({ lang }) {
  const isH = lang === 'hindi';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const all = [
    ...FESTIVALS_2025_2026,
    ...EKADASHI_2025_2026.map(e => ({ ...e, deity: 'Vishnu', type: 'ekadashi' })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  const upcoming = all.filter(f => {
    const d = new Date(f.date);
    d.setHours(0, 0, 0, 0);
    return d >= today;
  }).slice(0, 5);

  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>🪔 {isH ? 'आने वाले पर्व' : 'Upcoming Festivals'}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop:10 }}>
        <View style={{ flexDirection:'row', gap:10 }}>
          {upcoming.map((fest, i) => {
            const d = new Date(fest.date);
            d.setHours(0, 0, 0, 0);
            const diff = Math.round((d - today) / 86400000);
            const isToday = diff === 0;
            return (
              <View key={i} style={[s.festItem, isToday && s.festItemToday]}>
                <View style={[s.festBadge, { backgroundColor: isToday ? '#E8620A' : 'rgba(201,131,10,0.2)' }]}>
                  <Text style={[s.festDays, { color: isToday ? '#fff' : '#C9830A' }]}>
                    {isToday ? (isH ? 'आज' : 'Today') : diff === 1 ? (isH ? 'कल' : 'Tmrw') : `${diff}d`}
                  </Text>
                </View>
                <Text style={s.festType}>{fest.type === 'ekadashi' ? '🌿' : '🪔'}</Text>
                <Text style={s.festName} numberOfLines={2}>{fest.name}</Text>
                <Text style={s.festDeity} numberOfLines={1}>{fest.deity}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ── MOOD → MANTRA ENGINE ────────────────────────────────────────
function MoodMantra({ lang, onAsk, onMoodChange }) {
  const [sel, setSel] = useState(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isH = lang === 'hindi';

  const pick = async (key) => {
    try {
      if (sel === key) { setSel(null); return; }
      setSel(key);
      await AsyncStorage.setItem('user_last_mood', key);
      const existing = await AsyncStorage.getItem('user_mood_history');
      let history = existing ? JSON.parse(existing) : [];
      history.unshift({ mood: key, date: new Date().toISOString() });
      history = history.slice(0, 5);
      await AsyncStorage.setItem('user_mood_history', JSON.stringify(history));
      slideAnim.setValue(0);
      Animated.spring(slideAnim, { toValue:1, friction:7, tension:80, useNativeDriver:true }).start();
    } catch (e) { console.log('[Home] Mood save error:', e); }
    onMoodChange && onMoodChange();
  };

  const mood = sel ? MOODS.find(m => m.key === sel) : null;

  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>🧘 {isH ? 'अभी कैसा महसूस हो रहा है?' : 'How are you feeling?'}</Text>
      <View style={s.moodGrid}>
        {MOODS.map(m => (
          <TouchableOpacity key={m.key}
            style={[s.moodBtn, sel === m.key && { borderColor: m.color, backgroundColor: m.color + '18' }]}
            onPress={() => pick(m.key)} activeOpacity={0.8}>
            <Text style={{ fontSize:20, marginBottom:3 }}>{m.emoji}</Text>
            <Text style={[s.moodLbl, sel === m.key && { color: m.color }]}>
              {isH ? m.hiLabel : m.enLabel}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mood && (
        <Animated.View style={[s.moodResult, {
          opacity: slideAnim,
          transform: [{ translateY: slideAnim.interpolate({ inputRange:[0,1], outputRange:[20,0] }) }],
        }]}>
          <View style={[s.moodMantraBox, { borderColor: mood.color + '40' }]}>
            <Text style={s.moodMantraLbl}>📿 {isH ? 'मंत्र जपें' : 'Chant this Mantra'}</Text>
            <Text style={[s.moodMantra, { color: mood.color }]}>{mood.mantra}</Text>
          </View>
          <View style={s.moodShlokBox}>
            <Text style={s.moodShlokTxt}>{isH ? mood.shlok : mood.shlokEn}</Text>
          </View>
          <View style={s.moodBreathBox}>
            <Text style={s.moodBreathLbl}>🌬️ {isH ? 'प्राणायाम' : 'Breathing'}</Text>
            <Text style={s.moodBreathTxt}>{isH ? mood.breathHi : mood.breathEn}</Text>
          </View>
          <View style={s.moodActionBox}>
            <Text style={s.moodActionLbl}>⚡ {isH ? 'अभी करें' : 'Do This Now'}</Text>
            <Text style={s.moodActionTxt}>{isH ? mood.actHi : mood.actEn}</Text>
          </View>
          <TouchableOpacity style={[s.moodAskBtn, { backgroundColor: mood.color }]}
            onPress={() => onAsk(isH
              ? `मैं अभी ${mood.hiLabel} महसूस कर रहा हूँ। गीता और धर्म के अनुसार मार्गदर्शन दें।`
              : `I am feeling ${mood.enLabel} right now. Guide me with Gita wisdom.`
            )} activeOpacity={0.85}>
            <Text style={s.moodAskBtnTxt}>🕉 {isH ? 'DharmaChat से गहरी सलाह लें →' : 'Get Dharmic guidance →'}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// ── JAPA COUNTER ────────────────────────────────────────────────
function JapaCounter({ lang }) {
  const [count, setCount]      = useState(0);
  const [target, setTarget]    = useState(108);
  const [todayTotal, setToday] = useState(0);
  const [mantraIdx, setMIdx]   = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isH = lang === 'hindi';

  useEffect(() => {
    AsyncStorage.getItem('current_japa_count').then(v => {
      if (v) setCount(parseInt(v, 10));
    });
    AsyncStorage.getItem('current_japa_target').then(v => {
      if (v) setTarget(parseInt(v, 10));
    });
    AsyncStorage.getItem(`japa_${new Date().toDateString()}`).then(v => {
      if (v) setToday(parseInt(v, 10) || 0);
    });
  }, []);

  const tap = () => {
    Vibration.vibrate(8);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue:0.88, duration:60, useNativeDriver:true }),
      Animated.spring(scaleAnim, { toValue:1, friction:3, tension:200, useNativeDriver:true }),
    ]).start();
    const nc = count + 1;
    const nt = todayTotal + 1;
    setCount(nc);
    setToday(nt);
    AsyncStorage.setItem('current_japa_count', String(nc));
    AsyncStorage.setItem(`japa_${new Date().toDateString()}`, String(nt));
    if (nc === target) {
      Vibration.vibrate([0, 100, 100, 100]);
      Alert.alert('🕉 जय!', isH ? `${target} जप पूर्ण! आज कुल: ${nt}` : `${target} japa complete! Today: ${nt}`);
    }
  };

  // FIX: reset persists to AsyncStorage
  const resetCount = () => {
    setCount(0);
    AsyncStorage.setItem('current_japa_count', '0');
  };

  // FIX: mantra change also persists reset
  const changeMantra = (i) => {
    setMIdx(i);
    setCount(0);
    AsyncStorage.setItem('current_japa_count', '0');
  };

  // FIX: target change persists both reset and new target
  const changeTarget = (t) => {
    setTarget(t);
    setCount(0);
    AsyncStorage.setItem('current_japa_count', '0');
    AsyncStorage.setItem('current_japa_target', String(t));
  };

  const pct = Math.min(100, Math.round((count / target) * 100));
  const m = JAPA_MANTRAS[mantraIdx];

  return (
    <View style={s.card}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:12 }}>
        <Text style={s.cardTitle}>📿 {isH ? 'जप काउंटर' : 'Japa Counter'}</Text>
        <Text style={{ fontSize:11, color:'#C9830A', fontWeight:'600' }}>
          {isH ? `आज: ${todayTotal} जप` : `Today: ${todayTotal}`}
        </Text>
      </View>

      {/* Mantra selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:10 }}>
        <View style={{ flexDirection:'row', gap:8 }}>
          {JAPA_MANTRAS.map((jm, i) => (
            <TouchableOpacity key={i}
              style={[s.japaChip, mantraIdx === i && { backgroundColor: jm.color + '20', borderColor: jm.color }]}
              onPress={() => changeMantra(i)}>
              <Text style={[s.japaChipTxt, mantraIdx === i && { color: jm.color }]}>{jm.short}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={[s.japaMantraTxt, { color: m.color }]}>{m.m}</Text>

      {/* Progress bar */}
      <View style={s.japaProgBar}>
        <View style={[s.japaProgFill, { width:`${pct}%`, backgroundColor: m.color }]} />
      </View>
      <Text style={s.japaProgLbl}>{count} / {target} ({pct}%)</Text>

      {/* Big tap button */}
      <View style={{ alignItems:'center', marginVertical:14 }}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity style={[s.japaMalaBtn, { borderColor: m.color + '60', shadowColor: m.color }]}
            onPress={tap} activeOpacity={0.85}>
            <Text style={{ fontSize:38 }}>🕉</Text>
            <Text style={[s.japaBtnCount, { color: m.color }]}>{count}</Text>
            <Text style={s.japaBtnSub}>{isH ? 'टैप करें' : 'Tap'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Targets + Reset */}
      <View style={{ flexDirection:'row', gap:8, justifyContent:'center' }}>
        {[27, 54, 108, 1008].map(t => (
          <TouchableOpacity key={t}
            style={[s.japaTargBtn, target === t && { backgroundColor: m.color + '20', borderColor: m.color }]}
            onPress={() => changeTarget(t)}>
            <Text style={[s.japaTargTxt, target === t && { color: m.color }]}>{t}</Text>
          </TouchableOpacity>
        ))}
        {/* FIX: reset button now calls resetCount which persists to AsyncStorage */}
        <TouchableOpacity style={[s.japaTargBtn, { borderColor:'rgba(231,76,60,0.4)' }]} onPress={resetCount}>
          <Text style={{ fontSize:14, color:'#E74C3C' }}>↺</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── STREAK CARD ─────────────────────────────────────────────────
function StreakCard({ user, pts, streak, lang }) {
  const isH = lang === 'hindi';
  if (!user) return null;

  const BADGES = [
    { min: 0,   i: '🌱', n: isH ? 'नया साधक'    : 'New Seeker'    },
    { min: 3,   i: '🔥', n: isH ? 'धर्म रक्षक'  : 'Dharma Rakshak'},
    { min: 7,   i: '🌸', n: isH ? 'भक्त'         : 'Bhakta'        },
    { min: 14,  i: '⭐', n: isH ? 'ज्ञानी'       : 'Jnani'         },
    { min: 30,  i: '🕉', n: isH ? 'महासाधक'      : 'Maha Sadhak'   },
    { min: 108, i: '👑', n: isH ? 'संत'          : 'Sant'          },
  ];
  const badge = [...BADGES].reverse().find(b => streak >= b.min) || BADGES[0];

  const share = async () => {
    try {
      await Share.share({
        message: `${badge.i} मेरा DharmaSetu सफर!\n━━━━━━━━━━━━━━━\n🔥 ${streak} ${isH ? 'दिन की Streak' : 'Day Streak'}\n⚡ ${pts} Dharma Points\n🏅 ${badge.n}\n━━━━━━━━━━━━━━━\n🕉 DharmaSetu App join करें!\nजय सनातन धर्म 🔱`,
      });
    } catch {}
  };

  return (
    <View style={s.card}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
        <View style={{ flex:1 }}>
          <Text style={s.cardTitle}>{badge.i} {user.name}</Text>
          <Text style={{ fontSize:11, color:'rgba(253,246,237,0.4)', marginTop:2 }}>{badge.n}</Text>
        </View>
        <TouchableOpacity onPress={share} style={s.shareSmBtn}><Text style={{ fontSize:14 }}>📤</Text></TouchableOpacity>
      </View>
      <View style={{ flexDirection:'row', gap:10, marginTop:12 }}>
        {[
          { val: streak, lbl: isH ? 'दिन Streak' : 'Day Streak', icon: '🔥', color: '#E8620A' },
          { val: pts,    lbl: isH ? 'धर्म पॉइंट' : 'Dharma Pts', icon: '⚡', color: '#C9830A' },
          { val: `${Math.min(100, Math.round((streak / 30) * 100))}%`, lbl: isH ? '30-दिन लक्ष्य' : '30-Day Goal', icon: '🎯', color: '#27AE60' },
        ].map((stat, i) => (
          <View key={i} style={s.statBox}>
            <Text style={{ fontSize:18, marginBottom:4 }}>{stat.icon}</Text>
            <Text style={[s.statVal, { color: stat.color }]}>{stat.val}</Text>
            <Text style={s.statLbl}>{stat.lbl}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── QUICK ACTIONS ───────────────────────────────────────────────
function QuickActions({ lang }) {
  const isH = lang === 'hindi';
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>⚡ {isH ? 'त्वरित पहुंच' : 'Quick Access'}</Text>
      <View style={s.qaGrid}>
        {QUICK_ACTIONS.map(qa => (
          <TouchableOpacity key={qa.id}
            style={[s.qaBtn, { borderColor: qa.color + '30' }]}
            onPress={async () => {
              if (qa.action === 'factcheck') {
                await AsyncStorage.setItem('dharmasetu_mode', 'factcheck');
                router.push('/explore');
              } else {
                router.push(qa.route);
              }
            }}
            activeOpacity={0.85}>
            <View style={[s.qaIconBox, { backgroundColor: qa.color + '18' }]}>
              <Text style={{ fontSize:22 }}>{qa.emoji}</Text>
            </View>
            <Text style={s.qaLbl} numberOfLines={1}>{isH ? qa.hi : qa.en}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN HOME SCREEN
// ════════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [user,   setUser]   = useState(null);
  const [lang,   setLang]   = useState('hindi');
  const [pts,    setPts]    = useState(0);
  const [streak, setStreak] = useState(0);
  const [ready,  setReady]  = useState(false);
  const [aiLoading,  setAiLoading]  = useState(false);
  const [aiInsight,  setAiInsight]  = useState(null);
  const headerAnim = useRef(new Animated.Value(0)).current;

  // FIX: isMountedRef — prevents all setState calls after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // FIX: aiTimeoutRef — properly cleaned up on unmount
  const aiTimeoutRef = useRef(null);
  // FIX: fetchingRef — prevents multiple simultaneous AI insight fetches
  const fetchingRef = useRef(false);

  // FIX: fetchAIInsight wrapped in useCallback, stable reference
  // FIX: 10-second timeout instead of 45 seconds
  // FIX: loading state shown while waiting
  // FIX: fallback UI on failure (no silent fail)
  const fetchAIInsight = useCallback(async () => {
    // FIX: race condition guard — only one fetch at a time
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (isMountedRef.current) setAiLoading(true);

    try {
      let moodHistory = [];
      try {
        const mh = await AsyncStorage.getItem('user_mood_history');
        moodHistory = mh ? JSON.parse(mh) : [];
      } catch { moodHistory = []; }

      let parsedPanchang = null;
      try {
        const p = await AsyncStorage.getItem('today_panchang');
        parsedPanchang = p ? JSON.parse(p) : null;
      } catch { parsedPanchang = null; }

      if (!parsedPanchang || !parsedPanchang.tithi) {
        parsedPanchang = getLocalFallback();
      }

      // FIX: 10-second timeout — was silently waiting 45 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch('https://dharmasetu-backend-2c65.onrender.com/api/dharmic-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moodHistory, panchang: parsedPanchang }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      let data = null;
      if (res.ok) {
        try { data = await res.json(); } catch { data = null; }
      }

      if (data && data.guidance && data.guidance.length > 0) {
        if (isMountedRef.current) setAiInsight(data);
      } else {
        throw new Error('No guidance in response');
      }

    } catch (e) {
      console.log('[Home] AI insight fallback triggered:', e.message);
      // FIX: always show fallback, never silently fail
      try {
        const raw = await AsyncStorage.getItem('today_panchang');
        const safePanchang = raw ? JSON.parse(raw) : getLocalFallback();
        const fallback = getDharmicInsight(safePanchang);
        if (isMountedRef.current) {
          setAiInsight({
            guidance: fallback?.points || [
              'Focus on karma and discipline today',
              'Chant your Ishta Devata mantra',
              'Avoid unnecessary stress',
            ],
          });
        }
      } catch {
        if (isMountedRef.current) {
          setAiInsight({
            guidance: [
              'Focus on karma and discipline today',
              'Chant your Ishta Devata mantra',
              'Avoid unnecessary stress',
            ],
          });
        }
      }
    } finally {
      fetchingRef.current = false;
      if (isMountedRef.current) setAiLoading(false);
    }
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('dharmasetu_user');
      const storedLang = await AsyncStorage.getItem('user_language');
      const p = parseInt(await AsyncStorage.getItem('dharmasetu_pts') || '0', 10);

      if (!isMountedRef.current) return;
      setPts(p);

      if (storedLang && isMountedRef.current) setLang(storedLang);

      if (raw) {
        const u = JSON.parse(raw);
        if (isMountedRef.current) {
          setUser(u);
          setLang(u.language || 'hindi');
        }
      }

      // Streak logic
      const today     = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const lastOpen  = await AsyncStorage.getItem('dharmasetu_last_open');
      const curStreak = parseInt(await AsyncStorage.getItem('dharmasetu_streak_count') || '0', 10);

      if (!isMountedRef.current) return;

      if (lastOpen === today) {
        setStreak(curStreak);
      } else if (lastOpen === yesterday) {
        const newStreak = curStreak + 1;
        setStreak(newStreak);
        await AsyncStorage.setItem('dharmasetu_streak_count', String(newStreak));
        await AsyncStorage.setItem('dharmasetu_last_open', today);
        const newPts = p + 3;
        if (isMountedRef.current) setPts(newPts);
        await AsyncStorage.setItem('dharmasetu_pts', String(newPts));
      } else {
        await AsyncStorage.setItem('dharmasetu_streak_count', '1');
        await AsyncStorage.setItem('dharmasetu_last_open', today);
        if (isMountedRef.current) setStreak(1);
      }
    } catch (e) {
      console.log('[Home] loadUser error:', e.message);
    }
    // FIX: setReady after guard check
    if (isMountedRef.current) setReady(true);
  }, []);

  useEffect(() => {
    loadUser();
    Animated.timing(headerAnim, { toValue:1, duration:700, useNativeDriver:true }).start();

    // Load mood history
    AsyncStorage.getItem('user_mood_history').then(mh => {
      // (stored for mood display — not causing setState issues here)
    });

    // FIX: delay AI insight to avoid blocking initial render
    const timer = setTimeout(() => {
      if (isMountedRef.current) fetchAIInsight();
    }, 1800);

    return () => {
      clearTimeout(timer);
      // FIX: clear any pending debounced fetchAIInsight call
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [fetchAIInsight, loadUser]);

  const navigateToDharmaChat = useCallback(async (presetQ) => {
    if (presetQ) await AsyncStorage.setItem('dharmasetu_preset_question', presetQ);
    router.push('/explore');
  }, []);

  const isH = lang === 'hindi';

  if (!ready) return (
    <View style={[s.root, { alignItems:'center', justifyContent:'center', paddingTop: insets.top }]}>
      <Text style={{ fontSize:52 }}>🕉</Text>
      <Text style={{ color:'#E8620A', marginTop:16, fontSize:13, fontWeight:'600' }}>
        {isH ? 'जय सनातन धर्म' : 'Jai Sanatan Dharma'}
      </Text>
    </View>
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#0D0500" />

      {/* HEADER */}
      <Animated.View style={[s.hdr, { opacity: headerAnim }]}>
        <View style={{ flex:1 }}>
          <Text style={s.hdrGreet}>
            {isH ? `🕉 नमस्ते, ${user?.name?.split(' ')[0] || 'साधक'}` : `🕉 Namaste, ${user?.name?.split(' ')[0] || 'Seeker'}`}
          </Text>
          <Text style={s.hdrSub}>{isH ? 'जय सनातन धर्म 🔱' : 'Jai Sanatan Dharma 🔱'}</Text>
        </View>
        <View style={{ flexDirection:'row', gap:8 }}>
          {[{ id:'hindi', l:'हिं' }, { id:'english', l:'EN' }].map(({ id, l }) => (
            <TouchableOpacity key={id}
              style={[s.langBtn, lang === id && s.langBtnOn]}
              onPress={async () => {
                setLang(id);
                await AsyncStorage.setItem('user_language', id);
              }}>
              <Text style={[s.langBtnTxt, lang === id && s.langBtnTxtOn]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* SCROLLABLE CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 24 }]}>

        <StreakCard user={user} pts={pts} streak={streak} lang={lang} />
        <QuickActions lang={lang} />

        {/* FIX: pass lang prop to PanchangCard */}
        <PanchangCard lang={lang} />

        {/* FIX: AI Insight — loading state + fallback, not silent */}
        {aiLoading && (
          <View style={s.aiLoadingBox}>
            <ActivityIndicator color="#3498DB" size="small" />
            <Text style={s.aiLoadingTxt}>
              {isH ? '🧠 व्यक्तिगत मार्गदर्शन तैयार हो रहा है...' : '🧠 Preparing personalized guidance...'}
            </Text>
          </View>
        )}

        {!aiLoading && aiInsight && (
          <View style={s.aiInsightBox}>
            <Text style={s.aiInsightTitle}>🧠 {isH ? 'व्यक्तिगत मार्गदर्शन' : 'Personalized Guidance'}</Text>
            {Array.isArray(aiInsight.guidance) && aiInsight.guidance.map((g, i) => (
              <Text key={i} style={s.aiInsightPoint}>• {g}</Text>
            ))}
          </View>
        )}

        <FestivalCountdown lang={lang} />
        <DailyShlok lang={lang} onAsk={navigateToDharmaChat} />

        <MoodMantra
          lang={lang}
          onAsk={navigateToDharmaChat}
          onMoodChange={() => {
            // FIX: debounced — only fetch if last fetch was > 30 min ago
            AsyncStorage.getItem('dharmasetu_last_insight').then(last => {
              if (!last || Date.now() - parseInt(last) > 1800000) {
                AsyncStorage.setItem('dharmasetu_last_insight', String(Date.now()));
                // FIX: use aiTimeoutRef for debounce, not a new setTimeout each time
                if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
                aiTimeoutRef.current = setTimeout(() => {
                  if (isMountedRef.current) fetchAIInsight();
                }, 500);
              }
            });
          }}
        />

        <JapaCounter lang={lang} />

        {/* DharmaChat CTA */}
        <TouchableOpacity style={s.chatCta} onPress={() => navigateToDharmaChat()} activeOpacity={0.88}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            <Text style={{ fontSize:32 }}>💬</Text>
            <View style={{ flex:1 }}>
              <Text style={s.ctaTitle}>{isH ? 'DharmaChat AI से पूछें' : 'Ask DharmaChat AI'}</Text>
              <Text style={s.ctaSub}>{isH ? 'शास्त्र, ज्योतिष, जीवन — सब के उत्तर' : 'Scripture, Jyotish, Life guidance'}</Text>
            </View>
            <Text style={{ fontSize:22, color:'#E8620A' }}>›</Text>
          </View>
        </TouchableOpacity>

        <Text style={s.footer}>🕉 जय सनातन धर्म · Jai Sanatan Dharma 🔱</Text>
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root:    { flex:1, backgroundColor:'#0D0500' },
  scroll:  { padding:14, gap:0 },

  hdr:         { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1, borderBottomColor:'rgba(240,165,0,0.1)' },
  hdrGreet:    { fontSize:18, fontWeight:'800', color:'#F4A261' },
  hdrSub:      { fontSize:11, color:'#C9830A', marginTop:2 },
  langBtn:     { paddingHorizontal:10, paddingVertical:7, borderRadius:9, borderWidth:1, borderColor:'rgba(200,130,40,0.2)' },
  langBtnOn:   { backgroundColor:'rgba(232,98,10,0.15)', borderColor:'#E8620A' },
  langBtnTxt:  { fontSize:12, color:'rgba(253,246,237,0.4)', fontWeight:'700' },
  langBtnTxtOn:{ color:'#F4A261' },

  card:        { backgroundColor:'#0F0600', borderRadius:18, padding:16, marginBottom:13, borderWidth:1, borderColor:'rgba(240,165,0,0.15)', elevation:3 },
  cardTitle:   { fontSize:14, fontWeight:'800', color:'#F4A261' },
  shareSmBtn:  { padding:6, borderRadius:8, backgroundColor:'rgba(255,255,255,0.05)', borderWidth:1, borderColor:'rgba(240,165,0,0.1)' },

  // FIX: AI insight loading + result box styles
  aiLoadingBox:  { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:'rgba(52,152,219,0.06)', borderRadius:12, padding:14, marginBottom:12, borderWidth:1, borderColor:'rgba(52,152,219,0.2)' },
  aiLoadingTxt:  { fontSize:12, color:'rgba(52,152,219,0.8)', flex:1 },
  aiInsightBox:  { backgroundColor:'rgba(52,152,219,0.08)', borderRadius:12, padding:12, borderWidth:1, borderColor:'rgba(52,152,219,0.3)', marginBottom:12 },
  aiInsightTitle:{ fontSize:13, fontWeight:'800', color:'#3498DB', marginBottom:6 },
  aiInsightPoint:{ fontSize:12, color:'rgba(253,246,237,0.8)', marginBottom:4 },

  // Panchang
  panHdr:      { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 },
  panTitle:    { fontSize:14, fontWeight:'800', color:'#F4A261' },
  panSamvat:   { fontSize:10, color:'rgba(253,246,237,0.35)', marginTop:2 },
  auPill:      { paddingHorizontal:10, paddingVertical:5, borderRadius:10, borderWidth:1 },
  auTxt:       { fontSize:11, fontWeight:'700' },
  panGrid:     { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:12 },
  panCell:     { width:'30%', backgroundColor:'rgba(255,255,255,0.04)', borderRadius:10, padding:9, alignItems:'center', borderWidth:1, borderColor:'rgba(240,165,0,0.08)' },
  panCellLbl:  { fontSize:9, color:'rgba(253,246,237,0.35)', fontWeight:'600', marginBottom:2 },
  panCellVal:  { fontSize:11, color:'#F4A261', fontWeight:'700', textAlign:'center' },
  sunRow:      { flexDirection:'row', backgroundColor:'rgba(255,255,255,0.03)', borderRadius:12, padding:10, marginBottom:10 },
  sunItem:     { flex:1, alignItems:'center' },
  sunLbl:      { fontSize:9, color:'rgba(253,246,237,0.3)', marginBottom:2 },
  sunVal:      { fontSize:11, fontWeight:'700', color:'#FDF6ED', textAlign:'center' },
  deityBox:    { backgroundColor:'rgba(201,131,10,0.08)', borderRadius:10, padding:10, borderWidth:1, borderColor:'rgba(201,131,10,0.2)', marginBottom:8 },
  deityTxt:    { fontSize:12, color:'#C9830A', textAlign:'center', fontWeight:'600', marginBottom:4 },
  deityMantra: { fontSize:13, color:'rgba(253,220,150,0.7)', textAlign:'center', fontWeight:'700' },
  evtBox:      { borderRadius:8, padding:8, borderWidth:1, backgroundColor:'rgba(255,255,255,0.03)' },
  evtTxt:      { fontSize:12, fontWeight:'600' },

  // Daily Shlok
  shlokSanBox:    { backgroundColor:'rgba(107,33,168,0.14)', borderRadius:12, padding:14, marginBottom:10, borderWidth:1, borderColor:'rgba(107,33,168,0.25)' },
  shlokSan:       { fontSize:16, color:'#D4A8FF', textAlign:'center', lineHeight:30, fontWeight:'600' },
  shlokRefBox:    { alignSelf:'center', backgroundColor:'rgba(232,98,10,0.12)', borderRadius:8, paddingHorizontal:12, paddingVertical:4, marginBottom:8 },
  shlokRef:       { fontSize:11, color:'#E8620A', fontWeight:'700' },
  shlokMeaning:   { fontSize:13, color:'rgba(253,246,237,0.75)', lineHeight:22, marginBottom:12, textAlign:'center' },
  askShlokBtn:    { backgroundColor:'rgba(232,98,10,0.15)', borderRadius:12, padding:12, alignItems:'center', borderWidth:1, borderColor:'rgba(232,98,10,0.3)' },
  askShlokBtnTxt: { fontSize:12, color:'#F4A261', fontWeight:'700' },

  // Festival
  festItem:     { width:90, backgroundColor:'rgba(255,255,255,0.04)', borderRadius:14, padding:10, alignItems:'center', borderWidth:1, borderColor:'rgba(200,130,40,0.12)' },
  festItemToday:{ borderColor:'#E8620A', backgroundColor:'rgba(232,98,10,0.08)' },
  festBadge:    { borderRadius:8, paddingHorizontal:8, paddingVertical:3, marginBottom:5 },
  festDays:     { fontSize:11, fontWeight:'800' },
  festType:     { fontSize:16, marginBottom:3 },
  festName:     { fontSize:10, color:'#FDF6ED', fontWeight:'600', textAlign:'center', marginBottom:2 },
  festDeity:    { fontSize:9, color:'rgba(253,246,237,0.3)', textAlign:'center' },

  // Mood
  moodGrid:     { flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:12 },
  moodBtn:      { paddingHorizontal:12, paddingVertical:9, borderRadius:12, borderWidth:1, borderColor:'rgba(200,130,40,0.2)', backgroundColor:'rgba(255,255,255,0.03)', alignItems:'center', minWidth:90 },
  moodLbl:      { fontSize:11, color:'rgba(253,246,237,0.45)', fontWeight:'600', textAlign:'center' },
  moodResult:   { marginTop:14, gap:10 },
  moodMantraBox:{ backgroundColor:'rgba(255,255,255,0.04)', borderRadius:12, padding:14, borderWidth:1 },
  moodMantraLbl:{ fontSize:10, color:'rgba(253,246,237,0.35)', fontWeight:'700', marginBottom:6 },
  moodMantra:   { fontSize:17, fontWeight:'800', textAlign:'center', lineHeight:28 },
  moodShlokBox: { backgroundColor:'rgba(107,33,168,0.1)', borderRadius:12, padding:12, borderWidth:1, borderColor:'rgba(107,33,168,0.2)' },
  moodShlokTxt: { fontSize:13, color:'rgba(212,168,255,0.85)', lineHeight:21 },
  moodBreathBox:{ backgroundColor:'rgba(39,174,96,0.08)', borderRadius:12, padding:12, borderWidth:1, borderColor:'rgba(39,174,96,0.2)' },
  moodBreathLbl:{ fontSize:10, color:'rgba(100,220,150,0.6)', fontWeight:'700', marginBottom:5 },
  moodBreathTxt:{ fontSize:13, color:'rgba(100,220,150,0.85)', lineHeight:20 },
  moodActionBox:{ backgroundColor:'rgba(232,98,10,0.08)', borderRadius:12, padding:12, borderWidth:1, borderColor:'rgba(232,98,10,0.2)' },
  moodActionLbl:{ fontSize:10, color:'#E8620A', fontWeight:'700', marginBottom:5 },
  moodActionTxt:{ fontSize:13, color:'rgba(253,246,237,0.8)', lineHeight:20 },
  moodAskBtn:   { borderRadius:12, paddingVertical:12, alignItems:'center' },
  moodAskBtnTxt:{ color:'#fff', fontWeight:'700', fontSize:13 },

  // Japa
  japaChip:     { paddingHorizontal:12, paddingVertical:7, borderRadius:20, borderWidth:1, borderColor:'rgba(200,130,40,0.2)' },
  japaChipTxt:  { fontSize:12, color:'rgba(253,246,237,0.4)', fontWeight:'600' },
  japaMantraTxt:{ fontSize:14, textAlign:'center', fontWeight:'800', marginBottom:10, lineHeight:24 },
  japaProgBar:  { height:6, backgroundColor:'rgba(255,255,255,0.07)', borderRadius:3, overflow:'hidden', marginBottom:4 },
  japaProgFill: { height:6, borderRadius:3 },
  japaProgLbl:  { fontSize:11, color:'rgba(253,246,237,0.35)', textAlign:'center', marginBottom:4 },
  japaMalaBtn:  { width:130, height:130, borderRadius:65, backgroundColor:'rgba(107,33,168,0.25)', alignItems:'center', justifyContent:'center', borderWidth:3, elevation:8, shadowOpacity:0.4, shadowRadius:10, shadowOffset:{ width:0, height:4 } },
  japaBtnCount: { fontSize:28, fontWeight:'800' },
  japaBtnSub:   { fontSize:11, color:'rgba(253,246,237,0.35)', marginTop:2 },
  japaTargBtn:  { paddingHorizontal:13, paddingVertical:8, borderRadius:10, borderWidth:1, borderColor:'rgba(200,130,40,0.2)' },
  japaTargTxt:  { fontSize:12, color:'rgba(253,246,237,0.4)', fontWeight:'700' },

  // Streak stats
  statBox:  { flex:1, backgroundColor:'rgba(255,255,255,0.04)', borderRadius:12, padding:12, alignItems:'center', borderWidth:1, borderColor:'rgba(240,165,0,0.08)' },
  statVal:  { fontSize:20, fontWeight:'800', marginBottom:3 },
  statLbl:  { fontSize:10, color:'rgba(253,246,237,0.35)', textAlign:'center' },

  // Quick Actions
  qaGrid:   { flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:12 },
  qaBtn:    { width:'30%', backgroundColor:'rgba(255,255,255,0.03)', borderRadius:14, padding:12, alignItems:'center', borderWidth:1 },
  qaIconBox:{ width:48, height:48, borderRadius:13, alignItems:'center', justifyContent:'center', marginBottom:7 },
  qaLbl:    { fontSize:11, color:'rgba(253,246,237,0.65)', fontWeight:'600', textAlign:'center' },

  // CTA
  chatCta:  { backgroundColor:'#160800', borderRadius:18, padding:16, marginBottom:13, borderWidth:1.5, borderColor:'rgba(232,98,10,0.35)', elevation:4 },
  ctaTitle: { fontSize:15, fontWeight:'800', color:'#F4A261' },
  ctaSub:   { fontSize:12, color:'rgba(253,246,237,0.45)', marginTop:3 },

  // Footer
  footer:   { textAlign:'center', color:'rgba(240,165,0,0.3)', fontSize:12, marginTop:8 },
});
