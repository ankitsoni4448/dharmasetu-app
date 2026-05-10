// ════════════════════════════════════════════════════════════════
// DharmaSetu — P4 Notification & Engagement System
// FILE: app/utils/notifications.js
//
// Phase 1 (now):  expo-notifications scheduling + local push
// Phase 2 (future): Expo Push Service + backend-triggered pushes
//
// Features:
//   - Daily mantra reminder
//   - Panchang morning notification
//   - Streak reminder (before midnight)
//   - Quiet hours support
//   - Preference management
// ════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

// We import expo-notifications lazily to avoid crash if not installed
import Constants from 'expo-constants';

let Notifications = null;

if (Constants.appOwnership !== 'expo') {
  try {
    Notifications = require('expo-notifications');
  } catch {
    console.log('[Notifications] expo-notifications not installed.');
  }
}

const PREF_KEY = 'ds_notification_prefs';

const DEFAULT_PREFS = {
  enabled:           true,
  mantraReminder:    true,
  mantraTime:        '07:00',  // HH:MM
  panchangReminder:  true,
  panchangTime:      '06:30',
  streakReminder:    true,
  streakTime:        '20:00',
  quietStart:        '22:00',
  quietEnd:          '06:00',
  language:          'hindi',
};

// ── PREFERENCE MANAGEMENT ────────────────────────────────────────

export async function getNotificationPrefs() {
  try {
    const raw = await AsyncStorage.getItem(PREF_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch { return DEFAULT_PREFS; }
}

export async function saveNotificationPrefs(prefs = {}) {
  try {
    const current = await getNotificationPrefs();
    const merged  = { ...current, ...prefs };
    await AsyncStorage.setItem(PREF_KEY, JSON.stringify(merged));
    // Reschedule after saving prefs
    await scheduleAllNotifications(merged);
    return merged;
  } catch(e) { console.log('[Notifications] savePrefs error:', e.message); }
}

// ── PERMISSION ───────────────────────────────────────────────────

export async function requestNotificationPermission() {
  if (!Notifications) return 'unavailable';
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status; // 'granted' | 'denied' | 'undetermined'
  } catch { return 'error'; }
}

export async function hasNotificationPermission() {
  if (!Notifications) return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch { return false; }
}

// ── QUIET HOURS CHECK ────────────────────────────────────────────

function isQuietHour(quietStart, quietEnd) {
  const now  = new Date();
  const h    = now.getHours();
  const m    = now.getMinutes();
  const time = h * 60 + m;
  const [sh, sm] = quietStart.split(':').map(Number);
  const [eh, em] = quietEnd.split(':').map(Number);
  const start = sh * 60 + sm;
  const end   = eh * 60 + em;
  if (start > end) return time >= start || time < end; // overnight
  return time >= start && time < end;
}

function parseTime(timeStr) {
  const [h, m] = (timeStr || '07:00').split(':').map(Number);
  return { hour: h, minute: m };
}

// ── SCHEDULE NOTIFICATIONS ───────────────────────────────────────

export async function scheduleAllNotifications(prefs = null) {
  if (!Notifications) return;
  const p = prefs || await getNotificationPrefs();
  if (!p.enabled) { await cancelAllNotifications(); return; }

  const hasPerm = await hasNotificationPermission();
  if (!hasPerm) return;

  // Cancel existing to avoid duplicates
  await cancelAllNotifications();

  const isH = p.language === 'hindi';

  if (p.mantraReminder) {
    const t = parseTime(p.mantraTime);
    await scheduleDaily('mantra_reminder', {
      title: isH ? '📿 मंत्र जप का समय' : '📿 Mantra Japa Time',
      body:  isH ? 'आज के जप की शुरुआत करें। धर्म पथ पर चलते रहें। 🕉️' : 'Begin your daily mantra japa. Stay on the dharmic path. 🕉️',
      hour:  t.hour,
      minute: t.minute,
    });
  }

  if (p.panchangReminder) {
    const t = parseTime(p.panchangTime);
    await scheduleDaily('panchang_reminder', {
      title: isH ? '🌅 आज का पंचांग' : '🌅 Today\'s Panchang',
      body:  isH ? 'आज का तिथि, नक्षत्र और शुभ मुहूर्त देखें।' : 'View today\'s Tithi, Nakshatra and auspicious times.',
      hour:  t.hour,
      minute: t.minute,
    });
  }

  if (p.streakReminder) {
    const t = parseTime(p.streakTime);
    await scheduleDaily('streak_reminder', {
      title: isH ? '🔥 आज का धर्म-कर्म अभी तक अधूरा है' : '🔥 Your spiritual streak needs you',
      body:  isH ? 'अपनी streak बनाए रखें — DharmaSetu खोलें।' : 'Keep your streak alive — open DharmaSetu.',
      hour:  t.hour,
      minute: t.minute,
    });
  }
}

async function scheduleDaily(id, { title, body, hour, minute }) {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body, sound: true },
      trigger:  { hour, minute, repeats: true },
    });
  } catch(e) { console.log('[Notifications] scheduleDaily error:', id, e.message); }
}

export async function cancelAllNotifications() {
  if (!Notifications) return;
  try { await Notifications.cancelAllScheduledNotificationsAsync(); }
  catch {}
}

export async function cancelNotification(id) {
  if (!Notifications) return;
  try { await Notifications.cancelScheduledNotificationAsync(id); }
  catch {}
}

// ── EXPO PUSH TOKEN (for backend-triggered push) ─────────────────
export async function getExpoPushToken() {
  if (!Notifications) return null;
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    return token;
  } catch(e) {
    console.log('[Notifications] Could not get push token:', e.message);
    return null;
  }
}

// ── NOTIFICATION HANDLER (configure in _layout.js) ──────────────
export function configureNotificationHandler() {
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge:  false,
    }),
  });
}

// ── IMMEDIATE REMINDER (for testing) ─────────────────────────────
export async function sendImmediateNotification(title, body) {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger:  null, // immediate
    });
  } catch {}
}
