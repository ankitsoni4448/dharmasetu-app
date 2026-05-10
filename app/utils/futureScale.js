// ════════════════════════════════════════════════════════════════
// DharmaSetu — P4 Future Scale Architecture Hooks
// FILE: app/utils/futureScale.js
//
// Clean extension points for future infrastructure:
//   - Semantic search stub (→ pgvector)
//   - Background job queue stub (→ BullMQ/Render Jobs)
//   - Object storage stub (→ Cloudflare R2)
//   - AI retrieval stub (→ RAG with embeddings)
//   - Push notification to server stub
//   - Offline sync queue
//
// NONE of these do heavy work now.
// They are fully functional stubs that log intent and
// either return graceful fallbacks or queue work locally.
// Swap internals without changing any call site.
// ════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://dharmasetu-backend-2c65.onrender.com';

// ── ABORT TIMEOUT HELPER ─────────────────────────────────────────
// AbortSignal.timeout() is NOT supported on Android Hermes (Expo SDK 54).
// Use this helper everywhere instead.
function makeAbortTimeout(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear:  () => clearTimeout(id),
  };
}

// ── OFFLINE ACTION QUEUE ─────────────────────────────────────────
// Queues actions when offline, retried when network returns
const QUEUE_KEY = 'ds_offline_queue';

export async function queueOfflineAction(type, payload) {
  try {
    const raw   = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push({ type, payload, queuedAt: Date.now(), retries: 0 });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-50)));
  } catch {}
}

export async function flushOfflineQueue() {
  try {
    const raw   = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return 0;
    const queue = JSON.parse(raw);
    if (!queue.length) return 0;

    const remaining = [];
    let flushed = 0;
    for (const item of queue) {
      try {
        await processQueuedAction(item);
        flushed++;
      } catch {
        if (item.retries < 3) remaining.push({ ...item, retries: (item.retries || 0) + 1 });
      }
    }
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    return flushed;
  } catch { return 0; }
}

async function processQueuedAction({ type, payload }) {
  switch (type) {
    case 'book_view':
      return fetch(`${BACKEND}/library/books/${payload.bookId}/view`, { method: 'POST' });
    case 'ai_feedback':
      return fetch(`${BACKEND}/ai/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    default:
      console.log('[Queue] Unknown action:', type);
  }
}

// ── SEMANTIC SEARCH STUB ─────────────────────────────────────────
// Phase 1: keyword search via backend
// Phase 2: pgvector semantic search
// Phase 3: multi-modal (text + image) scripture search

/**
 * Search dharmic library.
 * Currently: simple keyword via backend.
 * Future: swap body for semantic embedding search.
 *
 * @param {string} query
 * @param {{ lang, category, useSemantics }} opts
 */
export async function searchScriptures(query, { lang, category, useSemantics = false } = {}) {
  const t = makeAbortTimeout(8000);
  try {
    const params = new URLSearchParams({ q: query });
    if (lang)     params.set('lang', lang);
    if (category) params.set('category', category);
    // Future: params.set('semantic', '1') when embeddings are ready

    const res  = await fetch(`${BACKEND}/library/books/search?${params}`, {
      signal: t.signal,
    });
    const data = await res.json();
    return data.results || data.books || [];
  } catch(e) {
    console.log('[Search] Error:', e.message);
    return [];
  } finally {
    t.clear();
  }
}

// ── AI RETRIEVAL STUB (RAG) ──────────────────────────────────────
// Phase 1: Uses approved_answers table
// Phase 2: pgvector similarity search on book_chunks
// Phase 3: Full RAG with Gemini embeddings

/**
 * Get scripture context for a DharmaChat question.
 * Returns approved answers or empty if unavailable.
 */
export async function getScriptureContext(question, { lang = 'hindi' } = {}) {
  const t = makeAbortTimeout(5000);
  try {
    const res = await fetch(`${BACKEND}/chat/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, lang }),
      signal: t.signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.context || [];
  } catch { return []; } finally { t.clear(); }
}

// ── OBJECT STORAGE STUB ──────────────────────────────────────────
// Phase 1: Google Drive URLs (already implemented)
// Phase 2: Cloudflare R2 presigned URLs
// Phase 3: Supabase Storage with CDN

/**
 * Get a book's file URL.
 * Currently: passes through the stored file_url.
 * Phase 2: swap for presigned R2 URL generation.
 */
export function getBookFileUrl(book) {
  if (!book?.file_url) return null;
  // Future Phase 2:
  // if (book.storage_provider === 'r2') return getR2PresignedUrl(book.file_url);
  return book.file_url;
}

// ── BACKGROUND JOB STUB ──────────────────────────────────────────
// Phase 1: Direct sync API call
// Phase 2: Render Background Workers / BullMQ

/**
 * Trigger book indexing in background.
 * @param {string} bookId
 */
export async function triggerBookIndex(bookId) {
  const t = makeAbortTimeout(10000);
  try {
    const res = await fetch(`${BACKEND}/admin/library/index/${bookId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: t.signal,
    });
    return res.ok;
  } catch(e) {
    console.log('[Scale] triggerBookIndex error:', e.message);
    return false;
  } finally {
    t.clear();
  }
}

// ── PUSH NOTIFICATION SERVER REGISTRATION ────────────────────────
/**
 * Register Expo push token with backend for server-triggered notifications.
 * Phase 1: fire-and-forget
 * Phase 2: linked to user segments and preferences
 */
export async function registerPushToken(phone, token) {
  if (!phone || !token) return;
  try {
    await fetch(`${BACKEND}/users/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, token }),
    });
  } catch {}
}

// ── ANALYTICS EVENT FLUSH (to backend) ──────────────────────────
/**
 * Flush buffered analytics events to backend for server-side reporting.
 * Phase 1: no-op (events stay local)
 * Phase 2: POST to /analytics/events
 */
export async function flushAnalyticsToBackend(events = []) {
  if (!events.length) return;
  const t = makeAbortTimeout(5000);
  try {
    await fetch(`${BACKEND}/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      signal: t.signal,
    });
  } catch {} finally { t.clear(); }
}

// ── EXPORT SUMMARY ───────────────────────────────────────────────
// When upgrading:
//   searchScriptures  → add pgvector body
//   getScriptureContext → add embedding similarity query
//   getBookFileUrl    → R2 presigned URL
//   triggerBookIndex  → Render Background Worker API
//   registerPushToken → Expo push subscription list
//   flushAnalyticsToBackend → PostHog / Amplitude ingest
