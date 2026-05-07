// ════════════════════════════════════════════════════════════════
// DharmaSetu — P4 Mantra Audio Ecosystem
// FILE: app/utils/mantraAudio.js
//
// Architecture:
//   Phase 1 (now):  expo-speech TTS — zero storage, works offline
//   Phase 2 (future): Expo AV with CDN-hosted MP3 mantra packs
//   Phase 3 (future): Offline downloadable mantra packs
//
// Exports:
//   speakMantra(mantra, lang)   — TTS playback
//   stopSpeaking()              — stop TTS
//   isSpeaking()                — status check
//   MantraSession               — full japa session manager
//   useMantraAudio(mantra)      — React hook for play/pause/progress
// ════════════════════════════════════════════════════════════════
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useRef, useCallback } from 'react';

// ── TTS VOICE CONFIG ─────────────────────────────────────────────
const TTS_CONFIG = {
  hindi: {
    language: 'hi-IN',
    pitch: 0.85,
    rate:  0.72,  // slower for mantra chanting
  },
  sanskrit: {
    language: 'hi-IN', // Sanskrit uses Hindi TTS
    pitch: 0.80,
    rate:  0.65,  // slowest — for precise pronunciation
  },
  english: {
    language: 'en-IN',
    pitch: 0.90,
    rate:  0.80,
  },
};

// ── STORAGE KEYS ─────────────────────────────────────────────────
const KEYS = {
  JAPA_STATS:      'ds_japa_stats',
  RECENT_MANTRAS:  'ds_recent_mantras_v2',
  MANTRA_STREAKS:  'ds_mantra_streaks',
  DAILY_CHANTING:  'ds_daily_chanting',
  JAPA_GOALS:      'ds_japa_goals',
};

// ════════════════════════════════════════════════════════════════
// CORE TTS FUNCTIONS
// ════════════════════════════════════════════════════════════════

/**
 * Speak a mantra using TTS.
 * @param {string} text      — mantra text (Sanskrit/Hindi)
 * @param {string} lang      — 'hindi' | 'sanskrit' | 'english'
 * @param {Function} onDone  — called when speech ends
 * @param {Function} onError — called on TTS error
 */
export function speakMantra(text, lang = 'sanskrit', onDone, onError) {
  if (!text) return;
  const cfg = TTS_CONFIG[lang] || TTS_CONFIG.sanskrit;
  Speech.speak(text, {
    language:  cfg.language,
    pitch:     cfg.pitch,
    rate:      cfg.rate,
    onDone:    () => { if (typeof onDone  === 'function') onDone(); },
    onError:   (e) => { if (typeof onError === 'function') onError(e); },
    onStopped: () => { if (typeof onDone  === 'function') onDone(); },
  });
}

export function stopSpeaking() {
  try { Speech.stop(); } catch {}
}

export async function isSpeaking() {
  try { return await Speech.isSpeakingAsync(); }
  catch { return false; }
}

// ── MANTRA REPEAT PLAYER ─────────────────────────────────────────
// Plays a mantra repeatedly for japa counting
class MantraRepeatPlayer {
  constructor(mantraText, lang, onRepeat, onError) {
    this.text     = mantraText;
    this.lang     = lang;
    this.onRepeat = onRepeat;
    this.onError  = onError;
    this.running  = false;
    this.count    = 0;
    this.maxCount = 108;
  }

  start(maxCount = 108) {
    this.running  = true;
    this.maxCount = maxCount;
    this._playNext();
  }

  stop() {
    this.running = false;
    stopSpeaking();
  }

  _playNext() {
    if (!this.running || this.count >= this.maxCount) { this.running = false; return; }
    speakMantra(
      this.text, this.lang,
      () => {
        this.count++;
        if (typeof this.onRepeat === 'function') this.onRepeat(this.count);
        if (this.running && this.count < this.maxCount) {
          setTimeout(() => this._playNext(), 400); // 400ms gap between repetitions
        } else {
          this.running = false;
        }
      },
      (e) => {
        this.running = false;
        if (typeof this.onError === 'function') this.onError(e);
      }
    );
  }
}

export function createMantraPlayer(mantraText, lang, onRepeat, onError) {
  return new MantraRepeatPlayer(mantraText, lang, onRepeat, onError);
}

// ════════════════════════════════════════════════════════════════
// JAPA STATS PERSISTENCE
// ════════════════════════════════════════════════════════════════

export async function saveJapaSession({ mantraId, mantraName, count, durationMs }) {
  try {
    const today    = new Date().toDateString();
    const statsRaw = await AsyncStorage.getItem(KEYS.JAPA_STATS);
    const stats    = statsRaw ? JSON.parse(statsRaw) : {};

    if (!stats[today]) stats[today] = { sessions: [], totalCount: 0, totalMs: 0 };
    stats[today].sessions.push({ mantraId, mantraName, count, durationMs, ts: Date.now() });
    stats[today].totalCount += count;
    stats[today].totalMs    += durationMs;

    // Keep last 30 days only
    const keys = Object.keys(stats).sort().slice(-30);
    const trimmed = {};
    keys.forEach(k => { trimmed[k] = stats[k]; });
    await AsyncStorage.setItem(KEYS.JAPA_STATS, JSON.stringify(trimmed));

    // Update streak
    await updateMantraStreak(today);
    // Update daily chanting goal
    await recordDailyChanting(today, count);
    // Add to recent
    await addRecentMantra({ id: mantraId, name: mantraName });
  } catch(e) { console.log('[MantraAudio] saveJapaSession error:', e.message); }
}

export async function getJapaStats(days = 7) {
  try {
    const raw = await AsyncStorage.getItem(KEYS.JAPA_STATS);
    if (!raw) return { sessions: [], totalCount: 0, streak: 0, todayCount: 0 };
    const stats = JSON.parse(raw);
    const today = new Date().toDateString();
    const todayStats = stats[today] || { totalCount: 0 };
    const allSessions = Object.values(stats).flatMap(d => d.sessions || []);
    const streak = await getMantraStreak();
    return {
      sessions:    allSessions.slice(-50),
      totalCount:  allSessions.reduce((s, x) => s + (x.count || 0), 0),
      todayCount:  todayStats.totalCount || 0,
      streak,
    };
  } catch { return { sessions: [], totalCount: 0, streak: 0, todayCount: 0 }; }
}

async function updateMantraStreak(today) {
  try {
    const raw    = await AsyncStorage.getItem(KEYS.MANTRA_STREAKS);
    const data   = raw ? JSON.parse(raw) : { streak: 0, lastDate: null };
    const todayD = new Date(today);
    const lastD  = data.lastDate ? new Date(data.lastDate) : null;
    const diff   = lastD ? Math.round((todayD - lastD) / 86400000) : 99;
    if (diff === 1)      data.streak += 1;
    else if (diff > 1)   data.streak  = 1;
    data.lastDate = today;
    await AsyncStorage.setItem(KEYS.MANTRA_STREAKS, JSON.stringify(data));
  } catch {}
}

export async function getMantraStreak() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.MANTRA_STREAKS);
    return raw ? (JSON.parse(raw).streak || 0) : 0;
  } catch { return 0; }
}

async function recordDailyChanting(today, count) {
  try {
    const raw   = await AsyncStorage.getItem(KEYS.DAILY_CHANTING);
    const data  = raw ? JSON.parse(raw) : {};
    data[today] = (data[today] || 0) + count;
    // Keep 30 days
    const keys = Object.keys(data).sort().slice(-30);
    const trimmed = {};
    keys.forEach(k => { trimmed[k] = data[k]; });
    await AsyncStorage.setItem(KEYS.DAILY_CHANTING, JSON.stringify(trimmed));
  } catch {}
}

export async function getDailyChantingChart(days = 7) {
  try {
    const raw = await AsyncStorage.getItem(KEYS.DAILY_CHANTING);
    if (!raw) return [];
    const data = JSON.parse(raw);
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d    = new Date();
      d.setDate(d.getDate() - i);
      const key  = d.toDateString();
      const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
      result.push({ date: key, label, count: data[key] || 0 });
    }
    return result;
  } catch { return []; }
}

// ── RECENT MANTRAS ───────────────────────────────────────────────
export async function addRecentMantra(mantra) {
  try {
    const raw    = await AsyncStorage.getItem(KEYS.RECENT_MANTRAS);
    const recent = raw ? JSON.parse(raw) : [];
    const filtered = recent.filter(m => m.id !== mantra.id);
    const updated  = [{ ...mantra, ts: Date.now() }, ...filtered].slice(0, 10);
    await AsyncStorage.setItem(KEYS.RECENT_MANTRAS, JSON.stringify(updated));
  } catch {}
}

export async function getRecentMantras() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.RECENT_MANTRAS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── DAILY GOALS ──────────────────────────────────────────────────
export async function setJapaGoal(goal = 108) {
  try { await AsyncStorage.setItem(KEYS.JAPA_GOALS, JSON.stringify({ goal, set_at: Date.now() })); }
  catch {}
}

export async function getJapaGoal() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.JAPA_GOALS);
    return raw ? (JSON.parse(raw).goal || 108) : 108;
  } catch { return 108; }
}

// ════════════════════════════════════════════════════════════════
// REACT HOOK: useMantraAudio
// ════════════════════════════════════════════════════════════════

/**
 * Hook for mantra audio playback in a component.
 *
 * @param {object} mantra  - { id, text, name, lang? }
 * @param {object} opts
 * @param {number}   opts.target  - japa target (default 108)
 * @param {boolean}  opts.autoSave - save session on complete (default true)
 */
export function useMantraAudio(mantra, { target = 108, autoSave = true } = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [count,     setCount]     = useState(0);
  const [status,    setStatus]    = useState('idle'); // 'idle'|'playing'|'paused'|'done'
  const [startedAt, setStartedAt] = useState(null);
  const playerRef   = useRef(null);
  const isMounted   = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; stopSpeaking(); };
  }, []);

  const play = useCallback(() => {
    if (!mantra?.text) return;
    stopSpeaking();
    setStatus('playing');
    setIsPlaying(true);
    setStartedAt(Date.now());

    playerRef.current = createMantraPlayer(
      mantra.text,
      mantra.lang || 'sanskrit',
      (c) => { if (isMounted.current) setCount(c); },
      () => { if (isMounted.current) { setStatus('idle'); setIsPlaying(false); } }
    );
    playerRef.current.start(target - count);
  }, [mantra, count, target]);

  const pause = useCallback(() => {
    playerRef.current?.stop();
    setIsPlaying(false);
    setStatus('paused');
  }, []);

  const reset = useCallback(async () => {
    playerRef.current?.stop();
    setIsPlaying(false);
    setStatus('idle');
    // Save session if count > 0
    if (autoSave && count > 0 && startedAt) {
      await saveJapaSession({
        mantraId:   mantra?.id   || 'unknown',
        mantraName: mantra?.name || '',
        count,
        durationMs: Date.now() - startedAt,
      });
    }
    setCount(0);
    setStartedAt(null);
  }, [mantra, count, startedAt, autoSave]);

  const progress = target > 0 ? Math.min(count / target, 1) : 0;
  const remaining = Math.max(target - count, 0);

  return { isPlaying, count, progress, remaining, status, play, pause, reset };
}
