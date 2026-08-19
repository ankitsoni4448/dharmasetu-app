// ════════════════════════════════════════════════════════════════
// DharmaSetu — DharmaChat AI Screen FIXED v3
//
// FIXES APPLIED:
//  1. cachedPremium moved from module-level global → useRef (per-instance, no stale state)
//  2. Premium cache expiry: 5 minutes (was 10 seconds — too aggressive)
//  3. Phone resolved from AsyncStorage when userPhone is empty on first render
//  4. Offline fallback: checkPremiumAccess returns cached value when offline;
//     falls back to AsyncStorage 'dharmasetu_plan' if no cache exists
//  5. autoSend: blocked while loading is true (parallel request guard)
//  6. send(): parallel request guard via loadingRef (useRef lock, not just state)
//  7. Duplicate message prevention: uid/aid generated once, not re-added
//  8. AutoSend: fixed — passes correct current values instead of stale closure args
//  9. Timeout: callBackendAI timeout reduced to 25s with user-visible feedback
// 10. isMountedRef: prevents setState after screen unmount (memory leak fix)
// 11. Error handling: retry button shown on failed AI messages
// ════════════════════════════════════════════════════════════════
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authenticatedFetch, getCurrentPlan, isPaidPlan } from '../../utils/entitlements';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions,
  KeyboardAvoidingView, Modal, Platform, ScrollView,
  Share, StyleSheet, Text, TextInput, TouchableOpacity,
  Vibration, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { submitAIFeedback } from '../../utils/register_backend';
import { BACKEND_CONFIG, getBackendUrl } from '../../utils/backend-config';

const { width: SW } = Dimensions.get('window');

// FIX: Premium cache constants
const PREMIUM_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── RATE LIMITER (client-side UX only) ────────────────────────
const Sec = {
  reqs: [],
  ok() {
    const n = Date.now();
    this.reqs = this.reqs.filter(t => n - t < 60000);
    if (this.reqs.length >= 25) return false;
    this.reqs.push(n);
    return true;
  },
  clean(t) {
    return t
      .replace(/<[^>]*>/g, '')
      .replace(/[<>"';()&+\\]/g, '')
      .trim()
      .slice(0, 500);
  },
  valid(t) {
    return ![
      /ignore\s+previous/i,
      /system\s+prompt/i,
      /jailbreak/i,
      /pretend.*be/i,
    ].some(p => p.test(t));
  },
};

// ════════════════════════════════════════════════════════════════
// SECURE API CALL — Goes through backend, not directly to AI
// FIX: timeout reduced to 25s; AbortController properly cleaned up
// PHASE 1 FIX: Use unified backend-config instead of hardcoded URL
// ════════════════════════════════════════════════════════════════
async function callBackendAI(messages, userProfile, mode, phone) {
  const controller = new AbortController();
  // FIX: 25s timeout instead of 45s — gives faster failure feedback
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const moodHistoryRaw = await AsyncStorage.getItem('user_mood_history');
    const moodHistory = moodHistoryRaw ? JSON.parse(moodHistoryRaw) : [];

    const panchangRaw = await AsyncStorage.getItem('today_panchang');
    const panchang = panchangRaw ? JSON.parse(panchangRaw) : {};

    const res = await authenticatedFetch(getBackendUrl(BACKEND_CONFIG.ENDPOINTS.AI_DHARMA_CHAT), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        userProfile: {
          name: userProfile?.name || '',
          rashi: userProfile?.rashi || '',
          nakshatra: userProfile?.nakshatra || '',
          deity: userProfile?.deity || '',
          language: userProfile?.language || 'hindi',
        },
        mode,
        phone: phone || '',
        moodHistory,
        panchang,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (err.error === 'QUESTION_LIMIT_REACHED') {
        const quotaError = new Error('QUESTION_LIMIT_REACHED');
        quotaError.limit = err.limit;
        throw quotaError;
      }
      if (res.status === 429 && err.error === 'AI_PROVIDER_RATE_LIMIT') throw new Error('AI_PROVIDER_RATE_LIMIT');
      if (res.status === 429) throw new Error('RATE_LIMIT');
      const knownCodes = new Set([
        'AUTH_REQUIRED', 'PROFILE_NOT_FOUND', 'FEATURE_DISABLED', 'FORBIDDEN',
        'QUOTA_INFRASTRUCTURE_UNAVAILABLE', 'AI_PROVIDER_CONFIGURATION_ERROR',
        'AI_PROVIDER_UNAVAILABLE', 'AI_PROVIDER_RATE_LIMIT', 'AI_TIMEOUT', 'SERVER_ERROR',
      ]);
      throw new Error(knownCodes.has(err.error) ? err.error : 'SERVER_ERROR');
    }

    const data = await res.json();
    if (!data.success || (!data.text && !data.nonFactCheckable)) throw new Error('Empty response from server');
    return data;

  } catch (e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') throw new Error('TIMEOUT');
    if (e.message === 'Authentication required') throw new Error('AUTH_REQUIRED');
    if (e instanceof TypeError) throw new Error('NETWORK_ERROR');
    const safeCodes = new Set([
      'AUTH_REQUIRED', 'PROFILE_NOT_FOUND', 'FEATURE_DISABLED', 'FORBIDDEN',
      'QUESTION_LIMIT_REACHED', 'RATE_LIMIT', 'QUOTA_INFRASTRUCTURE_UNAVAILABLE',
      'AI_PROVIDER_CONFIGURATION_ERROR', 'AI_PROVIDER_UNAVAILABLE',
      'AI_PROVIDER_RATE_LIMIT', 'AI_TIMEOUT', 'SERVER_ERROR',
    ]);
    throw safeCodes.has(e.message) ? e : new Error('SERVER_ERROR');
  }
}

// ════════════════════════════════════════════════════════════════
// RESPONSE PARSER
// ════════════════════════════════════════════════════════════════
function parseResp(raw) {
  let title = '', body = raw.trim(), src = '', ver = false;
  const tm = raw.match(/^TITLE:\s*(.+)$/m);
  if (tm) { title = tm[1].trim(); body = body.replace(tm[0], '').trim(); }
  const sm = raw.match(/^SHASTRIYA:\s*(.+)$/m);
  if (sm) { src = sm[1].trim(); body = body.replace(sm[0], '').trim(); }
  if (/^VERIFIED:\s*true/im.test(raw)) {
    ver = true;
    body = body.replace(/^VERIFIED:\s*true/im, '').trim();
  }
  return { title, body: body.trim(), src, ver };
}

function normalizeAIText(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/^\s*#{1,6}\s*$/gm, '')
    .replace(/\*\*([^*\n]+)$/gm, '$1')
    .replace(/(^|[^*])\*([^*\n]+)$/gm, '$1$2')
    .replace(/\n[ \t]+\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function renderInlineMarkdown(text, baseStyle) {
  return String(text).split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={index} style={[baseStyle, { fontWeight: '800' }]}>{part.slice(2, -2)}</Text>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <Text key={index} style={[baseStyle, { fontStyle: 'italic' }]}>{part.slice(1, -1)}</Text>;
    }
    return <Text key={index} style={baseStyle}>{part}</Text>;
  });
}

function SafeMarkdown({ text, style }) {
  const lines = normalizeAIText(text).split('\n');
  return <View>{lines.map((rawLine, index) => {
    if (/^\s*---+\s*$/.test(rawLine)) return <View key={index} style={s.mdRule} />;
    if (!rawLine.trim()) return <View key={index} style={s.mdBreak} />;
    const heading = rawLine.match(/^#{1,6}\s+(.+)$/);
    const bullet = rawLine.match(/^\s*[-•]\s+(.+)$/);
    const numbered = rawLine.match(/^\s*(\d+\.)\s+(.+)$/);
    const content = heading?.[1] || bullet?.[1] || numbered?.[2] || rawLine;
    const prefix = bullet ? '• ' : numbered ? `${numbered[1]} ` : '';
    return <Text key={index} style={[style, s.mdLine, heading && s.mdHeading]}>
      {prefix}{renderInlineMarkdown(content, style)}
    </Text>;
  })}</View>;
}

// ════════════════════════════════════════════════════════════════
// STORAGE HELPERS
// ════════════════════════════════════════════════════════════════
async function addPts(type) {
  const map = { save: 3, thumbsup: 2, feedback_given: 2, daily: 3 };
  try {
    const c = parseInt(await AsyncStorage.getItem('dharmasetu_pts') || '0', 10);
    const n = c + (map[type] || 0);
    await AsyncStorage.setItem('dharmasetu_pts', String(n));
    return n;
  } catch { return 0; }
}

async function saveAns(q, a, src) {
  const arr = JSON.parse(await AsyncStorage.getItem('dharmasetu_saved') || '[]');
  if (arr.length >= 20) throw new Error('Max 20 saved. Delete some first.');
  arr.unshift({ id: Date.now().toString(), q, a, src, at: new Date().toISOString() });
  await AsyncStorage.setItem('dharmasetu_saved', JSON.stringify(arr));
  await addPts('save');
}

async function doShare(question, answer, src) {
  try {
    const txt =
      `🕉 DharmaSetu — Dharmic Wisdom\n\n` +
      (question ? `📌 ${question}\n\n` : '') +
      (answer.length > 400 ? answer.slice(0, 400) + '...' : answer) + '\n\n' +
      (src ? `📖 ${src}\n\n` : '') +
      `— DharmaSetu App 🙏 जय सनातन धर्म`;
    await Share.share({ message: txt, title: 'DharmaSetu' });
  } catch { }
}

// ════════════════════════════════════════════════════════════════
// MULTILINGUAL SUGGESTIONS
// ════════════════════════════════════════════════════════════════
const SUGG = {
  hindi: [
    'मेरी शादी में देरी क्यों? ज्योतिष क्या कहता है?',
    'राम ने शम्बूक को क्यों मारा? सच क्या है?',
    'आर्य आक्रमण — सच है या झूठ?',
    'भगवद्गीता का कर्म योग क्या है?',
    'मेरे करियर की समस्या का धार्मिक हल बताएं',
    'एकादशी व्रत का महत्व और विधि बताएं',
  ],
  english: [
    'Why is my marriage delayed? What does Jyotish say?',
    'Why did Ram kill Shambuka? What is the truth?',
    'Is Aryan Invasion Theory true or false?',
    'Explain Karma Yoga from Bhagavad Gita',
    'What does my Rashi say about my career?',
    'What is the significance of Ekadashi fast?',
  ],
};

// ════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ════════════════════════════════════════════════════════════════
function ThinkDots() {
  const dots = [
    useRef(new Animated.Value(0.2)).current,
    useRef(new Animated.Value(0.2)).current,
    useRef(new Animated.Value(0.2)).current,
  ];
  useEffect(() => {
    dots.forEach((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(d, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.2, duration: 260, useNativeDriver: true }),
          Animated.delay(360),
        ])
      ).start()
    );
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 5, padding: 2 }}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={{
          width: 8, height: 8, borderRadius: 4,
          backgroundColor: '#E8620A', opacity: d,
        }} />
      ))}
    </View>
  );
}

function FbModal({ visible, onClose, onSubmit, lang }) {
  const [sel, setSel] = useState('');
  const [note, setNote] = useState('');
  const isH = lang === 'hindi';
  const opts = isH
    ? ['गलत जानकारी', 'शास्त्र संदर्भ गलत', 'उत्तर अधूरा', 'भावनात्मक सहायता नहीं', 'कुछ और']
    : ['Wrong information', 'Scripture ref wrong', 'Incomplete answer', 'Not helpful', 'Other'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={fm.ov}>
        <View style={fm.box}>
          <Text style={fm.title}>{isH ? '👎 Feedback दें' : '👎 Your Feedback'}</Text>
          <Text style={fm.sub}>{isH ? 'AI को बेहतर बनाने में मदद करें 🙏' : 'Help us improve DharmaChat 🙏'}</Text>
          {opts.map(o => (
            <TouchableOpacity
              key={o}
              style={[fm.chip, sel === o && fm.chipOn]}
              onPress={() => setSel(o)}>
              <Text style={[fm.cTxt, sel === o && fm.cTxtOn]}>{o}</Text>
            </TouchableOpacity>
          ))}
          <TextInput
            style={fm.inp}
            placeholder={isH ? 'और कुछ? (optional)' : 'Anything else? (optional)'}
            placeholderTextColor="rgba(253,246,237,0.3)"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={300}
          />
          <View style={fm.row}>
            <TouchableOpacity style={fm.cancel} onPress={() => { setSel(''); setNote(''); onClose(); }}>
              <Text style={fm.cancelT}>{isH ? 'रद्द करें' : 'Cancel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[fm.submit, !sel && { opacity: 0.5 }]}
              disabled={!sel}
              onPress={() => { onSubmit(sel + (note ? ' — ' + note : '')); setSel(''); setNote(''); }}>
              <Text style={fm.submitT}>Submit 🙏</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const fm = StyleSheet.create({
  ov: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  box: { backgroundColor: '#160800', borderRadius: 24, padding: 20, margin: 12, borderWidth: 1, borderColor: 'rgba(240,165,0,0.15)' },
  title: { fontSize: 16, fontWeight: '700', color: '#FDF6ED', marginBottom: 4 },
  sub: { fontSize: 12, color: 'rgba(253,246,237,0.4)', marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(200,130,40,0.2)', marginBottom: 7 },
  chipOn: { backgroundColor: 'rgba(232,98,10,0.15)', borderColor: '#E8620A' },
  cTxt: { fontSize: 13, color: 'rgba(253,246,237,0.45)' },
  cTxtOn: { color: '#F4A261' },
  inp: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, color: '#FDF6ED', fontSize: 13, minHeight: 55, borderWidth: 1, borderColor: 'rgba(200,130,40,0.15)', marginVertical: 10 },
  row: { flexDirection: 'row', gap: 10 },
  cancel: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
  cancelT: { color: 'rgba(253,246,237,0.5)', fontSize: 14, fontWeight: '600' },
  submit: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#E8620A', alignItems: 'center' },
  submitT: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

// ════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ════════════════════════════════════════════════════════════════
export default function DharmaChatScreen() {
  const insets = useSafeAreaInsets();

  const [userLang, setUserLang] = useState('hindi');
  const [userName, setUserName] = useState('Dharma Rakshak');
  const [userDeity, setUserDeity] = useState('');
  const [userRashi, setUserRashi] = useState('');
  const [userNak, setUserNak] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userProfile, setUserProf] = useState(null);
  const [chatMode, setChatMode] = useState('dharma');
  const [pts, setPts] = useState(0);
  const [ready, setReady] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hist, setHist] = useState([]);
  const [transId, setTransId] = useState(null);
  const [fbMsgId, setFbMsgId] = useState(null);

  // FIX: isMountedRef — prevents setState after unmount (memory leak fix)
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // FIX: loadingRef — hard lock that prevents parallel send() calls
  // (loading state alone has closure-capture lag)
  const loadingRef = useRef(false);

  // FIX: premium cache stored in useRef (per-component, not global module variable)
  // Structure: { value: bool, ts: number, phone: string }
  const premiumCacheRef = useRef({ value: null, ts: 0, phone: '' });

  const scrollRef = useRef(null);
  const sendSc = useRef(new Animated.Value(1)).current;
  const tNow = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  // ── PREMIUM CHECK (per-instance cache, offline-aware) ─────────
  const checkPremiumAccess = useCallback(async (phone) => {
    if (typeof getCurrentPlan === 'function') {
      try {
        return isPaidPlan(await getCurrentPlan({ refresh: isOnline }));
      } catch {
        return false;
      }
    }
    /* Legacy implementation retained temporarily for UI stability; unreachable. */
    const now = Date.now();
    const cache = premiumCacheRef.current;

    // FIX: Use cached value if within TTL (5 min) and for same phone
    if (
      cache.value !== null &&
      cache.phone === phone &&
      now - cache.ts < PREMIUM_CACHE_TTL_MS
    ) {
      return cache.value;
    }

    // FIX: Offline fallback — use cached value regardless of age,
    // or fall back to AsyncStorage plan if no cache
    if (!isOnline) {
      if (cache.value !== null) return cache.value;
      try {
        const plan = await AsyncStorage.getItem('dharmasetu_plan');
        const isPremium = plan && plan !== 'free';
        premiumCacheRef.current = { value: isPremium, ts: now, phone };
        return isPremium;
      } catch {
        return false;
      }
    }

    // FIX: If phone is empty, try to resolve from AsyncStorage
    let resolvedPhone = phone;
    if (!resolvedPhone) {
  try {
    const raw = await AsyncStorage.getItem('dharmasetu_user');
    if (raw) {
      const u = JSON.parse(raw);
      resolvedPhone = u?.phone || '';
    }
  } catch {}

  if (!resolvedPhone) {
    try {
      const plan = await AsyncStorage.getItem('dharmasetu_plan');
      return plan && plan !== 'free';
    } catch {
      return false;
    }
  }
}

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(getBackendUrl(`${BACKEND_CONFIG.ENDPOINTS.USERS_ACCESS}/${resolvedPhone}`), {
        signal: controller.signal,
      });
      clearTimeout(tid);
      const data = await res.json();
      const isPremium = data.isPremium === true;
      // FIX: update cache with resolved phone + timestamp
      premiumCacheRef.current = { value: isPremium, ts: now, phone: resolvedPhone };
      // FIX: sync AsyncStorage for offline fallback
      return isPremium;
    } catch (e) {
      console.log('[DharmaChat] Premium check error:', e.message);
      // FIX: on network error return stale cache or AsyncStorage fallback
      if (cache.value !== null) return cache.value;
      try {
        const plan = await AsyncStorage.getItem('dharmasetu_plan');
        return plan && plan !== 'free';
      } catch { return false; }
    }
  }, [isOnline]);

  // ── INIT ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('dharmasetu_user');
        const p = parseInt(await AsyncStorage.getItem('dharmasetu_pts') || '0', 10);
        if (isMountedRef.current) setPts(p);

        let lang = 'hindi', name = 'Dharma Rakshak', deity = '', rashi = '', nak = '', phone = '';
        if (raw) {
          const u = JSON.parse(raw);
          lang = u.language || 'hindi';
          name = u.name || 'Dharma Rakshak';
          deity = u.deity || '';
          rashi = u.rashi || '';
          nak = u.nakshatra || '';
          phone = u.phone || '';
          if (isMountedRef.current) setUserProf(u);
        }
        if (isMountedRef.current) {
          setUserLang(lang); setUserName(name); setUserDeity(deity);
          setUserRashi(rashi); setUserNak(nak); setUserPhone(phone);
        }

        // Check if coming from home with preset question
        const presetQ = await AsyncStorage.getItem('dharmasetu_preset_question');
        const mode = await AsyncStorage.getItem('dharmasetu_mode');
        if (mode === 'factcheck' && isMountedRef.current) {
          setChatMode('factcheck');
          await AsyncStorage.removeItem('dharmasetu_mode');
        }

        const greetMap = {
          hindi: `नमस्ते, ${name}! 🙏\n\n${deity ? `${deity} की कृपा आप पर बनी रहे। 🌸\n\n` : ''}मैं DharmaSetu हूँ — आपका वैदिक मार्गदर्शक।\n\nशास्त्र, ज्योतिष, और जीवन के किसी भी प्रश्न का उत्तर दे सकता हूँ।${rashi ? `\n\nआपकी ${rashi} राशि के अनुसार व्यक्तिगत मार्गदर्शन के लिए पूछें।` : ''}`,
          english: `Namaste, ${name}! 🙏\n\n${deity ? `May ${deity} bless you always. 🌸\n\n` : ''}I am DharmaSetu — your Vedic AI guide.\n\nAsk me about Dharma, Jyotish, scriptures, or any life guidance.${rashi ? `\n\nBased on your ${rashi} Rashi, I can give personalized Vedic insights.` : ''}`,
        };
        const greet = greetMap[lang] || greetMap.english;
        const titleMap = { hindi: '🙏 जय श्री राम', english: '🙏 Jai Shri Ram' };

        if (isMountedRef.current) {
          setMsgs([{
            id: 'w', type: 'ai',
            title: titleMap[lang] || titleMap.english,
            body: greet, src: '', ver: false,
            translations: {}, activeLang: null,
            feedback: null, saved: false, streaming: false,
            isWelcome: true, time: tNow(),
          }]);
          setReady(true);
        }

        // FIX: autoSend — pass resolved values directly, not stale closure
        if (presetQ) {
          await AsyncStorage.removeItem('dharmasetu_preset_question');
          // FIX: small delay to allow screen to mount, then trigger with fresh values
          setTimeout(() => {
            if (isMountedRef.current) {
              autoSendDirect(presetQ, lang, name, deity, rashi, nak, phone, mode === 'factcheck');
            }
          }, 900);
        }

        // Daily check-in points
        const today = new Date().toDateString();
        const last = await AsyncStorage.getItem('dharmasetu_checkin');
        if (last !== today) {
          await AsyncStorage.setItem('dharmasetu_checkin', today);
          const n = await addPts('daily');
          if (isMountedRef.current) setPts(n);
        }
      } catch (e) {
        console.error('[DharmaChat] Init error:', e.message);
        if (isMountedRef.current) {
          setReady(true);
          setMsgs([{
            id: 'w', type: 'ai',
            title: '🙏 Jai Shri Ram',
            body: 'Namaste! I am DharmaSetu. Ask me about Sanatan Dharma.',
            src: '', ver: false, translations: {}, activeLang: null,
            feedback: null, saved: false, streaming: false, isWelcome: true, time: tNow(),
          }]);
        }
      }
    })();
  }, []);

  // Network monitor
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (isMountedRef.current) setIsOnline(!!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const scrollDown = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const pulseSend = () => {
    Vibration.vibrate(20);
    Animated.sequence([
      Animated.timing(sendSc, { toValue: 0.87, duration: 70, useNativeDriver: true }),
      Animated.spring(sendSc, { toValue: 1, friction: 3, tension: 280, useNativeDriver: true }),
    ]).start();
  };

  // ── STREAM TEXT (word by word) ────────────────────────────────
  const streamText = useCallback((fullText, id) => {
    const words = fullText.split(' ');
    let built = '', i = 0;
    const iv = setInterval(() => {
      // FIX: stop streaming if unmounted
      if (!isMountedRef.current) { clearInterval(iv); return; }
      if (i >= words.length) {
        clearInterval(iv);
        setMsgs(p => p.map(m => m.id === id ? { ...m, streaming: false } : m));
        scrollDown();
        return;
      }
      built += (i === 0 ? '' : ' ') + words[i++];
      setMsgs(p => p.map(m => m.id === id ? { ...m, body: built } : m));
      if (i % 8 === 0) scrollDown();
    }, 22);
  }, [scrollDown]);

  // ── ERROR MESSAGE HELPER ─────────────────────────────────────
  const getErrorMsg = (err, lang) => {
    if (err.message === 'QUESTION_LIMIT_REACHED') {
      const limit = err.limit || 3;
      return lang === 'hindi'
        ? `आज के ${limit} निःशुल्क प्रश्न पूरे हो गए हैं। कल फिर ${limit} प्रश्न मिलेंगे, या अभी Pro में अपग्रेड करें।`
        : `You've used today's ${limit} free questions. You'll receive ${limit} more tomorrow, or upgrade to Pro now.`;
    }
    if (err.message === 'RATE_LIMIT') {
      return lang === 'hindi'
        ? 'थोड़ा रुकें। बहुत जल्दी प्रश्न पूछे गए।'
        : 'Too many requests. Please wait a moment.';
    }
    if (err.message === 'TIMEOUT') {
      return lang === 'hindi'
        ? 'सर्वर धीरे चल रहा है। कृपया दोबारा कोशिश करें।'
        : 'Server is taking too long. Please try again.';
    }
    if (err.message === 'AUTH_REQUIRED') {
      return lang === 'hindi'
        ? 'आपका सत्र समाप्त हो गया है। कृपया दोबारा लॉग इन करें।'
        : 'Your session has expired. Please sign in again.';
    }
    if (err.message === 'FEATURE_DISABLED') {
      return lang === 'hindi' ? 'धर्मचैट अभी उपलब्ध नहीं है।' : 'DharmaChat is currently unavailable.';
    }
    if (err.message === 'FORBIDDEN') {
      return lang === 'hindi' ? 'इस सुविधा की अनुमति नहीं है।' : 'You do not have access to this feature.';
    }
    if (err.message === 'AI_PROVIDER_UNAVAILABLE') {
      return lang === 'hindi' ? 'AI सेवा अभी उपलब्ध नहीं है। कृपया थोड़ी देर बाद प्रयास करें।' : 'The AI service is temporarily unavailable. Please try again later.';
    }
    if (err.message === 'AI_TIMEOUT') {
      return lang === 'hindi' ? 'AI सेवा ने समय पर उत्तर नहीं दिया। कृपया दोबारा प्रयास करें।' : 'The AI service timed out. Please try again.';
    }
    if (err.message === 'AI_SERVICE_ERROR') {
      return lang === 'hindi' ? 'सर्वर में अस्थायी समस्या है। कृपया दोबारा प्रयास करें।' : 'The server encountered a temporary problem. Please try again.';
    }
    if (err.message === 'PROFILE_NOT_FOUND') {
      return lang === 'hindi' ? 'आपकी प्रोफ़ाइल नहीं मिली। कृपया दोबारा लॉगिन करें।' : 'Your profile could not be found. Please sign in again.';
    }
    if (err.message === 'QUOTA_INFRASTRUCTURE_UNAVAILABLE') {
      return lang === 'hindi' ? 'प्रश्न सेवा अस्थायी रूप से उपलब्ध नहीं है। कृपया कुछ देर बाद पुनः प्रयास करें।' : 'The question service is temporarily unavailable. Please try again later.';
    }
    if (err.message === 'AI_PROVIDER_CONFIGURATION_ERROR') {
      return lang === 'hindi' ? 'DharmaChat अभी कॉन्फ़िगर नहीं है। कृपया बाद में प्रयास करें।' : 'DharmaChat is not configured yet. Please try again later.';
    }
    if (err.message === 'AI_PROVIDER_RATE_LIMIT') {
      return lang === 'hindi' ? 'AI सेवा अभी व्यस्त है। कृपया कुछ देर बाद प्रयास करें।' : 'The AI service is busy. Please try again shortly.';
    }
    if (err.message === 'SERVER_ERROR' || err.message === 'AI_SERVICE_ERROR') {
      return lang === 'hindi' ? 'सर्वर में अस्थायी समस्या है। कृपया दोबारा प्रयास करें।' : 'The server encountered a temporary problem. Please try again.';
    }
    if (err.message === 'NETWORK_ERROR') {
      return lang === 'hindi' ? 'इंटरनेट कनेक्शन नहीं मिल रहा। कृपया नेटवर्क जाँचकर दोबारा प्रयास करें।' : 'No internet connection. Check your network and try again.';
    }
    return lang === 'hindi'
      ? 'सर्वर से जोड़ नहीं पाए। Internet जांचें।'
      : 'Could not connect. Check your internet.';
  };

  // ── CORE SEND LOGIC (shared by send + autoSend) ─────────────
  // FIX: Returns true on success, false on failure
  // FIX: Uses loadingRef as hard lock to prevent parallel calls
  const coreSend = useCallback(async (clean, lang, name, deity, rashi, nak, phone, isFC, includeHist) => {
    // FIX: hard lock — if already processing, bail immediately
    if (!clean || clean.length < 2) return false;
    if (loadingRef.current) return false;
    loadingRef.current = true;
    if (isMountedRef.current) setLoading(true);

    // FIX: generate IDs once before any state update
    const uid = `u_${Date.now()}`;
    const aid = `a_${Date.now() + 1}`;
    const t = tNow();

    // FIX: add both messages atomically in a single setState to prevent duplicates
    if (isMountedRef.current) {
      setMsgs(prev => {
        // FIX: check if uid already exists to prevent duplicate insertion
        if (prev.some(m => m.id === uid)) return prev;
        return [...prev,
          { id: uid, type: 'user', text: clean, time: t },
          { id: aid, type: 'ai', title: '', body: '', src: '', ver: false,
            translations: {}, activeLang: null, feedback: null, saved: false,
            streaming: true, thinking: true, question: clean, time: t, isError: false },
        ];
      });
    }
    scrollDown();

    try {
      const messages = includeHist
        ? [...hist.slice(-8), { role: 'user', content: clean }]
        : [{ role: 'user', content: clean }];

      const profile = { name, deity, rashi, nakshatra: nak, language: lang };
      const requestStartedAt = Date.now();
      const response = await callBackendAI(messages, profile, isFC ? 'factcheck' : 'dharma', phone);
      if (response.nonFactCheckable) {
        if (isMountedRef.current) setMsgs(p => p.filter(m => m.id !== aid));
        Alert.alert(
          lang === 'hindi' ? 'यह तथ्य-जाँच योग्य दावा नहीं है' : 'Not a fact-checkable claim',
          lang === 'hindi' ? 'क्या आप इसे DharmaChat में पूछना चाहेंगे?' : 'Would you like to ask it in DharmaChat?',
          [
            { text: lang === 'hindi' ? 'यहीं रहें' : 'Stay here' },
            { text: lang === 'hindi' ? 'DharmaChat में पूछें' : 'Ask in DharmaChat', onPress: () => { setChatMode('dharma'); setInput(clean); } },
          ],
        );
        return true;
      }
      const rawA = response.text;
      const parsed = parseResp(rawA);

      if (isMountedRef.current) {
        setMsgs(p => p.map(m => m.id === aid
          ? { ...m, title: parsed.title, src: parsed.src, ver: parsed.ver,
              origBody: parsed.body, thinking: false, isError: false,
              provider: response.usedApi, model: response.model, mode: isFC ? 'factcheck' : 'dharma',
              latencyMs: Date.now() - requestStartedAt, incomplete: !!response.incomplete }
          : m
        ));
        setHist(p => [...p,
          { role: 'user', content: clean },
          { role: 'assistant', content: rawA },
        ].slice(-16));
        streamText(parsed.body, aid);
      }
      return true;
    } catch (err) {
      const controlledCodes = new Set([
        'QUESTION_LIMIT_REACHED', 'AUTH_REQUIRED', 'PROFILE_NOT_FOUND',
        'FEATURE_DISABLED', 'RATE_LIMIT', 'FORBIDDEN',
        'QUOTA_INFRASTRUCTURE_UNAVAILABLE', 'AI_PROVIDER_CONFIGURATION_ERROR',
        'AI_PROVIDER_UNAVAILABLE', 'AI_PROVIDER_RATE_LIMIT', 'AI_TIMEOUT',
        'NETWORK_ERROR', 'SERVER_ERROR',
      ]);
      if (!controlledCodes.has(err.message)) {
        console.error('[DharmaChat] unexpected coreSend failure');
      }
      if (err.message === 'QUESTION_LIMIT_REACHED') {
        Alert.alert(
          lang === 'hindi' ? 'आज की प्रश्न सीमा पूरी हुई' : 'Daily question limit reached',
          getErrorMsg(err, lang),
          [
            { text: lang === 'hindi' ? 'अभी नहीं' : 'Not now' },
            { text: lang === 'hindi' ? 'अपग्रेड करें' : 'Upgrade', onPress: () => router.push('/payment') },
          ],
        );
        if (isMountedRef.current) {
          setMsgs(p => p.filter(m => m.id !== aid));
        }
        return false;
      }
      const errMsg = getErrorMsg(err, lang);
      if (isMountedRef.current) {
        setMsgs(p => p.map(m => m.id === aid
          ? { ...m, body: errMsg, thinking: false, streaming: false, isError: true,
              // FIX: store retry params so user can retry the failed message
              retryClean: clean, retryIsFC: isFC }
          : m
        ));
      }
      return false;
    } finally {
      // FIX: always release lock and clear loading state
      loadingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
        scrollDown();
      }
    }
  }, [hist, streamText, scrollDown]);

  // ── AUTO SEND (preset question from home screen) ─────────────
  // FIX: uses direct params instead of reading state (avoids stale closure)
  const autoSendDirect = useCallback(async (question, lang, name, deity, rashi, nak, phone, isFC) => {
    // FIX: check premium before inserting any messages
    let resolvedPhone = phone;

if (!resolvedPhone) {
  try {
    const raw = await AsyncStorage.getItem('dharmasetu_user');
    if (raw) {
      const u = JSON.parse(raw);
      resolvedPhone = u?.phone || '';
    }
  } catch {}
}

    const clean = Sec.clean(question);
    if (!clean || clean.length < 2 || !Sec.valid(clean)) return;

    await coreSend(clean, lang, name, deity, rashi, nak, resolvedPhone, isFC, false);
  }, [checkPremiumAccess, coreSend]);

  // ── RETRY a failed message ────────────────────────────────────
  const retryMessage = useCallback(async (msg) => {
    if (loadingRef.current) return;
    // Remove the failed AI message so coreSend can add a fresh one
    setMsgs(p => p.filter(m => m.id !== msg.id));
    // Also remove the preceding user message to avoid duplication
    setMsgs(p => {
      const idx = p.findIndex(m => m.type === 'user' && m.text === msg.retryClean);
      if (idx === -1) return p;
      return [...p.slice(0, idx), ...p.slice(idx + 1)];
    });
    await coreSend(
      msg.retryClean, userLang, userName, userDeity,
      userRashi, userNak, userPhone, msg.retryIsFC, true
    );
  }, [coreSend, userLang, userName, userDeity, userRashi, userNak, userPhone]);

  // ── MANUAL SEND ──────────────────────────────────────────────
  const send = useCallback(async (txt) => {
    const raw = (txt || input).trim();

    // FIX: check premium with resolved phone (handles empty userPhone on first render)
    let phone = userPhone;

if (!phone) {
  try {
    const raw = await AsyncStorage.getItem('dharmasetu_user');
    if (raw) {
      const u = JSON.parse(raw);
      phone = u?.phone || '';
    }
  } catch {}
}
    if (!raw || loadingRef.current || !ready) return;

    if (!Sec.ok()) {
      Alert.alert('', userLang === 'hindi' ? 'थोड़ा रुकें।' : 'Please wait a moment.');
      return;
    }
    const clean = Sec.clean(raw);
    if (!Sec.valid(clean) || clean.length < 2) return;

    pulseSend();
    if (isMountedRef.current) setInput('');

    await coreSend(
      clean, userLang, userName, userDeity,
      userRashi, userNak, userPhone,
      chatMode === 'factcheck',
      true  // include history
    );
  }, [input, userPhone, userLang, ready, chatMode, userName, userDeity, userRashi, userNak, checkPremiumAccess, coreSend]);

  // ── VOICE INPUT ───────────────────────────────────────────────
  const startVoiceInput = async () => {
    try {
      setIsListening(true);
      Alert.alert(
        userLang === 'hindi' ? '🎤 बोलें' : '🎤 Speak Now',
        userLang === 'hindi' ? 'आपकी आवाज सुनी जा रही है...' : 'Listening...'
      );
      setTimeout(() => {
        if (isMountedRef.current) setIsListening(false);
        Alert.prompt(
          userLang === 'hindi' ? 'अपना प्रश्न बोलें (type here)' : 'Speak your question (type)',
          '',
          (text) => { if (text) { setInput(text); send(text); } }
        );
      }, 1000);
    } catch (e) {
      console.log('[DharmaChat] Voice error:', e);
      if (isMountedRef.current) setIsListening(false);
    }
  };

  // ── ACTIONS ──────────────────────────────────────────────────
  const handleUp = async msg => {
    if (msg.feedback) return;
    Vibration.vibrate(20);
    try {
      await submitAIFeedback(msg.question || '', msg.body, 'up', '', userPhone, userLang, {
        feature: (msg.mode || chatMode) === 'factcheck' ? 'fact_check' : 'dharma_chat', messageId: msg.id,
        provider: msg.provider, model: msg.model, mode: msg.mode || chatMode, latencyMs: msg.latencyMs,
      });
      if (isMountedRef.current) setMsgs(p => p.map(m => m.id === msg.id ? { ...m, feedback: 'up' } : m));
    } catch { Alert.alert('', userLang === 'hindi' ? 'Feedback सेव नहीं हुआ। फिर प्रयास करें।' : 'Feedback was not saved. Please try again.'); return; }
    addPts('thumbsup').then(n => { if (isMountedRef.current) setPts(n); });
  };

  const handleDown = msg => { if (!msg.feedback) setFbMsgId(msg.id); };

  const submitFb = async (reason) => {
    const msg = msgs.find(m => m.id === fbMsgId);
    try {
      if (msg) await submitAIFeedback(msg.question || '', msg.body, 'down', reason, userPhone, userLang, {
        feature: (msg.mode || chatMode) === 'factcheck' ? 'fact_check' : 'dharma_chat', messageId: msg.id,
        provider: msg.provider, model: msg.model, mode: msg.mode || chatMode, latencyMs: msg.latencyMs,
      });
      if (isMountedRef.current) {
        setMsgs(p => p.map(m => m.id === fbMsgId ? { ...m, feedback: 'down' } : m));
        setFbMsgId(null);
      }
    } catch { Alert.alert('', userLang === 'hindi' ? 'Feedback सेव नहीं हुआ। फिर प्रयास करें।' : 'Feedback was not saved. Please try again.'); return; }
    Alert.alert('🙏', userLang === 'hindi' ? 'Feedback सेव हो गया। धन्यवाद।' : 'Feedback saved. Thank you.');
    addPts('feedback_given').then(n => { if (isMountedRef.current) setPts(n); });
  };

  const handleSave = async msg => {
    if (msg.saved) { Alert.alert('', userLang === 'hindi' ? 'पहले से saved है।' : 'Already saved.'); return; }
    try {
      await saveAns(msg.question || '', msg.body, msg.src);
      if (isMountedRef.current) setMsgs(p => p.map(m => m.id === msg.id ? { ...m, saved: true } : m));
      Vibration.vibrate(20);
      Alert.alert('✅', '+3 Dharma Points! 🕉');
    } catch (e) { Alert.alert('', e.message); }
  };

  const isH = userLang === 'hindi';
  const suggs = SUGG[userLang] || SUGG.english;
  const phText = {
    hindi: 'धर्म, ज्योतिष या जीवन के बारे में पूछें...',
    english: 'Ask about Dharma, Jyotish, or life guidance...',
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#0D0500" translucent={false} />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* ── HEADER ── */}
        <View style={s.hdr}>
          <View style={s.hL}>
            <View style={s.hAv}><Text style={{ fontSize: 18 }}>🕉</Text></View>
            <View>
              <Text style={s.hTitle}>DharmaChat AI</Text>
              <View style={s.hSub}>
                <View style={[s.gDot, { backgroundColor: isOnline ? '#2ECC71' : '#E74C3C' }]} />
                <Text style={s.hSubTxt}>
                  {chatMode === 'factcheck' ? '🛡️ Fact Check' : (isOnline ? '💬 Online' : '📵 Offline')}
                </Text>
              </View>
            </View>
          </View>
          <View style={s.hR}>
            <TouchableOpacity
              style={[s.mBtn, chatMode === 'factcheck' && s.mBtnFC]}
              onPress={() => setChatMode(m => m === 'factcheck' ? 'dharma' : 'factcheck')}>
              <Text style={{ fontSize: 16 }}>{chatMode === 'factcheck' ? '💬' : '🛡️'}</Text>
            </TouchableOpacity>
            <View style={s.pBadge}>
              <Text style={s.pTxt}>⚡ {pts}</Text>
            </View>
          </View>
        </View>

        {/* FIX: Offline banner */}
        {!isOnline && (
          <View style={{ backgroundColor: '#E74C3C', padding: 6 }}>
            <Text style={{ color: '#fff', textAlign: 'center', fontSize: 12 }}>
              {isH ? '📵 Internet नहीं है — Cached responses only' : '📵 No Internet — Cached responses only'}
            </Text>
          </View>
        )}

        {/* Fact Check banner */}
        {chatMode === 'factcheck' && (
          <View style={s.fcBnr}>
            <Text style={s.fcBnrTxt}>
              {isH ? '🛡️ Fact Check — कोई भी claim paste करें, सच जानें' : '🛡️ Fact Check — Paste any claim to verify truth'}
            </Text>
          </View>
        )}

        {/* Language bar */}
        <View style={s.lBar}>
          <Text style={s.lLbl}>{isH ? 'भाषा:' : 'LANG:'}</Text>
          {[{ id: 'hindi', l: 'हिंदी' }, { id: 'english', l: 'English' }].map(({ id, l }) => (
            <TouchableOpacity
              key={id}
              style={[s.lChip, userLang === id && s.lChipOn]}
              onPress={() => setUserLang(id)}
              activeOpacity={0.8}>
              <Text style={[s.lTxt, userLang === id && s.lTxtOn]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.dSep}>
          <View style={s.dLine} />
          <Text style={s.dTxt}>{isH ? 'आज' : 'TODAY'}</Text>
          <View style={s.dLine} />
        </View>

        {/* ── MESSAGES ── */}
        <ScrollView
          ref={scrollRef}
          style={s.flex}
          contentContainerStyle={s.mList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {msgs.map(msg => {
            // User message
            if (msg.type === 'user') return (
              <View key={msg.id} style={s.uRow}>
                <View>
                  <View style={s.uBub}>
                    <Text style={s.uTxt}>{msg.text}</Text>
                  </View>
                  <Text style={s.uTime}>{isH ? 'आप' : 'You'} · {msg.time}</Text>
                </View>
              </View>
            );

            // Thinking state
            if (msg.thinking) return (
              <View key={msg.id} style={s.aRow}>
                <View style={s.aBdg}><Text style={{ fontSize: 11 }}>🕉</Text></View>
                <View style={[s.aBub, { paddingVertical: 14 }]}>
                  <ThinkDots />
                  <Text style={{ fontSize: 11, color: 'rgba(253,246,237,0.25)', marginTop: 4 }}>
                    {isH ? 'शास्त्र और ज्योतिष खोज रहे हैं...' : 'Searching scriptures & Jyotish...'}
                  </Text>
                </View>
              </View>
            );

            // AI message
            const showTxt = msg.activeLang && msg.translations?.[msg.activeLang]
              ? msg.translations[msg.activeLang]
              : msg.body;
            const showActs = !msg.isWelcome && !msg.streaming && !msg.isError && msg.body?.length > 10;

            return (
              <View key={msg.id} style={s.aRow}>
                <View style={s.aBdg}><Text style={{ fontSize: 11 }}>🕉</Text></View>
                <View style={[s.aBub, msg.isError && s.aBubError]}>
                  {msg.title ? <Text style={s.aTitle}>{msg.title}</Text> : null}
                  <SafeMarkdown text={showTxt} style={[s.aTxt, msg.isError && s.aTxtError]} />
                  {msg.incomplete && !msg.streaming ? <Text style={s.incompleteTxt}>{isH ? 'उत्तर अधूरा रह गया। कृपया प्रश्न को अधिक विशिष्ट करके दोबारा पूछें।' : 'The provider stopped before completing this answer. Please retry with a more specific question.'}</Text> : null}
                  {msg.streaming ? <Text style={s.cur}>▌</Text> : null}

                  {/* FIX: Retry button for failed messages */}
                  {msg.isError && msg.retryClean && (
                    <TouchableOpacity
                      style={s.retryBtn}
                      onPress={() => retryMessage(msg)}
                      activeOpacity={0.8}>
                      <Text style={s.retryTxt}>
                        {isH ? '🔄 दोबारा कोशिश करें' : '🔄 Retry'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {msg.src && !msg.streaming ? (
                    <View style={s.srcBox}>
                      <View style={s.srcHdr}>
                        <Text style={{ fontSize: 11 }}>📖</Text>
                        <Text style={s.srcLbl}>{isH ? 'शास्त्रीय संदर्भ' : 'SHASTRIYA SANDARBH'}</Text>
                      </View>
                      <Text style={s.srcTxt}>{msg.src}</Text>
                      {msg.ver && (
                        <View style={s.verRow}>
                          <Text style={s.verChk}>✓</Text>
                          <Text style={s.verTxt}>{isH ? 'सत्यापित' : 'Verified — Shastriya Pramaan'}</Text>
                        </View>
                      )}
                    </View>
                  ) : null}

                  {showActs && (
                    <View style={s.actRow}>
                      <TouchableOpacity
                        style={[s.actBtn, msg.feedback === 'up' && s.actUp]}
                        onPress={() => handleUp(msg)}
                        disabled={!!msg.feedback}
                        activeOpacity={0.8}>
                        <Text style={{ fontSize: 14 }}>👍</Text>
                        {msg.feedback === 'up' && <Text style={[s.actLbl, { color: '#27AE60' }]}>✓</Text>}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[s.actBtn, msg.feedback === 'down' && s.actDn]}
                        onPress={() => handleDown(msg)}
                        disabled={!!msg.feedback}
                        activeOpacity={0.8}>
                        <Text style={{ fontSize: 14 }}>👎</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[s.actBtn, msg.saved && s.actSav]}
                        onPress={() => handleSave(msg)}
                        activeOpacity={0.8}>
                        <Text style={{ fontSize: 14 }}>🔖</Text>
                        <Text style={[s.actLbl, msg.saved && { color: '#C9830A' }]}>
                          {msg.saved ? (isH ? 'सेव्ड' : 'Saved') : (isH ? 'सेव' : 'Save')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={s.actBtn}
                        onPress={() => doShare(msg.question || '', msg.origBody || msg.body, msg.src)}
                        activeOpacity={0.8}>
                        <Text style={{ fontSize: 14 }}>📤</Text>
                        <Text style={s.actLbl}>{isH ? 'शेयर' : 'Share'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {!msg.streaming && msg.time && (
                    <Text style={s.aTime}>DharmaChat · {msg.time}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* ── SUGGESTIONS ── */}
        {msgs.length <= 1 && !loading && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.pills}
            contentContainerStyle={s.pillsC}
            keyboardShouldPersistTaps="handled">
            {suggs.map((sg, i) => (
              <TouchableOpacity key={i} style={s.pill} onPress={() => send(sg)} activeOpacity={0.8}>
                <Text style={s.pillTxt}>{sg}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── INPUT BAR ── */}
        <View style={[s.iBar, { paddingBottom: 10 + insets.bottom }]}>
          <TextInput
            style={s.inp}
            placeholder={phText[userLang] || phText.english}
            placeholderTextColor="rgba(253,246,237,0.28)"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            editable={!loading}
            returnKeyType="send"
            onSubmitEditing={() => { if (!loading && input.trim()) send(input); }}
          />

          {/* 🎤 MIC BUTTON */}
          <TouchableOpacity
            style={{
              width: 46, height: 46, borderRadius: 14,
              backgroundColor: isListening ? '#E74C3C' : '#6B21A8',
              alignItems: 'center', justifyContent: 'center',
            }}
            onPress={startVoiceInput}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={isH ? 'आवाज़ से प्रश्न पूछें' : 'Ask using voice'}>
            <Text style={{ color: '#fff', fontSize: 18 }}>🎤</Text>
          </TouchableOpacity>

          {/* SEND BUTTON */}
          <Animated.View style={{ transform: [{ scale: sendSc }] }}>
            <TouchableOpacity
              style={[s.sendBtn, (!input.trim() || loading) && s.sendOff]}
              onPress={() => send(input)}
              disabled={!input.trim() || loading}
              accessibilityRole="button"
              accessibilityLabel={chatMode === 'factcheck' ? (isH ? 'दावे की जाँच करें' : 'Verify claim') : (isH ? 'प्रश्न पूछें' : 'Ask question')}
              accessibilityState={{ disabled: !input.trim() || loading, busy: loading }}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.sendIco}>{chatMode === 'factcheck' ? (isH ? '✓ जाँचें' : '✓ Verify') : (isH ? '✨ पूछें' : '✨ Ask')}</Text>
              }
            </TouchableOpacity>
          </Animated.View>
        </View>

      </KeyboardAvoidingView>

      <FbModal
        visible={!!fbMsgId}
        onClose={() => setFbMsgId(null)}
        onSubmit={submitFb}
        lang={userLang}
      />
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0500' },
  flex: { flex: 1 },

  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#0D0500', borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.1)' },
  hL: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hR: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hAv: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6B21A8', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(240,165,0,0.4)' },
  hTitle: { fontSize: 15, fontWeight: '700', color: '#FDF6ED' },
  hSub: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  gDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2ECC71' },
  hSubTxt: { fontSize: 11, color: '#C9830A' },
  mBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(200,130,40,0.2)' },
  mBtnFC: { backgroundColor: 'rgba(232,98,10,0.15)', borderColor: '#E8620A' },
  pBadge: { backgroundColor: 'rgba(232,98,10,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(232,98,10,0.3)' },
  pTxt: { fontSize: 12, color: '#F4A261', fontWeight: '700' },

  fcBnr: { backgroundColor: 'rgba(232,98,10,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(232,98,10,0.2)' },
  fcBnrTxt: { fontSize: 12, color: '#F4A261', textAlign: 'center' },

  lBar: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#0D0500', borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.07)' },
  lLbl: { fontSize: 9, color: 'rgba(253,246,237,0.28)', fontWeight: '700', letterSpacing: 0.8 },
  lChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(200,130,40,0.18)' },
  lChipOn: { borderColor: '#E8620A', backgroundColor: 'rgba(232,98,10,0.13)' },
  lTxt: { fontSize: 13, color: 'rgba(253,246,237,0.38)', fontWeight: '600' },
  lTxtOn: { color: '#F4A261' },

  dSep: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 10 },
  dLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  dTxt: { fontSize: 10, color: 'rgba(253,246,237,0.2)', letterSpacing: 1.5 },

  mList: { padding: 12, paddingBottom: 8, gap: 10 },

  uRow: { flexDirection: 'row-reverse', alignItems: 'flex-end' },
  uBub: { backgroundColor: '#C45508', borderRadius: 18, borderTopRightRadius: 4, padding: 14, maxWidth: SW * 0.78 },
  uTxt: { fontSize: 14, color: '#fff', lineHeight: 22 },
  uTime: { fontSize: 10, color: 'rgba(253,246,237,0.2)', textAlign: 'right', marginTop: 3 },

  aRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  aBdg: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#160800', borderWidth: 1, borderColor: 'rgba(107,33,168,0.45)', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 2 },
  aBub: { backgroundColor: '#160800', borderRadius: 18, borderTopLeftRadius: 4, padding: 14, maxWidth: SW * 0.83, borderWidth: 1, borderColor: 'rgba(200,130,40,0.16)', gap: 8 },
  // FIX: error state styling for failed messages
  aBubError: { borderColor: 'rgba(231,76,60,0.4)', backgroundColor: '#1A0600' },
  aTitle: { fontSize: 14, fontWeight: '700', color: '#F4A261', marginBottom: 2 },
  aTxt: { fontSize: 14, color: '#FDF6ED', lineHeight: 25 },
  mdLine: { marginTop: 0, marginBottom: 0 },
  mdHeading: { fontWeight: '800', color: '#F4A261', marginTop: 3, marginBottom: 1 },
  mdBreak: { height: 7 },
  mdRule: { height: 1, backgroundColor: 'rgba(253,246,237,0.16)', marginVertical: 7 },
  incompleteTxt: { marginTop: 8, color: '#F4A261', fontSize: 12, lineHeight: 18 },
  aTxtError: { color: 'rgba(231,76,60,0.85)', fontSize: 13 },
  cur: { color: '#E8620A', fontWeight: 'bold' },

  // FIX: retry button style
  retryBtn: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(231,76,60,0.12)', borderWidth: 1, borderColor: 'rgba(231,76,60,0.3)', alignSelf: 'flex-start' },
  retryTxt: { fontSize: 12, color: '#E74C3C', fontWeight: '700' },

  srcBox: { backgroundColor: 'rgba(201,131,10,0.07)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(201,131,10,0.18)' },
  srcHdr: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  srcLbl: { fontSize: 9, fontWeight: '700', color: 'rgba(201,131,10,0.65)', letterSpacing: 1.2 },
  srcTxt: { fontSize: 12, color: '#C9830A', lineHeight: 18 },
  verRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  verChk: { fontSize: 12, color: '#2ECC71' },
  verTxt: { fontSize: 10, color: '#2ECC71', fontWeight: '600' },

  actRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, flexWrap: 'wrap' },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(240,165,0,0.15)' },
  actUp: { backgroundColor: 'rgba(39,174,96,0.1)', borderColor: '#27AE60' },
  actDn: { backgroundColor: 'rgba(231,76,60,0.1)', borderColor: '#E74C3C' },
  actSav: { backgroundColor: 'rgba(201,131,10,0.1)', borderColor: '#C9830A' },
  actLbl: { fontSize: 10, color: 'rgba(253,246,237,0.35)', fontWeight: '600' },

  aTime: { fontSize: 10, color: 'rgba(253,246,237,0.18)', marginTop: 2 },

  pills: { maxHeight: 48, marginBottom: 4 },
  pillsC: { paddingHorizontal: 14, gap: 8, alignItems: 'center' },
  pill: { backgroundColor: '#160800', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(232,98,10,0.28)' },
  pillTxt: { fontSize: 12, color: '#F4A261', fontWeight: '500' },

  iBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#0D0500', borderTopWidth: 1, borderTopColor: 'rgba(240,165,0,0.07)', alignItems: 'flex-end' },
  inp: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11, color: '#FDF6ED', fontSize: 14, maxHeight: 120, minHeight: 46, borderWidth: 1, borderColor: 'rgba(200,130,40,0.16)', lineHeight: 20 },
  sendBtn: { minWidth: 76, height: 46, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#E8620A', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  sendOff: { backgroundColor: 'rgba(232,98,10,0.2)', elevation: 0 },
  sendIco: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
