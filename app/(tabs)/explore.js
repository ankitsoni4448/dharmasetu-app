// ════════════════════════════════════════════════════════════════
// DharmaSetu — DharmaChat AI Screen SECURE v2
// 
// SECURITY: Zero API keys in this file.
// All AI calls go through your Render backend.
// Keys live only on the server in Render env vars.
//
// LOCATION: app/(tabs)/explore.js
// ════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions,
  KeyboardAvoidingView, Modal, Platform, ScrollView,
  Share, StyleSheet, Text, TextInput, TouchableOpacity,
  Vibration, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { submitFeedback } from '../register_backend';

const { width: SW } = Dimensions.get('window');

// ── BACKEND URL — only non-secret thing the app needs ──────────
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://dharmasetu-backend-2c65.onrender.com';

// ── RATE LIMITER (client-side UX only) ────────────────────────
// Real rate limiting happens on the server
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
// SECURE API CALL — Goes through your backend, not directly to AI
// ════════════════════════════════════════════════════════════════
async function callBackendAI(messages, userProfile, mode, phone) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const res = await fetch(`${BACKEND_URL}/ai/dharma-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        userProfile: {
          name:      userProfile?.name      || '',
          rashi:     userProfile?.rashi     || '',
          nakshatra: userProfile?.nakshatra || '',
          deity:     userProfile?.deity     || '',
          language:  userProfile?.language  || 'hindi',
        },
        mode,
        phone: phone || '',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 429) throw new Error('RATE_LIMIT');
      throw new Error(err.error || `Server error ${res.status}`);
    }

    const data = await res.json();
    if (!data.success || !data.text) throw new Error('Empty response from server');
    return data.text;
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') throw new Error('Request timed out. Please try again.');
    throw e;
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

async function storeFb(q, a, rating, reason, phone) {
  try {
    const arr = JSON.parse(await AsyncStorage.getItem('dharmasetu_feedback') || '[]');
    arr.push({ q, a, rating, reason, at: new Date().toISOString() });
    await AsyncStorage.setItem('dharmasetu_feedback', JSON.stringify(arr.slice(-200)));
    if (rating === 'up')   await addPts('thumbsup');
    if (rating === 'down' && reason) await addPts('feedback_given');
    if (rating === 'down') {
      await submitFeedback(q, a, rating, reason, phone || '');
    }
  } catch {}
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
  } catch {}
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
  ov:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  box:      { backgroundColor: '#160800', borderRadius: 24, padding: 20, margin: 12, borderWidth: 1, borderColor: 'rgba(240,165,0,0.15)' },
  title:    { fontSize: 16, fontWeight: '700', color: '#FDF6ED', marginBottom: 4 },
  sub:      { fontSize: 12, color: 'rgba(253,246,237,0.4)', marginBottom: 12 },
  chip:     { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(200,130,40,0.2)', marginBottom: 7 },
  chipOn:   { backgroundColor: 'rgba(232,98,10,0.15)', borderColor: '#E8620A' },
  cTxt:     { fontSize: 13, color: 'rgba(253,246,237,0.45)' },
  cTxtOn:   { color: '#F4A261' },
  inp:      { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, color: '#FDF6ED', fontSize: 13, minHeight: 55, borderWidth: 1, borderColor: 'rgba(200,130,40,0.15)', marginVertical: 10 },
  row:      { flexDirection: 'row', gap: 10 },
  cancel:   { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
  cancelT:  { color: 'rgba(253,246,237,0.5)', fontSize: 14, fontWeight: '600' },
  submit:   { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#E8620A', alignItems: 'center' },
  submitT:  { color: '#fff', fontSize: 14, fontWeight: '700' },
});

// ════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ════════════════════════════════════════════════════════════════
export default function DharmaChatScreen() {
  const insets = useSafeAreaInsets();

  const [userLang,   setUserLang]  = useState('hindi');
  const [userName,   setUserName]  = useState('Dharma Rakshak');
  const [userDeity,  setUserDeity] = useState('');
  const [userRashi,  setUserRashi] = useState('');
  const [userNak,    setUserNak]   = useState('');
  const [userPhone,  setUserPhone] = useState('');
  const [userProfile,setUserProf]  = useState(null);
  const [chatMode,   setChatMode]  = useState('dharma');
  const [pts,        setPts]       = useState(0);
  const [ready,      setReady]     = useState(false);
  const [msgs,       setMsgs]      = useState([]);
  const [input,      setInput]     = useState('');
  const [loading,    setLoading]   = useState(false);
  const [hist,       setHist]      = useState([]);
  const [transId,    setTransId]   = useState(null);
  const [fbMsgId,    setFbMsgId]   = useState(null);

  const scrollRef = useRef(null);
  const sendSc    = useRef(new Animated.Value(1)).current;
  const tNow = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  // ── INIT ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('dharmasetu_user');
        const p   = parseInt(await AsyncStorage.getItem('dharmasetu_pts') || '0', 10);
        setPts(p);

        let lang = 'hindi', name = 'Dharma Rakshak', deity = '', rashi = '', nak = '', phone = '';
        if (raw) {
          const u = JSON.parse(raw);
          lang  = u.language  || 'hindi';
          name  = u.name      || 'Dharma Rakshak';
          deity = u.deity     || '';
          rashi = u.rashi     || '';
          nak   = u.nakshatra || '';
          phone = u.phone     || '';
          setUserProf(u);
        }
        setUserLang(lang); setUserName(name); setUserDeity(deity);
        setUserRashi(rashi); setUserNak(nak); setUserPhone(phone);

        // Check if coming from home with preset question
        const presetQ = await AsyncStorage.getItem('dharmasetu_preset_question');
        const mode    = await AsyncStorage.getItem('dharmasetu_mode');
        if (mode === 'factcheck') {
          setChatMode('factcheck');
          await AsyncStorage.removeItem('dharmasetu_mode');
        }

        const isH = lang === 'hindi';
        const greetMap = {
          hindi: `नमस्ते, ${name}! 🙏\n\n${deity ? `${deity} की कृपा आप पर बनी रहे। 🌸\n\n` : ''}मैं DharmaSetu हूँ — आपका वैदिक मार्गदर्शक।\n\nशास्त्र, ज्योतिष, और जीवन के किसी भी प्रश्न का उत्तर दे सकता हूँ।${rashi ? `\n\nआपकी ${rashi} राशि के अनुसार व्यक्तिगत मार्गदर्शन के लिए पूछें।` : ''}`,
          english: `Namaste, ${name}! 🙏\n\n${deity ? `May ${deity} bless you always. 🌸\n\n` : ''}I am DharmaSetu — your Vedic AI guide.\n\nAsk me about Dharma, Jyotish, scriptures, or any life guidance.${rashi ? `\n\nBased on your ${rashi} Rashi, I can give personalized Vedic insights.` : ''}`,
        };
        const greet = greetMap[lang] || greetMap.english;
        const titleMap = { hindi: '🙏 जय श्री राम', english: '🙏 Jai Shri Ram' };

        setMsgs([{
          id: 'w', type: 'ai',
          title: titleMap[lang] || titleMap.english,
          body: greet, src: '', ver: false,
          translations: {}, activeLang: null,
          feedback: null, saved: false, streaming: false,
          isWelcome: true, time: tNow(),
        }]);
        setReady(true);

        if (presetQ) {
          await AsyncStorage.removeItem('dharmasetu_preset_question');
          setTimeout(() => autoSend(presetQ, lang, name, deity, rashi, nak, phone, mode === 'factcheck'), 900);
        }

        // Daily check-in points
        const today = new Date().toDateString();
        const last  = await AsyncStorage.getItem('dharmasetu_checkin');
        if (last !== today) {
          await AsyncStorage.setItem('dharmasetu_checkin', today);
          const n = await addPts('daily');
          setPts(n);
        }
      } catch (e) {
        console.error('DharmaChat init error:', e.message);
        setReady(true);
        setMsgs([{
          id: 'w', type: 'ai',
          title: '🙏 Jai Shri Ram',
          body: 'Namaste! I am DharmaSetu. Ask me about Sanatan Dharma.',
          src: '', ver: false, translations: {}, activeLang: null,
          feedback: null, saved: false, streaming: false, isWelcome: true, time: tNow(),
        }]);
      }
    })();
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

  // ── STREAM TEXT (word by word) ───────────────────────────────
  const streamText = useCallback((fullText, id) => {
    const words = fullText.split(' ');
    let built = '', i = 0;
    const iv = setInterval(() => {
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

  // ── CORE SEND ────────────────────────────────────────────────
  const coreAutoSend = async (question, lang, name, deity, rashi, nak, phone, isFC) => {
    const clean = Sec.clean(question);
    if (!clean || clean.length < 2) return;
    if (!Sec.valid(clean)) return;

    const uid = Date.now().toString();
    const aid = (Date.now() + 1).toString();
    const t   = tNow();

    setMsgs(prev => [...prev,
      { id: uid, type: 'user', text: clean, time: t },
      { id: aid, type: 'ai', title: '', body: '', src: '', ver: false, translations: {}, activeLang: null, feedback: null, saved: false, streaming: true, thinking: true, question: clean, time: t },
    ]);
    setLoading(true);
    scrollDown();

    try {
      const messages = [{ role: 'user', content: clean }];
      const profile  = { name, deity, rashi, nakshatra: nak, language: lang };
      const rawA     = await callBackendAI(messages, profile, isFC ? 'factcheck' : 'dharma', phone);
      const parsed   = parseResp(rawA);

      setMsgs(p => p.map(m => m.id === aid
        ? { ...m, title: parsed.title, src: parsed.src, ver: parsed.ver, origBody: parsed.body, thinking: false }
        : m
      ));
      setHist(p => [...p,
        { role: 'user', content: clean },
        { role: 'assistant', content: rawA },
      ].slice(-16));
      streamText(parsed.body, aid);
    } catch (err) {
      console.error('AutoSend err:', err.message);
      const errMsg = {
        hindi: err.message === 'RATE_LIMIT'
          ? 'थोड़ा रुकें। बहुत जल्दी प्रश्न पूछे गए।'
          : 'सर्वर से जोड़ नहीं पाए। Internet जांचें।',
        english: err.message === 'RATE_LIMIT'
          ? 'Too many requests. Please wait a moment.'
          : 'Could not connect to server. Check internet.',
      };
      setMsgs(p => p.map(m => m.id === aid
        ? { ...m, body: errMsg[lang] || errMsg.english, thinking: false, streaming: false }
        : m
      ));
    }
    setLoading(false);
    scrollDown();
  };

  const autoSend = coreAutoSend;

  const send = async (txt) => {
    const raw = (txt || input).trim();
    if (!raw || loading || !ready) return;
    if (!Sec.ok()) {
      Alert.alert('', userLang === 'hindi' ? 'थोड़ा रुकें।' : 'Please wait a moment.');
      return;
    }
    const clean = Sec.clean(raw);
    if (!Sec.valid(clean) || clean.length < 2) return;

    pulseSend();
    setInput('');

    const uid = Date.now().toString();
    const aid = (Date.now() + 1).toString();
    const t   = tNow();

    setMsgs(prev => [...prev,
      { id: uid, type: 'user', text: clean, time: t },
      { id: aid, type: 'ai', title: '', body: '', src: '', ver: false, translations: {}, activeLang: null, feedback: null, saved: false, streaming: true, thinking: true, question: clean, time: t },
    ]);
    setLoading(true);
    scrollDown();

    try {
      // Include conversation history for context
      const messages = [
        ...hist.slice(-8),
        { role: 'user', content: clean },
      ];
      const rawA   = await callBackendAI(messages, userProfile, chatMode === 'factcheck' ? 'factcheck' : 'dharma', userPhone);
      const parsed = parseResp(rawA);

      setMsgs(p => p.map(m => m.id === aid
        ? { ...m, title: parsed.title, src: parsed.src, ver: parsed.ver, origBody: parsed.body, thinking: false }
        : m
      ));
      setHist(p => [...p,
        { role: 'user', content: clean },
        { role: 'assistant', content: rawA },
      ].slice(-16));
      streamText(parsed.body, aid);
    } catch (err) {
      console.error('Send err:', err.message);
      const errMsg = {
        hindi: err.message === 'RATE_LIMIT'
          ? 'थोड़ा रुकें। बहुत जल्दी प्रश्न पूछे गए।'
          : 'सर्वर से जोड़ नहीं पाए। Internet जांचें।',
        english: err.message === 'RATE_LIMIT'
          ? 'Too many requests. Please wait a moment.'
          : 'Server connection failed. Check internet.',
      };
      setMsgs(p => p.map(m => m.id === aid
        ? { ...m, body: errMsg[userLang] || errMsg.english, thinking: false, streaming: false }
        : m
      ));
    }
    setLoading(false);
    scrollDown();
  };

  // ── ACTIONS ──────────────────────────────────────────────────
  const handleUp   = msg => { if (msg.feedback) return; Vibration.vibrate(20); setMsgs(p => p.map(m => m.id === msg.id ? { ...m, feedback: 'up' } : m)); storeFb(msg.question || '', msg.body, 'up', '', userPhone); addPts('thumbsup').then(setPts); };
  const handleDown = msg => { if (!msg.feedback) setFbMsgId(msg.id); };
  const submitFb   = reason => {
    const msg = msgs.find(m => m.id === fbMsgId);
    setMsgs(p => p.map(m => m.id === fbMsgId ? { ...m, feedback: 'down' } : m));
    if (msg) storeFb(msg.question || '', msg.body, 'down', reason, userPhone);
    setFbMsgId(null);
    Alert.alert('🙏', userLang === 'hindi' ? 'Feedback मिल गया! धन्यवाद।' : 'Feedback received! Thank you.');
    addPts('feedback_given').then(setPts);
  };
  const handleSave = async msg => {
    if (msg.saved) { Alert.alert('', userLang === 'hindi' ? 'पहले से saved है।' : 'Already saved.'); return; }
    try {
      await saveAns(msg.question || '', msg.body, msg.src);
      setMsgs(p => p.map(m => m.id === msg.id ? { ...m, saved: true } : m));
      Vibration.vibrate(20);
      Alert.alert('✅', '+3 Dharma Points! 🕉');
    } catch (e) { Alert.alert('', e.message); }
  };

  const isH    = userLang === 'hindi';
  const suggs  = SUGG[userLang] || SUGG.english;
  const phText = {
    hindi:   'धर्म, ज्योतिष या जीवन के बारे में पूछें...',
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
                <View style={s.gDot} />
                <Text style={s.hSubTxt}>{chatMode === 'factcheck' ? '🛡️ Fact Check' : '💬 Online'}</Text>
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
            const showActs = !msg.isWelcome && !msg.streaming && msg.body?.length > 10;

            return (
              <View key={msg.id} style={s.aRow}>
                <View style={s.aBdg}><Text style={{ fontSize: 11 }}>🕉</Text></View>
                <View style={s.aBub}>
                  {msg.title ? <Text style={s.aTitle}>{msg.title}</Text> : null}
                  <Text style={s.aTxt}>
                    {showTxt}
                    {msg.streaming ? <Text style={s.cur}> ▌</Text> : null}
                  </Text>

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
            blurOnSubmit={false}
          />
          <Animated.View style={{ transform: [{ scale: sendSc }] }}>
            <TouchableOpacity
              style={[s.sendBtn, (!input.trim() || loading) && s.sendOff]}
              onPress={() => send(input)}
              disabled={!input.trim() || loading}
              activeOpacity={0.85}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.sendIco}>›</Text>
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

  hdr:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#0D0500', borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.1)' },
  hL:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hR:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hAv:     { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6B21A8', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(240,165,0,0.4)' },
  hTitle:  { fontSize: 15, fontWeight: '700', color: '#FDF6ED' },
  hSub:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  gDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2ECC71' },
  hSubTxt: { fontSize: 11, color: '#C9830A' },
  mBtn:    { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(200,130,40,0.2)' },
  mBtnFC:  { backgroundColor: 'rgba(232,98,10,0.15)', borderColor: '#E8620A' },
  pBadge:  { backgroundColor: 'rgba(232,98,10,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(232,98,10,0.3)' },
  pTxt:    { fontSize: 12, color: '#F4A261', fontWeight: '700' },

  fcBnr:    { backgroundColor: 'rgba(232,98,10,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(232,98,10,0.2)' },
  fcBnrTxt: { fontSize: 12, color: '#F4A261', textAlign: 'center' },

  lBar:   { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#0D0500', borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.07)' },
  lLbl:   { fontSize: 9, color: 'rgba(253,246,237,0.28)', fontWeight: '700', letterSpacing: 0.8 },
  lChip:  { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(200,130,40,0.18)' },
  lChipOn:{ borderColor: '#E8620A', backgroundColor: 'rgba(232,98,10,0.13)' },
  lTxt:   { fontSize: 13, color: 'rgba(253,246,237,0.38)', fontWeight: '600' },
  lTxtOn: { color: '#F4A261' },

  dSep:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 10 },
  dLine:  { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  dTxt:   { fontSize: 10, color: 'rgba(253,246,237,0.2)', letterSpacing: 1.5 },

  mList:  { padding: 12, paddingBottom: 8, gap: 10 },

  uRow:   { flexDirection: 'row-reverse', alignItems: 'flex-end' },
  uBub:   { backgroundColor: '#C45508', borderRadius: 18, borderTopRightRadius: 4, padding: 14, maxWidth: SW * 0.78 },
  uTxt:   { fontSize: 14, color: '#fff', lineHeight: 22 },
  uTime:  { fontSize: 10, color: 'rgba(253,246,237,0.2)', textAlign: 'right', marginTop: 3 },

  aRow:   { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  aBdg:   { width: 26, height: 26, borderRadius: 13, backgroundColor: '#160800', borderWidth: 1, borderColor: 'rgba(107,33,168,0.45)', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 2 },
  aBub:   { backgroundColor: '#160800', borderRadius: 18, borderTopLeftRadius: 4, padding: 14, maxWidth: SW * 0.83, borderWidth: 1, borderColor: 'rgba(200,130,40,0.16)', gap: 8 },
  aTitle: { fontSize: 14, fontWeight: '700', color: '#F4A261', marginBottom: 2 },
  aTxt:   { fontSize: 14, color: '#FDF6ED', lineHeight: 25 },
  cur:    { color: '#E8620A', fontWeight: 'bold' },

  srcBox: { backgroundColor: 'rgba(201,131,10,0.07)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(201,131,10,0.18)' },
  srcHdr: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  srcLbl: { fontSize: 9, fontWeight: '700', color: 'rgba(201,131,10,0.65)', letterSpacing: 1.2 },
  srcTxt: { fontSize: 12, color: '#C9830A', lineHeight: 18 },
  verRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  verChk: { fontSize: 12, color: '#2ECC71' },
  verTxt: { fontSize: 10, color: '#2ECC71', fontWeight: '600' },

  actRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, flexWrap: 'wrap' },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(240,165,0,0.15)' },
  actUp:  { backgroundColor: 'rgba(39,174,96,0.1)',  borderColor: '#27AE60' },
  actDn:  { backgroundColor: 'rgba(231,76,60,0.1)',  borderColor: '#E74C3C' },
  actSav: { backgroundColor: 'rgba(201,131,10,0.1)', borderColor: '#C9830A' },
  actLbl: { fontSize: 10, color: 'rgba(253,246,237,0.35)', fontWeight: '600' },

  aTime:  { fontSize: 10, color: 'rgba(253,246,237,0.18)', marginTop: 2 },

  pills:  { maxHeight: 48, marginBottom: 4 },
  pillsC: { paddingHorizontal: 14, gap: 8, alignItems: 'center' },
  pill:   { backgroundColor: '#160800', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(232,98,10,0.28)' },
  pillTxt:{ fontSize: 12, color: '#F4A261', fontWeight: '500' },

  iBar:    { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#0D0500', borderTopWidth: 1, borderTopColor: 'rgba(240,165,0,0.07)', alignItems: 'flex-end' },
  inp:     { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11, color: '#FDF6ED', fontSize: 14, maxHeight: 120, minHeight: 46, borderWidth: 1, borderColor: 'rgba(200,130,40,0.16)', lineHeight: 20 },
  sendBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#E8620A', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  sendOff: { backgroundColor: 'rgba(232,98,10,0.2)', elevation: 0 },
  sendIco: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 2 },
});