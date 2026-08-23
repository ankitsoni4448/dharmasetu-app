import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { clearUserSession } from './storage';

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
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error || fallback);
  return data;
}

export async function restoreAccountLifecycle() {
  return parseResponse(await authFetch('/account/me'), 'ACCOUNT_RESTORE_FAILED');
}

export async function saveAccountOnboarding(profile) {
  return parseResponse(await authFetch('/account/onboarding', { method: 'POST', body: JSON.stringify(profile) }), 'ONBOARDING_SAVE_FAILED');
}

export async function generatePrimaryKundli() {
  return parseResponse(await authFetch('/account/kundli/generate', { method: 'POST', body: '{}' }), 'KUNDLI_PROVIDER_UNAVAILABLE');
}

export async function calculateSecondaryKundli(input) {
  return parseResponse(await authFetch('/kundli/calculate', { method: 'POST', body: JSON.stringify(input) }), 'KUNDLI_PROVIDER_UNAVAILABLE');
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
