// ════════════════════════════════════════════════════════════════
// DharmaSetu — Safe AsyncStorage Wrapper
// FILE: app/utils/storage.js
//
// Purpose:
//  - Eliminates bare JSON.parse crashes across 6+ files
//  - Centralises all AsyncStorage key names
//  - Provides atomic logout (clearUserSession)
//  - Provides JWT token helpers (for future backend auth)
// ════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── ALL ASYNCSTORAGE KEYS IN ONE PLACE ──────────────────────────
// Import this object anywhere instead of using raw strings
export const KEYS = {
  // User session
  USER:              'dharmasetu_user',
  AUTH_TOKEN:        'dharmasetu_auth_token',
  AUTH_TOKEN_EXPIRY: 'dharmasetu_auth_token_expiry',
  USER_LANGUAGE:     'user_language',
  USER_CITY:         'user_city',
  USER_LAST_MOOD:    'user_last_mood',
  MOOD_HISTORY:      'user_mood_history',

  // Gamification
  PTS:               'dharmasetu_pts',
  STREAK_COUNT:      'dharmasetu_streak_count',
  LAST_OPEN:         'dharmasetu_last_open',
  CHECKIN:           'dharmasetu_checkin',
  LAST_INSIGHT:      'dharmasetu_last_insight',

  // Japa
  JAPA_COUNT:        'current_japa_count',
  JAPA_TARGET:       'current_japa_target',

  // Plan / premium
  PLAN:              'dharmasetu_plan',
  BUNDLES:           'dharmasetu_bundles',
  DONATIONS:         'dharmasetu_donations',
  FREE_PLAN_CONFIG:  'dharmasetu_free_qs',
  FEATURES:          'dharmasetu_features',

  // Payment
  PAYMENT_PENDING_ORDER: 'payment_pending_order_id',
  PAYMENT_PENDING_PLAN:  'payment_pending_plan',

  // Panchang cache (dynamic — use getPanchangKey(date) below)
  PANCHANG_TODAY:    'today_panchang',

  // Content
  SAVED_ANSWERS:     'dharmasetu_saved',
  FEEDBACK:          'dharmasetu_feedback',
  PRESET_QUESTION:   'dharmasetu_preset_question',
  MODE:              'dharmasetu_mode',

  // Mantra favorites
  MANTRA_FAVORITES:  'dharmasetu_mantra_favorites',
  MANTRA_RECENT:     'dharmasetu_mantra_recent',

  // Daily quota
  DAILY_QUOTA:       'ds_daily_quota',
};

// Dynamic key helper — avoids stale panchang when date changes
export function getPanchangKey(city = 'default') {
  const d = new Date();
  return `panchang_${city}_${d.getDate()}_${d.getMonth()}_${d.getFullYear()}`;
}

// ── SAFE READ ────────────────────────────────────────────────────
/**
 * Read + JSON.parse a key. Returns defaultVal if:
 *  - key doesn't exist
 *  - JSON is malformed (auto-removes bad key)
 *  - AsyncStorage throws
 *
 * @param {string} key
 * @param {*} defaultVal - returned on any error (default: null)
 */
export async function safeGet(key, defaultVal = null) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null || raw === undefined) return defaultVal;
    try {
      return JSON.parse(raw);
    } catch {
      // Corrupt data — remove it so it never breaks the app again
      console.warn(`[Storage] Corrupt JSON at key "${key}" — removing`);
      await AsyncStorage.removeItem(key).catch(() => {});
      return defaultVal;
    }
  } catch (e) {
    console.warn(`[Storage] safeGet error for key "${key}":`, e.message);
    return defaultVal;
  }
}

/**
 * Read a raw string value (no JSON.parse).
 * Safe equivalent of AsyncStorage.getItem.
 */
export async function safeGetString(key, defaultVal = null) {
  try {
    const v = await AsyncStorage.getItem(key);
    return v !== null && v !== undefined ? v : defaultVal;
  } catch {
    return defaultVal;
  }
}

// ── SAFE WRITE ───────────────────────────────────────────────────
/**
 * JSON.stringify + AsyncStorage.setItem, safely.
 * @param {string} key
 * @param {*} value - will be JSON.stringified
 */
export async function safeSet(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn(`[Storage] safeSet error for key "${key}":`, e.message);
    return false;
  }
}

/**
 * Write a raw string value (no stringify).
 */
export async function safeSetString(key, value) {
  try {
    await AsyncStorage.setItem(key, String(value));
    return true;
  } catch (e) {
    console.warn(`[Storage] safeSetString error for key "${key}":`, e.message);
    return false;
  }
}

/**
 * Remove a key safely.
 */
export async function safeRemove(key) {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// ── ATOMIC LOGOUT ────────────────────────────────────────────────
/**
 * Clears all user-specific keys atomically.
 * Call this on logout / account deletion.
 * Does NOT clear panchang cache or config caches (those are fine to keep).
 */
export async function clearUserSession() {
  const sessionKeys = [
    KEYS.USER,
    KEYS.AUTH_TOKEN,
    KEYS.AUTH_TOKEN_EXPIRY,
    KEYS.USER_LANGUAGE,
    KEYS.USER_CITY,
    KEYS.USER_LAST_MOOD,
    KEYS.MOOD_HISTORY,
    KEYS.PTS,
    KEYS.STREAK_COUNT,
    KEYS.LAST_OPEN,
    KEYS.CHECKIN,
    KEYS.LAST_INSIGHT,
    KEYS.JAPA_COUNT,
    KEYS.JAPA_TARGET,
    KEYS.PLAN,
    KEYS.PAYMENT_PENDING_ORDER,
    KEYS.PAYMENT_PENDING_PLAN,
    KEYS.SAVED_ANSWERS,
    KEYS.FEEDBACK,
    KEYS.PRESET_QUESTION,
    KEYS.MODE,
    KEYS.MANTRA_FAVORITES,
    KEYS.MANTRA_RECENT,
    KEYS.DAILY_QUOTA,
  ];
  try {
    await AsyncStorage.multiRemove(sessionKeys);
    console.log('[Storage] User session cleared');
    return true;
  } catch (e) {
    console.warn('[Storage] clearUserSession partial failure:', e.message);
    // Fall back to removing one by one
    for (const k of sessionKeys) {
      await AsyncStorage.removeItem(k).catch(() => {});
    }
    return true;
  }
}

// ── JWT TOKEN HELPERS ────────────────────────────────────────────
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Save a JWT auth token with 7-day expiry.
 */
export async function saveAuthToken(token) {
  const expiry = Date.now() + TOKEN_TTL_MS;
  await safeSetString(KEYS.AUTH_TOKEN, token);
  await safeSetString(KEYS.AUTH_TOKEN_EXPIRY, String(expiry));
}

/**
 * Get the current JWT token, returns null if expired or missing.
 */
export async function getAuthToken() {
  const token = await safeGetString(KEYS.AUTH_TOKEN);
  const expiry = await safeGetString(KEYS.AUTH_TOKEN_EXPIRY);
  if (!token || !expiry) return null;
  if (Date.now() > parseInt(expiry, 10)) {
    // Expired — clean up
    await safeRemove(KEYS.AUTH_TOKEN);
    await safeRemove(KEYS.AUTH_TOKEN_EXPIRY);
    return null;
  }
  return token;
}

/**
 * Read int from AsyncStorage, returns defaultVal if missing/NaN.
 */
export async function safeGetInt(key, defaultVal = 0) {
  const raw = await safeGetString(key);
  const n = parseInt(raw, 10);
  return isNaN(n) ? defaultVal : n;
}
