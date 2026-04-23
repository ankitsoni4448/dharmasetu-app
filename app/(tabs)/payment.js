// ════════════════════════════════════════════════════════════════
// DharmaSetu — Payment Screen FINAL
//
// FILE LOCATION: D:\DharmaSetu\dharmasetu-app\app\(tabs)\payment.js
//
// HOW IT WORKS:
// - Fetches payment config from backend (PhonePe UPI or Razorpay)
// - Admin switches between UPI/Razorpay from admin dashboard
// - Transactions logged to backend → saved to GitHub Gist permanently
// ════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BACKEND_URL = 'https://dharmasetu-backend-2c65.onrender.com';

// Default plans (shown if backend offline)
const DEFAULT_PLANS = [
  { id:'basic', name:'Basic', nameHi:'बेसिक', price:99, active:true, features:['30 questions/day','15 fact-checks/day','Mantra Verify','Save answers','No ads'] },
  { id:'pro',   name:'Pro',   nameHi:'प्रो',  price:249, active:true, popular:true, features:['Unlimited questions','Unlimited fact-checks','All levels','Peace Mode','No ads'] },
];
const DEFAULT_DONS = [
  { id:'army',   name:'Army Welfare',    nameHi:'सेना कल्याण',       desc:'Support Indian Army welfare', goal:100000, raised:0 },
  { id:'temple', name:'Temple Restore',  nameHi:'मंदिर जीर्णोद्धार', desc:'Restore ancient temples',    goal:500000, raised:0 },
  { id:'dharma', name:'Dharma Education',nameHi:'धर्म शिक्षा',       desc:'Educate youth about Dharma',  goal:250000, raised:0 },
];

// ─── Backend helpers ──────────────────────────────────────────────
async function logToBackend(path, body) {
  try {
    await fetch(`${BACKEND_URL}${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch(e) { console.log('[Payment] Backend log failed:', e.message); }
}

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('subscription');
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [dons, setDons] = useState(DEFAULT_DONS);
  const [selPlan, setSelPlan] = useState(null);
  const [selDon, setSelDon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [currentPlan, setCurrentPlan] = useState('free');
  const [payConfig, setPayConfig] = useState({
    phonepeUPI: '', razorpayKeyId: '', subscriptionPayment: 'upi',
    donationPayment: 'upi', hasRazorpay: false,
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const raw = await AsyncStorage.getItem('dharmasetu_user');
      if (raw) { const u = JSON.parse(raw); setUser(u); setCurrentPlan(u.plan || 'free'); }
      // Load from backend cache
      const bRaw = await AsyncStorage.getItem('dharmasetu_bundles');
      if (bRaw) { const p = JSON.parse(bRaw); if (p?.length) setPlans(p); }
      const dRaw = await AsyncStorage.getItem('dharmasetu_donations');
      if (dRaw) { const d = JSON.parse(dRaw); if (d?.length) setDons(d); }
      // Load payment config from backend
      try {
        const r = await fetch(`${BACKEND_URL}/payment/config`);
        if (r.ok) { const d = await r.json(); if (d.success) setPayConfig(d); }
      } catch {}
    } catch {}
  };

  const isH = user?.language === 'hindi';

  // ─── Subscribe via UPI ──────────────────────────────────────────
  const subscribeUPI = async (plan) => {
    const upiId = payConfig.phonepeUPI;
    if (!upiId) {
      Alert.alert(isH ? 'Payment Setup' : 'Payment Setup', isH ? 'Payment method not configured. Please contact support.' : 'Payment not configured. Contact support.'); return;
    }
    const orderId = `upi_${Date.now()}`;
    // Log to backend
    await logToBackend('/payment/confirm', { orderId, phone: user?.phone || '', planId: plan.id });
    // Open UPI
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=DharmaSetu&am=${plan.price}&cu=INR&tn=${encodeURIComponent('DharmaSetu '+plan.name)}`;
    try {
      const ok = await Linking.canOpenURL(upiLink);
      if (ok) await Linking.openURL(upiLink);
      else {
        // Try PhonePe direct
        const pp = `phonepe://pay?pa=${encodeURIComponent(upiId)}&am=${plan.price}`;
        const ppOk = await Linking.canOpenURL(pp);
        if (ppOk) await Linking.openURL(pp);
        else await Linking.openURL(`https://rzp.io/l/dharmasetu`);
      }
      Alert.alert(
        isH ? '🙏 भुगतान करें' : '🙏 Complete Payment',
        isH ? `UPI ID: ${upiId}\nAmount: ₹${plan.price}\n\nPayment complete होने के बाद नीचे tap करें।` : `UPI ID: ${upiId}\nAmount: ₹${plan.price}\n\nTap below after payment is done.`,
        [
          { text: isH ? '✓ हो गया' : '✓ Done', onPress: () => activatePlan(plan, orderId) },
          { text: isH ? 'बाद में' : 'Later', style: 'cancel' },
        ]
      );
    } catch(e) {
      Alert.alert('UPI', isH ? `UPI ID: ${upiId}\nAmount: ₹${plan.price}\n\nManually pay and contact support.` : `Pay ₹${plan.price} to UPI: ${upiId}`);
    }
  };

  // ─── Subscribe via Razorpay ─────────────────────────────────────
  const subscribeRazorpay = async (plan) => {
    setLoading(true);
    try {
      // Create order on backend
      const r = await fetch(`${BACKEND_URL}/payment/razorpay/order`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: plan.price, type: 'subscription', planId: plan.id, phone: user?.phone || '' }),
      });
      const data = await r.json();
      if (!data.success) throw new Error(data.error || 'Order creation failed');

      // Open Razorpay
      const rzpUrl = `https://api.razorpay.com/v1/checkout/embedded?key_id=${data.keyId}&order_id=${data.orderId}&amount=${data.amount}&currency=INR&name=DharmaSetu&description=${encodeURIComponent(plan.name+' Plan')}`;
      await Linking.openURL(rzpUrl);

      Alert.alert(
        isH ? '🙏 भुगतान' : '🙏 Payment',
        isH ? 'Razorpay में payment complete करें। Done होने के बाद नीचे tap करें।' : 'Complete payment in Razorpay, then tap Done.',
        [
          { text: isH ? '✓ हो गया' : '✓ Done', onPress: () => activatePlan(plan, data.orderId) },
          { text: isH ? 'बाद में' : 'Later', style: 'cancel' },
        ]
      );
    } catch(e) {
      Alert.alert(isH ? 'Error' : 'Error', e.message);
    }
    setLoading(false);
  };

  const activatePlan = async (plan, orderId) => {
    const updated = { ...(user || {}), plan: plan.id };
    await AsyncStorage.setItem('dharmasetu_user', JSON.stringify(updated));
    await AsyncStorage.setItem('dharmasetu_plan', plan.id);
    setCurrentPlan(plan.id); setUser(updated);
    // Confirm to backend
    await logToBackend('/payment/confirm', { orderId, phone: user?.phone || '', planId: plan.id });
    Alert.alert('🎉', isH ? `${plan.nameHi} प्लान activate हो गया! 🕉` : `${plan.name} plan activated! 🕉`);
  };

  const handleSubscribe = async (plan) => {
    if (loading) return; setLoading(true);
    const method = payConfig.subscriptionPayment || 'upi';
    if (method === 'razorpay' && payConfig.hasRazorpay) await subscribeRazorpay(plan);
    else await subscribeUPI(plan);
    setLoading(false);
  };

  const handleDonate = async (camp, amount) => {
    const amt = parseInt(amount);
    if (!amt || amt < 10) { Alert.alert('', isH ? '₹10 minimum' : 'Minimum ₹10'); return; }
    setLoading(true);
    const method = payConfig.donationPayment || 'upi';
    const upiId = payConfig.phonepeUPI;
    if (!upiId) { Alert.alert('', 'Payment not configured'); setLoading(false); return; }
    const orderId = `don_${Date.now()}`;
    await logToBackend('/payment/confirm', { orderId, phone: user?.phone || '', planId: 'donation_'+camp.id });
    try {
      const link = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=DharmaSetu+Seva&am=${amt}&cu=INR&tn=${encodeURIComponent('Donation: '+camp.name)}`;
      const ok = await Linking.canOpenURL(link);
      if (ok) await Linking.openURL(link); else await Linking.openURL('https://rzp.io/l/dharmasetu');
      Alert.alert(isH ? '🙏 धन्यवाद!' : '🙏 Thank you!', isH ? `₹${amt} का दान ${camp.nameHi} के लिए।` : `₹${amt} donation to ${camp.name}.`);
    } catch {}
    setLoading(false);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#0D0500"/>
      <View style={s.hdr}>
        <Text style={s.hdrOm}>🕉</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.hdrT}>DharmaSetu Premium</Text>
          <Text style={s.hdrS}>{currentPlan !== 'free' ? `✅ ${isH ? 'आपका प्लान' : 'Your plan'}: ${currentPlan.toUpperCase()}` : (isH ? 'Dharmic journey गहरी बनाएं' : 'Deepen your Dharmic journey')}</Text>
        </View>
      </View>

      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab==='subscription'&&s.tabOn]} onPress={()=>setTab('subscription')}><Text style={[s.tabT, tab==='subscription'&&s.tabTOn]}>{isH?'⭐ सदस्यता':'⭐ Subscribe'}</Text></TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab==='donation'&&s.tabOn]} onPress={()=>setTab('donation')}><Text style={[s.tabT, tab==='donation'&&s.tabTOn]}>{isH?'🙏 दान करें':'🙏 Donate'}</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {payConfig.phonepeUPI && (
          <View style={s.upiBox}>
            <Text style={s.upiT}>💳 {isH ? 'UPI ID:' : 'UPI ID:'} <Text style={s.upiId}>{payConfig.phonepeUPI}</Text></Text>
            <Text style={s.upiS}>{isH ? 'GPay, PhonePe, Paytm, BHIM — सब काम करेंगे' : 'Pay via GPay, PhonePe, Paytm, BHIM'}</Text>
          </View>
        )}

        {tab === 'subscription' && (
          <View>
            <Text style={s.secT}>{isH?'अपना प्लान चुनें':'Choose Your Plan'}</Text>
            <Text style={s.secS}>{isH?'Premium लेकर Dharmic journey को और गहरा बनाएं।':'Unlock the full power of DharmaSetu.'}</Text>
            {plans.filter(p=>p.active!==false).map(plan=>(
              <TouchableOpacity key={plan.id} style={[s.plan, selPlan?.id===plan.id&&s.planSel, plan.id===currentPlan&&s.planActive]} onPress={()=>setSelPlan(plan)} activeOpacity={0.85}>
                <View style={s.planTop}>
                  <View>
                    <Text style={s.planN}>{isH?plan.nameHi:plan.name}</Text>
                    {plan.popular&&<View style={s.pop}><Text style={s.popT}>{isH?'⭐ सबसे लोकप्रिय':'⭐ Most Popular'}</Text></View>}
                    {plan.id===currentPlan&&<View style={[s.pop,{backgroundColor:'rgba(39,174,96,.15)'}]}><Text style={[s.popT,{color:'#27AE60'}]}>{isH?'✅ आपका प्लान':'✅ Current Plan'}</Text></View>}
                  </View>
                  <View style={{alignItems:'flex-end'}}>
                    <Text style={s.planP}>₹{plan.price}</Text>
                    <Text style={s.planPer}>{isH?'/माह':'/month'}</Text>
                  </View>
                </View>
                {(plan.features||[]).map((f,i)=><Text key={i} style={s.feat}>✓  {f}</Text>)}
                {selPlan?.id===plan.id&&plan.id!==currentPlan&&(
                  <TouchableOpacity style={s.subBtn} onPress={()=>handleSubscribe(plan)} disabled={loading} activeOpacity={0.85}>
                    {loading?<ActivityIndicator color="#fff" size="small"/>:<Text style={s.subBtnT}>{isH?`₹${plan.price} में शुरू करें →`:`Start for ₹${plan.price} →`}</Text>}
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
            <Text style={s.note}>{isH?'💳 GPay, PhonePe, Paytm, Card — सब स्वीकार':'💳 GPay, PhonePe, Paytm, Cards accepted'}</Text>
          </View>
        )}

        {tab === 'donation' && (
          <View>
            <Text style={s.secT}>{isH?'दान का कारण चुनें':'Choose a Cause'}</Text>
            {dons.map(camp=>(
              <View key={camp.id} style={[s.donCard, selDon?.id===camp.id&&s.donSel]}>
                <TouchableOpacity onPress={()=>setSelDon(selDon?.id===camp.id?null:camp)} activeOpacity={0.85}>
                  <View style={{flexDirection:'row',alignItems:'flex-start',marginBottom:10}}>
                    <View style={{flex:1}}>
                      <Text style={{fontSize:15,fontWeight:'700',color:'#FDF6ED',marginBottom:3}}>{isH?camp.nameHi:camp.name}</Text>
                      <Text style={{fontSize:11,color:'rgba(253,246,237,.4)',lineHeight:17}}>{camp.desc}</Text>
                    </View>
                    {selDon?.id===camp.id&&<Text style={{color:'#E8620A',fontSize:17}}>●</Text>}
                  </View>
                  <View style={{height:5,backgroundColor:'rgba(255,255,255,.07)',borderRadius:3,overflow:'hidden',marginBottom:5}}><View style={{height:5,backgroundColor:'#E8620A',borderRadius:3,width:`${Math.min(100,Math.round(((camp.raised||0)/Math.max(camp.goal,1))*100))}%`}}/></View>
                  <Text style={{fontSize:10,color:'rgba(253,246,237,.35)'}}>₹{(camp.raised||0).toLocaleString()} / ₹{camp.goal.toLocaleString()}</Text>
                </TouchableOpacity>
                {selDon?.id===camp.id&&(
                  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:12}}>
                    {[51,101,251,501,1001].map(amt=>(
                      <TouchableOpacity key={amt} style={{backgroundColor:'rgba(232,98,10,.15)',borderRadius:9,paddingHorizontal:13,paddingVertical:9,borderWidth:1,borderColor:'rgba(232,98,10,.3)'}} onPress={()=>handleDonate(camp,amt)} disabled={loading} activeOpacity={0.85}>
                        {loading?<ActivityIndicator color="#E8620A" size="small"/>:<Text style={{fontSize:13,fontWeight:'700',color:'#E8620A'}}>₹{amt}</Text>}
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

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#0D0500'},
  hdr:{flexDirection:'row',alignItems:'center',paddingHorizontal:18,paddingVertical:13,borderBottomWidth:1,borderBottomColor:'rgba(240,165,0,.12)',gap:11},
  hdrOm:{fontSize:28},
  hdrT:{fontSize:17,fontWeight:'800',color:'#F4A261'},
  hdrS:{fontSize:11,color:'rgba(253,246,237,.4)',marginTop:2},
  tabs:{flexDirection:'row',borderBottomWidth:1,borderBottomColor:'rgba(240,165,0,.12)'},
  tab:{flex:1,paddingVertical:12,alignItems:'center',borderBottomWidth:2,borderBottomColor:'transparent'},
  tabOn:{borderBottomColor:'#E8620A'},
  tabT:{fontSize:13,fontWeight:'700',color:'rgba(253,246,237,.4)'},
  tabTOn:{color:'#F4A261'},
  scroll:{padding:17,paddingBottom:50},
  upiBox:{backgroundColor:'rgba(39,174,96,.08)',borderRadius:11,padding:11,marginBottom:14,borderWidth:1,borderColor:'rgba(39,174,96,.2)'},
  upiT:{fontSize:12,color:'rgba(253,246,237,.7)'},
  upiId:{color:'#27AE60',fontWeight:'800',fontFamily:'monospace'},
  upiS:{fontSize:10,color:'rgba(253,246,237,.4)',marginTop:2},
  secT:{fontSize:17,fontWeight:'800',color:'#F4A261',marginBottom:5},
  secS:{fontSize:12,color:'rgba(253,246,237,.42)',marginBottom:14,lineHeight:19},
  plan:{backgroundColor:'#130700',borderRadius:16,padding:16,marginBottom:13,borderWidth:1.5,borderColor:'rgba(240,165,0,.15)'},
  planSel:{borderColor:'#E8620A',backgroundColor:'rgba(232,98,10,.07)'},
  planActive:{borderColor:'rgba(39,174,96,.5)',backgroundColor:'rgba(39,174,96,.05)'},
  planTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:11},
  planN:{fontSize:17,fontWeight:'800',color:'#F4A261'},
  pop:{backgroundColor:'rgba(232,98,10,.18)',borderRadius:5,paddingHorizontal:7,paddingVertical:2,marginTop:3,alignSelf:'flex-start'},
  popT:{fontSize:10,color:'#E8620A',fontWeight:'700'},
  planP:{fontSize:26,fontWeight:'800',color:'#E8620A'},
  planPer:{fontSize:11,color:'rgba(253,246,237,.4)',textAlign:'right'},
  feat:{fontSize:12,color:'rgba(253,246,237,.65)',paddingVertical:2},
  subBtn:{backgroundColor:'#E8620A',borderRadius:13,paddingVertical:13,alignItems:'center',marginTop:14,elevation:4},
  subBtnT:{fontSize:15,fontWeight:'800',color:'#fff'},
  note:{fontSize:11,color:'rgba(253,246,237,.28)',textAlign:'center',marginTop:14},
  donCard:{backgroundColor:'#130700',borderRadius:14,padding:14,marginBottom:11,borderWidth:1.5,borderColor:'rgba(240,165,0,.12)'},
  donSel:{borderColor:'#E8620A',backgroundColor:'rgba(232,98,10,.05)'},
});