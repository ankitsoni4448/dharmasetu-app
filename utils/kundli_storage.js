// ════════════════════════════════════════════════════════════════
// DharmaSetu — Kundli Storage Management
// FILE: app/utils/kundli_storage.js
// Handles AsyncStorage persistence + Supabase sync
// ════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';

const KUNDLI_KEY = 'dharmasetu_kundli_profiles';
const ACTIVE_KUNDLI_KEY = 'dharmasetu_active_kundli_id';

// ─── PROFILE MANAGEMENT ───────────────────────────────────────
export async function saveKundliProfile(profile) {
  try {
    const existing = await getKundliProfiles();
    const updated = existing.filter(p => p.id !== profile.id);
    updated.push(profile);

    await AsyncStorage.setItem(KUNDLI_KEY, JSON.stringify(updated));
    return { success: true, profile };
  } catch (e) {
    console.error('[kundli_storage] Save error:', e);
    return { success: false, error: e.message };
  }
}

export async function getKundliProfiles() {
  try {
    const stored = await AsyncStorage.getItem(KUNDLI_KEY);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch (parseErr) {
      console.warn('[kundli_storage] Corrupted profiles JSON — clearing:', parseErr.message);
      await AsyncStorage.removeItem(KUNDLI_KEY).catch(() => {});
      return [];
    }
  } catch (e) {
    console.error('[kundli_storage] Get profiles error:', e);
    return [];
  }
}

export async function getKundliProfile(id) {
  try {
    const profiles = await getKundliProfiles();
    return profiles.find(p => p.id === id) || null;
  } catch (e) {
    console.error('[kundli_storage] Get profile error:', e);
    return null;
  }
}

export async function deleteKundliProfile(id) {
  try {
    const existing = await getKundliProfiles();
    const updated = existing.filter(p => p.id !== id);
    await AsyncStorage.setItem(KUNDLI_KEY, JSON.stringify(updated));

    // Clear active if deleted
    const active = await AsyncStorage.getItem(ACTIVE_KUNDLI_KEY);
    if (active === id) {
      await AsyncStorage.removeItem(ACTIVE_KUNDLI_KEY);
    }

    return { success: true };
  } catch (e) {
    console.error('[kundli_storage] Delete error:', e);
    return { success: false, error: e.message };
  }
}

// ─── ACTIVE KUNDLI MANAGEMENT ─────────────────────────────────
export async function setActiveKundli(id) {
  try {
    await AsyncStorage.setItem(ACTIVE_KUNDLI_KEY, id);
    return { success: true };
  } catch (e) {
    console.error('[kundli_storage] Set active error:', e);
    return { success: false, error: e.message };
  }
}

export async function getActiveKundli() {
  try {
    const id = await AsyncStorage.getItem(ACTIVE_KUNDLI_KEY);
    if (!id) return null;
    return await getKundliProfile(id);
  } catch (e) {
    console.error('[kundli_storage] Get active error:', e);
    return null;
  }
}

// ─── PROFILE VALIDATION ────────────────────────────────────────
export function validateKundliInput(input) {
  const errors = [];

  if (!input.name || input.name.trim().length === 0) {
    errors.push('Name is required');
  }
  if (!input.dateOfBirth) {
    errors.push('Date of birth is required');
  }
  if (!input.birthPlace || !input.birthPlace.name) {
    errors.push('Birth place is required');
  }
  if (!input.unknownTime && !input.birthTime) {
    errors.push('Birth time is required (or check "Unknown Time")');
  }

  return { valid: errors.length === 0, errors };
}

// ─── PROFILE GENERATION ────────────────────────────────────────
export function createKundliProfile(inputData, calculationResult) {
  return {
    id: `kundli_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
    name: inputData.name,
    birthData: {
      dateOfBirth: inputData.dateOfBirth,
      birthTime: inputData.birthTime || 'Unknown',
      birthPlace: {
        name: inputData.birthPlace.name,
        latitude: inputData.birthPlace.latitude,
        longitude: inputData.birthPlace.longitude,
      },
      unknownTime: inputData.unknownTime || false,
    },
    calculation: calculationResult,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── EXPORT FOR PDF/SHARING ────────────────────────────────────
export function formatKundliForExport(profile) {
  const calc = profile.calculation;
  const birth = profile.birthData;

  return `
════════════════════════════════════════════════════════════════
                    🕉 VEDIC KUNDLI 🕉
════════════════════════════════════════════════════════════════

NAME: ${profile.name}

BIRTH DETAILS:
  Date:     ${birth.dateOfBirth}
  Time:     ${birth.birthTime}
  Place:    ${birth.birthPlace.name}
  Status:   ${birth.unknownTime ? 'Time Unknown (Sunrise Chart)' : 'Verified'}

════════════════════════════════════════════════════════════════

PLANETARY POSITIONS (Vedic/Sidereal - Lahiri Ayanamsa):

  Ascendant (Lagna):  ${calc.lagna?.rashi?.nameEn || 'Not available'}
  Moon Sign (Rashi):  ${calc.moonRashi?.nameEn || 'Not available'}
  Sun Sign:           ${calc.sunRashi?.nameEn || 'Not available'}
  Nakshatra:          ${calc.nakshatra?.name || 'Not available'}

GRAHAS (Planets):
${
  Object.entries(calc.grahas || {}).map(([key, graha]) =>
    `  ${graha.name.padEnd(10)} ${graha.rashi?.nameEn || 'Unknown'}`
  ).join('\n')
}

════════════════════════════════════════════════════════════════

INTERPRETATION:
  Not available in this provider-backed report.

════════════════════════════════════════════════════════════════

Generated: ${new Date().toLocaleDateString('en-IN')}
Source: ${profile.source === 'prokerala-server' ? 'Prokerala provider-backed calculation' : 'Legacy profile; unavailable facts are not inferred'}

Note: Missing calculation fields are intentionally shown as unavailable.

════════════════════════════════════════════════════════════════
`;
}

// ─── CLEAR ALL PROFILES (EMERGENCY) ────────────────────────────
export async function clearAllKundliData() {
  try {
    await AsyncStorage.removeItem(KUNDLI_KEY);
    await AsyncStorage.removeItem(ACTIVE_KUNDLI_KEY);
    return { success: true };
  } catch (e) {
    console.error('[kundli_storage] Clear all error:', e);
    return { success: false, error: e.message };
  }
}
