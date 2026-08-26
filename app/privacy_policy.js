// ════════════════════════════════════════════════════════════════
// DharmaSetu — Privacy Policy (In-App)
// FILE: app/privacy_policy.js
// ════════════════════════════════════════════════════════════════
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#0D0500" />

      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={s.backIco}>‹</Text>
        </TouchableOpacity>
        <Text style={s.hdrTitle}>🛡️ Privacy Policy</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>

        <Text style={s.updated}>Last Updated: May 2026</Text>

        <Text style={s.heading}>1. Information We Collect</Text>
        <Text style={s.body}>
          DharmaSetu collects the following information to provide you a personalized dharmic experience:{'\n\n'}
          • <Text style={s.bold}>Account Information:</Text> Phone number (for authentication via OTP), name, and language preference.{'\n'}
          • <Text style={s.bold}>Birth Data:</Text> Date of birth, time of birth, and birth place — used to generate and restore your Vedic Kundli through DharmaSetu&apos;s secured services.{'\n'}
          • <Text style={s.bold}>Usage Data:</Text> App engagement patterns (streak counts, Japa sessions, mood selections) stored locally on your device.{'\n'}
          • <Text style={s.bold}>Device Information:</Text> Device type, OS version, and Expo push notification token (for daily dharmic reminders).
        </Text>

        <Text style={s.heading}>2. How We Use Your Data</Text>
        <Text style={s.body}>
          • Vedic Kundli generation uses our secured backend and astrology provider; the resulting profile may be stored so it can be restored to your account.{'\n'}
          • DharmaChat AI conversations are sent to our secure backend for processing and are not stored permanently.{'\n'}
          • Panchang data is fetched from our backend API and cached locally for offline access.{'\n'}
          • Push notification tokens are used solely for delivering dharmic reminders you have opted into.{'\n'}
          • We do not sell, rent, or share your personal information with third parties.
        </Text>

        <Text style={s.heading}>3. Data Storage & Security</Text>
        <Text style={s.body}>
          • Some session and cached app data is stored locally using device storage; account, profile, and service data may also be stored by our secured backend providers.{'\n'}
          • Backend communication uses HTTPS encryption.{'\n'}
          • Supabase Authentication secures your login session.{'\n'}
          • Birth profiles and generated Kundli data may be stored with your account to support restoration, subject to our security and deletion controls.
        </Text>

        <Text style={s.heading}>4. Your Rights</Text>
        <Text style={s.body}>
          • <Text style={s.bold}>Access:</Text> You can view all your stored data in the Profile screen.{'\n'}
          • <Text style={s.bold}>Deletion:</Text> You can delete your account and all associated data from Settings → Delete Account.{'\n'}
          • <Text style={s.bold}>Opt-out:</Text> You can disable notifications at any time from Settings → Notifications.
        </Text>

        <Text style={s.heading}>5. Third-Party Services</Text>
        <Text style={s.body}>
          DharmaSetu uses the following third-party services:{'\n\n'}
          • Supabase (Authentication and data services){'\n'}
          • Expo (Push Notifications, OTA Updates){'\n'}
          • Prokerala (authoritative astrology and Panchang calculations){'\n'}
          • Google Gemini and Groq (DharmaChat — via our backend proxy){'\n\n'}
          Each service has its own privacy policy. We encourage you to review them.
        </Text>

        <Text style={s.heading}>6. Children&apos;s Privacy</Text>
        <Text style={s.body}>
          DharmaSetu is intended for users aged 13 and above. We do not knowingly collect information from children under 13.
        </Text>

        <Text style={s.heading}>7. Changes to This Policy</Text>
        <Text style={s.body}>
          We may update this policy from time to time. Changes will be reflected in the &quot;Last Updated&quot; date above. Continued use of the app constitutes acceptance of the updated policy.
        </Text>

        <Text style={s.heading}>8. Contact Us</Text>
        <Text style={s.body}>
          For privacy-related questions or data deletion requests:{'\n\n'}
          📧 support@dharmasetu.in{'\n'}
          🕉 DharmaSetu — Jai Sanatan Dharma 🔱
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
  scroll:   { padding: 20 },
  updated:  { fontSize: 11, color: 'rgba(253,246,237,0.35)', marginBottom: 20, fontStyle: 'italic' },
  heading:  { fontSize: 15, fontWeight: '800', color: '#F4A261', marginTop: 24, marginBottom: 10 },
  body:     { fontSize: 13, color: 'rgba(253,246,237,0.82)', lineHeight: 22 },
  bold:     { fontWeight: '700', color: '#FFE5CC' },
});
