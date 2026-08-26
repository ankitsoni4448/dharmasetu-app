// ════════════════════════════════════════════════════════════════
// DharmaSetu — Terms of Service (In-App)
// FILE: app/terms.js
// ════════════════════════════════════════════════════════════════
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TermsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#0D0500" />

      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={s.backIco}>‹</Text>
        </TouchableOpacity>
        <Text style={s.hdrTitle}>📋 Terms of Service</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>

        <Text style={s.updated}>Last Updated: May 2026</Text>

        <Text style={s.heading}>1. Acceptance of Terms</Text>
        <Text style={s.body}>
          By downloading, installing, or using DharmaSetu (&quot;the App&quot;), you agree to be bound by these Terms of Service. If you do not agree, please do not use the App.
        </Text>

        <Text style={s.heading}>2. Description of Service</Text>
        <Text style={s.body}>
          DharmaSetu is a dharmic lifestyle and spiritual guidance application that provides:{'\n\n'}
          • Vedic Kundli (Birth Chart) calculation and analysis{'\n'}
          • DharmaChat AI — Vedic knowledge assistant{'\n'}
          • Panchang (Hindu Calendar) information{'\n'}
          • Mantra Japa counter and library{'\n'}
          • Dharmic scripture library{'\n'}
          • Personalized spiritual guidance
        </Text>

        <Text style={s.heading}>3. User Accounts</Text>
        <Text style={s.body}>
          • You must provide a valid Indian mobile number to create an account.{'\n'}
          • You are responsible for maintaining the security of your account.{'\n'}
          • You must be at least 13 years old to use this service.{'\n'}
          • One account per phone number is permitted.
        </Text>

        <Text style={s.heading}>4. Vedic Calculations Disclaimer</Text>
        <Text style={s.body}>
          <Text style={s.bold}>Important:</Text> All Kundli calculations, astrological predictions, and Jyotish analyses provided by DharmaSetu are based on mathematical astronomical models (sidereal/Lahiri Ayanamsa) and traditional Vedic astrology principles.{'\n\n'}
          These are provided for <Text style={s.bold}>educational and spiritual guidance purposes only</Text>. They should not be considered a substitute for professional advice in medical, legal, financial, or psychological matters.{'\n\n'}
          DharmaSetu does not guarantee the accuracy of predictions or remedies. Consult a qualified Vedic astrologer for comprehensive personal guidance.
        </Text>

        <Text style={s.heading}>5. AI Chat Disclaimer</Text>
        <Text style={s.body}>
          DharmaChat AI provides responses based on Vedic scriptures, Puranas, and dharmic traditions. While we strive for shastric accuracy:{'\n\n'}
          • AI responses may contain errors or omissions.{'\n'}
          • Responses do not constitute religious authority.{'\n'}
          • Users should verify critical dharmic information with qualified scholars.{'\n'}
          • AI is not a substitute for personal guru or spiritual teacher.
        </Text>

        <Text style={s.heading}>6. Premium Services</Text>
        <Text style={s.body}>
          • Premium features are available through in-app purchase.{'\n'}
          • Payments are processed securely through authorized payment gateways.{'\n'}
          • Refund requests can be made within 7 days of purchase.{'\n'}
          • Premium access may be revoked for violation of these terms.
        </Text>

        <Text style={s.heading}>7. Prohibited Conduct</Text>
        <Text style={s.body}>
          You agree not to:{'\n\n'}
          • Use the App for any unlawful purpose.{'\n'}
          • Attempt to manipulate or exploit the AI system.{'\n'}
          • Share content that is offensive, defamatory, or disrespectful to any religion or community.{'\n'}
          • Reverse-engineer, decompile, or attempt to extract the source code.{'\n'}
          • Use automated scripts or bots to access the service.
        </Text>

        <Text style={s.heading}>8. Intellectual Property</Text>
        <Text style={s.body}>
          All content, design, code, and branding of DharmaSetu is the intellectual property of the DharmaSetu team. Vedic scriptures and mantras quoted within the app are from public domain traditional sources.
        </Text>

        <Text style={s.heading}>9. Limitation of Liability</Text>
        <Text style={s.body}>
          DharmaSetu is provided &quot;as is&quot; without warranties of any kind. We are not liable for any damages arising from use of the App, including but not limited to decisions made based on astrological predictions or AI guidance.
        </Text>

        <Text style={s.heading}>10. Changes to Terms</Text>
        <Text style={s.body}>
          We reserve the right to modify these terms at any time. Continued use after changes constitutes acceptance. We will notify users of significant changes through the App.
        </Text>

        <Text style={s.heading}>11. Contact</Text>
        <Text style={s.body}>
          For questions about these terms:{'\n\n'}
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
