import AsyncStorage from '@react-native-async-storage/async-storage';
import { authenticatedFetch } from './entitlements';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://dharmasetu-backend-2c65.onrender.com';
const COUNT_CACHE_KEY = 'ds_notification_unread_v1';
const COUNT_CACHE_MS = 60 * 1000;
export const SAFE_NOTIFICATION_ROUTES = new Set(['/payment','/profile','/katha_vault','/mantra_library','/kundli','/panchang']);

export async function getUnreadNotificationCount({ refresh = false } = {}) {
  if (!refresh) {
    const cached = JSON.parse(await AsyncStorage.getItem(COUNT_CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.at < COUNT_CACHE_MS) return cached.count;
  }
  const response = await authenticatedFetch(`${BACKEND_URL}/notifications/unread-count`);
  if (!response.ok) throw new Error('NOTIFICATIONS_UNAVAILABLE');
  const data = await response.json();
  const count = Math.max(0, Number(data.count) || 0);
  await AsyncStorage.setItem(COUNT_CACHE_KEY, JSON.stringify({ count, at: Date.now() }));
  return count;
}

export async function getNotifications() {
  const response = await authenticatedFetch(`${BACKEND_URL}/notifications?limit=100`);
  if (!response.ok) throw new Error('NOTIFICATIONS_UNAVAILABLE');
  const data = await response.json();
  return Array.isArray(data.notifications) ? data.notifications : [];
}

export async function markNotificationRead(id) {
  const response = await authenticatedFetch(`${BACKEND_URL}/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
  if (!response.ok) throw new Error('NOTIFICATIONS_UNAVAILABLE');
  await AsyncStorage.removeItem(COUNT_CACHE_KEY);
}

export async function markAllNotificationsRead() {
  const response = await authenticatedFetch(`${BACKEND_URL}/notifications/read-all`, { method: 'POST' });
  if (!response.ok) throw new Error('NOTIFICATIONS_UNAVAILABLE');
  await AsyncStorage.setItem(COUNT_CACHE_KEY, JSON.stringify({ count: 0, at: Date.now() }));
}

export function safeNotificationRoute(route) {
  return SAFE_NOTIFICATION_ROUTES.has(route) ? route : null;
}
