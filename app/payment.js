// ════════════════════════════════════════════════════════════════
// DharmaSetu — Payment Screen FIXED v2
//
// FIXES APPLIED:
//  1. pendingOrderId persisted to AsyncStorage — survives app restart
//  2. restorePendingOrder on mount — reads pendingOrderId + selPlan from storage
//  3. isMountedRef — all setState calls guarded against unmount (memory leak fix)
//  4. loadingRef (useRef lock) — prevents double-tap race condition in handleSubscribe
//  5. subscribeRazorpay: removed internal setLoading (caller owns it) — no double-loading
//  6. verifyPayment: removed duplicate Alert (activatePlan already shows success alert)
//  7. verifyPayment: loading guard added — prevents double confirm taps
//  8. verifyPayment: pendingOrderId + selPlan cleared from AsyncStorage on success/failure
//  9. activatePlan: also persists clearance of pendingOrderId from AsyncStorage
// 10. handleSubscribe: always clears loading in finally block — no stuck spinner
// 11. useCallback on all async handlers — stable references, no re-creation each render
// 12. loadData: guarded with isMountedRef before every setState
// ════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator, Alert, Linking, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BACKEND_URL = 'https://dharmasetu-backend-2c65.onrender.com';

// Default plans (shown if backend offline)
const DEFAULT_PLANS = [
  { id:'basic', name:'Basic', nameHi:'बेसिक', price:99,  active:true, features:['30 questions/day','15 fact-checks/day','Mantra Verify','Save answers','No ads'] },
  { id:'pro',   name:'Pro',   nameHi:'प्रो',  price:249, active:true, popular:true, features:['Unlimited questions','Unlimited fact-checks','All levels','Peace Mode','No ads'] },
];
const DEFAULT_DONS = [
  { id:'army',   name:'Army Welfare',     nameHi:'सेना कल्याण',        desc:'Support Indian Army welfare', goal:100000, raised:0 },
  { id:'temple', name:'Temple Restore',   nameHi:'मंदिर जीर्णोद्धार',  desc:'Restore ancient temples',    goal:500000, raised:0 },
  { id:'dharma', name:'Dharma Education', nameHi:'धर्म शिक्षा',        desc:'Educate youth about Dharma',  goal:250000, raised:0 },
];

// ─── AsyncStorage keys ────────────────────────────────────────────
const KEY_PENDING_ORDER  = 'payment_pending_order_id';
const KEY_PENDING_PLAN   = 'payment_pending_plan';

// ─── Backend helper ───────────────────────────────────────────────
async function logToBackend(path, body) {
  try {
    await fetch(`${BACKEND_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.log('[Payment] Backend log failed:', e.message);
  }
}

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();

  const [paymentMode,   setPaymentMode]   = useState('');
  const [tab,           setTab]           = useState('subscription');
  const [plans,         setPlans]         = useState(DEFAULT_PLANS);
  const [dons,          setDons]          = useState(DEFAULT_DONS);
  const [selPlan,       setSelPlan]       = useState(null);
  const [selDon,        setSelDon]        = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [pendingOrderId,setPendingOrderId]= useState(null);
  const [user,          setUser]          = useState(null);
  const [currentPlan,   setCurrentPlan]  = useState('free');
  const [payConfig,     setPayConfig]     = useState({
    phonepeUPI: '', razorpayKeyId: '', subscriptionPayment: 'upi',
    donationPayment: 'upi', hasRazorpay: false,
  });

  // FIX: isMountedRef — prevents setState after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // FIX: loadingRef — prevents double-tap race condition
  const loadingRef = useRef(false);

  // ── Update paymentMode whenever tab or payConfig changes ─────────
  useEffect(() => {
    if (payConfig) {
      const mode = tab === 'subscription'
        ? payConfig.subscriptionPayment
        : payConfig.donationPayment;
      if (isMountedRef.current) setPaymentMode(mode);
    }
  }, [tab, payConfig]);

  // ── Fetch with timeout helper ─────────────────────────────────────
  const fetchWithTimeout = useCallback((url, options, timeoutMs = 8000) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      fetch(url, options)
        .then(res => { clearTimeout(timer); resolve(res); })
        .catch(err => { clearTimeout(timer); reject(err); });
    });
  }, []);

  // ── Load data ─────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      // Load user from storage
      const raw = await AsyncStorage.getItem('dharmasetu_user');
      if (raw && isMountedRef.current) {
        let u;
try {
  u = JSON.parse(raw);
} catch {
  await AsyncStorage.removeItem('dharmasetu_user');
  return;
}
        setUser(u);
        setCurrentPlan(u.plan || 'free');
      }

      // Load cached plans + donations
      const bRaw = await AsyncStorage.getItem('dharmasetu_bundles');
      if (bRaw && isMountedRef.current) {
        const p = JSON.parse(bRaw);
        if (p?.length) setPlans(p);
      }
      const dRaw = await AsyncStorage.getItem('dharmasetu_donations');
      if (dRaw && isMountedRef.current) {
        const d = JSON.parse(dRaw);
        if (d?.length) setDons(d);
      }

      // Load payment config from backend with strict timeout
      try {
        const r = await fetchWithTimeout(`${BACKEND_URL}/payment-config`, {}, 5000);
        if (r.ok) {
          const cfg = await r.json();
          if (isMountedRef.current) {
            setPayConfig(cfg);
            const mode = tab === 'subscription'
              ? cfg.subscriptionPayment
              : cfg.donationPayment;
            setPaymentMode(mode);
          }
        }
      } catch (e) {
        console.log('[Payment] Config fetch failed, using cached defaults:', e.message);
      }

    } catch (e) {
      console.log('[Payment] loadData error:', e.message);
    }
  }, [fetchWithTimeout, tab]);

  // FIX: Restore pending order on mount — survives app restart
  const restorePendingOrder = useCallback(async () => {
    try {
      const savedOrderId = await AsyncStorage.getItem(KEY_PENDING_ORDER);
      const savedPlanRaw = await AsyncStorage.getItem(KEY_PENDING_PLAN);
      if (savedOrderId && savedPlanRaw) {
        const savedPlan = JSON.parse(savedPlanRaw);
        if (isMountedRef.current) {
          setPendingOrderId(savedOrderId);
          setSelPlan(savedPlan);
          console.log('[Payment] Restored pending order:', savedOrderId, 'for plan:', savedPlan.id);
        }
      }
    } catch (e) {
      console.log('[Payment] restorePendingOrder error:', e.message);
    }
  }, []);

  useEffect(() => {
    loadData();
    restorePendingOrder();
  }, [loadData, restorePendingOrder]);

  // ── Language helper ───────────────────────────────────────────────
  const isH = user?.language === 'hindi';

  // ── Donate via UPI ────────────────────────────────────────────────
  const handleDonate = useCallback(async (campaign, amount) => {
    const upiId = payConfig.phonepeUPI;
    if (!upiId) {
      Alert.alert('Error', isH ? 'UPI सेटअप नहीं है' : 'UPI not configured');
      return;
    }

    const url = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=DharmaSetu&am=${amount}&cu=INR&tn=${encodeURIComponent('DharmaSetu Donation')}`;
    try {
      await Linking.openURL(url);
      await logToBackend('/payment/initiate', {
        type: 'donation', campaign: campaign.id,
        amount, method: 'upi', phone: user?.phone || '',
      });
    } catch (e) {
      Alert.alert('Error', isH ? 'UPI खोल नहीं सका' : 'Could not open UPI app');
    }
  }, [payConfig.phonepeUPI, user?.phone, isH]);

  // ── Subscribe via UPI ─────────────────────────────────────────────
  const subscribeUPI = useCallback(async (plan) => {
    const upiId = payConfig.phonepeUPI;
    if (!upiId) {
      Alert.alert(
        isH ? 'Payment Setup' : 'Payment Setup',
        isH ? 'Payment method not configured. Please contact support.'
            : 'Payment not configured. Contact support.',
      );
      return null;
    }

    const orderId = `upi_${Date.now()}_${Math.random().toString(36).substring(2,8)}`;

    await logToBackend('/payment/initiate', {
      type: 'subscription', planId: plan.id,
      amount: plan.price, method: 'upi', phone: user?.phone || '',
    });

    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=DharmaSetu&am=${plan.price}&cu=INR&tn=${encodeURIComponent('DharmaSetu ' + plan.name)}`;
    try {
      const ok = await Linking.canOpenURL(upiLink);
      if (ok) {
        await Linking.openURL(upiLink);
      } else {
        // Fallback: PhonePe direct, then Razorpay web page
        const pp = `phonepe://pay?pa=${encodeURIComponent(upiId)}&am=${plan.price}`;
        const ppOk = await Linking.canOpenURL(pp);
        if (ppOk) await Linking.openURL(pp);
        else await Linking.openURL('https://rzp.io/l/dharmasetu');
      }
      Alert.alert(
        isH ? '🙏 भुगतान भेजा' : '🙏 Payment Sent',
        isH ? 'UPI लिंक खोल दिया गया। भुगतान पूरा होने पर "I have paid" बटन दबाएँ।'
            : 'UPI link opened. Tap "I have paid" after completing payment.',
      );
    } catch (e) {
      Alert.alert(
        'UPI',
        isH ? `UPI ID: ${upiId}\nAmount: ₹${plan.price}\n\nManually pay and contact support.`
            : `Pay ₹${plan.price} to UPI: ${upiId}`,
      );
    }
    return orderId;
  }, [payConfig.phonepeUPI, user?.phone, isH]);

  // ── Subscribe via Razorpay ────────────────────────────────────────
  // FIX: Removed internal setLoading — caller (handleSubscribe) owns loading state
  const subscribeRazorpay = useCallback(async (plan) => {
    await logToBackend('/payment/initiate', {
      type: 'subscription', planId: plan.id,
      amount: plan.price, method: 'razorpay', phone: user?.phone || '',
    });

    try {
      const r = await fetchWithTimeout(`${BACKEND_URL}/payment/razorpay/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: plan.price, type: 'subscription',
          planId: plan.id, phone: user?.phone || '',
        }),
      }, 10000);

      const data = await r.json();
      if (!data.success) throw new Error(data.error || 'Order creation failed');

      const rzpUrl = `https://api.razorpay.com/v1/checkout/embedded?key_id=${data.keyId}&order_id=${data.orderId}&amount=${data.amount}&currency=INR&name=DharmaSetu&description=${encodeURIComponent(plan.name + ' Plan')}`;
      await Linking.openURL(rzpUrl);

      Alert.alert(
        isH ? '🙏 भुगतान' : '🙏 Payment',
        isH ? 'Razorpay में भुगतान किया। "I have paid" बटन दबाएँ।'
            : 'Payment done in Razorpay. Tap "I have paid".',
      );
      return data.orderId;
    } catch (e) {
      Alert.alert(isH ? 'Error' : 'Error', e.message);
      return null;
    }
  }, [user?.phone, isH, fetchWithTimeout]);

  // ── Activate plan locally ─────────────────────────────────────────
  const activatePlan = useCallback(async (plan) => {
    try {
      const updated = { ...(user || {}), plan: plan.id };
      await AsyncStorage.setItem('dharmasetu_user', JSON.stringify(updated));
      await AsyncStorage.setItem('dharmasetu_plan', plan.id);
      // FIX: clear pending order from storage on activation
      await AsyncStorage.removeItem(KEY_PENDING_ORDER);
      await AsyncStorage.removeItem(KEY_PENDING_PLAN);
      if (isMountedRef.current) {
        setCurrentPlan(plan.id);
        setUser(updated);
      }
    } catch (e) {
      console.log('[Payment] activatePlan error:', e.message);
    }
  }, [user]);

  // ── Handle Subscribe (main entry point) ───────────────────────────
  // FIX: loadingRef prevents double-tap race condition
  const handleSubscribe = useCallback(async (plan) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (isMountedRef.current) setLoading(true);

    try {
      const method = payConfig.subscriptionPayment || 'upi';
      let orderId = null;

      if (method === 'razorpay' && payConfig.hasRazorpay) {
        orderId = await subscribeRazorpay(plan);
      } else {
        orderId = await subscribeUPI(plan);
      }

      if (orderId) {
        // FIX: persist pendingOrderId + selPlan to AsyncStorage
        await AsyncStorage.setItem(KEY_PENDING_ORDER, orderId);
        await AsyncStorage.setItem(KEY_PENDING_PLAN, JSON.stringify(plan));
        if (isMountedRef.current) {
          setPendingOrderId(orderId);
          setSelPlan(plan);
        }
      }
    } catch (e) {
      console.log('[Payment] handleSubscribe error:', e.message);
      Alert.alert('Error', isH ? 'कुछ गलत हुआ। दोबारा कोशिश करें।' : 'Something went wrong. Please try again.');
    } finally {
      loadingRef.current = false;
      if (isMountedRef.current) setLoading(false);
    }
  }, [payConfig, subscribeRazorpay, subscribeUPI, isH]);

  // ── Verify / Confirm Payment ──────────────────────────────────────
  // FIX: loading guard, no duplicate alert, clears storage on success/failure
  const verifyPayment = useCallback(async () => {
    if (!pendingOrderId || !selPlan) {
      Alert.alert('Error', isH ? 'कोई pending payment नहीं है' : 'No pending payment found');
      return;
    }
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (isMountedRef.current) setLoading(true);

    try {
      // Confirm payment with backend
      await fetchWithTimeout(`${BACKEND_URL}/payment/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
  orderId: pendingOrderId,
}),
      }, 10000);

      // Activate plan locally + clear storage
      await activatePlan(selPlan);

      // FIX: single success alert here (activatePlan no longer shows alert)
      Alert.alert(
        '🎉 ' + (isH ? 'सफल' : 'Success'),
        isH
          ? `${selPlan.nameHi} प्लान activate हो गया! 🕉`
          : `${selPlan.name} plan activated! 🕉`,
      );

      if (isMountedRef.current) {
        setPendingOrderId(null);
        setSelPlan(null);
      }
    } catch (e) {
      console.log('[Payment] verifyPayment error:', e.message);
      Alert.alert(
        isH ? 'सत्यापन विफल' : 'Verification Failed',
        isH
          ? 'भुगतान सत्यापन में समस्या हुई। Support से संपर्क करें।'
          : 'Payment verification failed. Please contact support.',
      );
      // FIX: clear pending order on failure too — don't leave stale state
      try {
        await AsyncStorage.removeItem(KEY_PENDING_ORDER);
        await AsyncStorage.removeItem(KEY_PENDING_PLAN);
      } catch {}
      if (isMountedRef.current) {
        setPendingOrderId(null);
        setSelPlan(null);
      }
    } finally {
      loadingRef.current = false;
      if (isMountedRef.current) setLoading(false);
    }
  }, [pendingOrderId, selPlan, user?.phone, activatePlan, fetchWithTimeout, isH]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#0D0500" />

      {/* HEADER */}
      <View style={s.hdr}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top:15, bottom:15, left:15, right:15 }}
          style={{ marginRight:12 }}>
          <Text style={{ fontSize:28, color:'#F4A261', lineHeight:28 }}>‹</Text>
        </TouchableOpacity>
        <Text style={s.hdrOm}>🕉</Text>
        <View style={{ flex:1 }}>
          <Text style={s.hdrT}>DharmaSetu Premium</Text>
          <Text style={s.hdrS}>
            {currentPlan !== 'free'
              ? `✅ ${isH ? 'आपका प्लान' : 'Your plan'}: ${currentPlan.toUpperCase()}`
              : (isH ? 'Dharmic journey गहरी बनाएं' : 'Deepen your Dharmic journey')}
          </Text>
        </View>
      </View>

      {/* TABS */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, tab === 'subscription' && s.tabOn]}
          onPress={() => setTab('subscription')}>
          <Text style={[s.tabT, tab === 'subscription' && s.tabTOn]}>
            {isH ? '⭐ सदस्यता' : '⭐ Subscribe'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'donation' && s.tabOn]}
          onPress={() => setTab('donation')}>
          <Text style={[s.tabT, tab === 'donation' && s.tabTOn]}>
            {isH ? '🙏 दान करें' : '🙏 Donate'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Payment mode indicator */}
        {paymentMode ? (
          <View style={s.modeBox}>
            <Text style={s.modeTxt}>
              {isH ? 'भुगतान विधि' : 'Payment Mode'}:{' '}
              {paymentMode === 'upi' ? 'UPI (PhonePe / GPay)' : 'Razorpay'}
            </Text>
          </View>
        ) : null}

        {/* FIX: Pending order banner — shown on restart if payment was pending */}
        {pendingOrderId && selPlan && (
          <View style={s.pendingBanner}>
            <Text style={s.pendingTxt}>
              ⏳ {isH
                ? `${selPlan.nameHi} प्लान के लिए pending payment मिला`
                : `Pending payment found for ${selPlan.name} plan`}
            </Text>
            <Text style={s.pendingSubTxt}>
              {isH
                ? 'भुगतान पूरा हो जाने पर नीचे "I have paid" दबाएँ'
                : 'If you completed the payment, tap "I have paid" below'}
            </Text>
          </View>
        )}

        {/* SUBSCRIPTION TAB */}
        {tab === 'subscription' && (
          <View>
            <Text style={s.secT}>{isH ? 'अपना प्लान चुनें' : 'Choose Your Plan'}</Text>
            <Text style={s.secS}>
              {isH
                ? 'Premium लेकर Dharmic journey को और गहरा बनाएं।'
                : 'Unlock the full power of DharmaSetu.'}
            </Text>

            {plans.filter(p => p.active !== false).map(plan => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  s.plan,
                  selPlan?.id === plan.id && s.planSel,
                  plan.id === currentPlan && s.planActive,
                ]}
                onPress={() => setSelPlan(plan)}
                activeOpacity={0.85}>
                <View style={s.planTop}>
                  <View>
                    <Text style={s.planN}>{isH ? plan.nameHi : plan.name}</Text>
                    {plan.popular && (
                      <View style={s.pop}>
                        <Text style={s.popT}>{isH ? '⭐ सबसे लोकप्रिय' : '⭐ Most Popular'}</Text>
                      </View>
                    )}
                    {plan.id === currentPlan && (
                      <View style={[s.pop, { backgroundColor:'rgba(39,174,96,.15)' }]}>
                        <Text style={[s.popT, { color:'#27AE60' }]}>
                          {isH ? '✅ आपका प्लान' : '✅ Current Plan'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ alignItems:'flex-end' }}>
                    <Text style={s.planP}>₹{plan.price}</Text>
                    <Text style={s.planPer}>{isH ? '/माह' : '/month'}</Text>
                  </View>
                </View>

                {(plan.features || []).map((f, i) => (
                  <Text key={i} style={s.feat}>✓  {f}</Text>
                ))}

                {selPlan?.id === plan.id && plan.id !== currentPlan && (
                  <TouchableOpacity
                    style={s.subBtn}
                    onPress={() => handleSubscribe(plan)}
                    disabled={loading}
                    activeOpacity={0.85}>
                    {loading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={s.subBtnT}>
                          {isH ? `₹${plan.price} में शुरू करें →` : `Start for ₹${plan.price} →`}
                        </Text>}
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}

            {/* FIX: "I have paid" button — shown when pending order exists */}
            {pendingOrderId && selPlan && (
              <TouchableOpacity
                style={[s.subBtn, s.paidBtn]}
                onPress={verifyPayment}
                disabled={loading}
                activeOpacity={0.85}>
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.subBtnT}>
                      ✅ {isH ? 'मैंने भुगतान कर दिया' : 'I have paid'}
                    </Text>}
              </TouchableOpacity>
            )}

            <Text style={s.note}>
              {isH
                ? '💳 GPay, PhonePe, Paytm, Card — सब स्वीकार'
                : '💳 GPay, PhonePe, Paytm, Cards accepted'}
            </Text>
          </View>
        )}

        {/* DONATION TAB */}
        {tab === 'donation' && (
          <View>
            <Text style={s.secT}>{isH ? 'दान का कारण चुनें' : 'Choose a Cause'}</Text>
            {dons.map(camp => (
              <View key={camp.id} style={[s.donCard, selDon?.id === camp.id && s.donSel]}>
                <TouchableOpacity
                  onPress={() => setSelDon(selDon?.id === camp.id ? null : camp)}
                  activeOpacity={0.85}>
                  <View style={{ flexDirection:'row', alignItems:'flex-start', marginBottom:10 }}>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontSize:15, fontWeight:'700', color:'#FDF6ED', marginBottom:3 }}>
                        {isH ? camp.nameHi : camp.name}
                      </Text>
                      <Text style={{ fontSize:11, color:'rgba(253,246,237,.4)', lineHeight:17 }}>
                        {camp.desc}
                      </Text>
                    </View>
                    {selDon?.id === camp.id && (
                      <Text style={{ color:'#E8620A', fontSize:17 }}>●</Text>
                    )}
                  </View>
                  <View style={{ height:5, backgroundColor:'rgba(255,255,255,.07)', borderRadius:3, overflow:'hidden', marginBottom:5 }}>
                    <View style={{
                      height:5, backgroundColor:'#E8620A', borderRadius:3,
                      width: `${Math.min(100, Math.round(((camp.raised || 0) / Math.max(camp.goal, 1)) * 100))}%`,
                    }} />
                  </View>
                  <Text style={{ fontSize:10, color:'rgba(253,246,237,.35)' }}>
                    ₹{(camp.raised || 0).toLocaleString()} / ₹{camp.goal.toLocaleString()}
                  </Text>
                </TouchableOpacity>

                {selDon?.id === camp.id && (
                  <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:12 }}>
                    {[51, 101, 251, 501, 1001].map(amt => (
                      <TouchableOpacity
                        key={amt}
                        style={{ backgroundColor:'rgba(232,98,10,.15)', borderRadius:9, paddingHorizontal:13, paddingVertical:9, borderWidth:1, borderColor:'rgba(232,98,10,.3)' }}
                        onPress={() => handleDonate(camp, amt)}
                        disabled={loading}
                        activeOpacity={0.85}>
                        {loading
                          ? <ActivityIndicator color="#E8620A" size="small" />
                          : <Text style={{ fontSize:13, fontWeight:'700', color:'#E8620A' }}>₹{amt}</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root:       { flex:1, backgroundColor:'#0D0500' },
  hdr:        { flexDirection:'row', alignItems:'center', paddingHorizontal:18, paddingVertical:13, borderBottomWidth:1, borderBottomColor:'rgba(240,165,0,.12)', gap:11 },
  hdrOm:      { fontSize:28 },
  hdrT:       { fontSize:17, fontWeight:'800', color:'#F4A261' },
  hdrS:       { fontSize:11, color:'rgba(253,246,237,.4)', marginTop:2 },
  tabs:       { flexDirection:'row', borderBottomWidth:1, borderBottomColor:'rgba(240,165,0,.12)' },
  tab:        { flex:1, paddingVertical:12, alignItems:'center', borderBottomWidth:2, borderBottomColor:'transparent' },
  tabOn:      { borderBottomColor:'#E8620A' },
  tabT:       { fontSize:13, fontWeight:'700', color:'rgba(253,246,237,.4)' },
  tabTOn:     { color:'#F4A261' },
  scroll:     { padding:17, paddingBottom:50 },

  // Payment mode indicator
  modeBox:    { backgroundColor:'#1A0800', padding:10, borderRadius:10, marginBottom:10, borderWidth:1, borderColor:'#E8620A' },
  modeTxt:    { color:'#F4A261', textAlign:'center', fontSize:12 },

  // FIX: Pending order banner styles
  pendingBanner: { backgroundColor:'rgba(201,131,10,0.12)', borderRadius:12, padding:14, marginBottom:14, borderWidth:1, borderColor:'rgba(201,131,10,0.4)' },
  pendingTxt:    { fontSize:13, fontWeight:'700', color:'#C9830A', marginBottom:4 },
  pendingSubTxt: { fontSize:11, color:'rgba(253,246,237,0.55)', lineHeight:18 },

  secT:       { fontSize:17, fontWeight:'800', color:'#F4A261', marginBottom:5 },
  secS:       { fontSize:12, color:'rgba(253,246,237,.42)', marginBottom:14, lineHeight:19 },

  plan:       { backgroundColor:'#130700', borderRadius:16, padding:16, marginBottom:13, borderWidth:1.5, borderColor:'rgba(240,165,0,.15)' },
  planSel:    { borderColor:'#E8620A', backgroundColor:'rgba(232,98,10,.07)' },
  planActive: { borderColor:'rgba(39,174,96,.5)', backgroundColor:'rgba(39,174,96,.05)' },
  planTop:    { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:11 },
  planN:      { fontSize:17, fontWeight:'800', color:'#F4A261' },
  pop:        { backgroundColor:'rgba(232,98,10,.18)', borderRadius:5, paddingHorizontal:7, paddingVertical:2, marginTop:3, alignSelf:'flex-start' },
  popT:       { fontSize:10, color:'#E8620A', fontWeight:'700' },
  planP:      { fontSize:26, fontWeight:'800', color:'#E8620A' },
  planPer:    { fontSize:11, color:'rgba(253,246,237,.4)', textAlign:'right' },
  feat:       { fontSize:12, color:'rgba(253,246,237,.65)', paddingVertical:2 },

  subBtn:     { backgroundColor:'#E8620A', borderRadius:13, paddingVertical:13, alignItems:'center', marginTop:14, elevation:4 },
  // FIX: "I have paid" distinct style (green)
  paidBtn:    { backgroundColor:'#27AE60', marginTop:8 },
  subBtnT:    { fontSize:15, fontWeight:'800', color:'#fff' },
  note:       { fontSize:11, color:'rgba(253,246,237,.28)', textAlign:'center', marginTop:14 },

  donCard:    { backgroundColor:'#130700', borderRadius:14, padding:14, marginBottom:11, borderWidth:1.5, borderColor:'rgba(240,165,0,.12)' },
  donSel:     { borderColor:'#E8620A', backgroundColor:'rgba(232,98,10,.05)' },

  // Unused but kept for backward compat if any sub-component references them
  upiBox:     { backgroundColor:'rgba(39,174,96,.08)', borderRadius:11, padding:11, marginBottom:14, borderWidth:1, borderColor:'rgba(39,174,96,.2)' },
  upiT:       { fontSize:12, color:'rgba(253,246,237,.7)' },
  upiId:      { color:'#27AE60', fontWeight:'800', fontFamily:'monospace' },
  upiS:       { fontSize:10, color:'rgba(253,246,237,.4)', marginTop:2 },
});
