import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generatePrimaryKundli, restoreAccountLifecycle, saveAccountOnboarding } from '../utils/accountLifecycle';

const CERTAINTIES = ['EXACT', 'APPROXIMATE', 'UNCERTAIN', 'UNKNOWN'];

export default function BirthDetailsScreen() {
  const insets = useSafeAreaInsets();
  const [account, setAccount] = useState(null);
  const [dob, setDob] = useState(''); const [time, setTime] = useState('');
  const [place, setPlace] = useState(''); const [certainty, setCertainty] = useState('');
  const [saving, setSaving] = useState(false); const [loading, setLoading] = useState(true);
  useEffect(() => { restoreAccountLifecycle().then(result => {
    setAccount(result); setDob(result.birthProfile?.date_of_birth || '');
    setTime(String(result.birthProfile?.birth_time || '').slice(0, 5));
    setPlace(result.birthProfile?.birthplace_input || result.birthProfile?.place_name || '');
    setCertainty(result.birthProfile?.birth_time_certainty || '');
  }).catch(() => Alert.alert('Error', 'Could not load birth details.')).finally(() => setLoading(false)); }, []);
  const confirmSave = () => Alert.alert('Regenerate Kundli',
    'Changing birth details will invalidate and regenerate your Kundli. Continue?', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Continue', style: 'destructive', onPress: save },
    ]);
  const save = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || !place.trim() || !CERTAINTIES.includes(certainty)
      || (certainty !== 'UNKNOWN' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) {
      Alert.alert('Check details', 'Enter a YYYY-MM-DD date, birthplace, certainty and a valid HH:mm time when known.'); return;
    }
    setSaving(true);
    try {
      await saveAccountOnboarding({ name: account.profile.name, gender: account.profile.gender,
        dateOfBirth: dob, birthTime: certainty === 'UNKNOWN' ? null : time,
        birthTimeCertainty: certainty, birthplace: place.trim(), language: account.profile.language,
        interests: account.profile.interests || [], birthDataConsent: true, confirmBirthProfileChange: true });
      if (certainty !== 'UNKNOWN') await generatePrimaryKundli();
      router.replace('/my_kundli');
    } catch (e) {
      const code = e.code || e.message;
      const correction = code === 'BIRTHPLACE_UNRESOLVED' || code === 'BIRTHPLACE_TIMEZONE_UNRESOLVED';
      Alert.alert('Could not update', correction ? 'Birthplace or historical timezone could not be resolved safely. Please provide a more specific place.' : 'Your details were not changed. Please try again.');
    } finally { setSaving(false); }
  };
  if (loading) return <View style={styles.center}><ActivityIndicator color="#F4A261" /></View>;
  return <View style={[styles.root,{paddingTop:insets.top}]}><View style={styles.header}><TouchableOpacity style={styles.backTouch} onPress={() => router.back()}><Text style={styles.back}>‹</Text></TouchableOpacity><Text style={styles.title}>Birth Details</Text><View style={styles.backTouch}/></View>
    <ScrollView contentContainerStyle={[styles.content,{paddingBottom:insets.bottom+30}]} keyboardShouldPersistTaps="handled">
      <Text style={styles.notice}>These details are natal data, not your current location. Saving changes creates a new birth-profile version and invalidates the previous authoritative Kundli.</Text>
      <Text style={styles.label}>Date of birth (YYYY-MM-DD)</Text><TextInput style={styles.input} value={dob} onChangeText={setDob} placeholder="1990-01-31" placeholderTextColor="#745D50" />
      <Text style={styles.label}>Birth-time certainty</Text><View style={styles.options}>{CERTAINTIES.map(item => <TouchableOpacity key={item} style={[styles.option,certainty===item&&styles.optionOn]} onPress={() => {setCertainty(item);if(item==='UNKNOWN')setTime('');}}><Text style={[styles.optionText,certainty===item&&styles.optionTextOn]}>{item}</Text></TouchableOpacity>)}</View>
      {certainty !== 'UNKNOWN' && <><Text style={styles.label}>Birth time (HH:mm)</Text><TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="14:30" placeholderTextColor="#745D50" keyboardType="numbers-and-punctuation" /></>}
      <Text style={styles.label}>Birthplace</Text><TextInput style={styles.input} value={place} onChangeText={setPlace} placeholder="City, State, Country" placeholderTextColor="#745D50" />
      {certainty !== 'EXACT' && <Text style={styles.warning}>{certainty === 'UNKNOWN' ? 'Without birth time, no authoritative Lagna, houses, Vargas or precise Dasha timing will be generated.' : 'The saved uncertainty will remain visible in all downstream Jyotish interpretation.'}</Text>}
      <TouchableOpacity style={[styles.save,saving&&styles.disabled]} disabled={saving} onPress={confirmSave}>{saving?<ActivityIndicator color="#fff"/>:<Text style={styles.saveText}>Save and regenerate</Text>}</TouchableOpacity>
    </ScrollView></View>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:'#0D0500'},center:{flex:1,backgroundColor:'#0D0500',alignItems:'center',justifyContent:'center'},header:{height:58,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:'rgba(244,162,97,.18)'},backTouch:{width:52,height:48,alignItems:'center',justifyContent:'center'},back:{fontSize:34,color:'#F4A261'},title:{flex:1,textAlign:'center',color:'#FDF6ED',fontSize:19,fontWeight:'800'},content:{padding:18},notice:{color:'#FFD18A',lineHeight:20,backgroundColor:'rgba(255,183,77,.08)',padding:14,borderRadius:12,marginBottom:18},label:{color:'rgba(253,246,237,.62)',fontSize:12,fontWeight:'700',marginTop:14,marginBottom:7},input:{minHeight:48,borderWidth:1,borderColor:'rgba(244,162,97,.25)',borderRadius:12,paddingHorizontal:14,color:'#FDF6ED',backgroundColor:'#160A03'},options:{flexDirection:'row',flexWrap:'wrap',gap:8},option:{minHeight:44,paddingHorizontal:12,borderRadius:11,borderWidth:1,borderColor:'rgba(244,162,97,.22)',alignItems:'center',justifyContent:'center'},optionOn:{backgroundColor:'rgba(232,98,10,.18)',borderColor:'#E8620A'},optionText:{color:'rgba(253,246,237,.55)',fontSize:12,fontWeight:'700'},optionTextOn:{color:'#F4A261'},warning:{color:'#FFD18A',lineHeight:19,marginTop:14},save:{minHeight:50,borderRadius:14,backgroundColor:'#E8620A',alignItems:'center',justifyContent:'center',marginTop:24},disabled:{opacity:.6},saveText:{color:'#fff',fontWeight:'800'}});
