// DharmaSetu — PremiumGate
// FILE: app/components/PremiumGate.js
// Reusable premium feature gate — wraps any child content
// ════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { safeGet, KEYS } from '../utils/storage';

const { width: SW } = Dimensions.get('window');
const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://dharmasetu-backend-2c65.onrender.com';

// ── Server-side premium check (cannot be faked via AsyncStorage) ──
async function verifyPremiumServer(phone) {
  if (!phone) return false;
  try {
    const res = await fetch(`${BACKEND}/users/access/${phone}`, { signal: AbortSignal.timeout(6000) });
    const data = await res.json();
    return data.isPremium === true;
  } catch {
    return null; // null = unknown (network error), don't block
  }
}

// ════════════════════════════════════════════════════════════════
// UPGRADE SHEET — bottom sheet modal
// ════════════════════════════════════════════════════════════════
function UpgradeSheet({ visible, featureName, onClose }) {
  const slideY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 60, friction: 12 }).start();
    } else {
      Animated.timing(slideY, { toValue: 400, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  const PERKS = [
    '💬 Unlimited DharmaChat questions',
    '📚 Full Dharmic Library access',
    '🔯 Detailed Kundli analysis',
    '📿 All premium mantras + audio',
    '🛡️ Advanced Fact-Check',
    '⭐ Priority AI responses',
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[s.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={s.handle} />
        <Text style={s.lockIco}>⭐</Text>
        <Text style={s.sheetTitle}>Premium Feature</Text>
        <Text style={s.sheetSub}>
          {featureName
            ? `"${featureName}" requires Premium`
            : 'This feature requires a Premium subscription'}
        </Text>
        <View style={s.perksBox}>
          {PERKS.map((p, i) => (
            <Text key={i} style={s.perk}>{p}</Text>
          ))}
        </View>
        <View style={s.priceRow}>
          <View style={s.priceCard}>
            <Text style={s.priceAmt}>₹99</Text>
            <Text style={s.priceLbl}>Basic / mo</Text>
          </View>
          <View style={[s.priceCard, s.priceCardPro]}>
            <Text style={[s.priceAmt, { color: '#F4A261' }]}>₹249</Text>
            <Text style={s.priceLbl}>Pro / mo</Text>
            <View style={s.popularBadge}><Text style={s.popularTxt}>POPULAR</Text></View>
          </View>
        </View>
        <TouchableOpacity
          style={s.upgradeBtn}
          onPress={() => { onClose(); router.push('/payment'); }}
          activeOpacity={0.88}
        >
          <Text style={s.upgradeBtnTxt}>🚀 Upgrade to Premium</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
          <Text style={s.cancelTxt}>Maybe later</Text>
        </TouchableOpacity>
        <View style={{ height: 20 }} />
      </Animated.View>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN EXPORT — PremiumGate wrapper component
//
// Usage:
//   <PremiumGate featureName="Kundli Analysis">
//     <KundliScreen />
//   </PremiumGate>
//
// OR as a hook:
//   const { isPremium, Gate, showGate } = usePremiumGate();
// ════════════════════════════════════════════════════════════════
export default function PremiumGate({
  children,
  featureName,
  // If true, do a live server check (slower but secure). Default: false (use cached)
  serverVerify = false,
  // If true, always show children regardless (for free features)
  alwaysFree = false,
  // Fallback component shown while checking premium status
  loadingComponent = null,
}) {
  const [isPremium, setIsPremium]   = useState(null); // null = loading
  const [showUpgrade, setShowUpgrade] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (alwaysFree) { setIsPremium(true); return; }
    (async () => {
      // Step 1: Read local cache (fast)
      const user = await safeGet(KEYS.USER);
      const localPremium = user?.plan && user.plan !== 'free';
      if (isMounted.current) setIsPremium(localPremium);

      // Step 2: Server verify if requested (authoritative)
      if (serverVerify && user?.phone) {
        const serverResult = await verifyPremiumServer(user.phone);
        if (serverResult !== null && isMounted.current) {
          setIsPremium(serverResult);
        }
      }
    })();
  }, [alwaysFree, serverVerify]);

  if (alwaysFree) return children;
  if (isPremium === null) return loadingComponent || null;
  if (isPremium) return children;

  // Not premium — show gate UI
  return (
    <>
      <UpgradeSheet
        visible={showUpgrade}
        featureName={featureName}
        onClose={() => setShowUpgrade(false)}
      />
      <TouchableOpacity
        style={s.gateWrapper}
        onPress={() => setShowUpgrade(true)}
        activeOpacity={0.9}
      >
        <View style={s.gateOverlay}>
          <Text style={s.gateLock}>🔒</Text>
          <Text style={s.gateTitle}>Premium Feature</Text>
          {featureName ? <Text style={s.gateSub}>{featureName}</Text> : null}
          <View style={s.gateCta}>
            <Text style={s.gateCtaTxt}>Upgrade to unlock →</Text>
          </View>
        </View>
        {/* Blurred children preview */}
        <View style={s.blurWrapper} pointerEvents="none">
          {children}
        </View>
      </TouchableOpacity>
    </>
  );
}

// ── Hook version ─────────────────────────────────────────────────
export function usePremiumGate({ serverVerify = false } = {}) {
  const [isPremium, setIsPremium]   = useState(null);
  const [showGate,  setShowGate]    = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    (async () => {
      const user = await safeGet(KEYS.USER);
      const local = user?.plan && user.plan !== 'free';
      if (isMounted.current) setIsPremium(local);
      if (serverVerify && user?.phone) {
        const srv = await verifyPremiumServer(user.phone);
        if (srv !== null && isMounted.current) setIsPremium(srv);
      }
    })();
  }, [serverVerify]);

  const requirePremium = (callback) => {
    if (isPremium) { callback?.(); }
    else            { setShowGate(true); }
  };

  const Gate = ({ featureName }) => (
    <UpgradeSheet
      visible={showGate}
      featureName={featureName}
      onClose={() => setShowGate(false)}
    />
  );

  return { isPremium, isLoading: isPremium === null, Gate, showGate: () => setShowGate(true), requirePremium };
}

// ════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  backdrop:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10 },
  sheet:        { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#160800', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, zIndex: 11, borderTopWidth: 1, borderColor: 'rgba(240,165,0,0.2)' },
  handle:       { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 16 },
  lockIco:      { fontSize: 36, textAlign: 'center', marginBottom: 6 },
  sheetTitle:   { fontSize: 20, fontWeight: '800', color: '#F4A261', textAlign: 'center', marginBottom: 6 },
  sheetSub:     { fontSize: 13, color: 'rgba(253,246,237,0.5)', textAlign: 'center', marginBottom: 16 },
  perksBox:     { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, marginBottom: 16 },
  perk:         { fontSize: 13, color: 'rgba(253,246,237,0.8)', marginBottom: 6 },
  priceRow:     { flexDirection: 'row', gap: 10, marginBottom: 16 },
  priceCard:    { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,130,40,0.25)', backgroundColor: 'rgba(255,255,255,0.04)' },
  priceCardPro: { borderColor: '#F4A261', backgroundColor: 'rgba(244,162,97,0.08)', position: 'relative' },
  priceAmt:     { fontSize: 22, fontWeight: '800', color: '#FDF6ED' },
  priceLbl:     { fontSize: 11, color: 'rgba(253,246,237,0.4)', marginTop: 2 },
  popularBadge: { position: 'absolute', top: -8, right: 8, backgroundColor: '#E8620A', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  popularTxt:   { fontSize: 9, color: '#fff', fontWeight: '800' },
  upgradeBtn:   { backgroundColor: '#E8620A', borderRadius: 14, paddingVertical: 15, alignItems: 'center', elevation: 4, shadowColor: '#E8620A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6 },
  upgradeBtnTxt:{ color: '#fff', fontSize: 16, fontWeight: '800' },
  cancelBtn:    { alignItems: 'center', paddingVertical: 12 },
  cancelTxt:    { color: 'rgba(253,246,237,0.3)', fontSize: 13 },

  // Gate wrapper
  gateWrapper:  { flex: 1, position: 'relative', overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(240,165,0,0.2)' },
  gateOverlay:  { ...StyleSheet.absoluteFillObject, zIndex: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(13,5,0,0.82)', borderRadius: 16 },
  gateLock:     { fontSize: 32, marginBottom: 8 },
  gateTitle:    { fontSize: 17, fontWeight: '800', color: '#F4A261', marginBottom: 4 },
  gateSub:      { fontSize: 12, color: 'rgba(253,246,237,0.5)', marginBottom: 14 },
  gateCta:      { backgroundColor: 'rgba(232,98,10,0.18)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(232,98,10,0.35)' },
  gateCtaTxt:   { color: '#F4A261', fontSize: 13, fontWeight: '700' },
  blurWrapper:  { opacity: 0.2 },
});
