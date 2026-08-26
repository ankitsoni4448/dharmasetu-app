import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://dharmasetu-backend-2c65.onrender.com';
const CACHE_KEY = 'dharmasetu_entitlement_v1';
const CACHE_TTL_MS = 5 * 60 * 1000;

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Authentication required');
  return { Authorization: `Bearer ${token}` };
}

export async function getCurrentPlan({ refresh = false } = {}) {
  if (!refresh) {
    try {
      const cached = JSON.parse(await AsyncStorage.getItem(CACHE_KEY));
      if (cached?.plan && Date.now() - cached.updatedAt < CACHE_TTL_MS) return cached.plan;
    } catch {}
  }
  return refreshEntitlement();
}

export async function getEntitlement({ refresh = false } = {}) {
  if (!refresh) {
    try {
      const cached = JSON.parse(await AsyncStorage.getItem(CACHE_KEY));
      if (cached?.effectivePlan && Date.now() - cached.updatedAt < CACHE_TTL_MS) return cached;
    } catch {}
  }
  return refreshEntitlementDetails();
}

export async function refreshEntitlement() {
  const entitlement = await refreshEntitlementDetails();
  return entitlement.effectivePlan;
}

export async function refreshEntitlementDetails() {
  const headers = await authHeaders();
  const response = await fetch(`${BACKEND_URL}/users/me/access`, { headers });
  if (!response.ok) throw new Error(response.status === 401 ? 'Authentication required' : 'Could not refresh plan');
  const data = await response.json();
  const plan = ['free', 'basic', 'pro'].includes(data.effectivePlan || data.plan) ? (data.effectivePlan || data.plan) : 'free';
  const entitlement = { ...data, plan, effectivePlan: plan, updatedAt: Date.now() };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entitlement));
  const raw = await AsyncStorage.getItem('dharmasetu_user');
  if (raw) {
    const user = JSON.parse(raw);
    await AsyncStorage.setItem('dharmasetu_user', JSON.stringify({ ...user, plan }));
  }
  return entitlement;
}

export async function authenticatedFetch(url, options = {}) {
  const headers = await authHeaders();
  const response = await fetch(url, { ...options, headers: { ...options.headers, ...headers } });
  if (__DEV__ && !response.ok) {
    const endpoint = (() => { try { return new URL(url).pathname; } catch { return String(url); } })();
    const payload = await response.clone().json().catch(() => ({}));
    console.warn(`[Backend] ${options.method || 'GET'} ${endpoint} -> ${response.status} ${payload.error || 'UNKNOWN_ERROR'}`);
  }
  return response;
}

export function isPaidPlan(plan) {
  return plan === 'basic' || plan === 'pro';
}
