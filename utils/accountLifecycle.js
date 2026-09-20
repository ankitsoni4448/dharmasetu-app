import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { clearUserSession } from './storage';
import kundliSaveFlow from './kundliSaveFlow';
import legacyBirthMigration from './legacyBirthProfileMigration';

const { runKundliSaveFlow } = kundliSaveFlow;

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://dharmasetu-backend-2c65.onrender.com';

async function authFetch(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('AUTH_REQUIRED');
  return fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
}

async function parseResponse(response, fallback) {
  const data = await response.json().catch(() => {
    throw Object.assign(new Error(fallback), { code: fallback, httpStatus: response.status });
  });

  if (!response.ok || data.success === false) {
    const code = data.error || fallback;
    const error = new Error(code);

    error.code = code;
    error.httpStatus = response.status;
    error.fields = data.fields || null;

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(
        `[KundliHTTP] status=${response.status} error=${code}` +
        (Array.isArray(data.fields) ? ` fields=${data.fields.join(',')}` : '')
      );
    }

    throw error;
  }

  return data;
}

export async function restoreAccountLifecycle({ reconcile = false } = {}) {
  const account = await parseResponse(await authFetch('/account/me'), 'ACCOUNT_RESTORE_FAILED');
  if (account.birthProfile) return account;
  let local = null;
  try { local = JSON.parse(await AsyncStorage.getItem('dharmasetu_user')); } catch {}
  const owner = account.account?.authUserId; const phone = account.account?.phone;
  const prefill = legacyBirthMigration.legacyBirthPrefill(local, owner, phone);
  const serverDraft = account.legacyBirthInput;
  // Prefer account-owned server values. The local source never contributes astrology.
  account.legacyBirthInput = { ...(prefill || {}), ...Object.fromEntries(
    Object.entries(serverDraft || {}).filter(([, value]) => value !== '' && value != null)) };
  const localComplete = legacyBirthMigration.validatedLegacyBirthInput(local, owner, phone);
  const conflicts = localComplete && ['name', 'gender', 'dateOfBirth', 'birthplace', 'birthTime', 'birthTimeCertainty']
    .some(key => serverDraft?.[key] && serverDraft[key] !== localComplete[key]);
  const complete = serverDraft?.automaticMigrationAllowed ? serverDraft : !conflicts && localComplete;
  if (reconcile && complete) {
    try {
      await saveAccountOnboarding({ ...complete, reconcileLegacy: true });
      return restoreAccountLifecycle();
    } catch (error) { account.reconciliationError = error.code || 'ONBOARDING_SAVE_FAILED'; }
  }
  return account;
}

export async function saveAccountOnboarding(profile) {
  const response = await authFetch('/account/onboarding', { method: 'POST', body: JSON.stringify(profile) });
  kundliFlowLog(`birth profile HTTP status=${response.status}`);
  return parseResponse(response, 'ONBOARDING_SAVE_FAILED');
}

export async function searchBirthplace(birthplaceDetails, dateOfBirth) {
  return parseResponse(await authFetch('/account/birthplace/resolve', { method: 'POST',
    body: JSON.stringify({ birthplaceDetails, dateOfBirth }) }), 'BIRTHPLACE_SERVICE_UNAVAILABLE');
}

export async function generatePrimaryKundli() {
  const response = await authFetch('/account/kundli/generate', { method: 'POST', body: '{}' });
  kundliFlowLog(`generation HTTP status=${response.status}`);
  return parseResponse(response, 'KUNDLI_PROVIDER_UNAVAILABLE');
}

function kundliFlowLog(message) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log(`[KundliFlow] ${message}`);
}

export async function saveAndPreparePrimaryKundli(profile, dependencies = {}) {
  return runKundliSaveFlow(profile, { save: dependencies.save || saveAccountOnboarding,
    generate: dependencies.generate || generatePrimaryKundli,
    restore: dependencies.restore || restoreAccountLifecycle, log: kundliFlowLog });
}

export async function retryPrimaryKundli(dependencies = {}) {
  const generate = dependencies.generate || generatePrimaryKundli;
  const restore = dependencies.restore || restoreAccountLifecycle;
  kundliFlowLog('generation started');
  try {
    const generated = await generate();
    if (generated?.status !== 'KUNDLI_READY') throw Object.assign(new Error('KUNDLI_NOT_READY'), { code: 'KUNDLI_NOT_READY' });
    kundliFlowLog('generation success');
    kundliFlowLog('account refetch started');
    const account = await restore();
    kundliFlowLog('account refetch success');
    if (account?.jyotishProfile?.status !== 'KUNDLI_READY' || !account?.birthProfile?.input_fingerprint
      || account.jyotishProfile.input_fingerprint !== account.birthProfile.input_fingerprint) {
      throw Object.assign(new Error('KUNDLI_NOT_READY'), { code: 'KUNDLI_NOT_READY' });
    }
    return { generated, account };
  } catch (error) {
    kundliFlowLog(`failed stage=generation status=${error.httpStatus || 'none'} code=${error.code || error.message || 'UNKNOWN'}`);
    throw error;
  }
}
export async function calculateSecondaryKundli(input) {
  const data = await parseResponse(await authFetch('/kundli/calculate', { method: 'POST', body: JSON.stringify(input) }), 'KUNDLI_PROVIDER_UNAVAILABLE');
  if (!data.calculation) throw new Error('KUNDLI_PROVIDER_INVALID_RESPONSE');
  return data.calculation;
}

export async function deleteCurrentAccount(phone) {
  return parseResponse(await authFetch('/users/delete', {
    method: 'DELETE', headers: { 'X-Confirm-Account-Deletion': 'DELETE' },
    body: JSON.stringify({ confirmation: 'DELETE', phone }),
  }), 'ACCOUNT_DELETION_FAILED');
}

export async function clearAuthenticatedLocalData() {
  await clearUserSession();
  const allKeys = await AsyncStorage.getAllKeys();
  const prefixes = ['ds_acc_', 'dharmasetu_kundli_', 'dharmasetu_primary_kundli_', 'panchang_', 'ds_notification_'];
  const exact = new Set(['dharmasetu_kundli_profiles', 'dharmasetu_active_kundli_id', 'today_panchang']);
  const owned = allKeys.filter(key => exact.has(key) || prefixes.some(prefix => key.startsWith(prefix)));
  if (owned.length) await AsyncStorage.multiRemove(owned);
}
