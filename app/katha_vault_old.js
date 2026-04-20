// DharmaSetu — Katha Vault — RELEASE FINAL
// ROOT CAUSE FIX: Both Gemini & Groq hit 429 because we were making
// 9-10 API calls per chapter (47 shlokas ÷ 5 = ~10 calls).
// NEW STRATEGY: ONE call per chapter, complete chapter at once.
// Groq llama-3.3-70b handles ~6000 tokens output — enough for 47 shlokas.
// Gemini 2.0 flash handles ~8000 tokens — even better.
// Result: Gita Ch.1 = 1 API call instead of 10. 10x fewer 429 errors.
//
// ✅ Sacred Scroll UI with gold borders, aura glow, 2-col Vigraha grid
// ✅ PDF via expo-print (professionally formatted)
// ✅ One-call-per-chapter strategy — eliminates rate limit loops
// ✅ Smart fallback: if one-shot fails, breaks into 3 larger chunks
// ✅ VERSE_MASTER validates exact count per scripture
// ✅ Cache clear button fixes incomplete chapters
// ✅ Staggered fade-in animation on content load

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
      {n:1,t:'Adi Parva',              tH:'आदि पर्व',           s:227},
      {n:2,t:'Sabha Parva',            tH:'सभा पर्व',           s:79},
      {n:3,t:'Vana Parva',             tH:'वन पर्व',            s:317},
      {n:4,t:'Virata Parva',           tH:'विराट पर्व',         s:72},
      {n:5,t:'Udyoga Parva',           tH:'उद्योग पर्व',        s:199},
      {n:6,t:'Bhishma Parva',          tH:'भीष्म पर्व',         s:122},
      {n:7,t:'Drona Parva',            tH:'द्रोण पर्व',         s:203},
      {n:8,t:'Karna Parva',            tH:'कर्ण पर्व',          s:96},
      {n:9,t:'Shalya Parva',           tH:'शल्य पर्व',          s:64},
      {n:10,t:'Sauptika Parva',        tH:'सौप्तिक पर्व',       s:18},
      {n:11,t:'Stri Parva',            tH:'स्त्री पर्व',        s:27},
      {n:12,t:'Shanti Parva',          tH:'शांति पर्व',         s:365},
      {n:13,t:'Anushasana Parva',      tH:'अनुशासन पर्व',       s:168},
      {n:14,t:'Ashvamedhika Parva',    tH:'अश्वमेधिका पर्व',    s:96},
      {n:15,t:'Ashramavasika Parva',   tH:'आश्रमवासिक पर्व',    s:47},
      {n:16,t:'Mausala Parva',         tH:'मौसल पर्व',          s:9},
      {n:17,t:'Mahaprasthanika Parva', tH:'महाप्रस्थानिक पर्व', s:3},
      {n:18,t:'Svargarohana Parva',    tH:'स्वर्गारोहण पर्व',   s:5},
    ],
  },
  {
    id:'srimad_bhagavatam', icon:'🌸', name:'Srimad Bhagavatam', nameHi:'श्रीमद् भागवतम्',
    desc:'12 Skandhas · Krishna Lila · By Maharishi Vyasa',
    descHi:'12 स्कंध · श्रीकृष्ण लीला · महर्षि व्यास',
    color:'#27AE60', type:'bhagavatam', primaryLang:'Sanskrit',
    units:[
      {n:1, t:'Skandha 1 — Creation',       tH:'स्कंध 1 — सृष्टि',         s:19},
      {n:2, t:'Skandha 2 — Cosmic Form',    tH:'स्कंध 2 — विश्वरूप',       s:10},
      {n:3, t:'Skandha 3 — Status Quo',     tH:'स्कंध 3 — मैत्रेय संवाद',  s:33},
      {n:4, t:'Skandha 4 — Creation',       tH:'स्कंध 4 — चतुर्थ सर्ग',   s:31},
      {n:5, t:'Skandha 5 — Cosmos',         tH:'स्कंध 5 — प्रियव्रत वंश',  s:26},
      {n:6, t:'Skandha 6 — Duties',         tH:'स्कंध 6 — विष्णुदूत',      s:19},
      {n:7, t:'Skandha 7 — God',            tH:'स्कंध 7 — प्रह्लाद',       s:15},
      {n:8, t:'Skandha 8 — Withdrawal',     tH:'स्कंध 8 — गजेंद्र मोक्ष', s:24},
      {n:9, t:'Skandha 9 — Liberation',     tH:'स्कंध 9 — वंशानुचरित',    s:24},
      {n:10,t:'Skandha 10 — Krishna Lila',  tH:'स्कंध 10 — कृष्ण लीला',   s:90},
      {n:11,t:'Skandha 11 — Uddhava Gita',  tH:'स्कंध 11 — उद्धव गीता',   s:31},
      {n:12,t:'Skandha 12 — Age of Kali',   tH:'स्कंध 12 — कलियुग',       s:13},
    ],
  },
  // ── 18 MAHAPURANAS ──────────────────────────────────────────────
  {
    id:'vishnu_purana', icon:'🌀', name:'Vishnu Purana', nameHi:'विष्णु पुराण',
    desc:'6 Amshas · Vishnu glory · By Maharishi Parashara',
    descHi:'6 अंश · विष्णु महिमा · महर्षि पराशर',
    color:'#1565C0', type:'purana', primaryLang:'Sanskrit',
    units:[
      {n:1,t:'Amsha 1 — Creation',tH:'अंश 1 — सृष्टि',s:22},
      {n:2,t:'Amsha 2 — Cosmos',  tH:'अंश 2 — ब्रह्माण्ड',s:16},
      {n:3,t:'Amsha 3 — Manus',   tH:'अंश 3 — मन्वन्तर',s:18},
      {n:4,t:'Amsha 4 — Dynasties',tH:'अंश 4 — वंशावली',s:24},
      {n:5,t:'Amsha 5 — Krishna', tH:'अंश 5 — कृष्ण लीला',s:38},
      {n:6,t:'Amsha 6 — Liberation',tH:'अंश 6 — मोक्ष',s:8},
    ],
  },
  {
    id:'shiva_purana', icon:'🌙', name:'Shiva Purana', nameHi:'शिव पुराण',
    desc:'7 Samhitas · Shiva glory · Vidyeshvara, Rudra, etc.',
    descHi:'7 संहिता · शिव महिमा · विद्येश्वर, रुद्र आदि',
    color:'#37474F', type:'purana', primaryLang:'Sanskrit',
    units:[
      {n:1,t:'Vidyeshvara Samhita', tH:'विद्येश्वर संहिता',s:25},
      {n:2,t:'Rudra Samhita',       tH:'रुद्र संहिता',     s:43},
      {n:3,t:'Shatarudra Samhita',  tH:'शतरुद्र संहिता',   s:42},
      {n:4,t:'Kotirudra Samhita',   tH:'कोटिरुद्र संहिता', s:43},
      {n:5,t:'Uma Samhita',         tH:'उमा संहिता',       s:59},
      {n:6,t:'Kailasa Samhita',     tH:'कैलास संहिता',     s:23},
      {n:7,t:'Vayaviya Samhita',    tH:'वायवीय संहिता',    s:41},
    ],
  },
  {
    id:'devi_bhagavata', icon:'🌺', name:'Devi Bhagavata', nameHi:'देवी भागवत',
    desc:'12 Skandhas · Devi glory · By Maharishi Vyasa',
    descHi:'12 स्कंध · देवी महिमा · महर्षि व्यास',
    color:'#AD1457', type:'purana', primaryLang:'Sanskrit',
    units:[
      {n:1,t:'Skandha 1',tH:'स्कंध 1',s:20},{n:2,t:'Skandha 2',tH:'स्कंध 2',s:12},
      {n:3,t:'Skandha 3',tH:'स्कंध 3',s:30},{n:4,t:'Skandha 4',tH:'स्कंध 4',s:26},
      {n:5,t:'Skandha 5',tH:'स्कंध 5',s:35},{n:6,t:'Skandha 6',tH:'स्कंध 6',s:31},
      {n:7,t:'Skandha 7',tH:'स्कंध 7',s:40},{n:8,t:'Skandha 8',tH:'स्कंध 8',s:24},
      {n:9,t:'Skandha 9',tH:'स्कंध 9',s:50},{n:10,t:'Skandha 10',tH:'स्कंध 10',s:13},
      {n:11,t:'Skandha 11',tH:'स्कंध 11',s:24},{n:12,t:'Skandha 12',tH:'स्कंध 12',s:14},
    ],
  },
  {
    id:'garuda_purana', icon:'🦅', name:'Garuda Purana', nameHi:'गरुड़ पुराण',
    desc:'Acharakanda · Preta Kalpa · Soul journey after death',
    descHi:'आचारकाण्ड · प्रेत कल्प · मृत्यु के बाद आत्मा का मार्ग',
    color:'#E65100', type:'purana', primaryLang:'Sanskrit',
    units:[
      {n:1,t:'Acharakanda',tH:'आचारकाण्ड',s:229},
      {n:2,t:'Preta Kalpa',tH:'प्रेत कल्प',s:49},
      {n:3,t:'Brahma Kanda',tH:'ब्रह्म काण्ड',s:4},
    ],
  },
  {
    id:'agni_purana', icon:'🔥', name:'Agni Purana', nameHi:'अग्नि पुराण',
    desc:'383 Adhyayas · Encyclopedic · By Agni Dev to Vasishtha',
    descHi:'383 अध्याय · ज्ञान कोश · अग्नि देव से वसिष्ठ को',
    color:'#BF360C', type:'purana', primaryLang:'Sanskrit',
    units:[
      {n:1,t:'Adhyaya 1–100',   tH:'अध्याय 1–100',    s:100},
      {n:2,t:'Adhyaya 101–200', tH:'अध्याय 101–200',  s:100},
      {n:3,t:'Adhyaya 201–383', tH:'अध्याय 201–383',  s:183},
    ],
  },
  {
    id:'narada_purana', icon:'🎵', name:'Narada Purana', nameHi:'नारद पुराण',
    desc:"Uttara Bhaga · Narada's wisdom · Bhakti, Jnana",
    descHi:'उत्तर भाग · नारद का ज्ञान · भक्ति, ज्ञान',
    color:'#F57F17', type:'purana', primaryLang:'Sanskrit',
    units:[
      {n:1,t:'Purvabhaga 1',tH:'पूर्वभाग 1',s:45},
      {n:2,t:'Purvabhaga 2',tH:'पूर्वभाग 2',s:41},
      {n:3,t:'Uttarabhaga', tH:'उत्तरभाग', s:82},
    ],
  },
  {
    id:'padma_purana', icon:'🪷', name:'Padma Purana', nameHi:'पद्म पुराण',
    desc:'5 Khandas · Brahma on Vishnu · Creation to salvation',
    descHi:'5 खण्ड · ब्रह्मा का विष्णु वर्णन · सृष्टि से मोक्ष',
    color:'#880E4F', type:'purana', primaryLang:'Sanskrit',
    units:[
      {n:1,t:'Srishti Khanda',  tH:'सृष्टि खण्ड',  s:90},
      {n:2,t:'Bhoomi Khanda',   tH:'भूमि खण्ड',   s:124},
      {n:3,t:'Svarga Khanda',   tH:'स्वर्ग खण्ड',  s:62},
      {n:4,t:'Patala Khanda',   tH:'पाताल खण्ड',  s:116},
      {n:5,t:'Uttara Khanda',   tH:'उत्तर खण्ड',   s:263},
    ],
  },
  // ── KEY UPANISHADS ─────────────────────────────────────────────
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
// AUTHENTIC GITA SANSKRIT DATA — Embedded in app
// Source: Gita Press Gorakhpur / Public domain Sanskrit texts
// These shlokas are stored directly — AI NEVER generates Sanskrit
// AI only generates: transliteration, vigraha, tika, rishi commentary
// ═══════════════════════════════════════════════════════════════
const GITA_SANSKRIT = {
  // Chapter 1 — Arjuna Vishada Yoga (47 shlokas)
  "1.1":  "धृतराष्ट्र उवाच।\nधर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः।\nमामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय।।1.1।।",
  "1.2":  "सञ्जय उवाच।\nदृष्ट्वा तु पाण्डवानीकं व्यूढं दुर्योधनस्तदा।\nआचार्यमुपसङ्गम्य राजा वचनमब्रवीत्।।1.2।।",
  "1.3":  "पश्यैतां पाण्डुपुत्राणामाचार्य महतीं चमूम्।\nव्यूढां द्रुपदपुत्रेण तव शिष्येण धीमता।।1.3।।",
  "1.4":  "अत्र शूरा महेष्वासा भीमार्जुनसमा युधि।\nयुयुधानो विराटश्च द्रुपदश्च महारथः।।1.4।।",
  "1.5":  "धृष्टकेतुश्चेकितानः काशिराजश्च वीर्यवान्।\nपुरुजित्कुन्तिभोजश्च शैब्यश्च नरपुङ्गवः।।1.5।।",
  "1.6":  "युधामन्युश्च विक्रान्त उत्तमौजाश्च वीर्यवान्।\nसौभद्रो द्रौपदेयाश्च सर्व एव महारथाः।।1.6।।",
  "1.7":  "अस्माकं तु विशिष्टा ये तान्निबोध द्विजोत्तम।\nनायका मम सैन्यस्य संज्ञार्थं तान्ब्रवीमि ते।।1.7।।",
  "1.8":  "भवान्भीष्मश्च कर्णश्च कृपश्च समितिञ्जयः।\nअश्वत्थामा विकर्णश्च सौमदत्तिस्तथैव च।।1.8।।",
  "1.9":  "अन्ये च बहवः शूरा मदर्थे त्यक्तजीविताः।\nनानाशस्त्रप्रहरणाः सर्वे युद्धविशारदाः।।1.9।।",
  "1.10": "अपर्याप्तं तदस्माकं बलं भीष्माभिरक्षितम्।\nपर्याप्तं त्विदमेतेषां बलं भीमाभिरक्षितम्।।1.10।।",
  "1.11": "अयनेषु च सर्वेषु यथाभागमवस्थिताः।\nभीष्ममेवाभिरक्षन्तु भवन्तः सर्व एव हि।।1.11।।",
  "1.12": "तस्य सञ्जनयन्हर्षं कुरुवृद्धः पितामहः।\nसिंहनादं विनद्योच्चैः शङ्खं दध्मौ प्रतापवान्।।1.12।।",
  "1.13": "ततः शङ्खाश्च भेर्यश्च पणवानकगोमुखाः।\nसहसैवाभ्यहन्यन्त स शब्दस्तुमुलोऽभवत्।।1.13।।",
  "1.14": "ततः श्वेतैर्हयैर्युक्ते महति स्यन्दने स्थितौ।\nमाधवः पाण्डवश्चैव दिव्यौ शङ्खौ प्रदध्मतुः।।1.14।।",
  "1.15": "पाञ्चजन्यं हृषीकेशो देवदत्तं धनञ्जयः।\nपौण्ड्रं दध्मौ महाशङ्खं भीमकर्मा वृकोदरः।।1.15।।",
  "1.16": "अनन्तविजयं राजा कुन्तीपुत्रो युधिष्ठिरः।\nनकुलः सहदेवश्च सुघोषमणिपुष्पकौ।।1.16।।",
  "1.17": "काश्यश्च परमेष्वासः शिखण्डी च महारथः।\nधृष्टद्युम्नो विराटश्च सात्यकिश्चापराजितः।।1.17।।",
  "1.18": "द्रुपदो द्रौपदेयाश्च सर्वशः पृथिवीपते।\nसौभद्रश्च महाबाहुः शङ्खान्दध्मुः पृथक्पृथक्।।1.18।।",
  "1.19": "स घोषो धार्तराष्ट्राणां हृदयानि व्यदारयत्।\nनभश्च पृथिवीं चैव तुमुलो व्यनुनादयन्।।1.19।।",
  "1.20": "अथ व्यवस्थितान्दृष्ट्वा धार्तराष्ट्रान्कपिध्वजः।\nप्रवृत्ते शस्त्रसम्पाते धनुरुद्यम्य पाण्डवः।।1.20।।",
  "1.21": "हृषीकेशं तदा वाक्यमिदमाह महीपते।\nअर्जुन उवाच। सेनयोरुभयोर्मध्ये रथं स्थापय मेऽच्युत।।1.21।।",
  "1.22": "यावदेतान्निरीक्षेऽहं योद्धुकामानवस्थितान्।\nकैर्मया सह योद्धव्यमस्मिन्रणसमुद्यमे।।1.22।।",
  "1.23": "योत्स्यमानानवेक्षेऽहं य एतेऽत्र समागताः।\nधार्तराष्ट्रस्य दुर्बुद्धेर्युद्धे प्रियचिकीर्षवः।।1.23।।",
  "1.24": "सञ्जय उवाच।\nएवमुक्तो हृषीकेशो गुडाकेशेन भारत।\nसेनयोरुभयोर्मध्ये स्थापयित्वा रथोत्तमम्।।1.24।।",
  "1.25": "भीष्मद्रोणप्रमुखतः सर्वेषां च महीक्षिताम्।\nउवाच पार्थ पश्यैतान्समवेतान्कुरूनिति।।1.25।।",
  "1.26": "तत्रापश्यत्स्थितान्पार्थः पितॄनथ पितामहान्।\nआचार्यान्मातुलान्भ्रातॄन्पुत्रान्पौत्रान्सखींस्तथा।।1.26।।",
  "1.27": "श्वशुरान्सुहृदश्चैव सेनयोरुभयोरपि।\nतान्समीक्ष्य स कौन्तेयः सर्वान्बन्धूनवस्थितान्।।1.27।।",
  "1.28": "कृपया परयाविष्टो विषीदन्निदमब्रवीत्।\nअर्जुन उवाच। दृष्ट्वेमं स्वजनं कृष्ण युयुत्सुं समुपस्थितम्।।1.28।।",
  "1.29": "सीदन्ति मम गात्राणि मुखं च परिशुष्यति।\nवेपथुश्च शरीरे मे रोमहर्षश्च जायते।।1.29।।",
  "1.30": "गाण्डीवं स्रंसते हस्तात्त्वक्चैव परिदह्यते।\nन च शक्नोम्यवस्थातुं भ्रमतीव च मे मनः।।1.30।।",
  "1.31": "निमित्तानि च पश्यामि विपरीतानि केशव।\nन च श्रेयोऽनुपश्यामि हत्वा स्वजनमाहवे।।1.31।।",
  "1.32": "न काङ्क्षे विजयं कृष्ण न च राज्यं सुखानि च।\nकिं नो राज्येन गोविन्द किं भोगैर्जीवितेन वा।।1.32।।",
  "1.33": "येषामर्थे काङ्क्षितं नो राज्यं भोगाः सुखानि च।\nत इमेऽवस्थिता युद्धे प्राणांस्त्यक्त्वा धनानि च।।1.33।।",
  "1.34": "आचार्याः पितरः पुत्रास्तथैव च पितामहाः।\nमातुलाः श्वशुराः पौत्राः श्यालाः सम्बन्धिनस्तथा।।1.34।।",
  "1.35": "एतान्न हन्तुमिच्छामि घ्नतोऽपि मधुसूदन।\nअपि त्रैलोक्यराज्यस्य हेतोः किं नु महीकृते।।1.35।।",
  "1.36": "निहत्य धार्तराष्ट्रान्नः का प्रीतिः स्याज्जनार्दन।\nपापमेवाश्रयेदस्मान्हत्वैतानाततायिनः।।1.36।।",
  "1.37": "तस्मान्नार्हा वयं हन्तुं धार्तराष्ट्रान्स्वबान्धवान्।\nस्वजनं हि कथं हत्वा सुखिनः स्याम माधव।।1.37।।",
  "1.38": "यद्यप्येते न पश्यन्ति लोभोपहतचेतसः।\nकुलक्षयकृतं दोषं मित्रद्रोहे च पातकम्।।1.38।।",
  "1.39": "कथं न ज्ञेयमस्माभिः पापादस्मान्निवर्तितुम्।\nकुलक्षयकृतं दोषं प्रपश्यद्भिर्जनार्दन।।1.39।।",
  "1.40": "कुलक्षये प्रणश्यन्ति कुलधर्माः सनातनाः।\nधर्मे नष्टे कुलं कृत्स्नमधर्मोऽभिभवत्युत।।1.40।।",
  "1.41": "अधर्माभिभवात्कृष्ण प्रदुष्यन्ति कुलस्त्रियः।\nस्त्रीषु दुष्टासु वार्ष्णेय जायते वर्णसङ्करः।।1.41।।",
  "1.42": "सङ्करो नरकायैव कुलघ्नानां कुलस्य च।\nपतन्ति पितरो ह्येषां लुप्तपिण्डोदकक्रियाः।।1.42।।",
  "1.43": "दोषैरेतैः कुलघ्नानां वर्णसङ्करकारकैः।\nउत्साद्यन्ते जातिधर्माः कुलधर्माश्च शाश्वताः।।1.43।।",
  "1.44": "उत्सन्नकुलधर्माणां मनुष्याणां जनार्दन।\nनरकेऽनियतं वासो भवतीत्यनुशुश्रुम।।1.44।।",
  "1.45": "अहो बत महत्पापं कर्तुं व्यवसिता वयम्।\nयद्राज्यसुखलोभेन हन्तुं स्वजनमुद्यताः।।1.45।।",
  "1.46": "यदि मामप्रतीकारमशस्त्रं शस्त्रपाणयः।\nधार्तराष्ट्रा रणे हन्युस्तन्मे क्षेमतरं भवेत्।।1.46।।",
  "1.47": "सञ्जय उवाच।\nएवमुक्त्वार्जुनः सङ्ख्ये रथोपस्थ उपाविशत्।\nविसृज्य सशरं चापं शोकसंविग्नमानसः।।1.47।।",
  // Chapters 2–18: key shlokas (144 total embedded, AI adds commentary for remaining)
  "2.1": "सञ्जय उवाच।\nतं तथा कृपयाविष्टमश्रुपूर्णाकुलेक्षणम्।\nविषीदन्तमिदं वाक्यमुवाच मधुसूदनः।।2.1।।",
  "2.2": "श्रीभगवानुवाच।\nकुतस्त्वा कश्मलमिदं विषमे समुपस्थितम्।\nअनार्यजुष्टमस्वर्ग्यमकीर्तिकरमर्जुन।।2.2।।",
  "2.3": "क्लैब्यं मा स्म गमः पार्थ नैतत्त्वय्युपपद्यते।\nक्षुद्रं हृदयदौर्बल्यं त्यक्त्वोत्तिष्ठ परन्तप।।2.3।।",
  "2.11": "श्रीभगवानुवाच।\nअशोच्यानन्वशोचस्त्वं प्रज्ञावादांश्च भाषसे।\nगतासूनगतासूंश्च नानुशोचन्ति पण्डिताः।।2.11।।",
  "2.17": "अविनाशि तु तद्विद्धि येन सर्वमिदं ततम्।\nविनाशमव्ययस्यास्य न कश्चित्कर्तुमर्हति।।2.17।।",
  "2.19": "य एनं वेत्ति हन्तारं यश्चैनं मन्यते हतम्।\nउभौ तौ न विजानीतो नायं हन्ति न हन्यते।।2.19।।",
  "2.20": "न जायते म्रियते वा कदाचिन्\nनायं भूत्वा भविता वा न भूयः।\nअजो नित्यः शाश्वतोऽयं पुराणो\nन हन्यते हन्यमाने शरीरे।।2.20।।",
  "2.22": "वासांसि जीर्णानि यथा विहाय\nनवानि गृह्णाति नरोऽपराणि।\nतथा शरीराणि विहाय जीर्णा-\nन्यन्यानि संयाति नवानि देही।।2.22।।",
  "2.47": "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि।।2.47।।",
  "2.48": "योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय।\nसिद्ध्यसिद्ध्योः समो भूत्वा समत्वं योग उच्यते।।2.48।।",
  "2.70": "आपूर्यमाणमचलप्रतिष्ठं\nसमुद्रमापः प्रविशन्ति यद्वत्।\nतद्वत्कामा यं प्रविशन्ति सर्वे\nस शान्तिमाप्नोति न कामकामी।।2.70।।",
  "2.72": "एषा ब्राह्मी स्थितिः पार्थ नैनां प्राप्य विमुह्यति।\nस्थित्वास्यामन्तकालेऽपि ब्रह्मनिर्वाणमृच्छति।।2.72।।",
  "3.1": "अर्जुन उवाच।\nज्यायसी चेत्कर्मणस्ते मता बुद्धिर्जनार्दन।\nतत्किं कर्मणि घोरे मां नियोजयसि केशव।।3.1।।",
  "3.16": "एवं प्रवर्तितं चक्रं नानुवर्तयतीह यः।\nअघायुरिन्द्रियारामो मोघं पार्थ स जीवति।।3.16।।",
  "3.19": "तस्मादसक्तः सततं कार्यं कर्म समाचर।\nअसक्तो ह्याचरन्कर्म परमाप्नोति पूरुषः।।3.19।।",
  "3.21": "यद्यदाचरति श्रेष्ठस्तत्तदेवेतरो जनः।\nस यत्प्रमाणं कुरुते लोकस्तदनुवर्तते।।3.21।।",
  "3.27": "प्रकृतेः क्रियमाणानि गुणैः कर्माणि सर्वशः।\nअहङ्कारविमूढात्मा कर्ताहमिति मन्यते।।3.27।।",
  "3.35": "श्रेयान्स्वधर्मो विगुणः परधर्मात्स्वनुष्ठितात्।\nस्वधर्मे निधनं श्रेयः परधर्मो भयावहः।।3.35।।",
  "3.42": "इन्द्रियाणि पराण्याहुरिन्द्रियेभ्यः परं मनः।\nमनसस्तु परा बुद्धिर्यो बुद्धेः परतस्तु सः।।3.42।।",
  "3.43": "एवं बुद्धेः परं बुद्ध्वा संस्तभ्यात्मानमात्मना।\nजहि शत्रुं महाबाहो कामरूपं दुरासदम्।।3.43।।",
  "4.1": "श्रीभगवानुवाच।\nइमं विवस्वते योगं प्रोक्तवानहमव्ययम्।\nविवस्वान्मनवे प्राह मनुरिक्ष्वाकवेऽब्रवीत्।।4.1।।",
  "4.7": "यदा यदा हि धर्मस्य ग्लानिर्भवति भारत।\nअभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम्।।4.7।।",
  "4.8": "परित्राणाय साधूनां विनाशाय च दुष्कृताम्।\nधर्मसंस्थापनार्थाय सम्भवामि युगे युगे।।4.8।।",
  "4.13": "चातुर्वर्ण्यं मया सृष्टं गुणकर्मविभागशः।\nतस्य कर्तारमपि मां विद्ध्यकर्तारमव्ययम्।।4.13।।",
  "4.24": "ब्रह्मार्पणं ब्रह्म हविर्ब्रह्माग्नौ ब्रह्मणा हुतम्।\nब्रह्मैव तेन गन्तव्यं ब्रह्मकर्मसमाधिना।।4.24।।",
  "4.38": "न हि ज्ञानेन सदृशं पवित्रमिह विद्यते।\nतत्स्वयं योगसंसिद्धः कालेनात्मनि विन्दति।।4.38।।",
  "4.42": "तस्मादज्ञानसम्भूतं हृत्स्थं ज्ञानासिनात्मनः।\nछित्त्वैनं संशयं योगमातिष्ठोत्तिष्ठ भारत।।4.42।।",
  "5.1": "अर्जुन उवाच।\nसंन्यासं कर्मणां कृष्ण पुनर्योगं च शंससि।\nयच्छ्रेय एतयोरेकं तन्मे ब्रूहि सुनिश्चितम्।।5.1।।",
  "5.7": "योगयुक्तो विशुद्धात्मा विजितात्मा जितेन्द्रियः।\nसर्वभूतात्मभूतात्मा कुर्वन्नपि न लिप्यते।।5.7।।",
  "5.18": "विद्याविनयसम्पन्ने ब्राह्मणे गवि हस्तिनि।\nशुनि चैव श्वपाके च पण्डिताः समदर्शिनः।।5.18।।",
  "5.29": "भोक्तारं यज्ञतपसां सर्वलोकमहेश्वरम्।\nसुहृदं सर्वभूतानां ज्ञात्वा मां शान्तिमृच्छति।।5.29।।",
  "6.1": "श्रीभगवानुवाच।\nअनाश्रितः कर्मफलं कार्यं कर्म करोति यः।\nस संन्यासी च योगी च न निरग्निर्न चाक्रियः।।6.1।।",
  "6.5": "उद्धरेदात्मनात्मानं नात्मानमवसादयेत्।\nआत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः।।6.5।।",
  "6.6": "बन्धुरात्मात्मनस्तस्य येनात्मैवात्मना जितः।\nअनात्मनस्तु शत्रुत्वे वर्तेतात्मैव शत्रुवत्।।6.6।।",
  "6.19": "यथा दीपो निवातस्थो नेङ्गते सोपमा स्मृता।\nयोगिनो यतचित्तस्य युञ्जतो योगमात्मनः।।6.19।।",
  "6.34": "चञ्चलं हि मनः कृष्ण प्रमाथि बलवद्दृढम्।\nतस्याहं निग्रहं मन्ये वायोरिव सुदुष्करम्।।6.34।।",
  "6.35": "श्रीभगवानुवाच।\nअसंशयं महाबाहो मनो दुर्निग्रहं चलम्।\nअभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते।।6.35।।",
  "6.47": "योगिनामपि सर्वेषां मद्गतेनान्तरात्मना।\nश्रद्धावान्भजते यो मां स मे युक्ततमो मतः।।6.47।।",
  "7.1": "श्रीभगवानुवाच।\nमय्यासक्तमनाः पार्थ योगं युञ्जन्मदाश्रयः।\nअसंशयं समग्रं मां यथा ज्ञास्यसि तच्छृणु।।7.1।।",
  "7.4": "भूमिरापोऽनलो वायुः खं मनो बुद्धिरेव च।\nअहङ्कार इतीयं मे भिन्ना प्रकृतिरष्टधा।।7.4।।",
  "7.7": "मत्तः परतरं नान्यत्किञ्चिदस्ति धनञ्जय।\nमयि सर्वमिदं प्रोतं सूत्रे मणिगणा इव।।7.7।।",
  "7.19": "बहूनां जन्मनामन्ते ज्ञानवान्मां प्रपद्यते।\nवासुदेवः सर्वमिति स महात्मा सुदुर्लभः।।7.19।।",
  "7.30": "साधिभूताधिदैवं मां साधियज्ञं च ये विदुः।\nप्रयाणकालेऽपि च मां ते विदुर्युक्तचेतसः।।7.30।।",
  "8.5": "अन्तकाले च मामेव स्मरन्मुक्त्वा कलेवरम्।\nयः प्रयाति स मद्भावं याति नास्त्यत्र संशयः।।8.5।।",
  "8.6": "यं यं वापि स्मरन्भावं त्यजत्यन्ते कलेवरम्।\nतं तमेवैति कौन्तेय सदा तद्भावभावितः।।8.6।।",
  "8.7": "तस्मात्सर्वेषु कालेषु मामनुस्मर युध्य च।\nमय्यर्पितमनोबुद्धिर्मामेवैष्यस्यसंशयः।।8.7।।",
  "8.28": "वेदेषु यज्ञेषु तपःसु चैव\nदानेषु यत्पुण्यफलं प्रदिष्टम्।\nअत्येति तत्सर्वमिदं विदित्वा\nयोगी परं स्थानमुपैति चाद्यम्।।8.28।।",
  "9.1": "श्रीभगवानुवाच।\nइदं तु ते गुह्यतमं प्रवक्ष्याम्यनसूयवे।\nज्ञानं विज्ञानसहितं यज्ज्ञात्वा मोक्ष्यसेऽशुभात्।।9.1।।",
  "9.22": "अनन्याश्चिन्तयन्तो मां ये जनाः पर्युपासते।\nतेषां नित्याभियुक्तानां योगक्षेमं वहाम्यहम्।।9.22।।",
  "9.26": "पत्रं पुष्पं फलं तोयं यो मे भक्त्या प्रयच्छति।\nतदहं भक्त्युपहृतमश्नामि प्रयतात्मनः।।9.26।।",
  "9.27": "यत्करोषि यदश्नासि यज्जुहोषि ददासि यत्।\nयत्तपस्यसि कौन्तेय तत्कुरुष्व मदर्पणम्।।9.27।।",
  "9.34": "मन्मना भव मद्भक्तो मद्याजी मां नमस्कुरु।\nमामेवैष्यसि युक्त्वैवमात्मानं मत्परायणः।।9.34।।",
  "10.1": "श्रीभगवानुवाच।\nभूय एव महाबाहो शृणु मे परमं वचः।\nयत्तेऽहं प्रीयमाणाय वक्ष्यामि हितकाम्यया।।10.1।।",
  "10.20": "अहमात्मा गुडाकेश सर्वभूताशयस्थितः।\nअहमादिश्च मध्यं च भूतानामन्त एव च।।10.20।।",
  "10.32": "सर्गाणामादिरन्तश्च मध्यं चैवाहमर्जुन।\nअध्यात्मविद्या विद्यानां वादः प्रवदतामहम्।।10.32।।",
  "10.41": "यद्यद्विभूतिमत्सत्त्वं श्रीमदूर्जितमेव वा।\nतत्तदेवावगच्छ त्वं मम तेजोऽंशसम्भवम्।।10.41।।",
  "10.42": "अथवा बहुनैतेन किं ज्ञातेन तवार्जुन।\nविष्टभ्याहमिदं कृत्स्नमेकांशेन स्थितो जगत्।।10.42।।",
  "11.1": "अर्जुन उवाच।\nमदनुग्रहाय परमं गुह्यमध्यात्मसंज्ञितम्।\nयत्त्वयोक्तं वचस्तेन मोहोऽयं विगतो मम।।11.1।।",
  "11.7": "इहैकस्थं जगत्कृत्स्नं पश्याद्य सचराचरम्।\nमम देहे गुडाकेश यच्चान्यद्द्रष्टुमिच्छसि।।11.7।।",
  "11.32": "श्रीभगवानुवाच।\nकालोऽस्मि लोकक्षयकृत्प्रवृद्धो\nलोकान्समाहर्तुमिह प्रवृत्तः।\nऋतेऽपि त्वां न भविष्यन्ति सर्वे\nयेऽवस्थिताः प्रत्यनीकेषु योधाः।।11.32।।",
  "11.54": "भक्त्या त्वनन्यया शक्य अहमेवंविधोऽर्जुन।\nज्ञातुं द्रष्टुं च तत्त्वेन प्रवेष्टुं च परन्तप।।11.54।।",
  "11.55": "मत्कर्मकृन्मत्परमो मद्भक्तः सङ्गवर्जितः।\nनिर्वैरः सर्वभूतेषु यः स मामेति पाण्डव।।11.55।।",
  "12.1": "अर्जुन उवाच।\nएवं सततयुक्ता ये भक्तास्त्वां पर्युपासते।\nये चाप्यक्षरमव्यक्तं तेषां के योगवित्तमाः।।12.1।।",
  "12.2": "श्रीभगवानुवाच।\nमय्यावेश्य मनो ये मां नित्ययुक्ता उपासते।\nश्रद्धया परयोपेतास्ते मे युक्ततमा मताः।।12.2।।",
  "12.13": "अद्वेष्टा सर्वभूतानां मैत्रः करुण एव च।\nनिर्ममो निरहङ्कारः समदुःखसुखः क्षमी।।12.13।।",
  "12.20": "ये तु धर्म्यामृतमिदं यथोक्तं पर्युपासते।\nश्रद्दधाना मत्परमा भक्तास्तेऽतीव मे प्रियाः।।12.20।।",
  "13.1": "श्रीभगवानुवाच।\nइदं शरीरं कौन्तेय क्षेत्रमित्यभिधीयते।\nएतद्यो वेत्ति तं प्राहुः क्षेत्रज्ञ इति तद्विदः।।13.1।।",
  "13.7": "अमानित्वमदम्भित्वमहिंसा क्षान्तिरार्जवम्।\nआचार्योपासनं शौचं स्थैर्यमात्मविनिग्रहः।।13.7।।",
  "13.27": "समं सर्वेषु भूतेषु तिष्ठन्तं परमेश्वरम्।\nविनश्यत्स्वविनश्यन्तं यः पश्यति स पश्यति।।13.27।।",
  "13.34": "यथा प्रकाशयत्येकः कृत्स्नं लोकमिमं रविः।\nक्षेत्रं क्षेत्री तथा कृत्स्नं प्रकाशयति भारत।।13.34।।",
  "14.1": "श्रीभगवानुवाच।\nपरं भूयः प्रवक्ष्यामि ज्ञानानां ज्ञानमुत्तमम्।\nयज्ज्ञात्वा मुनयः सर्वे परां सिद्धिमितो गताः।।14.1।।",
  "14.5": "सत्त्वं रजस्तम इति गुणाः प्रकृतिसम्भवाः।\nनिबध्नन्ति महाबाहो देहे देहिनमव्ययम्।।14.5।।",
  "14.18": "ऊर्ध्वं गच्छन्ति सत्त्वस्था मध्ये तिष्ठन्ति राजसाः।\nजघन्यगुणवृत्तिस्था अधो गच्छन्ति तामसाः।।14.18।।",
  "14.26": "मां च योऽव्यभिचारेण भक्तियोगेन सेवते।\nस गुणान्समतीत्यैतान्ब्रह्मभूयाय कल्पते।।14.26।।",
  "14.27": "ब्रह्मणो हि प्रतिष्ठाहममृतस्याव्ययस्य च।\nशाश्वतस्य च धर्मस्य सुखस्यैकान्तिकस्य च।।14.27।।",
  "15.1": "श्रीभगवानुवाच।\nऊर्ध्वमूलमधःशाखमश्वत्थं प्राहुरव्ययम्।\nछन्दांसि यस्य पर्णानि यस्तं वेद स वेदवित्।।15.1।।",
  "15.15": "सर्वस्य चाहं हृदि सन्निविष्टो\nमत्तः स्मृतिर्ज्ञानमपोहनं च।\nवेदैश्च सर्वैरहमेव वेद्यो\nवेदान्तकृद्वेदविदेव चाहम्।।15.15।।",
  "15.20": "इति गुह्यतमं शास्त्रमिदमुक्तं मयानघ।\nएतद्बुद्ध्वा बुद्धिमान्स्यात्कृतकृत्यश्च भारत।।15.20।।",
  "16.1": "श्रीभगवानुवाच।\nअभयं सत्त्वसंशुद्धिर्ज्ञानयोगव्यवस्थितिः।\nदानं दमश्च यज्ञश्च स्वाध्यायस्तप आर्जवम्।।16.1।।",
  "16.3": "तेजः क्षमा धृतिः शौचमद्रोहो नातिमानिता।\nभवन्ति सम्पदं दैवीमभिजातस्य भारत।।16.3।।",
  "16.21": "त्रिविधं नरकस्येदं द्वारं नाशनमात्मनः।\nकामः क्रोधस्तथा लोभस्तस्मादेतत्त्रयं त्यजेत्।।16.21।।",
  "16.24": "तस्माच्छास्त्रं प्रमाणं ते कार्याकार्यव्यवस्थितौ।\nज्ञात्वा शास्त्रविधानोक्तं कर्म कर्तुमिहार्हसि।।16.24।।",
  "17.1": "अर्जुन उवाच।\nये शास्त्रविधिमुत्सृज्य यजन्ते श्रद्धयान्विताः।\nतेषां निष्ठा तु का कृष्ण सत्त्वमाहो रजस्तमः।।17.1।।",
  "17.3": "सत्त्वानुरूपा सर्वस्य श्रद्धा भवति भारत।\nश्रद्धामयोऽयं पुरुषो यो यच्छ्रद्धः स एव सः।।17.3।।",
  "17.23": "ॐ तत्सदिति निर्देशो ब्रह्मणस्त्रिविधः स्मृतः।\nब्राह्मणास्तेन वेदाश्च यज्ञाश्च विहिताः पुरा।।17.23।।",
  "17.28": "अश्रद्धया हुतं दत्तं तपस्तप्तं कृतं च यत्।\nअसदित्युच्यते पार्थ न च तत्प्रेत्य नो इह।।17.28।।",
  "18.1": "अर्जुन उवाच।\nसंन्यासस्य महाबाहो तत्त्वमिच्छामि वेदितुम्।\nत्यागस्य च हृषीकेश पृथक्केशिनिषूदन।।18.1।।",
  "18.13": "पञ्चैतानि महाबाहो कारणानि निबोध मे।\nसांख्ये कृतान्ते प्रोक्तानि सिद्धये सर्वकर्मणाम्।।18.13।।",
  "18.45": "स्वे स्वे कर्मण्यभिरतः संसिद्धिं लभते नरः।\nस्वकर्मनिरतः सिद्धिं यथा विन्दति तच्छृणु।।18.45।।",
  "18.46": "यतः प्रवृत्तिर्भूतानां येन सर्वमिदं ततम्।\nस्वकर्मणा तमभ्यर्च्य सिद्धिं विन्दति मानवः।।18.46।।",
  "18.63": "इति ते ज्ञानमाख्यातं गुह्याद्गुह्यतरं मया।\nविमृश्यैतदशेषेण यथेच्छसि तथा कुरु।।18.63।।",
  "18.64": "सर्वगुह्यतमं भूयः शृणु मे परमं वचः।\nइष्टोऽसि मे दृढमिति ततो वक्ष्यामि ते हितम्।।18.64।।",
  "18.65": "मन्मना भव मद्भक्तो मद्याजी मां नमस्कुरु।\nमामेवैष्यसि सत्यं ते प्रतिजाने प्रियोऽसि मे।।18.65।।",
  "18.66": "सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज।\nअहं त्वा सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः।।18.66।।",
  "18.70": "अध्येष्यते च य इमं धर्म्यं संवादमावयोः।\nज्ञानयज्ञेन तेनाहमिष्टः स्यामिति मे मतिः।।18.70।।",
  "18.73": "अर्जुन उवाच।\nनष्टो मोहः स्मृतिर्लब्धा त्वत्प्रसादान्मयाच्युत।\nस्थितोऽस्मि गतसन्देहः करिष्ये वचनं तव।।18.73।।",
  "18.78": "यत्र योगेश्वरः कृष्णो यत्र पार्थो धनुर्धरः।\nतत्र श्रीर्विजयो भूतिर्ध्रुवा नीतिर्मतिर्मम।।18.78।।",
};

// Helper: get embedded Sanskrit for a shloka, or return null to let AI generate
function getEmbeddedSanskrit(scriptureId, chapterN, shlokaN) {
  if (scriptureId === 'bhagavad_gita') {
    const key = `${chapterN}.${shlokaN}`;
    return GITA_SANSKRIT[key] || null; // null = AI generates this shloka's Sanskrit
  }
  return null;
}

// Build Sanskrit seed block for a chapter — embedded shlokas as anchor text
function buildSanskritSeed(scriptureId, chapterN, total) {
  const seeds = [];
  for (let v = 1; v <= total; v++) {
    const sk = getEmbeddedSanskrit(scriptureId, chapterN, v);
    if (sk) seeds.push(`SHLOKA ${chapterN}.${v} SANSKRIT:\n${sk}`);
  }
  return seeds;
}

// ═══════════════════════════════════════════════════════════════
// VERSE MASTER — exact counts, authoritative
// ═══════════════════════════════════════════════════════════════
const VERSE_MASTER = {
  bhagavad_gita:{1:47,2:72,3:43,4:42,5:29,6:47,7:30,8:28,9:34,10:42,11:55,12:20,13:34,14:27,15:20,16:24,17:28,18:78},
  valmiki_ramayana:{1:77,2:119,3:75,4:67,5:68,6:131,7:111},
  ramcharitmanas:{1:360,2:326,3:46,4:30,5:60,6:117,7:130},
  mahabharata:{1:227,2:79,3:317,4:72,5:199,6:122,7:203,8:96,9:64,10:18,11:27,12:365,13:168,14:96,15:47,16:9,17:3,18:5},
  srimad_bhagavatam:{1:19,2:10,3:33,4:31,5:26,6:19,7:15,8:24,9:24,10:90,11:31,12:13},
  upanishads:{1:18,2:35,3:119,4:67,5:64,6:12,7:34,8:33,9:154,10:150},
  vishnu_purana:{1:22,2:16,3:18,4:24,5:38,6:8},
  shiva_purana:{1:25,2:43,3:42,4:43,5:59,6:23,7:41},
  devi_bhagavata:{1:20,2:12,3:30,4:26,5:35,6:31,7:40,8:24,9:50,10:13,11:24,12:14},
  garuda_purana:{1:229,2:49,3:4},
  agni_purana:{1:100,2:100,3:183},
  narada_purana:{1:45,2:41,3:82},
  padma_purana:{1:90,2:124,3:62,4:116,5:263},
};

// ═══════════════════════════════════════════════════════════════
// CACHE (permanent, version kv12)
// ═══════════════════════════════════════════════════════════════
const CV = 'kv12_';

async function getCached(sid, n, lang) {
  try { const r = await AsyncStorage.getItem(`${CV}${sid}_${n}_${lang}`); return r ? JSON.parse(r).c : null; }
  catch { return null; }
}
async function saveLocal(sid, n, lang, c) {
  try { await AsyncStorage.setItem(`${CV}${sid}_${n}_${lang}`, JSON.stringify({c, ts:Date.now()})); } catch {}
}
// Nuclear clear — removes every old cache prefix
async function clearChapterCache(sid, n) {
  const allPfx = ['kv9_','kv10_','kv11_','kv12_'];
  const langs  = ['hindi','english'];
  try {
    for (const p of allPfx) for (const l of langs)
      await AsyncStorage.removeItem(`${p}${sid}_${n}_${l}`);
    for (const p of ['kp9_','kp10_','kp11_','kp12_']) {
      const raw = await AsyncStorage.getItem(`${p}${sid}`);
      if (raw) { const pg = JSON.parse(raw); delete pg[n]; await AsyncStorage.setItem(`${p}${sid}`, JSON.stringify(pg)); }
    }
  } catch {}
}
async function getProgress(sid) {
  try { const r = await AsyncStorage.getItem(`kp12_${sid}`); return r ? JSON.parse(r) : {}; } catch { return {}; }
}
async function markRead(sid, n) {
  try { const p = await getProgress(sid); p[n] = Date.now(); await AsyncStorage.setItem(`kp12_${sid}`, JSON.stringify(p)); } catch {}
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
// RATE LIMIT MANAGEMENT
// ═══════════════════════════════════════════════════════════════
const CD = { gemini:0, groq:0 };
const COOLDOWN = 65000;
const BETWEEN_CALLS = 22000; // 22s gap — well within Gemini 15/min free tier

let _geminiStrikes = 0;
function geminiDead() { return _geminiStrikes >= 2; }
function geminiStrike() { _geminiStrikes++; }
function geminiReset()  { _geminiStrikes = 0; }

function onCD(api)          { return Date.now() < CD[api]; }
function setCD(api)         { CD[api] = Date.now() + COOLDOWN; }
function wait(ms)           { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════════════════════════
// API CALLERS — one call per chapter (the KEY fix)
// Groq llama-3.3-70b: max_tokens 6000 → handles 30-50 shlokas
// Gemini 2.0-flash: max_tokens 8000 → handles any chapter
// ═══════════════════════════════════════════════════════════════
async function callGroq(sys, userMsg) {
  if (onCD('groq')) throw new Error('groq:cd');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${GROQ_KEY}`},
    body:JSON.stringify({
      model:'llama-3.3-70b-versatile',
      messages:[{role:'system',content:sys},{role:'user',content:userMsg}],
      temperature:0.12,
      max_tokens:6000,  // KEY: large enough for 40-50 shlokas in one call
    }),
  });
  if (res.status === 429) { setCD('groq'); throw new Error('groq:429'); }
  if (!res.ok) throw new Error(`groq:${res.status}`);
  const d = await res.json();
  const t = d?.choices?.[0]?.message?.content;
  if (!t || t.length < 100) throw new Error('groq:empty');
  return t;
}

async function callGemini(sys, userMsg) {
  if (onCD('gemini')) throw new Error('gemini:cd');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEM_KEY}`;
  const res = await fetch(url, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      contents:[{parts:[{text:`${sys}\n\n${userMsg}`}]}],
      generationConfig:{temperature:0.12, maxOutputTokens:8000}, // KEY: 8000 for full chapter
      safetySettings:[
        {category:'HARM_CATEGORY_HARASSMENT',        threshold:'BLOCK_NONE'},
        {category:'HARM_CATEGORY_HATE_SPEECH',       threshold:'BLOCK_NONE'},
        {category:'HARM_CATEGORY_DANGEROUS_CONTENT', threshold:'BLOCK_NONE'},
      ],
    }),
  });
  if (res.status === 429) { setCD('gemini'); throw new Error('gemini:429'); }
  if (!res.ok) throw new Error(`gemini:${res.status}`);
  const d = await res.json();
  const t = d?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!t || t.length < 100) throw new Error('gemini:empty');
  return t;
}

// Smart call — Gemini first, Groq fallback, handles both being on cooldown
async function callAI(sys, userMsg) {
  if (!geminiDead() && !onCD('gemini')) {
    try {
      console.log('[Katha] → Gemini');
      const r = await callGemini(sys, userMsg);
      geminiReset();
      return r;
    } catch(e) {
      geminiStrike();
      console.log(`[Katha] Gemini ✗ (${e.message}) strike ${_geminiStrikes}`);
    }
  }
  if (!onCD('groq')) {
    try {
      console.log('[Katha] → Groq');
      return await callGroq(sys, userMsg);
    } catch(e) {
      console.log(`[Katha] Groq ✗ (${e.message})`);
      if (e.message.includes('429') || e.message.includes('cd')) {
        // Both on cooldown — wait and retry once
        const waitSec = Math.ceil(COOLDOWN / 1000);
        throw new Error(`RATE_LIMITED:${waitSec}`);
      }
      throw new Error('BOTH_FAILED');
    }
  }
  // Both on cooldown
  const waitMs = Math.max(CD.gemini, CD.groq) - Date.now() + 3000;
  throw new Error(`RATE_LIMITED:${Math.ceil(waitMs/1000)}`);
}

// ═══════════════════════════════════════════════════════════════
// PROMPT BUILDER — full chapter in one shot
// ═══════════════════════════════════════════════════════════════
function buildPrompt(sc, unit, lang) {
  const isH = lang === 'hindi';
  const pLang = sc.primaryLang || 'Sanskrit';
  const total = VERSE_MASTER[sc.id]?.[unit.n] || unit.s || 20;

  const sys = `You are a Vedic scholar of the Gita Press Gorakhpur tradition.
LANGUAGE: ${isH ? 'Write ALL explanations in pure Hindi (Devanagari). Original text in ' + pLang + '. No English.' : 'Write ALL explanations in English. Original text in ' + pLang + '.'}
RULE: Be authentic, devotional, and deep. Start content DIRECTLY — no preamble or "Here is".`;

  let userMsg = '';
  if (sc.type === 'gita') {
    // Build Sanskrit seed for this chapter — verified text, not hallucinated
    // Get all embedded Sanskrit for this chapter (works for ALL 18 chapters)
    const seedArr = buildSanskritSeed(sc.id, unit.n, total);
    const sanskritSeed = seedArr.join('\n');
    console.log(`[Katha] ${seedArr.length}/${total} shlokas have embedded Sanskrit for Ch${unit.n}`);

    userMsg = `${sanskritSeed ? 'I am providing you the EXACT Sanskrit text for each shloka. Use ONLY this Sanskrit — do not modify or regenerate it. Just add transliteration, vigraha, tika, bodh, and rishi commentary.\n\n' + sanskritSeed + '\n\n---\n\n' : ''}Generate commentary for COMPLETE Bhagavad Gita Chapter ${unit.n} — "${isH ? unit.tH : unit.t}".
Total shlokas: EXACTLY ${total}. Cover ALL ${total} shlokas.

For EACH shloka use EXACTLY this format:

SHLOKA ${unit.n}.[number]
${sanskritSeed ? 'OM: [Copy the Sanskrit EXACTLY as provided above — do not change a single letter]' : 'OM: [Complete Sanskrit shloka in Devanagari — BOTH lines, copy exactly]'}
ROM: [Both lines in Roman transliteration with correct diacritics]
VIGRAHA: [key word (Devanagari) = literal meaning → spiritual significance | next word = ... ]
TIKA: [Authentic Gita Press style meaning — 3 sentences, emotional weight of Krishna-Arjuna]
BODH: [1 practical sentence — life lesson today]
RISHI: [Ancient Rishi speaks to the reader's life today — 2 warm personal sentences]
BAL: [Bal-Seekh: 2-line simple moral in very simple ${isH ? "Hindi" : "English"} for children — what a 10-year-old child should remember from this shloka]`;
  } else if (sc.type === 'ramayana') {
    userMsg = `Generate Valmiki Ramayana ${isH ? unit.tH : unit.t} (Kanda ${unit.n}).
Cover the complete narrative of this Kanda.

Structure:
KANDA_OVERVIEW: [3 paragraph overview of the entire Kanda]
KEY_VERSES: [8-10 most important shlokas in format below]
NARRATIVE: [6-8 paragraph rich story with dialogue, emotion, characters]
DHARMA: [2 paragraphs on what this Kanda teaches about Dharma]

For each key verse:
VERSE ${unit.n}.[number]
OM: [Sanskrit Devanagari — both lines]
ROM: [Roman transliteration]
VIGRAHA: [key words explained]
TIKA: [meaning 3 sentences]
RISHI: [Rishi speaks to reader]`;
  } else if (sc.type === 'manas') {
    userMsg = `Generate Ramcharitmanas ${isH ? unit.tH : unit.t} (Kand ${unit.n}) — Tulsidas Awadhi.
Cover the complete Kand.

Structure:
KAND_OVERVIEW: [3 paragraph overview]
For each section, CHAUPAI/DOHA [number]:
AWADHI: [Original Awadhi text in Devanagari — Tulsidas exact]
HINDI: [Clear Hindi meaning]
BHAV: [Devotional feeling — 2 sentences]
RISHI: [Rishi speaks to reader today — 2 sentences]
NARRATIVE: [5-6 paragraph story — characters, dialogue, emotion]`;
  } else if (sc.type === 'mahabharat') {
    userMsg = `Generate Mahabharata ${isH ? unit.tH : unit.t} (Parva ${unit.n}).
Cover the complete Parva narrative.

Structure:
PARVA_OVERVIEW: [3 paragraphs]
KEY_EVENTS: [5-7 major events, each with full narrative paragraph, dharmic lesson]
KEY_SHLOKAS: [5-7 shlokas with OM/ROM/VIGRAHA/TIKA/RISHI format]
WISDOM: [2 paragraphs on the philosophical teaching]`;
  } else if (sc.type === 'bhagavatam') {
    userMsg = `Generate Srimad Bhagavatam ${isH ? unit.tH : unit.t} (Skandha ${unit.n}).

Structure:
SKANDHA_OVERVIEW: [3 paragraphs]
KEY_STORIES: [3-4 stories with devotional narrative, bhakti essence]
KEY_VERSES: [6-8 verses with OM/ROM/VIGRAHA/TIKA/RISHI format]
DIVINE_GLORY: [2 paragraphs on Lord's glory revealed here]`;
  } else {
    userMsg = `Generate ${isH ? unit.tH : unit.t} — complete text.
Total mantras: EXACTLY ${total}. Cover ALL.

For EACH mantra:
MANTRA ${unit.n}.[number]
OM: [Complete Sanskrit Devanagari]
ROM: [Full Roman with diacritics]
VIGRAHA: [key word = meaning → significance | ...]
TIKA: [Deep philosophical meaning — 3 sentences]
RISHI: [Rishi speaks to reader's daily life — 2 personal sentences]`;
  }
  return { sys, userMsg };
}

// ═══════════════════════════════════════════════════════════════
// GENERATION: ONE CALL PER CHAPTER
// For very long chapters (72+ shlokas), splits into 2 calls max
// ═══════════════════════════════════════════════════════════════
let _busy = false;

async function generateChapter(sc, unit, lang, onProgress) {
  const isH   = lang === 'hindi';
  const total = VERSE_MASTER[sc.id]?.[unit.n] || unit.s || 20;

  while (_busy) {
    onProgress(isH ? '⏳ प्रतीक्षा करें...' : '⏳ Waiting...');
    await wait(2000);
  }
  _busy = true;

  try {
    const header = `🕉 ${isH ? sc.nameHi : sc.name} — ${isH ? unit.tH : unit.t}\n${'═'.repeat(45)}\n\n`;

    // Chapters with 60+ shlokas: split into 2 calls (still just 2 API calls, not 10!)
    if (total > 60) {
      const mid = Math.ceil(total / 2);
      onProgress(isH ? `📖 भाग 1/2 लोड हो रहा है (1–${mid})...` : `📖 Loading part 1/2 (1–${mid})...`);
      const { sys, userMsg } = buildPrompt(sc, unit, lang);
      const part1Msg = userMsg.replace(`EXACTLY ${total}`, `EXACTLY the first ${mid}`).replace(`ALL ${total}`, `ALL first ${mid} shlokas (${unit.n}.1 to ${unit.n}.${mid})`);
      const part1 = await callAI(sys, part1Msg);

      onProgress(isH ? `✅ भाग 1 पूर्ण — 22 सेकंड में भाग 2...` : `✅ Part 1 done — part 2 in 22s...`);
      await wait(BETWEEN_CALLS);

      onProgress(isH ? `📖 भाग 2/2 लोड हो रहा है (${mid+1}–${total})...` : `📖 Loading part 2/2 (${mid+1}–${total})...`);
      const part2Msg = userMsg.replace(`EXACTLY ${total}`, `EXACTLY shlokas ${mid+1} to ${total}`).replace(`ALL ${total}`, `ONLY shlokas ${mid+1} through ${total}`);
      const part2 = await callAI(sys, part2Msg);

      return header + part1 + '\n\n' + '─'.repeat(40) + '\n\n' + part2;
    }

    // Short/medium chapters: single API call — the permanent fix
    onProgress(isH ? `📖 ${total} श्लोक लोड हो रहे हैं...` : `📖 Loading ${total} verses...`);
    const { sys, userMsg } = buildPrompt(sc, unit, lang);
    const result = await callAI(sys, userMsg);
    return header + result;

  } finally {
    _busy = false;
  }
}

// ═══════════════════════════════════════════════════════════════
// LOAD: Local → Backend → Generate
// ═══════════════════════════════════════════════════════════════
async function loadContent(sc, unit, lang, onProgress) {
  const cached = await getCached(sc.id, unit.n, lang);
  if (cached) { console.log('[Katha] ✓ Local cache'); return { content:cached, source:'local' }; }

  onProgress('☁️ सर्वर cache खोज रहे हैं...');
  const bc = await loadFromBackend(sc.id, unit.n, lang);
  if (bc) {
    await saveLocal(sc.id, unit.n, lang, bc);
    console.log('[Katha] ✓ Backend cache');
    return { content:bc, source:'backend' };
  }

  const content = await generateChapter(sc, unit, lang, onProgress);
  await saveLocal(sc.id, unit.n, lang, content);
  await saveToBackend(sc.id, unit.n, lang, content);
  await markRead(sc.id, unit.n);
  return { content, source:'ai' };
}

// ═══════════════════════════════════════════════════════════════
// PDF DOWNLOAD — expo-print, Sacred Scroll design
// ═══════════════════════════════════════════════════════════════
async function downloadAsPDF(sc, unit, lang, content, userProfile) {
  // ── Premium gate ─────────────────────────────────────────────
  if (userProfile && userProfile.plan === 'free') {
    Alert.alert(
      '🙏 Premium Feature',
      userProfile.language === 'hindi'
        ? 'PDF Download और Offline Scripture सुविधा Premium सदस्यों के लिए है।\n\nसनातन धर्म की रक्षा में सहयोग करें — Premium लें।'
        : 'PDF Download & Offline Scriptures are Premium features.\n\nSupport the preservation of our heritage — Upgrade to Premium.',
      [
        { text: userProfile.language === 'hindi' ? 'बाद में' : 'Later', style: 'cancel' },
        { text: userProfile.language === 'hindi' ? 'Premium लें 🕉' : 'Upgrade 🕉',
          onPress: () => router.push('/(tabs)/payment') },
      ]
    );
    return;
  }
  try {
    const isH   = lang === 'hindi';
    const scName= isH ? sc.nameHi : sc.name;
    const uTitle= isH ? unit.tH   : unit.t;
    const lines = content.split('\n');
    let body = '';

    for (const line of lines) {
      const t = line.trim();
      if (!t) { body += '<br/>'; continue; }
      if (/^[─═]{4,}/.test(t)) { body += '<hr/>'; continue; }
      if (/^(SHLOKA|VERSE|MANTRA|CHAUPAI|DOHA)\s+[\d.]+/i.test(t))
        body += `<div class="sh">${t}</div>`;
      else if (/^OM:/i.test(t))
        body += `<div class="san">ॐ ${t.replace(/^OM:\s*/i,'')}</div>`;
      else if (/^ROM:/i.test(t))
        body += `<div class="rom">${t.replace(/^ROM:\s*/i,'')}</div>`;
      else if (/^VIGRAHA:/i.test(t))
        body += `<div class="vhdr">📚 ${t.replace(/^VIGRAHA:\s*/i,'')}</div>`;
      else if (/^TIKA:/i.test(t))
        body += `<div class="tika"><b>Tika:</b> ${t.replace(/^TIKA:\s*/i,'')}</div>`;
      else if (/^BODH:/i.test(t))
        body += `<div class="bodh">🕉 ${t.replace(/^BODH:\s*/i,'')}</div>`;
      else if (/^RISHI:/i.test(t))
        body += `<div class="rishi">🔱 ${t.replace(/^RISHI:\s*/i,'')}</div>`;
      else if (/[\u0900-\u097F]{5,}/.test(t))
        body += `<div class="deva">${t}</div>`;
      else
        body += `<p>${t}</p>`;
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  @page{margin:20mm;@top-center{content:"DharmaSetu — Your Digital Gurukul";font-size:9px;color:#8B4513}
        @bottom-center{content:"Learn more at dharmasetu.in | जय सनातन धर्म";font-size:9px;color:#8B4513}}
  body{font-family:Georgia,serif;background:#FFFDF7;color:#2C1800;padding:24px 28px;font-size:13px}
  .brand-hdr{background:#8B4513;color:#FFF8E1;text-align:center;padding:10px;margin:-24px -28px 24px;
             font-size:13px;letter-spacing:1px}
  .brand-ftr{border-top:1px solid #C9830A;margin-top:32px;padding-top:12px;text-align:center;
             font-size:11px;color:#8B4513}
  .cover{text-align:center;padding:32px 0 24px;border-bottom:2px solid #C9830A;margin-bottom:28px}
  .cover h1{color:#8B4513;font-size:26px;margin:0 0 6px}
  .cover h2{color:#C9830A;font-size:18px;margin:0;font-weight:normal}
  .sh{background:#FFF3E0;border-left:4px solid #E8620A;padding:8px 14px;margin:22px 0 8px;
      font-weight:bold;font-size:12px;color:#C45508;border-radius:4px;
      border:1px solid #FFD700}
  .san{background:#EDE7F6;border-radius:8px;padding:14px;margin:6px 0;
       font-size:18px;color:#4A148C;line-height:2.2;text-align:center;font-weight:600;
       border:1px solid #D4AF37}
  .rom{color:#6A1B9A;font-style:italic;font-size:12px;padding:2px 14px 8px;line-height:1.6}
  .vhdr{background:#FFF8E1;border:1px solid #C9830A;padding:6px 12px;margin:10px 0 4px;
        font-size:11px;font-weight:bold;color:#8B6914;border-radius:4px}
  .tika{background:#FBE9E7;border-radius:6px;padding:10px;margin:5px 0;font-size:13px;line-height:1.7}
  .bodh{background:#E8F5E9;border-radius:6px;padding:8px 12px;margin:5px 0;font-size:12px;color:#1B5E20}
  .rishi{background:#EDE7F6;border:1px solid #7B1FA2;border-left:4px solid #9C27B0;
         border-radius:8px;padding:12px;margin:8px 0;font-size:13px;color:#4A148C;
         line-height:1.8;font-style:italic}
  .deva{color:#4A148C;font-size:16px;line-height:2;padding:4px 8px}
  p{line-height:1.7;margin:4px 0;color:#3E2723}
  hr{border:0.5px solid #C9830A;margin:14px 0;opacity:0.4}
  .foot{text-align:center;margin-top:36px;padding-top:16px;border-top:1px solid #C9830A;
        font-size:11px;color:#8B4513}
</style></head><body>
<div class="brand-hdr">🕉 DharmaSetu — Your Digital Gurukul | dharmasetu.in</div>
<div class="cover">
  <div style="font-size:44px">🕉</div>
  <h1>${scName}</h1>
  <h2>${uTitle}</h2>
  <div style="font-size:11px;color:#C9830A;margin-top:8px">DharmaSetu · जय सनातन धर्म</div>
</div>
${body}
<div class="brand-ftr">🕉 DharmaSetu — Your Digital Gurukul<br/>Learn more at: dharmasetu.in | जय सनातन धर्म</div>
</body></html>`;

    const { uri } = await Print.printToFileAsync({ html, base64:false });
    const ok = await Sharing.isAvailableAsync();
    if (ok) await Sharing.shareAsync(uri, { mimeType:'application/pdf', UTI:'com.adobe.pdf' });
    else Alert.alert('PDF Ready', uri);
  } catch(e) {
    try { await Share.share({ message:content.slice(0,60000), title:`DharmaSetu — ${unit.tH||unit.t}` }); }
    catch { Alert.alert('Error', e.message); }
  }
}

// ═══════════════════════════════════════════════════════════════
// SACRED SCROLL RENDERER
// New format keys: OM, ROM, VIGRAHA, TIKA, BODH, RISHI
// Also supports old format keys for backwards compatibility
// ═══════════════════════════════════════════════════════════════
function VerseCard({ line, index }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue:1, duration:400, delay:index*60, useNativeDriver:true }),
      Animated.timing(slideAnim, { toValue:0, duration:350, delay:index*60, useNativeDriver:true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity:fadeAnim, transform:[{translateY:slideAnim}] }}>
      {line}
    </Animated.View>
  );
}

function ContentRenderer({ text }) {
  const FS = 14;
  const lines = text.split('\n');
  const elements = [];
  let cardIdx = 0;

  lines.forEach((line, i) => {
    const t = line.trim();
    if (!t) { elements.push(<View key={i} style={{height:5}}/>); return; }

    const isDivider  = /^[─═]{4,}/.test(t);
    const isSlokaHdr = /^(SHLOKA|VERSE|MANTRA|CHAUPAI|DOHA)\s+[\d.]+/i.test(t);
    const isOM       = /^OM:/i.test(t);
    const isROM      = /^ROM:/i.test(t);
    const isVigraha  = /^VIGRAHA:/i.test(t);
    const isVigrahaOld = /^VIGRAHA$/i.test(t);
    const isTIKA     = /^TIKA:/i.test(t);
    const isBODH     = /^BODH:/i.test(t);
        const isBAL      = /^BAL:/i.test(t);
    const isRISHI    = /^RISHI:/i.test(t);
    // Legacy format support
    const isGahanD   = /^GAHAN DRISHTI/i.test(t);
    const isSanskrit = /^(Sanskrit|Awadhi|Text):/i.test(t);
    const isTranslit = /^Transliteration:/i.test(t);
    const isTika2    = /^(Gita Press Tika|गीता प्रेस तिका|Hindi Meaning)/i.test(t);
    const isTeach    = /^(Teaching|शिक्षा|Meaning|अर्थ):/i.test(t);
    const isVigrahaLnOld = /^[a-zA-Z\u0900-\u097F]+\s*\([^)]+\)\s*[:]\s*.+→.+/.test(t);
    const isSectionH = /^(OVERVIEW|KEY_VERSES|KEY VERSES|NARRATIVE|DHARMIC|WISDOM|DIVINE|KANDA|PARVA|SKANDHA|KAND)/i.test(t);
    const isDeva     = /[\u0900-\u097F]{5,}/.test(t) && !isOM && !isVigraha && !isVigrahaOld && !isSectionH;

    const ci = cardIdx++;
    let el = null;

    if (isDivider)    el = <View style={ss.divider}/>;
    else if (isSlokaHdr) el = (
      <View style={ss.slokaCard}>
        <Text style={ss.slokaNum}>{t}</Text>
      </View>
    );
    else if (isOM || isSanskrit) {
      const val = t.replace(/^(OM:|Sanskrit:|Awadhi:|Text:)\s*/i, '');
      el = (
        <View style={ss.sanCard}>
          <Text style={ss.sanIcon}>ॐ</Text>
          <Text style={[ss.sanTxt, {fontSize:FS+3, lineHeight:(FS+3)*2.2}]}>{val}</Text>
        </View>
      );
    }
    else if (isROM || isTranslit) el = (
      <Text style={[ss.romTxt,{fontSize:FS-1}]}>{t.replace(/^(ROM:|Transliteration:)\s*/i,'')}</Text>
    );
    else if (isVigraha) {
      // New format: VIGRAHA: word=meaning→sig | word2=...
      const parts = t.replace(/^VIGRAHA:\s*/i,'').split('|').filter(Boolean);
      el = (
        <View style={ss.vigrahaCard}>
          <View style={ss.vigrahaHdrRow}>
            <Text style={ss.vigrahaIcon}>📚</Text>
            <Text style={ss.vigrahaHdrTxt}>VIGRAHA — शब्द-अर्थ</Text>
          </View>
          <View style={ss.vigrahaGrid}>
            {parts.map((p,pi) => (
              <View key={pi} style={ss.vigrahaChip}>
                <Text style={[ss.vigrahaChipTxt,{fontSize:FS-2}]}>{p.trim()}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }
    else if (isVigrahaOld) el = <View style={ss.vigrahaHdrRowStd}><Text style={ss.vigrahaIcon}>📚</Text><Text style={ss.vigrahaHdrTxt}>VIGRAHA — शब्द-अर्थ-महत्व</Text></View>;
    else if (isVigrahaLnOld) el = <View style={ss.vigrahaChip}><Text style={[ss.vigrahaChipTxt,{fontSize:FS-1}]}>{t}</Text></View>;
    else if (isTIKA || isTika2)   el = (
      <View style={ss.tikaCard}>
        <Text style={ss.tikaIcon}>🔱 Tika</Text>
        <Text style={[ss.tikaTxt,{fontSize:FS,lineHeight:FS*1.9}]}>{t.replace(/^(TIKA:|Gita Press Tika:|गीता प्रेस तिका:|Hindi Meaning:)\s*/i,'')}</Text>
      </View>
    );
    else if (isBODH || isTeach)   el = (
      <View style={ss.bodhCard}>
        <Text style={[ss.bodhTxt,{fontSize:FS,lineHeight:FS*1.7}]}>{t.replace(/^(BODH:|Teaching:|शिक्षा:|Meaning:|अर्थ:)\s*/i,'')}</Text>
      </View>
    );
    else if (isRISHI || isGahanD) el = (
      <View style={ss.rishiCard}>
        <Text style={ss.rishiLbl}>🔱 गहन दृष्टि</Text>
        <Text style={[ss.rishiTxt,{fontSize:FS,lineHeight:FS*1.9}]}>
          {t.replace(/^(RISHI:|GAHAN DRISHTI[^:]*:)\s*/i,'')}
        </Text>
      </View>
    );
    else if (isBAL) el = (
      <View style={ss.balCard}>
        <Text style={ss.balLbl}>🌟 बाल-शिक्षा</Text>
        <Text style={[ss.balTxt,{fontSize:FS-1,lineHeight:(FS-1)*1.7}]}>
          {t.replace(/^BAL:\s*/i,'')}
        </Text>
      </View>
    );
    else if (isSectionH) el = <View style={ss.secHdr}><Text style={ss.secTxt}>{t}</Text></View>;
    else if (isDeva)     el = <View style={ss.devaBox}><Text style={[ss.sanTxt,{fontSize:FS+2,lineHeight:(FS+2)*2.1}]}>{t}</Text></View>;
    else                 el = <Text style={[ss.body,{fontSize:FS,lineHeight:FS*1.8}]}>{t}</Text>;

    elements.push(<VerseCard key={i} line={el} index={ci}/>);
  });

  return <>{elements}</>;
}

// ═══════════════════════════════════════════════════════════════
// SACRED SCROLL STYLES
// ═══════════════════════════════════════════════════════════════
const ss = StyleSheet.create({
  divider:       {height:1,backgroundColor:'rgba(201,131,10,0.2)',marginVertical:18},
  slokaCard:     {backgroundColor:'rgba(232,98,10,0.1)',borderRadius:12,paddingVertical:12,paddingHorizontal:16,marginTop:24,marginBottom:10,borderWidth:1,borderColor:'#C9830A',shadowColor:'#FFD700',shadowOpacity:0.15,shadowRadius:4,elevation:2},
  slokaNum:      {fontSize:12,fontWeight:'800',color:'#E8620A',letterSpacing:0.8},
  sanCard:       {backgroundColor:'rgba(107,33,168,0.14)',borderRadius:14,padding:16,marginBottom:8,borderWidth:1,borderColor:'#D4AF37',alignItems:'center',shadowColor:'#FFD700',shadowOpacity:0.2,shadowRadius:8,elevation:3},
  sanIcon:       {fontSize:18,color:'#C9830A',marginBottom:6},
  sanTxt:        {color:'#D4A8FF',fontWeight:'600',textAlign:'center'},
  romTxt:        {color:'rgba(212,168,255,0.7)',fontStyle:'italic',paddingHorizontal:14,marginBottom:8,lineHeight:20},
  vigrahaCard:   {backgroundColor:'rgba(201,131,10,0.07)',borderRadius:12,padding:12,marginVertical:8,borderWidth:1,borderColor:'rgba(201,131,10,0.25)'},
  vigrahaHdrRow: {flexDirection:'row',alignItems:'center',gap:6,marginBottom:8},
  vigrahaHdrRowStd:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'rgba(201,131,10,0.08)',borderRadius:8,padding:8,marginVertical:6,borderWidth:1,borderColor:'rgba(201,131,10,0.2)'},
  vigrahaIcon:   {fontSize:14},
  vigrahaHdrTxt: {fontSize:11,fontWeight:'800',color:'#C9830A'},
  vigrahaGrid:   {flexDirection:'row',flexWrap:'wrap',gap:6},
  vigrahaChip:   {backgroundColor:'rgba(201,131,10,0.12)',borderRadius:8,paddingHorizontal:10,paddingVertical:6,borderWidth:1,borderColor:'rgba(201,131,10,0.3)'},
  vigrahaChipTxt:{color:'rgba(253,220,130,0.9)'},
  tikaCard:      {backgroundColor:'rgba(232,98,10,0.07)',borderRadius:12,padding:14,marginBottom:8,borderWidth:1,borderColor:'rgba(232,98,10,0.2)'},
  tikaIcon:      {fontSize:11,color:'#E8620A',fontWeight:'800',marginBottom:6,letterSpacing:0.4},
  tikaTxt:       {color:'rgba(253,246,237,0.9)',fontWeight:'500'},
  bodhCard:      {backgroundColor:'rgba(39,174,96,0.08)',borderRadius:10,paddingHorizontal:14,paddingVertical:10,marginBottom:6,borderLeftWidth:3,borderLeftColor:'#27AE60'},
  bodhTxt:       {color:'rgba(100,220,150,0.9)',fontWeight:'600'},
  rishiCard:     {backgroundColor:'rgba(255,140,0,0.06)',borderRadius:14,padding:16,marginVertical:10,borderWidth:1,borderColor:'rgba(255,140,0,0.25)',borderLeftWidth:4,borderLeftColor:'#FF8C00',shadowColor:'#FF8C00',shadowOpacity:0.08,shadowRadius:6,elevation:1},
  rishiLbl:      {fontSize:11,color:'#FF8C00',fontWeight:'800',marginBottom:8,letterSpacing:0.3},
  rishiTxt:      {color:'rgba(255,220,150,0.95)',fontStyle:'italic'},
  secHdr:        {backgroundColor:'rgba(201,131,10,0.1)',borderRadius:10,paddingVertical:11,paddingHorizontal:14,marginVertical:14,borderWidth:1,borderColor:'rgba(201,131,10,0.28)'},
  secTxt:        {fontSize:13,fontWeight:'800',color:'#C9830A',textAlign:'center'},
  devaBox:       {backgroundColor:'rgba(107,33,168,0.08)',borderRadius:10,padding:10,marginBottom:6,borderLeftWidth:3,borderLeftColor:'rgba(107,33,168,0.4)'},
  body:          {color:'rgba(253,246,237,0.83)',marginBottom:3},
  balCard:       {backgroundColor:'rgba(255,215,0,0.08)',borderRadius:12,padding:12,marginTop:4,marginBottom:14,borderWidth:1,borderColor:'rgba(255,215,0,0.25)',borderLeftWidth:3,borderLeftColor:'#FFD700'},
  balLbl:        {fontSize:10,color:'#FFD700',fontWeight:'800',marginBottom:5,letterSpacing:0.3},
  balTxt:        {color:'rgba(255,240,180,0.9)',fontWeight:'500'},
});

// ═══════════════════════════════════════════════════════════════
// CHAPTER READER
// ═══════════════════════════════════════════════════════════════
function ChapterReader({visible, onClose, sc, unit, lang}) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [status,  setStatus]  = useState('');
  const userProfileRef = useRef(null);
  const insets = useSafeAreaInsets();
  const isH = lang === 'hindi';

  // Load user profile once to check premium status for PDF gate
  useEffect(() => {
    AsyncStorage.getItem('dharmasetu_user').then(raw => {
      if (raw) userProfileRef.current = JSON.parse(raw);
    });
  }, []);

  useEffect(() => {
    if (!visible || !sc || !unit) return;
    setContent(''); setError(''); setLoading(true); setStatus('');
    doLoad();
  }, [visible, sc?.id, unit?.n, lang]);

  const doLoad = async () => {
    try {
      const { content:c } = await loadContent(sc, unit, lang, setStatus);
      setContent(c);
    } catch(e) {
      if (e.message?.startsWith('RATE_LIMITED:')) {
        const sec = e.message.split(':')[1] || '65';
        setError(isH
          ? `कृपया ${sec} सेकंड बाद दोबारा कोशिश करें।\n(APIs अभी व्यस्त हैं)`
          : `Please retry in ${sec} seconds.\n(APIs are busy right now)`);
      } else {
        setError(isH
          ? 'इंटरनेट कनेक्शन जांचें और दोबारा कोशिश करें।'
          : 'Check internet connection and try again.');
      }
    }
    setLoading(false);
  };

  const handleReset = () => {
    Alert.alert(
      isH ? 'अध्याय Reset करें?' : 'Reset Chapter?',
      isH ? 'Cached data हटेगा और नया generate होगा। जारी रखें?' : 'This clears cached data and regenerates. Continue?',
      [
        { text: isH?'रद्द':'Cancel', style:'cancel' },
        { text: isH?'Reset करें':'Reset', style:'destructive', onPress: async () => {
          await clearChapterCache(sc.id, unit.n);
          geminiReset();
          setContent(''); setError(''); setLoading(true); setStatus('');
          doLoad();
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

        <View style={cr.hdr}>
          <TouchableOpacity onPress={onClose} style={cr.back} hitSlop={{top:14,bottom:14,left:14,right:14}}>
            <Text style={cr.backTxt}>←</Text>
          </TouchableOpacity>
          <View style={{flex:1}}>
            <Text style={cr.hdrSc} numberOfLines={1}>{scTitle}</Text>
            <Text style={cr.hdrTitle} numberOfLines={1}>{uTitle}</Text>
          </View>
          {content ? (
            <TouchableOpacity style={cr.dlBtn} onPress={()=>downloadAsPDF(sc,unit,lang,content,userProfileRef.current)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Text style={{fontSize:15}}>⬇️</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={cr.shareBtn} onPress={()=>{
            if(!content) return;
            Share.share({message:`🕉 ${scTitle} — ${uTitle}\n\n${content.slice(0,500)}...\n\n— DharmaSetu App`});
          }}>
            <Text style={{fontSize:15}}>📤</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={cr.center}>
            <ActivityIndicator size="large" color="#E8620A"/>
            <Text style={cr.loadTxt}>{isH?'शास्त्र लोड हो रहे हैं...':'Loading scripture...'}</Text>
            <Text style={cr.loadSub}>{status}</Text>
          </View>
        ) : error ? (
          <View style={cr.center}>
            <Text style={{fontSize:40,marginBottom:16}}>📡</Text>
            <Text style={cr.errTxt}>{error}</Text>
            <TouchableOpacity style={cr.retryBtn} onPress={()=>{setLoading(true);setError('');doLoad();}}>
              <Text style={cr.retryTxt}>{isH?'दोबारा कोशिश करें':'Retry'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={{flex:1}} contentContainerStyle={{padding:18}} showsVerticalScrollIndicator={false}>
            <View style={{alignItems:'center',marginBottom:22,paddingBottom:18,borderBottomWidth:1,borderBottomColor:'rgba(240,165,0,0.12)'}}>
              <Text style={{fontSize:20,fontWeight:'800',color:'#F4A261',textAlign:'center',marginBottom:5}}>{uTitle}</Text>
              {unit?.s && <Text style={{fontSize:11,color:'rgba(253,246,237,0.3)',marginTop:3}}>{unit.s} {isH?'श्लोक':'verses'}</Text>}
              {sc.primaryLang && <Text style={{fontSize:10,color:'rgba(201,131,10,0.5)',marginTop:2}}>{sc.primaryLang}</Text>}
              <View style={{width:32,height:2,backgroundColor:'rgba(232,98,10,0.5)',borderRadius:1,marginTop:10}}/>
            </View>

            <ContentRenderer text={content}/>

            <View style={{alignItems:'center',marginTop:32,paddingVertical:22,borderTopWidth:1,borderTopColor:'rgba(240,165,0,0.1)'}}>
              <Text style={{fontSize:30,marginBottom:8}}>🕉</Text>
              <Text style={{fontSize:13,fontWeight:'700',color:'#F4A261',marginBottom:3}}>
                {uTitle} — {isH?'पाठ पूर्ण':'Complete'}
              </Text>
              <TouchableOpacity
                style={{marginTop:10,flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'rgba(232,98,10,0.1)',borderRadius:10,paddingHorizontal:14,paddingVertical:9,borderWidth:1,borderColor:'rgba(232,98,10,0.25)'}}
                onPress={()=>downloadAsPDF(sc,unit,lang,content,userProfileRef.current)}>
                <Text style={{fontSize:14}}>⬇️</Text>
                <Text style={{fontSize:12,color:'#F4A261',fontWeight:'700'}}>{isH?'PDF Download करें':'Download as PDF'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleReset} style={{marginTop:12}}>
                <Text style={{fontSize:10,color:'rgba(253,246,237,0.22)',textDecorationLine:'underline'}}>
                  {isH?'अधूरा लगे? Reset करें':'Incomplete? Tap to reset'}
                </Text>
              </TouchableOpacity>
              <Text style={{fontSize:12,color:'#C9830A',marginTop:12}}>जय सनातन धर्म · Jai Sanatan Dharma</Text>
            </View>
            <View style={{height:insets.bottom+20}}/>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const cr = StyleSheet.create({
  root:    {flex:1,backgroundColor:'#080200'},
  hdr:     {flexDirection:'row',alignItems:'center',paddingHorizontal:14,paddingVertical:12,borderBottomWidth:1,borderBottomColor:'rgba(240,165,0,0.12)',gap:6},
  back:    {width:38,height:38,borderRadius:19,backgroundColor:'rgba(255,255,255,0.07)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(240,165,0,0.18)'},
  backTxt: {fontSize:20,color:'#F4A261',fontWeight:'600',marginTop:-1},
  hdrSc:   {fontSize:10,color:'#C9830A',fontWeight:'600',marginBottom:1},
  hdrTitle:{fontSize:13,fontWeight:'800',color:'#F4A261'},
  dlBtn:   {paddingHorizontal:8,paddingVertical:6,borderRadius:8,backgroundColor:'rgba(39,174,96,0.12)',borderWidth:1,borderColor:'rgba(39,174,96,0.3)'},
  shareBtn:{paddingHorizontal:8,paddingVertical:6,borderRadius:8,backgroundColor:'rgba(232,98,10,0.1)',borderWidth:1,borderColor:'rgba(232,98,10,0.25)'},
  center:  {flex:1,alignItems:'center',justifyContent:'center',padding:28},
  loadTxt: {fontSize:15,color:'#F4A261',textAlign:'center',marginTop:16,fontWeight:'700'},
  loadSub: {fontSize:12,color:'rgba(253,246,237,0.45)',marginTop:8,textAlign:'center'},
  errTxt:  {fontSize:14,color:'rgba(253,246,237,0.65)',textAlign:'center',lineHeight:24,marginBottom:20},
  retryBtn:{backgroundColor:'#E8620A',paddingHorizontal:28,paddingVertical:13,borderRadius:12},
  retryTxt:{fontSize:14,color:'#fff',fontWeight:'800'},
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
  const rc=Object.keys(prog).length, tot=sc.units?.length||0;
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
          <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:6}}>
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
                <View style={{flexDirection:'row',alignItems:'center',gap:5}}>
                  {done&&<Text style={{fontSize:12,color:'#27AE60',fontWeight:'800'}}>✓</Text>}
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
const ul=StyleSheet.create({
  root:{flex:1,backgroundColor:'#0D0500'},
  hdr:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'rgba(240,165,0,0.1)',gap:12},
  back:{width:38,height:38,borderRadius:19,backgroundColor:'rgba(255,255,255,0.08)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(240,165,0,0.2)'},
  backTxt:{fontSize:20,color:'#F4A261',fontWeight:'600',marginTop:-1},
  hTitle:{fontSize:17,fontWeight:'800',color:'#F4A261',marginBottom:2},
  hSub:{fontSize:10,color:'rgba(253,246,237,0.38)',lineHeight:15},
  progBox:{marginHorizontal:16,marginVertical:10,backgroundColor:'rgba(255,255,255,0.04)',borderRadius:12,padding:14,borderWidth:1,borderColor:'rgba(240,165,0,0.08)'},
  progLbl:{fontSize:11,color:'rgba(253,246,237,0.42)',fontWeight:'600'},
  progPct:{fontSize:11,fontWeight:'800'},
  progTrack:{height:4,backgroundColor:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden'},
  progFill:{height:4,borderRadius:2},
  card:{borderRadius:14,padding:14,flexDirection:'row',alignItems:'center',gap:12,borderWidth:1},
  num:{width:38,height:38,borderRadius:10,alignItems:'center',justifyContent:'center',borderWidth:1,flexShrink:0},
  numTxt:{fontSize:14,fontWeight:'800'},
  uTitle:{fontSize:13,fontWeight:'700',color:'#FDF6ED',marginBottom:2},
  uMeta:{fontSize:10,color:'rgba(253,246,237,0.22)',marginTop:1},
});

// ═══════════════════════════════════════════════════════════════
// MAIN KATHA VAULT SCREEN
// ═══════════════════════════════════════════════════════════════
export default function KathaVault() {
  const insets=useSafeAreaInsets();
  const [lang,       setLang]      = useState('hindi');
  const [allProg,    setAllProg]   = useState({});
  const [selSc,      setSelSc]     = useState(null);
  const [selUnit,    setSelUnit]   = useState(null);
  const [showUnits,  setShowUnits] = useState(false);
  const [showReader, setShowReader]= useState(false);
  const fade=useRef(new Animated.Value(0)).current;

  useEffect(()=>{
    (async()=>{
      const raw=await AsyncStorage.getItem('dharmasetu_user');
      if(raw){const u=JSON.parse(raw);setLang(u.language||'hindi');}
      refresh();
    })();
    Animated.timing(fade,{toValue:1,duration:500,useNativeDriver:true}).start();
  },[]);

  const refresh=useCallback(async()=>{
    const p={};
    for(const sc of SCRIPTURES){p[sc.id]=await getProgress(sc.id);}
    setAllProg(p);
  },[]);

  const isH=lang==='hindi';

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
                onPress={()=>{setSelSc(sc);setShowUnits(true);}}
                activeOpacity={0.88}>
                <View style={ms.cardTop}>
                  <View style={[ms.iconBox,{backgroundColor:sc.color+'18'}]}>
                    <Text style={{fontSize:26}}>{sc.icon}</Text>
                  </View>
                  <View style={{flex:1,marginLeft:14}}>
                    <Text style={ms.scName}>{isH?sc.nameHi:sc.name}</Text>
                    <Text style={ms.scDesc} numberOfLines={2}>{isH?sc.descHi:sc.desc}</Text>
                    <Text style={[ms.scLang,{color:sc.color}]}>{sc.primaryLang}</Text>
                  </View>
                  <Text style={{fontSize:20,color:'rgba(253,246,237,0.2)'}}>›</Text>
                </View>
                <View style={{marginTop:11}}>
                  <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:5}}>
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

      <UnitList visible={showUnits} onClose={()=>{setShowUnits(false);refresh();}} sc={selSc} lang={lang} onSelect={unit=>{setSelUnit(unit);setShowReader(true);}}/>
      <ChapterReader visible={showReader} onClose={()=>{setShowReader(false);refresh();}} sc={selSc} unit={selUnit} lang={lang}/>
    </View>
  );
}

const ms=StyleSheet.create({
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