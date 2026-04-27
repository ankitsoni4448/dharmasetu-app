// ════════════════════════════════════════════════════════════════
// DharmaSetu — Mantra Library (Placeholder)
// FILE LOCATION: app/mantra_library.js
// ════════════════════════════════════════════════════════════════

import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MANTRA_FEATURES = [
  '🎧 HD Audio Pronunciations',
  '📿 108 Japa Counter Synchronization',
  '📖 Deep Sanskrit & Literal Meanings',
  '🌟 Curated by Devata & Purpose',
];

export default function MantraLibraryScreen() {
  const insets = useSafeAreaInsets();

  const handleNotify = () => {
    Alert.alert('🙏 Waitlist Joined!', 'We will notify you the moment the Sacred Mantra Library is available.');
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#0D0500" />
      
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.hdrT}>Mantras</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.content}>
        <View style={s.iconWrapper}>
          <Text style={s.mainIcon}>📿</Text>
        </View>
        
        <Text style={s.title}>Sacred Library</Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>Awakening Soon</Text>
        </View>

        <Text style={s.desc}>
          We are compiling a vast repository of powerful, authentic Vedic and Puranic mantras complete with exact audio pronunciations.
        </Text>

        <View style={s.featureBox}>
          <Text style={s.featureTitle}>What to Expect:</Text>
          {MANTRA_FEATURES.map((feat, i) => (
            <Text key={i} style={s.featureItem}>{feat}</Text>
          ))}
        </View>

        <TouchableOpacity style={s.notifyBtn} onPress={handleNotify} activeOpacity={0.85}>
          <Text style={s.notifyBtnTxt}>🔔 Join Waitlist</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0500' },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.1)' },
  backBtn: { width: 40, alignItems: 'flex-start' },
  backIcon: { fontSize: 32, color: '#F4A261', lineHeight: 32 },
  hdrT: { fontSize: 18, fontWeight: '800', color: '#F4A261' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingBottom: 60 },
  iconWrapper: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(52,152,219,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(52,152,219,0.4)', marginBottom: 24, shadowColor: '#3498DB', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  mainIcon: { fontSize: 50 },
  title: { fontSize: 26, fontWeight: '800', color: '#FDF6ED', marginBottom: 12 },
  badge: { backgroundColor: 'rgba(52,152,219,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#3498DB', marginBottom: 24 },
  badgeText: { color: '#3498DB', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  desc: { fontSize: 14, color: 'rgba(253,246,237,0.6)', textAlign: 'center', lineHeight: 22, marginBottom: 36, paddingHorizontal: 10 },
  featureBox: { width: '100%', backgroundColor: '#130700', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(240,165,0,0.15)', marginBottom: 36 },
  featureTitle: { fontSize: 13, color: '#F4A261', fontWeight: '800', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  featureItem: { fontSize: 14, color: 'rgba(253,246,237,0.8)', marginBottom: 10, fontWeight: '500' },
  notifyBtn: { width: '100%', backgroundColor: '#3498DB', borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: '#3498DB', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  notifyBtnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
