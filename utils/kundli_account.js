// ════════════════════════════════════════════════════════════════
// DharmaSetu — Account-Linked Kundli System
// FILE: app/utils/kundli_account.js
//
// Architecture:
//  - Primary Kundli: Auto-generated from signup birth data
//  - Secondary Kundlis: Created via +New button (spouse, family, etc.)
//  - Cached locally, synced to Supabase profile
// ════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS, safeGet } from './storage';
import { saveKundliProfile, setActiveKundli, deleteKundliProfile } from './kundli_storage';
import { calculateSecondaryKundli, generatePrimaryKundli as generateServerPrimaryKundli, restoreAccountLifecycle } from './accountLifecycle';
const { isCanonicalBirthProfileReady, isBirthProfileRequiredError, resolveKundliReadiness } = require('./kundliReadiness');

const PRIMARY_KUNDLI_ID = 'primary_kundli_account_linked';
const PRIMARY_KUNDLI_KEY = 'dharmasetu_primary_kundli_profile';

// ─── PROFILE DATA EXTRACTION ───────────────────────────────────
/**
 * Extract birth data from account user profile
 * Profile structure from login.js: { phone, name, dob, birthCity, ...}
 *
 * @returns {Object | null} - { dateOfBirth, birthTime, birthPlace, name, unknownTime }
 */
export async function getAccountBirthData() {
  try {
    const user = await safeGet(KEYS.USER);
    if (!user) return null;

    // Extract from user profile with robust fallbacks for incomplete data
    const rawDob = user.dob || user.dateOfBirth;
    let safeDate = '';
    if (rawDob) {
      if (typeof rawDob === 'string') {
        safeDate = rawDob.slice(0, 10);
      } else {
        try {
          safeDate = new Date(rawDob).toISOString().split('T')[0];
        } catch {
          safeDate = '';
        }
      }
    }
    const birthCity = user.birthCity || user.birth_city || '';
    const birthTime = user.birthTime || null;
    const latitude = Number(user.birthLatitude);
    const longitude = Number(user.birthLongitude);
    if (!safeDate || !birthCity || !birthTime || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    // Return formatted input for calculateKundli
    return {
      name: user.name || 'Account User',
      dateOfBirth: safeDate, // Expected: YYYY-MM-DD
      birthTime,
      birthPlace: {
        name: birthCity,
        latitude,
        longitude,
      },
      unknownTime: user.unknownTime === true || !user.birthTime,
    };
  } catch (e) {
    console.error('[kundli_account] Extract birth data error:', e);
    return null;
  }
}

// ─── PRIMARY KUNDLI GENERATION ─────────────────────────────────
/**
 * Create primary Kundli from account birth data
 * Called on first app launch after signup
 *
 * @returns {Object | null} - created primary profile or null if no birth data
 */
async function cachePrimaryKundliFromAccount(account) {
    if (!account?.birthProfile || !account?.jyotishProfile?.chart_data) return null;
    const birth = account.birthProfile;
    const birthData = {
      name: account.profile?.name || 'Account User', dateOfBirth: birth.date_of_birth,
      birthTime: birth.birth_time, birthPlace: { name: birth.place_name, latitude: birth.latitude, longitude: birth.longitude },
      unknownTime: birth.birth_time_certainty === 'UNKNOWN', birthTimeCertainty: birth.birth_time_certainty,
    };
    const calculation = account.jyotishProfile.chart_data.normalized;
    if (!calculation || calculation.provider !== 'prokerala') return null;

    // Create profile with special ID
    const profile = {
      id: PRIMARY_KUNDLI_ID,
      name: `${birthData.name}'s Kundli`,
      birthData,
      calculation,
      isPrimary: true, // Flag for UI
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'prokerala-server',
      calculationVersion: account.jyotishProfile.calculation_version,
      ayanamsha: account.jyotishProfile.ayanamsha,
      ownerId: account.account?.authUserId || null,
    };

    // Save
    await saveKundliProfile(profile);
    await AsyncStorage.setItem(PRIMARY_KUNDLI_KEY, JSON.stringify(profile));
    await setActiveKundli(PRIMARY_KUNDLI_ID);

    return profile;
}

export async function generatePrimaryKundli(restoredAccount = null) {
  try {
    const initialAccount = restoredAccount || await restoreAccountLifecycle();
    if (!isCanonicalBirthProfileReady(initialAccount?.birthProfile)) {
      return { status: 'NEEDS_BIRTH_PROFILE', profile: null };
    }
    const generated = await generateServerPrimaryKundli();
    const account = await restoreAccountLifecycle();
    if (!generated?.success) return null;
    return await cachePrimaryKundliFromAccount(account);
  } catch (e) {
    if (isBirthProfileRequiredError(e)) return { status: 'NEEDS_BIRTH_PROFILE', profile: null };
    console.error('[kundli_account] Generate primary error:', e);
    throw e;
  }
}

/**
 * Get primary Kundli from storage
 * Returns cached primary or null
 */
export async function getPrimaryKundli(account = null, generateIfMissing = true) {
  try {
    // Try cache first
    const cached = await AsyncStorage.getItem(PRIMARY_KUNDLI_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const ownerId = account?.account?.authUserId;
        if (parsed?.calculation?.schema_version === 'dharmasetu-kundli-v1'
          && parsed.calculation.provider === 'prokerala' && ownerId && parsed.ownerId === ownerId) {
          return parsed;
        }
        if (parsed?.isPrimary) await AsyncStorage.removeItem(PRIMARY_KUNDLI_KEY).catch(() => {});
      } catch (parseErr) {
        console.warn('[kundli_account] Corrupted primary Kundli cache — clearing:', parseErr.message);
        await AsyncStorage.removeItem(PRIMARY_KUNDLI_KEY).catch(() => {});
      }
    }

    // Not found or corrupted — try to generate it
    if (!account || !generateIfMissing) return null;
    return await generatePrimaryKundli(account);
  } catch (e) {
    console.error('[kundli_account] Get primary error:', e);
    return null;
  }
}

/**
 * Refresh primary Kundli from current account profile
 * Called if user updates birth details in profile
 */
export async function refreshPrimaryKundli() {
  return generatePrimaryKundli();
}

// ─── SECONDARY KUNDLI MANAGEMENT ───────────────────────────────
/**
 * Create secondary Kundli (spouse, family, etc.)
 * Used when +New button is pressed
 *
 * @param {Object} birthData - { name, dateOfBirth, birthTime, birthPlace, unknownTime }
 * @param {string} relation - e.g. "spouse", "family", "friend"
 * @returns {Object | null} - created secondary profile
 */
export async function createSecondaryKundli(birthData, relation = 'other') {
  try {
    const account = await restoreAccountLifecycle();
    const ownerId = account?.account?.authUserId;
    if (!ownerId) throw new Error('AUTH_REQUIRED');
    if (birthData.unknownTime || !birthData.birthTime) throw new Error('BIRTH_TIME_REQUIRED_FOR_PRECISE_KUNDLI');
    const calculation = await calculateSecondaryKundli({
      dob: birthData.dateOfBirth, tob: birthData.birthTime,
      city: birthData.birthPlace?.name, lat: birthData.birthPlace?.latitude, lng: birthData.birthPlace?.longitude,
    });

    const profile = {
      id: `kundli_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: birthData.name || 'Unknown',
      birthData,
      calculation,
      isPrimary: false,
      relation, // Track relationship
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'prokerala-server',
      ownerId,
    };

    await saveKundliProfile(profile);
    return profile;
  } catch (e) {
    console.error('[kundli_account] Create secondary error:', e);
    throw e;
  }
}

// ─── PROFILE TYPE DETECTION ───────────────────────────────────
/**
 * Check if a Kundli is primary (account-linked)
 */
export function isPrimaryKundli(profileId) {
  return profileId === PRIMARY_KUNDLI_ID;
}

/**
 * Get all secondary Kundlis (exclude primary)
 */
export async function getSecondaryKundlis() {
  try {
    const { getKundliProfiles } = require('./kundli_storage');
    const all = await getKundliProfiles();
    return all.filter(p => !isPrimaryKundli(p.id));
  } catch (e) {
    console.error('[kundli_account] Get secondary error:', e);
    return [];
  }
}

// ─── INITIALIZATION ────────────────────────────────────────────
/**
 * Init account-linked Kundli system
 * Called from app startup (e.g., _layout.js or profile screen)
 *
 * Creates primary Kundli if:
 *  - User is logged in
 *  - User has birth data
 *  - Primary doesn't exist yet
 */
export async function initializeAccountKundli() {
  try {
    const user = await safeGet(KEYS.USER);
    if (!user) return { status: 'SIGNED_OUT', account: null, profile: null };

    return await resolveKundliReadiness({
      restore: restoreAccountLifecycle,
      loadExisting: async account => {
        const existing = await getPrimaryKundli(account, false);
        if (existing?.status === 'NEEDS_BIRTH_PROFILE') return null;
        if (existing?.calculation && existing.source === 'prokerala-server') return existing;
        if (existing) {
          await deleteKundliProfile(PRIMARY_KUNDLI_ID);
          await AsyncStorage.removeItem(PRIMARY_KUNDLI_KEY);
        }
        if (account.jyotishProfile?.status === 'KUNDLI_READY' && account.jyotishProfile?.chart_data) {
          return await cachePrimaryKundliFromAccount(account);
        }
        return null;
      },
      generate: async account => {
        const generated = await generatePrimaryKundli(account);
        if (generated?.status === 'NEEDS_BIRTH_PROFILE') {
          const error = new Error('BIRTH_PROFILE_REQUIRED');
          error.code = 'BIRTH_PROFILE_REQUIRED';
          throw error;
        }
        return generated;
      },
    });
  } catch (e) {
    if (isBirthProfileRequiredError(e)) return { status: 'NEEDS_BIRTH_PROFILE', account: null, profile: null };
    console.error('[kundli_account] Init error:', e);
    return { status: 'ERROR', account: null, profile: null };
  }
}

// ─── FALLBACK: FETCH FROM BACKEND (Future) ────────────────────
/**
 * Sync primary Kundli with Supabase profile (future)
 * When backend exposes /profile/kundli endpoint
 */
export async function syncPrimaryKundliWithBackend(userId) {
  // TODO: Implement when backend API ready
  // const res = await fetch(`${BACKEND}/profile/${userId}/kundli`);
  // if (res.ok) { const data = await res.json(); ... }
  console.log('[kundli_account] Backend sync placeholder');
}
