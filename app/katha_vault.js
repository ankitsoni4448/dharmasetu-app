// DharmaSetu — Katha Vault — PRODUCTION v3
// FIXES:
// 1. AbortSignal.timeout replaced with manual setTimeout (Android compatible)
// 2. All scriptures listed — Gita live, others Coming Soon
// 3. FlashList for smooth scrolling
// 4. Premium lock on PDF download
// 5. DharmaSetu Gurukul branding

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlashList } from '@shopify/flash-list';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { usePremiumCheck } from '../hooks/usePremiumCheck';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Modal,
  Share, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── CONFIG ──────────────────────────────────────────────────────
const BACKEND_URL = 'https://dharmasetu-backend-2c65.onrender.com';

// ── Android-compatible fetch with timeout ──────────────────────
function fetchWithTimeout(url, options, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, timeoutMs);
    fetch(url, options)
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

// ═══════════════════════════════════════════════════════════════
// SCRIPTURES
// ═══════════════════════════════════════════════════════════════
const SCRIPTURES = [
  {
    id: 'bhagavad_gita', icon: '📖', name: 'Bhagavad Gita', nameHi: 'भगवद्गीता',
    desc: '700 shlokas · 18 Chapters · Sri Krishna to Arjuna',
    descHi: '700 श्लोक · 18 अध्याय · श्रीकृष्ण द्वारा अर्जुन को',
    color: '#E8620A', live: true, primaryLang: 'Sanskrit',
    units: [
      { n: 1,  t: 'Arjuna Vishada Yoga',              tH: 'अर्जुन विषाद योग',              s: 47 },
      { n: 2,  t: 'Sankhya Yoga',                      tH: 'सांख्य योग',                    s: 72 },
      { n: 3,  t: 'Karma Yoga',                        tH: 'कर्म योग',                      s: 43 },
      { n: 4,  t: 'Jnana Karma Sanyasa Yoga',          tH: 'ज्ञान कर्म संन्यास योग',        s: 42 },
      { n: 5,  t: 'Karma Sanyasa Yoga',                tH: 'कर्म संन्यास योग',              s: 29 },
      { n: 6,  t: 'Atmasanyama Yoga',                  tH: 'आत्मसंयम योग',                  s: 47 },
      { n: 7,  t: 'Jnana Vijnana Yoga',                tH: 'ज्ञान विज्ञान योग',             s: 30 },
      { n: 8,  t: 'Aksara Brahma Yoga',                tH: 'अक्षर ब्रह्म योग',              s: 28 },
      { n: 9,  t: 'Raja Vidya Raja Guhya Yoga',        tH: 'राज विद्या राज गुह्य योग',      s: 34 },
      { n: 10, t: 'Vibhuti Yoga',                      tH: 'विभूति योग',                    s: 42 },
      { n: 11, t: 'Vishwarupa Darshana Yoga',          tH: 'विश्वरूप दर्शन योग',            s: 55 },
      { n: 12, t: 'Bhakti Yoga',                       tH: 'भक्ति योग',                     s: 20 },
      { n: 13, t: 'Kshetra Kshetragnya Vibhaga Yoga',  tH: 'क्षेत्र क्षेत्रज्ञ विभाग योग',  s: 34 },
      { n: 14, t: 'Gunatraya Vibhaga Yoga',            tH: 'गुणत्रय विभाग योग',             s: 27 },
      { n: 15, t: 'Purushottama Yoga',                 tH: 'पुरुषोत्तम योग',                s: 20 },
      { n: 16, t: 'Daivasura Sampad Vibhaga Yoga',     tH: 'दैवासुर संपद विभाग योग',        s: 24 },
      { n: 17, t: 'Sraddhatraya Vibhaga Yoga',         tH: 'श्रद्धात्रय विभाग योग',         s: 28 },
      { n: 18, t: 'Moksha Sanyasa Yoga',               tH: 'मोक्ष संन्यास योग',              s: 78 },
    ],
  },
  {
    id: 'valmiki_ramayana', icon: '🏹', name: 'Valmiki Ramayana', nameHi: 'वाल्मीकि रामायण',
    desc: '24,000 verses · 7 Kandas · By Maharishi Valmiki',
    descHi: '24,000 श्लोक · 7 काण्ड · महर्षि वाल्मीकि द्वारा',
    color: '#C9830A', live: false, primaryLang: 'Sanskrit',
    units: [
      { n: 1, t: 'Bala Kanda',       tH: 'बाल काण्ड',       s: 77 },
      { n: 2, t: 'Ayodhya Kanda',    tH: 'अयोध्या काण्ड',   s: 119 },
      { n: 3, t: 'Aranya Kanda',     tH: 'अरण्य काण्ड',     s: 75 },
      { n: 4, t: 'Kishkindha Kanda', tH: 'किष्किन्धा काण्ड', s: 67 },
      { n: 5, t: 'Sundara Kanda',    tH: 'सुन्दर काण्ड',    s: 68 },
      { n: 6, t: 'Yuddha Kanda',     tH: 'युद्ध काण्ड',     s: 131 },
      { n: 7, t: 'Uttara Kanda',     tH: 'उत्तर काण्ड',     s: 111 },
    ],
  },
  {
    id: 'mahabharata', icon: '⚔️', name: 'Mahabharata', nameHi: 'महाभारत',
    desc: '100,000+ verses · 18 Parvas · By Maharishi Vyasa',
    descHi: '1,00,000+ श्लोक · 18 पर्व · महर्षि व्यास द्वारा',
    color: '#6B21A8', live: false, primaryLang: 'Sanskrit',
    units: [
      { n: 1, t: 'Adi Parva',            tH: 'आदि पर्व',         s: 227 },
      { n: 2, t: 'Sabha Parva',          tH: 'सभा पर्व',         s: 79 },
      { n: 3, t: 'Vana Parva',           tH: 'वन पर्व',          s: 317 },
      { n: 6, t: 'Bhishma Parva',        tH: 'भीष्म पर्व',       s: 122 },
      { n: 12, t: 'Shanti Parva',        tH: 'शांति पर्व',       s: 365 },
      { n: 18, t: 'Svargarohana Parva',  tH: 'स्वर्गारोहण पर्व', s: 5 },
    ],
  },
  {
    id: 'srimad_bhagavatam', icon: '🌸', name: 'Srimad Bhagavatam', nameHi: 'श्रीमद् भागवतम्',
    desc: '12 Skandhas · Krishna Lila · By Maharishi Vyasa',
    descHi: '12 स्कंध · श्रीकृष्ण लीला · महर्षि व्यास',
    color: '#27AE60', live: false, primaryLang: 'Sanskrit',
    units: [
      { n: 1,  t: 'Skandha 1',              tH: 'स्कंध 1',             s: 19 },
      { n: 10, t: 'Skandha 10 — Krishna',   tH: 'स्कंध 10 — कृष्ण',   s: 90 },
    ],
  },
  {
    id: 'upanishads', icon: '🕉', name: 'Key Upanishads', nameHi: 'प्रमुख उपनिषद्',
    desc: '10 Principal Upanishads — source of Vedanta',
    descHi: '10 मुख्य उपनिषद् — वेदांत का मूल',
    color: '#1A5C8B', live: false, primaryLang: 'Sanskrit',
    units: [
      { n: 1, t: 'Isha Upanishad',    tH: 'ईशावास्य उपनिषद्', s: 18 },
      { n: 3, t: 'Katha Upanishad',   tH: 'कठ उपनिषद्',       s: 119 },
      { n: 5, t: 'Mundaka Upanishad', tH: 'मुण्डक उपनिषद्',   s: 64 },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// CACHE — 365-day AsyncStorage
// ═══════════════════════════════════════════════════════════════
const CV = 'kv_v3_';

async function getCached(sid, n, lang) {
  try {
    const r = await AsyncStorage.getItem(`${CV}${sid}_${n}_${lang}`);
    if (!r) return null;
    const { verses, ts } = JSON.parse(r);
    if ((Date.now() - ts) / 86400000 > 365) return null;
    return verses;
  } catch { return null; }
}
async function saveCache(sid, n, lang, verses) {
  try { await AsyncStorage.setItem(`${CV}${sid}_${n}_${lang}`, JSON.stringify({ verses, ts: Date.now() })); } catch {}
}
async function getProgress(sid) {
  try { const r = await AsyncStorage.getItem(`kp_v3_${sid}`); return r ? JSON.parse(r) : {}; } catch { return {}; }
}
async function markRead(sid, n) {
  try { const p = await getProgress(sid); p[n] = Date.now(); await AsyncStorage.setItem(`kp_v3_${sid}`, JSON.stringify(p)); } catch {}
}

// ═══════════════════════════════════════════════════════════════
// FETCH FROM BACKEND — Android-compatible (no AbortSignal.timeout)
// ═══════════════════════════════════════════════════════════════
async function fetchChapter(sc, unit, lang) {
  // 1. Local cache first
  const cached = await getCached(sc.id, unit.n, lang);
  if (cached && cached.length > 0) return { verses: cached, source: 'cache' };

  // 2. Backend (Android-safe timeout)
  try {
    const res = await fetchWithTimeout(
      `${BACKEND_URL}/katha/${sc.id}/${unit.n}/${lang}`,
      {},
      12000
    );
    if (res.ok) {
      const d = await res.json();
      if (d?.content) {
        let verses;
        try {
          const parsed = typeof d.content === 'string' ? JSON.parse(d.content) : d.content;
          verses = Array.isArray(parsed) ? parsed : null;
        } catch { verses = null; }

        if (verses && verses.length > 0) {
          await saveCache(sc.id, unit.n, lang, verses);
          await markRead(sc.id, unit.n);
          return { verses, source: 'backend' };
        }
      }
    }
  } catch (e) {
    console.log('[Katha] Backend fetch failed:', e.message);
  }

  return { verses: null, source: 'not_ready' };
}

// ═══════════════════════════════════════════════════════════════
// PDF DOWNLOAD — Premium only
// ═══════════════════════════════════════════════════════════════
async function downloadAsPDF(sc, unit, lang, verses, isFeatureAllowed, showPaywall) {
  if (!isFeatureAllowed('kathaVaultDownload')) {
    showPaywall('kathaVaultDownload');
    return;
  }

  try {
    const isH = lang === 'hindi';
    const scName = isH ? sc.nameHi : sc.name;
    const uTitle = isH ? unit.tH : unit.t;

    let body = '';
    for (const v of verses) {
      const san  = v.sanskrit_full || '';
      const tika = isH ? (v.tika_hindi || v.tika_english || '') : (v.tika_english || v.tika_hindi || '');
      const rishi = v.gahan_drishti || '';
      const bal   = v.bal_seekh || '';

      body += `<div class="sh">🕉 ${v.verse_id}</div>`;
      if (san) body += `<div class="san">${san.replace(/\n/g,'<br/>')}</div>`;
      if (tika) body += `<div class="tika">${tika}</div>`;
      if (rishi) body += `<div class="rishi">🔱 ${rishi}</div>`;
      if (bal) body += `<div class="bal">🌟 ${bal}</div>`;
      body += `<hr/>`;
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
body{font-family:Georgia,serif;background:#FFFDF7;color:#2C1800;padding:24px;font-size:13px}
.brand{background:#8B4513;color:#FFF8E1;text-align:center;padding:10px;font-size:12px;margin-bottom:20px;}
.sh{background:#FFF3E0;border-left:4px solid #E8620A;padding:8px 12px;margin:18px 0 6px;font-weight:bold;color:#C45508;}
.san{background:#EDE7F6;border-radius:8px;padding:14px;margin:6px 0;font-size:18px;color:#4A148C;line-height:2.2;text-align:center;}
.tika{background:#FBE9E7;border-radius:6px;padding:10px;margin:6px 0;font-size:13px;line-height:1.7;}
.rishi{background:#EDE7F6;border-left:4px solid #9C27B0;padding:10px;margin:6px 0;font-size:12px;font-style:italic;}
.bal{background:rgba(255,215,0,0.1);border:1px solid #FFD700;padding:8px;margin:6px 0;font-size:12px;}
hr{border:0.5px solid #C9830A;margin:10px 0;opacity:0.3;}
.foot{border-top:1px solid #C9830A;margin-top:24px;padding-top:10px;text-align:center;font-size:11px;color:#8B4513;}
</style></head><body>
<div class="brand">🕉 DharmaSetu Gurukul — Preserving Sanatana Dharma | dharmasetu.in</div>
<h1 style="color:#8B4513;text-align:center">${scName}</h1>
<h2 style="color:#C9830A;text-align:center;font-weight:normal">${uTitle}</h2>
${body}
<div class="foot">🕉 DharmaSetu Gurukul | जय सनातन धर्म</div>
</body></html>`;

    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const ok = await Sharing.isAvailableAsync();
    if (ok) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    else Alert.alert('PDF Ready', uri);
  } catch (e) {
    try {
      await Share.share({
        message: verses.slice(0, 5).map(v => `${v.verse_id}\n${v.sanskrit_full || ''}\n${v.tika_hindi || v.tika_english || ''}`).join('\n\n'),
        title: 'DharmaSetu',
      });
    } catch { Alert.alert('Error', e.message); }
  }
}

// ═══════════════════════════════════════════════════════════════
// SHLOKA CARD
// ═══════════════════════════════════════════════════════════════
function ShlokaCard({ verse, lang, index }) {
  const [expanded, setExpanded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isH = lang === 'hindi';

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 350,
      delay: Math.min(index * 40, 500),
      useNativeDriver: true,
    }).start();
  }, []);

  const tika  = isH ? (verse.tika_hindi || verse.tika_english || '') : (verse.tika_english || verse.tika_hindi || '');
  const words = verse.word_meanings_grid || [];
  const rishi = verse.gahan_drishti || '';
  const bal   = verse.bal_seekh || '';
  const teach = verse.teaching || '';

  return (
    <Animated.View style={[vc.card, { opacity: fadeAnim }]}>
      <View style={vc.verseHdr}>
        <Text style={vc.omIcon}>ॐ</Text>
        <Text style={vc.verseId}>{verse.verse_id}</Text>
        {verse.speaker ? <Text style={vc.speaker}>{verse.speaker}</Text> : null}
      </View>

      {verse.sanskrit_full ? (
        <View style={vc.sanCard}>
          <Text style={vc.sanTxt}>{verse.sanskrit_full}</Text>
        </View>
      ) : null}

      {verse.roman_transliteration ? (
        <Text style={vc.romTxt}>{verse.roman_transliteration}</Text>
      ) : null}

      {words.length > 0 && (
        <View style={vc.vigrahaCard}>
          <Text style={vc.vigrahaHdr}>📚 {isH ? 'शब्द-अर्थ' : 'Word Meanings'}</Text>
          <View style={vc.vigrahaGrid}>
            {words.map((w, i) => (
              <View key={i} style={vc.chip}>
                <Text style={vc.chipWord}>{w.word}</Text>
                <Text style={vc.chipMeaning}>{w.meaning}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {tika ? (
        <View style={vc.tikaCard}>
          <Text style={vc.tikaLbl}>🔱 {isH ? 'गीता प्रेस तिका' : 'Gita Press Tika'}</Text>
          <Text style={vc.tikaTxt}>{tika}</Text>
        </View>
      ) : null}

      {teach ? (
        <View style={vc.bodhCard}>
          <Text style={vc.bodhTxt}>🕉 {teach}</Text>
        </View>
      ) : null}

      {rishi ? (
        <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
          <View style={vc.rishiCard}>
            <Text style={vc.rishiLbl}>🔱 {isH ? 'गहन दृष्टि' : 'Gahan Drishti'}</Text>
            {expanded
              ? <Text style={vc.rishiTxt}>{rishi}</Text>
              : <Text style={vc.rishiPreview}>{rishi.slice(0, 90)}... <Text style={vc.tapMore}>{isH ? 'पढ़ें ▼' : 'Read ▼'}</Text></Text>
            }
          </View>
        </TouchableOpacity>
      ) : null}

      {bal ? (
        <View style={vc.balCard}>
          <Text style={vc.balLbl}>🌟 {isH ? 'बाल-शिक्षा' : 'Bal-Seekh'}</Text>
          <Text style={vc.balTxt}>{bal}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const vc = StyleSheet.create({
  card:         { marginBottom: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(201,131,10,0.2)', backgroundColor: '#0F0600' },
  verseHdr:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(232,98,10,0.12)', paddingHorizontal: 14, paddingVertical: 10 },
  omIcon:       { fontSize: 16, color: '#E8620A', fontWeight: '800' },
  verseId:      { fontSize: 13, fontWeight: '800', color: '#E8620A', flex: 1 },
  speaker:      { fontSize: 10, color: 'rgba(253,246,237,0.35)', fontStyle: 'italic' },
  sanCard:      { backgroundColor: 'rgba(107,33,168,0.14)', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(107,33,168,0.2)' },
  sanTxt:       { color: '#D4A8FF', fontWeight: '600', textAlign: 'center', fontSize: 17, lineHeight: 34 },
  romTxt:       { color: 'rgba(212,168,255,0.65)', fontStyle: 'italic', paddingHorizontal: 14, paddingVertical: 6, fontSize: 12, lineHeight: 20 },
  vigrahaCard:  { backgroundColor: 'rgba(201,131,10,0.07)', padding: 12 },
  vigrahaHdr:   { fontSize: 11, fontWeight: '800', color: '#C9830A', marginBottom: 8 },
  vigrahaGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip:         { backgroundColor: 'rgba(201,131,10,0.12)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(201,131,10,0.28)' },
  chipWord:     { color: 'rgba(253,220,130,0.95)', fontWeight: '700', fontSize: 12 },
  chipMeaning:  { color: 'rgba(253,220,130,0.6)', fontSize: 11, marginTop: 1 },
  tikaCard:     { backgroundColor: 'rgba(232,98,10,0.07)', padding: 14 },
  tikaLbl:      { fontSize: 10, color: '#E8620A', fontWeight: '800', marginBottom: 6 },
  tikaTxt:      { color: 'rgba(253,246,237,0.9)', fontSize: 13, lineHeight: 24 },
  bodhCard:     { backgroundColor: 'rgba(39,174,96,0.07)', paddingHorizontal: 14, paddingVertical: 10 },
  bodhTxt:      { color: 'rgba(100,220,150,0.9)', fontWeight: '600', fontSize: 13 },
  rishiCard:    { backgroundColor: 'rgba(255,140,0,0.06)', padding: 14 },
  rishiLbl:     { fontSize: 10, color: '#FF8C00', fontWeight: '800', marginBottom: 6 },
  rishiTxt:     { color: 'rgba(255,220,150,0.95)', fontStyle: 'italic', lineHeight: 24, fontSize: 13 },
  rishiPreview: { color: 'rgba(255,220,150,0.7)', fontSize: 13, lineHeight: 20 },
  tapMore:      { color: '#FF8C00', fontWeight: '700' },
  balCard:      { backgroundColor: 'rgba(255,215,0,0.07)', padding: 12 },
  balLbl:       { fontSize: 10, color: '#FFD700', fontWeight: '800', marginBottom: 5 },
  balTxt:       { color: 'rgba(255,240,180,0.9)', fontSize: 12, lineHeight: 20 },
});

// ═══════════════════════════════════════════════════════════════
// CHAPTER READER
// ═══════════════════════════════════════════════════════════════
function ChapterReader({ visible, onClose, sc, unit, lang, isFeatureAllowed, showPaywall }) {
  const [verses,   setVerses]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [notReady, setNotReady] = useState(false);
  const insets = useSafeAreaInsets();
  const isH = lang === 'hindi';

  useEffect(() => {
    if (!visible || !sc || !unit) return;
    setVerses([]); setLoading(true); setNotReady(false);
    load();
  }, [visible, sc?.id, unit?.n, lang]);

  const load = async () => {
    const { verses: v } = await fetchChapter(sc, unit, lang);
    if (v && v.length > 0) setVerses(v);
    else setNotReady(true);
    setLoading(false);
  };

  const scTitle = isH ? sc?.nameHi : sc?.name;
  const uTitle  = isH ? unit?.tH   : unit?.t;

  const renderItem = useCallback(({ item, index }) => (
    <ShlokaCard verse={item} lang={lang} index={index} />
  ), [lang]);

  const keyExtractor = useCallback((item, i) => item.verse_id || String(i), []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[cr.root, { paddingTop: insets.top }]}>
        <StatusBar style="light" backgroundColor="#0A0300" />

        <View style={cr.hdr}>
          <TouchableOpacity onPress={onClose} style={cr.back} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
            <Text style={cr.backTxt}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={cr.hdrSc} numberOfLines={1}>{scTitle}</Text>
            <Text style={cr.hdrTitle} numberOfLines={1}>{uTitle}</Text>
          </View>
          {verses.length > 0 && (
            <TouchableOpacity style={cr.dlBtn}
              onPress={() => downloadAsPDF(sc, unit, lang, verses, isFeatureAllowed, showPaywall)}>
              <Text>⬇️</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={cr.shareBtn} onPress={() => {
            if (!verses.length) return;
            const preview = verses.slice(0, 3).map(v => `${v.verse_id}\n${v.sanskrit_full || ''}`).join('\n\n');
            Share.share({ message: `🕉 ${scTitle} — ${uTitle}\n\n${preview}\n\n— DharmaSetu Gurukul` });
          }}>
            <Text>📤</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={cr.center}>
            <ActivityIndicator size="large" color="#E8620A" />
            <Text style={cr.loadTxt}>{isH ? 'शास्त्र लोड हो रहे हैं...' : 'Loading scripture...'}</Text>
            <Text style={cr.loadSub}>{isH ? 'पहली बार थोड़ा समय लगेगा' : 'First load may take a moment'}</Text>
          </View>
        ) : notReady ? (
          <View style={cr.center}>
            <Text style={{ fontSize: 44, marginBottom: 16 }}>🕉</Text>
            <Text style={cr.notReadyTitle}>{isH ? 'शीघ्र आ रहा है' : 'Coming Soon'}</Text>
            <Text style={cr.notReadyTxt}>
              {isH
                ? 'यह अध्याय हमारे विद्वान तैयार कर रहे हैं।\nजल्द ही उपलब्ध होगा। 🙏'
                : 'Our scholars are preparing this chapter.\nCheck back soon. 🙏'}
            </Text>
            <TouchableOpacity style={cr.retryBtn} onPress={() => { setLoading(true); setNotReady(false); load(); }}>
              <Text style={cr.retryTxt}>{isH ? 'दोबारा जांचें' : 'Check Again'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlashList
            data={verses}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            estimatedItemSize={320}
            contentContainerStyle={{ padding: 14 }}
            ListHeaderComponent={() => (
              <View style={{ alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.1)' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#F4A261', textAlign: 'center', marginBottom: 4 }}>{uTitle}</Text>
                <Text style={{ fontSize: 11, color: 'rgba(253,246,237,0.3)' }}>
                  {verses.length}/{unit?.s} {isH ? 'श्लोक' : 'verses'}
                </Text>
              </View>
            )}
            ListFooterComponent={() => (
              <View style={{ alignItems: 'center', paddingVertical: 24, borderTopWidth: 1, borderTopColor: 'rgba(240,165,0,0.1)' }}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>🕉</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#F4A261' }}>
                  {uTitle} — {isH ? 'पाठ पूर्ण' : 'Complete'}
                </Text>
                {verses.length > 0 && (
                  <TouchableOpacity
                    style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(232,98,10,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(232,98,10,0.25)' }}
                    onPress={() => downloadAsPDF(sc, unit, lang, verses, isFeatureAllowed, showPaywall)}>
                    <Text>⬇️</Text>
                    <Text style={{ fontSize: 12, color: '#F4A261', fontWeight: '700' }}>
                      {isH ? 'PDF Download (Premium)' : 'Download PDF (Premium)'}
                    </Text>
                  </TouchableOpacity>
                )}
                <Text style={{ fontSize: 12, color: '#C9830A', marginTop: 12 }}>
                  🕉 DharmaSetu Gurukul — Preserving Sanatana Dharma
                </Text>
                <View style={{ height: insets.bottom + 20 }} />
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const cr = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#080200' },
  hdr:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.12)', gap: 6 },
  back:          { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(240,165,0,0.18)' },
  backTxt:       { fontSize: 20, color: '#F4A261', fontWeight: '600' },
  hdrSc:         { fontSize: 10, color: '#C9830A', fontWeight: '600', marginBottom: 1 },
  hdrTitle:      { fontSize: 13, fontWeight: '800', color: '#F4A261' },
  dlBtn:         { padding: 8, borderRadius: 8, backgroundColor: 'rgba(39,174,96,0.12)', borderWidth: 1, borderColor: 'rgba(39,174,96,0.3)' },
  shareBtn:      { padding: 8, borderRadius: 8, backgroundColor: 'rgba(232,98,10,0.1)', borderWidth: 1, borderColor: 'rgba(232,98,10,0.25)' },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  loadTxt:       { fontSize: 15, color: '#F4A261', textAlign: 'center', marginTop: 16, fontWeight: '700' },
  loadSub:       { fontSize: 12, color: 'rgba(253,246,237,0.45)', marginTop: 6, textAlign: 'center' },
  notReadyTitle: { fontSize: 20, fontWeight: '800', color: '#F4A261', marginBottom: 10 },
  notReadyTxt:   { fontSize: 14, color: 'rgba(253,246,237,0.6)', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  retryBtn:      { backgroundColor: 'rgba(232,98,10,0.15)', paddingHorizontal: 24, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(232,98,10,0.35)' },
  retryTxt:      { fontSize: 14, color: '#F4A261', fontWeight: '700' },
});

// ═══════════════════════════════════════════════════════════════
// UNIT LIST
// ═══════════════════════════════════════════════════════════════
function UnitList({ visible, onClose, sc, lang, onSelect }) {
  const [prog, setProg] = useState({});
  const insets = useSafeAreaInsets();
  const isH = lang === 'hindi';
  useEffect(() => { if (visible && sc) getProgress(sc.id).then(setProg); }, [visible, sc?.id]);
  if (!sc) return null;
  const rc = Object.keys(prog).length, tot = sc.units?.length || 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[ul.root, { paddingTop: insets.top }]}>
        <StatusBar style="light" backgroundColor="#0D0500" />
        <View style={ul.hdr}>
          <TouchableOpacity onPress={onClose} style={ul.back} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
            <Text style={ul.backTxt}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={ul.hTitle}>{isH ? sc.nameHi : sc.name}</Text>
            <Text style={ul.hSub} numberOfLines={2}>{isH ? sc.descHi : sc.desc}</Text>
          </View>
        </View>
        <View style={ul.progBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={ul.progLbl}>{isH ? `${rc}/${tot} पढ़े` : `${rc}/${tot} read`}</Text>
            <Text style={[ul.progPct, { color: sc.color }]}>{Math.round((rc / Math.max(tot, 1)) * 100)}%</Text>
          </View>
          <View style={ul.progTrack}>
            <View style={[ul.progFill, { width: `${Math.round((rc / Math.max(tot, 1)) * 100)}%`, backgroundColor: sc.color }]} />
          </View>
        </View>
        <FlashList
          data={sc.units || []}
          estimatedItemSize={72}
          contentContainerStyle={{ padding: 14 }}
          keyExtractor={(item) => String(item.n)}
          renderItem={({ item: unit }) => {
            const done = !!prog[unit.n];
            return (
              <TouchableOpacity
                style={[ul.card, { borderColor: done ? sc.color + '45' : 'rgba(200,130,40,0.12)', backgroundColor: done ? sc.color + '08' : '#130700', marginBottom: 8 }]}
                onPress={() => onSelect(unit)} activeOpacity={0.85}>
                <View style={[ul.num, { backgroundColor: sc.color + '1A', borderColor: sc.color + '45' }]}>
                  <Text style={[ul.numTxt, { color: sc.color }]}>{unit.n}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ul.uTitle}>{isH ? unit.tH : unit.t}</Text>
                  {unit.s ? <Text style={ul.uMeta}>{unit.s} {isH ? 'श्लोक' : 'verses'}</Text> : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  {done ? <Text style={{ fontSize: 12, color: '#27AE60', fontWeight: '800' }}>✓</Text> : null}
                  <Text style={{ fontSize: 20, color: 'rgba(253,246,237,0.2)' }}>›</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={<View style={{ height: insets.bottom + 20 }} />}
        />
      </View>
    </Modal>
  );
}

const ul = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#0D0500' },
  hdr:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.1)', gap: 12 },
  back:     { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(240,165,0,0.2)' },
  backTxt:  { fontSize: 20, color: '#F4A261', fontWeight: '600' },
  hTitle:   { fontSize: 17, fontWeight: '800', color: '#F4A261', marginBottom: 2 },
  hSub:     { fontSize: 10, color: 'rgba(253,246,237,0.38)', lineHeight: 15 },
  progBox:  { marginHorizontal: 16, marginVertical: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(240,165,0,0.08)' },
  progLbl:  { fontSize: 11, color: 'rgba(253,246,237,0.42)', fontWeight: '600' },
  progPct:  { fontSize: 11, fontWeight: '800' },
  progTrack:{ height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  progFill: { height: 4, borderRadius: 2 },
  card:     { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1 },
  num:      { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  numTxt:   { fontSize: 14, fontWeight: '800' },
  uTitle:   { fontSize: 13, fontWeight: '700', color: '#FDF6ED', marginBottom: 2 },
  uMeta:    { fontSize: 10, color: 'rgba(253,246,237,0.22)', marginTop: 1 },
});

// ═══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════
export default function KathaVault() {
  const insets = useSafeAreaInsets();
  const [lang,       setLang]      = useState('hindi');
  const [allProg,    setAllProg]   = useState({});
  const [selSc,      setSelSc]     = useState(null);
  const [selUnit,    setSelUnit]   = useState(null);
  const [showUnits,  setShowUnits] = useState(false);
  const [showReader, setShowReader]= useState(false);
  const { isFeatureAllowed, showPaywall, PaywallModal } = usePremiumCheck();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('dharmasetu_user');
      if (raw) { const u = JSON.parse(raw); setLang(u.language || 'hindi'); }
      refresh();
    })();
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const refresh = useCallback(async () => {
    const p = {};
    for (const sc of SCRIPTURES) { p[sc.id] = await getProgress(sc.id); }
    setAllProg(p);
  }, []);

  const isH = lang === 'hindi';

  return (
    <View style={[ms.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#0D0500" />
      <View style={ms.hdr}>
        <TouchableOpacity onPress={() => router.back()} style={ms.back} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <Text style={ms.backTxt}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={ms.hTitle}>{isH ? 'DharmaSetu Gurukul' : 'DharmaSetu Gurukul'}</Text>
          <Text style={ms.hSub}>{isH ? 'सनातन धर्म की रक्षा' : 'Preserving Sanatana Dharma'}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {[{ id: 'hindi', l: 'हिं' }, { id: 'english', l: 'EN' }].map(({ id, l }) => (
            <TouchableOpacity key={id} style={[ms.lBtn, lang === id && ms.lBtnOn]} onPress={() => setLang(id)}>
              <Text style={[ms.lTxt, lang === id && ms.lTxtOn]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlashList
        data={SCRIPTURES}
        estimatedItemSize={160}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 14 }}
        renderItem={({ item: sc }) => {
          const p   = allProg[sc.id] || {};
          const rc  = Object.keys(p).length;
          const tot = sc.units?.length || 1;
          const pct = Math.round((rc / tot) * 100);

          return (
            <Animated.View style={{ opacity: fade, marginBottom: 12 }}>
              <TouchableOpacity
                style={[ms.card, { borderColor: sc.color + '30', opacity: sc.live ? 1 : 0.8 }]}
                onPress={() => { if (!sc.live) return; setSelSc(sc); setShowUnits(true); }}
                activeOpacity={sc.live ? 0.88 : 1}>
                <View style={ms.cardTop}>
                  <View style={[ms.iconBox, { backgroundColor: sc.color + '18' }]}>
                    <Text style={{ fontSize: 26 }}>{sc.icon}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={ms.scName}>{isH ? sc.nameHi : sc.name}</Text>
                    <Text style={ms.scDesc} numberOfLines={2}>{isH ? sc.descHi : sc.desc}</Text>
                    {!sc.live && (
                      <View style={{ marginTop: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' }}>
                        <Text style={{ fontSize: 10, color: 'rgba(253,246,237,0.4)', fontWeight: '700' }}>
                          {isH ? 'जल्द आएगा' : 'Coming Soon'}
                        </Text>
                      </View>
                    )}
                  </View>
                  {sc.live ? <Text style={{ fontSize: 20, color: 'rgba(253,246,237,0.2)' }}>›</Text> : null}
                </View>

                {sc.live && (
                  <View style={{ marginTop: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                      <Text style={ms.progLbl}>{isH ? `${rc}/${tot} पढ़े` : `${rc}/${tot} read`}</Text>
                      <Text style={[ms.progPct, { color: sc.color }]}>{pct}%</Text>
                    </View>
                    <View style={ms.progTrack}>
                      <View style={[ms.progFill, { width: `${pct}%`, backgroundColor: sc.color }]} />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        }}
        ListFooterComponent={<View style={{ height: insets.bottom + 24 }} />}
      />

      <UnitList
        visible={showUnits}
        onClose={() => { setShowUnits(false); refresh(); }}
        sc={selSc}
        lang={lang}
        onSelect={unit => { setSelUnit(unit); setShowReader(true); }}
      />
      <ChapterReader
        visible={showReader}
        onClose={() => { setShowReader(false); refresh(); }}
        sc={selSc}
        unit={selUnit}
        lang={lang}
        isFeatureAllowed={isFeatureAllowed}
        showPaywall={showPaywall}
      />
      <PaywallModal />
    </View>
  );
}

const ms = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#0D0500' },
  hdr:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.1)' },
  back:      { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(240,165,0,0.2)' },
  backTxt:   { fontSize: 20, color: '#F4A261', fontWeight: '600' },
  hTitle:    { fontSize: 17, fontWeight: '800', color: '#F4A261' },
  hSub:      { fontSize: 11, color: 'rgba(253,246,237,0.38)', marginTop: 2 },
  lBtn:      { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(200,130,40,0.2)' },
  lBtnOn:    { backgroundColor: 'rgba(232,98,10,0.15)', borderColor: '#E8620A' },
  lTxt:      { fontSize: 12, color: 'rgba(253,246,237,0.4)', fontWeight: '700' },
  lTxtOn:    { color: '#F4A261' },
  card:      { backgroundColor: '#130700', borderRadius: 18, padding: 16, borderWidth: 1 },
  cardTop:   { flexDirection: 'row', alignItems: 'center' },
  iconBox:   { width: 54, height: 54, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  scName:    { fontSize: 16, fontWeight: '800', color: '#FDF6ED', marginBottom: 3 },
  scDesc:    { fontSize: 11, color: 'rgba(253,246,237,0.38)', lineHeight: 16 },
  progLbl:   { fontSize: 10, color: 'rgba(253,246,237,0.38)' },
  progPct:   { fontSize: 10, fontWeight: '800' },
  progTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  progFill:  { height: 4, borderRadius: 2 },
});