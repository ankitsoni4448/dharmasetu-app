// DharmaSetu — App Config
// EXACT FILE LOCATION: D:\DharmaSetu\dharmasetu-app\app_config.js
// This file is in the ROOT of the project, NOT inside the app folder
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BACKEND_URL = 'https://dharmasetu-backend-2c65.onrender.com';

export async function fetchAndCacheConfig() {
  try {
    const res = await fetch(`${BACKEND_URL}/config`, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (data.success && data.config) {
      const c = data.config;
      await AsyncStorage.setItem('dharmasetu_premium_price', String(c.premiumPrice || 249));
      await AsyncStorage.setItem('dharmasetu_basic_price', String(c.basicPrice || 99));
      await AsyncStorage.setItem('dharmasetu_free_qs', String(c.freeQuestionsLimit || 3));
      await AsyncStorage.setItem('dharmasetu_free_fc', String(c.freeFactCheckLimit || 3));
      if (c.bundles?.length) await AsyncStorage.setItem('dharmasetu_bundles', JSON.stringify(c.bundles));
      if (c.donations?.length) await AsyncStorage.setItem('dharmasetu_donations', JSON.stringify(c.donations));
      await AsyncStorage.setItem('dharmasetu_features', JSON.stringify({
        kathaVault: c.kathaVaultEnabled !== false,
        factCheck: c.factCheckEnabled !== false,
        debate: c.debateEnabled !== false,
        mantraVerify: c.mantraVerifyEnabled !== false,
        peaceMode: c.peaceModeEnabled !== false,
        donations: c.donationEnabled !== false,
        maintenance: c.maintenanceMode || false,
      }));
      console.log('[DharmaSetu] Config loaded from backend ✓');
    }
  } catch {
    console.log('[DharmaSetu] Backend offline — using cached config');
  }
}

export async function isFeatureEnabled(name) {
  try {
    const raw = await AsyncStorage.getItem('dharmasetu_features');
    if (raw) return JSON.parse(raw)[name] !== false;
  } catch {}
  return true;
}