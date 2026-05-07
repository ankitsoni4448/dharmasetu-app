// ════════════════════════════════════════════════════════════════
// DharmaSetu — P4 Personalized Spiritual Journey System
// FILE: app/utils/journey.js
//
// Manages user's personalized spiritual data:
//   - Reading history (books, chapters)
//   - Mantra & japa history
//   - Spiritual streak (daily engagement)
//   - Daily spiritual goals
//   - Personalized recommendations
//   - Favourite scriptures
//   - Recent Panchang activity
//   - Engagement scoring
// ════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  READING_HISTORY:  'ds_reading_history',
  BOOK_PROGRESS:    'ds_book_progress',
  BOOK_BOOKMARKS:   'ds_book_bookmarks',
  FAV_SCRIPTURES:   'ds_fav_scriptures',
  SPIRITUAL_STREAK: 'ds_spiritual_streak',
  DAILY_GOALS:      'ds_daily_goals',
  ENGAGEMENT:       'ds_engagement_v2',
  CHAT_HISTORY:     'ds_chat_history',
  RECOMMENDATIONS:  'ds_recommendations',
};

// ════════════════════════════════════════════════════════════════
// READING HISTORY
// ════════════════════════════════════════════════════════════════

/**
 * Record that a user viewed a book.
 * @param {{ id, title, category, language, author }} book
 */
export async function recordBookView(book) {
  try {
    const raw  = await AsyncStorage.getItem(KEYS.READING_HISTORY);
    const hist = raw ? JSON.parse(raw) : [];
    const existing = hist.findIndex(h => h.id === book.id);
    const entry = { ...book, lastViewed: Date.now(), viewCount: 1 };
    if (existing >= 0) {
      entry.viewCount = (hist[existing].viewCount || 1) + 1;
      hist.splice(existing, 1);
    }
    const updated = [entry, ...hist].slice(0, 50); // keep last 50
    await AsyncStorage.setItem(KEYS.READING_HISTORY, JSON.stringify(updated));
    await recordEngagement('book_view', { bookId: book.id });
  } catch(e) { console.log('[Journey] recordBookView:', e.message); }
}

export async function getReadingHistory(limit = 10) {
  try {
    const raw = await AsyncStorage.getItem(KEYS.READING_HISTORY);
    return raw ? JSON.parse(raw).slice(0, limit) : [];
  } catch { return []; }
}

// ── Book progress (chapter/page tracking) ────────────────────────
export async function saveBookProgress(bookId, { chapter = 0, page = 0, pct = 0 } = {}) {
  try {
    const raw      = await AsyncStorage.getItem(KEYS.BOOK_PROGRESS);
    const progress = raw ? JSON.parse(raw) : {};
    progress[bookId] = { chapter, page, pct, updatedAt: Date.now() };
    await AsyncStorage.setItem(KEYS.BOOK_PROGRESS, JSON.stringify(progress));
  } catch {}
}

export async function getBookProgress(bookId) {
  try {
    const raw = await AsyncStorage.getItem(KEYS.BOOK_PROGRESS);
    return raw ? (JSON.parse(raw)[bookId] || null) : null;
  } catch { return null; }
}

export async function getAllInProgress() {
  try {
    const [histRaw, progRaw] = await Promise.all([
      AsyncStorage.getItem(KEYS.READING_HISTORY),
      AsyncStorage.getItem(KEYS.BOOK_PROGRESS),
    ]);
    const hist  = histRaw  ? JSON.parse(histRaw)  : [];
    const prog  = progRaw  ? JSON.parse(progRaw)  : {};
    return hist
      .filter(b => prog[b.id] && prog[b.id].pct > 0 && prog[b.id].pct < 1)
      .map(b => ({ ...b, progress: prog[b.id] }))
      .slice(0, 5);
  } catch { return []; }
}

// ── Bookmarks ────────────────────────────────────────────────────
export async function addBookmark(bookId, { chapter, verse, text, note = '' }) {
  try {
    const raw   = await AsyncStorage.getItem(KEYS.BOOK_BOOKMARKS);
    const marks = raw ? JSON.parse(raw) : {};
    if (!marks[bookId]) marks[bookId] = [];
    marks[bookId].unshift({ chapter, verse, text, note, ts: Date.now() });
    marks[bookId] = marks[bookId].slice(0, 20); // max 20 bookmarks per book
    await AsyncStorage.setItem(KEYS.BOOK_BOOKMARKS, JSON.stringify(marks));
  } catch {}
}

export async function getBookmarks(bookId) {
  try {
    const raw = await AsyncStorage.getItem(KEYS.BOOK_BOOKMARKS);
    return raw ? (JSON.parse(raw)[bookId] || []) : [];
  } catch { return []; }
}

export async function removeBookmark(bookId, ts) {
  try {
    const raw   = await AsyncStorage.getItem(KEYS.BOOK_BOOKMARKS);
    const marks = raw ? JSON.parse(raw) : {};
    if (marks[bookId]) {
      marks[bookId] = marks[bookId].filter(m => m.ts !== ts);
      await AsyncStorage.setItem(KEYS.BOOK_BOOKMARKS, JSON.stringify(marks));
    }
  } catch {}
}

// ── Favourite scriptures ─────────────────────────────────────────
export async function toggleFavScripture(book) {
  try {
    const raw  = await AsyncStorage.getItem(KEYS.FAV_SCRIPTURES);
    const favs = raw ? JSON.parse(raw) : [];
    const idx  = favs.findIndex(f => f.id === book.id);
    if (idx >= 0) { favs.splice(idx, 1); }
    else          { favs.unshift({ ...book, favAt: Date.now() }); }
    await AsyncStorage.setItem(KEYS.FAV_SCRIPTURES, JSON.stringify(favs.slice(0, 30)));
    return idx < 0; // true = added, false = removed
  } catch { return false; }
}

export async function isFavScripture(bookId) {
  try {
    const raw = await AsyncStorage.getItem(KEYS.FAV_SCRIPTURES);
    return raw ? JSON.parse(raw).some(f => f.id === bookId) : false;
  } catch { return false; }
}

export async function getFavScriptures() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.FAV_SCRIPTURES);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ════════════════════════════════════════════════════════════════
// SPIRITUAL STREAK SYSTEM
// ════════════════════════════════════════════════════════════════

/**
 * Mark today as spiritually active.
 * Call once per day when user opens the app and does any dharmic activity.
 */
export async function touchStreak() {
  try {
    const today   = new Date().toDateString();
    const raw     = await AsyncStorage.getItem(KEYS.SPIRITUAL_STREAK);
    const data    = raw ? JSON.parse(raw) : { streak: 0, best: 0, lastDate: null };
    const lastD   = data.lastDate ? new Date(data.lastDate) : null;
    const todayD  = new Date(today);
    const diff    = lastD ? Math.round((todayD - lastD) / 86400000) : 99;

    if (data.lastDate === today) return data; // already counted today

    if (diff === 1) {
      data.streak += 1;
    } else if (diff > 1) {
      data.streak  = 1;
    }
    data.best     = Math.max(data.best || 0, data.streak);
    data.lastDate = today;
    await AsyncStorage.setItem(KEYS.SPIRITUAL_STREAK, JSON.stringify(data));
    return data;
  } catch { return { streak: 0, best: 0 }; }
}

export async function getStreak() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SPIRITUAL_STREAK);
    return raw ? JSON.parse(raw) : { streak: 0, best: 0 };
  } catch { return { streak: 0, best: 0 }; }
}

// ════════════════════════════════════════════════════════════════
// DAILY SPIRITUAL GOALS
// ════════════════════════════════════════════════════════════════

const DEFAULT_GOALS = {
  japaCount:    108,   // mantras per day
  readMinutes:  15,    // reading minutes
  chatQuestions: 3,   // DharmaChat questions
};

export async function getGoals() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.DAILY_GOALS);
    return raw ? { ...DEFAULT_GOALS, ...JSON.parse(raw).goals } : DEFAULT_GOALS;
  } catch { return DEFAULT_GOALS; }
}

export async function setGoals(goals = {}) {
  try {
    await AsyncStorage.setItem(KEYS.DAILY_GOALS, JSON.stringify({
      goals: { ...DEFAULT_GOALS, ...goals },
      updatedAt: Date.now(),
    }));
  } catch {}
}

// ════════════════════════════════════════════════════════════════
// ENGAGEMENT SCORING
// ════════════════════════════════════════════════════════════════

const ENGAGEMENT_WEIGHTS = {
  book_view:      2,
  book_read:      5,
  mantra_japa:    3,
  chat_question:  4,
  panchang_view:  1,
  share:          3,
  fact_check:     3,
  kundli_view:    2,
};

export async function recordEngagement(action, meta = {}) {
  try {
    const today = new Date().toDateString();
    const raw   = await AsyncStorage.getItem(KEYS.ENGAGEMENT);
    const data  = raw ? JSON.parse(raw) : {};
    if (!data[today]) data[today] = { score: 0, actions: [] };
    const weight = ENGAGEMENT_WEIGHTS[action] || 1;
    data[today].score   += weight;
    data[today].actions.push({ action, weight, ts: Date.now(), ...meta });

    // Keep last 30 days
    const keys = Object.keys(data).sort().slice(-30);
    const trimmed = {};
    keys.forEach(k => { trimmed[k] = data[k]; });
    await AsyncStorage.setItem(KEYS.ENGAGEMENT, JSON.stringify(trimmed));
  } catch {}
}

export async function getEngagementSummary(days = 7) {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ENGAGEMENT);
    if (!raw) return { totalScore: 0, avgPerDay: 0, chart: [] };
    const data = JSON.parse(raw);
    const chart = [];
    let total = 0;
    for (let i = days - 1; i >= 0; i--) {
      const d     = new Date();
      d.setDate(d.getDate() - i);
      const key   = d.toDateString();
      const score = data[key]?.score || 0;
      chart.push({ date: key, label: d.toLocaleDateString('en-IN', { weekday: 'short' }), score });
      total += score;
    }
    return { totalScore: total, avgPerDay: Math.round(total / days), chart };
  } catch { return { totalScore: 0, avgPerDay: 0, chart: [] }; }
}

// ════════════════════════════════════════════════════════════════
// CHAT HISTORY (Conversation continuity)
// ════════════════════════════════════════════════════════════════

/**
 * Save DharmaChat conversation to local history.
 * Keeps last 5 conversations, each up to 20 messages.
 */
export async function saveChatHistory(messages = [], sessionId = null) {
  try {
    const raw   = await AsyncStorage.getItem(KEYS.CHAT_HISTORY);
    const hist  = raw ? JSON.parse(raw) : [];
    const sid   = sessionId || `chat_${Date.now()}`;
    const entry = {
      id:      sid,
      messages: messages.slice(-20),
      savedAt: Date.now(),
      summary: messages.find(m => m.role === 'user')?.content?.slice(0, 80) || '',
    };
    const existing = hist.findIndex(h => h.id === sid);
    if (existing >= 0) hist[existing] = entry;
    else hist.unshift(entry);
    await AsyncStorage.setItem(KEYS.CHAT_HISTORY, JSON.stringify(hist.slice(0, 5)));
  } catch {}
}

export async function getChatHistory() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CHAT_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function getLastChatSession() {
  const hist = await getChatHistory();
  return hist[0] || null;
}

// ════════════════════════════════════════════════════════════════
// PERSONALIZED RECOMMENDATIONS
// ════════════════════════════════════════════════════════════════

/**
 * Generate simple content-based recommendations from user history.
 * Phase 2: Replace with server-side AI recommendations.
 *
 * @param {object} categories  - { vedas: BookObj[], upanishads: BookObj[], ... }
 * @returns {BookObj[]}        - Recommended books
 */
export async function getPersonalizedRecommendations(allBooks = []) {
  try {
    const history   = await getReadingHistory(20);
    const inProgress = await getAllInProgress();

    // Category frequency from reading history
    const catFreq = {};
    history.forEach(b => { catFreq[b.category] = (catFreq[b.category] || 0) + 1; });

    // Most read category
    const topCat = Object.entries(catFreq).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Viewed book IDs
    const viewedIds = new Set(history.map(b => b.id));

    // Recommend: unread books from top category first, then random
    const recs = allBooks
      .filter(b => !viewedIds.has(b.id) && b.is_active !== false)
      .sort((a, b) => {
        if (topCat) {
          if (a.category === topCat && b.category !== topCat) return -1;
          if (b.category === topCat && a.category !== topCat) return  1;
        }
        return (b.views || 0) - (a.views || 0);
      })
      .slice(0, 6);

    return { recommendations: recs, inProgress, topCategory: topCat };
  } catch { return { recommendations: [], inProgress: [], topCategory: null }; }
}

// ════════════════════════════════════════════════════════════════
// COMPOSITE SUMMARY (for home screen personalization)
// ════════════════════════════════════════════════════════════════

export async function getJourneySummary() {
  try {
    const [streak, engagement, recent, inProgress, favs] = await Promise.all([
      getStreak(),
      getEngagementSummary(7),
      getReadingHistory(3),
      getAllInProgress(),
      getFavScriptures(),
    ]);
    return { streak, engagement, recentReads: recent, inProgress, favScriptures: favs };
  } catch { return { streak: { streak: 0 }, engagement: {}, recentReads: [], inProgress: [], favScriptures: [] }; }
}
