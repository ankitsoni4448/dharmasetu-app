import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { restoreAccountLifecycle, saveAndPreparePrimaryKundli, searchBirthplace } from '../utils/accountLifecycle';
import presentation from '../utils/accountBirthPresentation';
import form from '../utils/kundliForm';
import setup from '../utils/kundliSetup';
const { onboardingErrorMessage } = presentation;
const { MONTHS, canonicalDateFromParts, canonicalTimeFrom12Hour, datePartsFromCanonical, timePartsFromCanonical } = form;
const { TIME_KNOWLEDGE, TIME_PERIODS, generationEligible, timePayload, validMapPoint } = setup;

const MAP_HTML = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;width:100%;margin:0;background:#efe4d5;overflow:hidden;overscroll-behavior:none}#map{touch-action:none}.leaflet-control-zoom a{width:40px;height:40px;line-height:40px;font-size:24px}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const map=L.map('map',{dragging:true,touchZoom:true,scrollWheelZoom:true,doubleClickZoom:true,zoomControl:true,tap:true}).setView([22.8,79.5],4);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'}).addTo(map);let marker;function showPoint(point,focus){const latlng=L.latLng(point.latitude,point.longitude);if(marker)marker.setLatLng(latlng);else marker=L.marker(latlng).addTo(map);if(focus)map.setView(latlng,Math.max(map.getZoom(),12));}window.setBirthplacePoint=point=>showPoint(point,true);map.on('click',e=>{const point={latitude:e.latlng.lat,longitude:e.latlng.lng,source:'USER_MAP_TAP'};showPoint(point,false);window.ReactNativeWebView.postMessage(JSON.stringify(point))});setTimeout(()=>map.invalidateSize(),100);</script></body></html>`;
const Steps = ['Birth Date', 'Birth Time', 'Birthplace', 'Review & Create'];

export default function BirthDetailsScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const [account, setAccount] = useState(null); const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState(false); const [saving, setSaving] = useState(false);
  const [name, setName] = useState(''); const [gender, setGender] = useState('');
  const [day, setDay] = useState(''); const [month, setMonth] = useState(''); const [year, setYear] = useState('');
  const [certainty, setCertainty] = useState(''); const [hour, setHour] = useState(''); const [minute, setMinute] = useState(''); const [period, setPeriod] = useState('AM'); const [timePeriod, setTimePeriod] = useState('');
  const [villageCity, setVillageCity] = useState(''); const [district, setDistrict] = useState(''); const [region, setRegion] = useState(''); const [country, setCountry] = useState('India');
  const [mapPoint, setMapPoint] = useState(null); const [confirmedLocation, setConfirmedLocation] = useState(null);
  const [locationState, setLocationState] = useState('IDLE'); const [searching, setSearching] = useState(false); const [mapInteracting, setMapInteracting] = useState(false);
  const [consent, setConsent] = useState(false);
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
      if (draft.latitude != null && draft.longitude != null) {
        const point = { latitude: Number(draft.latitude), longitude: Number(draft.longitude) };
        setMapPoint(point); setConfirmedLocation({ ...point, source: 'MAP_CONFIRMED' }); setLocationState('CONFIRMED');
      }
    }).catch(() => setLoadError(true)).finally(() => setLoading(false));
  }, [loadAttempt]);

  const date = useMemo(() => canonicalDateFromParts(day, month, year), [day, month, year]);
  const clock = useMemo(() => canonicalTimeFrom12Hour(hour, minute, period), [hour, minute, period]);
  const time = timePayload(certainty, clock, timePeriod);
  const placeContextValid = Boolean(villageCity.trim() && region.trim() && country.trim());
  const placeValid = placeContextValid && validMapPoint(confirmedLocation);
  const validateStep = () => step === 0 ? Boolean(date && gender) : step === 1
    ? Boolean(certainty && (certainty === 'UNKNOWN' || (certainty === 'PERIOD_ONLY' ? timePeriod : clock)))
    : step === 2 ? placeValid : Boolean(consent);
  const next = () => validateStep() ? setStep(value => Math.min(3, value + 1))
    : Alert.alert('Complete this step', step === 2 ? 'Search or tap the map, then confirm the birthplace marker.' : 'Please complete the required details.');

  const showPointOnMap = point => mapRef.current?.injectJavaScript(`window.setBirthplacePoint(${JSON.stringify(point)});true;`);
  const searchPlace = async () => {
    if (searching || !date || !placeContextValid) return;
    setSearching(true); setConfirmedLocation(null); setLocationState('SEARCHING');
    try {
      const result = await searchBirthplace({ villageCity, district, state: region, country }, date);
      const point = { latitude: Number(result.location?.latitude), longitude: Number(result.location?.longitude), source: 'SEARCH_RESULT' };
      if (!validMapPoint(point)) throw new Error('BIRTHPLACE_UNRESOLVED');
      setMapPoint(point); setLocationState('FOUND'); showPointOnMap(point);
    } catch (error) {
      setLocationState(['BIRTHPLACE_UNRESOLVED', 'BIRTHPLACE_AMBIGUOUS'].includes(error?.code) ? 'NOT_FOUND' : 'FALLBACK');
    }
    finally { setSearching(false); }
  };
  const confirmBirthplace = () => {
    if (!placeContextValid || !validMapPoint(mapPoint)) return;
    setConfirmedLocation({ latitude: mapPoint.latitude, longitude: mapPoint.longitude, source: 'MAP_CONFIRMED' });
    setLocationState('CONFIRMED');
  };

  const submit = async () => {
    if (saving || !date || !placeValid || !consent) return;
    setSaving(true);
    try {
      const result = await saveAndPreparePrimaryKundli({ name, gender, dateOfBirth: date, ...time,
        birthplace: [villageCity, district, region, country].filter(Boolean).join(', '),
        birthplaceDetails: { villageCity, district, state: region, country },
        locationSelection: confirmedLocation,
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
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled" scrollEnabled={!mapInteracting} nestedScrollEnabled>
      <Text style={styles.eyebrow}>STEP {step + 1} OF 4</Text><Text style={styles.title}>{Steps[step]}</Text>
      {step === 0 && <View style={styles.card}><Text style={styles.copy}>Enter the date and profile details used for this Kundli.</Text>
        <Text style={styles.label}>Date of birth</Text><View style={styles.dateRow}><TextInput style={[styles.input, styles.dateShort]} value={day} onChangeText={v => setDay(v.replace(/\D/g, '').slice(0, 2))} placeholder="Day" keyboardType="number-pad" placeholderTextColor="#745D50" /><TextInput style={[styles.input, styles.dateShort]} value={year} onChangeText={v => setYear(v.replace(/\D/g, '').slice(0, 4))} placeholder="Year" keyboardType="number-pad" placeholderTextColor="#745D50" /></View>
        <View style={styles.wrap}>{MONTHS.map((label, index) => <TouchableOpacity key={label} style={[styles.choice, month === String(index + 1) && styles.choiceOn]} onPress={() => setMonth(String(index + 1))}><Text style={styles.choiceText}>{label.slice(0,3)}</Text></TouchableOpacity>)}</View>
        <Text style={styles.label}>Gender</Text><View style={styles.wrap}>{['male','female','other','prefer_not_to_say'].map(value => <TouchableOpacity key={value} style={[styles.choice, gender === value && styles.choiceOn]} onPress={() => setGender(value)}><Text style={styles.choiceText}>{value.replaceAll('_',' ')}</Text></TouchableOpacity>)}</View></View>}
      {step === 1 && <View style={styles.card}><Text style={styles.copy}>Choose what you actually know. No time will be guessed.</Text><View style={styles.stack}>{TIME_KNOWLEDGE.map(item => <TouchableOpacity key={item.value} style={[styles.option, certainty === item.value && styles.choiceOn]} onPress={() => { setCertainty(item.value); if (item.value !== 'PERIOD_ONLY') setTimePeriod(''); }}><Text style={styles.optionText}>{item.label}</Text></TouchableOpacity>)}</View>
        {['EXACT','APPROXIMATE'].includes(certainty) && <><Text style={styles.label}>{certainty === 'EXACT' ? 'Exact time' : 'Approximate time'}</Text><View style={styles.dateRow}><TextInput style={[styles.input, styles.time]} value={hour} onChangeText={v => setHour(v.replace(/\D/g,'').slice(0,2))} placeholder="Hour" keyboardType="number-pad" placeholderTextColor="#745D50" /><TextInput style={[styles.input, styles.time]} value={minute} onChangeText={v => setMinute(v.replace(/\D/g,'').slice(0,2))} placeholder="Minute" keyboardType="number-pad" placeholderTextColor="#745D50" />{['AM','PM'].map(v => <TouchableOpacity key={v} style={[styles.choice, period === v && styles.choiceOn]} onPress={() => setPeriod(v)}><Text style={styles.choiceText}>{v}</Text></TouchableOpacity>)}</View></>}
        {certainty === 'PERIOD_ONLY' && <View style={styles.wrap}>{TIME_PERIODS.map(([value,label]) => <TouchableOpacity key={value} style={[styles.option, timePeriod === value && styles.choiceOn]} onPress={() => setTimePeriod(value)}><Text style={styles.optionText}>{label}</Text></TouchableOpacity>)}</View>}
        {['PERIOD_ONLY','UNKNOWN'].includes(certainty) && <Text style={styles.note}>Some Kundli calculations require a clock time. Your known details can still be saved.</Text>}</View>}
      {step === 2 && <View style={styles.card}><Text style={styles.reviewTitle}>Search for birthplace</Text>
        {[['Village / Town / City',villageCity,setVillageCity],['District (optional)',district,setDistrict],['State',region,setRegion],['Country',country,setCountry]].map(([label,value,setter]) => <View key={label}><Text style={styles.label}>{label}</Text><TextInput style={styles.input} value={value} onChangeText={nextValue => { setter(nextValue); setConfirmedLocation(null); setLocationState('IDLE'); }} placeholder={label} placeholderTextColor="#745D50" /></View>)}
        <TouchableOpacity style={[styles.secondaryWide, (searching || !date || !placeContextValid) && styles.disabled]} disabled={searching || !date || !placeContextValid} onPress={searchPlace}>{searching ? <ActivityIndicator color="#F4A261" /> : <Text style={styles.secondaryText}>Search Location</Text>}</TouchableOpacity>
        {locationState === 'FOUND' && <Text style={styles.success}>Location found — confirm the marker is correct.</Text>}
        {locationState === 'NOT_FOUND' && <Text style={styles.note}>We couldn’t find an exact match. Check the details or select the exact birthplace on the map.</Text>}
        {locationState === 'FALLBACK' && <Text style={styles.note}>Couldn’t locate automatically. Select the exact birthplace on the map.</Text>}
        <Text style={[styles.copy, { marginTop: 16 }]}>Pan and zoom, then tap the exact birthplace. Use + or − if pinch zoom is difficult.</Text>
        <View style={styles.map} onTouchStart={() => setMapInteracting(true)} onTouchEnd={event => { if (!event.nativeEvent.touches?.length) setMapInteracting(false); }} onTouchCancel={() => setMapInteracting(false)}>
          <WebView ref={mapRef} source={{ html: MAP_HTML }} javaScriptEnabled nestedScrollEnabled scrollEnabled={false} androidLayerType="hardware" overScrollMode="never"
            originWhitelist={['*']} allowFileAccess={false} mixedContentMode="never" onLoadEnd={() => { if (validMapPoint(mapPoint)) showPointOnMap(mapPoint); }}
            onMessage={event => { try { const point=JSON.parse(event.nativeEvent.data); if (point.source === 'USER_MAP_TAP' && validMapPoint(point)) { setMapPoint(point); setConfirmedLocation(null); setLocationState('SELECTED'); } } catch {} }} />
        </View>
        {validMapPoint(mapPoint) && <><Text style={styles.success}>{locationState === 'CONFIRMED' ? 'Birthplace selected' : 'Marker selected — confirm this birthplace.'}</Text><Text style={styles.coordinate}>{mapPoint.latitude.toFixed(5)}, {mapPoint.longitude.toFixed(5)}</Text>
          {locationState !== 'CONFIRMED' && <TouchableOpacity style={styles.primary} onPress={confirmBirthplace}><Text style={styles.primaryText}>Confirm Birthplace</Text></TouchableOpacity>}</>}
      </View>}
      {step === 3 && <View style={styles.card}><Text style={styles.reviewTitle}>Review your birth details</Text><Review label="Date" value={date || 'Not entered'} /><Review label="Time" value={certainty === 'PERIOD_ONLY' ? TIME_PERIODS.find(([v]) => v === timePeriod)?.[1] : certainty === 'UNKNOWN' ? 'Unknown' : `${clock || ''} (${certainty.toLowerCase()})`} /><Review label="Birthplace" value={[villageCity,district,region,country].filter(Boolean).join(', ')} /><Review label="Location" value="Map marker confirmed" />
        <TouchableOpacity style={styles.consent} onPress={() => setConsent(v => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: consent }}><Text style={styles.consentText}>{consent ? '[x]' : '[ ]'} I consent to saving these birth details and using them to prepare my Kundli.</Text></TouchableOpacity>
        {!generationEligible(certainty, clock) && <Text style={styles.note}>Your details will be saved. A full Kundli will wait until a clock time is available.</Text>}
        <TouchableOpacity style={[styles.primary, (saving || !consent) && styles.disabled]} disabled={saving || !consent} onPress={confirmSubmit}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{generationEligible(certainty, clock) ? 'Create My Kundli' : 'Save Birth Details'}</Text>}</TouchableOpacity></View>}
      {step < 3 && <TouchableOpacity style={[styles.primary, !validateStep() && styles.disabled]} disabled={!validateStep()} onPress={next}><Text style={styles.primaryText}>Continue</Text></TouchableOpacity>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
function Review({ label, value }) { return <View style={styles.reviewRow}><Text style={styles.reviewLabel}>{label}</Text><Text style={styles.reviewValue}>{value}</Text></View>; }
const styles = StyleSheet.create({root:{flex:1,backgroundColor:'#0D0500'},center:{flex:1,backgroundColor:'#0D0500',alignItems:'center',justifyContent:'center',padding:24},header:{height:58,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:'rgba(244,162,97,.18)'},headerTouch:{width:52,height:48,alignItems:'center',justifyContent:'center'},back:{fontSize:34,color:'#F4A261'},headerTitle:{flex:1,textAlign:'center',fontSize:19,fontWeight:'900',color:'#FDF6ED'},progress:{flexDirection:'row',paddingHorizontal:30,paddingTop:14},progressItem:{flex:1,alignItems:'center'},dot:{width:9,height:9,borderRadius:5,backgroundColor:'#4A3327'},dotOn:{backgroundColor:'#E8620A'},progressText:{fontSize:10,color:'#745D50',marginTop:4},progressTextOn:{color:'#F4A261'},content:{padding:18},eyebrow:{color:'#F4A261',fontSize:12,fontWeight:'900',letterSpacing:1},title:{color:'#FDF6ED',fontSize:26,fontWeight:'900',marginTop:5,marginBottom:16},card:{backgroundColor:'#160A03',borderWidth:1,borderColor:'rgba(244,162,97,.2)',borderRadius:18,padding:17},copy:{color:'rgba(253,246,237,.65)',lineHeight:20,marginBottom:10},label:{color:'rgba(253,246,237,.65)',fontSize:13,fontWeight:'800',marginTop:13,marginBottom:7},input:{minHeight:50,borderWidth:1,borderColor:'rgba(244,162,97,.25)',borderRadius:12,paddingHorizontal:13,color:'#FDF6ED',backgroundColor:'#0D0500'},dateRow:{flexDirection:'row',gap:9,alignItems:'center'},dateShort:{flex:1},time:{flex:1},wrap:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:8},stack:{gap:8},choice:{minHeight:44,minWidth:52,paddingHorizontal:10,borderWidth:1,borderColor:'rgba(244,162,97,.24)',borderRadius:11,alignItems:'center',justifyContent:'center'},choiceOn:{backgroundColor:'rgba(232,98,10,.2)',borderColor:'#E8620A'},choiceText:{color:'#F4A261',fontWeight:'750',textTransform:'capitalize'},option:{minHeight:48,paddingHorizontal:13,borderWidth:1,borderColor:'rgba(244,162,97,.24)',borderRadius:12,justifyContent:'center'},optionText:{color:'#FDF6ED',fontWeight:'700'},note:{color:'#FFD18A',lineHeight:19,marginTop:13},success:{color:'#A7E8B0',fontWeight:'700',lineHeight:20,marginTop:13},coordinate:{color:'rgba(253,246,237,.48)',fontSize:12,marginTop:4},map:{height:310,borderRadius:14,overflow:'hidden',borderWidth:1,borderColor:'rgba(244,162,97,.28)'},reviewTitle:{color:'#F4A261',fontSize:18,fontWeight:'900',marginBottom:12},reviewRow:{paddingVertical:10,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,.06)'},reviewLabel:{color:'rgba(253,246,237,.52)',fontSize:12},reviewValue:{color:'#FDF6ED',fontWeight:'700',marginTop:3},consent:{minHeight:52,justifyContent:'center',marginTop:12},consentText:{color:'#FDF6ED',lineHeight:20},primary:{minHeight:53,borderRadius:14,backgroundColor:'#E8620A',alignItems:'center',justifyContent:'center',marginTop:18},primaryText:{color:'#fff',fontWeight:'900',fontSize:16},secondaryWide:{minHeight:50,borderRadius:13,borderWidth:1,borderColor:'#F4A261',alignItems:'center',justifyContent:'center',marginTop:16},secondaryText:{color:'#F4A261',fontWeight:'900'},disabled:{opacity:.45}});
