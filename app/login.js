import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { restoreAccountLifecycle } from '../utils/accountLifecycle';
import { getUserFromBackend, registerUserToBackend } from '../utils/register_backend';
import { supabase } from '../utils/supabase';

let Notifications = null;
if (Constants.appOwnership !== 'expo') Notifications = require('expo-notifications');
const OTP_COOLDOWN_SEC = 60;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const mounted = useRef(true); const sending = useRef(false); const pendingPhone = useRef('');
  const timer = useRef(null);
  const [step, setStep] = useState('loading');
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false); const [cooldown, setCooldown] = useState(0);

  // Session restoration must run once; retries are explicit from the load-error state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { restoreSession(); return () => { mounted.current = false; if (timer.current) clearInterval(timer.current); }; }, []);

  const cacheAndEnter = async (profile, authUserId, localPhone) => {
    await AsyncStorage.setItem('dharmasetu_user', JSON.stringify({ ...profile, phone: localPhone, auth_user_id: authUserId }));
    if (mounted.current) router.replace('/(tabs)');
  };
  const restoreSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) { if (mounted.current) setStep('name'); return; }
      const user = data.session.user; const localPhone = String(user.phone || '').replace(/^\+91/, '');
      const account = await restoreAccountLifecycle();
      if (account.profile) return cacheAndEnter(account.profile, user.id, localPhone);
      if (mounted.current) setStep('name');
    } catch { if (mounted.current) setStep('load_error'); }
  };
  const startCooldown = () => {
    if (timer.current) clearInterval(timer.current);
    setCooldown(OTP_COOLDOWN_SEC);
    timer.current = setInterval(() => setCooldown(value => {
      if (value <= 1) { clearInterval(timer.current); timer.current = null; return 0; }
      return value - 1;
    }), 1000);
  };
  const sendOtp = async () => {
    if (sending.current || loading || !/^[6-9]\d{9}$/.test(phone)) return;
    sending.current = true; setLoading(true);
    try {
      const fullPhone = `+91${phone}`; const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (error) throw error;
      pendingPhone.current = fullPhone; setOtp(''); setStep('otp'); startCooldown();
    } catch { Alert.alert('Could not send OTP', 'Check the number and your connection, then try again.'); }
    finally { sending.current = false; if (mounted.current) setLoading(false); }
  };
  const getPushToken = async () => {
    if (!Device.isDevice || !Notifications || process.env.EXPO_PUBLIC_REMOTE_PUSH_ENABLED !== 'true') return '';
    try {
      const permission = await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted') return '';
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
      return (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : {})).data;
    } catch { return ''; }
  };
  const verifyOtp = async () => {
    if (loading || otp.length !== 6 || !pendingPhone.current) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone: pendingPhone.current, token: otp, type: 'sms' });
      if (error || !data.user?.id) throw error || new Error('AUTH_REQUIRED');
      const localPhone = pendingPhone.current.replace(/^\+91/, '');
      const account = await restoreAccountLifecycle();
      if (account.profile) return await cacheAndEnter(account.profile, data.user.id, localPhone);
      const existing = await getUserFromBackend(localPhone);
      if (existing) return await cacheAndEnter(existing, data.user.id, localPhone);
      if (!name.trim()) { setStep('name'); throw new Error('NAME_REQUIRED'); }
      const registered = await registerUserToBackend({ name: name.trim(), phone: localPhone,
        language: 'hindi', authUserId: data.user.id, pushToken: await getPushToken() });
      await cacheAndEnter(registered?.user || { name: name.trim(), language: 'hindi' }, data.user.id, localPhone);
    } catch (error) {
      Alert.alert(error?.message === 'NAME_REQUIRED' ? 'Name required' : 'Could not verify OTP',
        error?.message === 'NAME_REQUIRED' ? 'Enter your name to finish creating your account.' : 'The OTP may be invalid or expired. Please try again.');
    } finally { if (mounted.current) setLoading(false); }
  };

  if (step === 'loading') return <View style={[styles.root, styles.center, { paddingTop: insets.top }]}><ActivityIndicator color="#E8620A" size="large" /></View>;
  if (step === 'load_error') return <View style={[styles.root, styles.center, { paddingTop: insets.top, paddingHorizontal: 24 }]}>
    <Text style={styles.title}>Could not load your account</Text>
    <Text style={[styles.copy, { textAlign: 'center' }]}>Check your connection and retry. Your existing account will not be replaced.</Text>
    <TouchableOpacity style={[styles.primary, { alignSelf: 'stretch' }]} onPress={() => { setStep('loading'); restoreSession(); }}><Text style={styles.primaryText}>Retry</Text></TouchableOpacity>
  </View>;
  return <View style={[styles.root, { paddingTop: insets.top }]}><StatusBar style="light" />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.symbol}>🕉</Text><Text style={styles.brand}>DharmaSetu</Text><Text style={styles.tag}>Bridge to Sanatan Dharma</Text>
        <View style={styles.card}>
          {step === 'name' && <><Text style={styles.eyebrow}>CREATE YOUR ACCOUNT</Text><Text style={styles.title}>What should we call you?</Text>
            <Text style={styles.copy}>Your Kundli is optional and can be created later from Home.</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#745D50" autoFocus accessibilityLabel="Name" />
            <TouchableOpacity style={[styles.primary, !name.trim() && styles.disabled]} disabled={!name.trim()} onPress={() => setStep('phone')}><Text style={styles.primaryText}>Continue</Text></TouchableOpacity>
            <TouchableOpacity style={styles.link} onPress={() => { setName(''); setStep('phone'); }}><Text style={styles.linkText}>Already have an account? Log in</Text></TouchableOpacity></>}
          {step === 'phone' && <><Text style={styles.eyebrow}>PHONE VERIFICATION</Text><Text style={styles.title}>Enter your mobile number</Text><Text style={styles.copy}>We’ll send a secure one-time password.</Text>
            <View style={styles.phoneRow}><Text style={styles.code}>+91</Text><TextInput style={[styles.input, { flex: 1 }]} value={phone} onChangeText={v => setPhone(v.replace(/\D/g, '').slice(0, 10))} keyboardType="phone-pad" placeholder="10-digit number" placeholderTextColor="#745D50" autoFocus /></View>
            <TouchableOpacity style={[styles.primary, (loading || phone.length !== 10) && styles.disabled]} disabled={loading || phone.length !== 10} onPress={sendOtp}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Get OTP</Text>}</TouchableOpacity>
            <TouchableOpacity style={styles.link} onPress={() => setStep('name')}><Text style={styles.linkText}>Back</Text></TouchableOpacity></>}
          {step === 'otp' && <><Text style={styles.eyebrow}>FINAL STEP</Text><Text style={styles.title}>Enter the OTP</Text><Text style={styles.copy}>Sent to +91 {phone}</Text>
            <TextInput style={[styles.input, styles.otp]} value={otp} onChangeText={v => setOtp(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} autoFocus editable={!loading} />
            <TouchableOpacity style={[styles.primary, (loading || otp.length !== 6) && styles.disabled]} disabled={loading || otp.length !== 6} onPress={verifyOtp}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Verify & Enter</Text>}</TouchableOpacity>
            <TouchableOpacity style={styles.link} disabled={cooldown > 0 || loading} onPress={sendOtp}><Text style={styles.linkText}>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}</Text></TouchableOpacity></>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </View>;
}
const styles = StyleSheet.create({root:{flex:1,backgroundColor:'#0D0500'},center:{alignItems:'center',justifyContent:'center'},scroll:{flexGrow:1,justifyContent:'center',padding:22,paddingBottom:42},symbol:{fontSize:50,textAlign:'center'},brand:{fontSize:30,fontWeight:'900',color:'#FDF6ED',textAlign:'center'},tag:{color:'#F4A261',textAlign:'center',marginTop:4,marginBottom:26},card:{backgroundColor:'#160A03',borderWidth:1,borderColor:'rgba(244,162,97,.22)',borderRadius:20,padding:20},eyebrow:{color:'#F4A261',fontWeight:'800',fontSize:12,letterSpacing:1.2},title:{color:'#FDF6ED',fontSize:24,fontWeight:'900',marginTop:8},copy:{color:'rgba(253,246,237,.64)',lineHeight:20,marginTop:8,marginBottom:18},input:{minHeight:52,borderRadius:13,borderWidth:1,borderColor:'rgba(244,162,97,.3)',backgroundColor:'#0D0500',color:'#FDF6ED',paddingHorizontal:15,fontSize:16},phoneRow:{flexDirection:'row',alignItems:'center',gap:10},code:{color:'#FDF6ED',fontWeight:'800',fontSize:16},otp:{fontSize:25,textAlign:'center',letterSpacing:8},primary:{minHeight:52,borderRadius:14,backgroundColor:'#E8620A',alignItems:'center',justifyContent:'center',marginTop:18},disabled:{opacity:.45},primaryText:{color:'#fff',fontWeight:'900',fontSize:16},link:{minHeight:48,alignItems:'center',justifyContent:'center',marginTop:6},linkText:{color:'#F4A261',fontWeight:'700'}});
