// ════════════════════════════════════════════════════════════════
// DharmaSetu — P4 Analytics System
// FILE: app/utils/analytics.js
//
// Privacy-safe, modular event tracking.
// Phase 1: Local buffer → periodic flush to /analytics/events
// Phase 2: PostHog / Amplitude integration
//
// Rules:
//   - No PII stored: only phone hash or anonymous ID
//   - Events are buffered locally, flushed periodically
//   - Never blocks UX
//   - All tracking is opt-in compatible
// ════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

const BUFFER_KEY   = 'ds_analytics_buffer';
const ANON_KEY     = 'ds_anon_id';
const FLUSH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_BUFFER   = 100;

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://dharmasetu-backend-2c65.onrender.com';

// ── EVENT NAMES ─────────────────────────────────────────────────
export const EVENTS = Object.freeze({
  // Session
  APP_OPEN:          'app_open',
  LOGIN:             'login',
  LOGOUT:            'logout',

  // DharmaChat
  QUESTION_SENT:     'question_sent',
  ANSWER_RECEIVED:   'answer_received',
  FEEDBACK_UP:       'feedback_up',
  FEEDBACK_DOWN:     'feedback_down',
  ANSWER_SAVED:      'answer_saved',
  ANSWER_SHARED:     'answer_shared',

  // Library
  BOOK_VIEW:         'book_view',
  BOOK_READ:         'book_read',
  BOOK_BOOKMARKED:   'book_bookmarked',
  BOOK_FAVOURITED:   'book_favourited',
  LIBRARY_SEARCH:    'library_search',

  // Mantra
  MANTRA_SPEAK:      'mantra_speak',
  MANTRA_JAPA:       'mantra_japa',
  JAPA_COMPLETE:     'japa_complete',

  // Engagement
  STREAK_EXTENDED:   'streak_extended',
  PANCHANG_VIEW:     'panchang_view',
  KUNDLI_VIEW:       'kundli_view',
  PREMIUM_PROMPT:    'premium_prompt',
  PREMIUM_PURCHASE:  'premium_purchase',

  // Voice
  VOICE_START:       'voice_start',
  VOICE_SUCCESS:     'voice_success',
  VOICE_FALLBACK:    'voice_fallback',

  // Errors
  ERROR_CAUGHT:      'error_caught',
});

// ── ANONYMOUS ID ─────────────────────────────────────────────────
let _anonId = null;
async function getAnonId() {
  if (_anonId) return _anonId;
  try {
    const stored = await AsyncStorage.getItem(ANON_KEY);
    if (stored) { _anonId = stored; return stored; }
    const id = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await AsyncStorage.setItem(ANON_KEY, id);
    _anonId = id;
    return id;
  } catch { return 'anon_unknown'; }
}

// ── TRACK ────────────────────────────────────────────────────────
/**
 * Track a single event (fire-and-forget).
 * @param {string} event    - use EVENTS constants
 * @param {object} props    - event properties (no PII)
 */
export async function track(event, props = {}) {
  try {
    const anonId = await getAnonId();
    const entry  = {
      event,
      props: sanitizeProps(props),
      ts:    Date.now(),
      anonId,
      platform: 'android', // React Native doesn't have navigator.platform
    };
    await appendToBuffer(entry);
  } catch {} // never throw
}

/**
 * Capture an error event (non-PII).
 * @param {Error}  error
 * @param {object} context - { screen, action }
 */
export async function captureError(error, context = {}) {
  await track(EVENTS.ERROR_CAUGHT, {
    message:  error?.message?.slice(0, 200) || 'unknown',
    screen:   context.screen || '',
    action:   context.action || '',
  });
}

// ── BUFFER MANAGEMENT ────────────────────────────────────────────
async function appendToBuffer(entry) {
  try {
    const raw    = await AsyncStorage.getItem(BUFFER_KEY);
    const buffer = raw ? JSON.parse(raw) : [];
    buffer.push(entry);
    if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
    await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(buffer));
    // Auto-flush if buffer is getting large
    if (buffer.length >= 30) flushAnalytics().catch(() => {});
  } catch {}
}

export async function flushAnalytics() {
  try {
    const raw = await AsyncStorage.getItem(BUFFER_KEY);
    if (!raw) return;
    const events = JSON.parse(raw);
    if (!events.length) return;

    const res = await fetch(`${BACKEND}/analytics/events`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ events }),
      signal:  AbortSignal.timeout(8000),
    });
    if (res.ok) {
      // Clear buffer after successful flush
      await AsyncStorage.removeItem(BUFFER_KEY);
    }
  } catch {} // silent — will retry next time
}

export async function getBufferedEvents() {
  try {
    const raw = await AsyncStorage.getItem(BUFFER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── PRIVACY HELPERS ──────────────────────────────────────────────
function sanitizeProps(props) {
  // Strip any PII-like fields
  const safe = { ...props };
  delete safe.phone;
  delete safe.email;
  delete safe.name;
  delete safe.token;
  return safe;
}

// ── PERIODIC FLUSH (call once from _layout.js or App.js) ─────────
let _flushInterval = null;
export function startPeriodicFlush() {
  if (_flushInterval) return;
  _flushInterval = setInterval(() => {
    flushAnalytics().catch(() => {});
  }, FLUSH_INTERVAL_MS);
}

export function stopPeriodicFlush() {
  if (_flushInterval) { clearInterval(_flushInterval); _flushInterval = null; }
}
