// ════════════════════════════════════════════════════════════════
// DharmaSetu — About Screen (In-App)
// FILE: app/about.js
// ════════════════════════════════════════════════════════════════
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

export default function AboutScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#0D0500" />

      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={s.backIco}>‹</Text>
        </TouchableOpacity>
        <Text style={s.hdrTitle}>ℹ️ About</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>

        {/* Logo & Name */}
        <View style={s.logoBox}>
          <Text style={s.logoEmoji}>🕉</Text>
          <Text style={s.appName}>DharmaSetu</Text>
          <Text style={s.version}>Version {APP_VERSION}</Text>
          <Text style={s.tagline}>धर्म सेतु — Bridge to Dharma</Text>
        </View>

        {/* Mission */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🙏 Our Mission</Text>
          <Text style={s.cardBody}>
            DharmaSetu is dedicated to making authentic Vedic knowledge accessible to every Hindu in the modern world. We bridge ancient wisdom with modern technology — providing Kundli calculations, Panchang information, Mantra guidance, and AI-powered dharmic assistance.
          </Text>
          <Text style={[s.cardBody, { marginTop: 12 }]}>
            Our goal is to preserve, protect, and propagate Sanatan Dharma through technology, making it easy for every devotee to stay connected to their spiritual roots.
          </Text>
        </View>

        {/* Features */}
        <View style={s.card}>
          <Text style={s.cardTitle}>✨ Key Features</Text>
          {[
            { emoji: '🔯', text: 'Vedic Kundli — Sidereal birth chart with Lahiri Ayanamsa' },
            { emoji: '💬', text: 'DharmaChat AI — Shastric guidance powered by AI' },
            { emoji: '📅', text: 'Panchang — Daily tithi, nakshatra, and muhurat' },
            { emoji: '📿', text: 'Mantra Hub — 15+ mantras with Japa counter' },
            { emoji: '📚', text: 'Dharmic Library — Vedas, Puranas, and Stotras' },
            { emoji: '🕐', text: 'Katha Vault — Divine stories and teachings' },
            { emoji: '🧘', text: 'Mood-based Mantra — Personalized spiritual wellness' },
          ].map((item, i) => (
            <View key={i} style={s.featureRow}>
              <Text style={s.featureEmoji}>{item.emoji}</Text>
              <Text style={s.featureText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Technical */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🔧 Technical Details</Text>
          <Text style={s.cardBody}>
            • Built with React Native + Expo SDK 54{'\n'}
            • Vedic calculations: On-device Keplerian ephemeris engine{'\n'}
            • Ayanamsa: Lahiri (Chitrapaksha){'\n'}
            • AI Backend: Google Gemini via secure proxy{'\n'}
            • Authentication: Supabase Phone Auth (OTP){'\n'}
            • Storage: AsyncStorage (local-first architecture)
          </Text>
        </View>

        {/* Credits */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🙏 Acknowledgments</Text>
          <Text style={s.cardBody}>
            We are grateful to the ancient Rishis and scholars whose timeless wisdom forms the foundation of this app. Special thanks to the open-source community and the developers of Expo, React Native, and Supabase.
          </Text>
        </View>

        {/* Contact */}
        <View style={s.card}>
          <Text style={s.cardTitle}>📨 Contact</Text>
          <Text style={s.cardBody}>
            📧 support@dharmasetu.in{'\n'}
            🌐 dharmasetu.in
          </Text>
        </View>

        <Text style={s.footer}>
          🕉 जय सनातन धर्म · Jai Sanatan Dharma 🔱{'\n'}
          Made with ❤️ for Sanatan Dharma
        </Text>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#0D0500' },
  hdr:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.1)' },
  backIco:  { fontSize: 28, color: '#F4A261', lineHeight: 28 },
  hdrTitle: { fontSize: 17, fontWeight: '800', color: '#F4A261' },
  scroll:   { padding: 16 },

  logoBox:  { alignItems: 'center', paddingVertical: 30, marginBottom: 10 },
  logoEmoji:{ fontSize: 56, marginBottom: 12 },
  appName:  { fontSize: 28, fontWeight: '900', color: '#F4A261', letterSpacing: 1 },
  version:  { fontSize: 12, color: 'rgba(253,246,237,0.35)', marginTop: 4 },
  tagline:  { fontSize: 13, color: '#C9830A', marginTop: 8, fontStyle: 'italic', fontWeight: '600' },

  card:      { backgroundColor: '#0F0600', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(240,165,0,0.12)' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#F4A261', marginBottom: 12 },
  cardBody:  { fontSize: 13, color: 'rgba(253,246,237,0.82)', lineHeight: 22 },

  featureRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  featureEmoji:{ fontSize: 18, width: 26, textAlign: 'center' },
  featureText: { fontSize: 13, color: 'rgba(253,246,237,0.82)', lineHeight: 20, flex: 1 },

  footer: { textAlign: 'center', color: 'rgba(240,165,0,0.3)', fontSize: 11, lineHeight: 18, marginTop: 16, paddingBottom: 10 },
});
