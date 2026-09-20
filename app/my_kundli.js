import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { restoreAccountLifecycle, retryPrimaryKundli } from '../utils/accountLifecycle';
import readiness from '../utils/kundliReadiness';
import presentation from '../utils/accountBirthPresentation';

const { isCanonicalBirthProfileReady } = readiness;

const COPY = {
  english: { title: 'My Kundli', retry: 'Retry', edit: 'Edit birth details', unavailable: 'Not supplied by the calculation provider.',
    correction: 'Your birth details need correction before an authoritative Kundli can be generated.',
    provider: 'The calculation provider is temporarily unavailable. No fallback chart has been created.',
    precision: 'Birth time is not exact. Lagna, houses, Vargas and precise Dasha timing may vary.',
    interpretation: 'Traditional Vedic Jyotish interpretation; calculated chart facts and interpretation are shown separately.' },
  hindi: { title: 'मेरी कुंडली', retry: 'फिर प्रयास करें', edit: 'जन्म विवरण बदलें', unavailable: 'गणना प्रदाता ने यह जानकारी उपलब्ध नहीं कराई।',
    correction: 'प्रामाणिक कुंडली बनाने से पहले जन्म विवरण सुधारना आवश्यक है।',
    provider: 'गणना सेवा अभी उपलब्ध नहीं है। कोई अनुमानित कुंडली नहीं बनाई गई है।',
    precision: 'जन्म समय सटीक नहीं है। लग्न, भाव, वर्ग और दशा का समय बदल सकता है।',
    interpretation: 'यह पारंपरिक वैदिक ज्योतिष व्याख्या है; गणना तथ्य और व्याख्या अलग रखे गए हैं।' },
};

function valueName(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return value?.name || value?.value || null;
}
function Section({ title, children }) { return <View style={styles.card}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
function Row({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{valueName(value)}</Text></View>;
}
function ProviderChart({ chart, unavailable }) {
  if (chart?.format !== 'svg' || typeof chart.content !== 'string' || !/^\s*(?:<\?xml[^>]*>\s*)?<svg\b/i.test(chart.content)) return unavailable;
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"><style>html,body{margin:0;background:transparent}svg{width:100%;height:auto;display:block}</style></head><body>${chart.content}</body></html>`;
  return <WebView source={{ html }} style={styles.chart} javaScriptEnabled={false} domStorageEnabled={false}
    originWhitelist={['about:blank']} allowFileAccess={false} allowUniversalAccessFromFileURLs={false}
    mixedContentMode="never" scrollEnabled={false} />;
}

export default function MyKundliScreen() {
  const insets = useSafeAreaInsets();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState('english');
  useEffect(() => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[KundliBuild] kundli-phase1-final-location-repair-20260921');
      console.log('[KundliRoute] My Kundli mounted');
    }
  }, []);
  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await restoreAccountLifecycle({ reconcile: true });
      setAccount(result);
      setLanguage(result.profile?.language === 'hindi' ? 'hindi' : 'english');
    } catch (e) { setError(e.code || e.message || 'ACCOUNT_RESTORE_FAILED'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const t = COPY[language];
  const jyotish = account?.jyotishProfile;
  const birth = account?.birthProfile;
  const replacementPending = Boolean(jyotish?.status === 'KUNDLI_READY' && birth?.input_fingerprint
    && jyotish.input_fingerprint !== birth.input_fingerprint);
  const normalized = jyotish?.chart_data?.normalized || {};
  const canonicalValue = fact => fact?.status === 'AVAILABLE' ? fact : null;
  const lagna = canonicalValue(normalized.lagna);
  const moonSign = canonicalValue(normalized.moon_sign);
  const sunSign = canonicalValue(normalized.sun_sign);
  const nakshatra = canonicalValue(normalized.nakshatra);
  const hasReadyChart = jyotish?.status === 'KUNDLI_READY' && Boolean(jyotish?.chart_data?.normalized);
  const currentReady = hasReadyChart && birth?.input_fingerprint
    && jyotish.input_fingerprint === birth.input_fingerprint;
  const status = replacementPending ? 'RECALCULATION_PENDING' : jyotish?.status || account?.onboardingStatus || 'KUNDLI_PENDING';
  const canGenerate = isCanonicalBirthProfileReady(birth);
  const generate = async () => {
    setGenerating(true); setError(null);
    try { const result = await retryPrimaryKundli(); setAccount(result.account); }
    catch (e) { setError(e.code || e.message || 'KUNDLI_PROVIDER_UNAVAILABLE'); }
    finally { setGenerating(false); }
  };
  if (loading) return <View style={styles.center}><ActivityIndicator color="#F4A261" size="large" /></View>;
  if (!account && error) return <View style={styles.center}><Text style={styles.emptyTitle}>Could not load your account.</Text><TouchableOpacity style={styles.primaryWide} onPress={load}><Text style={styles.primaryText}>Try Again</Text></TouchableOpacity></View>;
  if (!hasReadyChart && !canGenerate) return <View style={[styles.root, { paddingTop: insets.top }]}>
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()} style={styles.touch}><Text style={styles.back}>‹</Text></TouchableOpacity><Text style={styles.title}>{t.title}</Text><View style={styles.touch} /></View>
    <View style={styles.empty}><Text style={styles.emptyIcon}>🔯</Text><Text style={styles.emptyTitle}>{birth ? 'Your known birth details are saved.' : 'Create Your Kundli'}</Text>
      <Text style={styles.warningText}>{birth ? 'Some Kundli calculations require your birth time. Add it when you know it.' : 'Add your birth details to create your personalized Kundli.'}</Text>
      {account?.reconciliationError && <><Text style={styles.warningText}>{presentation.onboardingErrorMessage(account.reconciliationError)}</Text><TouchableOpacity style={styles.secondaryWide} onPress={load}><Text style={styles.secondaryText}>Try Again</Text></TouchableOpacity></>}
      <TouchableOpacity style={styles.primaryWide} onPress={() => router.push('/birth_details')}><Text style={styles.primaryText}>{birth ? 'Edit Birth Details' : 'Create My Kundli'}</Text></TouchableOpacity></View>
  </View>;
  if (!hasReadyChart) {
    const failed = status === 'PROVIDER_UNAVAILABLE' || Boolean(error);
    return <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}><TouchableOpacity onPress={() => router.back()} style={styles.touch}><Text style={styles.back}>‹</Text></TouchableOpacity><Text style={styles.title}>{t.title}</Text><View style={styles.touch} /></View>
      <View style={styles.empty}>{generating ? <ActivityIndicator color="#F4A261" size="large" /> : <Text style={styles.emptyIcon}>🔯</Text>}
        <Text style={styles.emptyTitle}>{failed ? "We couldn't prepare your Kundli right now." : 'Preparing your Kundli...'}</Text>
        {failed && <TouchableOpacity style={styles.primaryWide} onPress={generate} disabled={generating}><Text style={styles.primaryText}>Try Again</Text></TouchableOpacity>}
        <TouchableOpacity style={styles.secondaryWide} onPress={() => router.push('/birth_details')}><Text style={styles.secondaryText}>Edit Birth Details</Text></TouchableOpacity>
      </View>
    </View>;
  }
  const unavailable = <Text style={styles.muted}>{t.unavailable}</Text>;
  return <View style={[styles.root, { paddingTop: insets.top }]}>
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.touch}><Text style={styles.back}>‹</Text></TouchableOpacity>
      <Text style={styles.title}>{t.title}</Text>
      <TouchableOpacity onPress={() => setLanguage(v => v === 'hindi' ? 'english' : 'hindi')} style={styles.language}><Text style={styles.languageText}>{language === 'hindi' ? 'EN' : 'हिं'}</Text></TouchableOpacity>
    </View>
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#F4A261" />}>
      {!currentReady && <View style={styles.warning}>
        <Text style={styles.warningTitle}>Updated calculation pending</Text>
        <Text style={styles.warningText}>Your previous valid Kundli is shown while the updated calculation is prepared.</Text>
        <View style={styles.actions}><TouchableOpacity style={styles.secondary} onPress={() => router.push('/birth_details')}><Text style={styles.secondaryText}>{t.edit}</Text></TouchableOpacity>
          {canGenerate && <TouchableOpacity style={styles.primary} onPress={generate} disabled={generating}>{generating ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{t.retry}</Text>}</TouchableOpacity>}</View>
      </View>}
      {birth?.birth_time_certainty && birth.birth_time_certainty !== 'EXACT' && <Text style={styles.precision}>{t.precision}</Text>}
      <Section title="Overview"><Row label="Name" value={account?.profile?.name} /><Row label="Date" value={birth?.date_of_birth} /><Row label="Time" value={birth?.birth_time || 'Unknown'} /><Row label="Birthplace" value={birth?.place_name} /><Row label="Time certainty" value={birth?.birth_time_certainty} /><Row label="Rashi" value={moonSign?.sign || t.unavailable} /><Row label="Sun sign" value={sunSign?.sign || t.unavailable} /><Row label="Lagna" value={lagna?.sign || t.unavailable} /><Row label="Nakshatra" value={nakshatra?.name || t.unavailable} /><Row label="Pada" value={nakshatra?.pada ?? t.unavailable} /></Section>
      <Section title="Chart — D1 / Rashi"><ProviderChart chart={normalized.charts?.d1?.data} unavailable={unavailable} /></Section>
      <Section title="Chart — D9 / Navamsha"><ProviderChart chart={normalized.charts?.d9?.data} unavailable={unavailable} /></Section>
      <Section title="Chart — Bhava"><ProviderChart chart={normalized.charts?.bhava?.data} unavailable={unavailable} /></Section>
      <Section title="Graha">{normalized.planets?.length ? normalized.planets.map(p => <View key={p.name} style={styles.planet}><Text style={styles.planetName}>{p.name}</Text><Text style={styles.muted}>{[p.sign, p.longitude != null ? `${p.longitude}°` : null, p.house != null ? `House ${p.house}` : null].filter(Boolean).join(' · ')}</Text></View>) : unavailable}</Section>
      <Section title="Houses / Bhava">{normalized.houses?.status === 'AVAILABLE' && normalized.houses.items?.length
        ? normalized.houses.items.map(h => <Row key={h.number} label={`House ${h.number}`}
          value={[h.sign, h.lord ? `Lord: ${h.lord}` : null, h.occupants?.length ? `Occupants: ${h.occupants.join(', ')}` : null].filter(Boolean).join(' · ')} />)
        : unavailable}</Section>
      <Section title="Dasha"><Row label="Mahadasha" value={jyotish?.compact_context?.currentMahadasha} /><Row label="Antardasha" value={jyotish?.compact_context?.currentAntardasha} />{!normalized.dasha && unavailable}</Section>
      <Section title="Yogas">{normalized.yogas?.length ? normalized.yogas.map((item, i) => <Text key={i} style={styles.body}>• {valueName(item)}</Text>) : unavailable}</Section>
      <Section title="Doshas">{normalized.doshas ? <Text style={styles.body}>{valueName(normalized.doshas) || 'Provider data available'}</Text> : unavailable}</Section>
      {normalized.moduleStatus && Object.keys(normalized.moduleStatus).length > 0 && <Section title="Provider modules">
        {Object.entries(normalized.moduleStatus).map(([name, moduleState]) => <Row key={name} label={name} value={moduleState} />)}
      </Section>}
      <Section title="Interpretation"><Text style={styles.body}>{t.interpretation}</Text><Text style={styles.muted}>Detailed interpretation is available only for calculated facts supplied by the authoritative backend record.</Text></Section>
      <TouchableOpacity style={styles.editButton} onPress={() => router.push('/birth_details')}><Text style={styles.editText}>{t.edit}</Text></TouchableOpacity>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:'#0D0500'},center:{flex:1,backgroundColor:'#0D0500',alignItems:'center',justifyContent:'center'},header:{height:58,flexDirection:'row',alignItems:'center',paddingHorizontal:14,borderBottomWidth:1,borderBottomColor:'rgba(244,162,97,.18)'},touch:{width:44,height:44,alignItems:'center',justifyContent:'center'},back:{fontSize:34,color:'#F4A261'},title:{flex:1,textAlign:'center',fontSize:20,fontWeight:'800',color:'#FDF6ED'},language:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},languageText:{color:'#F4A261',fontWeight:'800'},empty:{flex:1,alignItems:'center',justifyContent:'center',padding:28,gap:16},emptyIcon:{fontSize:46},emptyTitle:{color:'#FDF6ED',fontSize:20,fontWeight:'800',lineHeight:28,textAlign:'center'},primaryWide:{minHeight:48,minWidth:220,borderRadius:14,backgroundColor:'#E8620A',alignItems:'center',justifyContent:'center',paddingHorizontal:18},secondaryWide:{minHeight:46,minWidth:220,borderRadius:14,borderWidth:1,borderColor:'#F4A261',alignItems:'center',justifyContent:'center',paddingHorizontal:18},content:{padding:16,gap:12},card:{backgroundColor:'#160A03',borderWidth:1,borderColor:'rgba(244,162,97,.16)',borderRadius:16,padding:16},sectionTitle:{fontSize:16,fontWeight:'800',color:'#F4A261',marginBottom:10},row:{flexDirection:'row',gap:12,paddingVertical:7,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,.05)'},label:{flex:1,color:'rgba(253,246,237,.55)'},value:{flex:1,color:'#FDF6ED',fontWeight:'600',textAlign:'right'},muted:{color:'rgba(253,246,237,.5)',lineHeight:20},body:{color:'#FDF6ED',lineHeight:21},available:{color:'#75C98B',fontWeight:'700'},chart:{height:320,backgroundColor:'transparent'},planet:{paddingVertical:8,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,.05)'},planetName:{color:'#FDF6ED',fontWeight:'700',marginBottom:3},warning:{backgroundColor:'rgba(212,145,40,.12)',borderColor:'rgba(244,162,97,.35)',borderWidth:1,borderRadius:16,padding:16},warningTitle:{color:'#F4A261',fontWeight:'800',marginBottom:7},warningText:{color:'#FDF6ED',lineHeight:20},precision:{color:'#FFD18A',backgroundColor:'rgba(255,183,77,.09)',padding:12,borderRadius:12,lineHeight:19},actions:{flexDirection:'row',gap:10,marginTop:14},primary:{flex:1,minHeight:46,borderRadius:12,backgroundColor:'#E8620A',alignItems:'center',justifyContent:'center'},primaryText:{color:'#fff',fontWeight:'800'},secondary:{flex:1,minHeight:46,borderRadius:12,borderWidth:1,borderColor:'#F4A261',alignItems:'center',justifyContent:'center',paddingHorizontal:8},secondaryText:{color:'#F4A261',fontWeight:'700',textAlign:'center'},editButton:{minHeight:48,borderRadius:14,backgroundColor:'#E8620A',alignItems:'center',justifyContent:'center'},editText:{color:'#fff',fontWeight:'800'},
});
