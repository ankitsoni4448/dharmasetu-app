// DharmaSetu — Login — FIXED v6
// Fixes applied:
//  1. await verifyAndSave() — was missing await, caused race condition
//  2. OTP resend with 60-sec cooldown timer
//  3. OTP send/verify loading guards — prevents multiple parallel requests
//  4. isSendingRef lock — stops duplicate Firebase OTP requests
//  5. RecaptchaVerifier — attempt-stable, fallback error handling
//  6. checkSession guards against re-render loop via isMountedRef
//  7. verifyAndSave wrapped in try/finally — loading always cleared

import { getAuth, signInWithPhoneNumber } from "firebase/auth";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { app } from "./utils/firebase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerUserToBackend, getUserFromBackend } from './register_backend';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ── KUNDLI DATA ──────────────────────────────────────────────────────
const RASHIS = ['Mesh','Vrishabh','Mithun','Kark','Simha','Kanya','Tula','Vrishchik','Dhanu','Makar','Kumbh','Meen'];
const RASHI_ENG = { Mesh:'Aries',Vrishabh:'Taurus',Mithun:'Gemini',Kark:'Cancer',Simha:'Leo',Kanya:'Virgo',Tula:'Libra',Vrishchik:'Scorpio',Dhanu:'Sagittarius',Makar:'Capricorn',Kumbh:'Aquarius',Meen:'Pisces' };
const RASHI_DATA = {
  Mesh:      {planet:'Mangal (Mars)',   deity:'Hanuman Ji',    mantra:'ॐ अं अंगारकाय नमः',   color:'Red',          day:'Tuesday',   gem:'Red Coral'},
  Vrishabh:  {planet:'Shukra (Venus)',  deity:'Lakshmi Mata',  mantra:'ॐ शुं शुक्राय नमः',   color:'White/Pink',   day:'Friday',    gem:'Diamond'},
  Mithun:    {planet:'Budh (Mercury)',  deity:'Ganesh Ji',     mantra:'ॐ बुं बुधाय नमः',     color:'Green',        day:'Wednesday', gem:'Emerald'},
  Kark:      {planet:'Chandra (Moon)',  deity:'Shiva Ji',      mantra:'ॐ सों सोमाय नमः',     color:'White/Silver', day:'Monday',    gem:'Pearl'},
  Simha:     {planet:'Surya (Sun)',     deity:'Surya Dev',     mantra:'ॐ घृणि सूर्याय नमः',  color:'Gold/Orange',  day:'Sunday',    gem:'Ruby'},
  Kanya:     {planet:'Budh (Mercury)',  deity:'Saraswati Mata',mantra:'ॐ बुं बुधाय नमः',     color:'Green',        day:'Wednesday', gem:'Emerald'},
  Tula:      {planet:'Shukra (Venus)',  deity:'Lakshmi Mata',  mantra:'ॐ शुं शुक्राय नमः',   color:'White/Blue',   day:'Friday',    gem:'Diamond'},
  Vrishchik: {planet:'Mangal (Mars)',   deity:'Hanuman Ji',    mantra:'ॐ अं अंगारकाय नमः',   color:'Red/Maroon',   day:'Tuesday',   gem:'Red Coral'},
  Dhanu:     {planet:'Guru (Jupiter)',  deity:'Vishnu Ji',     mantra:'ॐ बृं बृहस्पतये नमः', color:'Yellow',       day:'Thursday',  gem:'Yellow Sapphire'},
  Makar:     {planet:'Shani (Saturn)',  deity:'Shani Dev',     mantra:'ॐ शं शनैश्चराय नमः',  color:'Black/Blue',   day:'Saturday',  gem:'Blue Sapphire'},
  Kumbh:     {planet:'Shani (Saturn)',  deity:'Shiva Ji',      mantra:'ॐ शं शनैश्चराय नमः',  color:'Sky Blue',     day:'Saturday',  gem:'Blue Sapphire'},
  Meen:      {planet:'Guru (Jupiter)',  deity:'Vishnu Ji',     mantra:'ॐ बृं बृहस्पतये नमः', color:'Yellow/Cream', day:'Thursday',  gem:'Yellow Sapphire'},
};
const NAKSHATRA_BY_RASHI = {
  Mesh:['Ashwini','Bharani','Krittika (1)'],Vrishabh:['Krittika (2,3,4)','Rohini','Mrigashira (1,2)'],
  Mithun:['Mrigashira (3,4)','Ardra','Punarvasu (1,2,3)'],Kark:['Punarvasu (4)','Pushya','Ashlesha'],
  Simha:['Magha','Purva Phalguni','Uttara Phalguni (1)'],Kanya:['Uttara Phalguni (2,3,4)','Hasta','Chitra (1,2)'],
  Tula:['Chitra (3,4)','Swati','Vishakha (1,2,3)'],Vrishchik:['Vishakha (4)','Anuradha','Jyeshtha'],
  Dhanu:['Mula','Purva Ashadha','Uttara Ashadha (1)'],Makar:['Uttara Ashadha (2,3,4)','Shravana','Dhanishtha (1,2)'],
  Kumbh:['Dhanishtha (3,4)','Shatabhisha','Purva Bhadrapada (1,2,3)'],Meen:['Purva Bhadrapada (4)','Uttara Bhadrapada','Revati'],
};

function calculateRashi(day, month, year) {
  const d=parseInt(day,10), m=parseInt(month,10), y=parseInt(year,10);
  const base = [9,9,10,11,12,1,2,3,4,5,6,7];
  let idx = (base[(m-1)] + Math.floor(d/15) + (y%12)%3) % 12;
  return RASHIS[Math.max(0,idx)];
}

function getLagna(timeSlot, exactTime) {
  if (exactTime) {
    const h = parseInt(exactTime.split(':')[0]||'0',10);
    if(h>=4&&h<6)  return 'Mesh (Aries)';
    if(h>=6&&h<10) return 'Mithun (Gemini)';
    if(h>=10&&h<14)return 'Kark (Cancer)';
    if(h>=14&&h<18)return 'Tula (Libra)';
    if(h>=18&&h<22)return 'Makar (Capricorn)';
    return 'Kumbh (Aquarius)';
  }
  const m={early_morning:'Mesh (Aries)',morning:'Mithun (Gemini)',afternoon:'Kark (Cancer)',evening:'Tula (Libra)',night:'Makar (Capricorn)',late_night:'Kumbh (Aquarius)'};
  return m[timeSlot]||'Kark (Cancer)';
}

const TIME_SLOTS = [
  {id:'early_morning',hi:'ब्रह्म मुहूर्त (4–6 AM)',en:'Brahma Muhurta (4–6 AM)'},
  {id:'morning',      hi:'सुबह (6 AM – 12 PM)',   en:'Morning (6 AM – 12 PM)'},
  {id:'afternoon',    hi:'दोपहर (12–3 PM)',        en:'Afternoon (12–3 PM)'},
  {id:'evening',      hi:'शाम (3–6 PM)',           en:'Evening (3–6 PM)'},
  {id:'night',        hi:'रात (6–10 PM)',          en:'Night (6–10 PM)'},
  {id:'late_night',   hi:'देर रात (10 PM–4 AM)',  en:'Late Night (10 PM–4 AM)'},
];

// ── LABELS ───────────────────────────────────────────────────────────
const L = {
  hi:{
    s1t:'आपका नाम',s1p:'पूरा नाम लिखें',
    s2t:'जन्म तिथि',s2s:'कुंडली बनाने के लिए',s2dd:'दिन',s2mm:'माह',s2yy:'वर्ष',
    s2time:'जन्म का समय',s2timeSub:'अगर सटीक समय नहीं पता तो नजदीकी चुनें',
    s2know:'मुझे सटीक समय पता है',s2exact:'सटीक समय (HH:MM)',s2exactP:'जैसे: 14:30',
    s2slot:'समय का अनुमान लगाएं',
    s3t:'जन्म स्थान',s3p:'शहर / कस्बे का नाम',
    s4t:'भाषा चुनें',s4s:'App इसी भाषा में चलेगा',
    s5t:'मोबाइल नंबर',s5s:'OTP verification के लिए',
    s6t:'OTP दर्ज करें',s6s:'आपके नंबर पर भेजा गया',
    next:'आगे बढ़ें →',getOTP:'OTP प्राप्त करें',verify:'OTP Verify करें',
    enter:'DharmaSetu में प्रवेश करें 🙏',back:'← वापस',change:'← नंबर बदलें',
    req:'यह जानकारी जरूरी है।',reqTime:'जन्म का समय चुनें या दर्ज करें।',
    wrongOTP:'गलत OTP। दोबारा कोशिश करें।',
    otpTitle:'OTP भेजा गया',otpBody:'Testing mode — OTP terminal में देखें',
    resend:'OTP दोबारा भेजें',resendIn:'OTP दोबारा भेजें (',resendSec:' सेकंड में)',
    of:'में से',
  },
  en:{
    s1t:'Your Name',s1p:'Enter your full name',
    s2t:'Date of Birth',s2s:'Required to create your Kundli',s2dd:'Day',s2mm:'Month',s2yy:'Year',
    s2time:'Time of Birth',s2timeSub:'Choose approximate if exact time is unknown',
    s2know:'I know the exact time',s2exact:'Exact time (HH:MM)',s2exactP:'e.g. 14:30',
    s2slot:'Choose approximate time',
    s3t:'Birth Place',s3p:'City or town name',
    s4t:'Choose Language',s4s:'App will use this language throughout',
    s5t:'Mobile Number',s5s:'For OTP verification',
    s6t:'Enter OTP',s6s:'Sent to your number',
    next:'Continue →',getOTP:'Get OTP',verify:'Verify OTP',
    enter:'Enter DharmaSetu 🙏',back:'← Back',change:'← Change number',
    req:'This field is required.',reqTime:'Please select or enter birth time.',
    wrongOTP:'Wrong OTP. Please try again.',
    otpTitle:'OTP Sent',otpBody:'Testing mode — check terminal for OTP',
    resend:'Resend OTP',resendIn:'Resend OTP in (',resendSec:'s)',
    of:'of',
  },
};

// OTP resend cooldown in seconds
const OTP_COOLDOWN_SEC = 60;

// ════════════════════════════════════════════════════════
export default function LoginScreen() {
  const auth = getAuth(app);
  const recaptchaVerifier = useRef(null);

  // FIX: isMountedRef prevents setState after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // FIX: isSendingRef — hard lock to prevent multiple simultaneous OTP requests
  const isSendingRef = useRef(false);

  const [confirmation, setConfirmation] = useState(null);
  const insets = useSafeAreaInsets();
  const [ui, setUi] = useState('hi');
  const [step, setStep] = useState(-1);

  // FIX: unified loading state covers both sendOTP and verifyOTP operations
  const [loading, setLoading] = useState(false);

  // FIX: OTP resend cooldown state
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendTimerRef = useRef(null);

  // Form state
  const [name, setName] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [timeMode, setTimeMode] = useState('slot');
  const [timeSlot, setTimeSlot] = useState('');
  const [exactTime, setExactTime] = useState('');
  const [birthCity, setBirthCity] = useState('');
  const [lang, setLang] = useState('hindi');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  const t = L[ui];

  useEffect(() => { checkSession(); }, []);

  // FIX: clear resend timer on unmount
  useEffect(() => {
    return () => {
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    };
  }, []);

  const anim = () => {
    fade.setValue(0); slide.setValue(20);
    Animated.parallel([
      Animated.timing(fade,{toValue:1,duration:300,useNativeDriver:true}),
      Animated.timing(slide,{toValue:0,duration:300,useNativeDriver:true}),
    ]).start();
  };
  useEffect(() => { if(step>=0) anim(); }, [step]);

  const checkSession = async () => {
    try {
      const raw = await AsyncStorage.getItem('dharmasetu_user');
      if(raw) {
        let u;
try {
  u = JSON.parse(raw);
} catch {
  await AsyncStorage.removeItem('dharmasetu_user');
  return;
}
        if(u?.name && u?.rashi && u?.phone) {
          if (isMountedRef.current) router.replace('/(tabs)');
          return;
        }
      }
    } catch {}
    if (isMountedRef.current) setStep(0);
  };

  const validate = () => {
    const errs = { 0:!name.trim(), 2:!birthCity.trim() };
    if(errs[step]) { Alert.alert('',t.req); return false; }
    if(step===1) {
      if(!dobDay||!dobMonth||!dobYear||dobYear.length<4) { Alert.alert('',t.req); return false; }
      if(timeMode==='slot'&&!timeSlot) { Alert.alert('',t.reqTime); return false; }
      if(timeMode==='exact'&&!exactTime) { Alert.alert('',t.reqTime); return false; }
    }
    return true;
  };

  // FIX: starts the 60-second resend countdown
  const startResendTimer = () => {
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    if (isMountedRef.current) setResendCooldown(OTP_COOLDOWN_SEC);
    resendTimerRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(resendTimerRef.current);
          resendTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // FIX: sendOTP — guarded by isSendingRef + loading state + RecaptchaVerifier null check
  const sendOTP = async (fullPhone) => {
    // Guard: prevent multiple simultaneous requests
    if (isSendingRef.current || loading) return;
    if (!Device.isDevice) {
  Alert.alert("Error", "OTP works only on real device");
  return;
}
    if (!recaptchaVerifier.current) {
      Alert.alert('Error', 'Security check not ready. Please wait and try again.');
      return;
    }
    isSendingRef.current = true;
    if (isMountedRef.current) setLoading(true);
    try {
      const result = await signInWithPhoneNumber(auth, fullPhone, recaptchaVerifier.current);
      if (isMountedRef.current) {
        setConfirmation(result);
        setStep(5);
        setOtp('');
        startResendTimer();
        Alert.alert(t.otpTitle, t.otpBody);
      }
    } catch (err) {
      console.log('[Login] sendOTP error:', err.code, err.message);
      const msg = err.code === 'auth/invalid-phone-number'
        ? 'Invalid phone number. Check and try again.'
        : err.code === 'auth/too-many-requests'
        ? 'Too many attempts. Please wait a few minutes.'
        : 'Failed to send OTP. Check your connection and try again.';
      if (isMountedRef.current) Alert.alert('Error', msg);
    } finally {
      isSendingRef.current = false;
      if (isMountedRef.current) setLoading(false);
    }
  };

  // FIX: resendOTP — only callable when cooldown is 0
  const resendOTP = async () => {
    if (resendCooldown > 0 || loading) return;
    setConfirmation(null);
    const formattedPhone = '+91' + phone.trim();
    await sendOTP(formattedPhone);
  };

  // FIX: verifyOTP — properly awaits verifyAndSave, loading guard, error handling
  const verifyOTP = async () => {
    if (loading) return;
    if (!confirmation) return;
    if (otp.length < 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit OTP.');
      return;
    }
    if (isMountedRef.current) setLoading(true);
    try {
      await confirmation.confirm(otp);
      // FIX: was missing await — caused race condition where navigation
      // could fire before user data was saved to AsyncStorage
      await verifyAndSave();
    } catch (err) {
      console.log('[Login] verifyOTP error:', err.code, err.message);
      const msg = err.code === 'auth/invalid-verification-code'
        ? t.wrongOTP
        : 'OTP verification failed. Please try again.';
      if (isMountedRef.current) {
        Alert.alert('Error', msg);
        setLoading(false);
      }
    }
    // Note: loading is cleared inside verifyAndSave's finally block
  };

  // FIX: verifyAndSave — wrapped in try/finally so loading is always cleared
  const verifyAndSave = async () => {
    try {
      // Get push token
      let pushToken = '';
      if (Device.isDevice) {
        try {
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }
          if (finalStatus === 'granted') {
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId || null;
            const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : {});
            pushToken = tokenData.data;
          }
        } catch (e) { console.log('[Login] Push token err:', e); }
      }

      // Returning user restore — check backend first
      const backendUser = await getUserFromBackend(phone);
      if (backendUser) {
        backendUser.pushToken = pushToken;
        // Update backend with latest token + UID (non-blocking)
        try {
  await registerUserToBackend({
    ...userData,
    firebaseUid: auth.currentUser?.uid || '',
  });
} catch (e) {
  console.log('[Login] Backend register failed:', e);
}

        await AsyncStorage.setItem('dharmasetu_user', JSON.stringify(backendUser));
        if (isMountedRef.current) router.replace('/(tabs)');
        return;
      }

      // New user — build kundli
      const rashi = calculateRashi(dobDay, dobMonth, dobYear);
      const naks = NAKSHATRA_BY_RASHI[rashi] || ['Ashwini'];
      const nakshatra = naks[Math.floor(Math.random() * naks.length)];
      const lagna = getLagna(timeSlot, timeMode === 'exact' ? exactTime : '');
      const rd = RASHI_DATA[rashi];
      const userData = {
        name: name.trim(), phone,
        dob: `${dobDay}/${dobMonth}/${dobYear}`,
        dobDay, dobMonth, dobYear,
        timeMode, timeSlot, exactTime,
        birthCity: birthCity.trim(), language: lang,
        rashi, rashiEng: RASHI_ENG[rashi], nakshatra, lagna,
        planet: rd.planet, deity: rd.deity, mantra: rd.mantra,
        luckyColor: rd.color, luckyDay: rd.day, luckyGem: rd.gem,
        role: 'jigyasu', pts: 0, streak: 0,
        createdAt: new Date().toISOString(),
        pushToken,
      };
      await AsyncStorage.setItem('dharmasetu_user', JSON.stringify(userData));
      await AsyncStorage.setItem(`ds_acc_${phone}`, JSON.stringify(userData));
      await AsyncStorage.setItem('dharmasetu_pts', '0');
      await AsyncStorage.setItem('dharmasetu_streak_count', '0');

      // Non-blocking backend registration
      registerUserToBackend({
        ...userData,
        firebaseUid: auth.currentUser?.uid || '',
      }).catch(e => console.log('[Login] Backend register error:', e));

      if (isMountedRef.current) router.replace('/(tabs)');
    } catch (err) {
      console.log('[Login] verifyAndSave error:', err.message);
      if (isMountedRef.current) Alert.alert('Error', 'Could not save your profile. Please try again.');
    } finally {
      // FIX: always clear loading regardless of success or failure
      if (isMountedRef.current) setLoading(false);
    }
  };

  if(step===-1) return(
    <View style={[s.root,{alignItems:'center',justifyContent:'center'}]}>
      <Text style={{fontSize:52}}>🕉</Text>
      <ActivityIndicator color="#E8620A" style={{marginTop:18}}/>
    </View>
  );

  const pct = Math.round((Math.min(step,5)/5)*100);

  return(
    <View style={[s.root,{paddingTop:insets.top}]}>
      {/* FIX: FirebaseRecaptchaVerifierModal must be in the render tree at all times
          attemptInvisibleVerification=false is more stable on Android/Expo */}
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={app.options}
        attemptInvisibleVerification={false}
      />
      <StatusBar style="light" backgroundColor="#0D0500"/>
      {/* UI lang toggle */}
      <View style={s.topBar}>
        {[{id:'hi',l:'हिं'},{id:'en',l:'EN'}].map(({id,l})=>(
          <TouchableOpacity key={id} style={[s.uiBtn,ui===id&&s.uiBtnOn]} onPress={()=>setUi(id)}>
            <Text style={[s.uiBtnTxt,ui===id&&s.uiBtnTxtOn]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Progress */}
      <View style={s.prog}><View style={[s.progFill,{width:`${pct}%`}]}/></View>

      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View style={{opacity:fade,transform:[{translateY:slide}]}}>

            {/* LOGO */}
            <View style={s.logo}>
              <Text style={{fontSize:50}}>🕉</Text>
              <Text style={s.brand}>DharmaSetu</Text>
              <Text style={s.tag}>{ui==='hi'?'सनातन धर्म का मार्गदर्शक':'Bridge to Sanatan Dharma'}</Text>
            </View>

            {/* ── STEP 0: NAME ── */}
            {step===0&&(
              <View style={s.card}>
                <Text style={s.stepNum}>1 {t.of} 5</Text>
                <Text style={s.cTitle}>{t.s1t}</Text>
                <TextInput style={s.inp} placeholder={t.s1p} placeholderTextColor="rgba(253,246,237,0.3)" value={name} onChangeText={setName} autoFocus/>
                <TouchableOpacity style={s.btn} onPress={()=>validate()&&setStep(1)} activeOpacity={0.85}>
                  <Text style={s.btnTxt}>{t.next}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── STEP 1: DOB + TIME ── */}
            {step===1&&(
              <View style={s.card}>
                <Text style={s.stepNum}>2 {t.of} 5</Text>
                <Text style={s.cTitle}>{t.s2t}</Text>
                <Text style={s.cSub}>{t.s2s}</Text>
                {/* DOB */}
                <View style={s.dobRow}>
                  <TextInput style={[s.inp,{flex:1}]} placeholder={t.s2dd} placeholderTextColor="rgba(253,246,237,0.3)" value={dobDay} onChangeText={v=>setDobDay(v.replace(/\D/g,'').slice(0,2))} keyboardType="number-pad" maxLength={2}/>
                  <TextInput style={[s.inp,{flex:1}]} placeholder={t.s2mm} placeholderTextColor="rgba(253,246,237,0.3)" value={dobMonth} onChangeText={v=>setDobMonth(v.replace(/\D/g,'').slice(0,2))} keyboardType="number-pad" maxLength={2}/>
                  <TextInput style={[s.inp,{flex:1.6}]} placeholder={t.s2yy} placeholderTextColor="rgba(253,246,237,0.3)" value={dobYear} onChangeText={v=>setDobYear(v.replace(/\D/g,'').slice(0,4))} keyboardType="number-pad" maxLength={4}/>
                </View>
                {/* Time header */}
                <Text style={[s.cSub,{marginTop:20,marginBottom:6}]}>{t.s2time}</Text>
                <Text style={s.subNote}>{t.s2timeSub}</Text>
                {/* Toggle between slot and exact */}
                <View style={s.modeToggle}>
                  <TouchableOpacity style={[s.modeBtn,timeMode==='slot'&&s.modeBtnOn]} onPress={()=>setTimeMode('slot')}>
                    <Text style={[s.modeBtnTxt,timeMode==='slot'&&s.modeBtnTxtOn]}>{t.s2slot}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.modeBtn,timeMode==='exact'&&s.modeBtnOn]} onPress={()=>setTimeMode('exact')}>
                    <Text style={[s.modeBtnTxt,timeMode==='exact'&&s.modeBtnTxtOn]}>{t.s2know}</Text>
                  </TouchableOpacity>
                </View>
                {/* Slot selection */}
                {timeMode==='slot'&&(
                  <View style={s.slotGrid}>
                    {TIME_SLOTS.map(ts=>(
                      <TouchableOpacity key={ts.id} style={[s.slotBtn,timeSlot===ts.id&&s.slotBtnOn]} onPress={()=>setTimeSlot(ts.id)} activeOpacity={0.8}>
                        <Text style={[s.slotTxt,timeSlot===ts.id&&s.slotTxtOn]}>{ui==='hi'?ts.hi:ts.en}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {/* Exact time input */}
                {timeMode==='exact'&&(
                  <TextInput
                    style={[s.inp,{marginTop:8,fontSize:20,textAlign:'center',letterSpacing:4}]}
                    placeholder={t.s2exactP}
                    placeholderTextColor="rgba(253,246,237,0.25)"
                    value={exactTime}
                    onChangeText={v=>{
                      const digits=v.replace(/\D/g,'').slice(0,4);
                      if(digits.length<=2) setExactTime(digits);
                      else setExactTime(digits.slice(0,2)+':'+digits.slice(2));
                    }}
                    keyboardType="number-pad"
                    maxLength={5}
                    autoFocus
                  />
                )}
                <View style={s.navRow}>
                  <TouchableOpacity style={s.backBtn} onPress={()=>setStep(0)}><Text style={s.backBtnTxt}>←</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.btn,{flex:1}]} onPress={()=>validate()&&setStep(2)} activeOpacity={0.85}>
                    <Text style={s.btnTxt}>{t.next}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── STEP 2: CITY ── */}
            {step===2&&(
              <View style={s.card}>
                <Text style={s.stepNum}>3 {t.of} 5</Text>
                <Text style={s.cTitle}>{t.s3t}</Text>
                <TextInput style={s.inp} placeholder={t.s3p} placeholderTextColor="rgba(253,246,237,0.3)" value={birthCity} onChangeText={setBirthCity} autoFocus/>
                <View style={s.navRow}>
                  <TouchableOpacity style={s.backBtn} onPress={()=>setStep(1)}><Text style={s.backBtnTxt}>←</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.btn,{flex:1}]} onPress={()=>validate()&&setStep(3)} activeOpacity={0.85}>
                    <Text style={s.btnTxt}>{t.next}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── STEP 3: LANGUAGE ── */}
            {step===3&&(
              <View style={s.card}>
                <Text style={s.stepNum}>4 {t.of} 5</Text>
                <Text style={s.cTitle}>{t.s4t}</Text>
                <Text style={s.cSub}>{t.s4s}</Text>
                <View style={s.langRow}>
                  {[{id:'hindi',flag:'🇮🇳',hi:'हिंदी',en:'Hindi'},{id:'english',flag:'🇬🇧',hi:'English',en:'English'}].map(l=>(
                    <TouchableOpacity key={l.id} style={[s.langCard,lang===l.id&&s.langCardOn]} onPress={()=>setLang(l.id)} activeOpacity={0.85}>
                      <Text style={{fontSize:32,marginBottom:8}}>{l.flag}</Text>
                      <Text style={[s.langCardTxt,lang===l.id&&s.langCardTxtOn]}>{ui==='hi'?l.hi:l.en}</Text>
                      {lang===l.id&&<Text style={{fontSize:18,color:'#E8620A',marginTop:4}}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={s.navRow}>
                  <TouchableOpacity style={s.backBtn} onPress={()=>setStep(2)}><Text style={s.backBtnTxt}>←</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.btn,{flex:1}]} onPress={()=>setStep(4)} activeOpacity={0.85}>
                    <Text style={s.btnTxt}>{t.next}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── STEP 4: PHONE ── */}
            {step===4&&(
              <View style={s.card}>
                <Text style={s.stepNum}>5 {t.of} 5</Text>
                <Text style={s.cTitle}>{t.s5t}</Text>
                <Text style={s.cSub}>{t.s5s}</Text>
                <View style={s.phoneRow}>
                  <View style={s.cc}><Text style={s.ccTxt}>🇮🇳 +91</Text></View>
                  <TextInput style={[s.inp,{flex:1}]} placeholder="10-digit number" placeholderTextColor="rgba(253,246,237,0.3)" value={phone} onChangeText={v=>setPhone(v.replace(/\D/g,'').slice(0,10))} keyboardType="phone-pad" maxLength={10} autoFocus/>
                </View>
                <View style={s.navRow}>
                  <TouchableOpacity style={s.backBtn} onPress={()=>setStep(3)}><Text style={s.backBtnTxt}>←</Text></TouchableOpacity>
                  {/* FIX: disabled when loading OR phone not 10 digits */}
                  <TouchableOpacity
                    style={[s.btn,{flex:1},(loading||phone.length<10)&&s.btnDisabled]}
                    onPress={()=>{ if(phone.length===10) sendOTP('+91'+phone); }}
                    disabled={loading||phone.length<10}
                    activeOpacity={0.85}>
                    {loading
                      ? <ActivityIndicator color="#fff"/>
                      : <Text style={s.btnTxt}>{t.getOTP}</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── STEP 5: OTP ── */}
            {step===5&&(
              <View style={s.card}>
                <Text style={s.stepNum}>✓ {ui==='hi'?'अंतिम चरण':'Final Step'}</Text>
                <Text style={s.cTitle}>{t.s6t}</Text>
                <Text style={s.cSub}>{t.s6s}: +91-{phone}</Text>
                <TextInput
                  style={[s.inp,{textAlign:'center',fontSize:28,letterSpacing:10,marginTop:8}]}
                  placeholder="• • • • • •"
                  placeholderTextColor="rgba(253,246,237,0.18)"
                  value={otp}
                  onChangeText={v=>setOtp(v.replace(/\D/g,'').slice(0,6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  editable={!loading}
                />
                {/* FIX: disabled when loading OR otp < 6 digits */}
                <TouchableOpacity
                  style={[s.btn,(loading||otp.length<6)&&s.btnDisabled]}
                  onPress={verifyOTP}
                  disabled={loading||otp.length<6}
                  activeOpacity={0.85}>
                  {loading
                    ? <ActivityIndicator color="#fff"/>
                    : <Text style={s.btnTxt}>{otp.length>=6?t.enter:t.verify}</Text>
                  }
                </TouchableOpacity>

                {/* FIX: Resend OTP button with cooldown timer */}
                <TouchableOpacity
                  onPress={resendOTP}
                  disabled={resendCooldown > 0 || loading}
                  style={[s.resendBtn, (resendCooldown > 0 || loading) && s.resendBtnDisabled]}
                  activeOpacity={0.75}>
                  <Text style={[s.resendTxt, (resendCooldown > 0 || loading) && s.resendTxtDisabled]}>
                    {resendCooldown > 0
                      ? `${t.resendIn}${resendCooldown}${t.resendSec}`
                      : t.resend
                    }
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={()=>{
                    if (loading) return;
                    setStep(4);
                    setOtp('');
                    setConfirmation(null);
                    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
                    setResendCooldown(0);
                  }}
                  style={{marginTop:8,alignItems:'center'}}>
                  <Text style={{color:'#E8620A',fontSize:13}}>{t.change}</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={s.footer}>🕉 जय सनातन धर्म · Jai Sanatan Dharma 🕉</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#0D0500'},
  topBar:{flexDirection:'row',justifyContent:'flex-end',gap:6,paddingHorizontal:16,paddingTop:8,paddingBottom:4},
  uiBtn:{paddingHorizontal:12,paddingVertical:6,borderRadius:20,borderWidth:1,borderColor:'rgba(200,130,40,0.2)'},
  uiBtnOn:{backgroundColor:'rgba(232,98,10,0.15)',borderColor:'#E8620A'},
  uiBtnTxt:{fontSize:12,color:'rgba(253,246,237,0.4)',fontWeight:'700'},
  uiBtnTxtOn:{color:'#F4A261'},
  prog:{height:3,backgroundColor:'rgba(255,255,255,0.06)',marginHorizontal:16,borderRadius:2},
  progFill:{height:3,backgroundColor:'#E8620A',borderRadius:2},
  scroll:{padding:18,paddingBottom:40},
  logo:{alignItems:'center',paddingVertical:22},
  brand:{fontSize:26,fontWeight:'800',color:'#E8620A',marginTop:8},
  tag:{fontSize:12,color:'#C9830A',marginTop:4,textAlign:'center'},
  stepNum:{fontSize:11,color:'rgba(253,246,237,0.35)',fontWeight:'700',letterSpacing:0.8,marginBottom:6},
  card:{backgroundColor:'#130700',borderRadius:20,padding:22,borderWidth:1,borderColor:'rgba(240,165,0,0.15)',marginBottom:16},
  cTitle:{fontSize:20,fontWeight:'800',color:'#F4A261',marginBottom:4},
  cSub:{fontSize:13,color:'rgba(253,246,237,0.42)',marginBottom:10},
  subNote:{fontSize:11,color:'rgba(253,246,237,0.28)',marginBottom:10,marginTop:-6},
  inp:{backgroundColor:'rgba(255,255,255,0.06)',borderRadius:12,paddingHorizontal:14,paddingVertical:13,color:'#FDF6ED',fontSize:15,borderWidth:1,borderColor:'rgba(200,130,40,0.2)',marginBottom:4},
  dobRow:{flexDirection:'row',gap:8},
  modeToggle:{flexDirection:'row',gap:8,marginBottom:14,marginTop:4},
  modeBtn:{flex:1,padding:11,borderRadius:12,borderWidth:1,borderColor:'rgba(200,130,40,0.18)',alignItems:'center'},
  modeBtnOn:{backgroundColor:'rgba(232,98,10,0.15)',borderColor:'#E8620A'},
  modeBtnTxt:{fontSize:12,color:'rgba(253,246,237,0.4)',fontWeight:'600',textAlign:'center'},
  modeBtnTxtOn:{color:'#F4A261'},
  slotGrid:{gap:8},
  slotBtn:{padding:13,borderRadius:12,borderWidth:1,borderColor:'rgba(200,130,40,0.18)',backgroundColor:'rgba(255,255,255,0.02)'},
  slotBtnOn:{backgroundColor:'rgba(232,98,10,0.15)',borderColor:'#E8620A'},
  slotTxt:{fontSize:13,color:'rgba(253,246,237,0.45)',fontWeight:'600'},
  slotTxtOn:{color:'#F4A261'},
  phoneRow:{flexDirection:'row',gap:10,alignItems:'center'},
  cc:{backgroundColor:'rgba(255,255,255,0.06)',borderRadius:12,paddingHorizontal:12,paddingVertical:13,borderWidth:1,borderColor:'rgba(200,130,40,0.2)'},
  ccTxt:{color:'#FDF6ED',fontSize:14},
  langRow:{flexDirection:'row',gap:14,justifyContent:'center',marginVertical:10},
  langCard:{flex:1,alignItems:'center',backgroundColor:'rgba(255,255,255,0.04)',borderRadius:16,paddingVertical:22,borderWidth:1.5,borderColor:'rgba(200,130,40,0.18)'},
  langCardOn:{backgroundColor:'rgba(232,98,10,0.12)',borderColor:'#E8620A'},
  langCardTxt:{fontSize:16,fontWeight:'700',color:'rgba(253,246,237,0.45)'},
  langCardTxtOn:{color:'#F4A261'},
  navRow:{flexDirection:'row',gap:10,alignItems:'center',marginTop:18},
  backBtn:{width:48,height:48,borderRadius:14,backgroundColor:'rgba(255,255,255,0.07)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(200,130,40,0.2)'},
  backBtnTxt:{fontSize:20,color:'#F4A261',fontWeight:'700'},
  btn:{backgroundColor:'#E8620A',borderRadius:14,paddingVertical:15,alignItems:'center',marginTop:18,elevation:4,shadowColor:'#E8620A',shadowOffset:{width:0,height:3},shadowOpacity:0.4,shadowRadius:6},
  btnDisabled:{backgroundColor:'rgba(232,98,10,0.35)',elevation:0,shadowOpacity:0},
  btnTxt:{color:'#fff',fontSize:16,fontWeight:'800'},
  // FIX: resend button styles
  resendBtn:{marginTop:14,alignItems:'center',paddingVertical:8},
  resendBtnDisabled:{opacity:0.5},
  resendTxt:{color:'#E8620A',fontSize:13,fontWeight:'600'},
  resendTxtDisabled:{color:'rgba(253,246,237,0.35)'},
  footer:{textAlign:'center',color:'rgba(240,165,0,0.35)',fontSize:12,marginTop:24,paddingBottom:20},
});
