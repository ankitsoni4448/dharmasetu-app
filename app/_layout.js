// ════════════════════════════════════════════════════════════════
// DharmaSetu — Root Layout  P4
// FILE: app/_layout.js
//
// P4 additions:
//  1. Notification handler configured on boot
//  2. Push token registered with backend (non-blocking)
//  3. Spiritual streak touched on each app open
//  4. Offline action queue flushed on startup
// ════════════════════════════════════════════════════════════════
import Constants from 'expo-constants';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack }            from 'expo-router';
import { fetchAndCacheConfig } from '../app_config';
import { useEffect }        from 'react';
import ErrorBoundary        from './components/ErrorBoundary';
import { safeGet, KEYS }   from './utils/storage';
import {
  configureNotificationHandler,
  scheduleAllNotifications,
  getExpoPushToken,
  hasNotificationPermission,
} from './utils/notifications';
import { touchStreak }      from './utils/journey';
import { flushOfflineQueue, registerPushToken } from './utils/futureScale';
import { startPeriodicFlush, track, EVENTS } from './utils/analytics';


const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://dharmasetu-backend-2c65.onrender.com';

export default function RootLayout() {
  useEffect(() => {
    const isExpoGo = Constants.appOwnership === 'expo';
    // ── Sync config from backend (non-blocking) ──────────────────
    fetchAndCacheConfig().catch(() => {});

    // ── P4: Initialize notifications handler ─────────────────────
    if (!isExpoGo) {
  try { configureNotificationHandler(); } catch {}
}

    // ── P4: Start analytics periodic flush ───────────────────────
    startPeriodicFlush();
    track(EVENTS.APP_OPEN, {}).catch(() => {});

    // ── P4: Non-blocking startup tasks ──────────────────────────
    (async () => {
      try {
        // Touch spiritual streak (once per day)
        await touchStreak();

        const user = await safeGet(KEYS.USER);

        // Schedule notifications if permission
        if (!isExpoGo) {
  const hasPerm = await hasNotificationPermission();

  if (hasPerm) {
    await scheduleAllNotifications();
  }

  const token = await getExpoPushToken();

  if (token && user?.phone) {
    await registerPushToken(user.phone, token);
  }
}
        

        // Flush any queued offline actions
        const flushed = await flushOfflineQueue();
        if (flushed > 0) console.log(`[Layout] Flushed ${flushed} offline actions`);
      } catch (e) {
        // Never crash the app on startup init failures
        console.log('[Layout] Startup init error (non-fatal):', e.message);
      }
    })();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="payment" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="mantra_library" />
          <Stack.Screen name="dharmic_library" />
          <Stack.Screen name="katha_vault" />
          <Stack.Screen name="kundli" />
          <Stack.Screen name="modal" />
        </Stack>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}