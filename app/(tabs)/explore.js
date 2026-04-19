// ════════════════════════════════════════════════════════
// DharmaSetu — DharmaChat AI
// APIs: Groq (primary) → Gemini (backup) → Anthropic (tertiary)
// Full language support — Hindi, English, Regional
// ════════════════════════════════════════════════════════
import { GROQ_KEY, GEM_KEY } from '../../config_keys';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions,
  KeyboardAvoidingView, Modal, Platform, ScrollView,
  Share, StyleSheet, Text, TextInput, TouchableOpacity,
  Vibration, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW } = Dimensions.get('window');

// ─── RATE LIMITER ─────────────────────────────────────────
const Sec = {
  reqs: [],
  ok() {
    const n = Date.now();
    this.reqs = this.reqs.filter(t => n - t < 60000);
    if (this.reqs.length >= 20) return false;
    this.reqs.push(n); return true;
  },
  clean(t) { return t.replace(/<[^>]*>/g, '').replace(/[<>"';()&+\\]/g, '').trim().slice(0, 500); },
  valid(t) { return ![/ignore\s+previous/i, /system\s+prompt/i, /jailbreak/i, /pretend.*be/i].some(p => p.test(t)); }
};

// ════════════════════════════════════════════════════════
// API CALLS — Groq → Gemini → Anthropic
// ════════════════════════════════════════════════════════
async function callGroq(messages, systemPrompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.75,
      max_tokens: 1024,
    })
  });
  if (!res.ok) { const e = await res.text(); throw new Error(`Groq ${res.status}: ${e}`); }
  const d = await res.json();
  const text = d?.choices?.[0]?.message?.content;
  if (text) return text;
  throw new Error('Groq: empty response');
}

async function callGemini(fullPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEM_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: { temperature: 0.75, maxOutputTokens: 1024 },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ]
    })
  });
  if (!res.ok) { const e = await res.text(); throw new Error(`Gemini ${res.status}: ${e}`); }
  const d = await res.json();
  const text = d?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text) return text;
  throw new Error('Gemini: empty response');
}

async function callAnthropic(messages, systemPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    })
  });
  if (!res.ok) { const e = await res.text(); throw new Error(`Anthropic ${res.status}: ${e}`); }
  const d = await res.json();
  const text = d?.content?.[0]?.text;
  if (text) return text;
  throw new Error('Anthropic: empty response');
}

// ─── MASTER AI CALL with fallback chain ───────────────────
async function getAI(messages, systemPrompt) {
  // 1. Try Groq first (fastest, free)
  try {
    console.log('Trying Groq...');
    return await callGroq(messages, systemPrompt);
  } catch (e1) {
    console.log('Groq failed:', e1.message);
  }
  // 2. Try Gemini (build full prompt for Gemini)
  try {
    console.log('Trying Gemini...');
    const histText = messages.slice(-4).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
    const lastQ = messages[messages.length - 1]?.content || '';
    const fullPrompt = `${systemPrompt}\n\n${histText ? `Previous conversation:\n${histText}\n\n` : ''}Current question: ${lastQ}\n\nReply:`;
    return await callGemini(fullPrompt);
  } catch (e2) {
    console.log('Gemini failed:', e2.message);
  }
  // 3. Try Anthropic as last resort
  try {
    console.log('Trying Anthropic...');
    return await callAnthropic(messages, systemPrompt);
  } catch (e3) {
    console.log('Anthropic failed:', e3.message);
    throw new Error('ALL_APIS_FAILED');
  }
}

// ════════════════════════════════════════════════════════
// LANGUAGE CONFIG
// ════════════════════════════════════════════════════════
const LANG_INSTRUCTION = {
  hindi:    'तुम्हें केवल और केवल शुद्ध हिंदी में जवाब देना है। एक भी अंग्रेजी शब्द नहीं। Sanskrit शब्द Devanagari में लिखो।',
  english:  'Reply ONLY in pure English. No Hindi, no Hinglish.',
  marathi:  'फक्त मराठीत उत्तर द्या. एकही इंग्रजी शब्द नाही.',
  gujarati: 'ફક્ત ગુજરાતીમાં જ જવાબ આપો. એક પણ અંગ્રેજી શબ્દ નહીં.',
  bengali:  'শুধুমাত্র বাংলায় উত্তর দিন। কোনো ইংরেজি শব্দ নয়।',
  tamil:    'தமிழில் மட்டுமே பதிலளியுங்கள். ஆங்கில வார்த்தைகள் வேண்டாம்.',
  telugu:   'తెలుగులో మాత్రమే సమాధానం ఇవ్వండి. ఆంగ్ల పదాలు వేడదు.',
  kannada:  'ಕನ್ನಡದಲ್ಲಿ ಮಾತ್ರ ಉತ್ತರಿಸಿ. ಯಾವುದೇ ಇಂಗ್ಲಿಷ್ ಶಬ್ದ ಬೇಡ.',
  punjabi:  'ਸਿਰਫ਼ ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦਿਓ। ਕੋਈ ਅੰਗਰੇਜ਼ੀ ਸ਼ਬਦ ਨਹੀਂ।',
  urdu:     'صرف اردو میں جواب دیں۔ کوئی انگریزی لفظ نہیں۔',
  odia:     'କେବଳ ଓଡ଼ିଆରେ ଉତ୍ତର ଦିଅ। କୌଣସି ଇଂରାଜୀ ଶବ୍ଦ ନାହିଁ।',
};

function buildSystemPrompt(lang, name, deity, rashi, nakshatra, isFC) {
  const langRule = LANG_INSTRUCTION[lang] || LANG_INSTRUCTION.english;
  const fcLine = isFC ? '\n⚡ FACT CHECK MODE: Start with "VERDICT: TRUE/FALSE/MISLEADING" then prove with scripture.\n' : '';

  return `तुम DharmaSetu हो — एक expert Vedic guide जो Jyotishacharya, Vedic scholar और spiritual mentor का combination है।

🌐 LANGUAGE LAW (सबसे ज़रूरी नियम):
${langRule}
Sanskrit quotes Devanagari में लिखो, फिर उनका अनुवाद भी उसी भाषा में दो।
${fcLine}
👤 USER INFO: नाम=${name} | राशि=${rashi || 'अज्ञात'} | नक्षत्र=${nakshatra || 'अज्ञात'} | इष्ट देव=${deity || 'अज्ञात'}

🎯 EXPERTISE:
1. JYOTISH EXPERT: जब user personal problems पूछे (शादी में देरी, career, health, relationship) — real Jyotishacharya की तरह answer दो:
   - उनकी Rashi/Nakshatra based analysis
   - Specific time periods (कौन से साल favorable हैं)
   - किस direction में job/spouse ढूंढें
   - Specific remedies: mantra, ratna, व्रत, दान

2. SCRIPTURE EXPERT: Related shlokas quote करो with translation

3. TOPIC BOUNDARY: केवल इन विषयों पर answer दो:
   - सनातन धर्म, हिंदू दर्शन, आध्यात्मिकता
   - वेद, उपनिषद, गीता, रामायण, महाभारत, पुराण
   - देवी-देवता, मंत्र, पूजा, त्योहार
   - वैदिक ज्योतिष (Jyotish)
   - Hindu civilization के historical facts
   - Hinduism के बारे में misinformation का fact-check
   - Personal problems — Dharmic + Jyotish wisdom से

   बाकी सब topics के लिए बोलो: "DharmaSetu केवल सनातन धर्म के लिए है 🙏"

⚠️ CRITICAL FACTS (कभी गलती मत करो):
- शम्बूक को मोक्ष मिला — जाति दंड नहीं था। Colonial lie है।
- Aryan Invasion Theory: Rakhigarhi DNA 2019 से completely false साबित हुआ।
- भील समुदाय: गहरे Hindu हैं। राजा गुह (भील) Ram के सबसे प्रिय मित्र थे।
- गीता 4.13: वर्ण = गुण + कर्म, जन्म से नहीं।

📝 RESPONSE FORMAT:
TITLE: [emoji + 5-7 शब्द का title उसी भाषा में]
[Answer — warm, detailed, specific। Max 350 words।]
SHASTRIYA: [scripture references]
VERIFIED: true`;
}

function parseResp(raw) {
  let title = '', body = raw.trim(), src = '', ver = false;
  const tm = raw.match(/^TITLE:\s*(.+)$/m);
  if (tm) { title = tm[1].trim(); body = body.replace(tm[0], '').trim(); }
  const sm = raw.match(/^SHASTRIYA:\s*(.+)$/m);
  if (sm) { src = sm[1].trim(); body = body.replace(sm[0], '').trim(); }
  if (/^VERIFIED:\s*true/im.test(raw)) { ver = true; body = body.replace(/^VERIFIED:\s*true/im, '').trim(); }
  return { title, body: body.trim(), src, ver };
}

// ════════════════════════════════════════════════════════
// STORAGE & UTILS
// ════════════════════════════════════════════════════════
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
async function storeFb(q, a, rating, reason) {
  try {
    const arr = JSON.parse(await AsyncStorage.getItem('dharmasetu_feedback') || '[]');
    arr.push({ q, a, rating, reason, at: new Date().toISOString() });
    await AsyncStorage.setItem('dharmasetu_feedback', JSON.stringify(arr.slice(-200)));
    if (rating === 'up') await addPts('thumbsup');
    if (rating === 'down' && reason) await addPts('feedback_given');
  } catch { }
}
async function doShare(question, answer, src) {
  try {
    const txt = `🕉 DharmaSetu — Dharmic Wisdom\n\n` +
      (question ? `📌 ${question}\n\n` : '') +
      (answer.length > 400 ? answer.slice(0, 400) + '...' : answer) + '\n\n' +
      (src ? `📖 ${src}\n\n` : '') +
      `— Download DharmaSetu App 🙏`;
    await Share.share({ message: txt, title: 'DharmaSetu' });
  } catch { }
}
async function doTranslate(text, toLang, currentLang) {
  const sys = buildSystemPrompt(toLang, '', '', '', '', false);
  const msgs = [{ role: 'user', content: `Translate this to ${toLang}. Keep scripture refs unchanged. Return ONLY the translation:\n\n${text}` }];
  return await getAI(msgs, sys);
}

// ════════════════════════════════════════════════════════
// SUGGESTIONS (multilingual)
// ════════════════════════════════════════════════════════
const SUGG = {
  hindi:   ['मेरी शादी में देरी क्यों? ज्योतिष क्या कहता है?', 'राम ने शम्बूक को क्यों मारा?', 'आर्य आक्रमण — सच या झूठ?', 'भगवद्गीता का कर्म योग क्या है?', 'मेरे करियर की समस्या का हल बताएं'],
  english: ['Why is my marriage delayed? What does Jyotish say?', 'Why did Ram kill Shambuka?', 'Is Aryan Invasion Theory true?', 'Explain Karma Yoga from Bhagavad Gita', 'What does my Rashi say about career?'],
  marathi: ['माझ्या लग्नात उशीर का?', 'रामाने शंबूकाला का मारले?', 'गीतेमधील कर्मयोग काय आहे?', 'माझ्या राशीनुसार करिअर कसे?'],
  gujarati:['મારા લગ્નમાં વિલંબ કેમ?', 'ભગવદ ગીતાનો કર્મ યોગ શું છે?', 'આર્ય આક્રમણ — સત્ય કે જૂઠ?'],
};

// ════════════════════════════════════════════════════════
// COMPONENTS
// ════════════════════════════════════════════════════════
function ThinkDots() {
  const dots = [useRef(new Animated.Value(0.2)).current, useRef(new Animated.Value(0.2)).current, useRef(new Animated.Value(0.2)).current];
  useEffect(() => {
    dots.forEach((d, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 160),
      Animated.timing(d, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(d, { toValue: 0.2, duration: 260, useNativeDriver: true }),
      Animated.delay(360)
    ])).start());
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 5, padding: 2 }}>
      {dots.map((d, i) => <Animated.View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#E8620A', opacity: d }} />)}
    </View>
  );
}

function FbModal({ visible, onClose, onSubmit, lang }) {
  const [sel, setSel] = useState(''); const [note, setNote] = useState('');
  const isH = lang === 'hindi';
  const opts = isH
    ? ['गलत जानकारी', 'शास्त्र संदर्भ गलत', 'उत्तर अधूरा', 'भावनात्मक सहायता नहीं', 'कुछ और']
    : ['Wrong information', 'Scripture ref wrong', 'Incomplete', 'Not helpful', 'Other'];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={fm.ov}><View style={fm.box}>
        <Text style={fm.title}>{isH ? '👎 Feedback दें' : '👎 Your Feedback'}</Text>
        <Text style={fm.sub}>{isH ? 'AI को बेहतर बनाने में मदद करें 🙏' : 'Help us improve the AI 🙏'}</Text>
        {opts.map(o => (
          <TouchableOpacity key={o} style={[fm.chip, sel === o && fm.chipOn]} onPress={() => setSel(o)}>
            <Text style={[fm.cTxt, sel === o && fm.cTxtOn]}>{o}</Text>
          </TouchableOpacity>
        ))}
        <TextInput style={fm.inp} placeholder={isH ? 'और कुछ? (optional)' : 'Anything else? (optional)'} placeholderTextColor="rgba(253,246,237,0.3)" value={note} onChangeText={setNote} multiline maxLength={200} />
        <View style={fm.row}>
          <TouchableOpacity style={fm.cancel} onPress={onClose}><Text style={fm.cancelT}>{isH ? 'रद्द करें' : 'Cancel'}</Text></TouchableOpacity>
          <TouchableOpacity style={fm.submit} onPress={() => { onSubmit(sel + (note ? ' — ' + note : '')); setSel(''); setNote(''); }}>
            <Text style={fm.submitT}>Submit 🙏</Text>
          </TouchableOpacity>
        </View>
      </View></View>
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
// MAIN SCREEN
// ════════════════════════════════════════════════════════
export default function DharmaChatScreen() {
  const insets = useSafeAreaInsets();
  const [userLang,  setUserLang]  = useState('hindi');
  const [userName,  setUserName]  = useState('Dharma Rakshak');
  const [userDeity, setUserDeity] = useState('');
  const [userRashi, setUserRashi] = useState('');
  const [userNak,   setUserNak]   = useState('');
  const [chatMode,  setChatMode]  = useState('dharma');
  const [pts,       setPts]       = useState(0);
  const [ready,     setReady]     = useState(false);
  const [msgs,      setMsgs]      = useState([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [hist,      setHist]      = useState([]);
  const [transId,   setTransId]   = useState(null);
  const [isRec,     setIsRec]     = useState(false);
  const [recSec,    setRecSec]    = useState(0);
  const [fbMsgId,   setFbMsgId]   = useState(null);

  const scrollRef = useRef(null);
  const sendSc    = useRef(new Animated.Value(1)).current;
  const micSc     = useRef(new Animated.Value(1)).current;
  const micAnim   = useRef(null);
  const recTimer  = useRef(null);
  const tNow = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  // ── INIT ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('dharmasetu_user');
        const p   = parseInt(await AsyncStorage.getItem('dharmasetu_pts') || '0', 10);
        setPts(p);

        let lang = 'hindi', name = 'Dharma Rakshak', deity = '', rashi = '', nak = '';
        if (raw) {
          const u = JSON.parse(raw);
          lang  = u.language  || 'hindi';
          name  = u.name      || 'Dharma Rakshak';
          deity = u.deity     || '';
          rashi = u.rashi     || '';
          nak   = u.nakshatra || '';
        }
        setUserLang(lang); setUserName(name); setUserDeity(deity); setUserRashi(rashi); setUserNak(nak);

        const presetQ = await AsyncStorage.getItem('dharmasetu_preset_question');
        const mode    = await AsyncStorage.getItem('dharmasetu_mode');
        if (mode === 'factcheck') { setChatMode('factcheck'); await AsyncStorage.removeItem('dharmasetu_mode'); }

        const isH = lang === 'hindi';
        const greetMap = {
          hindi:   `नमस्ते, ${name}! 🙏\n\n${deity ? `${deity} की कृपा आप पर बनी रहे। 🌸\n\n` : ''}मैं DharmaSetu हूँ — आपका वैदिक मार्गदर्शक।\n\nशास्त्र, ज्योतिष, और जीवन के किसी भी प्रश्न का उत्तर दे सकता हूँ।${rashi ? `\n\nआपकी ${rashi} राशि और ${nak} नक्षत्र के अनुसार व्यक्तिगत मार्गदर्शन के लिए पूछें।` : ''}`,
          english: `Namaste, ${name}! 🙏\n\n${deity ? `May ${deity} bless you always. 🌸\n\n` : ''}I am DharmaSetu — your Vedic guide.\n\nAsk me about Dharma, Jyotish, scriptures, or life guidance.${rashi ? `\n\nBased on your ${rashi} Rashi & ${nak} Nakshatra, I can give personalized Vedic insights.` : ''}`,
          marathi: `नमस्ते, ${name}! 🙏\n\nमी DharmaSetu आहे — तुमचा वैदिक मार्गदर्शक. शास्त्र, ज्योतिष आणि जीवनाबद्दल कोणतेही प्रश्न विचारा.`,
          gujarati:`નમસ્તે, ${name}! 🙏\n\nહું DharmaSetu છું — તમારો વૈદિક માર્ગદર્શક. શાસ્ત્ર, જ્યોતિષ અને જીવન વિશે પ્રશ્ન પૂછો.`,
        };
        const greet = greetMap[lang] || greetMap.english;
        const titleMap = { hindi: '🙏 जय श्री राम', marathi: '🙏 जय श्री राम', gujarati: '🙏 જય શ્રી રામ', english: '🙏 Jai Shri Ram' };

        setMsgs([{
          id: 'w', type: 'ai', title: titleMap[lang] || titleMap.english,
          body: greet, src: '', ver: false, translations: {}, activeLang: null,
          feedback: null, saved: false, streaming: false, isWelcome: true, time: tNow()
        }]);
        setReady(true);

        if (presetQ) {
          await AsyncStorage.removeItem('dharmasetu_preset_question');
          setTimeout(() => autoSend(presetQ, lang, name, deity, rashi, nak, mode === 'factcheck'), 900);
        }

        const today = new Date().toDateString();
        const last  = await AsyncStorage.getItem('dharmasetu_checkin');
        if (last !== today) { await AsyncStorage.setItem('dharmasetu_checkin', today); const n = await addPts('daily'); setPts(n); }
      } catch (e) {
        console.error('Init error:', e);
        setReady(true);
        setMsgs([{ id: 'w', type: 'ai', title: '🙏 Jai Shri Ram', body: 'Namaste! I am DharmaSetu. Ask me about Sanatan Dharma or spiritual guidance.', src: '', ver: false, translations: {}, activeLang: null, feedback: null, saved: false, streaming: false, isWelcome: true, time: tNow() }]);
      }
    })();
  }, []);

  const scrollDown = useCallback(() => { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100); }, []);

  const pulseSend = () => {
    Vibration.vibrate(20);
    Animated.sequence([
      Animated.timing(sendSc, { toValue: 0.87, duration: 70, useNativeDriver: true }),
      Animated.spring(sendSc, { toValue: 1, friction: 3, tension: 280, useNativeDriver: true })
    ]).start();
  };

  const startRec = () => {
    setIsRec(true); setRecSec(0); Vibration.vibrate([0, 40]);
    micAnim.current = Animated.loop(Animated.sequence([
      Animated.timing(micSc, { toValue: 1.3, duration: 500, useNativeDriver: true }),
      Animated.timing(micSc, { toValue: 1, duration: 500, useNativeDriver: true })
    ]));
    micAnim.current.start();
    recTimer.current = setInterval(() => setRecSec(s => { if (s >= 30) { stopRec(); return 30; } return s + 1; }), 1000);
  };
  const stopRec = () => {
    setIsRec(false); setRecSec(0); micAnim.current?.stop(); micAnim.current = null;
    clearInterval(recTimer.current); recTimer.current = null;
    Animated.timing(micSc, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    Vibration.vibrate(25);
    const msg = { hindi: 'Voice feature जल्द आएगा। अभी type करें 🙏', english: 'Voice feature coming soon. Please type for now 🙏' };
    Alert.alert('🎤', msg[userLang] || msg.english, [{ text: 'OK 🕉' }]);
  };

  const streamText = useCallback((fullText, id) => {
    const words = fullText.split(' '); let built = '', i = 0;
    const iv = setInterval(() => {
      if (i >= words.length) { clearInterval(iv); setMsgs(p => p.map(m => m.id === id ? { ...m, streaming: false } : m)); scrollDown(); return; }
      built += (i === 0 ? '' : ' ') + words[i++];
      setMsgs(p => p.map(m => m.id === id ? { ...m, body: built } : m));
      if (i % 6 === 0) scrollDown();
    }, 25);
  }, [scrollDown]);

  // ── CORE SEND ────────────────────────────────────────────
  const coreAutoSend = async (question, lang, name, deity, rashi, nak, isFC) => {
    const clean = Sec.clean(question);
    if (!clean || clean.length < 2) return;
    const uid = Date.now().toString(), aid = (Date.now() + 1).toString(), t = tNow();
    setMsgs(prev => [...prev,
      { id: uid, type: 'user', text: clean, time: t },
      { id: aid, type: 'ai', title: '', body: '', src: '', ver: false, translations: {}, activeLang: null, feedback: null, saved: false, streaming: true, thinking: true, question: clean, time: t }
    ]);
    setLoading(true); scrollDown();
    try {
      const sys  = buildSystemPrompt(lang, name, deity, rashi, nak, isFC);
      const msgs = [{ role: 'user', content: clean }];
      const rawA = await getAI(msgs, sys);
      const parsed = parseResp(rawA);
      setMsgs(p => p.map(m => m.id === aid ? { ...m, title: parsed.title, src: parsed.src, ver: parsed.ver, origBody: parsed.body, thinking: false } : m));
      setHist(p => [...p, { role: 'user', content: clean }, { role: 'assistant', content: rawA }].slice(-16));
      streamText(parsed.body, aid);
    } catch (err) {
      console.error('AutoSend err:', err.message);
      const errMsgs = { hindi: 'सर्वर से जोड़ नहीं पाए। Internet जांचें और दोबारा try करें।', english: 'Could not connect to server. Check internet and try again.' };
      setMsgs(p => p.map(m => m.id === aid ? { ...m, body: errMsgs[lang] || errMsgs.english, thinking: false, streaming: false } : m));
    }
    setLoading(false); scrollDown();
  };

  // alias for useEffect
  const autoSend = coreAutoSend;

  const send = async (txt) => {
    const raw = (txt || input).trim();
    if (!raw || loading || !ready) return;
    if (!Sec.ok()) { Alert.alert('', userLang === 'hindi' ? 'थोड़ा रुकें।' : 'Please wait.'); return; }
    const clean = Sec.clean(raw);
    if (!Sec.valid(clean) || clean.length < 2) return;
    pulseSend(); setInput('');

    const uid = Date.now().toString(), aid = (Date.now() + 1).toString(), t = tNow();
    setMsgs(prev => [...prev,
      { id: uid, type: 'user', text: clean, time: t },
      { id: aid, type: 'ai', title: '', body: '', src: '', ver: false, translations: {}, activeLang: null, feedback: null, saved: false, streaming: true, thinking: true, question: clean, time: t }
    ]);
    setLoading(true); scrollDown();

    try {
      const sys    = buildSystemPrompt(userLang, userName, userDeity, userRashi, userNak, chatMode === 'factcheck');
      const apiMsgs = hist.slice(-8).concat([{ role: 'user', content: clean }]);
      const rawA   = await getAI(apiMsgs, sys);
      const parsed = parseResp(rawA);
      setMsgs(p => p.map(m => m.id === aid ? { ...m, title: parsed.title, src: parsed.src, ver: parsed.ver, origBody: parsed.body, thinking: false } : m));
      setHist(p => [...p, { role: 'user', content: clean }, { role: 'assistant', content: rawA }].slice(-16));
      streamText(parsed.body, aid);
    } catch (err) {
      console.error('Send err:', err.message);
      let errMsg = { hindi: 'सर्वर से जोड़ नहीं पाए। Internet जांचें और दोबारा try करें।', english: 'Server connection failed. Check internet and try again.' };
      if (err.message?.includes('SAFETY')) errMsg = { hindi: 'यह प्रश्न answer नहीं किया जा सकता।', english: 'This question cannot be answered.' };
      setMsgs(p => p.map(m => m.id === aid ? { ...m, body: errMsg[userLang] || errMsg.english, thinking: false, streaming: false } : m));
    }
    setLoading(false); scrollDown();
  };

  const handleTranslate = async (msgId, lang) => {
    const msg = msgs.find(m => m.id === msgId);
    if (!msg || msg.isWelcome) return;
    if (msg.activeLang === lang) { setMsgs(p => p.map(m => m.id === msgId ? { ...m, activeLang: null } : m)); return; }
    if (msg.translations?.[lang]) { setMsgs(p => p.map(m => m.id === msgId ? { ...m, activeLang: lang } : m)); return; }
    setTransId(msgId + lang);
    try {
      const src = (msg.origBody || msg.body) + (msg.src ? '\n' + msg.src : '');
      const tr = await doTranslate(src, lang, userLang);
      setMsgs(p => p.map(m => m.id === msgId ? { ...m, origBody: m.origBody || m.body, translations: { ...m.translations, [lang]: tr }, activeLang: lang } : m));
    } catch { Alert.alert('', 'Translation failed. Try again.'); }
    setTransId(null);
  };

  const handleUp   = msg => { if (msg.feedback) return; Vibration.vibrate(20); setMsgs(p => p.map(m => m.id === msg.id ? { ...m, feedback: 'up' } : m)); storeFb(msg.question || '', msg.body, 'up', ''); addPts('thumbsup').then(setPts); };
  const handleDown = msg => { if (!msg.feedback) setFbMsgId(msg.id); };
  const submitFb   = reason => { const msg = msgs.find(m => m.id === fbMsgId); setMsgs(p => p.map(m => m.id === fbMsgId ? { ...m, feedback: 'down' } : m)); if (msg) storeFb(msg.question || '', msg.body, 'down', reason); setFbMsgId(null); Alert.alert('🙏', userLang === 'hindi' ? 'Feedback मिल गया!' : 'Feedback received!'); addPts('feedback_given').then(setPts); };
  const handleSave = async msg => { if (msg.saved) { Alert.alert('', userLang === 'hindi' ? 'पहले से saved है।' : 'Already saved.'); return; } try { await saveAns(msg.question || '', msg.body, msg.src); setMsgs(p => p.map(m => m.id === msg.id ? { ...m, saved: true } : m)); Vibration.vibrate(20); Alert.alert('✅', '+3 Dharma Points! 🕉'); } catch (e) { Alert.alert('', e.message); } };

  const isH    = userLang === 'hindi';
  const suggs  = SUGG[userLang] || SUGG.english;
  const phText = { hindi: 'धर्म, ज्योतिष या जीवन के बारे में पूछें...', english: 'Ask about Dharma, Jyotish, or life...', marathi: 'धर्म, ज्योतिष किंवा जीवनाबद्दल विचारा...', gujarati: 'ધર્મ, જ્યોતિષ કે જીવન વિશે પૂછો...' };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#0D0500" translucent={false} />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* HEADER */}
        <View style={s.hdr}>
          <View style={s.hL}>
            <View style={s.hAv}><Text style={{ fontSize: 18 }}>🕉</Text></View>
            <View>
              <Text style={s.hTitle}>DharmaChat AI</Text>
              <View style={s.hSub}><View style={s.gDot} /><Text style={s.hSubTxt}>{chatMode === 'factcheck' ? '🛡️ Fact Check' : '💬 Online'}</Text></View>
            </View>
          </View>
          <View style={s.hR}>
            <TouchableOpacity style={[s.mBtn, chatMode === 'factcheck' && s.mBtnFC]} onPress={() => setChatMode(m => m === 'factcheck' ? 'dharma' : 'factcheck')}>
              <Text style={{ fontSize: 16 }}>{chatMode === 'factcheck' ? '💬' : '🛡️'}</Text>
            </TouchableOpacity>
            <View style={s.pBadge}><Text style={s.pTxt}>⚡ {pts}</Text></View>
          </View>
        </View>

        {chatMode === 'factcheck' && (
          <View style={s.fcBnr}>
            <Text style={s.fcBnrTxt}>{isH ? '🛡️ Fact Check — कोई भी claim paste करें, सच जानें' : '🛡️ Fact Check — Paste any claim to verify truth'}</Text>
          </View>
        )}

        {/* LANG BAR */}
        <View style={s.lBar}>
          <Text style={s.lLbl}>{isH ? 'भाषा:' : 'LANG:'}</Text>
          {[{ id: 'hindi', l: 'हिंदी' }, { id: 'english', l: 'English' }].map(({ id, l }) => (
            <TouchableOpacity key={id} style={[s.lChip, userLang === id && s.lChipOn]} onPress={() => setUserLang(id)} activeOpacity={0.8}>
              <Text style={[s.lTxt, userLang === id && s.lTxtOn]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.dSep}><View style={s.dLine} /><Text style={s.dTxt}>{isH ? 'आज' : 'TODAY'}</Text><View style={s.dLine} /></View>

        {/* MESSAGES */}
        <ScrollView ref={scrollRef} style={s.flex} contentContainerStyle={s.mList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {msgs.map(msg => {
            if (msg.type === 'user') return (
              <View key={msg.id} style={s.uRow}>
                <View><View style={s.uBub}><Text style={s.uTxt}>{msg.text}</Text></View>
                  <Text style={s.uTime}>{isH ? 'आप' : 'You'} · {msg.time}</Text></View>
              </View>
            );
            if (msg.thinking) return (
              <View key={msg.id} style={s.aRow}>
                <View style={s.aBdg}><Text style={{ fontSize: 11 }}>🕉</Text></View>
                <View style={[s.aBub, { paddingVertical: 14 }]}>
                  <ThinkDots />
                  <Text style={{ fontSize: 11, color: 'rgba(253,246,237,0.25)', marginTop: 4 }}>{isH ? 'शास्त्र और ज्योतिष खोज रहे हैं...' : 'Searching scriptures & Jyotish...'}</Text>
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
                      <View style={s.srcHdr}><Text style={{ fontSize: 11 }}>📖</Text><Text style={s.srcLbl}>{isH ? 'शास्त्रीय संदर्भ' : 'SHASTRIYA SANDARBH'}</Text></View>
                      <Text style={s.srcTxt}>{msg.src}</Text>
                      {msg.ver && <View style={s.verRow}><Text style={s.verChk}>✓</Text><Text style={s.verTxt}>{isH ? 'सत्यापित · शास्त्रीय प्रमाण' : 'Verified · Shastriya Pramaan'}</Text></View>}
                    </View>
                  ) : null}
                  {showActs && (
                    <View style={s.actRow}>
                      <TouchableOpacity style={[s.actBtn, msg.feedback === 'up' && s.actUp]} onPress={() => handleUp(msg)} disabled={!!msg.feedback} activeOpacity={0.8}>
                        <Text style={{ fontSize: 14 }}>👍</Text>{msg.feedback === 'up' && <Text style={[s.actLbl, { color: '#27AE60' }]}>✓</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.actBtn, msg.feedback === 'down' && s.actDn]} onPress={() => handleDown(msg)} disabled={!!msg.feedback} activeOpacity={0.8}>
                        <Text style={{ fontSize: 14 }}>👎</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.actBtn, msg.saved && s.actSav]} onPress={() => handleSave(msg)} activeOpacity={0.8}>
                        <Text style={{ fontSize: 14 }}>🔖</Text>
                        <Text style={[s.actLbl, msg.saved && { color: '#C9830A' }]}>{msg.saved ? (isH ? 'सेव्ड' : 'Saved') : (isH ? 'सेव' : 'Save')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.actBtn} onPress={() => doShare(msg.question || '', msg.origBody || msg.body, msg.src)} activeOpacity={0.8}>
                        <Text style={{ fontSize: 14 }}>📤</Text>
                        <Text style={s.actLbl}>{isH ? 'शेयर' : 'Share'}</Text>
                      </TouchableOpacity>
                      {[{ l: 'hindi', t: 'हिं' }, { l: 'english', t: 'EN' }, { l: 'sanskrit', t: 'संस्' }].map(({ l, t }) => (
                        <TouchableOpacity key={l} style={[s.tBtn, msg.activeLang === l && s.tBtnOn]} onPress={() => handleTranslate(msg.id, l)} disabled={!!transId} activeOpacity={0.8}>
                          {transId === msg.id + l ? <ActivityIndicator size={9} color="#E8620A" /> : <Text style={[s.tTxt, msg.activeLang === l && s.tTxtOn]}>{t}</Text>}
                        </TouchableOpacity>
                      ))}
                      {msg.activeLang && <TouchableOpacity style={s.tBtn} onPress={() => setMsgs(p => p.map(m => m.id === msg.id ? { ...m, activeLang: null } : m))}><Text style={s.tTxt}>↩</Text></TouchableOpacity>}
                    </View>
                  )}
                  {!msg.streaming && msg.time && <Text style={s.aTime}>DharmaChat · {msg.time}</Text>}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* SUGGESTIONS */}
        {msgs.length <= 1 && !loading && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pills} contentContainerStyle={s.pillsC} keyboardShouldPersistTaps="handled">
            {suggs.map((sg, i) => <TouchableOpacity key={i} style={s.pill} onPress={() => send(sg)} activeOpacity={0.8}><Text style={s.pillTxt}>{sg}</Text></TouchableOpacity>)}
          </ScrollView>
        )}

        {/* INPUT */}
        <View style={[s.iBar, { paddingBottom: 10 + insets.bottom }]}>
          {isRec ? (
            <View style={s.recBar}>
              <Animated.View style={[s.recDot, { transform: [{ scale: micSc }] }]} />
              <Text style={s.recTxt}>{isH ? `रिकॉर्ड हो रहा है... ${recSec}s` : `Recording... ${recSec}s`}</Text>
              <TouchableOpacity onPress={stopRec}><Text style={s.recStop}>{isH ? 'रोकें' : 'Stop'}</Text></TouchableOpacity>
            </View>
          ) : (
            <TextInput style={s.inp} placeholder={phText[userLang] || phText.english} placeholderTextColor="rgba(253,246,237,0.28)" value={input} onChangeText={setInput} multiline maxLength={500} blurOnSubmit={false} />
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
      <FbModal visible={!!fbMsgId} onClose={() => setFbMsgId(null)} onSubmit={submitFb} lang={userLang} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0500' }, flex: { flex: 1 },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#0D0500', borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.1)' },
  hL: { flexDirection: 'row', alignItems: 'center', gap: 12 }, hR: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hAv: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6B21A8', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(240,165,0,0.4)', elevation: 4 },
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
  sendBtn: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#E8620A', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  sendOff: { backgroundColor: 'rgba(232,98,10,0.2)', elevation: 0 },
  sendIco: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 2 },
});