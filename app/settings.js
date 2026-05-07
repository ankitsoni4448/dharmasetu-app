// ════════════════════════════════════════════════════════════════
// DharmaSetu — Settings Screen
// FILE: app/settings.js
// ════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Switch, Linking, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { safeGet, safeSet, safeGetString, safeSetString, clearUserSession, KEYS } from './utils/storage';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
const PRIVACY_URL = 'https://dharmasetu-backend-2c65.onrender.com/privacy';
const TERMS_URL   = 'https://dharmasetu-backend-2c65.onrender.com/terms';

// ── SETTING ROW ─────────────────────────────────────────────────
function SettingRow({ icon, label, sub, onPress, right, danger = false }) {
  return (
    <TouchableOpacity
      style={s.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.75 : 1}>
      <Text style={s.rowIco}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowLbl, danger && s.rowLblDanger]}>{label}</Text>
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
      </View>
      {right ?? <Text style={s.rowArrow}>›</Text>}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }) {
  return <Text style={s.sectionHdr}>{title}</Text>;
}

function Divider() {
  return <View style={s.divider} />;
}

// ════════════════════════════════════════════════════════════════
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [lang,          setLang]          = useState('hindi');
  const [notifEnabled,  setNotifEnabled]  = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [loading,       setLoading]       = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    (async () => {
      const u = await safeGet(KEYS.USER);
      const l = await safeGetString(KEYS.USER_LANGUAGE, 'hindi');
      const n = await safeGet('ds_notif_enabled', true);
      const d = await safeGet('ds_daily_reminder', true);
      if (!isMounted.current) return;
      setLang(u?.language || l || 'hindi');
      setNotifEnabled(n !== false);
      setDailyReminder(d !== false);
    })();
  }, []);

  const isH = lang === 'hindi';

  const changeLang = async (id) => {
    setLang(id);
    await safeSetString(KEYS.USER_LANGUAGE, id);
    const u = await safeGet(KEYS.USER);
    if (u) await safeSet(KEYS.USER, { ...u, language: id });
  };

  const toggleNotif = async (val) => {
    setNotifEnabled(val);
    await safeSet('ds_notif_enabled', val);
  };

  const toggleReminder = async (val) => {
    setDailyReminder(val);
    await safeSet('ds_daily_reminder', val);
  };

  const openURL = (url) => {
    Linking.openURL(url).catch(() =>
      Alert.alert('', isH ? 'लिंक नहीं खुला' : 'Could not open link')
    );
  };

  const handleLogout = () => {
    Alert.alert(
      isH ? 'लॉगआउट' : 'Logout',
      isH ? 'क्या आप लॉगआउट करना चाहते हैं?' : 'Are you sure you want to logout?',
      [
        { text: isH ? 'रद्द' : 'Cancel', style: 'cancel' },
        {
          text: isH ? 'लॉगआउट' : 'Logout', style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await clearUserSession();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      isH ? '⚠️ खाता हटाएं' : '⚠️ Delete Account',
      isH
        ? 'सारा डेटा हमेशा के लिए हट जाएगा। निश्चित हैं?'
        : 'All data will be permanently deleted. Are you sure?',
      [
        { text: isH ? 'रद्द' : 'Cancel', style: 'cancel' },
        {
          text: isH ? 'हटाएं' : 'Delete', style: 'destructive',
          onPress: async () => {
            await clearUserSession();
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#0D0500" />

      {/* HEADER */}
      <View style={s.hdr}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={s.backIco}>‹</Text>
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{isH ? '⚙️ सेटिंग्स' : '⚙️ Settings'}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}>

        {/* ── LANGUAGE ─── */}
        <SectionHeader title={isH ? '🌐 भाषा' : '🌐 Language'} />
        <View style={s.card}>
          <Text style={s.cardSub}>{isH ? 'App की भाषा चुनें' : 'Choose app language'}</Text>
          <View style={s.langToggle}>
            {[{ id: 'hindi', l: '🇮🇳 हिंदी' }, { id: 'english', l: '🇬🇧 English' }].map(({ id, l }) => (
              <TouchableOpacity
                key={id}
                style={[s.langBtn, lang === id && s.langBtnOn]}
                onPress={() => changeLang(id)}>
                <Text style={[s.langBtnTxt, lang === id && s.langBtnTxtOn]}>{l}</Text>
                {lang === id && <Text style={{ color: '#E8620A', fontSize: 14, marginLeft: 6 }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── NOTIFICATIONS ─── */}
        <SectionHeader title={isH ? '🔔 सूचनाएं' : '🔔 Notifications'} />
        <View style={s.card}>
          <SettingRow
            icon="🔔"
            label={isH ? 'सूचनाएं' : 'Notifications'}
            sub={isH ? 'नए content और updates की सूचना' : 'Alerts for new content & updates'}
            onPress={null}
            right={
              <Switch
                value={notifEnabled}
                onValueChange={toggleNotif}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(232,98,10,0.5)' }}
                thumbColor={notifEnabled ? '#E8620A' : '#888'}
              />
            }
          />
          <Divider />
          <SettingRow
            icon="⏰"
            label={isH ? 'दैनिक स्मरण' : 'Daily Reminder'}
            sub={isH ? 'प्रतिदिन सुबह Dharmic reminder' : 'Daily morning dharmic reminder'}
            onPress={null}
            right={
              <Switch
                value={dailyReminder}
                onValueChange={toggleReminder}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(232,98,10,0.5)' }}
                thumbColor={dailyReminder ? '#E8620A' : '#888'}
              />
            }
          />
        </View>

        {/* ── ABOUT ─── */}
        <SectionHeader title={isH ? 'ℹ️ जानकारी' : 'ℹ️ About'} />
        <View style={s.card}>
          <SettingRow
            icon="🛡️"
            label={isH ? 'गोपनीयता नीति' : 'Privacy Policy'}
            sub={isH ? 'आपका डेटा कैसे सुरक्षित है' : 'How your data is protected'}
            onPress={() => openURL(PRIVACY_URL)}
          />
          <Divider />
          <SettingRow
            icon="📋"
            label={isH ? 'उपयोग की शर्तें' : 'Terms of Service'}
            sub={isH ? 'App उपयोग की शर्तें' : 'Terms and conditions of use'}
            onPress={() => openURL(TERMS_URL)}
          />
          <Divider />
          <SettingRow
            icon="⭐"
            label={isH ? 'App को Rate करें' : 'Rate the App'}
            sub={isH ? 'Play Store पर Rating दें' : 'Leave a review on Play Store'}
            onPress={() => openURL('market://details?id=com.dharmasetu.app')}
          />
          <Divider />
          <SettingRow
            icon="📨"
            label={isH ? 'Support से संपर्क' : 'Contact Support'}
            sub="support@dharmasetu.in"
            onPress={() => openURL('mailto:support@dharmasetu.in')}
          />
          <Divider />
          <View style={s.versionRow}>
            <Text style={s.versionLabel}>🕉 DharmaSetu</Text>
            <Text style={s.versionNum}>v{APP_VERSION}</Text>
          </View>
        </View>

        {/* ── PREMIUM ─── */}
        <SectionHeader title={isH ? '⭐ Premium' : '⭐ Premium'} />
        <TouchableOpacity style={s.premiumBanner} onPress={() => router.push('/payment')} activeOpacity={0.88}>
          <View style={{ flex: 1 }}>
            <Text style={s.premiumTitle}>{isH ? 'Premium लें' : 'Go Premium'}</Text>
            <Text style={s.premiumSub}>
              {isH ? 'असीमित AI, Mantra & Dharmic content' : 'Unlimited AI, Mantra & Dharmic content'}
            </Text>
          </View>
          <Text style={{ fontSize: 22, color: '#C9830A' }}>›</Text>
        </TouchableOpacity>

        {/* ── ACCOUNT ─── */}
        <SectionHeader title={isH ? '👤 खाता' : '👤 Account'} />
        <View style={s.card}>
          <SettingRow
            icon="🚪"
            label={isH ? 'लॉगआउट' : 'Logout'}
            sub={isH ? 'सुरक्षित रूप से बाहर निकलें' : 'Sign out securely'}
            onPress={handleLogout}
            danger
          />
          <Divider />
          <SettingRow
            icon="🗑️"
            label={isH ? 'खाता हटाएं' : 'Delete Account'}
            sub={isH ? 'सारा डेटा हमेशा के लिए हटाएं' : 'Permanently delete all your data'}
            onPress={handleDelete}
            danger
          />
        </View>

        {/* FOOTER */}
        <Text style={s.footer}>
          🕉 जय सनातन धर्म · Jai Sanatan Dharma 🔱{'\n'}
          {isH ? 'धर्म की जय हो, अधर्म का नाश हो।' : 'Victory to Dharma, destruction to Adharma.'}
        </Text>

      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#0D0500' },
  hdr:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.1)' },
  backIco:   { fontSize: 28, color: '#F4A261', lineHeight: 28 },
  hdrTitle:  { fontSize: 17, fontWeight: '800', color: '#F4A261' },
  scroll:    { padding: 16 },

  sectionHdr: { fontSize: 11, color: 'rgba(253,246,237,0.35)', fontWeight: '700', letterSpacing: 1, marginTop: 20, marginBottom: 8, marginLeft: 4 },

  card: { backgroundColor: '#0F0600', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(240,165,0,0.12)', marginBottom: 4 },
  cardSub: { fontSize: 12, color: 'rgba(253,246,237,0.35)', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },

  row:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  rowIco:     { fontSize: 18, width: 26, textAlign: 'center' },
  rowLbl:     { fontSize: 14, color: '#FDF6ED', fontWeight: '600' },
  rowLblDanger: { color: '#E74C3C' },
  rowSub:     { fontSize: 11, color: 'rgba(253,246,237,0.35)', marginTop: 2 },
  rowArrow:   { fontSize: 20, color: 'rgba(253,246,237,0.25)', lineHeight: 24 },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: 52 },

  langToggle: { flexDirection: 'row', gap: 10, padding: 12 },
  langBtn:    { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(200,130,40,0.2)', backgroundColor: 'rgba(255,255,255,0.03)' },
  langBtnOn:  { backgroundColor: 'rgba(232,98,10,0.15)', borderColor: '#E8620A' },
  langBtnTxt: { fontSize: 14, color: 'rgba(253,246,237,0.4)', fontWeight: '600' },
  langBtnTxtOn: { color: '#F4A261' },

  premiumBanner: { backgroundColor: 'rgba(201,131,10,0.1)', borderRadius: 16, padding: 16, marginBottom: 4, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(201,131,10,0.3)' },
  premiumTitle:  { fontSize: 15, fontWeight: '800', color: '#C9830A', marginBottom: 3 },
  premiumSub:    { fontSize: 11, color: 'rgba(253,246,237,0.4)' },

  versionRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 },
  versionLabel:{ fontSize: 13, color: 'rgba(253,246,237,0.4)', fontWeight: '600' },
  versionNum:  { fontSize: 12, color: 'rgba(253,246,237,0.25)' },

  footer: { textAlign: 'center', color: 'rgba(240,165,0,0.25)', fontSize: 11, lineHeight: 18, marginTop: 24 },
});
