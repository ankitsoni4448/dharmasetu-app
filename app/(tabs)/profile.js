// ════════════════════════════════════════════════════════════════
// DharmaSetu — Profile Screen
// FILE: app/(tabs)/profile.js
//
// Features:
//  - User info display (name, rashi, nakshatra, city, plan badge)
//  - Edit profile (name, city, language)
//  - Dharmic stats (streak, pts, badge)
//  - Logout (atomic — clears all session keys)
//  - Delete account option
//  - Navigate to Settings
// ════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, TextInput, ActivityIndicator, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import {
  safeGet, safeSet, safeGetInt, safeGetString,
  safeSetString, clearUserSession, KEYS,
} from '../utils/storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://dharmasetu-backend-2c65.onrender.com';

// ── BADGE SYSTEM ─────────────────────────────────────────────────
const BADGES = [
  { min: 0,   emoji: '🌱', hi: 'नया साधक',    en: 'New Seeker'     },
  { min: 3,   emoji: '🔥', hi: 'धर्म रक्षक',  en: 'Dharma Rakshak' },
  { min: 7,   emoji: '🌸', hi: 'भक्त',         en: 'Bhakta'         },
  { min: 14,  emoji: '⭐', hi: 'ज्ञानी',       en: 'Jnani'          },
  { min: 30,  emoji: '🕉', hi: 'महासाधक',      en: 'Maha Sadhak'    },
  { min: 108, emoji: '👑', hi: 'संत',          en: 'Sant'           },
];

function getBadge(streak) {
  return [...BADGES].reverse().find(b => streak >= b.min) || BADGES[0];
}

const PLAN_LABELS = {
  free:  { label: 'Free',  color: 'rgba(200,130,40,0.6)',  bg: 'rgba(200,130,40,0.1)'  },
  basic: { label: 'Basic', color: '#3498DB',               bg: 'rgba(52,152,219,0.1)'  },
  pro:   { label: 'Pro',   color: '#27AE60',               bg: 'rgba(39,174,96,0.1)'   },
};

// ════════════════════════════════════════════════════════════════
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [user,    setUser]    = useState(null);
  const [pts,     setPts]     = useState(0);
  const [streak,  setStreak]  = useState(0);
  const [lang,    setLang]    = useState('hindi');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editLang, setEditLang] = useState('hindi');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Reload on every focus (e.g. coming back from settings)
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      const u      = await safeGet(KEYS.USER);
      const p      = await safeGetInt(KEYS.PTS, 0);
      const s      = await safeGetInt(KEYS.STREAK_COUNT, 0);
      const l      = await safeGetString(KEYS.USER_LANGUAGE, 'hindi');
      if (!isMounted.current) return;
      setUser(u);
      setPts(p);
      setStreak(s);
      setLang(u?.language || l || 'hindi');
      if (u) {
        setEditName(u.name || '');
        setEditCity(u.birthCity || u.birth_city || '');
        setEditLang(u.language || 'hindi');
      }
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    } catch (e) {
      console.log('[Profile] loadProfile error:', e.message);
    }
  };

  // ── SAVE PROFILE EDIT ─────────────────────────────────────────
  const saveEdit = async () => {
    if (!editName.trim()) {
      Alert.alert('', isH ? 'नाम जरूरी है' : 'Name is required');
      return;
    }
    setLoading(true);
    try {
      const updated = {
        ...(user || {}),
        name:      editName.trim(),
        birthCity: editCity.trim(),
        language:  editLang,
      };
      await safeSet(KEYS.USER, updated);
      await safeSetString(KEYS.USER_LANGUAGE, editLang);
      // Sync to backend (non-blocking)
      fetch(`${BACKEND_URL}/users/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: user?.phone || '',
          name: updated.name,
          birthCity: updated.birthCity,
          language: updated.language,
        }),
      }).catch(() => {});
      if (isMounted.current) {
        setUser(updated);
        setLang(editLang);
        setEditing(false);
      }
      Alert.alert('✅', isH ? 'प्रोफ़ाइल अपडेट हो गई' : 'Profile updated');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  // ── LOGOUT ───────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert(
      isH ? 'लॉगआउट' : 'Logout',
      isH ? 'क्या आप लॉगआउट करना चाहते हैं?' : 'Are you sure you want to logout?',
      [
        { text: isH ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: isH ? 'लॉगआउट' : 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await clearUserSession();
            router.replace('/login');
          },
        },
      ]
    );
  };

  // ── DELETE ACCOUNT ────────────────────────────────────────────
  const handleDelete = () => {
    Alert.alert(
      isH ? '⚠️ खाता हटाएं' : '⚠️ Delete Account',
      isH
        ? 'आपका सारा डेटा हमेशा के लिए हट जाएगा। क्या आप निश्चित हैं?'
        : 'All your data will be permanently deleted. Are you sure?',
      [
        { text: isH ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: isH ? 'हटाएं' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Non-blocking backend delete
              fetch(`${BACKEND_URL}/users/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: user?.phone || '' }),
              }).catch(() => {});
            } catch {}
            await clearUserSession();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const isH = lang === 'hindi';

  if (!user) {
    return (
      <View style={[s.root, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#E8620A" size="large" />
      </View>
    );
  }

  const badge   = getBadge(streak);
  const plan    = PLAN_LABELS[user.plan || 'free'] || PLAN_LABELS.free;
  const pct30   = Math.min(100, Math.round((streak / 30) * 100));

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#0D0500" />

      {/* HEADER */}
      <View style={s.hdr}>
        <Text style={s.hdrTitle}>{isH ? '👤 मेरी प्रोफ़ाइल' : '👤 My Profile'}</Text>
        <TouchableOpacity
          style={s.settingsBtn}
          onPress={() => router.push('/settings')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.settingsIco}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}>

        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ── IDENTITY CARD ─── */}
          <View style={s.idCard}>
            <View style={s.avatarBox}>
              <Text style={s.avatarEmoji}>{badge.emoji}</Text>
            </View>
            <View style={[s.planBadge, { backgroundColor: plan.bg, borderColor: plan.color }]}>
              <Text style={[s.planBadgeTxt, { color: plan.color }]}>
                {plan.label} {user.plan && user.plan !== 'free' ? '✓' : ''}
              </Text>
            </View>
            <Text style={s.userName}>{user.name}</Text>
            <Text style={s.userBadge}>{isH ? badge.hi : badge.en}</Text>
            <Text style={s.userPhone}>📞 +91-{user.phone}</Text>
          </View>

          {/* ── DHARMIC STATS ─── */}
          <View style={s.statsRow}>
            {[
              { val: streak, lbl: isH ? 'दिन Streak' : 'Day Streak', ico: '🔥', color: '#E8620A' },
              { val: pts,    lbl: isH ? 'धर्म पॉइंट' : 'Dharma Pts', ico: '⚡', color: '#C9830A' },
              { val: `${pct30}%`, lbl: isH ? '30-दिन लक्ष्य' : '30-Day Goal', ico: '🎯', color: '#27AE60' },
            ].map((stat, i) => (
              <View key={i} style={s.statBox}>
                <Text style={{ fontSize: 20, marginBottom: 4 }}>{stat.ico}</Text>
                <Text style={[s.statVal, { color: stat.color }]}>{stat.val}</Text>
                <Text style={s.statLbl}>{stat.lbl}</Text>
              </View>
            ))}
          </View>

          {/* ── KUNDLI INFO ─── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>🔯 {isH ? 'कुंडली विवरण' : 'Kundli Details'}</Text>
            {[
              { l: isH ? 'राशि' : 'Rashi',         v: `${user.rashi} (${user.rashiEng || ''})` },
              { l: isH ? 'नक्षत्र' : 'Nakshatra',   v: user.nakshatra },
              { l: isH ? 'लग्न' : 'Lagna',          v: user.lagna },
              { l: isH ? 'ग्रह' : 'Planet',         v: user.planet },
              { l: isH ? 'देवता' : 'Deity',         v: user.deity },
              { l: isH ? 'जन्म नगर' : 'Birth City', v: user.birthCity || user.birth_city },
              { l: isH ? 'जन्म तिथि' : 'DOB',       v: user.dob },
            ].map(({ l, v }) => v ? (
              <View key={l} style={s.infoRow}>
                <Text style={s.infoLbl}>{l}</Text>
                <Text style={s.infoVal}>{v}</Text>
              </View>
            ) : null)}
          </View>

          {/* ── EDIT PROFILE ─── */}
          {editing ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>✏️ {isH ? 'प्रोफ़ाइल संपादित करें' : 'Edit Profile'}</Text>

              <Text style={s.fieldLbl}>{isH ? 'नाम' : 'Name'}</Text>
              <TextInput
                style={s.input}
                value={editName}
                onChangeText={setEditName}
                placeholderTextColor="rgba(253,246,237,0.3)"
                placeholder={isH ? 'पूरा नाम' : 'Full name'}
              />

              <Text style={s.fieldLbl}>{isH ? 'जन्म नगर' : 'Birth City'}</Text>
              <TextInput
                style={s.input}
                value={editCity}
                onChangeText={setEditCity}
                placeholderTextColor="rgba(253,246,237,0.3)"
                placeholder={isH ? 'शहर / कस्बा' : 'City / Town'}
              />

              <Text style={s.fieldLbl}>{isH ? 'भाषा' : 'Language'}</Text>
              <View style={s.langToggle}>
                {[{ id: 'hindi', l: '🇮🇳 हिंदी' }, { id: 'english', l: '🇬🇧 English' }].map(({ id, l }) => (
                  <TouchableOpacity
                    key={id}
                    style={[s.langBtn, editLang === id && s.langBtnOn]}
                    onPress={() => setEditLang(id)}>
                    <Text style={[s.langBtnTxt, editLang === id && s.langBtnTxtOn]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.editActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setEditing(false)}>
                  <Text style={s.cancelBtnTxt}>{isH ? 'रद्द' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.saveBtn, loading && { opacity: 0.6 }]} onPress={saveEdit} disabled={loading}>
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.saveBtnTxt}>{isH ? 'सेव करें' : 'Save'}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={s.editProfileBtn} onPress={() => setEditing(true)} activeOpacity={0.85}>
              <Text style={s.editProfileBtnTxt}>✏️ {isH ? 'प्रोफ़ाइल संपादित करें' : 'Edit Profile'}</Text>
            </TouchableOpacity>
          )}

          {/* ── PREMIUM BANNER ─── */}
          {(!user.plan || user.plan === 'free') && (
            <TouchableOpacity style={s.premiumBanner} onPress={() => router.push('/payment')} activeOpacity={0.88}>
              <Text style={s.premiumBannerTitle}>⭐ {isH ? 'Premium लें' : 'Go Premium'}</Text>
              <Text style={s.premiumBannerSub}>
                {isH ? 'असीमित AI प्रश्न, और भी बहुत कुछ' : 'Unlimited AI questions & more'}
              </Text>
              <Text style={s.premiumBannerArrow}>›</Text>
            </TouchableOpacity>
          )}

          {/* ── BOTTOM ACTIONS ─── */}
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <Text style={s.logoutTxt}>🚪 {isH ? 'लॉगआउट' : 'Logout'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.85}>
            <Text style={s.deleteTxt}>🗑️ {isH ? 'खाता हटाएं' : 'Delete Account'}</Text>
          </TouchableOpacity>

          <Text style={s.footer}>🕉 जय सनातन धर्म · Jai Sanatan Dharma 🔱</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#0D0500' },
  hdr:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.1)' },
  hdrTitle:{ fontSize: 17, fontWeight: '800', color: '#F4A261' },
  settingsBtn: { padding: 6 },
  settingsIco: { fontSize: 22 },
  scroll:  { padding: 16, gap: 0 },

  // Identity card
  idCard:  { backgroundColor: '#130700', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(240,165,0,0.15)' },
  avatarBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(107,33,168,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(107,33,168,0.4)', marginBottom: 12 },
  avatarEmoji: { fontSize: 34 },
  planBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, marginBottom: 10 },
  planBadgeTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  userName: { fontSize: 22, fontWeight: '800', color: '#F4A261', marginBottom: 4 },
  userBadge: { fontSize: 13, color: 'rgba(253,246,237,0.45)', marginBottom: 6 },
  userPhone: { fontSize: 12, color: 'rgba(253,246,237,0.35)' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statBox:  { flex: 1, backgroundColor: '#0F0600', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(240,165,0,0.1)' },
  statVal:  { fontSize: 20, fontWeight: '800', marginBottom: 3 },
  statLbl:  { fontSize: 9, color: 'rgba(253,246,237,0.35)', textAlign: 'center' },

  // Kundli info card
  card:     { backgroundColor: '#0F0600', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(240,165,0,0.13)' },
  cardTitle:{ fontSize: 14, fontWeight: '800', color: '#F4A261', marginBottom: 12 },
  infoRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  infoLbl:  { fontSize: 12, color: 'rgba(253,246,237,0.35)', flex: 1 },
  infoVal:  { fontSize: 12, color: '#FDF6ED', fontWeight: '600', flex: 2, textAlign: 'right' },

  // Edit profile
  editProfileBtn: { backgroundColor: 'rgba(232,98,10,0.1)', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(232,98,10,0.3)' },
  editProfileBtnTxt: { color: '#F4A261', fontSize: 14, fontWeight: '700' },
  fieldLbl: { fontSize: 11, color: 'rgba(253,246,237,0.4)', fontWeight: '700', marginBottom: 6, marginTop: 12 },
  input:    { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#FDF6ED', fontSize: 14, borderWidth: 1, borderColor: 'rgba(200,130,40,0.2)' },
  langToggle: { flexDirection: 'row', gap: 10, marginTop: 4 },
  langBtn:  { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,130,40,0.18)', backgroundColor: 'rgba(255,255,255,0.03)' },
  langBtnOn:{ backgroundColor: 'rgba(232,98,10,0.15)', borderColor: '#E8620A' },
  langBtnTxt: { fontSize: 13, color: 'rgba(253,246,237,0.4)', fontWeight: '600' },
  langBtnTxtOn: { color: '#F4A261' },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,130,40,0.2)', backgroundColor: 'rgba(255,255,255,0.03)' },
  cancelBtnTxt: { color: 'rgba(253,246,237,0.5)', fontSize: 14, fontWeight: '600' },
  saveBtn:  { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#E8620A' },
  saveBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Premium banner
  premiumBanner: { backgroundColor: 'rgba(201,131,10,0.1)', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1.5, borderColor: 'rgba(201,131,10,0.35)', flexDirection: 'row', alignItems: 'center' },
  premiumBannerTitle: { fontSize: 15, fontWeight: '800', color: '#C9830A', flex: 1 },
  premiumBannerSub: { fontSize: 11, color: 'rgba(253,246,237,0.4)', marginTop: 3 },
  premiumBannerArrow: { fontSize: 24, color: '#C9830A', marginLeft: 8 },

  // Actions
  logoutBtn: { backgroundColor: 'rgba(231,76,60,0.1)', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(231,76,60,0.3)' },
  logoutTxt: { color: '#E74C3C', fontSize: 15, fontWeight: '700' },
  deleteBtn: { paddingVertical: 12, alignItems: 'center', marginBottom: 24 },
  deleteTxt: { color: 'rgba(231,76,60,0.45)', fontSize: 13 },

  footer: { textAlign: 'center', color: 'rgba(240,165,0,0.3)', fontSize: 11, marginTop: 4, paddingBottom: 10 },
});
