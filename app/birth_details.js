import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { restoreAccountLifecycle, saveAndPreparePrimaryKundli } from '../utils/accountLifecycle';
import presentation from '../utils/accountBirthPresentation';
import form from '../utils/kundliForm';
import setup from '../utils/kundliSetup';
const { onboardingErrorMessage } = presentation;
const { MONTHS, canonicalDateFromParts, canonicalTimeFrom12Hour, datePartsFromCanonical, timePartsFromCanonical } = form;
const { TIME_KNOWLEDGE, TIME_PERIODS, generationEligible, timePayload, validMapPoint } = setup;

const MAP_HTML = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0;background:#efe4d5}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const map=L.map('map').setView([22.8,79.5],4);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'}).addTo(map);let marker;map.on('click',e=>{if(marker)marker.setLatLng(e.latlng);else marker=L.marker(e.latlng).addTo(map);window.ReactNativeWebView.postMessage(JSON.stringify({latitude:e.latlng.lat,longitude:e.latlng.lng}))});</script></body></html>`;
const Steps = ['Birth Date', 'Birth Time', 'Birthplace', 'Review & Create'];

export default function BirthDetailsScreen() {
  const insets = useSafeAreaInsets();
  const [account, setAccount] = useState(null); const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState(false); const [saving, setSaving] = useState(false);
  const [name, setName] = useState(''); const [gender, setGender] = useState('');
  const [day, setDay] = useState(''); const [month, setMonth] = useState(''); const [year, setYear] = useState('');
  const [certainty, setCertainty] = useState(''); const [hour, setHour] = useState(''); const [minute, setMinute] = useState(''); const [period, setPeriod] = useState('AM'); const [timePeriod, setTimePeriod] = useState('');
  const [villageCity, setVillageCity] = useState(''); const [district, setDistrict] = useState(''); const [region, setRegion] = useState(''); const [country, setCountry] = useState('India');
  const [placeMode, setPlaceMode] = useState('SEARCH_CONFIRMED'); const [mapPoint, setMapPoint] = useState(null); const [consent, setConsent] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[KundliFlow] guided setup mounted');
    setLoading(true); setLoadError(false);
    restoreAccountLifecycle().then(result => {
      const draft = result.birthProfile || result.legacyBirthInput || {};
      const date = datePartsFromCanonical(draft.date_of_birth || draft.dateOfBirth);
      const time = timePartsFromCanonical(draft.birth_time || draft.birthTime);
      setAccount(result); setName(result.profile?.name || result.legacyBirthInput?.name || ''); setGender(result.profile?.gender || result.legacyBirthInput?.gender || '');
      setDay(date.day); setMonth(date.month); setYear(date.year); setHour(time.hour); setMinute(time.minute); setPeriod(time.period);
      setCertainty(draft.birth_time_certainty || draft.birthTimeCertainty || ''); setTimePeriod(draft.birth_time_period || '');
      setVillageCity(draft.city || draft.birthplace || draft.birthplace_input || ''); setRegion(draft.region || ''); setCountry(draft.country || 'India');
      setConsent(Boolean(result.profile?.birth_data_consent_at) || result.legacyBirthInput?.birthDataConsent === true);
      if (draft.latitude != null && draft.longitude != null) setMapPoint({ latitude: Number(draft.latitude), longitude: Number(draft.longitude) });
    }).catch(() => setLoadError(true)).finally(() => setLoading(false));
  }, [loadAttempt]);

  const date = useMemo(() => canonicalDateFromParts(day, month, year), [day, month, year]);
  const clock = useMemo(() => canonicalTimeFrom12Hour(hour, minute, period), [hour, minute, period]);
  const time = timePayload(certainty, clock, timePeriod);
  const placeValid = villageCity.trim() && region.trim() && country.trim() && (placeMode !== 'MAP_CONFIRMED' || validMapPoint(mapPoint));
  const validateStep = () => step === 0 ? Boolean(date && gender) : step === 1
    ? Boolean(certainty && (certainty === 'UNKNOWN' || (certainty === 'PERIOD_ONLY' ? timePeriod : clock)))
    : step === 2 ? Boolean(placeValid) : Boolean(consent);
  const next = () => validateStep() ? setStep(value => Math.min(3, value + 1))
    : Alert.alert('Complete this step', step === 2 && placeMode === 'MAP_CONFIRMED' ? 'Tap the map to confirm the exact birthplace.' : 'Please complete the required details.');

  const submit = async () => {
    if (saving || !date || !placeValid || !consent) return;
    setSaving(true);
    try {
      const result = await saveAndPreparePrimaryKundli({ name, gender, dateOfBirth: date, ...time,
        birthplace: [villageCity, district, region, country].filter(Boolean).join(', '),
        birthplaceDetails: { villageCity, district, state: region, country },
        ...(placeMode === 'MAP_CONFIRMED' ? { locationSelection: { source: 'MAP_CONFIRMED', ...mapPoint } } : {}),
        language: account.profile?.language || account.legacyBirthInput?.language || 'english', interests: account.profile?.interests || [],
        birthDataConsent: true, confirmBirthProfileChange: Boolean(account.birthProfile) });
      if (!generationEligible(certainty, clock)) Alert.alert('Birth details saved', 'Some Kundli calculations require your birth time. You can add it later.');
      router.replace('/my_kundli'); return result;
    } catch (error) {
      if (error.birthProfileSaved) Alert.alert('Birth details saved', 'Your details were saved, but your Kundli could not be prepared. You can retry later.');
      else Alert.alert('Could not save', onboardingErrorMessage(error.code || error.message));
    } finally { setSaving(false); }
  };
  const confirmSubmit = () => account?.birthProfile ? Alert.alert('Update birth details', 'Changing these details may change your Kundli. It will be recalculated using the updated details.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Continue', onPress: submit },
  ]) : submit();

  if (loading) return <View style={styles.center}><ActivityIndicator color="#E8620A" size="large" /></View>;
  if (loadError || !account) return <View style={styles.center}><Text style={styles.title}>Could not load your birth details.</Text><TouchableOpacity style={styles.primary} onPress={() => setLoadAttempt(v => v + 1)}><Text style={styles.primaryText}>Try Again</Text></TouchableOpacity></View>;
  return <KeyboardAvoidingView style={[styles.root, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={styles.header}><TouchableOpacity style={styles.headerTouch} onPress={() => step ? setStep(step - 1) : router.back()}><Text style={styles.back}>‹</Text></TouchableOpacity><Text style={styles.headerTitle}>Create Your Kundli</Text><View style={styles.headerTouch} /></View>
    <View style={styles.progress}>{Steps.map((label, index) => <View key={label} style={styles.progressItem}><View style={[styles.dot, index <= step && styles.dotOn]} /><Text style={[styles.progressText, index === step && styles.progressTextOn]}>{index + 1}</Text></View>)}</View>
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>STEP {step + 1} OF 4</Text><Text style={styles.title}>{Steps[step]}</Text>
      {step === 0 && <View style={styles.card}><Text style={styles.copy}>Enter the date and profile details used for this Kundli.</Text>
        <Text style={styles.label}>Date of birth</Text><View style={styles.dateRow}><TextInput style={[styles.input, styles.dateShort]} value={day} onChangeText={v => setDay(v.replace(/\D/g, '').slice(0, 2))} placeholder="Day" keyboardType="number-pad" placeholderTextColor="#745D50" /><TextInput style={[styles.input, styles.dateShort]} value={year} onChangeText={v => setYear(v.replace(/\D/g, '').slice(0, 4))} placeholder="Year" keyboardType="number-pad" placeholderTextColor="#745D50" /></View>
        <View style={styles.wrap}>{MONTHS.map((label, index) => <TouchableOpacity key={label} style={[styles.choice, month === String(index + 1) && styles.choiceOn]} onPress={() => setMonth(String(index + 1))}><Text style={styles.choiceText}>{label.slice(0,3)}</Text></TouchableOpacity>)}</View>
        <Text style={styles.label}>Gender</Text><View style={styles.wrap}>{['male','female','other','prefer_not_to_say'].map(value => <TouchableOpacity key={value} style={[styles.choice, gender === value && styles.choiceOn]} onPress={() => setGender(value)}><Text style={styles.choiceText}>{value.replaceAll('_',' ')}</Text></TouchableOpacity>)}</View></View>}
      {step === 1 && <View style={styles.card}><Text style={styles.copy}>Choose what you actually know. No time will be guessed.</Text><View style={styles.stack}>{TIME_KNOWLEDGE.map(item => <TouchableOpacity key={item.value} style={[styles.option, certainty === item.value && styles.choiceOn]} onPress={() => { setCertainty(item.value); if (item.value !== 'PERIOD_ONLY') setTimePeriod(''); }}><Text style={styles.optionText}>{item.label}</Text></TouchableOpacity>)}</View>
        {['EXACT','APPROXIMATE'].includes(certainty) && <><Text style={styles.label}>{certainty === 'EXACT' ? 'Exact time' : 'Approximate time'}</Text><View style={styles.dateRow}><TextInput style={[styles.input, styles.time]} value={hour} onChangeText={v => setHour(v.replace(/\D/g,'').slice(0,2))} placeholder="Hour" keyboardType="number-pad" placeholderTextColor="#745D50" /><TextInput style={[styles.input, styles.time]} value={minute} onChangeText={v => setMinute(v.replace(/\D/g,'').slice(0,2))} placeholder="Minute" keyboardType="number-pad" placeholderTextColor="#745D50" />{['AM','PM'].map(v => <TouchableOpacity key={v} style={[styles.choice, period === v && styles.choiceOn]} onPress={() => setPeriod(v)}><Text style={styles.choiceText}>{v}</Text></TouchableOpacity>)}</View></>}
        {certainty === 'PERIOD_ONLY' && <View style={styles.wrap}>{TIME_PERIODS.map(([value,label]) => <TouchableOpacity key={value} style={[styles.option, timePeriod === value && styles.choiceOn]} onPress={() => setTimePeriod(value)}><Text style={styles.optionText}>{label}</Text></TouchableOpacity>)}</View>}
        {['PERIOD_ONLY','UNKNOWN'].includes(certainty) && <Text style={styles.note}>Some Kundli calculations require a clock time. Your known details can still be saved.</Text>}</View>}
      {step === 2 && <View style={styles.card}><View style={styles.segment}>{[['SEARCH_CONFIRMED','Search / Details'],['MAP_CONFIRMED','Select on Map']].map(([value,label]) => <TouchableOpacity key={value} style={[styles.segmentButton, placeMode === value && styles.choiceOn]} onPress={() => setPlaceMode(value)}><Text style={styles.choiceText}>{label}</Text></TouchableOpacity>)}</View>
        {[['Village / Town / City',villageCity,setVillageCity],['District (optional)',district,setDistrict],['State',region,setRegion],['Country',country,setCountry]].map(([label,value,setter]) => <View key={label}><Text style={styles.label}>{label}</Text><TextInput style={styles.input} value={value} onChangeText={setter} placeholder={label} placeholderTextColor="#745D50" /></View>)}
        {placeMode === 'MAP_CONFIRMED' && <><Text style={styles.copy}>Pan and zoom, then tap the exact birthplace.</Text><View style={styles.map}><WebView source={{ html: MAP_HTML }} javaScriptEnabled onMessage={event => { try { const point=JSON.parse(event.nativeEvent.data); if (validMapPoint(point)) setMapPoint(point); } catch {} }} /></View>{mapPoint && <Text style={styles.note}>Selected point: {mapPoint.latitude.toFixed(5)}, {mapPoint.longitude.toFixed(5)}</Text>}</>}</View>}
      {step === 3 && <View style={styles.card}><Text style={styles.reviewTitle}>Review your birth details</Text><Review label="Date" value={date || 'Not entered'} /><Review label="Time" value={certainty === 'PERIOD_ONLY' ? TIME_PERIODS.find(([v]) => v === timePeriod)?.[1] : certainty === 'UNKNOWN' ? 'Unknown' : `${clock || ''} (${certainty.toLowerCase()})`} /><Review label="Birthplace" value={[villageCity,district,region,country].filter(Boolean).join(', ')} /><Review label="Location" value={placeMode === 'MAP_CONFIRMED' ? 'Map confirmed' : 'Search confirmed'} />
        <TouchableOpacity style={styles.consent} onPress={() => setConsent(v => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: consent }}><Text style={styles.consentText}>{consent ? '[x]' : '[ ]'} I consent to saving these birth details and using them to prepare my Kundli.</Text></TouchableOpacity>
        {!generationEligible(certainty, clock) && <Text style={styles.note}>Your details will be saved. A full Kundli will wait until a clock time is available.</Text>}
        <TouchableOpacity style={[styles.primary, (saving || !consent) && styles.disabled]} disabled={saving || !consent} onPress={confirmSubmit}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{generationEligible(certainty, clock) ? 'Create My Kundli' : 'Save Birth Details'}</Text>}</TouchableOpacity></View>}
      {step < 3 && <TouchableOpacity style={[styles.primary, !validateStep() && styles.disabled]} disabled={!validateStep()} onPress={next}><Text style={styles.primaryText}>Continue</Text></TouchableOpacity>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
function Review({ label, value }) { return <View style={styles.reviewRow}><Text style={styles.reviewLabel}>{label}</Text><Text style={styles.reviewValue}>{value}</Text></View>; }
const styles = StyleSheet.create({root:{flex:1,backgroundColor:'#0D0500'},center:{flex:1,backgroundColor:'#0D0500',alignItems:'center',justifyContent:'center',padding:24},header:{height:58,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:'rgba(244,162,97,.18)'},headerTouch:{width:52,height:48,alignItems:'center',justifyContent:'center'},back:{fontSize:34,color:'#F4A261'},headerTitle:{flex:1,textAlign:'center',fontSize:19,fontWeight:'900',color:'#FDF6ED'},progress:{flexDirection:'row',paddingHorizontal:30,paddingTop:14},progressItem:{flex:1,alignItems:'center'},dot:{width:9,height:9,borderRadius:5,backgroundColor:'#4A3327'},dotOn:{backgroundColor:'#E8620A'},progressText:{fontSize:10,color:'#745D50',marginTop:4},progressTextOn:{color:'#F4A261'},content:{padding:18},eyebrow:{color:'#F4A261',fontSize:12,fontWeight:'900',letterSpacing:1},title:{color:'#FDF6ED',fontSize:26,fontWeight:'900',marginTop:5,marginBottom:16},card:{backgroundColor:'#160A03',borderWidth:1,borderColor:'rgba(244,162,97,.2)',borderRadius:18,padding:17},copy:{color:'rgba(253,246,237,.65)',lineHeight:20,marginBottom:10},label:{color:'rgba(253,246,237,.65)',fontSize:13,fontWeight:'800',marginTop:13,marginBottom:7},input:{minHeight:50,borderWidth:1,borderColor:'rgba(244,162,97,.25)',borderRadius:12,paddingHorizontal:13,color:'#FDF6ED',backgroundColor:'#0D0500'},dateRow:{flexDirection:'row',gap:9,alignItems:'center'},dateShort:{flex:1},time:{flex:1},wrap:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:8},stack:{gap:8},choice:{minHeight:44,minWidth:52,paddingHorizontal:10,borderWidth:1,borderColor:'rgba(244,162,97,.24)',borderRadius:11,alignItems:'center',justifyContent:'center'},choiceOn:{backgroundColor:'rgba(232,98,10,.2)',borderColor:'#E8620A'},choiceText:{color:'#F4A261',fontWeight:'750',textTransform:'capitalize'},option:{minHeight:48,paddingHorizontal:13,borderWidth:1,borderColor:'rgba(244,162,97,.24)',borderRadius:12,justifyContent:'center'},optionText:{color:'#FDF6ED',fontWeight:'700'},note:{color:'#FFD18A',lineHeight:19,marginTop:13},segment:{flexDirection:'row',gap:8,marginBottom:8},segmentButton:{flex:1,minHeight:46,borderWidth:1,borderColor:'rgba(244,162,97,.24)',borderRadius:12,alignItems:'center',justifyContent:'center'},map:{height:290,borderRadius:14,overflow:'hidden',borderWidth:1,borderColor:'rgba(244,162,97,.28)'},reviewTitle:{color:'#F4A261',fontSize:18,fontWeight:'900',marginBottom:12},reviewRow:{paddingVertical:10,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,.06)'},reviewLabel:{color:'rgba(253,246,237,.52)',fontSize:12},reviewValue:{color:'#FDF6ED',fontWeight:'700',marginTop:3},consent:{minHeight:52,justifyContent:'center',marginTop:12},consentText:{color:'#FDF6ED',lineHeight:20},primary:{minHeight:53,borderRadius:14,backgroundColor:'#E8620A',alignItems:'center',justifyContent:'center',marginTop:18},primaryText:{color:'#fff',fontWeight:'900',fontSize:16},disabled:{opacity:.45}});
