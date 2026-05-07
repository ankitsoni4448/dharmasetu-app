// DharmaSetu — Unified MantraHub  P4
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Alert, Animated, ScrollView, StyleSheet, Text,
  TouchableOpacity, Vibration, View, TextInput,
  ActivityIndicator, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MANTRAS, MANTRA_CATEGORIES } from './data/mantras';
import { safeGet, safeSet, KEYS } from './utils/storage';
// P4 audio ecosystem
import {
  speakMantra, stopSpeaking, isSpeaking,
  saveJapaSession, getMantraStreak, addRecentMantra as audioAddRecent,
  getDailyChantingChart,
} from './utils/mantraAudio';
import { recordEngagement, touchStreak } from './utils/journey';

const TABS = ['Browse', 'Japa', 'Favorites', 'Recent'];
const JAPA_TARGETS = [11, 27, 54, 108, 1008];

// ── helpers ──────────────────────────────────────────────────────
function getTodayKey() {
  return `japa_${new Date().toDateString()}`;
}

// ── MANTRA CARD ──────────────────────────────────────────────────
function MantraCard({ mantra, lang, favorites, onToggleFav, onJapa, onSpeak }) {
  const isH = lang === 'hindi';
  const isFav = favorites.includes(mantra.id);
  return (
    <View style={s.card}>
      <View style={s.cardHdr}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{mantra.title}</Text>
          <Text style={s.cardDeity}>🕉 {mantra.deity} · {mantra.category}</Text>
        </View>
        <TouchableOpacity onPress={() => onToggleFav(mantra)} style={s.favBtn}>
          <Text style={{ fontSize: 20 }}>{isFav ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>
      <View style={s.sanBox}>
        <Text style={s.sanTxt}>{mantra.text}</Text>
      </View>
      <Text style={s.translit}>{mantra.transliteration}</Text>
      <Text style={s.meaning}>{isH ? mantra.meaningHi : mantra.meaningEn}</Text>
      <View style={s.metaRow}>
        <Text style={s.meta}>🕒 {mantra.bestTime}</Text>
        <Text style={s.meta}>🧭 {mantra.direction}</Text>
        <Text style={s.meta}>📿 {mantra.malas}</Text>
      </View>
      {(mantra.benefits || []).length > 0 && (
        <View style={s.benefitsRow}>
          {mantra.benefits.map((b, i) => (
            <View key={i} style={s.benefitChip}>
              <Text style={s.benefitTxt}>✦ {b}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={s.cardActions}>
        <TouchableOpacity style={s.actionBtn} onPress={() => onSpeak(mantra)}>
          <Text style={s.actionBtnTxt}>🔊 {isH ? 'सुनें' : 'Listen'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, s.actionBtnPrimary]} onPress={() => onJapa(mantra)}>
          <Text style={[s.actionBtnTxt, { color: '#fff' }]}>📿 {isH ? 'जप करें' : 'Start Japa'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── JAPA COUNTER ─────────────────────────────────────────────────
function JapaTab({ lang, presetMantra, onClearPreset }) {
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(108);
  const [todayTotal, setTodayTotal] = useState(0);
  const [mantra, setMantra] = useState(presetMantra || MANTRAS[0]);
  const [showPicker, setShowPicker] = useState(false);
  const [streak, setStreak] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isH = lang === 'hindi';

  useEffect(() => {
    (async () => {
      const c = await safeGet(KEYS.JAPA_COUNT, 0);
      const t = await safeGet(KEYS.JAPA_TARGET, 108);
      const today = await safeGet(getTodayKey(), 0);
      const s = await getMantraStreak();
      setCount(typeof c === 'number' ? c : 0);
      setTarget(typeof t === 'number' ? t : 108);
      setTodayTotal(typeof today === 'number' ? today : 0);
      setStreak(s || 0);
    })();
  }, []);

  useEffect(() => {
    if (presetMantra) {
      setMantra(presetMantra);
      setCount(0);
      safeSet(KEYS.JAPA_COUNT, 0);
      onClearPreset?.();
    }
  }, [presetMantra]);

  const tap = useCallback(() => {
    Vibration.vibrate(8);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 55, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
    ]).start();
    const nc = count + 1;
    const nt = todayTotal + 1;
    setCount(nc);
    setTodayTotal(nt);
    safeSet(KEYS.JAPA_COUNT, nc);
    safeSet(getTodayKey(), nt);
    if (nc === target) {
      // P4: save session + streak via audio ecosystem
      handleComplete(nc, target, mantra);
    }
  }, [count, todayTotal, target, mantra, handleComplete]);


  const reset = () => { setCount(0); safeSet(KEYS.JAPA_COUNT, 0); };
  const changeTarget = (t) => { setTarget(t); setCount(0); safeSet(KEYS.JAPA_TARGET, t); safeSet(KEYS.JAPA_COUNT, 0); };
  const pct = Math.min(100, Math.round((count / target) * 100));

  // P4: save session when japa complete
  const handleComplete = useCallback(async (cnt, tgt, m) => {
    Vibration.vibrate([0, 100, 100, 100]);
    await saveJapaSession({ mantraId: m.id, mantraName: m.title, count: cnt, durationMs: 0 });
    await touchStreak();
    const streak = await getMantraStreak();
    Alert.alert('🛕 जय!', `${tgt} जप पूर्ण! 🔥 Streak: ${streak} दिन`);
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {/* Current Mantra */}
      <TouchableOpacity style={s.japaMantraBox} onPress={() => setShowPicker(!showPicker)} activeOpacity={0.85}>
        <Text style={s.japaMantraTitle}>{mantra.title}</Text>
        <Text style={s.japaMantraSan}>{mantra.text}</Text>
        <Text style={s.japaMantraSwitch}>{isH ? 'बदलें ↓' : 'Switch ↓'}</Text>
      </TouchableOpacity>

      {showPicker && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {MANTRAS.slice(0, 15).map(m => (
              <TouchableOpacity key={m.id} style={[s.pickerChip, mantra.id === m.id && s.pickerChipOn]}
                onPress={() => { setMantra(m); setCount(0); safeSet(KEYS.JAPA_COUNT, 0); setShowPicker(false); }}>
                <Text style={[s.pickerChipTxt, mantra.id === m.id && { color: '#E8620A' }]} numberOfLines={1}>{m.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Progress */}
      <View style={s.japaProgBar}>
        <Animated.View style={[s.japaProgFill, { width: `${pct}%` }]} />
      </View>
      <Text style={s.japaProgLbl}>{count} / {target} ({pct}%)</Text>
      <Text style={s.japaTodayLbl}>{isH ? `आज कुल: ${todayTotal} जप` : `Today total: ${todayTotal}`}</Text>
      {/* P4: streak badge */}
      {streak > 0 && (
        <View style={{ alignSelf:'center', backgroundColor:'rgba(232,98,10,0.12)', borderRadius:20, paddingHorizontal:16, paddingVertical:6, borderWidth:1, borderColor:'rgba(232,98,10,0.3)', marginBottom:6 }}>
          <Text style={{ color:'#F4A261', fontSize:13, fontWeight:'700' }}>🔥 {streak} {isH ? 'दिन की streak' : 'day streak'}</Text>
        </View>
      )}

      {/* Big tap button */}
      <View style={{ alignItems: 'center', marginVertical: 20 }}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity style={s.japaMalaBtn} onPress={tap} activeOpacity={0.85}>
            <Text style={{ fontSize: 44 }}>🕉</Text>
            <Text style={s.japaBtnCount}>{count}</Text>
            <Text style={s.japaBtnSub}>{isH ? 'टैप करें' : 'Tap'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Targets */}
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {JAPA_TARGETS.map(t => (
          <TouchableOpacity key={t}
            style={[s.targetBtn, target === t && s.targetBtnOn]}
            onPress={() => changeTarget(t)}>
            <Text style={[s.targetBtnTxt, target === t && { color: '#E8620A' }]}>{t}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[s.targetBtn, { borderColor: 'rgba(231,76,60,0.3)' }]} onPress={reset}>
          <Text style={{ color: '#E74C3C', fontSize: 14 }}>↺</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ════════════════════════════════════════════════════════════════
export default function MantraLibraryScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [recent, setRecent] = useState([]);
  const [lang, setLang] = useState('hindi');
  const [speaking, setSpeaking] = useState(false);
  const [presetMantra, setPresetMantra] = useState(null);
  const isMounted = useRef(true);
  const isH = lang === 'hindi';

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    (async () => {
      const favs = await safeGet(KEYS.MANTRA_FAVORITES, []);
      const rec  = await safeGet(KEYS.MANTRA_RECENT, []);
      const u    = await safeGet(KEYS.USER);
      if (!isMounted.current) return;
      setFavorites(Array.isArray(favs) ? favs : []);
      setRecent(Array.isArray(rec) ? rec : []);
      setLang(u?.language || 'hindi');
    })();
  }, []);

  const toggleFav = useCallback(async (mantra) => {
    setFavorites(prev => {
      const next = prev.includes(mantra.id)
        ? prev.filter(id => id !== mantra.id)
        : [...prev, mantra.id];
      safeSet(KEYS.MANTRA_FAVORITES, next);
      return next;
    });
  }, []);

  const addRecent = useCallback(async (mantra) => {
    setRecent(prev => {
      const filtered = prev.filter(m => m.id !== mantra.id);
      const next = [mantra, ...filtered].slice(0, 15);
      safeSet(KEYS.MANTRA_RECENT, next);
      return next;
    });
  }, []);

  const handleSpeak = useCallback(async (mantra) => {
    try {
      // P4: use mantraAudio for richer TTS config
      const currently = await isSpeaking();
      if (currently) { stopSpeaking(); setSpeaking(false); return; }
      setSpeaking(true);
      await addRecent(mantra);
      // Also track in audio system for streaks/recent
      audioAddRecent({ id: mantra.id, name: mantra.title }).catch(() => {});
      recordEngagement('mantra_japa', { mantraId: mantra.id }).catch(() => {});
      speakMantra(
        mantra.text,
        'sanskrit',
        () => { if (isMounted.current) setSpeaking(false); },
        () => { if (isMounted.current) setSpeaking(false); },
      );
    } catch { setSpeaking(false); }
  }, [addRecent]);

  const handleJapa = useCallback(async (mantra) => {
    await addRecent(mantra);
    setPresetMantra(mantra);
    setTab(1);
  }, [addRecent]);

  // Filtered browse list
  const filteredMantras = MANTRAS.filter(m => {
    const matchCat = category === 'All' || m.category === category || m.deity === category;
    const q = search.toLowerCase();
    const matchSearch = !q || m.title.toLowerCase().includes(q)
      || m.deity.toLowerCase().includes(q)
      || m.text.includes(q)
      || (m.meaningHi || '').includes(q)
      || (m.meaningEn || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const favMantras = MANTRAS.filter(m => favorites.includes(m.id));

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#0D0500" />

      {/* HEADER */}
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={s.backIco}>‹</Text>
        </TouchableOpacity>
        <Text style={s.hdrTitle}>📿 {isH ? 'मंत्र केंद्र' : 'Mantra Hub'}</Text>
        <TouchableOpacity
          onPress={() => setLang(l => l === 'hindi' ? 'english' : 'hindi')}
          style={s.langToggle}>
          <Text style={s.langToggleTxt}>{isH ? 'EN' : 'हिं'}</Text>
        </TouchableOpacity>
      </View>

      {/* TAB BAR */}
      <View style={s.tabBar}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === i && s.tabBtnOn]} onPress={() => setTab(i)}>
            <Text style={[s.tabTxt, tab === i && s.tabTxtOn]}>
              {isH
                ? ['ब्राउज़', 'जप', 'पसंद', 'हाल के'][i]
                : t}
            </Text>
            {i === 2 && favorites.length > 0 && (
              <View style={s.badge}><Text style={s.badgeTxt}>{favorites.length}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* BROWSE TAB */}
      {tab === 0 && (
        <>
          {/* Search */}
          <View style={s.searchBox}>
            <Text style={s.searchIco}>🔍</Text>
            <TextInput
              style={s.searchInput}
              placeholder={isH ? 'मंत्र खोजें...' : 'Search mantras...'}
              placeholderTextColor="rgba(253,246,237,0.3)"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={{ color: 'rgba(253,246,237,0.4)', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          {/* Category chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={s.catScroll} contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}>
            {MANTRA_CATEGORIES.map(c => (
              <TouchableOpacity key={c}
                style={[s.catChip, category === c && s.catChipOn]}
                onPress={() => setCategory(c)}>
                <Text style={[s.catChipTxt, category === c && s.catChipTxtOn]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 14, paddingBottom: 30, gap: 14 }}>
            {filteredMantras.length === 0
              ? <Text style={s.emptyTxt}>{isH ? 'कोई मंत्र नहीं मिला' : 'No mantras found'}</Text>
              : filteredMantras.map(m => (
                <MantraCard key={m.id} mantra={m} lang={lang}
                  favorites={favorites} onToggleFav={toggleFav}
                  onJapa={handleJapa} onSpeak={handleSpeak} />
              ))}
          </ScrollView>
        </>
      )}

      {/* JAPA TAB */}
      {tab === 1 && (
        <JapaTab lang={lang} presetMantra={presetMantra} onClearPreset={() => setPresetMantra(null)} />
      )}

      {/* FAVORITES TAB */}
      {tab === 2 && (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30, gap: 14 }} showsVerticalScrollIndicator={false}>
          {favMantras.length === 0
            ? <View style={s.emptyBox}>
                <Text style={s.emptyIco}>🤍</Text>
                <Text style={s.emptyTxt}>{isH ? 'अभी कोई पसंदीदा मंत्र नहीं।\nBrowse में ❤️ टैप करें।' : 'No favorites yet.\nTap ❤️ in Browse tab.'}</Text>
              </View>
            : favMantras.map(m => (
              <MantraCard key={m.id} mantra={m} lang={lang}
                favorites={favorites} onToggleFav={toggleFav}
                onJapa={handleJapa} onSpeak={handleSpeak} />
            ))}
        </ScrollView>
      )}

      {/* RECENT TAB */}
      {tab === 3 && (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30, gap: 14 }} showsVerticalScrollIndicator={false}>
          {recent.length === 0
            ? <View style={s.emptyBox}>
                <Text style={s.emptyIco}>🕐</Text>
                <Text style={s.emptyTxt}>{isH ? 'हाल में देखे गए मंत्र यहाँ दिखेंगे।' : 'Recently viewed mantras appear here.'}</Text>
              </View>
            : recent.map(m => (
              <MantraCard key={m.id} mantra={m} lang={lang}
                favorites={favorites} onToggleFav={toggleFav}
                onJapa={handleJapa} onSpeak={handleSpeak} />
            ))}
        </ScrollView>
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#0D0500' },
  hdr:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.1)' },
  backIco:  { fontSize: 28, color: '#F4A261', lineHeight: 28 },
  hdrTitle: { fontSize: 17, fontWeight: '800', color: '#F4A261' },
  langToggle:    { borderWidth: 1, borderColor: 'rgba(200,130,40,0.3)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  langToggleTxt: { color: '#F4A261', fontSize: 12, fontWeight: '700' },

  tabBar:   { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.1)' },
  tabBtn:   { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', flexDirection: 'row', justifyContent: 'center', gap: 4 },
  tabBtnOn: { borderBottomColor: '#E8620A' },
  tabTxt:   { fontSize: 12, color: 'rgba(253,246,237,0.35)', fontWeight: '600' },
  tabTxtOn: { color: '#F4A261' },
  badge:    { backgroundColor: '#E8620A', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  badgeTxt: { fontSize: 9, color: '#fff', fontWeight: '700' },

  searchBox:   { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(200,130,40,0.2)' },
  searchIco:   { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: '#FDF6ED', fontSize: 14, paddingVertical: 11 },

  catScroll: { flexGrow: 0, marginBottom: 4 },
  catChip:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(200,130,40,0.2)', backgroundColor: 'rgba(255,255,255,0.03)' },
  catChipOn: { backgroundColor: 'rgba(232,98,10,0.15)', borderColor: '#E8620A' },
  catChipTxt:   { fontSize: 12, color: 'rgba(253,246,237,0.4)', fontWeight: '600' },
  catChipTxtOn: { color: '#F4A261' },

  card:     { backgroundColor: '#0F0600', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(240,165,0,0.13)' },
  cardHdr:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardTitle:{ fontSize: 15, fontWeight: '800', color: '#F4A261' },
  cardDeity:{ fontSize: 11, color: 'rgba(253,246,237,0.4)', marginTop: 3 },
  favBtn:   { padding: 4 },
  sanBox:   { backgroundColor: 'rgba(107,33,168,0.12)', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(107,33,168,0.2)' },
  sanTxt:   { fontSize: 14, color: '#D4A8FF', lineHeight: 26, textAlign: 'center', fontWeight: '600' },
  translit: { fontSize: 11, color: 'rgba(253,246,237,0.35)', textAlign: 'center', marginBottom: 8, fontStyle: 'italic' },
  meaning:  { fontSize: 13, color: 'rgba(253,246,237,0.7)', lineHeight: 20, marginBottom: 10 },
  metaRow:  { flexDirection: 'row', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
  meta:     { fontSize: 11, color: 'rgba(253,246,237,0.3)' },
  benefitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  benefitChip: { backgroundColor: 'rgba(39,174,96,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(39,174,96,0.2)' },
  benefitTxt:  { fontSize: 10, color: '#27AE60', fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn:        { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,130,40,0.2)', backgroundColor: 'rgba(255,255,255,0.03)' },
  actionBtnPrimary: { backgroundColor: '#E8620A', borderColor: '#E8620A' },
  actionBtnTxt:     { fontSize: 12, color: '#F4A261', fontWeight: '700' },

  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyIco: { fontSize: 48, marginBottom: 16 },
  emptyTxt: { color: 'rgba(253,246,237,0.3)', fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // Japa tab
  japaMantraBox:   { backgroundColor: '#130700', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(240,165,0,0.2)', alignItems: 'center' },
  japaMantraTitle: { fontSize: 15, fontWeight: '800', color: '#F4A261', marginBottom: 8 },
  japaMantraSan:   { fontSize: 13, color: '#D4A8FF', textAlign: 'center', lineHeight: 22 },
  japaMantraSwitch:{ fontSize: 11, color: '#E8620A', marginTop: 8, fontWeight: '600' },
  pickerChip:    { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(200,130,40,0.2)', backgroundColor: 'rgba(255,255,255,0.03)', maxWidth: 140 },
  pickerChipOn:  { borderColor: '#E8620A', backgroundColor: 'rgba(232,98,10,0.1)' },
  pickerChipTxt: { fontSize: 11, color: 'rgba(253,246,237,0.5)', fontWeight: '600' },
  japaProgBar:  { height: 7, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  japaProgFill: { height: 7, borderRadius: 4, backgroundColor: '#E8620A' },
  japaProgLbl:  { fontSize: 12, color: 'rgba(253,246,237,0.4)', textAlign: 'center' },
  japaTodayLbl: { fontSize: 11, color: '#C9830A', textAlign: 'center', marginTop: 3, marginBottom: 4 },
  japaMalaBtn:  { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(107,33,168,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(107,33,168,0.5)', elevation: 8, shadowColor: '#6B21A8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10 },
  japaBtnCount: { fontSize: 30, fontWeight: '800', color: '#E8620A' },
  japaBtnSub:   { fontSize: 11, color: 'rgba(253,246,237,0.35)', marginTop: 2 },
  targetBtn:    { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(200,130,40,0.2)', backgroundColor: 'rgba(255,255,255,0.03)' },
  targetBtnOn:  { backgroundColor: 'rgba(232,98,10,0.15)', borderColor: '#E8620A' },
  targetBtnTxt: { fontSize: 12, color: 'rgba(253,246,237,0.4)', fontWeight: '700' },
});