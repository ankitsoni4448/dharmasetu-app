// DharmaSetu — App Config
// EXACT FILE LOCATION: D:\DharmaSetu\dharmasetu-app\app_config.js
// Android-safe: no AbortSignal.timeout
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_CONFIG, backendFetch } from './utils/backend-config';

// Export for backward compatibility with existing code
export const BACKEND_URL = BACKEND_CONFIG.URL;

export async function fetchAndCacheConfig() {
  const startTime = Date.now();
  try {
    console.log(`[DharmaSetu] Fetching config from ${BACKEND_CONFIG.URL}/config...`);
    // ══ PHASE 1 FIX: Increased timeout from 8s to 35s ══
    // Reason: Render free tier apps hibernate after 30min inactivity
    // Cold start wake-up takes 30-50 seconds. 35s allows for app wake-up + network latency
    const res = await backendFetch(BACKEND_CONFIG.ENDPOINTS.CONFIG, {
      timeout: BACKEND_CONFIG.TIMEOUT,
      retries: 1,
      retryDelay: 2000,
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`[DharmaSetu] Backend responded: HTTP ${res.status} (${elapsed}ms)`);
    
    if (!res.ok) throw new Error(`Config HTTP ${res.status}`);

    const data = await res.json();
    console.log('[DharmaSetu] Response received:', JSON.stringify(data).slice(0, 80) + '...');
    
    if (data.success && data.config) {
      const c = data.config;
      await AsyncStorage.setItem('dharmasetu_premium_price', String(c.premiumPrice || 249));
      await AsyncStorage.setItem('dharmasetu_basic_price',   String(c.basicPrice || 99));
      await AsyncStorage.setItem('dharmasetu_free_qs',       String(c.freeQuestionsLimit || 3));
      await AsyncStorage.setItem('dharmasetu_free_fc',       String(c.freeFactCheckLimit || 3));
      if (c.bundles?.length)   await AsyncStorage.setItem('dharmasetu_bundles',   JSON.stringify(c.bundles));
      if (c.donations?.length) await AsyncStorage.setItem('dharmasetu_donations', JSON.stringify(c.donations));
      if (c.featureFlags)      await AsyncStorage.setItem('dharmasetu_features_v2', JSON.stringify(c.featureFlags));
      await AsyncStorage.setItem('dharmasetu_features', JSON.stringify({
        kathaVault:    c.kathaVaultEnabled   !== false,
        factCheck:     c.factCheckEnabled    !== false,
        debate:        c.debateEnabled       !== false,
        mantraVerify:  c.mantraVerifyEnabled !== false,
        peaceMode:     c.peaceModeEnabled    !== false,
        donations:     c.donationEnabled     !== false,
        maintenance:   c.maintenanceMode     || false,
      }));
      console.log('[DharmaSetu] Config cached successfully ✓');
    } else {
      console.warn('[DharmaSetu] Response missing success/config:', {
        success: data.success,
        hasConfig: !!data.config,
        responseKeys: data ? Object.keys(data) : 'null',
      });
      console.log('[DharmaSetu] Backend sent response, but missing config — using cached');
    }
  } catch (e) {
    const elapsed = Date.now() - startTime;
    console.error('[DharmaSetu] Backend fetch failed:', {
      error: e.message,
      elapsedMs: elapsed,
      url: BACKEND_CONFIG.URL,
      timeout: elapsed > BACKEND_CONFIG.TIMEOUT ? 'YES (exceeded timeout)' : 'NO',
    });
    console.log('[DharmaSetu] Using cached config (may be stale)');
  }
}

export async function isFeatureEnabled(name) {
  try {
    const raw = await AsyncStorage.getItem('dharmasetu_features');
    if (raw) return JSON.parse(raw)[name] !== false;
  } catch {}
  return true;
}
