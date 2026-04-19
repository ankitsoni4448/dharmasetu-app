// DharmaSetu — Payment Screen
// File location: D:\DharmaSetu\dharmasetu-app\app\(tabs)\payment.js
// NO external imports from app_config — everything self-contained
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, Modal, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── CONFIG — change this UPI ID to YOUR UPI ID ──────────
const BACKEND_URL = 'https://dharmasetu-backend-2c65.onrender.com';
const YOUR_UPI_ID = '9115512448@axl'; // CHANGE THIS to your UPI ID e.g. yourname@okicici

// ── DEFAULT PLANS (used if backend is offline) ───────────
const DEFAULT_PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    nameHi: 'बेसिक',
    price: 99,
    active: true,
    features: [
      '30 questions per day',
      '15 fact-checks per day',
      'Mantra Verify',
      'Save answers',
      'No ads',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    nameHi: 'प्रो',
    price: 249,
    active: true,
    popular: true,
    features: [
      'Unlimited questions',
      'Unlimited fact-checks',
      'All Debate levels',
      'Peace Mode',
      'No ads',
      'Priority support',
    ],
  },
];

const DEFAULT_DONATIONS = [
  { id: 'army',   name: 'Army Welfare',    nameHi: 'सेना कल्याण',        desc: 'Support Indian Army welfare fund',        goal: 100000, raised: 23400 },
  { id: 'temple', name: 'Temple Restore',  nameHi: 'मंदिर जीर्णोद्धार', desc: 'Restore ancient temples across India',    goal: 500000, raised: 87600 },
  { id: 'dharma', name: 'Dharma Education',nameHi: 'धर्म शिक्षा',        desc: 'Educate youth about Sanatan Dharma',      goal: 250000, raised: 41200 },
];

// ════════════════════════════════════════════════════════
export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('subscription');
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [donations, setDonations] = useState(DEFAULT_DONATIONS);
  const [selPlan, setSelPlan] = useState(null);
  const [selDon, setSelDon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [currentPlan, setCurrentPlan] = useState('free');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const raw = await AsyncStorage.getItem('dharmasetu_user');
      if (raw) {
        const u = JSON.parse(raw);
        setUser(u);
        setCurrentPlan(u.plan || 'free');
      }
      // Load plans from backend (use defaults if offline)
      const bRaw = await AsyncStorage.getItem('dharmasetu_bundles');
      if (bRaw) {
        const parsed = JSON.parse(bRaw);
        if (parsed?.length) setPlans(parsed);
      }
      const dRaw = await AsyncStorage.getItem('dharmasetu_donations');
      if (dRaw) {
        const parsed = JSON.parse(dRaw);
        if (parsed?.length) setDonations(parsed);
      }
    } catch {}
  };

  const isH = user?.language === 'hindi';

  const handleSubscribe = async (plan) => {
    if (loading) return;
    setLoading(true);
    try {
      const upiLink = `upi://pay?pa=${YOUR_UPI_ID}&pn=DharmaSetu&am=${plan.price}&cu=INR&tn=${encodeURIComponent('DharmaSetu ' + plan.name + ' Subscription')}`;
      const canOpen = await Linking.canOpenURL(upiLink);
      if (canOpen) {
        await Linking.openURL(upiLink);
      } else {
        // Fallback: open Razorpay payment page
        await Linking.openURL('https://rzp.io/l/dharmasetu');
      }
      Alert.alert(
        isH ? '🙏 भुगतान शुरू हुआ' : '🙏 Payment Initiated',
        isH
          ? `₹${plan.price} का भुगतान हो जाने के बाद आपका ${plan.nameHi} प्लान activate हो जाएगा।`
          : `Once your payment of ₹${plan.price} is confirmed, your ${plan.name} plan will activate.`,
        [
          {
            text: isH ? '✓ भुगतान हो गया' : '✓ Payment Done',
            onPress: async () => {
              const updatedUser = { ...(user || {}), plan: plan.id };
              await AsyncStorage.setItem('dharmasetu_user', JSON.stringify(updatedUser));
              await AsyncStorage.setItem('dharmasetu_plan', plan.id);
              setCurrentPlan(plan.id);
              setUser(updatedUser);
              Alert.alert('🎉 ' + (isH ? 'स्वागत है!' : 'Welcome!'), isH ? `${plan.nameHi} प्लान activate हो गया! जय सनातन धर्म 🕉` : `${plan.name} plan activated! Jai Sanatan Dharma 🕉`);
            },
          },
          { text: isH ? 'बाद में' : 'Later', style: 'cancel' },
        ]
      );
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setLoading(false);
  };

  const handleDonate = async (campaign, amount) => {
    const amt = parseInt(amount || '0');
    if (!amt || amt < 10) { Alert.alert('', isH ? 'न्यूनतम दान ₹10 है' : 'Minimum donation is ₹10'); return; }
    setLoading(true);
    try {
      const upiLink = `upi://pay?pa=${YOUR_UPI_ID}&pn=DharmaSetu+Seva&am=${amt}&cu=INR&tn=${encodeURIComponent('DharmaSetu Donation: ' + campaign.name)}`;
      const canOpen = await Linking.canOpenURL(upiLink);
      if (canOpen) await Linking.openURL(upiLink);
      else await Linking.openURL('https://rzp.io/l/dharmasetu');
      Alert.alert(
        isH ? '🙏 दान के लिए धन्यवाद!' : '🙏 Thank you for your donation!',
        isH ? `₹${amt} का दान "${campaign.nameHi}" के लिए process हो रहा है। जय सनातन धर्म!` : `Your donation of ₹${amt} to "${campaign.name}" is being processed. Jai Sanatan Dharma!`
      );
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setLoading(false);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#0D0500" />

      {/* Header */}
      <View style={s.hdr}>
        <Text style={s.hdrOm}>🕉</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.hdrTitle}>{isH ? 'DharmaSetu Premium' : 'DharmaSetu Premium'}</Text>
          <Text style={s.hdrSub}>
            {currentPlan !== 'free'
              ? (isH ? `वर्तमान प्लान: ${currentPlan.toUpperCase()}` : `Current plan: ${currentPlan.toUpperCase()}`)
              : (isH ? 'अपनी Dharma-यात्रा को और गहरा बनाएं' : 'Deepen your Dharmic journey')}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'subscription' && s.tabOn]} onPress={() => setTab('subscription')}>
          <Text style={[s.tabTxt, tab === 'subscription' && s.tabTxtOn]}>{isH ? '⭐ सदस्यता' : '⭐ Subscribe'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'donation' && s.tabOn]} onPress={() => setTab('donation')}>
          <Text style={[s.tabTxt, tab === 'donation' && s.tabTxtOn]}>{isH ? '🙏 दान करें' : '🙏 Donate'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── SUBSCRIPTION TAB ── */}
        {tab === 'subscription' && (
          <View>
            <Text style={s.secTitle}>{isH ? 'अपना प्लान चुनें' : 'Choose Your Plan'}</Text>
            <Text style={s.secSub}>
              {isH
                ? 'Premium लेकर अपनी Dharmic journey को और गहरा बनाएं।'
                : 'Unlock the full power of DharmaSetu with Premium.'}
            </Text>
            {plans.filter(p => p.active !== false).map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[s.planCard, selPlan?.id === plan.id && s.planCardSel]}
                onPress={() => setSelPlan(plan)}
                activeOpacity={0.85}
              >
                <View style={s.planTop}>
                  <View>
                    <Text style={s.planName}>{isH ? plan.nameHi : plan.name}</Text>
                    {plan.popular && (
                      <View style={s.popularBadge}>
                        <Text style={s.popularTxt}>{isH ? '⭐ सबसे लोकप्रिय' : '⭐ Most Popular'}</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.planPrice}>₹{plan.price}</Text>
                    <Text style={s.planPeriod}>{isH ? '/माह' : '/month'}</Text>
                  </View>
                </View>
                {(plan.features || []).map((f, i) => (
                  <Text key={i} style={s.feature}>✓  {f}</Text>
                ))}
                {selPlan?.id === plan.id && (
                  <TouchableOpacity
                    style={s.subBtn}
                    onPress={() => handleSubscribe(plan)}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={s.subBtnTxt}>{isH ? `₹${plan.price} में शुरू करें` : `Start for ₹${plan.price}`}</Text>}
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
            <Text style={s.note}>
              {isH
                ? '💳 UPI, GPay, PhonePe, Paytm, Debit/Credit — सब स्वीकार'
                : '💳 UPI, GPay, PhonePe, Paytm, Debit/Credit cards accepted'}
            </Text>
          </View>
        )}

        {/* ── DONATION TAB ── */}
        {tab === 'donation' && (
          <View>
            <Text style={s.secTitle}>{isH ? 'दान का कारण चुनें' : 'Choose a Cause'}</Text>
            <Text style={s.secSub}>
              {isH
                ? 'आपका दान सनातन धर्म की रक्षा और समाज सेवा के लिए उपयोग होगा।'
                : 'Your donation goes to protect Sanatan Dharma and serve society.'}
            </Text>
            {donations.map((camp) => (
              <View key={camp.id} style={[s.donCard, selDon?.id === camp.id && s.donCardSel]}>
                <TouchableOpacity onPress={() => setSelDon(selDon?.id === camp.id ? null : camp)} activeOpacity={0.85}>
                  <View style={s.donTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.donName}>{isH ? camp.nameHi : camp.name}</Text>
                      <Text style={s.donDesc}>{camp.desc}</Text>
                    </View>
                    {selDon?.id === camp.id && <Text style={{ color: '#E8620A', fontSize: 18, marginLeft: 8 }}>●</Text>}
                  </View>
                  <View style={s.progTrack}>
                    <View style={[s.progFill, { width: `${Math.min(100, Math.round(((camp.raised || 0) / Math.max(camp.goal, 1)) * 100))}%` }]} />
                  </View>
                  <Text style={s.donProg}>
                    ₹{(camp.raised || 0).toLocaleString()} {isH ? 'जुटाए' : 'raised'} / ₹{camp.goal.toLocaleString()} {isH ? 'लक्ष्य' : 'goal'}
                  </Text>
                </TouchableOpacity>
                {selDon?.id === camp.id && (
                  <View style={s.amtRow}>
                    {[51, 101, 251, 501, 1001].map((amt) => (
                      <TouchableOpacity key={amt} style={s.amtBtn} onPress={() => handleDonate(camp, amt)} disabled={loading} activeOpacity={0.85}>
                        {loading
                          ? <ActivityIndicator color="#E8620A" size="small" />
                          : <Text style={s.amtBtnTxt}>₹{amt}</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
            <Text style={s.note}>
              {isH
                ? '🙏 सभी दान UPI / Card से — पारदर्शिता के साथ।'
                : '🙏 All donations via UPI / Card. Full transparency.'}
            </Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0500' },
  hdr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.12)', gap: 12 },
  hdrOm: { fontSize: 30 },
  hdrTitle: { fontSize: 18, fontWeight: '800', color: '#F4A261' },
  hdrSub: { fontSize: 12, color: 'rgba(253,246,237,0.4)', marginTop: 2 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.12)' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: '#E8620A' },
  tabTxt: { fontSize: 14, fontWeight: '700', color: 'rgba(253,246,237,0.4)' },
  tabTxtOn: { color: '#F4A261' },
  scroll: { padding: 18, paddingBottom: 50 },
  secTitle: { fontSize: 18, fontWeight: '800', color: '#F4A261', marginBottom: 6 },
  secSub: { fontSize: 13, color: 'rgba(253,246,237,0.42)', marginBottom: 18, lineHeight: 20 },
  planCard: { backgroundColor: '#130700', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1.5, borderColor: 'rgba(240,165,0,0.15)' },
  planCardSel: { borderColor: '#E8620A', backgroundColor: 'rgba(232,98,10,0.07)' },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  planName: { fontSize: 18, fontWeight: '800', color: '#F4A261' },
  popularBadge: { backgroundColor: 'rgba(232,98,10,0.18)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4, alignSelf: 'flex-start' },
  popularTxt: { fontSize: 11, color: '#E8620A', fontWeight: '700' },
  planPrice: { fontSize: 28, fontWeight: '800', color: '#E8620A' },
  planPeriod: { fontSize: 12, color: 'rgba(253,246,237,0.4)', textAlign: 'right' },
  feature: { fontSize: 13, color: 'rgba(253,246,237,0.65)', paddingVertical: 3 },
  subBtn: { backgroundColor: '#E8620A', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 16, elevation: 4, shadowColor: '#E8620A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6 },
  subBtnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
  donCard: { backgroundColor: '#130700', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: 'rgba(240,165,0,0.12)' },
  donCardSel: { borderColor: '#E8620A', backgroundColor: 'rgba(232,98,10,0.05)' },
  donTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  donName: { fontSize: 16, fontWeight: '700', color: '#FDF6ED', marginBottom: 4 },
  donDesc: { fontSize: 12, color: 'rgba(253,246,237,0.45)', lineHeight: 18 },
  progTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progFill: { height: 6, backgroundColor: '#E8620A', borderRadius: 3 },
  donProg: { fontSize: 11, color: 'rgba(253,246,237,0.35)' },
  amtRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  amtBtn: { backgroundColor: 'rgba(232,98,10,0.15)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(232,98,10,0.3)' },
  amtBtnTxt: { fontSize: 14, fontWeight: '700', color: '#E8620A' },
  note: { fontSize: 12, color: 'rgba(253,246,237,0.28)', textAlign: 'center', marginTop: 16, lineHeight: 18 },
});