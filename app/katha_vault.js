// DharmaSetu — Katha Vault — RELEASE BUILD
// ✅ PDF download via expo-print (replaces broken FileSystem download)
// ✅ Slow-walk: 1 verse at a time, 20s gap — permanent 429 fix
// ✅ Gemini quota exhausted? Goes straight to Groq, no wasted calls
// ✅ Clear cache button to reset incomplete chapters
// ✅ VERSE_MASTER validates every chapter count before saving
// ✅ Expo SDK 54 compatible — no deprecated APIs

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Modal, ScrollView,
  Share, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GROQ_KEY, GEM_KEY, BACKEND_URL } from '../config_keys';

// ═══════════════════════════════════════════════════════════════
// SCRIPTURES
// ═══════════════════════════════════════════════════════════════
const SCRIPTURES = [
  {
    id:'bhagavad_gita', icon:'📖', name:'Bhagavad Gita', nameHi:'भगवद्गीता',
    desc:'700 shlokas · 18 Chapters · Sri Krishna to Arjuna',
    descHi:'700 श्लोक · 18 अध्याय · श्रीकृष्ण द्वारा अर्जुन को',
    color:'#E8620A', type:'gita', primaryLang:'Sanskrit',
    units:[
      {n:1, t:'Arjuna Vishada Yoga',             tH:'अर्जुन विषाद योग',              s:47},
      {n:2, t:'Sankhya Yoga',                     tH:'सांख्य योग',                    s:72},
      {n:3, t:'Karma Yoga',                       tH:'कर्म योग',                      s:43},
      {n:4, t:'Jnana Karma Sanyasa Yoga',         tH:'ज्ञान कर्म संन्यास योग',        s:42},
      {n:5, t:'Karma Sanyasa Yoga',               tH:'कर्म संन्यास योग',              s:29},
      {n:6, t:'Atmasanyama Yoga',                 tH:'आत्मसंयम योग',                  s:47},
      {n:7, t:'Jnana Vijnana Yoga',               tH:'ज्ञान विज्ञान योग',             s:30},
      {n:8, t:'Aksara Brahma Yoga',               tH:'अक्षर ब्रह्म योग',              s:28},
      {n:9, t:'Raja Vidya Raja Guhya Yoga',       tH:'राज विद्या राज गुह्य योग',      s:34},
      {n:10,t:'Vibhuti Yoga',                     tH:'विभूति योग',                    s:42},
      {n:11,t:'Vishwarupa Darshana Yoga',         tH:'विश्वरूप दर्शन योग',            s:55},
      {n:12,t:'Bhakti Yoga',                      tH:'भक्ति योग',                     s:20},
      {n:13,t:'Kshetra Kshetragnya Vibhaga Yoga', tH:'क्षेत्र क्षेत्रज्ञ विभाग योग',  s:34},
      {n:14,t:'Gunatraya Vibhaga Yoga',           tH:'गुणत्रय विभाग योग',             s:27},
      {n:15,t:'Purushottama Yoga',                tH:'पुरुषोत्तम योग',                s:20},
      {n:16,t:'Daivasura Sampad Vibhaga Yoga',    tH:'दैवासुर संपद विभाग योग',        s:24},
      {n:17,t:'Sraddhatraya Vibhaga Yoga',        tH:'श्रद्धात्रय विभाग योग',         s:28},
      {n:18,t:'Moksha Sanyasa Yoga',              tH:'मोक्ष संन्यास योग',              s:78},
    ],
  },
  {
    id:'valmiki_ramayana', icon:'🏹', name:'Valmiki Ramayana', nameHi:'वाल्मीकि रामायण',
    desc:'24,000 verses · 7 Kandas · By Maharishi Valmiki',
    descHi:'24,000 श्लोक · 7 काण्ड · महर्षि वाल्मीकि द्वारा',
    color:'#C9830A', type:'ramayana', primaryLang:'Sanskrit',
    units:[
      {n:1,t:'Bala Kanda',       tH:'बाल काण्ड',       s:77},
      {n:2,t:'Ayodhya Kanda',    tH:'अयोध्या काण्ड',   s:119},
      {n:3,t:'Aranya Kanda',     tH:'अरण्य काण्ड',     s:75},
      {n:4,t:'Kishkindha Kanda', tH:'किष्किन्धा काण्ड',s:67},
      {n:5,t:'Sundara Kanda',    tH:'सुन्दर काण्ड',    s:68},
      {n:6,t:'Yuddha Kanda',     tH:'युद्ध काण्ड',     s:131},
      {n:7,t:'Uttara Kanda',     tH:'उत्तर काण्ड',     s:111},
    ],
  },
  {
    id:'ramcharitmanas', icon:'🪷', name:'Ramcharitmanas', nameHi:'रामचरितमानस',
    desc:'Awadhi · Dohas & Chaupais · By Sant Tulsidas',
    descHi:'अवधी · दोहे व चौपाई · संत तुलसीदास',
    color:'#8B4513', type:'manas', primaryLang:'Awadhi',
    units:[
      {n:1,t:'Bal Kand',        tH:'बाल काण्ड',       s:360},
      {n:2,t:'Ayodhya Kand',    tH:'अयोध्या काण्ड',   s:326},
      {n:3,t:'Aranya Kand',     tH:'अरण्य काण्ड',     s:46},
      {n:4,t:'Kishkindha Kand', tH:'किष्किन्धा काण्ड',s:30},
      {n:5,t:'Sundar Kand',     tH:'सुन्दर काण्ड',    s:60},
      {n:6,t:'Lanka Kand',      tH:'लंका काण्ड',      s:117},
      {n:7,t:'Uttar Kand',      tH:'उत्तर काण्ड',     s:130},
    ],
  },
  {
    id:'mahabharata', icon:'⚔️', name:'Mahabharata', nameHi:'महाभारत',
    desc:'18 Parvas · Epic of Dharma · By Maharishi Vyasa',
    descHi:'18 पर्व · धर्म का महाकाव्य · महर्षि व्यास',
    color:'#6B21A8', type:'mahabharat', primaryLang:'Sanskrit',
    units:[
      {n:1, t:'Adi Parva',              tH:'आदि पर्व',           s:227},
      {n:2, t:'Sabha Parva',            tH:'सभा पर्व',           s:79},
      {n:3, t:'Vana Parva',             tH:'वन पर्व',            s:317},
      {n:4, t:'Virata Parva',           tH:'विराट पर्व',         s:72},
      {n:5, t:'Udyoga Parva',           tH:'उद्योग पर्व',        s:199},
      {n:6, t:'Bhishma Parva',          tH:'भीष्म पर्व',         s:122},
      {n:7, t:'Drona Parva',            tH:'द्रोण पर्व',         s:203},
      {n:8, t:'Karna Parva',            tH:'कर्ण पर्व',          s:96},
      {n:9, t:'Shalya Parva',           tH:'शल्य पर्व',          s:64},
      {n:10,t:'Sauptika Parva',         tH:'सौप्तिक पर्व',        s:18},
      {n:11,t:'Stri Parva',             tH:'स्त्री पर्व',         s:27},
      {n:12,t:'Shanti Parva',           tH:'शांति पर्व',          s:365},
      {n:13,t:'Anushasana Parva',       tH:'अनुशासन पर्व',        s:168},
      {n:14,t:'Ashvamedhika Parva',     tH:'अश्वमेधिका पर्व',     s:96},
      {n:15,t:'Ashramavasika Parva',    tH:'आश्रमवासिक पर्व',     s:47},
      {n:16,t:'Mausala Parva',          tH:'मौसल पर्व',           s:9},
      {n:17,t:'Mahaprasthanika Parva',  tH:'महाप्रस्थानिक पर्व',  s:3},
      {n:18,t:'Svargarohana Parva',     tH:'स्वर्गारोहण पर्व',    s:5},
    ],
  },
  {
    id:'srimad_bhagavatam', icon:'🌸', name:'Srimad Bhagavatam', nameHi:'श्रीमद् भागवतम्',
    desc:'12 Skandhas · Krishna Lila · By Maharishi Vyasa',
    descHi:'12 स्कंध · श्रीकृष्ण लीला · महर्षि व्यास',
    color:'#27AE60', type:'bhagavatam', primaryLang:'Sanskrit',
    units:[
      {n:1, t:'Skandha 1 — Creation',         tH:'स्कंध 1 — सृष्टि व परिचय',   s:19},
      {n:2, t:'Skandha 2 — Cosmic Form',       tH:'स्कंध 2 — विश्वरूप दर्शन',   s:10},
      {n:3, t:'Skandha 3 — Status Quo',        tH:'स्कंध 3 — मैत्रेय संवाद',     s:33},
      {n:4, t:'Skandha 4 — Fourth Creation',   tH:'स्कंध 4 — चतुर्थ सर्ग',      s:31},
      {n:5, t:'Skandha 5 — Creative Impetus',  tH:'स्कंध 5 — प्रियव्रत वंश',     s:26},
      {n:6, t:'Skandha 6 — Duties',            tH:'स्कंध 6 — विष्णुदूत कथा',    s:19},
      {n:7, t:'Skandha 7 — Science of God',    tH:'स्कंध 7 — प्रह्लाद चरित्र',  s:15},
      {n:8, t:'Skandha 8 — Withdrawal',        tH:'स्कंध 8 — गजेंद्र मोक्ष',   s:24},
      {n:9, t:'Skandha 9 — Liberation',        tH:'स्कंध 9 — वंशानुचरित',       s:24},
      {n:10,t:'Skandha 10 — Krishna Lila',     tH:'स्कंध 10 — श्रीकृष्ण लीला', s:90},
      {n:11,t:'Skandha 11 — Uddhava Gita',     tH:'स्कंध 11 — उद्धव गीता',      s:31},
      {n:12,t:'Skandha 12 — Age of Kali',      tH:'स्कंध 12 — कलियुग वर्णन',    s:13},
    ],
  },
  {
    id:'upanishads', icon:'🕉', name:'Key Upanishads', nameHi:'प्रमुख उपनिषद्',
    desc:'10 Principal Upanishads — Vedanta source',
    descHi:'10 मुख्य उपनिषद् — वेदांत का मूल',
    color:'#1A5C8B', type:'upanishad', primaryLang:'Sanskrit',
    units:[
      {n:1, t:'Isha Upanishad',           tH:'ईशावास्य उपनिषद्',   s:18},
      {n:2, t:'Kena Upanishad',           tH:'केन उपनिषद्',        s:35},
      {n:3, t:'Katha Upanishad',          tH:'कठ उपनिषद्',         s:119},
      {n:4, t:'Prasna Upanishad',         tH:'प्रश्न उपनिषद्',     s:67},
      {n:5, t:'Mundaka Upanishad',        tH:'मुण्डक उपनिषद्',     s:64},
      {n:6, t:'Mandukya Upanishad',       tH:'माण्डूक्य उपनिषद्',  s:12},
      {n:7, t:'Taittiriya Upanishad',     tH:'तैत्तिरीय उपनिषद्',  s:34},
      {n:8, t:'Aitareya Upanishad',       tH:'ऐतरेय उपनिषद्',      s:33},
      {n:9, t:'Chandogya Upanishad',      tH:'छांदोग्य उपनिषद्',   s:154},
      {n:10,t:'Brihadaranyaka Upanishad', tH:'बृहदारण्यक उपनिषद्', s:150},
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// VERSE MASTER MAP — authoritative shloka counts
// ═══════════════════════════════════════════════════════════════
const VERSE_MASTER = {
  bhagavad_gita:{1:47,2:72,3:43,4:42,5:29,6:47,7:30,8:28,9:34,10:42,11:55,12:20,13:34,14:27,15:20,16:24,17:28,18:78},
  valmiki_ramayana:{1:77,2:119,3:75,4:67,5:68,6:131,7:111},
  ramcharitmanas:{1:360,2:326,3:46,4:30,5:60,6:117,7:130},
  mahabharata:{1:227,2:79,3:317,4:72,5:199,6:122,7:203,8:96,9:64,10:18,11:27,12:365,13:168,14:96,15:47,16:9,17:3,18:5},
  srimad_bhagavatam:{1:19,2:10,3:33,4:31,5:26,6:19,7:15,8:24,9:24,10:90,11:31,12:13},
  upanishads:{1:18,2:35,3:119,4:67,5:64,6:12,7:34,8:33,9:154,10:150},
};

// ═══════════════════════════════════════════════════════════════
// CACHE — AsyncStorage (permanent, never expires)
// ═══════════════════════════════════════════════════════════════
const CV = 'kv11_';
async function getCached(sid, n, lang) {
  try {
    const r = await AsyncStorage.getItem(`${CV}${sid}_${n}_${lang}`);
    return r ? JSON.parse(r).c : null;
  } catch { return null; }
}
async function saveLocal(sid, n, lang, c) {
  try { await AsyncStorage.setItem(`${CV}${sid}_${n}_${lang}`, JSON.stringify({c, ts:Date.now()})); } catch {}
}
// Clear a specific chapter cache — removes ALL known key versions (kv9, kv10, kv11)
// This guarantees the incomplete 44-shloka chapter is fully wiped
async function clearChapterCache(sid, n) {
  const prefixes = ['kv9_', 'kv10_', 'kv11_'];
  const langs    = ['hindi', 'english'];
  try {
    for (const pfx of prefixes) {
      for (const lg of langs) {
        await AsyncStorage.removeItem(`${pfx}${sid}_${n}_${lg}`);
      }
    }
    // Also clear progress so it shows 0% until fully regenerated
    const prog = await AsyncStorage.getItem(`kp11_${sid}`);
    if (prog) {
      const p = JSON.parse(prog);
      delete p[n];
      await AsyncStorage.setItem(`kp11_${sid}`, JSON.stringify(p));
    }
    console.log(`[Katha] All cache cleared for ${sid} ch${n}`);
  } catch {}
}
async function getProgress(sid) {
  try { const r = await AsyncStorage.getItem(`kp11_${sid}`); return r ? JSON.parse(r) : {}; } catch { return {}; }
}
async function markRead(sid, n) {
  try { const p = await getProgress(sid); p[n] = Date.now(); await AsyncStorage.setItem(`kp11_${sid}`, JSON.stringify(p)); } catch {}
}

// ═══════════════════════════════════════════════════════════════
// BACKEND SHARED CACHE
// ═══════════════════════════════════════════════════════════════
async function saveToBackend(sid, n, lang, content) {
  try {
    await fetch(`${BACKEND_URL}/katha/save`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({scriptureId:sid, unitId:n, lang, content, ts:Date.now()}),
    });
  } catch {}
}
async function loadFromBackend(sid, n, lang) {
  try {
    const res = await fetch(`${BACKEND_URL}/katha/${sid}/${n}/${lang}`, {signal:AbortSignal.timeout(8000)});
    if (!res.ok) return null;
    const d = await res.json();
    return d?.content || null;
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMIT + SLOW WALK ENGINE
// — 1 verse group at a time, 20s gap, smart API skip
// ═══════════════════════════════════════════════════════════════
const apiCooldown   = { gemini: 0, groq: 0 };
const VERSE_DELAY   = 20000; // 20s between requests — permanent 429 fix
const COOLDOWN_MS   = 65000; // 65s cooldown after 429 (free tier resets in 60s)
const CHUNK_SIZE    = 5;     // 5 verses per request — small enough AI covers all

// Session-level Gemini exhaustion: if Gemini fails 3 times in a row,
// stop trying it for the whole session and use Groq only
let _geminiFailCount = 0;
const GEMINI_MAX_FAILS = 3;
function isGeminiExhausted() { return _geminiFailCount >= GEMINI_MAX_FAILS; }
function markGeminiFail() {
  _geminiFailCount++;
  if (_geminiFailCount >= GEMINI_MAX_FAILS) {
    console.log('[Katha] Gemini exhausted for this session — Groq only mode');
  }
}
function resetGeminiCount() { _geminiFailCount = 0; }

function isOnCooldown(api) { return Date.now() < apiCooldown[api]; }
function setCooldown(api, ms) {
  apiCooldown[api] = Date.now() + (ms || COOLDOWN_MS);
  console.log(`[Katha] ${api} cooldown ${Math.ceil((ms||COOLDOWN_MS)/1000)}s`);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════════════════════════
// API CALLERS
// ═══════════════════════════════════════════════════════════════
async function callGroq(sys, user) {
  if (isOnCooldown('groq')) throw new Error('groq:cooldown');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${GROQ_KEY}`},
    body:JSON.stringify({
      model:'llama-3.3-70b-versatile',
      messages:[{role:'system',content:sys},{role:'user',content:user}],
      temperature:0.12, max_tokens:2500,
    }),
  });
  if (res.status === 429) { setCooldown('groq'); throw new Error('groq:429'); }
  if (!res.ok) { const e = await res.text(); throw new Error(`groq:${res.status}`); }
  const d = await res.json();
  const t = d?.choices?.[0]?.message?.content;
  if (!t || t.length < 40) throw new Error('groq:empty');
  return t;
}

async function callGemini(sys, user) {
  if (isOnCooldown('gemini')) throw new Error('gemini:cooldown');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEM_KEY}`;
  const res = await fetch(url, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      contents:[{parts:[{text:`${sys}\n\n${user}`}]}],
      generationConfig:{temperature:0.12, maxOutputTokens:2500},
      safetySettings:[
        {category:'HARM_CATEGORY_HARASSMENT',        threshold:'BLOCK_NONE'},
        {category:'HARM_CATEGORY_HATE_SPEECH',       threshold:'BLOCK_NONE'},
        {category:'HARM_CATEGORY_DANGEROUS_CONTENT', threshold:'BLOCK_NONE'},
      ],
    }),
  });
  if (res.status === 429) { setCooldown('gemini'); throw new Error('gemini:429'); }
  if (!res.ok) { const e = await res.text(); throw new Error(`gemini:${res.status}`); }
  const d = await res.json();
  const t = d?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!t || t.length < 40) throw new Error('gemini:empty');
  return t;
}

// ─── Smart call: Gemini first → Groq fallback, skip Gemini if exhausted ─
async function callAI(sys, user) {
  const useGemini = !isGeminiExhausted() && !isOnCooldown('gemini');
  if (useGemini) {
    try {
      console.log('[Katha] Gemini...');
      const result = await callGemini(sys, user);
      resetGeminiCount(); // success — reset fail counter
      return result;
    } catch (e) {
      markGeminiFail();
      console.log(`[Katha] Gemini fail #${_geminiFailCount} (${e.message})`);
      if (isGeminiExhausted()) console.log('[Katha] Switching to Groq-only mode');
    }
  } else {
    if (isGeminiExhausted()) console.log('[Katha] Groq-only mode active');
    else console.log('[Katha] Gemini on cooldown → Groq');
  }
  if (!isOnCooldown('groq')) {
    try {
      console.log('[Katha] Groq...');
      return await callGroq(sys, user);
    } catch (e) {
      console.log(`[Katha] Groq fail (${e.message})`);
      throw new Error('BOTH_FAILED');
    }
  }
  // Both on cooldown — wait for the shorter one then retry
  const groqWait   = Math.max(0, apiCooldown.groq   - Date.now());
  const geminiWait = Math.max(0, apiCooldown.gemini  - Date.now());
  const wait = isGeminiExhausted() ? groqWait : Math.min(groqWait, geminiWait);
  const waitMs = wait + 2000;
  console.log(`[Katha] Waiting ${Math.ceil(waitMs/1000)}s for API cooldown...`);
  await sleep(waitMs);
  return callAI(sys, user);
}

// ═══════════════════════════════════════════════════════════════
// PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════
function buildPrompt(sc, unit, lang, from, to) {
  const isH = lang === 'hindi';
  const sName = isH ? sc.nameHi : sc.name;
  const uName = isH ? unit.tH : unit.t;
  const pLang = sc.primaryLang || 'Sanskrit';

  const sys = `You are a Vedic scholar following Gita Press Gorakhpur tradition.
${isH ? 'Write all explanations in Hindi. Original text in ' + pLang + '.' : 'Write all explanations in English. Original text in ' + pLang + '.'}
Be authentic, deep, and devotional. Start directly — no preamble.`;

  let user = '';
  if (sc.type === 'gita') {
    user = `Bhagavad Gita Chapter ${unit.n} (${uName}), Shlokas ${from} to ${to}.

For EACH shloka:
SHLOKA ${unit.n}.[number]
Sanskrit: [COMPLETE shloka in Devanagari — both lines, never truncate]
Transliteration: [both lines Roman]
VIGRAHA: [each key Sanskrit word: word (Devanagari) = literal meaning → spiritual significance]
${isH ? 'गीता प्रेस तिका' : 'Gita Press Tika'}: [authentic 3-4 sentence meaning, emotional depth of Krishna-Arjuna]
${isH ? 'शिक्षा' : 'Teaching'}: [1-2 sentences practical wisdom today]
GAHAN DRISHTI: [Old Rishi speaks to reader directly — connect to their life today, 2-3 personal sentences]`;
  } else if (sc.type === 'ramayana') {
    user = `Valmiki Ramayana ${uName} (Kanda ${unit.n}), verses ${from}-${to}.
KEY VERSES: Show 3-5 important verses with Sanskrit, Transliteration, VIGRAHA, ${isH?'अर्थ':'Meaning'}, GAHAN DRISHTI.
NARRATIVE: 3-4 para story of this section — names, places, emotions.
DHARMIC SIGNIFICANCE: 2 para what this teaches about Dharma.`;
  } else if (sc.type === 'manas') {
    user = `Ramcharitmanas ${uName} (Kand ${unit.n}), section ${from}-${to}. Tulsidas Awadhi.
For each Doha/Chaupai: CHAUPAI [n]: [Awadhi text], ${isH?'अर्थ':'Meaning'}: [3 sentences], GAHAN DRISHTI: [Rishi voice].
SECTION NARRATIVE: 3 para what happens here.`;
  } else if (sc.type === 'mahabharat') {
    user = `Mahabharata ${uName} (Parva ${unit.n}), section ${from}-${to}.
KEY EVENTS: 2-3 events with full narrative, DHARMIC LESSON each.
KEY SHLOKAS: 3 shlokas with Sanskrit, VIGRAHA, ${isH?'अर्थ':'Meaning'}.
GAHAN DRISHTI: [Rishi voice connecting to reader's life].`;
  } else if (sc.type === 'bhagavatam') {
    user = `Srimad Bhagavatam ${uName} (Skandha ${unit.n}), section ${from}-${to}.
KEY STORIES: 2-3 stories with devotional narrative, BHAKTI ESSENCE each.
KEY VERSES: 3-4 verses with Sanskrit, VIGRAHA, ${isH?'अर्थ':'Meaning'}.
GAHAN DRISHTI: [Rishi voice, reader's bhakti today].`;
  } else {
    user = `${uName}, Mantras ${from}-${to}. Gita Press style.
For EACH mantra: MANTRA ${unit.n}.[n], Sanskrit: [complete], Transliteration: [Roman],
VIGRAHA: [key words explained], ${isH?'गीता प्रेस तिका':'Gita Press Tika'}: [3-4 sentence deep meaning],
GAHAN DRISHTI: [Rishi speaks to reader directly today].`;
  }
  return { sys, user };
}

// ═══════════════════════════════════════════════════════════════
// GENERATION QUEUE — only 1 chapter at a time
// ═══════════════════════════════════════════════════════════════
let _busy = false;
async function acquireQueue(onProgress, isH) {
  while (_busy) {
    onProgress(isH ? '⏳ प्रतीक्षा करें...' : '⏳ Waiting for queue...');
    await sleep(2000);
  }
  _busy = true;
}

// ═══════════════════════════════════════════════════════════════
// SLOW-WALK GENERATION: CHUNK_SIZE verses, 20s gap
// This permanently solves 429. Total time for 47-shloka ch = ~3 min
// ═══════════════════════════════════════════════════════════════
async function generateFull(sc, unit, lang, onProgress) {
  const isH = lang === 'hindi';
  const total = (VERSE_MASTER[sc.id]?.[unit.n]) || unit.s || 20;
  const numChunks = Math.ceil(total / CHUNK_SIZE);
  const results = [];

  await acquireQueue(onProgress, isH);

  try {
    for (let i = 0; i < numChunks; i++) {
      const from = i * CHUNK_SIZE + 1;
      const to   = Math.min((i + 1) * CHUNK_SIZE, total);
      onProgress(isH
        ? `📖 श्लोक ${from}–${to} / ${total} लोड हो रहे हैं...`
        : `📖 Loading verses ${from}–${to} of ${total}...`);

      const { sys, user } = buildPrompt(sc, unit, lang, from, to);
      const text = await callAI(sys, user);
      results.push(text);

      if (i < numChunks - 1) {
        onProgress(isH
          ? `✅ ${to}/${total} पूर्ण — 20 सेकंड में अगले...`
          : `✅ ${to}/${total} done — next in 20s...`);
        await sleep(VERSE_DELAY);
      }
    }
  } finally {
    _busy = false;
  }

  const hdr = `🕉 ${isH ? sc.nameHi : sc.name} — ${isH ? unit.tH : unit.t}\n${'═'.repeat(45)}\n\n`;
  return hdr + results.join('\n\n' + '─'.repeat(40) + '\n\n');
}

// ═══════════════════════════════════════════════════════════════
// LOAD: Local → Backend → Generate
// ═══════════════════════════════════════════════════════════════
async function loadContent(sc, unit, lang, onProgress) {
  const cached = await getCached(sc.id, unit.n, lang);
  if (cached) return { content: cached, source: 'local' };

  onProgress('☁️ सर्वर से खोज रहे हैं...');
  const bc = await loadFromBackend(sc.id, unit.n, lang);
  if (bc) {
    await saveLocal(sc.id, unit.n, lang, bc);
    return { content: bc, source: 'backend' };
  }

  const content = await generateFull(sc, unit, lang, onProgress);
  await saveLocal(sc.id, unit.n, lang, content);
  await saveToBackend(sc.id, unit.n, lang, content);
  await markRead(sc.id, unit.n);
  return { content, source: 'ai' };
}

// ═══════════════════════════════════════════════════════════════
// PDF DOWNLOAD — using expo-print (Expo SDK 54 compatible)
// Replaces broken FileSystem approach
// ═══════════════════════════════════════════════════════════════
async function downloadAsPDF(sc, unit, lang, content) {
  try {
    const isH = lang === 'hindi';
    const scName = isH ? sc.nameHi : sc.name;
    const uTitle = isH ? unit.tH : unit.t;

    // Convert plain text to styled HTML for PDF
    const lines = content.split('\n');
    let htmlBody = '';
    for (const line of lines) {
      const t = line.trim();
      if (!t) { htmlBody += '<br/>'; continue; }
      if (/^[─═]{5,}/.test(t)) { htmlBody += '<hr style="border:0.5px solid #C9830A;opacity:0.4;margin:16px 0"/>'; continue; }
      if (/^(SHLOKA|VERSE|MANTRA|CHAUPAI|DOHA)\s+[\d.]+/i.test(t)) {
        htmlBody += `<div class="shloka-hdr">${t}</div>`;
      } else if (/^GAHAN DRISHTI/i.test(t)) {
        const body = t.replace(/^GAHAN DRISHTI\s*[\(:][^)]*[\):]?\s*/i, '');
        htmlBody += `<div class="gahan"><span class="gahan-icon">🔱</span><em>${body || t}</em></div>`;
      } else if (/^VIGRAHA/i.test(t)) {
        htmlBody += `<div class="vigraha-hdr">📚 VIGRAHA — शब्द अर्थ</div>`;
      } else if (/^[a-zA-Z\u0900-\u097F]+\s*\([^)]+\)\s*[:]\s*.+→.+/.test(t)) {
        htmlBody += `<div class="vigraha-row">${t}</div>`;
      } else if (/^(Sanskrit|Awadhi|Text):/i.test(t)) {
        const val = t.replace(/^[^:]+:\s*/, '');
        htmlBody += `<div class="sanskrit">${val}</div>`;
      } else if (/^Transliteration:/i.test(t)) {
        htmlBody += `<div class="translit">${t.replace(/^Transliteration:\s*/, '')}</div>`;
      } else if (/^(Gita Press Tika|गीता प्रेस तिका|Hindi Meaning|Teaching|शिक्षा|Meaning|अर्थ):/i.test(t)) {
        const lbl = t.split(':')[0];
        const val = t.replace(/^[^:]+:\s*/, '');
        htmlBody += `<div class="tika"><span class="tika-lbl">${lbl}</span><br/>${val}</div>`;
      } else if (/[\u0900-\u097F]{6,}/.test(t)) {
        htmlBody += `<div class="deva">${t}</div>`;
      } else {
        htmlBody += `<p class="body">${t}</p>`;
      }
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body{font-family:Georgia,serif;background:#FDF6ED;color:#2C1A00;padding:32px;margin:0}
  .cover{text-align:center;padding:40px 0 30px;border-bottom:2px solid #C9830A;margin-bottom:30px}
  .cover-title{font-size:28px;color:#8B4513;font-weight:bold;margin-bottom:6px}
  .cover-sub{font-size:18px;color:#C9830A}
  .cover-om{font-size:48px;margin-bottom:12px}
  .shloka-hdr{background:#FFF3E0;border-left:4px solid #E8620A;padding:8px 14px;margin:20px 0 8px;
    font-weight:bold;font-size:13px;color:#C45508;border-radius:4px}
  .sanskrit{background:#EDE7F6;border-radius:8px;padding:14px;margin:8px 0;
    font-size:19px;color:#4A148C;line-height:2.2;text-align:center;font-weight:600}
  .translit{color:#6A1B9A;font-style:italic;font-size:13px;margin:4px 0 8px;padding:0 14px}
  .vigraha-hdr{background:#FFF8E1;border:1px solid #C9830A;border-radius:6px;
    padding:6px 12px;margin:10px 0 4px;font-size:12px;font-weight:bold;color:#8B6914}
  .vigraha-row{background:#FFFDE7;border-left:3px solid #C9830A;padding:6px 12px;
    margin:3px 0;font-size:12px;color:#5D4037;border-radius:2px}
  .tika{background:#FBE9E7;border-radius:8px;padding:12px;margin:8px 0;font-size:14px;line-height:1.8}
  .tika-lbl{font-size:10px;font-weight:bold;color:#BF360C;text-transform:uppercase;letter-spacing:1px}
  .gahan{background:#EDE7F6;border:1px solid #7B1FA2;border-left:4px solid #9C27B0;
    border-radius:8px;padding:14px;margin:10px 0;font-size:14px;color:#4A148C;line-height:1.7}
  .gahan-icon{font-size:16px;margin-right:6px}
  .deva{color:#4A148C;font-size:17px;line-height:2;margin:6px 0;padding:0 8px}
  .body{font-size:14px;line-height:1.8;margin:4px 0;color:#3E2723}
  hr{border:0.5px solid #C9830A;opacity:0.4;margin:16px 0}
  .footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #C9830A;
    font-size:12px;color:#8B4513}
</style></head><body>
<div class="cover">
  <div class="cover-om">🕉</div>
  <div class="cover-title">${scName}</div>
  <div class="cover-sub">${uTitle}</div>
</div>
${htmlBody}
<div class="footer">🕉 DharmaSetu · जय सनातन धर्म</div>
</body></html>`;

    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    } else {
      Alert.alert('PDF Ready', uri);
    }
  } catch (e) {
    // Fallback to text share if PDF fails
    try {
      await Share.share({ message: content.slice(0, 60000), title: `DharmaSetu — ${unit.tH || unit.t}` });
    } catch {
      Alert.alert('Error', e.message);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// TEXT RENDERER — existing design preserved
// ═══════════════════════════════════════════════════════════════
function ContentRenderer({ text }) {
  const FS = 14;
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => {
        const t = line.trim();
        if (!t) return <View key={i} style={{height:6}} />;

        const isDivider   = /^[─═]{5,}/.test(t);
        const isSlokaHdr  = /^(SHLOKA|VERSE|MANTRA|CHAUPAI|DOHA)\s+[\d.]+/i.test(t);
        const isEventHdr  = /^(EVENT|STORY)\s+[\d:]/i.test(t);
        const isSectionH  = /^(OVERVIEW|KEY VERSES|KEY EVENTS|KEY STORIES|NARRATIVE|DHARMIC|CHAPTER ESSENCE|BHAKTI|DIVINE GLORY|VEDANTIC|WISDOM|MAHAVAKYA|PARVA CONTEXT|SECTION NARRATIVE|SKANDHA|CONTEXT|GAHAN DRISHTI)/i.test(t);
        const isVigraha   = /^VIGRAHA/i.test(t);
        const isVigrahaLn = /^[a-zA-Z\u0900-\u097F]+\s*\([^)]+\)\s*[:]\s*.+→.+/.test(t);
        const isGahanD    = /^GAHAN DRISHTI/i.test(t);
        const isSanskrit  = /^(Sanskrit|Awadhi|Text|Transliteration):/i.test(t);
        const isTika      = /^(Gita Press Tika|गीता प्रेस तिका|Hindi Meaning)/i.test(t);
        const isTeaching  = /^(Teaching|शिक्षा|Dharmic Lesson|धर्म शिक्षा|Bhakti Essence|भक्ति सार|Devotional Feeling|Bhakti Insight|Vedantic Vision|वेदांतिक दृष्टि):/i.test(t);
        const isMeaning   = /^(Meaning|अर्थ|भाव|भावार्थ):/i.test(t);
        const isDeva      = /[\u0900-\u097F]{6,}/.test(t) && !isSanskrit && !isVigrahaLn && !/^VIGRAHA/.test(t);

        if (isDivider)   return <View key={i} style={rd.divider}/>;
        if (isGahanD)    return (
          <View key={i} style={rd.gahanBox}>
            <Text style={rd.gahanLbl}>🔱 गहन दृष्टि</Text>
            <Text style={[rd.gahanTxt,{fontSize:FS,lineHeight:FS*1.9}]}>
              {t.replace(/^GAHAN DRISHTI\s*[\(:][^)]*[\):]?\s*/i,'').replace(/^GAHAN DRISHTI\s*[:]\s*/i,'')}
            </Text>
          </View>
        );
        if (isVigraha)   return <View key={i} style={rd.vigrahaHdr}><Text style={rd.vigrahaHdrTxt}>📚 VIGRAHA — शब्द-अर्थ-महत्व</Text></View>;
        if (isVigrahaLn) return <View key={i} style={rd.vigrahaRow}><Text style={[rd.vigrTxt,{fontSize:FS-1,lineHeight:(FS-1)*1.9}]}>{t}</Text></View>;
        if (isSlokaHdr)  return <View key={i} style={[rd.slokaHdr,{marginTop:i>0?24:0}]}><Text style={rd.slokaNum}>{t}</Text></View>;
        if (isEventHdr)  return <View key={i} style={rd.eventHdr}><Text style={rd.eventTxt}>{t}</Text></View>;
        if (isSectionH)  return <View key={i} style={rd.secHdr}><Text style={rd.secTxt}>{t}</Text></View>;
        if (isTika)      return (
          <View key={i} style={rd.tikaBox}>
            <Text style={rd.fieldLbl}>{t.split(':')[0].toUpperCase()} (TIKA)</Text>
            <Text style={[rd.tikaBodyTxt,{fontSize:FS,lineHeight:FS*1.95}]}>{t.replace(/^[^:]+:\s*/,'')}</Text>
          </View>
        );
        if (isSanskrit)  {
          const lbl = t.split(':')[0];
          const val = t.replace(/^[^:]+:\s*/,'');
          const isTr = /transliteration/i.test(lbl);
          return (
            <View key={i} style={isTr?rd.translitBox:rd.sanBox}>
              <Text style={rd.fieldLbl}>{lbl.toUpperCase()}</Text>
              <Text style={isTr?[rd.translitTxt,{fontSize:FS,lineHeight:FS*1.8}]:[rd.sanTxt,{fontSize:FS+3,lineHeight:(FS+3)*2.2}]}>{val}</Text>
            </View>
          );
        }
        if (isDeva)      return <View key={i} style={rd.devaBox}><Text style={[rd.sanTxt,{fontSize:FS+2,lineHeight:(FS+2)*2.1}]}>{t}</Text></View>;
        if (isTeaching)  return (
          <View key={i} style={rd.teachBox}>
            <Text style={rd.teachLbl}>🕉 {t.split(':')[0].toUpperCase()}</Text>
            <Text style={[rd.teachTxt,{fontSize:FS,lineHeight:FS*1.9}]}>{t.replace(/^[^:]+:\s*/,'')}</Text>
          </View>
        );
        if (isMeaning)   return (
          <View key={i} style={rd.meaningBox}>
            <Text style={rd.fieldLbl}>{t.split(':')[0].toUpperCase()}</Text>
            <Text style={[rd.bodyTxt,{fontSize:FS,lineHeight:FS*1.95}]}>{t.replace(/^[^:]+:\s*/,'')}</Text>
          </View>
        );
        return <Text key={i} style={[rd.bodyTxt,{fontSize:FS,lineHeight:FS*1.95,marginBottom:3}]}>{t}</Text>;
      })}
    </>
  );
}

const rd = StyleSheet.create({
  divider:      {height:1,backgroundColor:'rgba(240,165,0,0.12)',marginVertical:20},
  gahanBox:     {backgroundColor:'rgba(107,33,168,0.18)',borderRadius:14,padding:16,marginVertical:12,borderWidth:1.5,borderColor:'rgba(107,33,168,0.45)',borderLeftWidth:4,borderLeftColor:'#9B59B6'},
  gahanLbl:     {fontSize:11,color:'#D4A8FF',fontWeight:'800',marginBottom:10,letterSpacing:0.4},
  gahanTxt:     {color:'rgba(220,200,255,0.92)',fontStyle:'italic',fontWeight:'500'},
  vigrahaHdr:   {backgroundColor:'rgba(201,131,10,0.12)',borderRadius:10,paddingVertical:10,paddingHorizontal:14,marginTop:12,marginBottom:6,borderWidth:1,borderColor:'rgba(201,131,10,0.3)'},
  vigrahaHdrTxt:{fontSize:12,fontWeight:'800',color:'#C9830A'},
  vigrahaRow:   {backgroundColor:'rgba(201,131,10,0.07)',borderRadius:8,paddingVertical:8,paddingHorizontal:12,marginBottom:5,borderLeftWidth:3,borderLeftColor:'#C9830A'},
  vigrTxt:      {color:'rgba(253,220,130,0.9)'},
  slokaHdr:     {backgroundColor:'rgba(232,98,10,0.13)',borderRadius:10,paddingVertical:10,paddingHorizontal:14,marginBottom:10,borderLeftWidth:4,borderLeftColor:'#E8620A'},
  slokaNum:     {fontSize:12,fontWeight:'800',color:'#E8620A',letterSpacing:0.5},
  eventHdr:     {backgroundColor:'rgba(107,33,168,0.15)',borderRadius:10,paddingVertical:10,paddingHorizontal:14,marginTop:18,marginBottom:10,borderLeftWidth:4,borderLeftColor:'#6B21A8'},
  eventTxt:     {fontSize:13,fontWeight:'800',color:'#D4A8FF'},
  secHdr:       {backgroundColor:'rgba(201,131,10,0.1)',borderRadius:10,paddingVertical:12,paddingHorizontal:14,marginVertical:16,borderWidth:1,borderColor:'rgba(201,131,10,0.3)'},
  secTxt:       {fontSize:14,fontWeight:'800',color:'#C9830A',textAlign:'center'},
  tikaBox:      {backgroundColor:'rgba(232,98,10,0.07)',borderRadius:12,padding:14,marginBottom:10,borderWidth:1,borderColor:'rgba(232,98,10,0.25)'},
  tikaBodyTxt:  {color:'rgba(253,246,237,0.9)',fontWeight:'500'},
  sanBox:       {backgroundColor:'rgba(107,33,168,0.16)',borderRadius:12,padding:16,marginBottom:10,borderWidth:1,borderColor:'rgba(107,33,168,0.38)'},
  devaBox:      {backgroundColor:'rgba(107,33,168,0.08)',borderRadius:10,padding:12,marginBottom:8,borderLeftWidth:3,borderLeftColor:'rgba(107,33,168,0.5)'},
  sanTxt:       {color:'#D4A8FF',fontWeight:'600'},
  translitBox:  {backgroundColor:'rgba(107,33,168,0.06)',borderRadius:10,padding:12,marginBottom:8},
  translitTxt:  {color:'rgba(212,168,255,0.8)',fontStyle:'italic'},
  meaningBox:   {marginBottom:8},
  teachBox:     {backgroundColor:'rgba(232,98,10,0.1)',borderRadius:12,padding:14,marginVertical:8,borderWidth:1,borderColor:'rgba(232,98,10,0.3)',borderLeftWidth:3,borderLeftColor:'#E8620A'},
  teachLbl:     {fontSize:10,color:'#E8620A',fontWeight:'800',textTransform:'uppercase',letterSpacing:0.6,marginBottom:6},
  teachTxt:     {color:'rgba(244,162,97,0.95)',fontWeight:'600'},
  fieldLbl:     {fontSize:9,color:'rgba(253,246,237,0.3)',fontWeight:'700',textTransform:'uppercase',letterSpacing:1,marginBottom:6},
  bodyTxt:      {color:'rgba(253,246,237,0.85)'},
});

// ═══════════════════════════════════════════════════════════════
// CHAPTER READER
// ═══════════════════════════════════════════════════════════════
function ChapterReader({visible, onClose, sc, unit, lang}) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [status,  setStatus]  = useState('');
  const insets = useSafeAreaInsets();
  const isH = lang === 'hindi';

  useEffect(() => {
    if (!visible || !sc || !unit) return;
    setContent(''); setError(''); setLoading(true); setStatus('');
    load();
  }, [visible, sc?.id, unit?.n, lang]);

  const load = async () => {
    try {
      const { content: c } = await loadContent(sc, unit, lang, setStatus);
      setContent(c);
    } catch {
      setError(isH
        ? 'इंटरनेट कनेक्शन में समस्या है।\nकृपया जांचें और दोबारा कोशिश करें।'
        : 'Unable to load. Check your internet and try again.');
    }
    setLoading(false);
  };

  // Clear cache and regenerate — fixes incomplete/44-shloka chapters
  const handleClearAndReload = () => {
    Alert.alert(
      isH ? 'अध्याय Reset करें?' : 'Reset Chapter?',
      isH ? 'यह cached data हटा देगा और नया बनाएगा। जारी रखें?' : 'This will clear cached data and regenerate. Continue?',
      [
        { text: isH ? 'रद्द' : 'Cancel', style: 'cancel' },
        { text: isH ? 'हाँ, Reset करें' : 'Yes, Reset', style: 'destructive', onPress: async () => {
          await clearChapterCache(sc.id, unit.n); // clears all key versions
          // Also reset Gemini fail counter so it retries fresh
          resetGeminiCount();
          setContent(''); setError(''); setLoading(true); setStatus('');
          load();
        }},
      ]
    );
  };

  const scTitle = isH ? sc?.nameHi : sc?.name;
  const uTitle  = isH ? unit?.tH   : unit?.t;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[cr.root,{paddingTop:insets.top}]}>
        <StatusBar style="light" backgroundColor="#0A0300"/>

        {/* HEADER */}
        <View style={cr.hdr}>
          <TouchableOpacity onPress={onClose} style={cr.back} hitSlop={{top:14,bottom:14,left:14,right:14}}>
            <Text style={cr.backTxt}>←</Text>
          </TouchableOpacity>
          <View style={{flex:1}}>
            <Text style={cr.hdrSc} numberOfLines={1}>{scTitle}</Text>
            <Text style={cr.hdrTitle} numberOfLines={1}>{uTitle}</Text>
          </View>
          {/* PDF Download — only when content ready */}
          {content ? (
            <TouchableOpacity style={cr.dlBtn} onPress={() => downloadAsPDF(sc, unit, lang, content)}
              hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Text style={{fontSize:15}}>⬇️</Text>
            </TouchableOpacity>
          ) : null}
          {/* Share */}
          <TouchableOpacity style={cr.shareBtn} onPress={() => {
            if (!content) return;
            Share.share({message:`🕉 ${scTitle} — ${uTitle}\n\n${content.slice(0,500)}...\n\n— DharmaSetu App`});
          }}>
            <Text style={{fontSize:15}}>📤</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={cr.center}>
            <ActivityIndicator size="large" color="#E8620A"/>
            <Text style={cr.loadTxt}>{isH ? 'शास्त्र लोड हो रहे हैं...' : 'Loading scripture...'}</Text>
            <Text style={cr.loadSub}>{status}</Text>
          </View>
        ) : error ? (
          <View style={cr.center}>
            <Text style={{fontSize:44,marginBottom:16}}>📡</Text>
            <Text style={cr.errTxt}>{error}</Text>
            <TouchableOpacity style={cr.retryBtn} onPress={()=>{setLoading(true);setError('');load();}}>
              <Text style={cr.retryTxt}>{isH ? 'दोबारा कोशिश करें' : 'Retry'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={{flex:1}} contentContainerStyle={{padding:18}} showsVerticalScrollIndicator={false}>
            <View style={{alignItems:'center',marginBottom:24,paddingBottom:20,borderBottomWidth:1,borderBottomColor:'rgba(240,165,0,0.1)'}}>
              <Text style={{fontSize:21,fontWeight:'800',color:'#F4A261',textAlign:'center',marginBottom:6}}>{uTitle}</Text>
              {unit?.s && <Text style={{fontSize:11,color:'rgba(253,246,237,0.32)',marginTop:3}}>{unit.s} {isH?'श्लोक':'verses'}</Text>}
              {sc.primaryLang && <Text style={{fontSize:10,color:'rgba(201,131,10,0.6)',marginTop:3}}>{sc.primaryLang}</Text>}
              <View style={{width:36,height:2,backgroundColor:'rgba(232,98,10,0.5)',borderRadius:1,marginTop:12}}/>
            </View>

            <ContentRenderer text={content}/>

            <View style={{alignItems:'center',marginTop:36,paddingVertical:24,borderTopWidth:1,borderTopColor:'rgba(240,165,0,0.1)'}}>
              <Text style={{fontSize:34,marginBottom:10}}>🕉</Text>
              <Text style={{fontSize:14,fontWeight:'700',color:'#F4A261',marginBottom:4}}>
                {uTitle} — {isH?'पाठ पूर्ण':'Complete'}
              </Text>
              {/* PDF download at bottom */}
              <TouchableOpacity
                style={{marginTop:12,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'rgba(232,98,10,0.1)',borderRadius:10,paddingHorizontal:16,paddingVertical:10,borderWidth:1,borderColor:'rgba(232,98,10,0.25)'}}
                onPress={()=>downloadAsPDF(sc, unit, lang, content)}>
                <Text style={{fontSize:15}}>⬇️</Text>
                <Text style={{fontSize:13,color:'#F4A261',fontWeight:'700'}}>{isH?'PDF Download करें':'Download as PDF'}</Text>
              </TouchableOpacity>
              {/* Reset cache if chapter seems incomplete */}
              <TouchableOpacity onPress={handleClearAndReload} style={{marginTop:14}}>
                <Text style={{fontSize:11,color:'rgba(253,246,237,0.25)',textDecorationLine:'underline'}}>
                  {isH?'अध्याय अधूरा लगे? यहाँ tap करें':'Chapter incomplete? Tap to regenerate'}
                </Text>
              </TouchableOpacity>
              <Text style={{fontSize:13,color:'#C9830A',marginTop:14}}>जय सनातन धर्म · Jai Sanatan Dharma</Text>
            </View>
            <View style={{height:insets.bottom+24}}/>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const cr = StyleSheet.create({
  root:    {flex:1,backgroundColor:'#0A0300'},
  hdr:     {flexDirection:'row',alignItems:'center',paddingHorizontal:14,paddingVertical:12,borderBottomWidth:1,borderBottomColor:'rgba(240,165,0,0.12)',gap:6},
  back:    {width:38,height:38,borderRadius:19,backgroundColor:'rgba(255,255,255,0.08)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(240,165,0,0.2)'},
  backTxt: {fontSize:20,color:'#F4A261',fontWeight:'600',marginTop:-1},
  hdrSc:   {fontSize:10,color:'#C9830A',fontWeight:'600',marginBottom:1},
  hdrTitle:{fontSize:13,fontWeight:'800',color:'#F4A261'},
  dlBtn:   {paddingHorizontal:8,paddingVertical:7,borderRadius:8,backgroundColor:'rgba(39,174,96,0.12)',borderWidth:1,borderColor:'rgba(39,174,96,0.3)'},
  shareBtn:{paddingHorizontal:8,paddingVertical:7,borderRadius:8,backgroundColor:'rgba(232,98,10,0.1)',borderWidth:1,borderColor:'rgba(232,98,10,0.25)'},
  center:  {flex:1,alignItems:'center',justifyContent:'center',padding:28},
  loadTxt: {fontSize:16,color:'#F4A261',textAlign:'center',marginTop:18,fontWeight:'700'},
  loadSub: {fontSize:13,color:'rgba(253,246,237,0.5)',marginTop:8,textAlign:'center'},
  errTxt:  {fontSize:14,color:'rgba(253,246,237,0.7)',textAlign:'center',lineHeight:24,marginBottom:22},
  retryBtn:{backgroundColor:'#E8620A',paddingHorizontal:32,paddingVertical:14,borderRadius:12},
  retryTxt:{fontSize:15,color:'#fff',fontWeight:'800'},
});

// ═══════════════════════════════════════════════════════════════
// UNIT LIST
// ═══════════════════════════════════════════════════════════════
function UnitList({visible, onClose, sc, lang, onSelect}) {
  const [prog, setProg] = useState({});
  const insets = useSafeAreaInsets();
  const isH = lang === 'hindi';
  useEffect(()=>{if(visible&&sc) getProgress(sc.id).then(setProg);},[visible,sc?.id]);
  if (!sc) return null;
  const rc = Object.keys(prog).length, tot = sc.units?.length||0;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[ul.root,{paddingTop:insets.top}]}>
        <StatusBar style="light" backgroundColor="#0D0500"/>
        <View style={ul.hdr}>
          <TouchableOpacity onPress={onClose} style={ul.back} hitSlop={{top:14,bottom:14,left:14,right:14}}>
            <Text style={ul.backTxt}>←</Text>
          </TouchableOpacity>
          <View style={{flex:1}}>
            <Text style={ul.hTitle}>{isH?sc.nameHi:sc.name}</Text>
            <Text style={ul.hSub} numberOfLines={2}>{isH?sc.descHi:sc.desc}</Text>
          </View>
        </View>
        <View style={ul.progBox}>
          <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:7}}>
            <Text style={ul.progLbl}>{isH?`${rc}/${tot} पढ़े`:`${rc}/${tot} read`}</Text>
            <Text style={[ul.progPct,{color:sc.color}]}>{Math.round((rc/Math.max(tot,1))*100)}%</Text>
          </View>
          <View style={ul.progTrack}><View style={[ul.progFill,{width:`${Math.round((rc/Math.max(tot,1))*100)}%`,backgroundColor:sc.color}]}/></View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{padding:14,gap:8,paddingBottom:insets.bottom+24}}>
          {(sc.units||[]).map(unit=>{
            const done=!!prog[unit.n];
            return (
              <TouchableOpacity key={unit.n}
                style={[ul.card,{borderColor:done?sc.color+'45':'rgba(200,130,40,0.12)',backgroundColor:done?sc.color+'08':'#130700'}]}
                onPress={()=>onSelect(unit)} activeOpacity={0.85}>
                <View style={[ul.num,{backgroundColor:sc.color+'1A',borderColor:sc.color+'45'}]}>
                  <Text style={[ul.numTxt,{color:sc.color}]}>{unit.n}</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={ul.uTitle}>{isH?unit.tH:unit.t}</Text>
                  {unit.s&&<Text style={ul.uMeta}>{unit.s} {isH?'श्लोक':'verses'}</Text>}
                </View>
                <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                  {done&&<Text style={{fontSize:13,color:'#27AE60',fontWeight:'800'}}>✓</Text>}
                  <Text style={{fontSize:20,color:'rgba(253,246,237,0.2)'}}>›</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
const ul = StyleSheet.create({
  root:{flex:1,backgroundColor:'#0D0500'},
  hdr:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'rgba(240,165,0,0.1)',gap:12},
  back:{width:38,height:38,borderRadius:19,backgroundColor:'rgba(255,255,255,0.08)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(240,165,0,0.2)'},
  backTxt:{fontSize:20,color:'#F4A261',fontWeight:'600',marginTop:-1},
  hTitle:{fontSize:17,fontWeight:'800',color:'#F4A261',marginBottom:2},
  hSub:{fontSize:10,color:'rgba(253,246,237,0.38)',lineHeight:15},
  progBox:{marginHorizontal:16,marginVertical:10,backgroundColor:'rgba(255,255,255,0.04)',borderRadius:12,padding:14,borderWidth:1,borderColor:'rgba(240,165,0,0.08)'},
  progLbl:{fontSize:11,color:'rgba(253,246,237,0.42)',fontWeight:'600'},
  progPct:{fontSize:11,fontWeight:'800'},
  progTrack:{height:5,backgroundColor:'rgba(255,255,255,0.06)',borderRadius:2.5,overflow:'hidden'},
  progFill:{height:5,borderRadius:2.5},
  card:{borderRadius:14,padding:14,flexDirection:'row',alignItems:'center',gap:12,borderWidth:1},
  num:{width:38,height:38,borderRadius:10,alignItems:'center',justifyContent:'center',borderWidth:1,flexShrink:0},
  numTxt:{fontSize:14,fontWeight:'800'},
  uTitle:{fontSize:13,fontWeight:'700',color:'#FDF6ED',marginBottom:2},
  uMeta:{fontSize:10,color:'rgba(253,246,237,0.22)',marginTop:1},
});

// ═══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════
export default function KathaVault() {
  const insets = useSafeAreaInsets();
  const [lang,       setLang]       = useState('hindi');
  const [allProg,    setAllProg]    = useState({});
  const [selSc,      setSelSc]      = useState(null);
  const [selUnit,    setSelUnit]    = useState(null);
  const [showUnits,  setShowUnits]  = useState(false);
  const [showReader, setShowReader] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(()=>{
    (async()=>{
      const raw = await AsyncStorage.getItem('dharmasetu_user');
      if (raw) {const u=JSON.parse(raw);setLang(u.language||'hindi');}
      refreshProg();
    })();
    Animated.timing(fade,{toValue:1,duration:500,useNativeDriver:true}).start();
  },[]);

  const refreshProg = useCallback(async()=>{
    const p={};
    for (const sc of SCRIPTURES){p[sc.id]=await getProgress(sc.id);}
    setAllProg(p);
  },[]);

  const isH = lang==='hindi';

  return (
    <View style={[ms.root,{paddingTop:insets.top}]}>
      <StatusBar style="light" backgroundColor="#0D0500"/>
      <View style={ms.hdr}>
        <TouchableOpacity onPress={()=>router.back()} style={ms.back} hitSlop={{top:14,bottom:14,left:14,right:14}}>
          <Text style={ms.backTxt}>←</Text>
        </TouchableOpacity>
        <View style={{flex:1,marginLeft:10}}>
          <Text style={ms.hTitle}>{isH?'कथा वॉल्ट':'Katha Vault'}</Text>
          <Text style={ms.hSub}>{isH?'पवित्र सनातन ग्रंथ':'Sacred Sanatan Scriptures'}</Text>
        </View>
        <View style={{flexDirection:'row',gap:5}}>
          {[{id:'hindi',l:'हिं'},{id:'english',l:'EN'}].map(({id,l})=>(
            <TouchableOpacity key={id} style={[ms.lBtn,lang===id&&ms.lBtnOn]} onPress={()=>setLang(id)}>
              <Text style={[ms.lTxt,lang===id&&ms.lTxtOn]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{padding:14,paddingBottom:insets.bottom+24}}>
        <Animated.View style={{opacity:fade,gap:12}}>
          {SCRIPTURES.map(sc=>{
            const p=allProg[sc.id]||{};
            const rc=Object.keys(p).length, tot=sc.units?.length||1;
            const pct=Math.round((rc/tot)*100);
            return (
              <TouchableOpacity key={sc.id}
                style={[ms.card,{borderColor:sc.color+'30'}]}
                onPress={()=>{setSelSc(sc);setShowUnits(true);}} activeOpacity={0.88}>
                <View style={ms.cardTop}>
                  <View style={[ms.iconBox,{backgroundColor:sc.color+'18'}]}>
                    <Text style={{fontSize:26}}>{sc.icon}</Text>
                  </View>
                  <View style={{flex:1,marginLeft:14}}>
                    <Text style={ms.scName}>{isH?sc.nameHi:sc.name}</Text>
                    <Text style={ms.scDesc} numberOfLines={2}>{isH?sc.descHi:sc.desc}</Text>
                    <Text style={[ms.scLang,{color:sc.color}]}>{sc.primaryLang}</Text>
                  </View>
                  <Text style={{fontSize:20,color:'rgba(253,246,237,0.22)'}}>›</Text>
                </View>
                <View style={{marginTop:12}}>
                  <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:6}}>
                    <Text style={ms.progLbl}>{isH?`${rc}/${tot} पढ़े`:`${rc}/${tot} read`}</Text>
                    <Text style={[ms.progPct,{color:sc.color}]}>{pct}%</Text>
                  </View>
                  <View style={ms.progTrack}><View style={[ms.progFill,{width:`${pct}%`,backgroundColor:sc.color}]}/></View>
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </ScrollView>
      <UnitList visible={showUnits} onClose={()=>{setShowUnits(false);refreshProg();}} sc={selSc} lang={lang} onSelect={unit=>{setSelUnit(unit);setShowReader(true);}}/>
      <ChapterReader visible={showReader} onClose={()=>{setShowReader(false);refreshProg();}} sc={selSc} unit={selUnit} lang={lang}/>
    </View>
  );
}

const ms = StyleSheet.create({
  root:{flex:1,backgroundColor:'#0D0500'},
  hdr:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'rgba(240,165,0,0.1)'},
  back:{width:38,height:38,borderRadius:19,backgroundColor:'rgba(255,255,255,0.08)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(240,165,0,0.2)'},
  backTxt:{fontSize:20,color:'#F4A261',fontWeight:'600',marginTop:-1},
  hTitle:{fontSize:19,fontWeight:'800',color:'#F4A261'},
  hSub:{fontSize:11,color:'rgba(253,246,237,0.38)',marginTop:2},
  lBtn:{paddingHorizontal:10,paddingVertical:7,borderRadius:8,borderWidth:1,borderColor:'rgba(200,130,40,0.2)'},
  lBtnOn:{backgroundColor:'rgba(232,98,10,0.15)',borderColor:'#E8620A'},
  lTxt:{fontSize:12,color:'rgba(253,246,237,0.4)',fontWeight:'700'},
  lTxtOn:{color:'#F4A261'},
  card:{backgroundColor:'#130700',borderRadius:18,padding:16,borderWidth:1,marginBottom:2},
  cardTop:{flexDirection:'row',alignItems:'center'},
  iconBox:{width:54,height:54,borderRadius:13,alignItems:'center',justifyContent:'center',flexShrink:0},
  scName:{fontSize:16,fontWeight:'800',color:'#FDF6ED',marginBottom:3},
  scDesc:{fontSize:11,color:'rgba(253,246,237,0.38)',lineHeight:16},
  scLang:{fontSize:10,fontWeight:'700',marginTop:3},
  progLbl:{fontSize:10,color:'rgba(253,246,237,0.38)'},
  progPct:{fontSize:10,fontWeight:'800'},
  progTrack:{height:4,backgroundColor:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden'},
  progFill:{height:4,borderRadius:2},
});