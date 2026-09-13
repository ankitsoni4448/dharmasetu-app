// ════════════════════════════════════════════════════════════════
// DharmaSetu — Premium Vedic Kundli Results Screen
// FILE: app/kundli_result.js
//
// Features:
//   - Premium Jyotish cards (Mahadashas, Yogas, Remedies, Insights)
//   - Sanskrit terminology and high-precision degrees
//   - Secure offline PDF download (saves locally, custom filename, then share)
//   - Saffron-gold spiritual aesthetics
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, memo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { getKundliProfile } from '../utils/kundli_storage';
import { formatKundliForExport } from '../utils/kundli_storage';
import KundliChart from '../components/app/kundli_chart';

export default function KundliResultScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const showLegacyInterpretation = false;

  useEffect(() => {
    loadProfile();
  }, [params.profileId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getKundliProfile(params.profileId);
      if (!data) {
        Alert.alert('❌ Error', 'Kundli not found');
        router.back();
        return;
      }
      setProfile(data);
    } catch (e) {
      console.error('[kundli_result] Load error:', e);
      Alert.alert('❌ Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!profile) return;
    try {
      setExporting(true);
      const text = formatKundliForExport(profile);
      const calc = profile.calculation;

      // Find Lagna Rashi index
      const lagnaRashiName = calc.lagna?.rashi?.name || null;
      const rashiNames = ['Mesh', 'Vrishabh', 'Mithun', 'Kark', 'Simha', 'Kanya',
        'Tula', 'Vrishchik', 'Dhanu', 'Makar', 'Kumbh', 'Meen'];
      const lagnaRashiIdx = rashiNames.indexOf(lagnaRashiName) !== -1
        ? rashiNames.indexOf(lagnaRashiName) + 1
        : null;

      // Format clean planet positions in SVG
      const getPlanetStr = (houseNum) => {
        const grahasByHouse = [];
        Object.values(calc.grahas || {}).forEach((g) => {
          if (g.house === houseNum) {
            const short = g.name.substring(0, 2);
            grahasByHouse.push(short);
          }
        });
        return grahasByHouse.join(', ') || '';
      };

      const getHouseRashi = (houseNum) => {
        return lagnaRashiIdx == null ? '—' : ((lagnaRashiIdx + houseNum - 2) % 12) + 1;
      };

      // Vector-perfect SVG representation for the HTML PDF
      const svgHTML = `
        <div class="svg-wrapper" style="text-align: center; margin: 30px 0;">
          <svg width="300" height="300" viewBox="0 0 300 300" style="background:#130700; border:3px solid #D4AF37; margin: 0 auto; display:block;">
            <!-- Diagonals -->
            <line x1="0" y1="0" x2="300" y2="300" stroke="#D4AF37" stroke-width="1.5" stroke-opacity="0.6"/>
            <line x1="300" y1="0" x2="0" y2="300" stroke="#D4AF37" stroke-width="1.5" stroke-opacity="0.6"/>
            <!-- Central Diamond -->
            <polygon points="150,0 0,150 150,300 300,150" fill="none" stroke="#D4AF37" stroke-width="2"/>

            <!-- Text styles inside SVG -->
            <style>
              .rashi { font-size: 11px; fill: #E8620A; font-weight: bold; text-anchor: middle; }
              .planets { font-size: 10px; fill: #FFE5CC; font-weight: bold; text-anchor: middle; }
              .house { font-size: 7px; fill: rgba(253,246,237,0.3); text-anchor: middle; }
            </style>

            <!-- House 1 -->
            <text x="150" y="90" class="planets">${getPlanetStr(1)}</text>
            <text x="150" y="65" class="rashi">${getHouseRashi(1)}</text>
            <!-- House 2 -->
            <text x="60" y="45" class="planets">${getPlanetStr(2)}</text>
            <text x="60" y="30" class="rashi">${getHouseRashi(2)}</text>
            <!-- House 3 -->
            <text x="45" y="100" class="planets">${getPlanetStr(3)}</text>
            <text x="45" y="85" class="rashi">${getHouseRashi(3)}</text>
            <!-- House 4 -->
            <text x="75" y="155" class="planets">${getPlanetStr(4)}</text>
            <text x="75" y="135" class="rashi">${getHouseRashi(4)}</text>
            <!-- House 5 -->
            <text x="45" y="200" class="planets">${getPlanetStr(5)}</text>
            <text x="45" y="185" class="rashi">${getHouseRashi(5)}</text>
            <!-- House 6 -->
            <text x="60" y="265" class="planets">${getPlanetStr(6)}</text>
            <text x="60" y="250" class="rashi">${getHouseRashi(6)}</text>
            <!-- House 7 -->
            <text x="150" y="220" class="planets">${getPlanetStr(7)}</text>
            <text x="150" y="245" class="rashi">${getHouseRashi(7)}</text>
            <!-- House 8 -->
            <text x="240" y="265" class="planets">${getPlanetStr(8)}</text>
            <text x="240" y="250" class="rashi">${getHouseRashi(8)}</text>
            <!-- House 9 -->
            <text x="255" y="200" class="planets">${getPlanetStr(9)}</text>
            <text x="255" y="185" class="rashi">${getHouseRashi(9)}</text>
            <!-- House 10 -->
            <text x="225" y="155" class="planets">${getPlanetStr(10)}</text>
            <text x="225" y="135" class="rashi">${getHouseRashi(10)}</text>
            <!-- House 11 -->
            <text x="255" y="100" class="planets">${getPlanetStr(11)}</text>
            <text x="255" y="85" class="rashi">${getHouseRashi(11)}</text>
            <!-- House 12 -->
            <text x="240" y="45" class="planets">${getPlanetStr(12)}</text>
            <text x="240" y="30" class="rashi">${getHouseRashi(12)}</text>
          </svg>
        </div>
      `;

      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 30px; background: #0D0500; color: #FDF6ED; }
              h1 { color: #D4AF37; text-align: center; margin-bottom: 5px; font-size: 28px; }
              .subtitle { text-align: center; color: #E8620A; margin-bottom: 30px; font-style: italic; }
              .card { background: #130700; border: 1px solid rgba(212,175,55,0.25); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
              .card-title { color: #D4AF37; font-size: 18px; border-bottom: 1px solid rgba(240,165,0,0.15); padding-bottom: 8px; margin-bottom: 15px; }
              pre { white-space: pre-wrap; word-wrap: break-word; color: #FFE5CC; font-family: monospace; line-height: 1.6; }
            </style>
          </head>
          <body>
            <h1>🕉️ DHARMASETU VEDIC KUNDLI 🕉️</h1>
            <div class="subtitle">Personalized Spiritual Birth Chart Analysis</div>

            ${svgHTML}

            <div class="card">
              <div class="card-title">🪐 ASTROLOGICAL KEY METRICS</div>
              <pre>${text}</pre>
            </div>

            <div class="card">
              <div class="card-title">👁️ LIFE PATH & SPIRITUAL INSIGHTS</div>
              <p>Not available in this provider-backed report.</p>
            </div>
          </body>
        </html>
      `;

      // 1. Generate PDF
      const { uri } = await Print.printToFileAsync({ html });

      // 2. Format proper custom local filename
      const cleanName = profile.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${cleanName}_Kundli.pdf`;
      const destinationUri = `${FileSystem.documentDirectory}${filename}`;

      // 3. Save locally to app private documents directory
      await FileSystem.copyAsync({
        from: uri,
        to: destinationUri,
      });

      // 4. Show success native Alert
      Alert.alert(
        '✅ Kundli Downloaded',
        `Your Vedic Kundli has been safely saved locally to device storage as:\n\n${filename}\n\nWould you like to share or open it now?`,
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Open / Share',
            onPress: async () => {
              await Sharing.shareAsync(destinationUri);
            },
          },
        ]
      );
    } catch (e) {
      console.error('[kundli_result] Export error:', e);
      Alert.alert('❌ Export Error', e.message);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.root, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#F4A261" size="large" />
      </View>
    );
  }

  if (!profile || !profile.calculation) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <Text style={{ color: '#F4A261' }}>Kundli not found</Text>
      </View>
    );
  }

  const calc = profile.calculation;
  const birth = profile.birthData;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#0D0500" />

      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.hdrT}>{profile.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Birth Details */}
        <View style={s.card}>
          <Text style={s.cardTitle}>📅 Birth Details</Text>
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Date:</Text>
            <Text style={s.detailValue}>{birth?.dateOfBirth || '—'}</Text>
          </View>
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Time:</Text>
            <Text style={s.detailValue}>{birth?.birthTime || '—'}</Text>
          </View>
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Place:</Text>
            <Text style={s.detailValue}>{birth?.birthPlace?.name || '—'}</Text>
          </View>
          {birth.unknownTime && (
            <View style={s.warningBox}>
              <Text style={s.warningText}>🌅 Sunrise chart calculated (exact time unknown)</Text>
            </View>
          )}
        </View>

        {/* Premium Kundli Diamond Chart */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🔯 Vedic Diamond Chart</Text>
          <KundliChart calculation={calc} />
        </View>

        {/* Key Metrics */}
        <View style={s.card}>
          <Text style={s.cardTitle}>⭐ Key Astrological Metrics</Text>
          <SummaryRow label="Ascendant (Lagna)" value={calc.lagna?.rashi?.nameEn || 'Not available'} emoji="🏠" />
          <SummaryRow label="Moon Sign (Rashi)" value={calc.moonRashi?.nameEn || 'Not available'} emoji="🌙" />
          <SummaryRow label="Sun Sign" value={calc.sunRashi?.nameEn || 'Not available'} emoji="☀️" />
          <SummaryRow label="Nakshatra & Pada" value={calc.nakshatra?.name ? `${calc.nakshatra.name}${calc.nakshatra.pada ? ` (Pada ${calc.nakshatra.pada})` : ''}` : 'Not available'} emoji="⭐" />
        </View>

        {/* Grahas and precise Degrees */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🪐 Planetary Placements & Degrees</Text>
          {Object.values(calc.grahas || {}).map((graha, i) => graha ? (
            <View key={i} style={s.grahaRow}>
              <View>
                <Text style={s.grahaName}>{graha.name || 'Unknown'}</Text>
                <Text style={s.grahaHouseText}>{`House ${graha.house != null ? graha.house : '—'}`}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.grahaRashi}>{graha.rashi?.nameEn || 'Unknown'}</Text>
                <Text style={s.grahaDeg}>{graha.degreeFormatted || '—'}</Text>
              </View>
            </View>
          ) : null)}
        </View>

        {/* Vimshottari Mahadasha Timeline */}
        {Array.isArray(calc.dashas) && calc.dashas.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>⏳ Vimshottari Mahadasha Timeline</Text>
            {calc.dashas.map((dasha, idx) => dasha ? (
              <View key={idx} style={s.dashaRow}>
                <View style={s.dashaHeader}>
                  <Text style={s.dashaLord}>{`👑 ${dasha.lord || 'Unknown'} Mahadasha`}</Text>
                  <Text style={s.dashaDuration}>{`${dasha.duration || '—'} Years`}</Text>
                </View>
                <Text style={s.dashaDates}>{`${dasha.startFormatted || '—'} — ${dasha.endFormatted || '—'}`}</Text>
              </View>
            ) : null)}
          </View>
        )}

        {/* Auspicious Vedic Yogas */}
        {showLegacyInterpretation && Array.isArray(calc.yogas) && calc.yogas.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>🌟 Auspicious Vedic Yogas</Text>
            {calc.yogas.map((yoga, idx) => yoga ? (
              <View key={idx} style={s.yogaItem}>
                <Text style={s.yogaName}>{`✨ ${yoga.name || 'Yoga'}`}</Text>
                <Text style={s.yogaDesc}>{yoga.description || ''}</Text>
              </View>
            ) : null)}
          </View>
        )}

        {/* Dosh Analysis */}
        {showLegacyInterpretation && Array.isArray(calc.dosh) && calc.dosh.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>⚠️ Dosh Analysis</Text>
            {calc.dosh.map((d, i) => d ? (
              <View key={i} style={s.doshItem}>
                <Text style={s.doshName}>{d.name || 'Dosh'}</Text>
                <Text style={s.doshSeverity}>{d.severity || '—'}</Text>
                <Text style={s.doshDesc}>{d.description || ''}</Text>
              </View>
            ) : null)}
          </View>
        )}

        {/* Personalized Vedic Remedies */}
        {showLegacyInterpretation && Array.isArray(calc.remedies) && calc.remedies.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>📿 Personalized Vedic Remedies</Text>
            {calc.remedies.map((rem, idx) => rem ? (
              <View key={idx} style={s.remedyItem}>
                <Text style={s.remedyTarget}>{`🎯 For ${rem.target || 'General'}`}</Text>
                <Text style={s.remedyText}>{rem.text || ''}</Text>
              </View>
            ) : null)}
          </View>
        )}

        {/* Life & Spiritual Insights */}
        {showLegacyInterpretation && calc.insights && (
          <View style={s.card}>
            <Text style={s.cardTitle}>👁️ Spiritual & Life Insights</Text>
            <View style={s.insightSection}>
              <Text style={s.insightSub}>{'👤 Personality & Soul'}</Text>
              <Text style={s.insightText}>{calc.insights.personality || 'Analysis will be generated based on your chart positions.'}</Text>
            </View>
            <View style={s.insightSection}>
              <Text style={s.insightSub}>{'💼 Career & Karma'}</Text>
              <Text style={s.insightText}>{calc.insights.career || 'Analysis will be generated based on your chart positions.'}</Text>
            </View>
            <View style={s.insightSection}>
              <Text style={s.insightSub}>{'💍 Love & Marriage'}</Text>
              <Text style={s.insightText}>{calc.insights.marriage || 'Analysis will be generated based on your chart positions.'}</Text>
            </View>
            <View style={s.insightSection}>
              <Text style={s.insightSub}>{'🕉️ Spiritual Path'}</Text>
              <Text style={s.insightText}>{calc.insights.spiritualPath || 'Analysis will be generated based on your chart positions.'}</Text>
            </View>
          </View>
        )}

        {/* Info Footer */}
        <View style={s.infoBox}>
          <Text style={s.infoText}>
            🕉️ This is an authentic geocentric Vedic calculation based on high-precision sidereal planetary longitude orbits and Oblique Ascension Lagna calculations.
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={[s.btnRow, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={s.actionBtn}
          onPress={handleExportPDF}
          disabled={exporting}
          activeOpacity={0.85}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.actionBtnTxt}>📄 Download PDF</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const SummaryRow = memo(function SummaryRow({ label, value, emoji }) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{emoji} {label}</Text>
      <Text style={s.summaryValue}>{value}</Text>
    </View>
  );
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#090300' },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(212,175,55,0.18)',
    backgroundColor: '#110500',
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  backIcon: { fontSize: 32, color: '#FFB84D', lineHeight: 32 },
  hdrT: { fontSize: 19, fontWeight: '900', color: '#FFB84D', letterSpacing: 0.5 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 100 },
  card: {
    backgroundColor: '#140801',
    borderWidth: 1.8,
    borderColor: 'rgba(212,175,55,0.32)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#E8620A', // Premium Saffron Shadow
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#FFB84D', marginBottom: 16, letterSpacing: 0.8, borderBottomWidth: 1, borderBottomColor: 'rgba(212,175,55,0.15)', paddingBottom: 8 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.06)',
  },
  detailLabel: { fontSize: 13, color: 'rgba(253,246,237,0.85)', fontWeight: '700' },
  detailValue: { fontSize: 13, color: '#FFE5CC', fontWeight: '800' },
  warningBox: {
    backgroundColor: 'rgba(232,98,10,0.12)',
    borderWidth: 1,
    borderColor: '#E8620A',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  warningText: { fontSize: 12, color: '#FF9933', fontWeight: '700', textAlign: 'center' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.06)',
  },
  summaryLabel: { fontSize: 13.5, color: 'rgba(253,246,237,0.85)', fontWeight: '700' },
  summaryValue: { fontSize: 14, color: '#FFB84D', fontWeight: '900' },
  grahaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.06)',
  },
  grahaName: { fontSize: 13.5, color: 'rgba(253,246,237,0.9)', fontWeight: '800' },
  grahaHouseText: { fontSize: 11, color: 'rgba(253,246,237,0.8)', fontWeight: '600', marginTop: 2 },
  grahaRashi: { fontSize: 13.5, color: '#5FE589', fontWeight: '800' },
  grahaDeg: { fontSize: 11, color: 'rgba(253,246,237,0.85)', fontWeight: '600', marginTop: 2 },
  dashaRow: {
    paddingVertical: 12,
    borderBottomWidth: 0.8,
    borderBottomColor: 'rgba(212,175,55,0.1)',
  },
  dashaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  dashaLord: { fontSize: 13.5, color: '#FFE5CC', fontWeight: '800' },
  dashaDuration: { fontSize: 12.5, color: '#FF9933', fontWeight: '700' },
  dashaDates: { fontSize: 12, color: 'rgba(253,246,237,0.8)', fontStyle: 'italic', fontWeight: '500' },
  yogaItem: {
    paddingVertical: 12,
    borderBottomWidth: 0.8,
    borderBottomColor: 'rgba(212,175,55,0.1)',
  },
  yogaName: { fontSize: 14.5, fontWeight: '900', color: '#FFB84D', marginBottom: 5 },
  yogaDesc: { fontSize: 12.5, color: 'rgba(253,246,237,0.88)', lineHeight: 20 },
  remedyItem: {
    paddingVertical: 12,
    borderBottomWidth: 0.8,
    borderBottomColor: 'rgba(212,175,55,0.1)',
  },
  remedyTarget: { fontSize: 13.5, fontWeight: '800', color: '#FF9933', marginBottom: 5 },
  remedyText: { fontSize: 12.5, color: 'rgba(253,246,237,0.9)', lineHeight: 20 },
  insightSection: {
    marginBottom: 18,
  },
  insightSub: { fontSize: 14, fontWeight: '900', color: '#FFB84D', marginBottom: 8 },
  insightText: { fontSize: 13, color: 'rgba(253,246,237,0.9)', lineHeight: 22 },
  doshItem: { marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(212,175,55,0.06)' },
  doshName: { fontSize: 14.5, fontWeight: '800', color: '#FFE5CC', marginBottom: 5 },
  doshSeverity: { fontSize: 12, color: '#FF9933', fontWeight: '700', marginBottom: 5 },
  doshDesc: { fontSize: 12.5, color: 'rgba(253,246,237,0.88)', lineHeight: 20 },
  infoBox: {
    backgroundColor: 'rgba(107,33,168,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(107,33,168,0.25)',
    borderRadius: 14,
    padding: 16,
    marginTop: 22,
  },
  infoText: { fontSize: 12, color: 'rgba(253,246,237,0.85)', lineHeight: 20, textAlign: 'center', fontWeight: '600' },
  btnRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#090300' },
  actionBtn: {
    flex: 1,
    backgroundColor: '#E8620A',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#E8620A',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: '#FF9933',
  },
  actionBtnTxt: { fontSize: 14.5, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
});
