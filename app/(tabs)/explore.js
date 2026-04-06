// ════════════════════════════════════════════════════════
// DharmaSetu — DharmaChat AI Screen
// FIXED: No SB_H, uses useSafeAreaInsets()
// NEW: Share button on every AI answer
// AI GUARD: Only answers Dharma/Hindu questions
// ════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW } = Dimensions.get('window');

const Sec = {
  reqs: [],
  ok() { const n = Date.now(); this.reqs = this.reqs.filter(t => n - t < 60000); if (this.reqs.length >= 20) return false; this.reqs.push(n); return true; },
  clean(t) { return t.replace(/<[^>]*>/g, '').replace(/[<>"'%;()&+\\]/g, '').trim().slice(0, 500); },
  valid(t) { return ![/ignore\s+previous/i, /system\s+prompt/i, /jailbreak/i, /pretend.*be/i, /you\s+are\s+now/i].some(p => p.test(t)); }
};

const GROQ_KEY = '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';
const GEM_KEY = 'AIzaSyDyRn42EYd5pvf3pwKvZqSb5YwLbL6Zi8Q';

// ════════════════════════════════════════════════════════
// AI SYSTEM PROMPT — Only Dharma topics
// ════════════════════════════════════════════════════════
function buildSys(lang, name, deity, rashi, isFC) {
  const LANG_RULES = {
    hindi: 'ONLY शुद्ध हिंदी (Devanagari). शून्य English, शून्य Hinglish.',
    english: 'ONLY pure English. Zero Hindi. Zero Hinglish.',
    marathi: 'ONLY मराठी.', bengali: 'ONLY বাংলা।', tamil: 'ONLY தமிழ்.',
    telugu: 'ONLY తెలుగు.', kannada: 'ONLY ಕನ್ನಡ.', gujarati: 'ONLY ગુજરાતી.',
    punjabi: 'ONLY ਪੰਜਾਬੀ.', urdu: 'ONLY اردو.',
  };
  const fcBlock = isFC ? `\nFACT CHECK MODE: Respond with VERDICT: [TRUE/FALSE/MISLEADING/MISATTRIBUTED] then full truth with scripture evidence.\n` : '';
  return `You are DharmaSetu — guardian of Sanatan Dharma. Bold, compassionate, precise.

LANGUAGE LAW — ABSOLUTE: ${LANG_RULES[lang] || LANG_RULES.hindi}
Exception: Sanskrit quotes in Devanagari, then translate.

USER: ${name || 'Dharma Rakshak'} | Rashi: ${rashi || '—'} | Deity: ${deity || '—'}
${fcBlock}

TOPIC GUARD — CRITICAL:
You ONLY answer questions about:
- Sanatan Dharma, Hinduism, Hindu scriptures
- Vedas, Upanishads, Bhagavad Gita, Ramayana, Mahabharata, Puranas
- Hindu gods, goddesses, rituals, festivals, mantras
- Dharmic philosophy, spirituality, karma, moksha
- Historical facts about Hindu civilization
- Misinformation about Hinduism (fact-checking)
- Personal struggles — answer with Dharmic wisdom

If someone asks about technology, coding, politics (unrelated), other religions (critically), movies, sports, or anything NOT related to Dharma/spirituality/Hindu civilization:
Respond ONLY: "DharmaSetu is here for Sanatan Dharma guidance. Please ask about Hindu scriptures, philosophy, mantras, or spiritual guidance. 🙏"

EMOTIONAL CARE: Personal pain → empathy first, then Dharmic wisdom tied to their specific situation and deity.

SCRIPTURE FORMAT: "श्लोक..." (Source, Ch.Verse) → [translation]

SHAMBUKA TRUTH (all 3 sources):
1) Valmiki Ramayana Uttara Kanda 74-76: Tapasya caused cosmic imbalance. Brahmin child died. Ram acted as rajadharma — not personal hatred.
2) Padma+Skanda Purana: Shambuka was rakshasa in previous birth. Tapasya was tamasic — for supernatural power, not moksha.
3) RESULT: Devatas showered flowers. Brahmin child revived. Shambuka got MOKSHA. Divine grace, not caste punishment. Colonial "oppression" narrative = 19th century fabrication.

ARYAN INVASION: Demolished — Rakhigarhi DNA 2019 (Science journal). Genetic continuity proved. AIT = colonial divide-and-rule.
KRISHNA: Jara hunter's arrow (Mahabharata, Mausala Parva 2-3). Krishna's own leela.
BHEEL: Bhil King Guha = Ram's closest friend (Ramayana, Ayodhya Kanda 1-4). Birsa Munda built Shiva+Vishnu temples.
CASTE: Gita 4.13 — Varna by GUNA+KARMA not birth. British 1871 Census rigidified caste artificially.

RESPONSE FORMAT:
TITLE: [emoji] [4-6 words in user's language]
[Answer — flowing, warm, no headers]
SHASTRIYA: [exact refs]
VERIFIED: true

RULES: Pure language only · Sanskrit quotes · Complete truth · Never fabricate · Under 300 words`;
}

async function callGroq(msgs) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: msgs, temperature: 0.75, max_tokens: 1024 })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.choices[0].message.content;
}

async function callGemini(q, sys) {
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEM_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: sys + '\n\nUser: ' + q }] }], generationConfig: { temperature: 0.75, maxOutputTokens: 1024 } })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.candidates[0].content.parts[0].text;
}

async function getAnswer(q, hist, sys) {
  const msgs = [{ role: 'system', content: sys }, ...hist.slice(-8), { role: 'user', content: q }];
  try { return await callGroq(msgs); } catch { return await callGemini(q, sys); }
}

async function doTranslate(text, toLang) {
  const nm = { hindi: 'शुद्ध हिंदी', english: 'English', sanskrit: 'Sanskrit (Devanagari)' };
  return callGroq([{ role: 'user', content: `Translate to ${nm[toLang] || toLang}. Keep scripture refs unchanged. Return only translation:\n\n${text}` }]);
}

function parseResp(raw) {
  let title = '', body = raw, src = '', ver = false;
  const tm = raw.match(/^TITLE:\s*(.+)$/m); if (tm) { title = tm[1].trim(); body = body.replace(tm[0], '').trim(); }
  const sm = raw.match(/^SHASTRIYA:\s*(.+)$/m); if (sm) { src = sm[1].trim(); body = body.replace(sm[0], '').trim(); }
  if (/^VERIFIED:\s*true/im.test(raw)) { ver = true; body = body.replace(/^VERIFIED:\s*true/im, '').trim(); }
  return { title, body, src, ver };
}

const PTS = { save: 3, thumbsup: 2, feedback_given: 2, daily: 3 };
async function addPts(type) {
  try {
    const c = parseInt(await AsyncStorage.getItem('dharmasetu_pts') || '0', 10);
    const n = c + (PTS[type] || 0);
    await AsyncStorage.setItem('dharmasetu_pts', String(n));
    return n;
  } catch { return 0; }
}
async function saveAnswer(q, a, src) {
  const raw = await AsyncStorage.getItem('dharmasetu_saved') || '[]';
  const arr = JSON.parse(raw);
  if (arr.length >= 20) throw new Error('Max 20 answers. Delete some first.');
  arr.unshift({ id: Date.now().toString(), q, a, src, at: new Date().toISOString() });
  await AsyncStorage.setItem('dharmasetu_saved', JSON.stringify(arr));
  await addPts('save');
}
async function storeFb(q, a, rating, reason) {
  try {
    const raw = await AsyncStorage.getItem('dharmasetu_feedback') || '[]';
    const arr = JSON.parse(raw);
    arr.push({ q, a, rating, reason, at: new Date().toISOString() });
    await AsyncStorage.setItem('dharmasetu_feedback', JSON.stringify(arr.slice(-200)));
    if (rating === 'up') await addPts('thumbsup');
    if (rating === 'down' && reason) await addPts('feedback_given');
  } catch { }
}

// Share answer to social media / WhatsApp
async function shareAnswer(question, answer, source) {
  try {
    const summary = answer.length > 400 ? answer.slice(0, 400) + '...' : answer;
    const shareText =
      `🕉 DharmaSetu — Dharmic Wisdom\n\n` +
      (question ? `📌 ${question}\n\n` : '') +
      `${summary}\n\n` +
      (source ? `📖 Source: ${source}\n\n` : '') +
      `— Get answers from DharmaSetu App`;
    await Share.share({ message: shareText, title: 'DharmaSetu — Dharmic Wisdom' });
  } catch (e) { }
}

const SUGG = {
  hindi: ['मैं बहुत अकेला महसूस करता हूँ', 'राम ने शम्बूक को क्यों मारा?', 'आर्य आक्रमण — सच या झूठ?', 'गीता कर्म के बारे में क्या कहती है?', 'भील समुदाय हिंदू है?'],
  english: ['I feel very lonely and lost', 'Why did Ram kill Shambuka?', 'Is Aryan Invasion Theory true?', 'What does Gita say about karma?', 'Is the Bheel community Hindu?']
};

function ThinkDots() {
  const d = [useRef(new Animated.Value(0.2)).current, useRef(new Animated.Value(0.2)).current, useRef(new Animated.Value(0.2)).current];
  useEffect(() => { d.forEach((dot, i) => Animated.loop(Animated.sequence([Animated.delay(i * 160), Animated.timing(dot, { toValue: 1, duration: 260, useNativeDriver: true }), Animated.timing(dot, { toValue: 0.2, duration: 260, useNativeDriver: true }), Animated.delay(360)])).start()); }, []);
  return (<View style={{ flexDirection: 'row', gap: 5, padding: 2 }}>{d.map((dot, i) => <Animated.View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#E8620A', opacity: dot }} />)}</View>);
}

function FbModal({ visible, onClose, onSubmit, isHindi }) {
  const [sel, setSel] = useState(''); const [note, setNote] = useState('');
  const opts = isHindi ? ['गलत जानकारी', 'शास्त्र संदर्भ गलत', 'उत्तर अधूरा', 'भावनात्मक सहायता नहीं', 'कुछ और'] : ['Wrong info', 'Scripture ref wrong', 'Incomplete', 'Not emotionally helpful', 'Other'];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={fm.ov}>
        <View style={fm.box}>
          <Text style={fm.title}>{isHindi ? '👎 Feedback' : '👎 Your Feedback'}</Text>
          <Text style={fm.sub}>{isHindi ? 'यह feedback AI को बेहतर बनाता है 🙏' : 'This feedback improves our AI 🙏'}</Text>
          {opts.map(o => <TouchableOpacity key={o} style={[fm.chip, sel === o && fm.chipOn]} onPress={() => setSel(o)}><Text style={[fm.cTxt, sel === o && fm.cTxtOn]}>{o}</Text></TouchableOpacity>)}
          <TextInput style={fm.inp} placeholder={isHindi ? 'और कुछ? (optional)' : 'Anything else? (optional)'} placeholderTextColor="rgba(253,246,237,0.3)" value={note} onChangeText={setNote} multiline maxLength={200} />
          <View style={fm.row}>
            <TouchableOpacity style={fm.cancel} onPress={onClose}><Text style={fm.cancelT}>{isHindi ? 'रद्द' : 'Cancel'}</Text></TouchableOpacity>
            <TouchableOpacity style={fm.submit} onPress={() => { onSubmit(sel + (note ? ' — ' + note : '')); setSel(''); setNote(''); }}><Text style={fm.submitT}>Submit 🙏</Text></TouchableOpacity>
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
  submitT: { color: '#fff', fontSize: 14, fontWeight: '700' }
});

// ════════════════════════════════════════════════════════
// MAIN DHARMACHAT SCREEN
// ════════════════════════════════════════════════════════
export default function DharmaChatScreen() {
  const insets = useSafeAreaInsets();
  const [userLang, setUserLang] = useState('hindi');
  const [userName, setUserName] = useState('Dharma Rakshak');
  const [userDeity, setUserDeity] = useState('');
  const [userRashi, setUserRashi] = useState('');
  const [chatMode, setChatMode] = useState('dharma');
  const [pts, setPts] = useState(0);
  const [ready, setReady] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hist, setHist] = useState([]);
  const [transId, setTransId] = useState(null);
  const [isRec, setIsRec] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [fbMsgId, setFbMsgId] = useState(null);

  const scrollRef = useRef(null);
  const sendSc = useRef(new Animated.Value(1)).current;
  const micSc = useRef(new Animated.Value(1)).current;
  const micAnim = useRef(null);
  const recTimer = useRef(null);
  const tNow = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('dharmasetu_user');
        const p = parseInt(await AsyncStorage.getItem('dharmasetu_pts') || '0', 10);
        setPts(p);
        let lang = 'hindi', name = 'Dharma Rakshak', deity = '', rashi = '';
        if (raw) { const u = JSON.parse(raw); lang = u.language || 'hindi'; name = u.name || 'Dharma Rakshak'; deity = u.deity || ''; rashi = u.rashi || ''; }
        setUserLang(lang); setUserName(name); setUserDeity(deity); setUserRashi(rashi);
        const mode = await AsyncStorage.getItem('dharmasetu_mode');
        if (mode === 'factcheck') { setChatMode('factcheck'); await AsyncStorage.removeItem('dharmasetu_mode'); }
        const isH = lang === 'hindi';
        const greet = isH
          ? `नमस्ते, ${name}! 🙏\n\n${deity ? deity + ' की कृपा आप पर बनी रहे।\n\n' : ''}मैं DharmaSetu हूँ। केवल सनातन धर्म, हिंदू शास्त्र, और आध्यात्मिक प्रश्नों का उत्तर देता हूँ।`
          : `Namaste, ${name}! 🙏\n\n${deity ? 'May ' + deity + ' bless you.\n\n' : ''}I am DharmaSetu. I answer only questions about Sanatan Dharma, Hindu scriptures, and spiritual guidance.`;
        setMsgs([{ id: 'w', type: 'ai', title: isH ? '🙏 जय श्री राम' : '🙏 Jai Shri Ram', body: greet, src: '', ver: false, translations: {}, activeLang: null, feedback: null, saved: false, streaming: false, isWelcome: true, time: tNow() }]);
        setReady(true);
        const today = new Date().toDateString();
        const last = await AsyncStorage.getItem('dharmasetu_checkin');
        if (last !== today) { await AsyncStorage.setItem('dharmasetu_checkin', today); const n = await addPts('daily'); setPts(n); }
      } catch {
        setReady(true);
        setMsgs([{ id: 'w', type: 'ai', title: '🙏 Jai Shri Ram', body: 'Namaste! I am DharmaSetu. I answer questions about Sanatan Dharma, Hindu scriptures, and spiritual guidance.', src: '', ver: false, translations: {}, activeLang: null, feedback: null, saved: false, streaming: false, isWelcome: true, time: tNow() }]);
      }
    })();
  }, []);

  const scrollDown = useCallback(() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100), []);

  const pulseSend = () => {
    Vibration.vibrate(20);
    Animated.sequence([Animated.timing(sendSc, { toValue: 0.87, duration: 70, useNativeDriver: true }), Animated.spring(sendSc, { toValue: 1, friction: 3, tension: 280, useNativeDriver: true })]).start();
  };

  const startRec = () => {
    setIsRec(true); setRecSec(0); Vibration.vibrate([0, 40]);
    micAnim.current = Animated.loop(Animated.sequence([Animated.timing(micSc, { toValue: 1.3, duration: 500, useNativeDriver: true }), Animated.timing(micSc, { toValue: 1, duration: 500, useNativeDriver: true })]));
    micAnim.current.start();
    recTimer.current = setInterval(() => setRecSec(s => { if (s >= 30) { stopRec(); return 30; } return s + 1; }), 1000);
  };

  const stopRec = () => {
    setIsRec(false); setRecSec(0);
    micAnim.current?.stop(); micAnim.current = null;
    clearInterval(recTimer.current); recTimer.current = null;
    Animated.timing(micSc, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    Vibration.vibrate(25);
    const msg = userLang === 'hindi' ? 'Voice feature Google Play publish होने के बाद active होगा। अभी type करें 🙏' : 'Voice feature will be active after Google Play release. Type for now 🙏';
    Alert.alert('🎤', msg, [{ text: '🕉 OK' }]);
  };

  const streamText = useCallback((fullText, id) => {
    const words = fullText.split(' '); let built = ''; let i = 0;
    const iv = setInterval(() => {
      if (i >= words.length) { clearInterval(iv); setMsgs(prev => prev.map(m => m.id === id ? { ...m, streaming: false } : m)); scrollDown(); return; }
      built += (i === 0 ? '' : ' ') + words[i++];
      setMsgs(prev => prev.map(m => m.id === id ? { ...m, body: built } : m));
      if (i % 8 === 0) scrollDown();
    }, 28);
  }, [scrollDown]);

  const handleTranslate = async (msgId, lang) => {
    const msg = msgs.find(m => m.id === msgId);
    if (!msg || msg.isWelcome) return;
    if (msg.activeLang === lang) { setMsgs(prev => prev.map(m => m.id === msgId ? { ...m, activeLang: null } : m)); return; }
    if (msg.translations?.[lang]) { setMsgs(prev => prev.map(m => m.id === msgId ? { ...m, activeLang: lang } : m)); return; }
    setTransId(msgId + lang);
    try {
      const src = (msg.origBody || msg.body) + (msg.src ? '\n' + msg.src : '');
      const translated = await doTranslate(src, lang);
      setMsgs(prev => prev.map(m => m.id === msgId ? { ...m, origBody: m.origBody || m.body, translations: { ...m.translations, [lang]: translated }, activeLang: lang } : m));
    } catch { Alert.alert('', 'Translation failed.'); }
    setTransId(null);
  };

  const handleUp = (msg) => {
    if (msg.feedback) return;
    Vibration.vibrate(20);
    setMsgs(prev => prev.map(m => m.id === msg.id ? { ...m, feedback: 'up' } : m));
    storeFb(msg.question || '', msg.body, 'up', '');
    addPts('thumbsup').then(setPts);
  };

  const handleDown = (msg) => { if (!msg.feedback) setFbMsgId(msg.id); };

  const submitFb = (reason) => {
    const msg = msgs.find(m => m.id === fbMsgId);
    setMsgs(prev => prev.map(m => m.id === fbMsgId ? { ...m, feedback: 'down' } : m));
    if (msg) storeFb(msg.question || '', msg.body, 'down', reason);
    setFbMsgId(null);
    Alert.alert('🙏', userLang === 'hindi' ? 'शुक्रिया! आपका feedback AI को बेहतर बनाएगा।' : 'Thank you! Your feedback improves our AI.');
    addPts('feedback_given').then(setPts);
  };

  const handleSave = async (msg) => {
    if (msg.saved) { Alert.alert('', userLang === 'hindi' ? 'पहले से saved है।' : 'Already saved.'); return; }
    try { await saveAnswer(msg.question || '', msg.body, msg.src); setMsgs(prev => prev.map(m => m.id === msg.id ? { ...m, saved: true } : m)); Vibration.vibrate(20); Alert.alert('✅', 'Saved! +3 Dharma Points 🕉'); }
    catch (e) { Alert.alert('', e.message); }
  };

  const send = async (txt) => {
    const raw = (txt || input).trim();
    if (!raw || loading || !ready) return;
    if (!Sec.ok()) { Alert.alert('', userLang === 'hindi' ? 'थोड़ा रुकें।' : 'Please wait.'); return; }
    const clean = Sec.clean(raw);
    if (!Sec.valid(clean) || clean.length < 2) return;
    pulseSend();
    const uid = Date.now().toString(); const aid = (Date.now() + 1).toString(); const t = tNow();
    setMsgs(prev => [...prev, { id: uid, type: 'user', text: clean, time: t }, { id: aid, type: 'ai', title: '', body: '', src: '', ver: false, translations: {}, activeLang: null, feedback: null, saved: false, streaming: true, thinking: true, question: clean, time: t }]);
    setInput(''); setLoading(true); scrollDown();
    try {
      const sys = buildSys(userLang, userName, userDeity, userRashi, chatMode === 'factcheck');
      const rawA = await getAnswer(clean, hist, sys);
      const parsed = parseResp(rawA);
      setMsgs(prev => prev.map(m => m.id === aid ? { ...m, title: parsed.title, src: parsed.src, ver: parsed.ver, origBody: parsed.body, thinking: false } : m));
      setHist(prev => [...prev, { role: 'user', content: clean }, { role: 'assistant', content: rawA }].slice(-16));
      streamText(parsed.body, aid);
    } catch {
      setMsgs(prev => prev.map(m => m.id === aid ? { ...m, body: userLang === 'hindi' ? 'Internet issue। Dobara try karein।' : 'Internet issue. Please try again.', thinking: false, streaming: false } : m));
    }
    setLoading(false); scrollDown();
  };

  const isH = userLang === 'hindi';
  const suggs = SUGG[userLang] || SUGG.english;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#0D0500" translucent={false} />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        <View style={s.hdr}>
          <View style={s.hL}>
            <View style={s.hAv}><Text style={{ fontSize: 18 }}>🕉</Text></View>
            <View>
              <Text style={s.hTitle}>DharmaChat AI</Text>
              <View style={s.hSub}>
                <View style={s.gDot} />
                <Text style={s.hSubTxt}>{chatMode === 'factcheck' ? '🛡️ Fact Check Mode' : (isH ? '💬 DharmaChat' : '💬 DharmaChat')}</Text>
              </View>
            </View>
          </View>
          <View style={s.hR}>
            <TouchableOpacity style={[s.mBtn, chatMode === 'factcheck' && s.mBtnFC]} onPress={() => setChatMode(m => m === 'factcheck' ? 'dharma' : 'factcheck')}>
              <Text style={{ fontSize: 16 }}>{chatMode === 'factcheck' ? '💬' : '🛡️'}</Text>
            </TouchableOpacity>
            <View style={s.pBadge}><Text style={s.pTxt}>⚡ {pts}</Text></View>
          </View>
        </View>

        {chatMode === 'factcheck' && <View style={s.fcBnr}><Text style={s.fcBnrTxt}>{isH ? '🛡️ Fact Check — कोई भी claim paste करें, सच जानें' : '🛡️ Fact Check Mode — Paste any claim to verify truth'}</Text></View>}

        <View style={s.lBar}>
          <Text style={s.lLbl}>LANG:</Text>
          {[{ id: 'hindi', l: 'हिंदी' }, { id: 'english', l: 'English' }].map(({ id, l }) => (
            <TouchableOpacity key={id} style={[s.lChip, userLang === id && s.lChipOn]} onPress={() => setUserLang(id)} activeOpacity={0.8}>
              <Text style={[s.lTxt, userLang === id && s.lTxtOn]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.dSep}><View style={s.dLine} /><Text style={s.dTxt}>TODAY</Text><View style={s.dLine} /></View>

        <ScrollView ref={scrollRef} style={s.flex} contentContainerStyle={s.mList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {msgs.map(msg => {
            if (msg.type === 'user') return (
              <View key={msg.id} style={s.uRow}>
                <View>
                  <View style={s.uBub}><Text style={s.uTxt}>{msg.text}</Text></View>
                  <Text style={s.uTime}>You · {msg.time}</Text>
                </View>
              </View>
            );
            if (msg.thinking) return (
              <View key={msg.id} style={s.aRow}>
                <View style={s.aBdg}><Text style={{ fontSize: 11 }}>🕉</Text></View>
                <View style={[s.aBub, { paddingVertical: 14 }]}>
                  <ThinkDots />
                  <Text style={{ fontSize: 11, color: 'rgba(253,246,237,0.25)', marginTop: 4 }}>{isH ? 'शास्त्र खोज रहे हैं...' : 'Searching scriptures...'}</Text>
                </View>
              </View>
            );
            const showTxt = msg.activeLang && msg.translations?.[msg.activeLang] ? msg.translations[msg.activeLang] : msg.body;
            const showActs = !msg.isWelcome && !msg.streaming && msg.body?.length > 10;
            return (
              <View key={msg.id} style={s.aRow}>
                <View style={s.aBdg}><Text style={{ fontSize: 11 }}>🕉</Text></View>
                <View style={s.aBub}>
                  {msg.title ? <Text style={s.aTitle}>{msg.title}</Text> : null}
                  <Text style={s.aTxt}>{showTxt}{msg.streaming ? <Text style={s.cur}> ▌</Text> : null}</Text>
                  {msg.src && !msg.streaming ? (
                    <View style={s.srcBox}>
                      <View style={s.srcHdr}><Text style={{ fontSize: 11 }}>📖</Text><Text style={s.srcLbl}>SHASTRIYA SANDARBH</Text></View>
                      <Text style={s.srcTxt}>{msg.src}</Text>
                      {msg.ver && <View style={s.verRow}><Text style={s.verChk}>✓</Text><Text style={s.verTxt}>Verified · Shastriya Pramaan</Text></View>}
                    </View>
                  ) : null}
                  {showActs && (
                    <View style={s.actRow}>
                      <TouchableOpacity style={[s.actBtn, msg.feedback === 'up' && s.actUp]} onPress={() => handleUp(msg)} disabled={!!msg.feedback} activeOpacity={0.8}>
                        <Text style={{ fontSize: 14 }}>👍</Text>{msg.feedback === 'up' && <Text style={[s.actLbl, { color: '#27AE60' }]}>{isH ? 'सही' : 'Correct'}</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.actBtn, msg.feedback === 'down' && s.actDn]} onPress={() => handleDown(msg)} disabled={!!msg.feedback} activeOpacity={0.8}>
                        <Text style={{ fontSize: 14 }}>👎</Text>{msg.feedback === 'down' && <Text style={[s.actLbl, { color: '#E74C3C' }]}>Feedback</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.actBtn, msg.saved && s.actSav]} onPress={() => handleSave(msg)} activeOpacity={0.8}>
                        <Text style={{ fontSize: 14 }}>🔖</Text><Text style={[s.actLbl, msg.saved && { color: '#C9830A' }]}>{msg.saved ? 'Saved' : 'Save'}</Text>
                      </TouchableOpacity>
                      {/* ── SHARE BUTTON ── */}
                      <TouchableOpacity
                        style={s.actBtn}
                        onPress={() => shareAnswer(msg.question || '', msg.origBody || msg.body, msg.src)}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 14 }}>📤</Text>
                        <Text style={s.actLbl}>{isH ? 'Share' : 'Share'}</Text>
                      </TouchableOpacity>
                      {[{ l: 'hindi', t: 'हिं' }, { l: 'english', t: 'EN' }, { l: 'sanskrit', t: 'संस्' }].map(({ l, t }) => (
                        <TouchableOpacity key={l} style={[s.tBtn, msg.activeLang === l && s.tBtnOn]} onPress={() => handleTranslate(msg.id, l)} disabled={!!transId} activeOpacity={0.8}>
                          {transId === msg.id + l ? <ActivityIndicator size={9} color="#E8620A" /> : <Text style={[s.tTxt, msg.activeLang === l && s.tTxtOn]}>{t}</Text>}
                        </TouchableOpacity>
                      ))}
                      {msg.activeLang && <TouchableOpacity style={s.tBtn} onPress={() => setMsgs(prev => prev.map(m => m.id === msg.id ? { ...m, activeLang: null } : m))}><Text style={s.tTxt}>↩</Text></TouchableOpacity>}
                    </View>
                  )}
                  {!msg.streaming && msg.time && <Text style={s.aTime}>DharmaChat · {msg.time}</Text>}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {msgs.length <= 1 && !loading && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pills} contentContainerStyle={s.pillsC} keyboardShouldPersistTaps="handled">
            {suggs.map((sg, i) => <TouchableOpacity key={i} style={s.pill} onPress={() => send(sg)} activeOpacity={0.8}><Text style={s.pillTxt}>{sg}</Text></TouchableOpacity>)}
          </ScrollView>
        )}

        <View style={[s.iBar, { paddingBottom: 10 + insets.bottom }]}>
          {isRec ? (
            <View style={s.recBar}>
              <Animated.View style={[s.recDot, { transform: [{ scale: micSc }] }]} />
              <Text style={s.recTxt}>Recording... {recSec}s</Text>
              <TouchableOpacity onPress={stopRec}><Text style={s.recStop}>Stop</Text></TouchableOpacity>
            </View>
          ) : (
            <TextInput style={s.inp} placeholder={isH ? 'यहाँ पूछें — धर्म या जीवन के बारे में...' : 'Ask anything about Dharma or life...'} placeholderTextColor="rgba(253,246,237,0.28)" value={input} onChangeText={setInput} multiline maxLength={500} blurOnSubmit={false} />
          )}
          <Animated.View style={{ transform: [{ scale: micSc }] }}>
            <TouchableOpacity style={[s.micBtn, isRec && s.micOn]} onPress={isRec ? stopRec : startRec} activeOpacity={0.85}>
              <Text style={{ fontSize: 18 }}>{isRec ? '⏹' : '🎤'}</Text>
            </TouchableOpacity>
          </Animated.View>
          <Animated.View style={{ transform: [{ scale: sendSc }] }}>
            <TouchableOpacity style={[s.sendBtn, (!input.trim() || loading) && s.sendOff]} onPress={() => send(input)} disabled={(!input.trim() && !isRec) || loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.sendIco}>›</Text>}
            </TouchableOpacity>
          </Animated.View>
        </View>

      </KeyboardAvoidingView>
      <FbModal visible={!!fbMsgId} onClose={() => setFbMsgId(null)} onSubmit={submitFb} isHindi={isH} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0500' }, flex: { flex: 1 },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#0D0500', borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.1)' },
  hL: { flexDirection: 'row', alignItems: 'center', gap: 12 }, hR: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hAv: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6B21A8', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(240,165,0,0.4)', elevation: 4, shadowColor: '#6B21A8', shadowOpacity: 0.5, shadowRadius: 6 },
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
  uBub: { backgroundColor: '#C45508', borderRadius: 18, borderTopRightRadius: 4, padding: 14, maxWidth: SW * 0.78, elevation: 3, shadowColor: '#C45508', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  uTxt: { fontSize: 14, color: '#fff', lineHeight: 22 },
  uTime: { fontSize: 10, color: 'rgba(253,246,237,0.2)', textAlign: 'right', marginTop: 3 },
  aRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  aBdg: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#160800', borderWidth: 1, borderColor: 'rgba(107,33,168,0.45)', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 2 },
  aBub: { backgroundColor: '#160800', borderRadius: 18, borderTopLeftRadius: 4, padding: 14, maxWidth: SW * 0.83, borderWidth: 1, borderColor: 'rgba(200,130,40,0.16)', gap: 8 },
  aTitle: { fontSize: 14, fontWeight: '700', color: '#F4A261', marginBottom: 2 },
  aTxt: { fontSize: 14, color: '#FDF6ED', lineHeight: 25 },
  cur: { color: '#E8620A', fontWeight: 'bold' },
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
  tBtn: { borderWidth: 1, borderColor: 'rgba(240,165,0,0.16)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, alignItems: 'center' },
  tBtnOn: { backgroundColor: 'rgba(232,98,10,0.16)', borderColor: '#E8620A' },
  tTxt: { fontSize: 11, color: 'rgba(253,246,237,0.28)', fontWeight: '600' },
  tTxtOn: { color: '#F4A261' },
  aTime: { fontSize: 10, color: 'rgba(253,246,237,0.18)', marginTop: 2 },
  pills: { maxHeight: 46, marginBottom: 4 },
  pillsC: { paddingHorizontal: 14, gap: 8, alignItems: 'center' },
  pill: { backgroundColor: '#160800', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(232,98,10,0.28)' },
  pillTxt: { fontSize: 12, color: '#F4A261', fontWeight: '500' },
  iBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#0D0500', borderTopWidth: 1, borderTopColor: 'rgba(240,165,0,0.07)', alignItems: 'flex-end' },
  recBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(232,98,10,0.1)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(232,98,10,0.3)' },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E8620A' },
  recTxt: { flex: 1, fontSize: 13, color: '#F4A261' },
  recStop: { fontSize: 12, color: '#E8620A', fontWeight: '700' },
  inp: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11, color: '#FDF6ED', fontSize: 14, maxHeight: 120, minHeight: 46, borderWidth: 1, borderColor: 'rgba(200,130,40,0.16)', lineHeight: 20 },
  micBtn: { width: 44, height: 44, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(200,130,40,0.18)' },
  micOn: { backgroundColor: 'rgba(232,98,10,0.18)', borderColor: '#E8620A' },
  sendBtn: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#E8620A', alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#E8620A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.45, shadowRadius: 5 },
  sendOff: { backgroundColor: 'rgba(232,98,10,0.2)', elevation: 0, shadowOpacity: 0 },
  sendIco: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 2 },
});