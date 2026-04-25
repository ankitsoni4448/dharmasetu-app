// ════════════════════════════════════════════════════════
// NEW COMPONENTS TO ADD TO HOME SCREEN
// Add these above the HomeScreen export
// ════════════════════════════════════════════════════════

import { getPanchang } from '../utils/panchang';

// ── PANCHANG CARD ──────────────────────────────────────
function PanchangCard({ lang }) {
  const [panchang, setPanchang] = useState(null);
  const isH = lang === 'hindi';
  
  useEffect(() => {
    const p = getPanchang(new Date());
    setPanchang(p);
  }, []);
  
  if (!panchang) return null;
  
  const auraColor = panchang.auspicious ? '#27AE60' : panchang.inauspicious ? '#E74C3C' : '#C9830A';
  
  return (
    <View style={pc.card}>
      {/* Header */}
      <View style={pc.header}>
        <View>
          <Text style={pc.title}>📅 {isH ? 'आज का पंचांग' : "Today's Panchang"}</Text>
          <Text style={pc.samvat}>{isH ? `विक्रम संवत ${panchang.samvat}` : `Vikram Samvat ${panchang.samvat}`}</Text>
        </View>
        <View style={[pc.auSpot, { backgroundColor: auraColor + '20', borderColor: auraColor + '50' }]}>
          <Text style={[pc.auTxt, { color: auraColor }]}>
            {panchang.auspicious ? (isH ? '✨ शुभ' : '✨ Auspicious') : panchang.inauspicious ? (isH ? '⚠️ सावधान' : '⚠️ Caution') : (isH ? '⚖️ सामान्य' : '⚖️ Normal')}
          </Text>
        </View>
      </View>
      
      {/* Grid */}
      <View style={pc.grid}>
        {[
          { label: isH ? 'तिथि' : 'Tithi', value: panchang.tithi, icon: '🌙' },
          { label: isH ? 'पक्ष' : 'Paksha', value: isH ? panchang.pakshaHi : panchang.paksha, icon: '☯️' },
          { label: isH ? 'नक्षत्र' : 'Nakshatra', value: panchang.nakshatra, icon: '⭐' },
          { label: isH ? 'योग' : 'Yoga', value: panchang.yoga, icon: '🕉' },
          { label: isH ? 'वार' : 'Vaar', value: isH ? panchang.vaar : panchang.vaarEn, icon: '📆' },
          { label: isH ? 'करण' : 'Karana', value: panchang.karana, icon: '🔯' },
        ].map((item, i) => (
          <View key={i} style={pc.cell}>
            <Text style={pc.cellIcon}>{item.icon}</Text>
            <Text style={pc.cellLabel}>{item.label}</Text>
            <Text style={pc.cellValue} numberOfLines={2}>{item.value}</Text>
          </View>
        ))}
      </View>
      
      {/* Sun times */}
      <View style={pc.sunRow}>
        <View style={pc.sunItem}>
          <Text style={pc.sunIcon}>🌅</Text>
          <Text style={pc.sunLabel}>{isH ? 'सूर्योदय' : 'Sunrise'}</Text>
          <Text style={pc.sunVal}>{panchang.sunrise}</Text>
        </View>
        <View style={pc.sunDiv} />
        <View style={pc.sunItem}>
          <Text style={pc.sunIcon}>🌄</Text>
          <Text style={pc.sunLabel}>{isH ? 'सूर्यास्त' : 'Sunset'}</Text>
          <Text style={pc.sunVal}>{panchang.sunset}</Text>
        </View>
        <View style={pc.sunDiv} />
        <View style={pc.sunItem}>
          <Text style={pc.sunIcon}>⚠️</Text>
          <Text style={pc.sunLabel}>{isH ? 'राहु काल' : 'Rahu Kaal'}</Text>
          <Text style={[pc.sunVal, { color: '#E74C3C', fontSize: 10 }]}>{panchang.rahuKaal}</Text>
        </View>
        <View style={pc.sunDiv} />
        <View style={pc.sunItem}>
          <Text style={pc.sunIcon}>✨</Text>
          <Text style={pc.sunLabel}>{isH ? 'अभिजित' : 'Abhijit'}</Text>
          <Text style={[pc.sunVal, { color: '#27AE60', fontSize: 10 }]}>{panchang.abhijit}</Text>
        </View>
      </View>
      
      {/* Today's deity */}
      {panchang.vaarDeity && (
        <View style={pc.deity}>
          <Text style={pc.deityTxt}>
            🙏 {isH ? `आज ${panchang.vaar} है — ${panchang.vaarDeity} की विशेष पूजा करें` : `Today is ${panchang.vaarEn} — Special worship of ${panchang.vaarDeity}`}
          </Text>
        </View>
      )}
      
      {/* Special events */}
      {panchang.specialEvents.length > 0 && (
        <View style={pc.events}>
          {panchang.specialEvents.map((ev, i) => (
            <View key={i} style={pc.event}>
              <Text style={pc.eventTxt}>{ev}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const pc = StyleSheet.create({
  card: { backgroundColor: '#0F0600', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(240,165,0,0.2)', elevation: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  title: { fontSize: 14, fontWeight: '800', color: '#F4A261' },
  samvat: { fontSize: 10, color: 'rgba(253,246,237,0.35)', marginTop: 2 },
  auSpot: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  auTxt: { fontSize: 11, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  cell: { width: '30%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 9, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(240,165,0,0.08)' },
  cellIcon: { fontSize: 16, marginBottom: 3 },
  cellLabel: { fontSize: 9, color: 'rgba(253,246,237,0.35)', fontWeight: '600', marginBottom: 2 },
  cellValue: { fontSize: 11, color: '#F4A261', fontWeight: '700', textAlign: 'center' },
  sunRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginBottom: 10 },
  sunItem: { flex: 1, alignItems: 'center' },
  sunDiv: { width: 1, backgroundColor: 'rgba(240,165,0,0.12)', marginVertical: 4 },
  sunIcon: { fontSize: 16, marginBottom: 3 },
  sunLabel: { fontSize: 9, color: 'rgba(253,246,237,0.3)', marginBottom: 2 },
  sunVal: { fontSize: 12, color: '#F4A261', fontWeight: '700' },
  deity: { backgroundColor: 'rgba(201,131,10,0.08)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(201,131,10,0.2)', marginBottom: 8 },
  deityTxt: { fontSize: 12, color: '#C9830A', textAlign: 'center', fontWeight: '600' },
  events: { gap: 6 },
  event: { backgroundColor: 'rgba(39,174,96,0.08)', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: 'rgba(39,174,96,0.2)' },
  eventTxt: { fontSize: 12, color: '#27AE60', fontWeight: '600' },
});

// ── MOOD MANTRA ENGINE ────────────────────────────────
const MOOD_DATA = {
  anxiety: {
    emoji: '😰', 
    labelHi: 'चिंता / भय', 
    labelEn: 'Anxiety / Fear',
    mantra: 'ॐ नमः शिवाय',
    mantraEn: 'Om Namah Shivaya',
    shlok: 'नैनं छिद्रन्ति शस्त्राणि नैनं दहति पावकः।',
    shlokEn: 'Bhagavad Gita 2.23 — The soul cannot be cut, burned, or destroyed.',
    breathHi: '4-7-8 श्वास: 4 सेकंड श्वास लें, 7 रोकें, 8 में छोड़ें',
    breathEn: '4-7-8 Breathing: Inhale 4s, Hold 7s, Exhale 8s',
    actionHi: 'Shiv Chalisa पढ़ें या नजदीकी मंदिर जाएं',
    actionEn: 'Read Shiv Chalisa or visit nearest Mandir',
    color: '#6B21A8',
  },
  anger: {
    emoji: '😠',
    labelHi: 'क्रोध',
    labelEn: 'Anger',
    mantra: 'ॐ शांतिः शांतिः शांतिः',
    mantraEn: 'Om Shanti Shanti Shanti',
    shlok: 'क्रोधाद्भवति संमोहः संमोहात्स्मृतिविभ्रमः।',
    shlokEn: 'BG 2.63 — Anger clouds judgment, destroys wisdom.',
    breathHi: '6-2-6 श्वास: नाक से 6 सेकंड, 2 रोकें, मुँह से 6 में छोड़ें',
    breathEn: '6-2-6: Inhale nose 6s, Hold 2s, Exhale mouth 6s',
    actionHi: 'ठंडा पानी पिएं। 108 बार ओम जपें।',
    actionEn: 'Drink cold water. Chant Om 108 times.',
    color: '#E74C3C',
  },
  sadness: {
    emoji: '😢',
    labelHi: 'दुःख / उदासी',
    labelEn: 'Sadness / Grief',
    mantra: 'हरे कृष्ण हरे कृष्ण, कृष्ण कृष्ण हरे हरे',
    mantraEn: 'Hare Krishna Hare Krishna...',
    shlok: 'वासांसि जीर्णानि यथा विहाय नवानि गृह्णाति नरोऽपराणि।',
    shlokEn: 'BG 2.22 — As one discards old clothes, the soul takes a new body. All endings are new beginnings.',
    breathHi: '5-5-5 श्वास: समान लय में श्वास लें, रोकें, छोड़ें',
    breathEn: '5-5-5 Box breathing — equal rhythm soothes the heart',
    actionHi: 'Sundara Kanda का पाठ करें — Hanuman की कथा मन को शक्ति देती है',
    actionEn: 'Read Sundara Kanda — Hanuman\'s story gives strength to the mind',
    color: '#3498DB',
  },
  low_confidence: {
    emoji: '😟',
    labelHi: 'आत्मविश्वास की कमी',
    labelEn: 'Low Confidence',
    mantra: 'ॐ नमो हनुमते रुद्रावताराय',
    mantraEn: 'Om Namo Hanumate Rudravataray',
    shlok: 'यदा यदा हि धर्मस्य ग्लानिर्भवति भारत।',
    shlokEn: 'BG 4.7 — Whenever I am called, I rise. You too have infinite power within.',
    breathHi: '4-0-4 शक्ति श्वास: गहरा श्वास लें, सीधे छोड़ें',
    breathEn: '4-0-4 Power breath: Deep inhale, direct exhale',
    actionHi: 'सूर्य नमस्कार 12 बार करें। हनुमान चालीसा पढ़ें।',
    actionEn: 'Do 12 Surya Namaskars. Read Hanuman Chalisa.',
    color: '#E8620A',
  },
  gratitude: {
    emoji: '🙏',
    labelHi: 'कृतज्ञता / आनंद',
    labelEn: 'Gratitude / Joy',
    mantra: 'ॐ श्रीं महालक्ष्म्यै नमः',
    mantraEn: 'Om Shreem Mahalakshmyai Namah',
    shlok: 'सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः।',
    shlokEn: 'May all be happy. May all be free from illness.',
    breathHi: 'प्राण श्वास: श्वास लेते हुए "धन्यवाद" मन में कहें',
    breathEn: 'Gratitude breath: Say "thank you" in mind as you inhale',
    actionHi: 'आज किसी को अकारण कुछ दें। दान से लक्ष्मी आती हैं।',
    actionEn: 'Give something to someone today. Lakshmi flows through generosity.',
    color: '#27AE60',
  },
  focus: {
    emoji: '🎯',
    labelHi: 'एकाग्रता चाहिए',
    labelEn: 'Need Focus',
    mantra: 'ॐ ऐं सरस्वत्यै नमः',
    mantraEn: 'Om Aim Saraswatyai Namah',
    shlok: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।',
    shlokEn: 'BG 2.47 — Focus on action, not result. This is the secret of peak performance.',
    breathHi: 'Bhramari Pranayama: कान बंद करें, गुनगुनाएं',
    breathEn: 'Bhramari: Close ears with thumbs, hum deeply',
    actionHi: 'अभी 20 मिनट का timer लगाएं। बस एक काम।',
    actionEn: 'Set a 20-min timer right now. One task only.',
    color: '#C9830A',
  },
};

function MoodMantraEngine({ lang, onAsk }) {
  const [selectedMood, setSelectedMood] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const isH = lang === 'hindi';
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  const selectMood = (moodKey) => {
    if (selectedMood === moodKey) { setSelectedMood(null); setExpanded(false); return; }
    setSelectedMood(moodKey);
    setExpanded(true);
    Animated.spring(slideAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
  };
  
  const mood = selectedMood ? MOOD_DATA[selectedMood] : null;
  
  return (
    <View style={mm2.card}>
      <Text style={mm2.title}>🧘 {isH ? 'अभी कैसा महसूस हो रहा है?' : 'How are you feeling right now?'}</Text>
      <View style={mm2.moodGrid}>
        {Object.entries(MOOD_DATA).map(([key, m]) => (
          <TouchableOpacity
            key={key}
            style={[mm2.moodBtn, selectedMood === key && { borderColor: m.color, backgroundColor: m.color + '18' }]}
            onPress={() => selectMood(key)}
            activeOpacity={0.8}>
            <Text style={mm2.moodEmoji}>{m.emoji}</Text>
            <Text style={[mm2.moodLabel, selectedMood === key && { color: m.color }]}>
              {isH ? m.labelHi : m.labelEn}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {mood && (
        <Animated.View style={[mm2.result, { opacity: slideAnim, transform: [{ translateY: slideAnim.interpolate({ inputRange: [0,1], outputRange: [20, 0] }) }] }]}>
          {/* Mantra */}
          <View style={[mm2.mantraBox, { borderColor: mood.color + '40' }]}>
            <Text style={mm2.mantraLabel}>📿 {isH ? 'मंत्र' : 'Mantra'}</Text>
            <Text style={[mm2.mantra, { color: mood.color }]}>{mood.mantra}</Text>
            {isH && <Text style={mm2.mantraEn}>{mood.mantraEn}</Text>}
          </View>
          
          {/* Shlok */}
          <View style={mm2.shlokBox}>
            <Text style={mm2.shlokLabel}>📖 {isH ? 'शास्त्र वचन' : 'Shastra'}</Text>
            <Text style={mm2.shlok}>{isH ? mood.shlok : mood.shlokEn}</Text>
          </View>
          
          {/* Breathing */}
          <View style={mm2.breathBox}>
            <Text style={mm2.breathLabel}>🌬️ {isH ? 'प्राणायाम' : 'Pranayama'}</Text>
            <Text style={mm2.breathTxt}>{isH ? mood.breathHi : mood.breathEn}</Text>
          </View>
          
          {/* Action */}
          <View style={mm2.actionBox}>
            <Text style={mm2.actionLabel}>⚡ {isH ? 'अभी करें' : 'Do Now'}</Text>
            <Text style={mm2.actionTxt}>{isH ? mood.actionHi : mood.actionEn}</Text>
          </View>
          
          <TouchableOpacity
            style={[mm2.askBtn, { backgroundColor: mood.color }]}
            onPress={() => onAsk(isH ? `मैं अभी ${MOOD_DATA[selectedMood].labelHi} महसूस कर रहा हूँ। गीता और धर्म के अनुसार मार्गदर्शन दें।` : `I am feeling ${MOOD_DATA[selectedMood].labelEn} right now. Guide me through Gita and Dharma wisdom.`)}>
            <Text style={mm2.askBtnTxt}>🕉 {isH ? 'DharmaChat से गहरी सलाह लें' : 'Get deeper guidance from DharmaChat'} →</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const mm2 = StyleSheet.create({
  card: { backgroundColor: '#0F0600', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(240,165,0,0.15)' },
  title: { fontSize: 14, fontWeight: '800', color: '#F4A261', marginBottom: 14 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  moodBtn: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(200,130,40,0.2)', backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', minWidth: 95 },
  moodEmoji: { fontSize: 20, marginBottom: 3 },
  moodLabel: { fontSize: 11, color: 'rgba(253,246,237,0.5)', fontWeight: '600', textAlign: 'center' },
  result: { marginTop: 14, gap: 10 },
  mantraBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, borderWidth: 1 },
  mantraLabel: { fontSize: 10, color: 'rgba(253,246,237,0.35)', fontWeight: '700', marginBottom: 6 },
  mantra: { fontSize: 18, fontWeight: '800', textAlign: 'center', lineHeight: 28 },
  mantraEn: { fontSize: 11, color: 'rgba(253,246,237,0.35)', textAlign: 'center', marginTop: 4 },
  shlokBox: { backgroundColor: 'rgba(107,33,168,0.1)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(107,33,168,0.2)' },
  shlokLabel: { fontSize: 10, color: 'rgba(212,168,255,0.6)', fontWeight: '700', marginBottom: 5 },
  shlok: { fontSize: 13, color: 'rgba(212,168,255,0.85)', lineHeight: 21 },
  breathBox: { backgroundColor: 'rgba(39,174,96,0.08)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(39,174,96,0.2)' },
  breathLabel: { fontSize: 10, color: 'rgba(100,220,150,0.6)', fontWeight: '700', marginBottom: 5 },
  breathTxt: { fontSize: 13, color: 'rgba(100,220,150,0.85)', lineHeight: 20 },
  actionBox: { backgroundColor: 'rgba(232,98,10,0.08)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(232,98,10,0.2)' },
  actionLabel: { fontSize: 10, color: '#E8620A', fontWeight: '700', marginBottom: 5 },
  actionTxt: { fontSize: 13, color: 'rgba(253,246,237,0.8)', lineHeight: 20 },
  askBtn: { borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  askBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

// ── JAPA COUNTER (Sadhana Tracker) ────────────────────
function JapaCounter({ lang }) {
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(108);
  const [totalToday, setTotalToday] = useState(0);
  const [mantraIdx, setMantraIdx] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isH = lang === 'hindi';
  
  const QUICK_MANTRAS = [
    { m: 'ॐ नमः शिवाय', short: 'Shiva' },
    { m: 'ॐ नमो भगवते वासुदेवाय', short: 'Vishnu' },
    { m: 'ॐ श्री राम जय राम', short: 'Ram' },
    { m: 'ॐ गं गणपतये नमः', short: 'Ganesh' },
  ];
  
  useEffect(() => {
    AsyncStorage.getItem(`japa_${new Date().toDateString()}`).then(v => {
      if (v) setTotalToday(parseInt(v, 10) || 0);
    });
  }, []);
  
  const tap = () => {
    Vibration.vibrate(8);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 60, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
    ]).start();
    
    const newCount = count + 1;
    const newTotal = totalToday + 1;
    setCount(newCount);
    setTotalToday(newTotal);
    AsyncStorage.setItem(`japa_${new Date().toDateString()}`, String(newTotal));
    
    if (newCount === target) {
      Vibration.vibrate([0, 100, 100, 100]);
      Alert.alert('🕉 जय!', isH ? `${target} जप पूर्ण! आज कुल: ${newTotal}` : `${target} japa complete! Today total: ${newTotal}`);
    }
  };
  
  const pct = Math.min(100, (count / target) * 100);
  
  return (
    <View style={jc.card}>
      <View style={jc.header}>
        <Text style={jc.title}>📿 {isH ? 'जप काउंटर' : 'Japa Counter'}</Text>
        <Text style={jc.todayTotal}>{isH ? `आज: ${totalToday} जप` : `Today: ${totalToday} chants`}</Text>
      </View>
      
      {/* Mantra selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {QUICK_MANTRAS.map((m, i) => (
            <TouchableOpacity key={i}
              style={[jc.mantraChip, mantraIdx === i && jc.mantraChipOn]}
              onPress={() => { setMantraIdx(i); setCount(0); }}>
              <Text style={[jc.mantraChipTxt, mantraIdx === i && { color: '#F4A261' }]}>{m.short}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      
      <Text style={jc.mantraTxt}>{QUICK_MANTRAS[mantraIdx].m}</Text>
      
      {/* Progress ring area */}
      <View style={jc.center}>
        <View style={jc.progressRing}>
          <View style={[jc.progressFill, { width: `${pct}%` }]} />
        </View>
        
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity style={jc.malaBtn} onPress={tap} activeOpacity={0.85}>
            <Text style={jc.malaBtnIcon}>🕉</Text>
            <Text style={jc.malaBtnCount}>{count}</Text>
            <Text style={jc.malaBtnSub}>{isH ? 'टैप करें' : 'Tap'}</Text>
          </TouchableOpacity>
        </Animated.View>
        
        <Text style={jc.target}>{count} / {target}</Text>
      </View>
      
      {/* Target buttons */}
      <View style={jc.targets}>
        {[27, 54, 108, 1008].map(t => (
          <TouchableOpacity key={t}
            style={[jc.targetBtn, target === t && jc.targetBtnOn]}
            onPress={() => { setTarget(t); setCount(0); }}>
            <Text style={[jc.targetBtnTxt, target === t && { color: '#F4A261' }]}>{t}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={jc.resetBtn} onPress={() => setCount(0)}>
          <Text style={jc.resetTxt}>↺</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const jc = StyleSheet.create({
  card: { backgroundColor: '#0F0600', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(240,165,0,0.15)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 14, fontWeight: '800', color: '#F4A261' },
  todayTotal: { fontSize: 11, color: '#C9830A', fontWeight: '600' },
  mantraChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(200,130,40,0.2)' },
  mantraChipOn: { backgroundColor: 'rgba(232,98,10,0.15)', borderColor: '#E8620A' },
  mantraChipTxt: { fontSize: 12, color: 'rgba(253,246,237,0.4)', fontWeight: '600' },
  mantraTxt: { fontSize: 15, color: '#F4A261', textAlign: 'center', fontWeight: '700', marginBottom: 16, lineHeight: 24 },
  center: { alignItems: 'center', marginBottom: 14 },
  progressRing: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: 6, backgroundColor: '#E8620A', borderRadius: 3 },
  malaBtn: { width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(107,33,168,0.3)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(240,165,0,0.4)', elevation: 8 },
  malaBtnIcon: { fontSize: 36, marginBottom: 4 },
  malaBtnCount: { fontSize: 28, fontWeight: '800', color: '#F4A261' },
  malaBtnSub: { fontSize: 12, color: 'rgba(253,246,237,0.4)' },
  target: { fontSize: 14, color: 'rgba(253,246,237,0.4)', marginTop: 10, fontWeight: '600' },
  targets: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  targetBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(200,130,40,0.2)' },
  targetBtnOn: { backgroundColor: 'rgba(232,98,10,0.15)', borderColor: '#E8620A' },
  targetBtnTxt: { fontSize: 13, color: 'rgba(253,246,237,0.4)', fontWeight: '700' },
  resetBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(231,76,60,0.3)', backgroundColor: 'rgba(231,76,60,0.08)' },
  resetTxt: { fontSize: 16, color: '#E74C3C', fontWeight: '700' },
});

// ── FESTIVAL COUNTDOWN ────────────────────────────────
function FestivalCountdown({ lang }) {
  const isH = lang === 'hindi';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const all = [
    ...FESTIVALS_2025_2026.map(f => ({ ...f, type: 'festival' })),
    ...EKADASHI_2025_2026.map(e => ({ ...e, type: 'ekadashi', deity: 'Vishnu' })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  const upcoming = all.filter(f => {
    const d = new Date(f.date);
    d.setHours(0, 0, 0, 0);
    return d >= today;
  }).slice(0, 4);
  
  return (
    <View style={fc2.card}>
      <Text style={fc2.title}>🪔 {isH ? 'आने वाले पर्व' : 'Upcoming Festivals'}</Text>
      <View style={fc2.row}>
        {upcoming.map((fest, i) => {
          const d = new Date(fest.date);
          const diff = Math.round((d - today) / 86400000);
          const isToday = diff === 0;
          const isTomorrow = diff === 1;
          return (
            <View key={i} style={[fc2.item, isToday && fc2.itemToday]}>
              <View style={[fc2.badge, { backgroundColor: isToday ? '#E8620A' : 'rgba(201,131,10,0.15)' }]}>
                <Text style={[fc2.days, { color: isToday ? '#fff' : '#C9830A' }]}>
                  {isToday ? (isH ? 'आज' : 'Today') : isTomorrow ? (isH ? 'कल' : 'Tmrw') : `${diff}d`}
                </Text>
              </View>
              <Text style={fc2.name} numberOfLines={2}>{fest.name}</Text>
              <Text style={fc2.deity}>{fest.deity}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const fc2 = StyleSheet.create({
  card: { backgroundColor: '#0F0600', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(240,165,0,0.15)' },
  title: { fontSize: 14, fontWeight: '800', color: '#F4A261', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8 },
  item: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,130,40,0.1)' },
  itemToday: { borderColor: '#E8620A', backgroundColor: 'rgba(232,98,10,0.08)' },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 6 },
  days: { fontSize: 11, fontWeight: '800' },
  name: { fontSize: 11, color: '#FDF6ED', fontWeight: '600', textAlign: 'center', marginBottom: 3 },
  deity: { fontSize: 9, color: 'rgba(253,246,237,0.3)', textAlign: 'center' },
});