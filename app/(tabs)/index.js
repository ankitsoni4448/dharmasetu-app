// ════════════════════════════════════════════════════════
// DharmaSetu — Home Screen — FINAL COMPLETE VERSION
// All fixes merged + Perfect North Indian Kundli Chart
// ════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Dimensions, Modal, ScrollView,
  Share, StyleSheet, Text, TextInput,
  TouchableOpacity, Vibration, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW } = Dimensions.get('window');

// ════════════════════════════════════════════════════════
// TRANSLATIONS
// ════════════════════════════════════════════════════════
const T = {
  greeting:       { en: 'Jai Shri Ram 🙏',               hi: 'जय श्री राम 🙏' },
  namaste:        { en: 'Welcome,',                       hi: 'नमस्ते,' },
  startChat:      { en: 'Start DharmaChat →',             hi: 'DharmaChat शुरू करें →' },
  streak:         { en: 'Day Streak',                     hi: 'दिन की Streak' },
  pts:            { en: 'pts',                            hi: 'pts' },
  howPoints:      { en: '⚡ How to earn points?',         hi: '⚡ Points कैसे मिलते हैं?' },
  quickActions:   { en: 'Quick Actions',                  hi: 'Quick Actions' },
  todayShloka:    { en: "📖 TODAY'S VERSE",               hi: '📖 आज का श्लोक' },
  understandChat: { en: 'Understand in DharmaChat →',     hi: 'DharmaChat में समझें →' },
  viralLies:      { en: '🔥 Viral Lies — Know the Truth', hi: '🔥 Viral झूठ — अब उठे सच' },
  knowTruth:      { en: 'Know truth →',                   hi: 'सच जानें →' },
  myBadges:       { en: 'Your Badges',                    hi: 'आपके Badges' },
  factCheck:      { en: 'Fact Check',                     hi: 'Fact Check' },
  factCheckSub:   { en: 'Verify any claim',               hi: 'कोई भी claim verify करें' },
  myKundli:       { en: 'My Kundli',                      hi: 'मेरी कुंडली' },
  myKundliSub:    { en: 'Jyotish chart & guidance',       hi: 'ज्योतिष कुंडली और मार्गदर्शन' },
  mantraLib:      { en: 'Mantra Library',                 hi: 'मंत्र पुस्तकालय' },
  mantraLibSub:   { en: '50+ sacred mantras',             hi: '50+ प्रामाणिक मंत्र' },
  savedAnswers:   { en: 'Saved Answers',                  hi: 'Saved Answers' },
  savedAnswersSub:{ en: 'Your saved library',             hi: 'आपकी saved library' },
  noSaved:        { en: 'No saved answers yet.\nTap 🔖 in DharmaChat.', hi: 'अभी कोई saved answer नहीं।\nDharmaChat में 🔖 tap करें।' },
  delete:         { en: 'Delete',                         hi: 'हटाएं' },
  logout:         { en: 'Logout',                         hi: 'Logout' },
  cancel:         { en: 'Cancel',                         hi: 'रद्द करें' },
};
function t(key, lang) { return T[key]?.[lang === 'hindi' ? 'hi' : 'en'] || T[key]?.en || key; }

// ════════════════════════════════════════════════════════
// HINDU CALENDAR — festivals and Ekadashi
// ════════════════════════════════════════════════════════
const FESTIVALS_2025_2026 = [
  { date:'2025-04-14', name:'Ram Navami', deity:'Ram' },
  { date:'2025-04-23', name:'Hanuman Jayanti', deity:'Hanuman' },
  { date:'2025-05-12', name:'Buddha Purnima', deity:'Universal' },
  { date:'2025-07-10', name:'Guru Purnima', deity:'Guru' },
  { date:'2025-08-16', name:'Raksha Bandhan', deity:'Vishnu' },
  { date:'2025-08-27', name:'Janmashtami', deity:'Krishna' },
  { date:'2025-09-02', name:'Ganesh Chaturthi', deity:'Ganesh' },
  { date:'2025-10-02', name:'Navratri Begins', deity:'Durga' },
  { date:'2025-10-12', name:'Dussehra', deity:'Ram' },
  { date:'2025-10-20', name:'Karwa Chauth', deity:'Shiva' },
  { date:'2025-11-01', name:'Dhanteras', deity:'Lakshmi' },
  { date:'2025-11-03', name:'Diwali', deity:'Lakshmi' },
  { date:'2025-11-05', name:'Bhai Dooj', deity:'Yama' },
  { date:'2026-01-14', name:'Makar Sankranti', deity:'Surya' },
  { date:'2026-02-26', name:'Maha Shivaratri', deity:'Shiva' },
  { date:'2026-03-19', name:'Holi', deity:'Krishna' },
  { date:'2026-03-30', name:'Gudi Padwa / Ugadi', deity:'Brahma' },
  { date:'2026-04-03', name:'Ram Navami', deity:'Ram' },
  { date:'2026-04-10', name:'Hanuman Jayanti', deity:'Hanuman' },
  // Akshaya Tritiya — April 19, 2026 (today — very auspicious)
  { date:'2026-04-19', name:'Akshaya Tritiya', deity:'Vishnu' },
  { date:'2026-05-04', name:'Buddha Purnima', deity:'Universal' },
  { date:'2026-06-24', name:'Guru Purnima', deity:'Guru' },
  { date:'2026-07-02', name:'Rath Yatra', deity:'Jagannath' },
  { date:'2026-08-05', name:'Raksha Bandhan', deity:'Vishnu' },
  { date:'2026-08-14', name:'Janmashtami', deity:'Krishna' },
  { date:'2026-08-22', name:'Ganesh Chaturthi', deity:'Ganesh' },
  { date:'2026-10-07', name:'Navratri Begins', deity:'Durga' },
  { date:'2026-10-15', name:'Dussehra', deity:'Ram' },
  { date:'2026-11-08', name:'Diwali', deity:'Lakshmi' },
];

const EKADASHI_2025_2026 = [
  { date:'2025-04-16', name:'Varuthini Ekadashi' },
  { date:'2025-05-01', name:'Mohini Ekadashi' },
  { date:'2025-05-15', name:'Apara Ekadashi' },
  { date:'2025-05-31', name:'Nirjala Ekadashi' },
  { date:'2025-06-14', name:'Yogini Ekadashi' },
  { date:'2025-06-30', name:'Devshayani Ekadashi' },
  { date:'2025-07-14', name:'Kamika Ekadashi' },
  { date:'2025-07-29', name:'Shravana Putrada' },
  { date:'2025-08-13', name:'Aja Ekadashi' },
  { date:'2025-08-28', name:'Parsva Ekadashi' },
  { date:'2025-09-11', name:'Indira Ekadashi' },
  { date:'2025-09-27', name:'Papankusha Ekadashi' },
  { date:'2025-10-11', name:'Rama Ekadashi' },
  { date:'2025-10-26', name:'Devutthana Ekadashi' },
  { date:'2025-11-09', name:'Utpanna Ekadashi' },
  { date:'2025-11-25', name:'Mokshada Ekadashi' },
  { date:'2025-12-09', name:'Saphala Ekadashi' },
  { date:'2025-12-24', name:'Putrada Ekadashi' },
  { date:'2026-01-08', name:'Shattila Ekadashi' },
  { date:'2026-01-23', name:'Jaya Ekadashi' },
  { date:'2026-02-07', name:'Vijaya Ekadashi' },
  { date:'2026-02-21', name:'Amalaki Ekadashi' },
  { date:'2026-03-08', name:'Papmochani Ekadashi' },
  { date:'2026-03-23', name:'Kamada Ekadashi' },
  { date:'2026-04-07', name:'Varuthini Ekadashi' },
  { date:'2026-04-22', name:'Mohini Ekadashi' },
  { date:'2026-05-06', name:'Apara Ekadashi' },
  { date:'2026-05-22', name:'Nirjala Ekadashi' },
  { date:'2026-06-04', name:'Yogini Ekadashi' },
  { date:'2026-06-20', name:'Devshayani Ekadashi' },
  { date:'2026-07-04', name:'Kamika Ekadashi' },
  { date:'2026-07-19', name:'Shravana Putrada' },
  { date:'2026-08-03', name:'Aja Ekadashi' },
  { date:'2026-08-17', name:'Parsva Ekadashi' },
  { date:'2026-09-01', name:'Indira Ekadashi' },
  { date:'2026-09-16', name:'Papankusha Ekadashi' },
  { date:'2026-10-01', name:'Rama Ekadashi' },
  { date:'2026-10-16', name:'Devutthana Ekadashi' },
  { date:'2026-10-31', name:'Utpanna Ekadashi' },
  { date:'2026-11-14', name:'Mokshada Ekadashi' },
  { date:'2026-11-30', name:'Saphala Ekadashi' },
  { date:'2026-12-14', name:'Putrada Ekadashi' },
];

// ════════════════════════════════════════════════════════
// JYOTISH DATA
// ════════════════════════════════════════════════════════
const RASHI_LORDS = {
  'Mesh':'Mangal (Mars)','Vrishabh':'Shukra (Venus)','Mithun':'Budh (Mercury)',
  'Kark':'Chandra (Moon)','Simha':'Surya (Sun)','Kanya':'Budh (Mercury)',
  'Tula':'Shukra (Venus)','Vrishchik':'Mangal (Mars)','Dhanu':'Guru (Jupiter)',
  'Makar':'Shani (Saturn)','Kumbh':'Shani (Saturn)','Meen':'Guru (Jupiter)'
};

const RASHI_SYMBOL = {
  'Mesh':'♈','Vrishabh':'♉','Mithun':'♊','Kark':'♋',
  'Simha':'♌','Kanya':'♍','Tula':'♎','Vrishchik':'♏',
  'Dhanu':'♐','Makar':'♑','Kumbh':'♒','Meen':'♓'
};

const RASHI_ENG = {
  'Mesh':'Aries','Vrishabh':'Taurus','Mithun':'Gemini','Kark':'Cancer',
  'Simha':'Leo','Kanya':'Virgo','Tula':'Libra','Vrishchik':'Scorpio',
  'Dhanu':'Sagittarius','Makar':'Capricorn','Kumbh':'Aquarius','Meen':'Pisces'
};

const RASHI_NAMES_LIST = ['','Mesh','Vrishabh','Mithun','Kark','Simha','Kanya','Tula','Vrishchik','Dhanu','Makar','Kumbh','Meen'];

const RASHI_MAP = {
  'Mesh':1,'Vrishabh':2,'Mithun':3,'Kark':4,'Simha':5,'Kanya':6,
  'Tula':7,'Vrishchik':8,'Dhanu':9,'Makar':10,'Kumbh':11,'Meen':12
};

const KI = {
  Mesh:     { p_hi:'ऊर्जावान, साहसी, जन्मजात नेता। मंगल दृढ़ संकल्प देता है। पहले कार्य, बाद में सोचना।', p_en:'Energetic, courageous, born leader. Mars gives fierce determination. Act first, think later.', c_hi:'नेतृत्व, सेना, खेल, सर्जरी, उद्यमिता।', c_en:'Leadership, military, sports, surgery, entrepreneurship.', h_hi:'सिर, रक्तचाप, बुखार का ध्यान। नियमित व्यायाम आवश्यक।', h_en:'Watch head, blood pressure, fever. Regular exercise essential.', r_hi:'मंगलवार हनुमान मंदिर। "ॐ अं अंगारकाय नमः" 108 बार। लाल मूंगा।', r_en:'Hanuman temple every Tuesday. Chant "ॐ अं अंगारकाय नमः" 108 times. Red coral.', pred_hi:'2025–2027: करियर में बड़ा बदलाव। 2028–2031: Golden Period — पैसा, promotion, property। 2032+: Leadership role।', pred_en:'2025–2027: Career change. 2028–2031: Golden Period — money, promotion, property. 2032+: Leadership role.' },
  Vrishabh: { p_hi:'धैर्यशील, कला-प्रेमी, विश्वसनीय। शुक्र सौंदर्य और सुख देता है। जिद्दी स्वभाव।', p_en:'Patient, artistic, reliable. Venus brings beauty and comfort. Stubborn nature.', c_hi:'वित्त, कला, संगीत, रियल एस्टेट, कृषि।', c_en:'Finance, arts, music, real estate, agriculture.', h_hi:'गला, थायरॉइड, वजन का ध्यान। हल्का व्यायाम।', h_en:'Watch throat, thyroid, weight. Light exercise.', r_hi:'शुक्रवार लक्ष्मी पूजा। "ॐ शुं शुक्राय नमः"। सफेद फूल।', r_en:'Friday Lakshmi puja. Chant "ॐ शुं शुक्राय नमः". White flowers.', pred_hi:'2025–2027: स्थिरता। 2028–2032: Property, investment में profit। 2033+: Recognition।', pred_en:'2025–2027: Stability. 2028–2032: Property, investment profit. 2033+: Recognition.' },
  Mithun:   { p_hi:'बुद्धिमान, जिज्ञासु, communicator। बुध तीव्र बुद्धि देता है। Overthinking weakness।', p_en:'Intelligent, curious, communicative. Mercury brings quick wit. Overthinking is weakness.', c_hi:'लेखन, IT, पत्रकारिता, शिक्षण, विपणन।', c_en:'Writing, IT, journalism, teaching, marketing.', h_hi:'तंत्रिका तंत्र, फेफड़े। तनाव से बचें।', h_en:'Watch nervous system and lungs. Avoid stress.', r_hi:'बुधवार गणेश पूजा। "ॐ बुं बुधाय नमः"। हरे वस्त्र।', r_en:'Wednesday Ganesh puja. Chant "ॐ बुं बुधाय नमः". Green clothes.', pred_hi:'2025–2026: Education/skills। 2027–2030: Career boom, multiple income। 2031+: Teaching, recognition।', pred_en:'2025–2026: Education/skills. 2027–2030: Career boom, multiple income. 2031+: Teaching role.' },
  Kark:     { p_hi:'अंतर्ज्ञानी, भावुक, देखभाल करने वाले। चंद्रमा परिवार से जोड़ता है। Mood swings।', p_en:'Intuitive, emotional, caring. Moon deeply connects to family. Mood swings.', c_hi:'स्वास्थ्य, आतिथ्य, रियल एस्टेट, शिक्षण।', c_en:'Healthcare, hospitality, real estate, teaching.', h_hi:'छाती, पेट का ध्यान। Emotional eating से बचें।', h_en:'Watch chest and stomach. Avoid stress eating.', r_hi:'सोमवार शिव पूजा। दूध अर्पण। मोती धारण।', r_en:'Monday Shiva puja. Offer milk. Wear pearl.', pred_hi:'2025–2027: Family, property। 2028–2031: Business success। 2032+: Spiritual growth।', pred_en:'2025–2027: Family, property. 2028–2031: Business success. 2032+: Spiritual growth.' },
  Simha:    { p_hi:'शाही, करिश्माई, जन्मजात नेता। सूर्य अधिकार देता है। अभिमान कमज़ोरी हो सकती है।', p_en:'Royal, charismatic, natural leader. Sun gives authority and pride. Ego can be weakness.', c_hi:'सरकार, राजनीति, management, मनोरंजन, चिकित्सा।', c_en:'Government, politics, management, entertainment, medicine.', h_hi:'हृदय और रीढ़ संवेदनशील। अत्यधिक तनाव से बचें।', h_en:'Heart and spine vulnerable. Avoid excess stress.', r_hi:'रविवार पूर्व दिशा में सूर्य पूजा। "ॐ घृणि सूर्याय नमः"। माणिक।', r_en:'Sunday Surya prayer facing east. Chant "ॐ घृणि सूर्याय नमः". Ruby gemstone.', pred_hi:'2025–2027: Leadership opportunities। 2028–2032: Golden Period — fame, government position। 2033+: Legacy।', pred_en:'2025–2027: Leadership opportunities. 2028–2032: Golden Period — fame, position. 2033+: Legacy.' },
  Kanya:    { p_hi:'विश्लेषणात्मक, सटीक, perfectionist। बुध का प्रभाव। Overthinking और self-criticism weakness।', p_en:'Analytical, precise, perfectionist. Mercury sharp mind. Overthinking and self-criticism weakness.', c_hi:'चिकित्सा, शोध, लेखन, accounting, data analysis।', c_en:'Medicine, research, writing, accounting, data analysis.', h_hi:'पाचन और आंतों का ध्यान। नियमित सात्विक भोजन।', h_en:'Watch digestion and intestines. Regular clean diet.', r_hi:'बुधवार सरस्वती पूजा। "ॐ बुं बुधाय नमः"। पन्ना।', r_en:'Wednesday Saraswati puja. Chant "ॐ बुं बुधाय नमः". Emerald.', pred_hi:'2025–2027: Skills upgrade। 2028–2031: Career peak, expert status। 2032+: Permanent recognition।', pred_en:'2025–2027: Skills upgrade. 2028–2031: Career peak, expert status. 2032+: Recognition.' },
  Tula:     { p_hi:'कूटनीतिक, आकर्षक, fair-minded। शुक्र संतुलन देता है। निर्णय लेने में कठिनाई।', p_en:'Diplomatic, charming, fair-minded. Venus brings balance. Indecisive at times.', c_hi:'कानून, कूटनीति, कला, fashion, HR।', c_en:'Law, diplomacy, arts, fashion, HR.', h_hi:'गुर्दे और कमर का ध्यान। भरपूर पानी पिएं।', h_en:'Watch kidneys and lower back. Stay well hydrated.', r_hi:'शुक्रवार लक्ष्मी पूजा। "ॐ शुं शुक्राय नमः"। हीरा।', r_en:'Friday Lakshmi puja. Chant "ॐ शुं शुक्राय नमः". Diamond.', pred_hi:'2025–2026: Relationships में success। 2028–2031: Financial growth, partnership profit। 2032+: Social recognition।', pred_en:'2025–2026: Relationship success. 2028–2031: Financial growth, partnership profit. 2032+: Social recognition.' },
  Vrishchik:{ p_hi:'तीव्र, रहस्यमय, transformative। मंगल/केतु। गहरा शोध, निडर। Jealousy weakness।', p_en:'Intense, mysterious, transformative. Mars/Ketu gives deep research ability. Jealousy weakness.', c_hi:'शोध, सर्जरी, खुफिया, मनोविज्ञान, occult।', c_en:'Research, surgery, intelligence, psychology, occult.', h_hi:'प्रजनन अंग, मूत्राशय। Emotional balance ज़रूरी।', h_en:'Watch reproductive organs, bladder. Emotional balance essential.', r_hi:'मंगलवार हनुमान/काली पूजा। "ॐ कां कालिकायै नमः"। लाल मूंगा।', r_en:'Tuesday Hanuman/Kali worship. Chant "ॐ कां कालिकायै नमः". Red coral.', pred_hi:'2025–2027: Transformation period। 2028–2031: Hidden talents emerge, power positions। 2032+: Deep wisdom।', pred_en:'2025–2027: Transformation period. 2028–2031: Hidden talents emerge, power. 2032+: Deep wisdom.' },
  Dhanu:    { p_hi:'आशावादी, दार्शनिक, साहसी। गुरु ज्ञान और भाग्य देता है। अति आशावाद weakness।', p_en:'Optimistic, philosophical, adventurous. Jupiter brings wisdom and luck. Over-optimism weakness.', c_hi:'शिक्षण, कानून, दर्शन, यात्रा, publishing।', c_en:'Teaching, law, philosophy, travel, publishing.', h_hi:'कूल्हे, जांघें, यकृत का ध्यान। Overindulgence से बचें।', h_en:'Watch hips, thighs, liver. Avoid overindulgence.', r_hi:'गुरुवार विष्णु पूजा। पीले वस्त्र। "ॐ बृं बृहस्पतये नमः"। पुखराज।', r_en:'Thursday Vishnu worship. Yellow clothes. Chant "ॐ बृं बृहस्पतये नमः". Yellow topaz.', pred_hi:'2025–2027: Higher education, foreign connections। 2028–2031: International success। 2032+: Global recognition।', pred_en:'2025–2027: Higher education, foreign connections. 2028–2031: International success. 2032+: Global recognition.' },
  Makar:    { p_hi:'अनुशासित, महत्वाकांक्षी, practical। शनि परिश्रम और देर से पुरस्कार देता है।', p_en:'Disciplined, ambitious, practical. Saturn brings hard work and delayed but sure rewards.', c_hi:'Engineering, business, सरकार, finance, administration।', c_en:'Engineering, business, government, finance, administration.', h_hi:'घुटने, हड्डियाँ, त्वचा का ध्यान। नियमित आराम लें।', h_en:'Watch knees, bones, skin. Regular rest needed.', r_hi:'शनिवार तेल चढ़ाकर शनि पूजा। "ॐ शं शनैश्चराय नमः"। नीलम (सोच-समझकर)।', r_en:'Saturday Shani worship with sesame oil. Chant "ॐ शं शनैश्चराय नमः". Blue sapphire (consult first).', pred_hi:'2025–2027: Foundation building, patience। 2028–2032: Career peak, authority। 2033+: Elder statesman।', pred_en:'2025–2027: Foundation building, patience. 2028–2032: Career peak, authority. 2033+: Elder statesman.' },
  Kumbh:    { p_hi:'नवोन्मेषी, मानवतावादी, independent। शनि/राहु अनोखी सोच देता है। Detachment weakness।', p_en:'Innovative, humanitarian, independent. Saturn/Rahu brings unique thinking. Detachment weakness.', c_hi:'Technology, समाज सेवा, शोध, astrology, NGO।', c_en:'Technology, social work, research, astrology, NGO.', h_hi:'पैर, टखने, circulation का ध्यान। गर्म रहें।', h_en:'Watch calves, ankles, circulation. Stay warm.', r_hi:'शनिवार शिव पूजा। गरीबों को दान। "ॐ नमः शिवाय"।', r_en:'Saturday Shiva worship. Donate to needy. Chant "ॐ नमः शिवाय".', pred_hi:'2025–2027: Innovation, tech success। 2028–2031: Community leadership। 2032+: Visionary recognition।', pred_en:'2025–2027: Innovation, tech success. 2028–2031: Community leadership. 2032+: Visionary recognition.' },
  Meen:     { p_hi:'करुणामय, अंतर्ज्ञानी, spiritual। गुरु/केतु गहरी बुद्धि। Over-idealism weakness।', p_en:'Compassionate, intuitive, spiritual. Jupiter/Ketu brings deep wisdom. Over-idealism weakness.', c_hi:'आध्यात्मिकता, चिकित्सा, कला, counseling, healing।', c_en:'Spirituality, medicine, arts, counseling, healing.', h_hi:'पैर और immune system का ध्यान। मदिरा से परहेज़।', h_en:'Watch feet and immune system. Avoid alcohol.', r_hi:'गुरुवार विष्णु पूजा। पीले वस्त्र। "ॐ नमो भगवते वासुदेवाय"। पुखराज।', r_en:'Thursday Vishnu worship. Yellow clothes. Chant "ॐ नमो भगवते वासुदेवाय". Yellow topaz.', pred_hi:'2025–2027: Spiritual awakening, creative breakthrough। 2028–2031: Healing/art में recognition। 2032+: Moksha path।', pred_en:'2025–2027: Spiritual awakening, creative breakthrough. 2028–2031: Recognition in healing/art. 2032+: Moksha path.' },
};

function getInsight(rashi, lang) {
  const d = KI[rashi];
  const isH = lang === 'hindi';
  if (!d) return { personality:'', career:'', health:'', remedy:'', prediction:'' };
  return { personality:isH?d.p_hi:d.p_en, career:isH?d.c_hi:d.c_en, health:isH?d.h_hi:d.h_en, remedy:isH?d.r_hi:d.r_en, prediction:isH?d.pred_hi:d.pred_en };
}

// ════════════════════════════════════════════════════════
// VERSES
// ════════════════════════════════════════════════════════
const VERSES_EN = [
  { t:'"Do your duty without attachment to results."', s:'Bhagavad Gita 2.47', q:'Explain the meaning of Bhagavad Gita 2.47 — Karmanyevadhikaraste — in detail with context and practical lesson for today.' },
  { t:'"The soul is never born, nor does it ever die."', s:'Bhagavad Gita 2.20', q:'Explain Bhagavad Gita 2.20 — the soul is eternal, never born, never dies. What is the full meaning and lesson?' },
  { t:'"Truth alone triumphs, not falsehood."', s:'Mundaka Upanishad 3.1.6', q:'What is the meaning of Satyameva Jayate from Mundaka Upanishad 3.1.6? Explain the full context and lesson.' },
  { t:'"The entire world is one family."', s:'Maha Upanishad 6.71', q:'Explain Vasudhaiva Kutumbakam from Maha Upanishad 6.71. What does it mean and how is it relevant today?' },
  { t:'"Non-violence is the highest duty."', s:'Mahabharata 115.1', q:'What does Ahimsa Paramo Dharma mean from Mahabharata? Explain the complete shloka and meaning.' },
  { t:'"Whenever righteousness declines, I manifest myself."', s:'Bhagavad Gita 4.7', q:'Explain Yada Yada Hi Dharmasya from Bhagavad Gita 4.7. What is Krishna saying and what is the deeper meaning?' },
  { t:'"May noble thoughts come from every direction."', s:'Rigveda 1.89.1', q:'Explain Aa No Bhadra Kratavo Yantu Vishwatah from Rigveda 1.89.1. What is this prayer and what does it teach?' },
];
const VERSES_HI = [
  { t:'"कर्म करो, फल की चिंता मत करो।"', s:'भगवद्गीता 2.47', q:'भगवद्गीता 2.47 — कर्मण्येवाधिकारस्ते का पूरा अर्थ, संदर्भ और आज के लिए शिक्षा हिंदी में विस्तार से बताएं।' },
  { t:'"आत्मा कभी जन्म नहीं लेती, कभी मरती नहीं।"', s:'भगवद्गीता 2.20', q:'भगवद्गीता 2.20 — आत्मा अजर अमर है, इसका पूरा अर्थ, संदर्भ और शिक्षा हिंदी में बताएं।' },
  { t:'"सत्यमेव जयते — सत्य ही जीतता है।"', s:'मुंडक उपनिषद् 3.1.6', q:'मुंडक उपनिषद् 3.1.6 — सत्यमेव जयते का पूरा अर्थ, संदर्भ और शिक्षा हिंदी में बताएं।' },
  { t:'"वसुधैव कुटुम्बकम् — पूरा विश्व एक परिवार।"', s:'महा उपनिषद् 6.71', q:'महा उपनिषद् 6.71 — वसुधैव कुटुम्बकम् का अर्थ और आज के संदर्भ में महत्व हिंदी में बताएं।' },
  { t:'"अहिंसा परमो धर्मः — अहिंसा सर्वोच्च धर्म।"', s:'महाभारत 115.1', q:'महाभारत — अहिंसा परमो धर्म: का पूरा श्लोक और अर्थ हिंदी में विस्तार से बताएं।' },
  { t:'"यदा यदा हि धर्मस्य — धर्म की रक्षा के लिए मैं आता हूँ।"', s:'भगवद्गीता 4.7', q:'भगवद्गीता 4.7 — यदा यदा हि धर्मस्य का पूरा श्लोक, अर्थ और संदेश हिंदी में बताएं।' },
  { t:'"आ नो भद्राः — सभी दिशाओं से शुभ विचार आएं।"', s:'ऋग्वेद 1.89.1', q:'ऋग्वेद 1.89.1 — आ नो भद्राः का अर्थ, संदर्भ और शिक्षा हिंदी में विस्तार से बताएं।' },
];

// ════════════════════════════════════════════════════════
// VIRAL JHOOT
// ════════════════════════════════════════════════════════
const TRENDING_EN = [
  { q:'Is the Bheel community not Hindu?', v:'FALSE', c:'#C0392B', chatQ:'Fact Check: Is the claim "Bheel community is not Hindu" true or false? Prove with scriptures — King Guha in Ramayana, Bhil tribe history, and Sanatan Dharma connection.', fc:true },
  { q:'Aryan Invasion Theory — Is it true?', v:'FALSE', c:'#C0392B', chatQ:'Fact Check: Is Aryan Invasion Theory true? Explain with Rakhigarhi DNA 2019 study, archeological proof, and why it was created.', fc:true },
  { q:'Did Ram kill Shambuka due to caste?', v:'FALSE', c:'#C0392B', chatQ:'Fact Check: Did Ram kill Shambuka because of his caste? What really happened per Valmiki Ramayana Uttara Kanda? Did Shambuka get moksha?', fc:true },
  { q:'Is there scientific basis for chanting Om?', v:'TRUE', c:'#27AE60', chatQ:'What is the scientific basis for chanting Om? Explain sound frequency, brain waves, and research from IIT and Harvard that proves the power of Om chanting.', fc:false },
];
const TRENDING_HI = [
  { q:'क्या भील समुदाय हिंदू नहीं है?', v:'झूठ', c:'#C0392B', chatQ:'Fact Check: क्या भील समुदाय हिंदू नहीं है — यह claim सच है या झूठ? शास्त्रों से प्रमाण दें। रामायण में राजा गुह (भील) का संदर्भ और सनातन धर्म से संबंध।', fc:true },
  { q:'आर्य आक्रमण सिद्धांत — क्या यह सच है?', v:'झूठ', c:'#C0392B', chatQ:'Fact Check: क्या आर्य आक्रमण सिद्धांत (Aryan Invasion Theory) सच है? राखीगढ़ी DNA 2019 शोध और पुरातात्विक प्रमाण से विस्तार से बताएं।', fc:true },
  { q:'राम ने जाति के कारण शम्बूक को मारा?', v:'झूठ', c:'#C0392B', chatQ:'Fact Check: क्या राम ने शम्बूक को जाति के कारण मारा? वाल्मीकि रामायण उत्तरकाण्ड के अनुसार सच्चाई बताएं। क्या शम्बूक को मोक्ष मिला?', fc:true },
  { q:'ओम जप का वैज्ञानिक आधार है?', v:'सच', c:'#27AE60', chatQ:'ओम जप का वैज्ञानिक आधार क्या है? ध्वनि आवृत्ति, मस्तिष्क तरंगें और IIT-Harvard शोध से ओम जप की शक्ति सिद्ध करें।', fc:false },
];

// ════════════════════════════════════════════════════════
// MANTRAS (50+)
// ════════════════════════════════════════════════════════
const MANTRAS = [
  { id:'1', sanskrit:'ॐ नमः शिवाय', name:'Om Namah Shivaya', deity:'Shiva', category:'Shiva', meaning_hi:'मैं भगवान शिव को प्रणाम — सभी में शुद्ध चेतना।', when_hi:'प्रतिदिन। सोमवार और प्रदोष काल विशेष।', how_hi:'उत्तर/पूर्व मुख। सफेद वस्त्र। रुद्राक्ष माला। मांस वर्जित।', count:'108', source:'Shri Rudrashtadhyayi' },
  { id:'2', sanskrit:'ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम्...', name:'Mahamrityunjaya Mantra', deity:'Shiva', category:'Shiva', meaning_hi:'त्रिनेत्र शिव की पूजा। मृत्यु से मुक्ति के लिए।', when_hi:'सूर्योदय से पहले। बीमारी, खतरे, सोमवार, श्रावण।', how_hi:'पूर्व मुख। कुश आसन। सफेद वस्त्र। मांस-मदिरा वर्जित।', count:'108', source:'Rigveda 7.59.12' },
  { id:'3', sanskrit:'ॐ नमो भगवते वासुदेवाय', name:'Om Namo Bhagavate Vasudevaya', deity:'Vishnu/Krishna', category:'Vishnu', meaning_hi:'भगवान वासुदेव — कृष्ण को प्रणाम।', when_hi:'स्नान के बाद सुबह। गुरुवार और एकादशी।', how_hi:'पूर्व/उत्तर मुख। तुलसी माला। पीले वस्त्र।', count:'108', source:'Vishnu Purana' },
  { id:'4', sanskrit:'हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे। हरे राम हरे राम राम राम हरे हरे।', name:'Hare Krishna Maha Mantra', deity:'Krishna', category:'Vishnu', meaning_hi:'हे कृष्ण, हे राम — भक्ति में लगाएं, माया से मुक्त करें।', when_hi:'कभी भी, कहीं भी। ब्रह्म मुहूर्त में सबसे शक्तिशाली।', how_hi:'कोई प्रतिबंध नहीं। तुलसी माला उत्तम।', count:'108 माला minimum', source:'Kali Santarana Upanishad' },
  { id:'5', sanskrit:'श्री राम जय राम जय जय राम', name:'Shri Ram Jaya Ram', deity:'Ram', category:'Ram', meaning_hi:'श्री राम की जय!', when_hi:'प्रतिदिन सुबह-शाम। रविवार और रामनवमी।', how_hi:'पूर्व मुख। केसरिया/सफेद वस्त्र। मांस वर्जित।', count:'108 से 1008', source:'Valmiki Ramayana' },
  { id:'6', sanskrit:'ॐ हनुमते नमः', name:'Om Hanumate Namah', deity:'Hanuman', category:'Hanuman', meaning_hi:'भगवान हनुमान को प्रणाम।', when_hi:'मंगलवार और शनिवार विशेष।', how_hi:'कड़ा नियम: मंगल/शनि को मांस, अंडा, मदिरा नहीं। लाल वस्त्र।', count:'108 से 1008', source:'Hanuman Chalisa' },
  { id:'7', sanskrit:'ॐ गं गणपतये नमः', name:'Om Gam Ganapataye Namah', deity:'Ganesh', category:'Ganesh', meaning_hi:'भगवान गणेश को प्रणाम — बाधाओं के हर्ता।', when_hi:'किसी भी नए काम से पहले। बुधवार।', how_hi:'उत्तर/पूर्व मुख। हरे/लाल वस्त्र। दूर्वा। मोदक।', count:'108', source:'Ganapati Atharva Sheersham' },
  { id:'8', sanskrit:'वक्रतुण्ड महाकाय सूर्यकोटिसमप्रभ। निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा।', name:'Vakratunda Mahakaya', deity:'Ganesh', category:'Ganesh', meaning_hi:'गणेश — मेरे सभी कार्य निर्विघ्न करें।', when_hi:'किसी भी काम से पहले। कोई भी समय।', how_hi:'कोई कड़े नियम नहीं।', count:'1-3 times', source:'Traditional' },
  { id:'9', sanskrit:'ॐ ऐं सरस्वत्यै नमः', name:'Om Aim Saraswatyai Namah', deity:'Saraswati', category:'Saraswati', meaning_hi:'माँ सरस्वती को प्रणाम।', when_hi:'पढ़ाई, परीक्षा से पहले, सुबह।', how_hi:'पूर्व मुख। सफेद वस्त्र। सफेद फूल। सात्विक भोजन।', count:'108', source:'Saraswati Vandana' },
  { id:'10', sanskrit:'ॐ श्रीं महालक्ष्म्यै नमः', name:'Om Shreem Mahalakshmyai Namah', deity:'Lakshmi', category:'Lakshmi', meaning_hi:'महालक्ष्मी को प्रणाम।', when_hi:'शुक्रवार, दीवाली। सूर्यास्त के बाद, उत्तर दिशा।', how_hi:'उत्तर/पूर्व मुख। गुलाबी/सफेद वस्त्र। कमल/गेंदे के फूल।', count:'108', source:'Sri Suktam, Rigveda' },
  { id:'11', sanskrit:'ॐ दुं दुर्गायै नमः', name:'Om Dum Durgayai Namah', deity:'Durga', category:'Durga', meaning_hi:'माँ दुर्गा को प्रणाम।', when_hi:'नवरात्रि, मंगलवार और शुक्रवार। भय या संकट में।', how_hi:'पूर्व मुख। लाल वस्त्र। नवरात्रि में मांस/मदिरा कड़ाई से वर्जित।', count:'108 से 1008', source:'Devi Mahatmyam' },
  { id:'12', sanskrit:'या देवी सर्वभूतेषु शक्तिरूपेण संस्थिता। नमस्तस्यै नमस्तस्यै नमस्तस्यै नमो नमः।', name:'Ya Devi Sarvabhuteshu', deity:'Devi', category:'Durga', meaning_hi:'सभी प्राणियों में शक्ति रूप देवी को नमन।', when_hi:'नवरात्रि, सुरक्षा के लिए।', how_hi:'लाल/नारंगी वस्त्र।', count:'3, 9, या 108', source:'Devi Mahatmyam 5.12' },
  { id:'13', sanskrit:'ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात्', name:'Gayatri Mantra', deity:'Surya/Universal', category:'Universal', meaning_hi:'सूर्य के दिव्य प्रकाश पर ध्यान — बुद्धि प्रेरित करे।', when_hi:'सूर्योदय, दोपहर, सूर्यास्त। ब्रह्म मुहूर्त (4-6 बजे) में सबसे शक्तिशाली।', how_hi:'कड़े नियम: सूर्योदय पर पूर्व मुख। कुश आसन। सफेद वस्त्र। सूर्यास्त के बाद नहीं।', count:'108 minimum', source:'Rigveda 3.62.10' },
  { id:'14', sanskrit:'ॐ घृणि सूर्याय नमः', name:'Om Ghrini Suryaya Namah', deity:'Surya Dev', category:'Surya', meaning_hi:'तेजस्वी सूर्य देव को प्रणाम।', when_hi:'सूर्योदय पर, पूर्व दिशा में। रविवार।', how_hi:'पूर्व मुख। सूर्य को अर्घ्य दें। तांबे का पात्र।', count:'12 या 108', source:'Aditya Hridayam' },
  { id:'15', sanskrit:'ॐ शं शनैश्चराय नमः', name:'Om Shan Shanaishcharaya Namah', deity:'Shani Dev', category:'Navagraha', meaning_hi:'भगवान शनि को नमन — कर्म, न्याय का ग्रह।', when_hi:'शनिवार सूर्यास्त पर। शनि महादशा में।', how_hi:'पश्चिम मुख। काले वस्त्र। तिल का तेल दीपक।', count:'108', source:'Navagraha Stotra' },
  { id:'16', sanskrit:'सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः।', name:'Sarve Bhavantu Sukhinah', deity:'Universal', category:'Universal', meaning_hi:'सभी सुखी हों, सभी रोगमुक्त हों।', when_hi:'प्रतिदिन सुबह की प्रार्थना।', how_hi:'कोई कड़े नियम नहीं।', count:'3 या 11', source:'Brihadaranyaka Upanishad' },
  { id:'17', sanskrit:'असतो मा सद्गमय। तमसो मा ज्योतिर्गमय। मृत्योर्मा अमृतं गमय।', name:'Asato Ma Sadgamaya', deity:'Universal', category:'Universal', meaning_hi:'असत्य से सत्य, अंधकार से प्रकाश की ओर ले जाओ।', when_hi:'प्रातः प्रार्थना। ध्यान से पहले।', how_hi:'शांत मन।', count:'3 times', source:'Brihadaranyaka Upanishad 1.3.28' },
  { id:'18', sanskrit:'गुरुर्ब्रह्मा गुरुर्विष्णुः गुरुर्देवो महेश्वरः।', name:'Guru Mantra', deity:'Guru', category:'Universal', meaning_hi:'गुरु ब्रह्मा, विष्णु, महेश्वर हैं। गुरु साक्षात् परब्रह्म हैं।', when_hi:'किसी भी अध्ययन से पहले। गुरु पूर्णिमा।', how_hi:'सिर झुकाएं।', count:'3 या 108', source:'Guru Gita' },
  { id:'19', sanskrit:'ॐ नमो नारायणाय', name:'Om Namo Narayanaya', deity:'Vishnu', category:'Vishnu', meaning_hi:'भगवान नारायण की शरण।', when_hi:'प्रातः पूजा। एकादशी।', how_hi:'पूर्व/उत्तर मुख। पीले वस्त्र। तुलसी माला।', count:'108', source:'Vishnu Sahasranama' },
  { id:'20', sanskrit:'ॐ राम रामाय नमः', name:'Om Ram Ramaya Namah', deity:'Ram', category:'Ram', meaning_hi:'भगवान राम को प्रणाम — धर्म के अवतार।', when_hi:'प्रातःकालीन पूजा। रविवार।', how_hi:'पूर्व मुख। सफेद/केसरिया वस्त्र।', count:'108', source:'Valmiki Ramayana' },
  { id:'21', sanskrit:'ॐ तत्पुरुषाय विद्महे महादेवाय धीमहि तन्नो रुद्रः प्रचोदयात्', name:'Shiva Gayatri Mantra', deity:'Shiva', category:'Shiva', meaning_hi:'महादेव शिव की Gayatri शैली में उपासना।', when_hi:'सोमवार, महाशिवरात्रि, श्रावण।', how_hi:'उत्तर मुख। सफेद वस्त्र। बेलपत्र।', count:'108', source:'Yajurveda' },
  { id:'22', sanskrit:'ॐ क्रीं काल्यै नमः', name:'Om Kreem Kalyai Namah', deity:'Kali Maa', category:'Shakti', meaning_hi:'माँ काली को प्रणाम — अज्ञान नाशक शक्ति।', when_hi:'मंगलवार रात, अमावस्या, नवरात्रि।', how_hi:'लाल/काले वस्त्र। लाल गुड़हल। रात को।', count:'108', source:'Tantrasara' },
  { id:'23', sanskrit:'ॐ धन्वन्तरये नमः', name:'Om Dhanvantaraye Namah', deity:'Dhanvantari', category:'Health', meaning_hi:'भगवान धन्वंतरि को नमन — आयुर्वेद के देवता।', when_hi:'स्वास्थ्य के लिए। धनतेरस।', how_hi:'पीले वस्त्र, उत्तर मुख।', count:'108', source:'Dhanvantari Stotra' },
  { id:'24', sanskrit:'ॐ नमो नरसिंहाय', name:'Om Namo Narasimhaya', deity:'Narasimha', category:'Vishnu', meaning_hi:'भगवान नरसिंह को नमन — भक्तों के रक्षक।', when_hi:'शत्रुओं से सुरक्षा के लिए। गुरुवार।', how_hi:'पूर्व मुख। पीले वस्त्र।', count:'108', source:'Narasimha Purana' },
  { id:'25', sanskrit:'सर्वमंगलमांगल्ये शिवे सर्वार्थसाधिके। शरण्ये त्र्यम्बके गौरि नारायणि नमोऽस्तु ते।', name:'Sarva Mangala Mangalye', deity:'Parvati', category:'Durga', meaning_hi:'हे सर्वमंगला! शिव पत्नी, नारायणी — आपको नमन।', when_hi:'सुबह की प्रार्थना, नवरात्रि।', how_hi:'पूर्व मुख। लाल/नारंगी वस्त्र।', count:'3, 9, या 108', source:'Devi Mahatmyam' },
  { id:'26', sanskrit:'ॐ बुं बुधाय नमः', name:'Om Bum Budhaya Namah', deity:'Budha (Mercury)', category:'Navagraha', meaning_hi:'बुध ग्रह को नमन — बुद्धि और संचार।', when_hi:'बुधवार। छात्र, लेखक, व्यापारी।', how_hi:'उत्तर मुख। हरे वस्त्र।', count:'108', source:'Navagraha Stotra' },
  { id:'27', sanskrit:'ॐ अं अंगारकाय नमः', name:'Om An Angarakaya Namah', deity:'Mangal (Mars)', category:'Navagraha', meaning_hi:'मंगल ग्रह को नमन — ऊर्जा और साहस।', when_hi:'मंगलवार सूर्योदय पर। Mangal dosha remedy।', how_hi:'लाल वस्त्र, पूर्व मुख।', count:'108', source:'Navagraha Stotra' },
  { id:'28', sanskrit:'ॐ बृं बृहस्पतये नमः', name:'Om Brim Brihaspataye Namah', deity:'Guru (Jupiter)', category:'Navagraha', meaning_hi:'गुरु बृहस्पति को नमन।', when_hi:'गुरुवार। ज्ञान, सफलता, विवाह के लिए।', how_hi:'पीले वस्त्र, उत्तर/पूर्व मुख।', count:'108', source:'Navagraha Stotra' },
  { id:'29', sanskrit:'ॐ शुं शुक्राय नमः', name:'Om Shum Shukraya Namah', deity:'Shukra (Venus)', category:'Navagraha', meaning_hi:'शुक्र ग्रह को नमन — सौंदर्य और कला।', when_hi:'शुक्रवार। प्रेम, सौंदर्य के लिए।', how_hi:'सफेद/गुलाबी वस्त्र, पूर्व मुख।', count:'108', source:'Navagraha Stotra' },
  { id:'30', sanskrit:'ॐ शरवणभव', name:'Om Saravanabhava', deity:'Kartikeya/Murugan', category:'Kartikeya', meaning_hi:'कार्तिकेय को नमन — शिव पुत्र।', when_hi:'साहस, विजय के लिए।', how_hi:'पूर्व मुख। लाल/नारंगी वस्त्र।', count:'108', source:'Skanda Purana' },
  { id:'31', sanskrit:'ॐ ऐं क्लीं सौः', name:'Tridevi Beeja Mantra', deity:'Tridevi', category:'Shakti', meaning_hi:'सरस्वती, लक्ष्मी और काली के बीज मंत्र।', when_hi:'नवरात्रि। सर्वांगीण आशीर्वाद।', how_hi:'लाल वस्त्र। पहले गुरु से सीखें।', count:'108', source:'Devi Bhagavatam' },
  { id:'32', sanskrit:'जय सीताराम, जय जय सीताराम', name:'Jaya Sitaram', deity:'Ram-Sita', category:'Ram', meaning_hi:'सीता-राम की जय — धर्म का दिव्य जोड़ा।', when_hi:'कभी भी। सुबह की सैर में।', how_hi:'कोई नियम नहीं।', count:'Continuous', source:'Ramcharitmanas tradition' },
  { id:'33', sanskrit:'ॐ तत्सत्', name:'Om Tat Sat', deity:'Brahman', category:'Universal', meaning_hi:'ॐ — वह — सत्य। परम सत्य की पुष्टि।', when_hi:'किसी भी पवित्र कार्य से पहले।', how_hi:'कोई नियम नहीं।', count:'1 time', source:'Bhagavad Gita 17.23' },
  { id:'34', sanskrit:'ॐ शांतिः शांतिः शांतिः', name:'Om Shanti Shanti Shanti', deity:'Universal', category:'Universal', meaning_hi:'शरीर, मन और आत्मा में शांति।', when_hi:'किसी भी प्रार्थना के अंत में।', how_hi:'कोई प्रतिबंध नहीं।', count:'3 times', source:'Multiple Upanishads' },
  { id:'35', sanskrit:'ॐ ह्रीं दुर्गायै नमः', name:'Om Hreem Durgayai Namah', deity:'Durga', category:'Durga', meaning_hi:'माँ दुर्गा — अजेय माता को प्रणाम।', when_hi:'नवरात्रि, मंगलवार और शुक्रवार।', how_hi:'लाल वस्त्र, पूर्व मुख।', count:'108', source:'Devi Mahatmyam' },
  { id:'36', sanskrit:'ॐ ऐं ह्रीं क्लीं चामुण्डायै विच्चे', name:'Navarna Mantra', deity:'Chamunda Devi', category:'Shakti', meaning_hi:'चामुण्डा देवी का नव-अक्षर मंत्र।', when_hi:'नवरात्रि। गुरु मार्गदर्शन में।', how_hi:'महत्वपूर्ण: पहले गुरु से सीखें।', count:'108', source:'Devi Mahatmyam' },
  { id:'37', sanskrit:'ॐ श्रीं क्लीं महालक्ष्म्यै नमः', name:'Mahalakshmi Beeja Mantra', deity:'Lakshmi', category:'Lakshmi', meaning_hi:'महालक्ष्मी का बीज मंत्र।', when_hi:'शुक्रवार शाम। धन के लिए।', how_hi:'गुलाबी/लाल वस्त्र। उत्तर मुख।', count:'108', source:'Sri Suktam' },
  { id:'38', sanskrit:'ॐ वायवे नमः', name:'Om Vayave Namah', deity:'Vayu Dev', category:'Vedic', meaning_hi:'वायु देव को नमन — हनुमान और भीम के पिता।', when_hi:'प्राणायाम से पहले।', how_hi:'उत्तर मुख।', count:'21', source:'Vedic tradition' },
  { id:'39', sanskrit:'ॐ अग्नये नमः', name:'Om Agnaye Namah', deity:'Agni Dev', category:'Vedic', meaning_hi:'अग्नि देव को नमन।', when_hi:'हवन, यज्ञ, दीपक जलाते समय।', how_hi:'अग्नि की ओर मुख। घी की आहुति।', count:'108 during havan', source:'Rigveda 1.1.1' },
  { id:'40', sanskrit:'ॐ क्लीं कृष्णाय नमः', name:'Om Kleem Krishnaya Namah', deity:'Krishna', category:'Vishnu', meaning_hi:'कृष्ण का आकर्षण मंत्र — प्रेम और आनंद।', when_hi:'प्रेम, रिश्तों के लिए। गुरुवार।', how_hi:'पीले वस्त्र, तुलसी माला।', count:'108', source:'Narada Bhakti tradition' },
  { id:'41', sanskrit:'ॐ रां रामचन्द्राय नमः', name:'Om Ram Ramachandraya Namah', deity:'Ram', category:'Ram', meaning_hi:'भगवान रामचंद्र को नमन।', when_hi:'रविवार, रामनवमी, दैनिक सुबह।', how_hi:'केसरिया/सफेद वस्त्र, पूर्व मुख।', count:'108', source:'Valmiki Ramayana' },
  { id:'42', sanskrit:'ॐ नमो हनुमते रुद्रावताराय', name:'Hanuman Maha Mantra', deity:'Hanuman', category:'Hanuman', meaning_hi:'हनुमान — रुद्र अवतार, अमित पराक्रमी।', when_hi:'मंगलवार और शनिवार।', how_hi:'मांस/अंडे/मदिरा नहीं। लाल/केसरिया वस्त्र।', count:'108', source:'Hanuman Kavach' },
  { id:'43', sanskrit:'ॐ गुरुभ्यो नमः', name:'Om Gurubhyo Namah', deity:'Guru', category:'Universal', meaning_hi:'गुरु को नमस्कार — अंधकार हटाने वाले।', when_hi:'किसी भी आध्यात्मिक अभ्यास से पहले।', how_hi:'हाथ जोड़कर सिर झुकाएं।', count:'3', source:'Guru Gita' },
  { id:'44', sanskrit:'ॐ ऐं ह्रीं श्रीं', name:'Om Aim Hreem Shreem', deity:'Tridevi', category:'Shakti', meaning_hi:'सरस्वती, लक्ष्मी और काली के बीज मंत्र।', when_hi:'नवरात्रि। ज्ञान, समृद्धि और शक्ति।', how_hi:'लाल वस्त्र। गुरु से सीखें।', count:'108', source:'Tantrasara' },
  { id:'45', sanskrit:'ॐ मणिपद्मे हुम्', name:'Om Mani Padme Hum', deity:'Compassion', category:'Universal', meaning_hi:'कमल में रत्न — करुणा और ज्ञान का आह्वान।', when_hi:'मन की शांति के लिए। कभी भी।', how_hi:'कोई नियम नहीं।', count:'108', source:'Ancient tradition' },
  { id:'46', sanskrit:'ॐ नमः पर्वतीपतये हर हर महादेव', name:'Har Har Mahadev', deity:'Shiva', category:'Shiva', meaning_hi:'पार्वती के पति महादेव की जय!', when_hi:'कावड़ यात्रा। शिवरात्रि।', how_hi:'कोई नियम नहीं।', count:'Continuous', source:'Shiva Purana tradition' },
  { id:'47', sanskrit:'ॐ नमो भगवते रुद्राय', name:'Om Namo Bhagavate Rudraya', deity:'Shiva', category:'Shiva', meaning_hi:'भगवान रुद्र को नमस्कार।', when_hi:'संकट में, सुरक्षा के लिए। सोमवार।', how_hi:'शांत स्थान। सफेद वस्त्र।', count:'108', source:'Shiva Purana' },
  { id:'48', sanskrit:'ॐ जय माता दी', name:'Jai Mata Di', deity:'Durga/Shakti', category:'Durga', meaning_hi:'माँ की जय — सभी शक्तियों की माँ।', when_hi:'नवरात्रि में। माँ के दर्शन के समय।', how_hi:'कोई नियम नहीं।', count:'Continuous', source:'Popular devotional' },
  { id:'49', sanskrit:'लोकाः समस्ताः सुखिनो भवन्तु', name:'Lokah Samastah', deity:'Universal', category:'Universal', meaning_hi:'सभी लोक सुखी हों।', when_hi:'योग और ध्यान के अंत में।', how_hi:'शांत मन।', count:'3 times', source:'Hindu tradition' },
  { id:'50', sanskrit:'ॐ नमो भगवते वासुदेवाय नमः। ॐ नमः शिवाय। ॐ श्रीं महालक्ष्म्यै नमः।', name:'Tridev Vandana', deity:'Tridev', category:'Universal', meaning_hi:'विष्णु, शिव और लक्ष्मी को वंदना।', when_hi:'सुबह की प्रार्थना।', how_hi:'स्वच्छ स्थान, सुबह।', count:'3 each', source:'Combined tradition' },
];

// ════════════════════════════════════════════════════════
// SHARE
// ════════════════════════════════════════════════════════
async function shareContent(title, body, source, lang) {
  try {
    const isH = lang === 'hindi';
    const divider = '━━━━━━━━━━━━━━━━━━━━';
    const appTag = isH
      ? `\n${divider}\n🕉 DharmaSetu App से\nसनातन धर्म का सम्पूर्ण मार्गदर्शन\nPlay Store: DharmaSetu`
      : `\n${divider}\n🕉 From DharmaSetu App\nComplete Sanatan Dharma guidance\nDownload: DharmaSetu on Play Store`;
    const text = (title?`*${title}*\n\n`:'') + body + '\n\n' + (source?`📖 ${source}\n`:'') + appTag;
    await Share.share({ message:text, title:'DharmaSetu' });
  } catch {}
}

// ════════════════════════════════════════════════════════
// ANIMATED FLAME
// ════════════════════════════════════════════════════════
function Flame() {
  const sc = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(sc,{toValue:1.15,duration:480,useNativeDriver:true}),
      Animated.timing(sc,{toValue:0.94,duration:380,useNativeDriver:true}),
      Animated.timing(sc,{toValue:1,duration:440,useNativeDriver:true}),
    ])).start();
  },[]);
  return <Animated.Text style={{fontSize:32,transform:[{scale:sc}]}}>🔥</Animated.Text>;
}

// ════════════════════════════════════════════════════════
// PERFECT NORTH INDIAN KUNDLI CHART
// ════════════════════════════════════════════════════════
function KundliChart({ user, lang }) {
  const size = SW - 72;
  const isH = lang === 'hindi';
  const cs = size / 3; // cell size

  const lagna = user?.rashi || 'Simha';
  const lagnaNum = RASHI_MAP[lagna] || 5;

  // In North Indian chart, Rashi at each position is fixed by Lagna
  // Position 1 (top-center) = Lagna Rashi
  // Going clockwise: pos 1=top-mid, 2=top-right, 3=right-mid, 4=bot-right,
  //                  5=bot-mid, 6=bot-left, 7=left-mid, 8=top-left
  // Houses 9-12 fill inner cells (non-standard for 3x3, so we map them to corners)
  function getRashi(pos) {
    // pos 1-12, counter-clockwise from top-center
    const num = ((lagnaNum + pos - 2) % 12) + 1;
    return RASHI_NAMES_LIST[num];
  }
  function getLord(rashi) {
    const full = RASHI_LORDS[rashi] || '';
    // short form
    return full.split(' ')[0];
  }

  const gold = 'rgba(240,165,0,0.55)';
  const dimGold = 'rgba(240,165,0,0.14)';
  const textGold = '#F4A261';

  // Cell renderer
  const Cell = ({ pos, top, left, w, h, isCenter }) => {
    if (isCenter) {
      return (
        <View style={{
          position:'absolute', top:top+2, left:left+2, width:w-4, height:h-4,
          alignItems:'center', justifyContent:'center',
          backgroundColor:'rgba(107,33,168,0.2)', borderRadius:6,
        }}>
          <Text style={{fontSize:22}}>🕉</Text>
          <Text style={{fontSize:9,color:'#C9830A',fontWeight:'700',marginTop:2,textAlign:'center'}}>{lagna}</Text>
          <Text style={{fontSize:8,color:'rgba(253,246,237,0.35)',textAlign:'center'}}>{user?.nakshatra?.split(' ')[0]||''}</Text>
        </View>
      );
    }

    const rashi = getRashi(pos);
    const lord = getLord(rashi);
    const isLagna = pos === 1;
    const symbol = RASHI_SYMBOL[rashi] || '';

    return (
      <View style={{
        position:'absolute', top, left, width:w, height:h,
        alignItems:'center', justifyContent:'center', padding:3,
      }}>
        {isLagna && (
          <View style={{
            position:'absolute', top:3, left:3, right:3,
            backgroundColor:'rgba(232,98,10,0.2)', borderRadius:4, paddingVertical:1,
          }}>
            <Text style={{fontSize:8,color:'#E8620A',fontWeight:'800',textAlign:'center',letterSpacing:0.5}}>
              {isH?'लग्न':'LAGNA'}
            </Text>
          </View>
        )}
        <Text style={{fontSize:14,marginTop:isLagna?12:0}}>{symbol}</Text>
        <Text style={{
          fontSize: rashi.length > 6 ? 8 : 9,
          color: isLagna ? textGold : 'rgba(253,246,237,0.55)',
          fontWeight: isLagna ? '700' : '500',
          textAlign:'center',
        }} numberOfLines={1}>{rashi}</Text>
        <Text style={{fontSize:7.5,color:'rgba(201,131,10,0.65)',textAlign:'center'}} numberOfLines={1}>{lord}</Text>
        <Text style={{fontSize:8,color:'rgba(255,255,255,0.15)',marginTop:1}}>{pos}</Text>
      </View>
    );
  };

  return (
    <View style={{alignItems:'center', marginVertical:14}}>
      <Text style={{fontSize:12,color:textGold,fontWeight:'700',marginBottom:10}}>
        {isH ? '✨ उत्तर भारतीय जन्म कुंडली' : '✨ Vedic Birth Chart — North Indian'}
      </Text>

      {/* THE CHART SQUARE */}
      <View style={{width:size, height:size, borderWidth:2, borderColor:gold, backgroundColor:'rgba(10,4,0,0.97)', position:'relative', overflow:'hidden'}}>

        {/* Grid lines */}
        <View style={{position:'absolute',left:cs,top:0,bottom:0,width:1,backgroundColor:dimGold}}/>
        <View style={{position:'absolute',left:cs*2,top:0,bottom:0,width:1,backgroundColor:dimGold}}/>
        <View style={{position:'absolute',top:cs,left:0,right:0,height:1,backgroundColor:dimGold}}/>
        <View style={{position:'absolute',top:cs*2,left:0,right:0,height:1,backgroundColor:dimGold}}/>

        {/* DIAGONAL lines in center cell only */}
        <View style={{position:'absolute',left:cs,top:cs,width:cs,height:cs,overflow:'hidden'}}>
          {/* diagonal top-left to bottom-right */}
          <View style={{
            position:'absolute', left:-4, top:cs/2-0.5,
            width:cs+8, height:1, backgroundColor:dimGold,
            transform:[{rotate:'45deg'}],
          }}/>
          {/* diagonal top-right to bottom-left */}
          <View style={{
            position:'absolute', left:-4, top:cs/2-0.5,
            width:cs+8, height:1, backgroundColor:dimGold,
            transform:[{rotate:'-45deg'}],
          }}/>
        </View>

        {/* 8 outer cells going clockwise from top-center */}
        {/* Top-center = House 1 (LAGNA) */}
        <Cell pos={1}  top={0}    left={cs}    w={cs} h={cs} />
        {/* Top-right = House 2 */}
        <Cell pos={2}  top={0}    left={cs*2}  w={cs} h={cs} />
        {/* Right-mid = House 3 */}
        <Cell pos={3}  top={cs}   left={cs*2}  w={cs} h={cs} />
        {/* Bottom-right = House 4 */}
        <Cell pos={4}  top={cs*2} left={cs*2}  w={cs} h={cs} />
        {/* Bottom-center = House 5 */}
        <Cell pos={5}  top={cs*2} left={cs}    w={cs} h={cs} />
        {/* Bottom-left = House 6 */}
        <Cell pos={6}  top={cs*2} left={0}     w={cs} h={cs} />
        {/* Left-mid = House 7 */}
        <Cell pos={7}  top={cs}   left={0}     w={cs} h={cs} />
        {/* Top-left = House 8 */}
        <Cell pos={8}  top={0}    left={0}     w={cs} h={cs} />

        {/* CENTER CELL (with Om, Rashi info, and X diagonals) */}
        <Cell isCenter top={cs} left={cs} w={cs} h={cs} />
      </View>

      {/* DOB and location below chart */}
      <View style={{marginTop:8, alignItems:'center', gap:3}}>
        <Text style={{fontSize:12,color:'#C9830A',fontWeight:'700'}}>{user?.name||''}</Text>
        <View style={{flexDirection:'row',gap:8}}>
          {user?.dob ? <Text style={{fontSize:10,color:'rgba(253,246,237,0.35)'}}>{isH?'जन्म:':'DOB:'} {user.dob}</Text> : null}
          {user?.birthCity ? <Text style={{fontSize:10,color:'rgba(253,246,237,0.35)'}}>📍 {user.birthCity}</Text> : null}
        </View>
      </View>

      {/* Chips */}
      <View style={{flexDirection:'row',gap:7,marginTop:9,flexWrap:'wrap',justifyContent:'center'}}>
        {[
          {label:isH?'राशि':'Rashi', val:lagna, c1:'rgba(232,98,10,0.18)', c2:'rgba(232,98,10,0.4)'},
          {label:isH?'नक्षत्र':'Nakshatra', val:user?.nakshatra?.split(' ')[0]||'', c1:'rgba(107,33,168,0.18)', c2:'rgba(107,33,168,0.4)'},
          {label:isH?'ग्रह':'Planet', val:(RASHI_LORDS[lagna]||'').split(' ')[0], c1:'rgba(39,174,96,0.13)', c2:'rgba(39,174,96,0.3)'},
          {label:isH?'देव':'Deity', val:user?.deity?.split(' ')[0]||'', c1:'rgba(201,131,10,0.13)', c2:'rgba(201,131,10,0.3)'},
        ].filter(x=>x.val).map((item,i)=>(
          <View key={i} style={{paddingHorizontal:9,paddingVertical:5,backgroundColor:item.c1,borderRadius:8,borderWidth:1,borderColor:item.c2}}>
            <Text style={{fontSize:9,color:'rgba(253,246,237,0.4)'}}>{item.label}</Text>
            <Text style={{fontSize:11,color:textGold,fontWeight:'700'}}>{item.val}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════
// KUNDLI MODAL
// ════════════════════════════════════════════════════════
function KundliModal({ visible, onClose, user, lang }) {
  const [activeTab, setActiveTab] = useState('overview');
  if (!user) return null;
  const insight = getInsight(user.rashi, lang);
  const isH = lang === 'hindi';

  const rows = isH ? [
    {k:'राशि',          v:`${user.rashi} (${RASHI_ENG[user.rashi]||''})  ${RASHI_SYMBOL[user.rashi]||''}`},
    {k:'नक्षत्र',       v:user.nakshatra||'—'},
    {k:'स्वामी ग्रह',  v:RASHI_LORDS[user.rashi]||user.planet||'—'},
    {k:'इष्ट देव',     v:user.deity||'—'},
    {k:'व्यक्तिगत मंत्र',v:user.mantra||'—'},
    {k:'शुभ रंग',      v:user.luckyColor||'—'},
    {k:'शुभ दिन',      v:user.luckyDay||'—'},
    {k:'रत्न',          v:user.luckyGem||'—'},
  ] : [
    {k:'Moon Sign (Rashi)', v:`${user.rashi} (${RASHI_ENG[user.rashi]||''})  ${RASHI_SYMBOL[user.rashi]||''}`},
    {k:'Birth Star',        v:user.nakshatra||'—'},
    {k:'Ruling Planet',     v:RASHI_LORDS[user.rashi]||user.planet||'—'},
    {k:'Your Deity',        v:user.deity||'—'},
    {k:'Personal Mantra',   v:user.mantra||'—'},
    {k:'Lucky Color',       v:user.luckyColor||'—'},
    {k:'Lucky Day',         v:user.luckyDay||'—'},
    {k:'Lucky Gemstone',    v:user.luckyGem||'—'},
  ];

  const tabs = [
    {id:'overview', icon:'✨', label:isH?'Overview':'Overview'},
    {id:'analysis', icon:'🔮', label:isH?'Analysis':'Analysis'},
    {id:'remedy',   icon:'🧿', label:isH?'Remedy':'Remedy'},
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={km.overlay}>
        <View style={km.box}>
          {/* Header */}
          <View style={km.hdr}>
            <Text style={km.title}>✨ {isH?'मेरी कुंडली':'My Kundli'}</Text>
            <TouchableOpacity onPress={onClose} style={km.closeWrap} hitSlop={{top:12,bottom:12,left:12,right:12}}>
              <Text style={km.close}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={{flexDirection:'row',gap:6,marginBottom:4}}>
            {tabs.map(tab=>(
              <TouchableOpacity key={tab.id}
                style={{flex:1,paddingVertical:8,borderRadius:10,alignItems:'center',borderWidth:1,
                  borderColor:activeTab===tab.id?'#E8620A':'rgba(200,130,40,0.15)',
                  backgroundColor:activeTab===tab.id?'rgba(232,98,10,0.12)':'rgba(255,255,255,0.03)'}}
                onPress={()=>setActiveTab(tab.id)}>
                <Text style={{fontSize:11,color:activeTab===tab.id?'#F4A261':'rgba(253,246,237,0.35)',fontWeight:'600'}}>{tab.icon} {tab.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {activeTab === 'overview' && (
              <>
                {/* PERFECT CHART */}
                <KundliChart user={user} lang={lang} />
                {/* Data rows */}
                {rows.map(r=>(
                  <View key={r.k} style={km.row}>
                    <Text style={km.rkey}>{r.k}</Text>
                    <Text style={km.rval}>{r.v}</Text>
                  </View>
                ))}
              </>
            )}

            {activeTab === 'analysis' && (
              <View style={{gap:10,paddingTop:6}}>
                {[
                  {title:isH?'🔥 व्यक्तित्व':'🔥 Personality', text:insight.personality},
                  {title:isH?'💼 करियर मार्गदर्शन':'💼 Career Guidance', text:insight.career},
                  {title:isH?'🌿 स्वास्थ्य मार्गदर्शन':'🌿 Health Guidance', text:insight.health},
                  {title:isH?'🔮 2025–2032 भविष्यवाणी':'🔮 2025–2032 Predictions', text:insight.prediction},
                ].map(ss=>(
                  <View key={ss.title} style={km.section}>
                    <Text style={km.secTitle}>{ss.title}</Text>
                    <Text style={km.secText}>{ss.text}</Text>
                  </View>
                ))}
                <TouchableOpacity
                  style={{backgroundColor:'#E8620A',borderRadius:12,paddingVertical:13,alignItems:'center',marginTop:4}}
                  onPress={async()=>{
                    onClose();
                    const q = isH
                      ? `मेरी ${user.rashi} राशि और ${user.nakshatra||''} नक्षत्र के अनुसार मेरे जीवन का विस्तृत ज्योतिष विश्लेषण दें — करियर, विवाह, पैसा, 2025–2035 का भविष्य।`
                      : `Based on my ${user.rashi} rashi and ${user.nakshatra||''} nakshatra, give me detailed Jyotish analysis of my life — career, marriage, money, and 2025–2035 predictions.`;
                    await AsyncStorage.setItem('dharmasetu_preset_question', q);
                    router.push('/(tabs)/explore');
                  }}>
                  <Text style={{color:'#fff',fontWeight:'700',fontSize:13}}>{isH?'🔮 DharmaChat में विस्तृत विश्लेषण →':'🔮 Get Full Analysis in DharmaChat →'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === 'remedy' && (
              <View style={{gap:10,paddingTop:6}}>
                <View style={km.section}>
                  <Text style={km.secTitle}>{isH?'🧿 उपाय और पूजा':'🧿 Remedies & Worship'}</Text>
                  <Text style={km.secText}>{insight.remedy}</Text>
                </View>
                <View style={km.section}>
                  <Text style={km.secTitle}>{isH?'📿 आपका व्यक्तिगत मंत्र':'📿 Your Personal Mantra'}</Text>
                  <Text style={[km.secText,{fontSize:17,color:'#F4A261',textAlign:'center',lineHeight:28}]}>{user.mantra||'—'}</Text>
                </View>
                <View style={km.section}>
                  <Text style={km.secTitle}>{isH?'💎 आपका रत्न':'💎 Your Gemstone'}</Text>
                  <Text style={km.secText}>{user.luckyGem||'—'}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={{backgroundColor:'rgba(232,98,10,0.1)',borderRadius:12,padding:13,alignItems:'center',marginTop:14,borderWidth:1,borderColor:'rgba(232,98,10,0.3)'}}
              onPress={()=>shareContent(
                isH?`मेरी कुंडली — ${user.name}`:`My Kundli — ${user.name}`,
                rows.map(r=>`${r.k}: ${r.v}`).join('\n')+`\n\n${insight.personality}\n\n${insight.prediction}`,
                '', lang
              )}>
              <Text style={{color:'#F4A261',fontWeight:'700'}}>📤 {isH?'कुंडली Share करें':'Share My Kundli'}</Text>
            </TouchableOpacity>
            <View style={{height:24}}/>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const km = StyleSheet.create({
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.88)',justifyContent:'flex-end'},
  box:{backgroundColor:'#130700',borderRadius:28,maxHeight:'93%',margin:10,padding:20,borderWidth:1,borderColor:'rgba(240,165,0,0.2)'},
  hdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},
  title:{fontSize:18,fontWeight:'800',color:'#F4A261'},
  closeWrap:{width:34,height:34,borderRadius:17,backgroundColor:'rgba(255,255,255,0.1)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(253,246,237,0.2)'},
  close:{fontSize:16,color:'#FDF6ED',fontWeight:'700',lineHeight:20},
  row:{flexDirection:'row',justifyContent:'space-between',paddingVertical:9,borderBottomWidth:1,borderBottomColor:'rgba(240,165,0,0.08)'},
  rkey:{fontSize:12,color:'rgba(253,246,237,0.4)',fontWeight:'600',flex:1},
  rval:{fontSize:13,color:'#F4A261',fontWeight:'700',textAlign:'right',flex:1.5},
  section:{backgroundColor:'rgba(255,255,255,0.03)',borderRadius:12,padding:14,borderWidth:1,borderColor:'rgba(240,165,0,0.1)'},
  secTitle:{fontSize:13,fontWeight:'700',color:'#E8620A',marginBottom:7},
  secText:{fontSize:13,color:'rgba(253,246,237,0.85)',lineHeight:22},
});

// ════════════════════════════════════════════════════════
// MANTRA MODAL
// ════════════════════════════════════════════════════════
function MantraModal({ visible, onClose, lang }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const isH = lang === 'hindi';

  const CAT_IDS   = ['all','Shiva','Vishnu','Ram','Hanuman','Ganesh','Saraswati','Lakshmi','Durga','Shakti','Surya','Universal','Navagraha','Health','Vedic','Kartikeya'];
  const CAT_LABEL = {all:'सभी',Shiva:'शिव',Vishnu:'विष्णु',Ram:'राम',Hanuman:'हनुमान',Ganesh:'गणेश',Saraswati:'सरस्वती',Lakshmi:'लक्ष्मी',Durga:'दुर्गा',Shakti:'शक्ति',Surya:'सूर्य',Universal:'सार्वभौमिक',Navagraha:'नवग्रह',Health:'स्वास्थ्य',Vedic:'वैदिक',Kartikeya:'कार्तिकेय'};

  const filtered = MANTRAS.filter(m=>{
    const matchCat = filter==='all'||m.category===filter;
    const matchSearch = !search.trim()||m.name.toLowerCase().includes(search.toLowerCase())||m.deity.toLowerCase().includes(search.toLowerCase())||m.sanskrit.includes(search);
    return matchCat && matchSearch;
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={()=>{setSelected(null);onClose();}}>
      <View style={mm.overlay}>
        <View style={mm.box}>
          <View style={mm.hdr}>
            <Text style={mm.title}>📿 {isH?'मंत्र पुस्तकालय':'Mantra Library'} ({MANTRAS.length}+)</Text>
            <TouchableOpacity onPress={()=>{setSelected(null);onClose();}} style={mm.closeWrap} hitSlop={{top:12,bottom:12,left:12,right:12}}>
              <Text style={mm.close}>✕</Text>
            </TouchableOpacity>
          </View>

          {selected ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={{marginBottom:14}} onPress={()=>setSelected(null)}>
                <Text style={{fontSize:13,color:'#E8620A',fontWeight:'600'}}>← {isH?'वापस':'Back'}</Text>
              </TouchableOpacity>
              <Text style={mm.mSanskrit}>{selected.sanskrit}</Text>
              <Text style={mm.mName}>{selected.name}</Text>
              <Text style={mm.mDeity}>{isH?'देवता: ':'Deity: '}{selected.deity} · {selected.count} {isH?'बार':'times'}</Text>
              {[
                {icon:'📖',label:isH?'अर्थ':'Meaning',text:selected.meaning_hi},
                {icon:'⏰',label:isH?'कब जपें':'When to Chant',text:selected.when_hi},
                {icon:'🪷',label:isH?'जप विधि (नियम)':'How to Chant (Rules)',text:selected.how_hi,hl:true},
                {icon:'📚',label:isH?'स्रोत':'Source',text:selected.source},
              ].map(item=>(
                <View key={item.label} style={[mm.infoBox,item.hl&&{borderColor:'rgba(232,98,10,0.3)'}]}>
                  <Text style={mm.infoLabel}>{item.icon} {item.label}</Text>
                  <Text style={mm.infoText}>{item.text}</Text>
                </View>
              ))}
              <TouchableOpacity
                style={{backgroundColor:'rgba(232,98,10,0.12)',borderRadius:12,padding:12,alignItems:'center',marginTop:8,borderWidth:1,borderColor:'rgba(232,98,10,0.3)'}}
                onPress={()=>shareContent(selected.name,`${selected.sanskrit}\n\n${selected.meaning_hi}\n\n${isH?'कब: ':'When: '}${selected.when_hi}\n\n${isH?'विधि: ':'How: '}${selected.how_hi}`,selected.source,lang)}>
                <Text style={{color:'#F4A261',fontWeight:'700',fontSize:13}}>📤 {isH?'यह Mantra Share करें':'Share this Mantra'}</Text>
              </TouchableOpacity>
              <View style={{height:24}}/>
            </ScrollView>
          ) : (
            <>
              <TextInput style={mm.search} placeholder={isH?'Mantras खोजें...':'Search mantras...'} placeholderTextColor="rgba(253,246,237,0.3)" value={search} onChangeText={setSearch}/>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{maxHeight:38,marginBottom:10}} contentContainerStyle={{gap:6,paddingHorizontal:2,alignItems:'center'}}>
                {CAT_IDS.map(id=>(
                  <TouchableOpacity key={id}
                    style={{paddingHorizontal:12,paddingVertical:5,borderRadius:20,borderWidth:1,borderColor:filter===id?'#E8620A':'rgba(200,130,40,0.2)',backgroundColor:filter===id?'rgba(232,98,10,0.15)':'transparent'}}
                    onPress={()=>setFilter(id)}>
                    <Text style={{fontSize:11,color:filter===id?'#F4A261':'rgba(253,246,237,0.4)',fontWeight:'600'}}>{CAT_LABEL[id]||id}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView showsVerticalScrollIndicator={false}>
                {filtered.map(m=>(
                  <TouchableOpacity key={m.id} style={mm.mantraCard} onPress={()=>setSelected(m)} activeOpacity={0.8}>
                    <View style={{flex:1}}>
                      <Text style={mm.mCardSanskrit} numberOfLines={1}>{m.sanskrit.length>44?m.sanskrit.slice(0,44)+'...':m.sanskrit}</Text>
                      <Text style={mm.mCardName}>{m.name}</Text>
                      <Text style={mm.mCardDeity}>{m.deity} · {m.count}</Text>
                    </View>
                    <Text style={{color:'rgba(253,246,237,0.25)',fontSize:16}}>›</Text>
                  </TouchableOpacity>
                ))}
                <View style={{height:24}}/>
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const mm = StyleSheet.create({
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.88)',justifyContent:'flex-end'},
  box:{backgroundColor:'#130700',borderRadius:28,maxHeight:'93%',margin:10,padding:20,borderWidth:1,borderColor:'rgba(240,165,0,0.2)'},
  hdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},
  title:{fontSize:14,fontWeight:'800',color:'#F4A261',flex:1},
  closeWrap:{width:34,height:34,borderRadius:17,backgroundColor:'rgba(255,255,255,0.1)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(253,246,237,0.2)'},
  close:{fontSize:16,color:'#FDF6ED',fontWeight:'700',lineHeight:20},
  search:{backgroundColor:'rgba(255,255,255,0.05)',borderRadius:12,paddingHorizontal:14,paddingVertical:11,color:'#FDF6ED',fontSize:14,borderWidth:1,borderColor:'rgba(200,130,40,0.2)',marginBottom:10},
  mantraCard:{backgroundColor:'#1A0800',borderRadius:12,padding:14,marginBottom:8,borderWidth:1,borderColor:'rgba(200,130,40,0.15)',flexDirection:'row',alignItems:'center',gap:8},
  mCardSanskrit:{fontSize:14,color:'#F4A261',fontWeight:'700',marginBottom:3},
  mCardName:{fontSize:11,color:'rgba(253,246,237,0.7)',marginBottom:2},
  mCardDeity:{fontSize:10,color:'rgba(253,246,237,0.35)'},
  mSanskrit:{fontSize:17,color:'#F4A261',fontWeight:'800',textAlign:'center',lineHeight:28,marginBottom:8},
  mName:{fontSize:14,color:'#FDF6ED',fontWeight:'700',textAlign:'center',marginBottom:4},
  mDeity:{fontSize:12,color:'#C9830A',textAlign:'center',marginBottom:14},
  infoBox:{backgroundColor:'rgba(255,255,255,0.03)',borderRadius:12,padding:14,marginBottom:10,borderWidth:1,borderColor:'rgba(240,165,0,0.1)'},
  infoLabel:{fontSize:10,fontWeight:'700',color:'#E8620A',textTransform:'uppercase',letterSpacing:0.8,marginBottom:6},
  infoText:{fontSize:13,color:'rgba(253,246,237,0.85)',lineHeight:22},
});

// ════════════════════════════════════════════════════════
// SAVED MODAL
// ════════════════════════════════════════════════════════
function SavedModal({ visible, onClose, lang, onCountChange }) {
  const [items, setItems] = useState([]);
  const isH = lang === 'hindi';
  useEffect(()=>{ if(visible) AsyncStorage.getItem('dharmasetu_saved').then(r=>setItems(JSON.parse(r||'[]'))); },[visible]);
  const del = async(id)=>{ const f=items.filter(i=>i.id!==id); setItems(f); await AsyncStorage.setItem('dharmasetu_saved',JSON.stringify(f)); onCountChange(f.length); };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.88)',justifyContent:'flex-end'}}>
        <View style={{backgroundColor:'#130700',borderRadius:28,maxHeight:'85%',margin:10,padding:20,borderWidth:1,borderColor:'rgba(240,165,0,0.2)'}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <Text style={{fontSize:16,fontWeight:'800',color:'#F4A261'}}>🔖 {isH?'Saved Answers':'Saved Answers'} ({items.length}/20)</Text>
            <TouchableOpacity onPress={onClose} style={{width:34,height:34,borderRadius:17,backgroundColor:'rgba(255,255,255,0.1)',alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:16,color:'#FDF6ED',fontWeight:'700'}}>✕</Text>
            </TouchableOpacity>
          </View>
          {items.length===0
            ?<Text style={{fontSize:14,color:'rgba(253,246,237,0.4)',textAlign:'center',paddingVertical:20,lineHeight:22}}>{t('noSaved',lang)}</Text>
            :<ScrollView showsVerticalScrollIndicator={false}>
              {items.map(item=>(
                <View key={item.id} style={{backgroundColor:'#1A0800',borderRadius:12,padding:14,marginBottom:8,borderWidth:1,borderColor:'rgba(200,130,40,0.15)'}}>
                  <Text style={{fontSize:12,fontWeight:'700',color:'#F4A261',marginBottom:5}} numberOfLines={2}>{item.q}</Text>
                  <Text style={{fontSize:13,color:'#FDF6ED',lineHeight:20,marginBottom:5}} numberOfLines={4}>{item.a}</Text>
                  {item.src?<Text style={{fontSize:11,color:'#C9830A',fontStyle:'italic',marginBottom:8}}>{item.src}</Text>:null}
                  <View style={{flexDirection:'row',justifyContent:'flex-end',gap:12}}>
                    <TouchableOpacity onPress={()=>shareContent(item.q,item.a,item.src,lang)}><Text style={{fontSize:11,color:'#E8620A',fontWeight:'700'}}>📤 Share</Text></TouchableOpacity>
                    <TouchableOpacity onPress={()=>del(item.id)}><Text style={{fontSize:11,color:'#E74C3C',fontWeight:'600'}}>{t('delete',lang)}</Text></TouchableOpacity>
                  </View>
                </View>
              ))}
              <View style={{height:20}}/>
            </ScrollView>}
        </View>
      </View>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════
// PROFILE MODAL
// ════════════════════════════════════════════════════════
function ProfileModal({ visible, onClose, user, pts, streak, savedCount, lang, onLangChange, onUserUpdate }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCity, setEditCity] = useState('');
  const isH = lang === 'hindi';

  useEffect(()=>{ if(user&&visible){setEditName(user.name||'');setEditMobile(user.mobile||'');setEditEmail(user.email||'');setEditCity(user.birthCity||'');} },[user,visible]);
  if (!user) return null;

  const saveEdit = async()=>{
    const updated={...user,name:editName.trim()||user.name,mobile:editMobile,email:editEmail,birthCity:editCity};
    await AsyncStorage.setItem('dharmasetu_user',JSON.stringify(updated));
    onUserUpdate(updated); setEditing(false);
    Alert.alert('✅',isH?'Profile अपडेट हो गया!':'Profile updated!');
  };

  const BADGE_DATA=[{i:'🔱',n:'Bronze Trishul',pReq:0,dReq:7},{i:'🕉',n:'Silver Om',pReq:100,dReq:15},{i:'🪷',n:'Gold Lotus',pReq:300,dReq:30},{i:'⚔️',n:'Dharma Warrior',pReq:1000,dReq:100}];
  const earned=BADGE_DATA.filter(b=>pts>=b.pReq&&streak>=b.dReq);
  const current=earned.length>0?earned[earned.length-1]:BADGE_DATA[0];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.88)',justifyContent:'flex-end'}}>
        <View style={{backgroundColor:'#130700',borderRadius:28,margin:10,padding:24,borderWidth:1,borderColor:'rgba(240,165,0,0.2)',maxHeight:'93%'}}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
                <View style={{width:52,height:52,borderRadius:26,backgroundColor:'#6B21A8',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'rgba(240,165,0,0.4)'}}>
                  <Text style={{fontSize:22}}>🕉</Text>
                </View>
                <View>
                  <Text style={{fontSize:18,fontWeight:'700',color:'#FDF6ED'}}>{user.name}</Text>
                  <Text style={{fontSize:12,color:'#C9830A'}}>{user.rashi} · {user.deity}</Text>
                </View>
              </View>
              <View style={{flexDirection:'row',gap:8}}>
                <TouchableOpacity onPress={()=>setEditing(!editing)} style={{paddingHorizontal:12,paddingVertical:6,borderRadius:10,backgroundColor:'rgba(232,98,10,0.15)',borderWidth:1,borderColor:'rgba(232,98,10,0.3)'}}>
                  <Text style={{fontSize:12,color:'#F4A261',fontWeight:'700'}}>{editing?(isH?'रद्द':'Cancel'):'✏️ Edit'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={{width:32,height:32,borderRadius:16,backgroundColor:'rgba(255,255,255,0.1)',alignItems:'center',justifyContent:'center'}}>
                  <Text style={{fontSize:16,color:'#FDF6ED',fontWeight:'700'}}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {!editing&&(
              <View style={{marginBottom:14,gap:3}}>
                {user.mobile?<Text style={{fontSize:12,color:'rgba(253,246,237,0.35)'}}>📱 {user.mobile}</Text>:null}
                {user.email?<Text style={{fontSize:12,color:'rgba(253,246,237,0.35)'}}>📧 {user.email}</Text>:null}
                {user.birthCity?<Text style={{fontSize:12,color:'rgba(253,246,237,0.35)'}}>📍 {user.birthCity}</Text>:null}
              </View>
            )}

            {editing&&(
              <View style={{gap:10,marginBottom:16}}>
                {[
                  {label:isH?'पूरा नाम':'Full Name',val:editName,set:setEditName,kb:'default'},
                  {label:isH?'मोबाइल':'Mobile',val:editMobile,set:setEditMobile,kb:'phone-pad'},
                  {label:isH?'Email':'Email',val:editEmail,set:setEditEmail,kb:'email-address'},
                  {label:isH?'जन्म शहर':'Birth City',val:editCity,set:setEditCity,kb:'default'},
                ].map(f=>(
                  <View key={f.label}>
                    <Text style={{fontSize:11,color:'rgba(253,246,237,0.4)',marginBottom:4}}>{f.label}</Text>
                    <TextInput style={{backgroundColor:'rgba(255,255,255,0.06)',borderRadius:10,paddingHorizontal:14,paddingVertical:11,color:'#FDF6ED',fontSize:14,borderWidth:1,borderColor:'rgba(200,130,40,0.2)'}} value={f.val} onChangeText={f.set} keyboardType={f.kb}/>
                  </View>
                ))}
                <TouchableOpacity style={{backgroundColor:'#E8620A',borderRadius:12,paddingVertical:13,alignItems:'center',marginTop:4}} onPress={saveEdit}>
                  <Text style={{color:'#fff',fontWeight:'700',fontSize:14}}>{isH?'बदलाव सेव करें':'Save Changes'}</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{flexDirection:'row',backgroundColor:'rgba(255,255,255,0.04)',borderRadius:14,padding:14,marginBottom:12,borderWidth:1,borderColor:'rgba(240,165,0,0.1)'}}>
              {[{n:pts,l:'Points'},{n:streak,l:'Streak'},{n:savedCount,l:'Saved'}].map((ss,i)=>(
                <View key={i} style={{flex:1,alignItems:'center'}}>
                  <Text style={{fontSize:22,fontWeight:'800',color:'#E8620A'}}>{ss.n}</Text>
                  <Text style={{fontSize:11,color:'rgba(253,246,237,0.4)',marginTop:2}}>{ss.l}</Text>
                  {i<2&&<View style={{position:'absolute',right:0,height:'80%',width:1,backgroundColor:'rgba(240,165,0,0.15)',top:'10%'}}/>}
                </View>
              ))}
            </View>

            <View style={{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'rgba(255,255,255,0.04)',borderRadius:12,padding:12,marginBottom:14,borderWidth:1,borderColor:'rgba(240,165,0,0.1)'}}>
              <Text style={{fontSize:10,color:'rgba(253,246,237,0.4)'}}>{isH?'Badge:':'Badge:'}</Text>
              <Text style={{fontSize:20}}>{current.i}</Text>
              <Text style={{fontSize:12,fontWeight:'600',color:'#F4A261'}}>{current.n}</Text>
            </View>

            <Text style={{fontSize:11,color:'rgba(253,246,237,0.35)',marginBottom:6}}>{isH?'App भाषा:':'App Language:'}</Text>
            <View style={{flexDirection:'row',gap:8,marginBottom:16}}>
              {[{id:'hindi',label:'हिंदी'},{id:'english',label:'English'}].map(l=>(
                <TouchableOpacity key={l.id} style={{flex:1,paddingVertical:10,borderRadius:10,alignItems:'center',borderWidth:1.5,borderColor:lang===l.id?'#E8620A':'rgba(200,130,40,0.2)',backgroundColor:lang===l.id?'rgba(232,98,10,0.12)':'transparent'}} onPress={()=>onLangChange(l.id)}>
                  <Text style={{color:lang===l.id?'#F4A261':'rgba(253,246,237,0.4)',fontWeight:'700',fontSize:13}}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={{paddingVertical:12,borderRadius:12,backgroundColor:'rgba(231,76,60,0.1)',alignItems:'center',borderWidth:1,borderColor:'rgba(231,76,60,0.25)'}}
              onPress={()=>Alert.alert(t('logout',lang),isH?'क्या आप logout करना चाहते हैं?':'Do you want to logout?',[
                {text:t('cancel',lang),style:'cancel'},
                {text:t('logout',lang),style:'destructive',onPress:async()=>{await AsyncStorage.removeItem('dharmasetu_user');onClose();router.replace('/login');}}
              ])}>
              <Text style={{fontSize:14,color:'#E74C3C',fontWeight:'600'}}>{t('logout',lang)}</Text>
            </TouchableOpacity>
            <View style={{height:10}}/>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════
// MAIN HOME SCREEN
// ════════════════════════════════════════════════════════
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [lang, setLang] = useState('english');
  const [user, setUser] = useState(null);
  const [pts, setPts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [savedCount, setSaved] = useState(0);
  const [notifCount, setNotif] = useState(2);
  const [showKundli, setShowKundli] = useState(false);
  const [showMantra, setShowMantra] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;
  const omSc = useRef(new Animated.Value(1)).current;
  const omOp = useRef(new Animated.Value(0.85)).current;

  useEffect(()=>{
    (async()=>{
      const raw = await AsyncStorage.getItem('dharmasetu_user');
      const p = parseInt(await AsyncStorage.getItem('dharmasetu_pts')||'0',10);
      const sv = JSON.parse(await AsyncStorage.getItem('dharmasetu_saved')||'[]').length;
      setPts(p); setSaved(sv);
      if (raw) {
        const u = JSON.parse(raw);
        setUser(u); setLang(u.language||'english');
        const today = new Date().toDateString();
        const last = await AsyncStorage.getItem('dharmasetu_streak_date');
        const count = parseInt(await AsyncStorage.getItem('dharmasetu_streak_count')||'0',10);
        if (last===today) { setStreak(count); }
        else {
          const yesterday = new Date(Date.now()-86400000).toDateString();
          const newStreak = last===yesterday?count+1:1;
          setStreak(newStreak);
          await AsyncStorage.setItem('dharmasetu_streak_date',today);
          await AsyncStorage.setItem('dharmasetu_streak_count',String(newStreak));
          const lastCheckin = await AsyncStorage.getItem('dharmasetu_checkin');
          if (lastCheckin!==today) {
            await AsyncStorage.setItem('dharmasetu_checkin',today);
            const nPts=p+3; await AsyncStorage.setItem('dharmasetu_pts',String(nPts)); setPts(nPts);
          }
        }
      }
    })();
    Animated.parallel([
      Animated.timing(fadeAnim,{toValue:1,duration:600,useNativeDriver:true}),
      Animated.spring(slideAnim,{toValue:0,friction:7,tension:65,useNativeDriver:true}),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.parallel([Animated.timing(omSc,{toValue:1.07,duration:2100,useNativeDriver:true}),Animated.timing(omOp,{toValue:1,duration:2100,useNativeDriver:true})]),
      Animated.parallel([Animated.timing(omSc,{toValue:1,duration:2100,useNativeDriver:true}),Animated.timing(omOp,{toValue:0.85,duration:2100,useNativeDriver:true})]),
    ])).start();
  },[]);

  const handleLangChange = async(newLang)=>{
    setLang(newLang);
    if (user){const updated={...user,language:newLang};setUser(updated);await AsyncStorage.setItem('dharmasetu_user',JSON.stringify(updated));}
  };

  // KEY FIX: sends preset question to DharmaChat
  const goToChatWithQuestion = async(question, isFactCheck=false)=>{
    Vibration.vibrate(16);
    await AsyncStorage.setItem('dharmasetu_preset_question', question);
    if (isFactCheck) await AsyncStorage.setItem('dharmasetu_mode','factcheck');
    else await AsyncStorage.removeItem('dharmasetu_mode');
    router.push('/(tabs)/explore');
  };

  const goChat = ()=>{ Vibration.vibrate(18); router.push('/(tabs)/explore'); };

  const isH = lang === 'hindi';
  const verses = isH ? VERSES_HI : VERSES_EN;
  const trending = isH ? TRENDING_HI : TRENDING_EN;
  const verse = verses[new Date().getDay() % verses.length];

  const BADGE_DATA=[{i:'🔱',n:'Bronze Trishul',pReq:0,dReq:7},{i:'🕉',n:'Silver Om',pReq:100,dReq:15},{i:'🪷',n:'Gold Lotus',pReq:300,dReq:30},{i:'⚔️',n:'Dharma Warrior',pReq:1000,dReq:100}];
  const nextBadge = BADGE_DATA.find(b=>pts<b.pReq||streak<b.dReq)||BADGE_DATA[3];

  const showPtsInfo=()=>Alert.alert(t('howPoints',lang),
    isH?'👍 जवाब Like → +2 pts\n🔖 जवाब Save → +3 pts\n📅 रोज़ App खोलें → +3 pts\n📝 Feedback दें → +2 pts\n\n🔱 Bronze — 7 दिन\n🕉 Silver — 100pts+15 दिन\n🪷 Gold — 300pts+30 दिन\n⚔️ Warrior — 1000pts+100 दिन'
      :'👍 Like answer → +2 pts\n🔖 Save answer → +3 pts\n📅 Daily open → +3 pts\n📝 Give feedback → +2 pts\n\n🔱 Bronze — 7 days\n🕉 Silver — 100pts+15 days\n🪷 Gold — 300pts+30 days\n⚔️ Warrior — 1000pts+100 days',
    [{text:isH?'समझ गया 🙏':'Got it 🙏'}]
  );

  const showNotif=()=>{
    setNotif(0);
    const today = new Date();
    const todayISO = today.toISOString().slice(0,10);
    const todayStr = today.toLocaleDateString(isH?'hi-IN':'en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const allEvents=[...FESTIVALS_2025_2026.map(e=>({...e,type:'festival'})),...EKADASHI_2025_2026.map(e=>({...e,type:'ekadashi',deity:'Vishnu'}))];
    // Look 30 days ahead so upcoming festivals are always visible
    const next30 = Array.from({length:30},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()+i);return d.toISOString().slice(0,10);});
    const upcoming = allEvents.filter(e=>next30.includes(e.date)).sort((a,b)=>a.date.localeCompare(b.date));
    const todayEvents = upcoming.filter(e=>e.date===todayISO);
    const futureEvents = upcoming.filter(e=>e.date!==todayISO).slice(0,6);
    let msg=`📅 ${todayStr}\n\n`;
    if(todayEvents.length>0){
      msg+=isH?'🌟 आज:\n':'🌟 TODAY:\n';
      todayEvents.forEach(e=>{msg+=`• ${e.name}${e.deity?` (${e.deity})`:''}\n`;});
      msg+='\n';
    } else {
      msg+=isH?'☀️ आज कोई बड़ा पर्व नहीं।\n\n':'☀️ No major festival today.\n\n';
    }
    if(futureEvents.length>0){
      msg+=isH?'📆 आने वाले पर्व (अगले 30 दिन):\n':'📆 UPCOMING (next 30 days):\n';
      futureEvents.forEach(e=>{
        const d=new Date(e.date);
        const dStr=d.toLocaleDateString(isH?'hi-IN':'en-IN',{weekday:'short',day:'numeric',month:'short'});
        const daysAway=Math.round((d-today)/(1000*60*60*24));
        const badge=daysAway===1?(isH?'कल':'tomorrow'):daysAway===2?(isH?'परसों':'in 2 days'):`${daysAway}d`;
        msg+=`• ${dStr} (${badge}) — ${e.name}\n`;
      });
      msg+='\n';
    }
    msg+=isH?`🔥 Streak: ${streak} दिन!\n🛡️ नया Viral झूठ — DharmaChat में देखें!`:`🔥 Streak: ${streak} days!\n🛡️ Check latest viral lies in DharmaChat!`;
    Alert.alert(isH?'🔔 सूचनाएं और पंचांग':'🔔 Notifications & Hindu Calendar',msg,[{text:isH?'ठीक है 🙏':'OK 🙏'}]);
  };

  const onAction=(action)=>{
    Vibration.vibrate(16);
    if(action==='factcheck'){AsyncStorage.setItem('dharmasetu_mode','factcheck').then(()=>router.push('/(tabs)/explore'));}
    else if(action==='kundli'){if(!user){Alert.alert('',isH?'पहले profile complete करें।':'Complete your profile first.');return;}setShowKundli(true);}
    else if(action==='mantra') setShowMantra(true);
    else if(action==='saved') setShowSaved(true);
    else if(action==='katha') router.push('/katha_vault');
  };

  const ACTIONS=[
    {key:'factcheck',icon:'🛡️',title:t('factCheck',lang),    sub:t('factCheckSub',lang),    color:'#B04000'},
    {key:'kundli',   icon:'✨',title:t('myKundli',lang),      sub:t('myKundliSub',lang),      color:'#8B6914'},
    {key:'mantra',   icon:'📿',title:t('mantraLib',lang),     sub:t('mantraLibSub',lang),     color:'#1A5C1A'},
    {key:'saved',    icon:'🔖',title:t('savedAnswers',lang),  sub:t('savedAnswersSub',lang),  color:'#14386E'},
    {key:'katha',    icon:'📚',title:isH?'कथा वॉल्ट':'Katha Vault', sub:isH?'पवित्र ग्रंथ':'Sacred scriptures', color:'#3D1470'},
  ];

  return (
    <View style={[s.root,{paddingTop:insets.top}]}>
      <StatusBar style="light" backgroundColor="#0D0500" translucent={false}/>
      <ScrollView style={s.flex} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <Animated.View style={[s.hdr,{opacity:fadeAnim,transform:[{translateY:slideAnim}]}]}>
          <View style={s.flex}>
            <Text style={s.greet}>{t('greeting',lang)}</Text>
            <Text style={s.name}>{t('namaste',lang)} {user?.name||'Dharma Rakshak'}</Text>
            <Text style={s.sub}>{user?.rashi||'Mesh'} Rashi · {user?.deity||'Hanuman'}</Text>
          </View>
          <View style={s.hBtns}>
            <TouchableOpacity style={s.hBtn} onPress={showNotif}>
              <Text style={{fontSize:18}}>🔔</Text>
              {notifCount>0&&<View style={s.nBadge}><Text style={s.nBadgeTxt}>{notifCount}</Text></View>}
            </TouchableOpacity>
            <TouchableOpacity style={s.hBtn} onPress={()=>setShowProfile(true)}>
              <Text style={{fontSize:18}}>👤</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* HERO */}
        <Animated.View style={[s.hero,{opacity:fadeAnim}]}>
          <Animated.View style={[s.omBox,{transform:[{scale:omSc}],opacity:omOp}]}>
            <Text style={{fontSize:33}}>🕉</Text>
          </Animated.View>
          <Text style={s.heroTitle}>DharmaSetu</Text>
          <Text style={s.heroHindi}>धर्मसेतु — Bridge to Sanatan Dharma</Text>
          <Text style={s.heroDesc}>{isH?'शास्त्र, ज्योतिष, इतिहास — सब एक जगह।\nकोई भी सवाल — सच जवाब, शास्त्रीय प्रमाण।':'Shastras, Jyotish, history — all in one place.\nAsk anything. Get truth with shastriya proof.'}</Text>
          <TouchableOpacity style={s.heroBtn} onPress={goChat} activeOpacity={0.88}>
            <Text style={s.heroBtnTxt}>{t('startChat',lang)}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* STREAK */}
        <Animated.View style={[s.streak,{opacity:fadeAnim}]}>
          <Flame/>
          <View style={s.flex}>
            <Text style={s.strTitle}>{streak} {t('streak',lang)}</Text>
            <Text style={s.strSub}>{isH?`${nextBadge.n} के लिए ${Math.max(0,nextBadge.dReq-streak)} दिन`:`${Math.max(0,nextBadge.dReq-streak)} more days for ${nextBadge.n}`}</Text>
            <View style={s.barTrack}><View style={[s.barFill,{width:`${Math.min(100,(streak/nextBadge.dReq)*100)}%`}]}/></View>
          </View>
          <View>
            <Text style={s.pts}>{pts}</Text>
            <Text style={s.ptsSub}>{t('pts',lang)}</Text>
          </View>
        </Animated.View>

        <TouchableOpacity style={s.ptsInfo} onPress={showPtsInfo} activeOpacity={0.8}>
          <Text style={s.ptsInfoTxt}>{t('howPoints',lang)} →</Text>
        </TouchableOpacity>

        {/* QUICK ACTIONS */}
        <Text style={s.sec}>{t('quickActions',lang)}</Text>
        <View style={s.grid}>
          {ACTIONS.map(a=>(
            <TouchableOpacity key={a.key} style={[s.card,{borderColor:a.color+'30'}]} onPress={()=>onAction(a.key)} activeOpacity={0.85}>
              <View style={[s.cardIcon,{backgroundColor:a.color+'18'}]}><Text style={{fontSize:22}}>{a.icon}</Text></View>
              <Text style={s.cardTitle}>{a.title}</Text>
              <Text style={s.cardSub} numberOfLines={2}>{a.sub}</Text>
              {a.key==='saved'&&savedCount>0&&<View style={s.savedBadge}><Text style={s.savedBadgeTxt}>{savedCount}</Text></View>}
            </TouchableOpacity>
          ))}
        </View>

        {/* TODAY'S VERSE — FIXED: tapping sends to DharmaChat with full question */}
        <View style={s.verseCard}>
          <Text style={s.verseLabel}>{t('todayShloka',lang)}</Text>
          <Text style={s.verseTxt}>{verse.t}</Text>
          <Text style={s.verseSrc}>{verse.s}</Text>
          <View style={{flexDirection:'row',gap:8}}>
            <TouchableOpacity style={[s.verseBtn,{flex:1}]} onPress={()=>goToChatWithQuestion(verse.q,false)} activeOpacity={0.8}>
              <Text style={s.verseBtnTxt}>{t('understandChat',lang)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.verseBtn,{paddingHorizontal:14}]} onPress={()=>shareContent(verse.s,verse.t,verse.s,lang)} activeOpacity={0.8}>
              <Text style={s.verseBtnTxt}>📤</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* VIRAL JHOOT — FIXED: tapping sends to DharmaChat with fact check mode */}
        <Text style={s.sec}>{t('viralLies',lang)}</Text>
        {trending.map((item,i)=>(
          <TouchableOpacity key={i} style={s.trendCard}
            onPress={()=>goToChatWithQuestion(item.chatQ, item.fc)}
            activeOpacity={0.8}>
            <View style={s.flex}>
              <Text style={s.trendQ} numberOfLines={2}>{item.q}</Text>
              <Text style={s.trendTap}>{t('knowTruth',lang)}</Text>
            </View>
            <View style={[s.vBadge,{backgroundColor:item.c+'16',borderColor:item.c+'50'}]}>
              <Text style={[s.vTxt,{color:item.c}]}>{item.v}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* BADGES */}
        <Text style={s.sec}>{t('myBadges',lang)}</Text>
        <View style={s.badgeRow}>
          {BADGE_DATA.map((b,i)=>{
            const earned=pts>=b.pReq&&streak>=b.dReq;
            return(
              <TouchableOpacity key={i} style={[s.badge,!earned&&s.badgeLocked]} activeOpacity={0.8}
                onPress={()=>Alert.alert(b.i+' '+b.n,earned?(isH?'🎉 Badge earn हो गया!':'🎉 Badge earned!'):(isH?`चाहिए: ${b.pReq} pts + ${b.dReq} दिन\nआपके: ${pts} pts + ${streak} दिन`:`Need: ${b.pReq} pts + ${b.dReq} days\nYou: ${pts} pts + ${streak} days`),[{text:earned?'🕉 Jai Shri Ram!':(isH?'जारी रखें 🙏':'Keep going 🙏')}])}>
                <Text style={{fontSize:24,opacity:earned?1:0.2}}>{b.i}</Text>
                <Text style={[s.badgeName,!earned&&{opacity:0.2}]}>{b.n}</Text>
                {earned&&<View style={s.earnedDot}/>}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{height:24}}/>
      </ScrollView>

      <KundliModal visible={showKundli} onClose={()=>setShowKundli(false)} user={user} lang={lang}/>
      <MantraModal visible={showMantra} onClose={()=>setShowMantra(false)} lang={lang}/>
      <SavedModal visible={showSaved} onClose={()=>setShowSaved(false)} lang={lang} onCountChange={setSaved}/>
      <ProfileModal visible={showProfile} onClose={()=>setShowProfile(false)} user={user} pts={pts} streak={streak} savedCount={savedCount} lang={lang} onLangChange={handleLangChange} onUserUpdate={u=>{setUser(u);setLang(u.language||lang);}}/>
    </View>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#0D0500'}, flex:{flex:1},
  content:{padding:18,paddingTop:6},
  hdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18},
  greet:{fontSize:11,color:'#F4A261',letterSpacing:1.1,textTransform:'uppercase',marginBottom:4},
  name:{fontSize:22,fontWeight:'800',color:'#FDF6ED',marginBottom:3},
  sub:{fontSize:13,color:'#C9830A'},
  hBtns:{flexDirection:'row',gap:8,marginTop:2},
  hBtn:{width:40,height:40,borderRadius:12,backgroundColor:'#180800',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(240,165,0,0.15)'},
  nBadge:{position:'absolute',top:-2,right:-2,width:16,height:16,borderRadius:8,backgroundColor:'#E74C3C',alignItems:'center',justifyContent:'center'},
  nBadgeTxt:{fontSize:9,color:'#fff',fontWeight:'700'},
  hero:{backgroundColor:'#130700',borderRadius:22,padding:22,marginBottom:14,borderWidth:1,borderColor:'rgba(232,98,10,0.16)',alignItems:'center'},
  omBox:{width:66,height:66,borderRadius:18,backgroundColor:'#6B21A8',alignItems:'center',justifyContent:'center',marginBottom:12,elevation:6},
  heroTitle:{fontSize:27,fontWeight:'800',color:'#E8620A',marginBottom:4},
  heroHindi:{fontSize:13,color:'#F4A261',marginBottom:10},
  heroDesc:{fontSize:13,color:'rgba(253,246,237,0.5)',textAlign:'center',lineHeight:21,marginBottom:18},
  heroBtn:{backgroundColor:'#E8620A',paddingHorizontal:22,paddingVertical:14,borderRadius:16,width:'100%',alignItems:'center',elevation:5},
  heroBtnTxt:{color:'#fff',fontSize:15,fontWeight:'700'},
  streak:{backgroundColor:'#130700',borderRadius:16,padding:14,flexDirection:'row',alignItems:'center',gap:12,marginBottom:8,borderWidth:1,borderColor:'rgba(240,165,0,0.15)'},
  strTitle:{fontSize:15,fontWeight:'700',color:'#F4A261',marginBottom:2},
  strSub:{fontSize:11,color:'rgba(253,246,237,0.4)',marginBottom:8},
  barTrack:{height:5,backgroundColor:'rgba(255,255,255,0.07)',borderRadius:3,overflow:'hidden'},
  barFill:{height:5,backgroundColor:'#E8620A',borderRadius:3},
  pts:{fontSize:22,fontWeight:'800',color:'#C9830A',textAlign:'center'},
  ptsSub:{fontSize:10,color:'rgba(253,246,237,0.35)',textAlign:'center'},
  ptsInfo:{backgroundColor:'rgba(232,98,10,0.08)',borderRadius:10,paddingVertical:10,paddingHorizontal:14,marginBottom:20,borderWidth:1,borderColor:'rgba(232,98,10,0.15)',alignItems:'center'},
  ptsInfoTxt:{fontSize:12,color:'#F4A261',fontWeight:'600'},
  sec:{fontSize:15,fontWeight:'700',color:'#FDF6ED',marginBottom:12},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:22},
  card:{width:(SW-46)/2,backgroundColor:'#130700',borderRadius:16,borderWidth:1,padding:15,position:'relative'},
  cardIcon:{width:42,height:42,borderRadius:12,alignItems:'center',justifyContent:'center',marginBottom:10},
  cardTitle:{fontSize:13,fontWeight:'700',color:'#FDF6ED',marginBottom:2},
  cardSub:{fontSize:11,color:'rgba(253,246,237,0.38)',lineHeight:15},
  savedBadge:{position:'absolute',top:8,right:8,width:20,height:20,borderRadius:10,backgroundColor:'#E8620A',alignItems:'center',justifyContent:'center'},
  savedBadgeTxt:{fontSize:10,color:'#fff',fontWeight:'700'},
  verseCard:{backgroundColor:'#130700',borderRadius:18,padding:18,marginBottom:22,borderWidth:1,borderColor:'rgba(240,165,0,0.13)'},
  verseLabel:{fontSize:12,fontWeight:'700',color:'#C9830A',textTransform:'uppercase',letterSpacing:0.8,marginBottom:10},
  verseTxt:{fontSize:14,color:'#FDF6ED',fontStyle:'italic',lineHeight:23,marginBottom:8},
  verseSrc:{fontSize:12,color:'#C9830A',marginBottom:14},
  verseBtn:{backgroundColor:'rgba(232,98,10,0.1)',borderRadius:10,paddingVertical:10,alignItems:'center',borderWidth:1,borderColor:'rgba(232,98,10,0.18)'},
  verseBtnTxt:{fontSize:12,color:'#F4A261',fontWeight:'600'},
  trendCard:{backgroundColor:'#130700',borderRadius:14,padding:14,flexDirection:'row',alignItems:'center',gap:12,marginBottom:8,borderWidth:1,borderColor:'rgba(200,130,40,0.1)'},
  trendQ:{fontSize:13,color:'#FDF6ED',lineHeight:19,marginBottom:4},
  trendTap:{fontSize:11,color:'#E8620A',fontWeight:'600'},
  vBadge:{paddingHorizontal:10,paddingVertical:5,borderRadius:8,borderWidth:1,flexShrink:0},
  vTxt:{fontSize:11,fontWeight:'800',letterSpacing:0.5},
  badgeRow:{flexDirection:'row',gap:10},
  badge:{flex:1,backgroundColor:'#130700',borderRadius:14,padding:12,alignItems:'center',borderWidth:1,borderColor:'rgba(240,165,0,0.22)'},
  badgeLocked:{borderColor:'rgba(200,130,40,0.07)',backgroundColor:'#0F0500'},
  badgeName:{fontSize:10,color:'#C9830A',textAlign:'center',fontWeight:'600',lineHeight:14,marginTop:6},
  earnedDot:{width:6,height:6,borderRadius:3,backgroundColor:'#27AE60',marginTop:4},
});