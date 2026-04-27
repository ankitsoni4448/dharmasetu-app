// ════════════════════════════════════════════════════════════════
// DharmaSetu — usePremiumCheck.js
//
// EXACT FILE LOCATION:
//   D:\DharmaSetu\dharmasetu-app\hooks\usePremiumCheck.js
//
// First create the folder: D:\DharmaSetu\dharmasetu-app\hooks\
// Then create this file inside it.
//
// ── HOW TO USE IN ANY SCREEN ───────────────────────────────────
//
// Example in katha_vault.js or any screen:
//
//   import { usePremiumCheck } from '../../hooks/usePremiumCheck';
//   // (adjust path based on how deep the file is)
//
//   const { isPremium, isFeatureAllowed, PaywallModal, showPaywall } = usePremiumCheck();
//
//   // Check if a feature is allowed:
//   const canDownload = isFeatureAllowed('kathaVaultDownload');
//
//   // If not allowed, show paywall:
//   if (!canDownload) { showPaywall(); return; }
//
//   // Add this anywhere in your JSX to show the paywall popup:
//   <PaywallModal />
// ════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated, Modal, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

// Backend URL — must match your Render URL
const BACKEND_URL = 'https://dharmasetu-backend-2c65.onrender.com';

// Default feature flags — used if backend is offline
const DEFAULT_FLAGS = {
  dharmaChat:         { enabled: true,  isPremium: false, label: 'DharmaChat AI' },
  factCheck:          { enabled: true,  isPremium: false, label: 'Fact Check' },
  myKundli:           { enabled: true,  isPremium: false, label: 'My Kundli' },
  mantraLibrary:      { enabled: true,  isPremium: false, label: 'Mantra Library' },
  kathaVaultRead:     { enabled: true,  isPremium: false, label: 'Katha Vault (Reading)' },
  kathaVaultDownload: { enabled: true,  isPremium: true,  label: 'Katha Vault (Download PDF)' },
  saveAnswer:         { enabled: true,  isPremium: true,  label: 'Save Answers' },
  debateArena:        { enabled: true,  isPremium: false, label: 'Debate Arena (Basic)' },
  debateAdvanced:     { enabled: true,  isPremium: true,  label: 'Debate Arena (Advanced)' },
  peaceMode:          { enabled: true,  isPremium: true,  label: 'Peace Mode' },
  unlimitedQuestions: { enabled: true,  isPremium: true,  label: 'Unlimited Questions' },
  shareCards:         { enabled: true,  isPremium: false, label: 'Share Cards' },
};

/**
 * Custom hook for premium feature checking
 * Returns: { isPremium, isFeatureAllowed, showPaywall, PaywallModal }
 */
export function usePremiumCheck() {
  const [isPremium, setIsPremium] = useState(false);
  const [featureFlags, setFeatureFlags] = useState(DEFAULT_FLAGS);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [blockedFeature, setBlockedFeature] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadPremiumStatus();
    loadFeatureFlags();
  }, []);

  const loadPremiumStatus = async () => {
    try {
      const raw = await AsyncStorage.getItem('dharmasetu_user');
      if (raw) {
        const u = JSON.parse(raw);
        setIsPremium(u.plan === 'pro' || u.plan === 'basic');
      }
      // Also check cached plan
      const plan = await AsyncStorage.getItem('dharmasetu_plan');
      if (plan && plan !== 'free') setIsPremium(true);
    } catch {}
  };

  const loadFeatureFlags = async () => {
    try {
      // Try cached flags first
      const cached = await AsyncStorage.getItem('dharmasetu_features_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Object.keys(parsed).length > 0) setFeatureFlags(parsed);
      }
      // Fetch fresh from backend
      const res = await fetch(`${BACKEND_URL}/config`, { signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined });
      if (res.ok) {
        const data = await res.json();
        if (data.config?.featureFlags) {
          const flags = data.config.featureFlags;
          setFeatureFlags(flags);
          await AsyncStorage.setItem('dharmasetu_features_v2', JSON.stringify(flags));
        }
      }
    } catch {
      // Use defaults — no network needed
    }
  };

  /**
   * Check if a feature is allowed for the current user
   * @param {string} featureName - key from featureFlags (e.g. 'kathaVaultDownload')
   * @returns {boolean}
   */
  const isFeatureAllowed = (featureName) => {
    const flag = featureFlags[featureName] || DEFAULT_FLAGS[featureName];
    if (!flag) return true; // unknown feature = allow
    if (!flag.enabled) return false; // disabled for everyone
    if (flag.isPremium && !isPremium) return false; // premium only
    return true;
  };

  /**
   * Show the paywall modal for a specific feature
   * @param {string} featureName - The feature that was blocked
   */
  const showPaywall = (featureName = '') => {
    const flag = featureFlags[featureName] || DEFAULT_FLAGS[featureName];
    setBlockedFeature(flag?.label || featureName || 'this feature');
    setPaywallVisible(true);
    Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  };

  const hidePaywall = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setPaywallVisible(false));
  };

  const goToPremium = () => {
    hidePaywall();
    setTimeout(() => {
      router.push('/payment');
    }, 200);
  };

  /**
   * Paywall Modal component — add <PaywallModal /> anywhere in your JSX
   */
  const PaywallModal = () => (
    <Modal visible={paywallVisible} transparent animationType="none" onRequestClose={hidePaywall}>
      <Animated.View style={[pw.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[pw.box, { transform: [{ scale: fadeAnim.interpolate({ inputRange: [0,1], outputRange: [0.9,1] }) }] }]}>
          <Text style={pw.icon}>👑</Text>
          <Text style={pw.title}>Premium Feature</Text>
          <Text style={pw.sub}>
            <Text style={pw.feature}>{blockedFeature}</Text>
            {' '}is available for Premium members.
          </Text>
          <View style={pw.features}>
            {['Unlimited DharmaChat questions','All Debate levels + Peace Mode','Download Katha Vault PDFs','Save unlimited answers','No ads — pure Dharmic focus'].map((f,i) => (
              <Text key={i} style={pw.feat}>✓ {f}</Text>
            ))}
          </View>
          <TouchableOpacity style={pw.btn} onPress={goToPremium} activeOpacity={0.85}>
            <Text style={pw.btnT}>🙏 Upgrade to Premium →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={pw.skip} onPress={hidePaywall}>
            <Text style={pw.skipT}>Maybe later</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );

  return {
    isPremium,
    featureFlags,
    isFeatureAllowed,
    showPaywall,
    PaywallModal,
    refreshPremiumStatus: loadPremiumStatus,
  };
}

const pw = StyleSheet.create({
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.82)', alignItems:'center', justifyContent:'center', padding:24 },
  box: { backgroundColor:'#130700', borderRadius:24, padding:24, width:'100%', maxWidth:360, borderWidth:1.5, borderColor:'rgba(240,165,0,0.3)', alignItems:'center' },
  icon: { fontSize:44, marginBottom:12 },
  title: { fontSize:22, fontWeight:'800', color:'#F4A261', marginBottom:8 },
  sub: { fontSize:14, color:'rgba(253,246,237,0.65)', textAlign:'center', lineHeight:22, marginBottom:16 },
  feature: { color:'#E8620A', fontWeight:'700' },
  features: { width:'100%', backgroundColor:'rgba(255,255,255,0.04)', borderRadius:12, padding:14, marginBottom:20, borderWidth:1, borderColor:'rgba(240,165,0,0.1)' },
  feat: { fontSize:13, color:'rgba(253,246,237,0.75)', paddingVertical:3, lineHeight:20 },
  btn: { backgroundColor:'#E8620A', borderRadius:14, paddingVertical:15, paddingHorizontal:24, width:'100%', alignItems:'center', elevation:5 },
  btnT: { color:'#fff', fontSize:16, fontWeight:'800' },
  skip: { marginTop:14, paddingVertical:8 },
  skipT: { fontSize:13, color:'rgba(253,246,237,0.35)' },
});