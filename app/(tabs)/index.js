// ════════════════════════════════════════════════════════
// DharmaSetu — Home Screen — Phase 1 FINAL
// Full language support: ALL text in user's selected language
// My Kundli: Phase 1 (working)
// Mantra Verify: Phase 1 (working)
// Points system: corrected (no points for asking questions)
// ════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions, Modal,
  StatusBar as RNStatusBar,
  ScrollView,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View
} from 'react-native';

const { width: SW } = Dimensions.get('window');
const SB_H = RNStatusBar.currentHeight || 0;

// ════════════════════════════════════════════════════════
// TRANSLATIONS — Every UI string in Hindi and English
// ════════════════════════════════════════════════════════
const T = {
  greeting:        { en: 'Jai Shri Ram', hi: 'जय श्री राम' },
  namaste:         { en: 'Welcome,',     hi: 'नमस्ते,' },
  startChat:       { en: 'Start DharmaChat →', hi: 'DharmaChat शुरू करें →' },
  streak:          { en: 'Day Streak',   hi: 'दिन का Streak' },
  daysMore:        { en: 'more days for', hi: 'दिन और' },
  pts:             { en: 'pts',          hi: 'pts' },
  howPoints:       { en: '⚡ How to earn points? Learn →', hi: '⚡ Points कैसे मिलते हैं? जानें →' },
  quickActions:    { en: 'Quick Actions', hi: 'Quick Actions' },
  todayShloka:     { en: "📖 TODAY'S VERSE", hi: '📖 आज का श्लोक' },
  understandChat:  { en: 'Understand this in DharmaChat →', hi: 'इसका मतलब DharmaChat में समझें →' },
  viralLies:       { en: '🔥 Viral Lies — Now Expose the Truth', hi: '🔥 Viral झूठ — अब उठें सच' },
  knowTruth:       { en: 'Know the truth →', hi: 'सच जानें →' },
  myBadges:        { en: 'Your Badges', hi: 'आपके Badges' },
  ptsSystem:       { en: '⚡ Dharma Points System', hi: '⚡ Dharma Points System' },
  ptsBody_en: `Earn points for:\n\n👍 Like an answer → +2 pts\n🔖 Save an answer → +2 pts\n📅 Open app daily → +3 pts\n📝 Give feedback → points based on quality\n\nBadge Milestones:\n🔱 Bronze Trishul — 7 day streak\n🕉 Silver Om — 100+ pts + 15 days\n🪷 Gold Lotus — 300+ pts + 30 days\n⚔️ Dharma Warrior — 1000+ pts + 100 days`,
  ptsBody_hi: `Points इन तरीकों से मिलते हैं:\n\n👍 जवाब Like करें → +2 pts\n🔖 जवाब Save करें → +2 pts\n📅 रोज़ App खोलें → +3 pts\n📝 Feedback दें → quality के अनुसार points\n\nBadge Milestones:\n🔱 Bronze Trishul — 7 दिन streak\n🕉 Silver Om — 100+ pts + 15 दिन\n🪷 Gold Lotus — 300+ pts + 30 दिन\n⚔️ Dharma Warrior — 1000+ pts + 100 दिन`,
  gotIt:           { en: 'Got it 🙏', hi: 'समझ गया 🙏' },
  notifTitle:      { en: '🔔 Notifications', hi: '🔔 Notifications' },
  ok:              { en: 'OK 🙏', hi: 'ठीक है 🙏' },
  factCheck:       { en: 'Fact Check', hi: 'Fact Check' },
  factCheckSub:    { en: 'Verify any claim', hi: 'कोई भी claim verify करें' },
  myKundli:        { en: 'My Kundli', hi: 'My Kundli' },
  myKundliSub:     { en: 'Deity, mantra & guidance', hi: 'Deity, mantra और मार्गदर्शन' },
  mantraVerify:    { en: 'Mantra Verify', hi: 'Mantra Verify' },
  mantraVerifySub: { en: 'Learn mantra meanings', hi: 'Mantra meanings जानें' },
  savedAnswers:    { en: 'Saved Answers', hi: 'Saved Answers' },
  savedAnswersSub: { en: 'Your saved library', hi: 'आपकी saved library' },
  noSaved:         { en: 'No saved answers yet. Tap 🔖 in DharmaChat to save answers.', hi: 'अभी कोई saved answer नहीं है। DharmaChat में 🔖 tap करें।' },
  delete:          { en: 'Delete', hi: 'Delete' },
  logout:          { en: 'Logout', hi: 'Logout' },
  logoutConfirm:   { en: 'Do you want to logout?', hi: 'क्या आप logout करना चाहते हैं?' },
  cancel:          { en: 'Cancel', hi: 'Cancel' },
  coming:          { en: 'Coming soon in Phase 2', hi: 'Phase 2 में आएगा' },
  // Kundli screen
  myKundliTitle:   { en: 'My Kundli', hi: 'मेरी कुंडली' },
  rashi:           { en: 'Moon Sign (Rashi)', hi: 'राशि' },
  planet:          { en: 'Ruling Planet', hi: 'स्वामी ग्रह' },
  deity:           { en: 'Your Deity', hi: 'आपके देव' },
  mantra:          { en: 'Personal Mantra', hi: 'व्यक्तिगत मंत्र' },
  luckyColor:      { en: 'Lucky Color', hi: 'शुभ रंग' },
  luckyDay:        { en: 'Lucky Day', hi: 'शुभ दिन' },
  gem:             { en: 'Lucky Gemstone', hi: 'रत्न' },
  nakshatra:       { en: 'Birth Star', hi: 'नक्षत्र' },
  personality:     { en: 'Personality', hi: 'व्यक्तित्व' },
  career:          { en: 'Career Guidance', hi: 'करियर मार्गदर्शन' },
  health:          { en: 'Health Guidance', hi: 'स्वास्थ्य मार्गदर्शन' },
  remedy:          { en: 'Remedy & Worship', hi: 'उपाय और पूजा' },
  // Mantra screen
  searchMantra:    { en: 'Search mantras...', hi: 'Mantras खोजें...' },
  mantraTitle:     { en: 'Mantra Library', hi: 'Mantra Library' },
  meaning:         { en: 'Meaning', hi: 'अर्थ' },
  when:            { en: 'When to chant', hi: 'कब जपें' },
  source:          { en: 'Source', hi: 'स्रोत' },
};

function t(key, lang) { return T[key]?.[lang === 'hindi' ? 'hi' : 'en'] || T[key]?.en || key; }

// ════════════════════════════════════════════════════════
// KUNDLI DATA PER RASHI
// ════════════════════════════════════════════════════════
const KUNDLI_INSIGHTS = {
  Mesh: {
    personality_en: 'You are naturally energetic, courageous, and a born leader. Mars gives you fierce determination and passion. You act first and think later — your confidence inspires others. Be mindful of anger and impatience.',
    personality_hi: 'आप स्वभाव से ऊर्जावान, साहसी और जन्मजात नेता हैं। मंगल आपको तीव्र संकल्प और जोश देता है। आप पहले कार्य करते हैं — आपका आत्मविश्वास दूसरों को प्रेरित करता है। क्रोध और अधीरता से सावधान रहें।',
    career_en: 'Excellent in leadership, military, sports, engineering, surgery, and entrepreneurship. You thrive when you are in charge. Avoid monotonous desk jobs.',
    career_hi: 'नेतृत्व, खेल, इंजीनियरिंग, सर्जरी, और उद्यमिता में उत्कृष्ट। आप तब सर्वश्रेष्ठ होते हैं जब आप प्रभारी होते हैं। नीरस काम से बचें।',
    health_en: 'Be careful about head, blood pressure, and fever. Regular exercise is essential for you. Avoid excessive heat and spicy food.',
    health_hi: 'सिर, रक्तचाप और बुखार का ध्यान रखें। नियमित व्यायाम आपके लिए आवश्यक है। अधिक गर्मी और मसालेदार भोजन से बचें।',
    remedy_en: 'Visit Hanuman temple every Tuesday. Chant "ॐ अं अंगारकाय नमः" 108 times at sunrise. Offer red flowers to Lord Hanuman. Donate red lentils (masoor dal) on Tuesdays. Wear red on Tuesdays.',
    remedy_hi: 'हर मंगलवार हनुमान मंदिर जाएं। सूर्योदय पर "ॐ अं अंगारकाय नमः" 108 बार जपें। भगवान हनुमान को लाल फूल चढ़ाएं। मंगलवार को मसूर दाल दान करें। मंगलवार को लाल वस्त्र पहनें।',
  },
  Vrishabh: {
    personality_en: 'Reliable, patient, and deeply sensual. Venus blesses you with beauty, art, and love for luxury. You are persistent and stubborn — when you commit, you deliver. Highly materialistic but deeply loyal.',
    personality_hi: 'विश्वसनीय, धैर्यवान और गहन संवेदनशील। शुक्र आपको सौंदर्य, कला और विलासिता का प्रेम देता है। आप दृढ़ हैं — जब आप प्रतिबद्ध होते हैं, तो पूरा करते हैं।',
    career_en: 'Finance, banking, art, music, luxury goods, agriculture, real estate. You excel in stable, long-term careers.',
    career_hi: 'वित्त, बैंकिंग, कला, संगीत, विलासिता वस्तुएं, कृषि, रियल एस्टेट। आप स्थिर, दीर्घकालिक करियर में उत्कृष्ट हैं।',
    health_en: 'Watch throat, thyroid, and weight. Avoid overindulgence in food. Regular walks and light exercise help.',
    health_hi: 'गला, थायरॉइड और वजन का ध्यान रखें। खाने में अधिकता से बचें। नियमित सैर और हल्का व्यायाम सहायक है।',
    remedy_en: 'Visit Lakshmi temple on Fridays. Chant "ॐ शुं शुक्राय नमः" 108 times. Offer white flowers. Donate white sweets on Fridays. Wear white or cream on Fridays.',
    remedy_hi: 'शुक्रवार को लक्ष्मी मंदिर जाएं। "ॐ शुं शुक्राय नमः" 108 बार जपें। सफेद फूल चढ़ाएं। शुक्रवार को सफेद मिठाई दान करें। शुक्रवार को सफेद या क्रीम रंग पहनें।',
  },
  Simha: {
    personality_en: 'Royal, charismatic, and natural leader. Sun gives you radiance and authority. You love being center stage and inspiring others. Pride can be your weakness — cultivate humility.',
    personality_hi: 'शाही, करिश्माई और स्वाभाविक नेता। सूर्य आपको तेज और अधिकार देता है। आप केंद्र में रहना और दूसरों को प्रेरित करना पसंद करते हैं। अभिमान आपकी कमज़ोरी हो सकती है।',
    career_en: 'Government, politics, management, theater, entertainment, luxury brands, teaching. You are born to lead and inspire.',
    career_hi: 'सरकार, राजनीति, प्रबंधन, रंगमंच, मनोरंजन, लक्जरी ब्रांड, शिक्षण। आप नेतृत्व करने और प्रेरित करने के लिए जन्मे हैं।',
    health_en: 'Heart and spine are vulnerable. Avoid excessive pride-related stress. Regular sunlight exposure and physical activity.',
    health_hi: 'हृदय और रीढ़ की हड्डी संवेदनशील हैं। अत्यधिक तनाव से बचें। नियमित धूप और शारीरिक गतिविधि।',
    remedy_en: 'Visit Sun temple every Sunday. Chant "ॐ घृणि सूर्याय नमः" facing east at sunrise. Offer water with red flowers to Sun. Donate wheat on Sundays. Wear gold/orange on Sundays.',
    remedy_hi: 'रविवार को सूर्य मंदिर जाएं। सूर्योदय पर पूर्व दिशा में "ॐ घृणि सूर्याय नमः" जपें। लाल फूलों के साथ सूर्य को जल अर्पित करें। रविवार को गेहूं दान करें। रविवार को सोना/नारंगी पहनें।',
  },
};

// Generic for rashis we don't have detailed data for
function getKundliInsight(rashi, lang) {
  const data = KUNDLI_INSIGHTS[rashi];
  if (!data) {
    return {
      personality: lang === 'hindi' ? 'आपकी राशि के अनुसार आप बुद्धिमान, संवेदनशील और धार्मिक प्रवृत्ति के हैं। अपने इष्ट देव की उपासना नियमित रूप से करें।' : 'According to your Rashi, you are intelligent, sensitive, and spiritually inclined. Regular worship of your deity brings peace and success.',
      career: lang === 'hindi' ? 'आपके लिए सेवा, शिक्षा, और रचनात्मक क्षेत्र उपयुक्त हैं।' : 'Service, education, and creative fields are best suited for you.',
      health: lang === 'hindi' ? 'नियमित योग और प्राणायाम आपके स्वास्थ्य के लिए लाभकारी है।' : 'Regular yoga and pranayama are beneficial for your health.',
      remedy: lang === 'hindi' ? 'अपने इष्ट देव का मंत्र रोज़ 108 बार जपें। नियमित मंदिर जाएं और दान करें।' : 'Chant your deity\'s mantra 108 times daily. Visit temple regularly and practice charity.',
    };
  }
  return {
    personality: lang === 'hindi' ? data.personality_hi : data.personality_en,
    career:      lang === 'hindi' ? data.career_hi      : data.career_en,
    health:      lang === 'hindi' ? data.health_hi      : data.health_en,
    remedy:      lang === 'hindi' ? data.remedy_hi      : data.remedy_en,
  };
}

// ════════════════════════════════════════════════════════
// MANTRA DATABASE — 20 essential mantras
// ════════════════════════════════════════════════════════
const MANTRAS = [
  { id: '1', sanskrit: 'ॐ नमः शिवाय', name: 'Om Namah Shivaya', deity: 'Shiva', meaning_en: 'I bow to Lord Shiva — the pure consciousness within all beings.', meaning_hi: 'मैं भगवान शिव को प्रणाम करता हूँ — सभी प्राणियों में शुद्ध चेतना।', when_en: 'Daily, any time. Especially powerful on Mondays and during Pradosh Kaal.', when_hi: 'प्रतिदिन, कभी भी। विशेष रूप से सोमवार और प्रदोष काल में।', source: 'Shri Rudrashtadhyayi', category: 'Shiva' },
  { id: '2', sanskrit: 'ॐ नमो भगवते वासुदेवाय', name: 'Om Namo Bhagavate Vasudevaya', deity: 'Vishnu/Krishna', meaning_en: 'I bow to Lord Vasudeva — Krishna, who dwells in the hearts of all.', meaning_hi: 'मैं भगवान वासुदेव — कृष्ण को प्रणाम करता हूँ जो सभी के हृदय में निवास करते हैं।', when_en: 'Morning after bath. On Thursdays and Ekadashi.', when_hi: 'स्नान के बाद सुबह। गुरुवार और एकादशी पर।', source: 'Vishnu Purana', category: 'Vishnu' },
  { id: '3', sanskrit: 'ॐ घृणि सूर्याय नमः', name: 'Om Ghrini Suryaya Namah', deity: 'Surya Dev', meaning_en: 'I bow to the radiant Sun God who illuminates the universe.', meaning_hi: 'मैं तेजस्वी सूर्य देव को प्रणाम करता हूँ जो ब्रह्मांड को प्रकाशित करते हैं।', when_en: 'At sunrise, facing east. Especially on Sundays.', when_hi: 'सूर्योदय पर, पूर्व दिशा में। विशेष रूप से रविवार को।', source: 'Aditya Hridayam, Ramayana', category: 'Surya' },
  { id: '4', sanskrit: 'ॐ अं अंगारकाय नमः', name: 'Om An Angarakaya Namah', deity: 'Hanuman/Mangal', meaning_en: 'Salutation to Mars (Mangal) — the planet of energy, courage, and action.', meaning_hi: 'मंगल ग्रह को नमन — ऊर्जा, साहस और कार्य के ग्रह को।', when_en: 'On Tuesdays at sunrise. Also chant before any new initiative.', when_hi: 'मंगलवार को सूर्योदय पर। किसी भी नए कार्य से पहले जपें।', source: 'Navagraha Stotra', category: 'Hanuman' },
  { id: '5', sanskrit: 'ॐ गं गणपतये नमः', name: 'Om Gam Ganapataye Namah', deity: 'Ganesh', meaning_en: 'I bow to Lord Ganesha, the remover of all obstacles.', meaning_hi: 'मैं भगवान गणेश को प्रणाम करता हूँ, सभी बाधाओं के हर्ता।', when_en: 'Before any new work, journey, or important task. On Wednesdays.', when_hi: 'किसी भी नए काम, यात्रा या महत्वपूर्ण कार्य से पहले। बुधवार को।', source: 'Ganapati Atharva Sheersham', category: 'Ganesh' },
  { id: '6', sanskrit: 'ॐ ऐं सरस्वत्यै नमः', name: 'Om Aim Saraswatyai Namah', deity: 'Saraswati', meaning_en: 'I bow to Goddess Saraswati — the deity of knowledge, wisdom, and arts.', meaning_hi: 'मैं माँ सरस्वती को प्रणाम करती हूँ — ज्ञान, विद्या और कलाओं की देवी।', when_en: 'Before studying, learning, or creative work. On Saturdays and Panchami.', when_hi: 'पढ़ाई, सीखने या रचनात्मक कार्य से पहले। शनिवार और पंचमी को।', source: 'Saraswati Vandana, Rigveda', category: 'Saraswati' },
  { id: '7', sanskrit: 'ॐ श्रीं महालक्ष्म्यै नमः', name: 'Om Shreem Mahalakshmyai Namah', deity: 'Lakshmi', meaning_en: 'I bow to Mahalakshmi, the goddess of prosperity, wealth, and fortune.', meaning_hi: 'मैं महालक्ष्मी को प्रणाम करती हूँ, समृद्धि, धन और भाग्य की देवी।', when_en: 'On Fridays and on Diwali. After sunset, facing north.', when_hi: 'शुक्रवार को और दीवाली पर। सूर्यास्त के बाद, उत्तर दिशा में।', source: 'Sri Suktam, Rigveda', category: 'Lakshmi' },
  { id: '8', sanskrit: 'ॐ ह्रीं दुर्गायै नमः', name: 'Om Hreem Durgayai Namah', deity: 'Durga', meaning_en: 'I bow to Goddess Durga — the invincible mother who protects her devotees.', meaning_hi: 'मैं माँ दुर्गा को प्रणाम करती हूँ — अजेय माँ जो अपने भक्तों की रक्षा करती हैं।', when_en: 'During Navratri, Tuesdays and Fridays. For protection and courage.', when_hi: 'नवरात्रि, मंगलवार और शुक्रवार को। सुरक्षा और साहस के लिए।', source: 'Devi Mahatmyam (Durga Saptashati)', category: 'Durga' },
  { id: '9', sanskrit: 'ॐ हनुमते नमः', name: 'Om Hanumate Namah', deity: 'Hanuman', meaning_en: 'I bow to Lord Hanuman — the epitome of devotion, strength, and service.', meaning_hi: 'मैं भगवान हनुमान को प्रणाम करता हूँ — भक्ति, शक्ति और सेवा के प्रतीक।', when_en: 'On Tuesdays and Saturdays. Chant 108 times for strength and protection.', when_hi: 'मंगलवार और शनिवार को। शक्ति और सुरक्षा के लिए 108 बार जपें।', source: 'Hanuman Chalisa, Valmiki Ramayana', category: 'Hanuman' },
  { id: '10', sanskrit: 'ॐ कृष्णाय नमः', name: 'Om Krishnaya Namah', deity: 'Krishna', meaning_en: 'I bow to Lord Krishna — the supreme divine teacher of the Bhagavad Gita.', meaning_hi: 'मैं भगवान कृष्ण को प्रणाम करता हूँ — भगवद्गीता के परम दिव्य गुरु।', when_en: 'On Thursdays and Ekadashi. Especially at night for peace.', when_hi: 'गुरुवार और एकादशी को। शांति के लिए विशेष रूप से रात को।', source: 'Bhagavad Gita, Shrimad Bhagavatam', category: 'Vishnu' },
  { id: '11', sanskrit: 'गायत्री मंत्र: ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात्', name: 'Gayatri Mantra', deity: 'Surya/Universal', meaning_en: 'We meditate on the divine light of the Sun. May it illumine our intellect.', meaning_hi: 'हम सूर्य के दिव्य प्रकाश पर ध्यान करते हैं। वह हमारी बुद्धि को प्रकाशित करे।', when_en: 'At sunrise, noon, and sunset (Sandhyavandanam). 108 times minimum.', when_hi: 'सूर्योदय, दोपहर और सूर्यास्त पर (संध्यावंदनम)। न्यूनतम 108 बार।', source: 'Rigveda 3.62.10', category: 'Universal' },
  { id: '12', sanskrit: 'ॐ नमो नारायणाय', name: 'Om Namo Narayanaya', deity: 'Vishnu', meaning_en: 'I take refuge in Lord Narayana — the preserver and sustainer of all creation.', meaning_hi: 'मैं भगवान नारायण की शरण लेता हूँ — सम्पूर्ण सृष्टि के पालक।', when_en: 'Morning prayers. On Ekadashi and Vaikuntha Ekadashi especially.', when_hi: 'प्रातःकालीन पूजा। विशेष रूप से एकादशी और वैकुण्ठ एकादशी पर।', source: 'Vishnu Sahasranama, Mahabharata', category: 'Vishnu' },
  { id: '13', sanskrit: 'ॐ शं शनैश्चराय नमः', name: 'Om Shan Shanaishcharaya Namah', deity: 'Shani Dev', meaning_en: 'Salutation to Lord Shani — the planet of karma, justice, and discipline.', meaning_hi: 'भगवान शनि को नमन — कर्म, न्याय और अनुशासन के ग्रह।', when_en: 'On Saturdays, at sunset. For relief from Shani Sade Sati.', when_hi: 'शनिवार को, सूर्यास्त पर। शनि साढ़ेसाती से राहत के लिए।', source: 'Navagraha Stotra', category: 'Shani' },
  { id: '14', sanskrit: 'ॐ राम रामाय नमः', name: 'Om Ram Ramaya Namah', deity: 'Ram', meaning_en: 'I bow to Lord Ram — the embodiment of dharma, truth, and righteousness.', meaning_hi: 'मैं भगवान राम को प्रणाम करता हूँ — धर्म, सत्य और न्याय के मूर्त रूप।', when_en: 'Daily morning prayers. On Sundays and Ram Navami.', when_hi: 'प्रतिदिन प्रातःकालीन पूजा। रविवार और रामनवमी पर।', source: 'Valmiki Ramayana', category: 'Ram' },
  { id: '15', sanskrit: 'ॐ ऐं क्लीं सौः', name: 'Om Aim Kleem Sauh (Tridevi Mantra)', deity: 'Tridevi', meaning_en: 'The combined energy of Saraswati, Lakshmi, and Kali — wisdom, wealth, and power.', meaning_hi: 'सरस्वती, लक्ष्मी और काली की संयुक्त शक्ति — ज्ञान, धन और शक्ति।', when_en: 'During Navratri. For women seeking empowerment and divine feminine energy.', when_hi: 'नवरात्रि के दौरान। शक्ति और दिव्य स्त्री ऊर्जा के लिए।', source: 'Tantrasara, Devi Bhagavatam', category: 'Shakti' },
  { id: '16', sanskrit: 'सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः', name: 'Sarve Bhavantu Sukhinah', deity: 'Universal', meaning_en: 'May all beings be happy. May all be free from illness. May all see goodness, may none suffer.', meaning_hi: 'सभी सुखी हों। सभी रोगमुक्त हों। सभी शुभ देखें, कोई दुख न पाए।', when_en: 'Daily, as a universal prayer for world peace and all beings.', when_hi: 'प्रतिदिन, विश्व शांति और सभी प्राणियों के लिए सार्वभौमिक प्रार्थना के रूप में।', source: 'Brihadaranyaka Upanishad', category: 'Universal' },
  { id: '17', sanskrit: 'ॐ तत्सत्', name: 'Om Tat Sat', deity: 'Brahman (Universal)', meaning_en: 'Om — That — Truth. The three-word affirmation of the Supreme Reality from Bhagavad Gita.', meaning_hi: 'ॐ — वह — सत्य। भगवद्गीता से परम सत्य की त्रि-शब्द पुष्टि।', when_en: 'Before starting any sacred work. As an affirmation of divine truth.', when_hi: 'किसी भी पवित्र कार्य से पहले। दिव्य सत्य की पुष्टि के रूप में।', source: 'Bhagavad Gita 17.23', category: 'Universal' },
  { id: '18', sanskrit: 'ॐ मणिपद्मे हुम्', name: 'Om Mani Padme Hum', deity: 'Compassion (Universal)', meaning_en: 'The jewel in the lotus — invoking compassion, wisdom, and enlightenment.', meaning_hi: 'कमल में रत्न — करुणा, ज्ञान और प्रबोधन का आह्वान।', when_en: 'For peace of mind, compassion, and inner calm. Any time.', when_hi: 'मन की शांति, करुणा और आंतरिक शांति के लिए। कभी भी।', source: 'Ancient Buddhist-Hindu shared tradition', category: 'Universal' },
  { id: '19', sanskrit: 'असतो मा सद्गमय, तमसो मा ज्योतिर्गमय, मृत्योर्मा अमृतं गमय', name: 'Asato Ma Sadgamaya', deity: 'Universal', meaning_en: 'Lead me from untruth to truth, from darkness to light, from death to immortality.', meaning_hi: 'मुझे असत्य से सत्य की ओर, अंधकार से प्रकाश की ओर, मृत्यु से अमृत की ओर ले जाओ।', when_en: 'Morning prayer. Before meditation and spiritual study.', when_hi: 'प्रातःकालीन प्रार्थना। ध्यान और आध्यात्मिक अध्ययन से पहले।', source: 'Brihadaranyaka Upanishad 1.3.28', category: 'Universal' },
  { id: '20', sanskrit: 'ॐ शांतिः शांतिः शांतिः', name: 'Om Shanti Shanti Shanti', deity: 'Universal', meaning_en: 'Peace in body, mind, and spirit. The triple peace invocation from Upanishads.', meaning_hi: 'शरीर, मन और आत्मा में शांति। उपनिषदों से त्रि-शांति का आह्वान।', when_en: 'At the end of any prayer, meditation, or ceremony.', when_hi: 'किसी भी प्रार्थना, ध्यान या समारोह के अंत में।', source: 'Multiple Upanishads', category: 'Universal' },
];

// ════════════════════════════════════════════════════════
// VERSES
// ════════════════════════════════════════════════════════
const VERSES_EN = [
  { t: '"Do your duty without attachment to results."', s: 'Bhagavad Gita · 2.47' },
  { t: '"The soul is never born, nor does it ever die."', s: 'Bhagavad Gita · 2.20' },
  { t: '"May noble thoughts come to us from every direction."', s: 'Rigveda · 1.89.1' },
  { t: '"Truth alone triumphs, not falsehood."', s: 'Mundaka Upanishad · 3.1.6' },
  { t: '"The entire world is one family."', s: 'Maha Upanishad · 6.71' },
  { t: '"Non-violence is the highest duty."', s: 'Mahabharata · 115.1' },
  { t: '"Whenever righteousness declines, I manifest myself."', s: 'Bhagavad Gita · 4.7' },
];
const VERSES_HI = [
  { t: '"कर्म करो, फल की चिंता मत करो।"', s: 'भगवद्गीता · 2.47' },
  { t: '"आत्मा कभी जन्म नहीं लेती, कभी मरती नहीं।"', s: 'भगवद्गीता · 2.20' },
  { t: '"सभी दिशाओं से शुभ विचार आएं।"', s: 'ऋग्वेद · 1.89.1' },
  { t: '"सत्यमेव जयते — सत्य ही जीतता है।"', s: 'मुंडक उपनिषद् · 3.1.6' },
  { t: '"वसुधैव कुटुम्बकम् — पूरा विश्व एक परिवार है।"', s: 'महा उपनिषद् · 6.71' },
  { t: '"अहिंसा परमो धर्मः — अहिंसा सर्वोच्च धर्म है।"', s: 'महाभारत · 115.1' },
  { t: '"यदा यदा हि धर्मस्य — जब भी धर्म का क्षय होता है, मैं अवतार लेता हूँ।"', s: 'भगवद्गीता · 4.7' },
];

const TRENDING_EN = [
  { q: 'Is the Bheel community not Hindu?', v: 'FALSE', c: '#C0392B' },
  { q: 'Aryan Invasion Theory — Is it true?', v: 'FALSE', c: '#C0392B' },
  { q: 'Did Ram kill Shambuka due to caste?', v: 'FALSE', c: '#C0392B' },
  { q: 'Is there a scientific basis for Om?', v: 'TRUE', c: '#27AE60' },
];
const TRENDING_HI = [
  { q: 'क्या भील समुदाय हिंदू नहीं है?', v: 'झूठ', c: '#C0392B' },
  { q: 'आर्य आक्रमण सिद्धांत — क्या यह सच है?', v: 'झूठ', c: '#C0392B' },
  { q: 'राम ने जाति के कारण शम्बूक को मारा?', v: 'झूठ', c: '#C0392B' },
  { q: 'ओम का कोई वैज्ञानिक आधार है?', v: 'सच', c: '#27AE60' },
];

// ════════════════════════════════════════════════════════
// ANIMATED FLAME
// ════════════════════════════════════════════════════════
function Flame() {
  const sc = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(sc, { toValue: 1.15, duration: 480, useNativeDriver: true }),
      Animated.timing(sc, { toValue: 0.94, duration: 380, useNativeDriver: true }),
      Animated.timing(sc, { toValue: 1, duration: 440, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.Text style={{ fontSize: 32, transform: [{ scale: sc }] }}>🔥</Animated.Text>;
}

// ════════════════════════════════════════════════════════
// MY KUNDLI MODAL
// ════════════════════════════════════════════════════════
function KundliModal({ visible, onClose, user, lang }) {
  if (!user) return null;
  const insight = getKundliInsight(user.rashi, lang);
  const isEn = lang !== 'hindi';
  const RASHI_ENG = { Mesh: 'Aries', Vrishabh: 'Taurus', Mithun: 'Gemini', Kark: 'Cancer', Simha: 'Leo', Kanya: 'Virgo', Tula: 'Libra', Vrishchik: 'Scorpio', Dhanu: 'Sagittarius', Makar: 'Capricorn', Kumbh: 'Aquarius', Meen: 'Pisces' };

  const rows = [
    { k: t('rashi', lang),     v: user.rashi + (RASHI_ENG[user.rashi] ? ` (${RASHI_ENG[user.rashi]})` : '') },
    { k: t('nakshatra', lang), v: user.nakshatra || '—' },
    { k: t('planet', lang),    v: user.planet || '—' },
    { k: t('deity', lang),     v: user.deity || '—' },
    { k: t('mantra', lang),    v: user.mantra || '—' },
    { k: t('luckyColor', lang),v: user.luckyColor || '—' },
    { k: t('luckyDay', lang),  v: user.luckyDay || '—' },
    { k: t('gem', lang),       v: user.luckyGem || '—' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={km.overlay}>
        <View style={km.box}>
          <View style={km.hdr}>
            <Text style={km.title}>✨ {t('myKundliTitle', lang)}</Text>
            <TouchableOpacity onPress={onClose}><Text style={km.close}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Data rows */}
            {rows.map(r => (
              <View key={r.k} style={km.row}>
                <Text style={km.rkey}>{r.k}</Text>
                <Text style={km.rval}>{r.v}</Text>
              </View>
            ))}
            {/* Insights */}
            {[
              { title: t('personality', lang), text: insight.personality },
              { title: t('career', lang),      text: insight.career },
              { title: t('health', lang),       text: insight.health },
              { title: t('remedy', lang),       text: insight.remedy },
            ].map(s => (
              <View key={s.title} style={km.section}>
                <Text style={km.secTitle}>✦ {s.title}</Text>
                <Text style={km.secText}>{s.text}</Text>
              </View>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const km = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  box: { backgroundColor: '#130700', borderRadius: 28, maxHeight: '90%', margin: 10, padding: 20, borderWidth: 1, borderColor: 'rgba(240,165,0,0.2)' },
  hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#F4A261' },
  close: { fontSize: 18, color: 'rgba(253,246,237,0.4)', fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.08)' },
  rkey: { fontSize: 12, color: 'rgba(253,246,237,0.4)', fontWeight: '600', flex: 1 },
  rval: { fontSize: 13, color: '#F4A261', fontWeight: '700', textAlign: 'right', flex: 1.5 },
  section: { marginTop: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(240,165,0,0.1)' },
  secTitle: { fontSize: 13, fontWeight: '700', color: '#E8620A', marginBottom: 8 },
  secText: { fontSize: 13, color: 'rgba(253,246,237,0.8)', lineHeight: 22 },
});

// ════════════════════════════════════════════════════════
// MANTRA VERIFY MODAL
// ════════════════════════════════════════════════════════
function MantraModal({ visible, onClose, lang }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const isEn = lang !== 'hindi';

  const filtered = search.trim()
    ? MANTRAS.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.deity.toLowerCase().includes(search.toLowerCase()) ||
        m.category.toLowerCase().includes(search.toLowerCase())
      )
    : MANTRAS;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { setSelected(null); onClose(); }}>
      <View style={mm.overlay}>
        <View style={mm.box}>
          <View style={mm.hdr}>
            <Text style={mm.title}>📿 {t('mantraTitle', lang)}</Text>
            <TouchableOpacity onPress={() => { setSelected(null); onClose(); }}><Text style={mm.close}>✕</Text></TouchableOpacity>
          </View>

          {selected ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={mm.backBtn} onPress={() => setSelected(null)}>
                <Text style={mm.backTxt}>← {isEn ? 'Back' : 'वापस'}</Text>
              </TouchableOpacity>
              <Text style={mm.mSanskrit}>{selected.sanskrit}</Text>
              <Text style={mm.mName}>{selected.name}</Text>
              <Text style={mm.mDeity}>{isEn ? 'Deity: ' : 'देवता: '}{selected.deity}</Text>

              <View style={mm.infoBox}>
                <Text style={mm.infoLabel}>{t('meaning', lang)}</Text>
                <Text style={mm.infoText}>{isEn ? selected.meaning_en : selected.meaning_hi}</Text>
              </View>
              <View style={mm.infoBox}>
                <Text style={mm.infoLabel}>{t('when', lang)}</Text>
                <Text style={mm.infoText}>{isEn ? selected.when_en : selected.when_hi}</Text>
              </View>
              <View style={mm.infoBox}>
                <Text style={mm.infoLabel}>{t('source', lang)}</Text>
                <Text style={mm.infoText}>{selected.source}</Text>
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>
          ) : (
            <>
              <TextInput
                style={mm.search}
                placeholder={t('searchMantra', lang)}
                placeholderTextColor="rgba(253,246,237,0.3)"
                value={search}
                onChangeText={setSearch}
              />
              <ScrollView showsVerticalScrollIndicator={false}>
                {filtered.map(m => (
                  <TouchableOpacity key={m.id} style={mm.mantraCard} onPress={() => setSelected(m)} activeOpacity={0.8}>
                    <Text style={mm.mCardSanskrit}>{m.sanskrit.length > 40 ? m.sanskrit.slice(0, 40) + '...' : m.sanskrit}</Text>
                    <Text style={mm.mCardName}>{m.name}</Text>
                    <Text style={mm.mCardDeity}>{m.deity} · {m.category}</Text>
                  </TouchableOpacity>
                ))}
                <View style={{ height: 20 }} />
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
const mm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  box: { backgroundColor: '#130700', borderRadius: 28, maxHeight: '90%', margin: 10, padding: 20, borderWidth: 1, borderColor: 'rgba(240,165,0,0.2)' },
  hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '800', color: '#F4A261' },
  close: { fontSize: 18, color: 'rgba(253,246,237,0.4)', fontWeight: '600' },
  search: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: '#FDF6ED', fontSize: 14, borderWidth: 1, borderColor: 'rgba(200,130,40,0.2)', marginBottom: 12 },
  mantraCard: { backgroundColor: '#1A0800', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(200,130,40,0.15)' },
  mCardSanskrit: { fontSize: 15, color: '#F4A261', fontWeight: '700', marginBottom: 4 },
  mCardName: { fontSize: 12, color: '#FDF6ED', marginBottom: 2 },
  mCardDeity: { fontSize: 11, color: 'rgba(253,246,237,0.4)' },
  backBtn: { marginBottom: 14 },
  backTxt: { fontSize: 13, color: '#E8620A', fontWeight: '600' },
  mSanskrit: { fontSize: 20, color: '#F4A261', fontWeight: '800', textAlign: 'center', lineHeight: 32, marginBottom: 8 },
  mName: { fontSize: 15, color: '#FDF6ED', fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  mDeity: { fontSize: 12, color: '#C9830A', textAlign: 'center', marginBottom: 16 },
  infoBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(240,165,0,0.1)' },
  infoLabel: { fontSize: 11, fontWeight: '700', color: '#E8620A', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  infoText: { fontSize: 13, color: 'rgba(253,246,237,0.85)', lineHeight: 22 },
});

// ════════════════════════════════════════════════════════
// SAVED ANSWERS MODAL
// ════════════════════════════════════════════════════════
function SavedModal({ visible, onClose, lang, onCountChange }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (visible) {
      AsyncStorage.getItem('dharmasetu_saved').then(r => setItems(JSON.parse(r || '[]')));
    }
  }, [visible]);

  const del = async (id) => {
    const f = items.filter(i => i.id !== id);
    setItems(f);
    await AsyncStorage.setItem('dharmasetu_saved', JSON.stringify(f));
    onCountChange(f.length);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#130700', borderRadius: 28, maxHeight: '85%', margin: 10, padding: 20, borderWidth: 1, borderColor: 'rgba(240,165,0,0.2)' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#F4A261' }}>🔖 {t('savedAnswers', lang)} ({items.length}/20)</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 18, color: 'rgba(253,246,237,0.4)' }}>✕</Text></TouchableOpacity>
          </View>
          {items.length === 0 ? (
            <Text style={{ fontSize: 14, color: 'rgba(253,246,237,0.4)', textAlign: 'center', paddingVertical: 20, lineHeight: 22 }}>{t('noSaved', lang)}</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {items.map(item => (
                <View key={item.id} style={{ backgroundColor: '#1A0800', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(200,130,40,0.15)' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#F4A261', marginBottom: 5 }} numberOfLines={2}>{item.q}</Text>
                  <Text style={{ fontSize: 13, color: '#FDF6ED', lineHeight: 20, marginBottom: 5 }} numberOfLines={4}>{item.a}</Text>
                  {item.src ? <Text style={{ fontSize: 11, color: '#C9830A', fontStyle: 'italic', marginBottom: 6 }}>{item.src}</Text> : null}
                  <TouchableOpacity onPress={() => del(item.id)} style={{ alignSelf: 'flex-end' }}>
                    <Text style={{ fontSize: 11, color: '#E74C3C', fontWeight: '600' }}>{t('delete', lang)}</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════
// PROFILE MODAL
// ════════════════════════════════════════════════════════
function ProfileModal({ visible, onClose, user, pts, streak, savedCount, lang }) {
  if (!user) return null;
  const ROLE = { jigyasu: { en: 'Jigyasu — Learner', hi: 'जिज्ञासु — सीखने वाला' }, sadhak: { en: 'Sadhak — Seeker', hi: 'साधक — खोजी' }, acharya: { en: 'Acharya — Guide', hi: 'आचार्य — मार्गदर्शक' } };
  const isEn = lang !== 'hindi';
  const BADGES = [{ i: '🔱', n: 'Bronze Trishul', pts: 0, days: 7 }, { i: '🕉', n: 'Silver Om', pts: 100, days: 15 }, { i: '🪷', n: 'Gold Lotus', pts: 300, days: 30 }, { i: '⚔️', n: 'Dharma Warrior', pts: 1000, days: 100 }];
  const earned = BADGES.filter(b => pts >= b.pts && streak >= b.days);
  const current = earned.length > 0 ? earned[earned.length - 1] : BADGES[0];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#130700', borderRadius: 28, margin: 10, padding: 24, borderWidth: 1, borderColor: 'rgba(240,165,0,0.2)' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#6B21A8', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(240,165,0,0.4)' }}>
              <Text style={{ fontSize: 28 }}>🕉</Text>
            </View>
            <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 20, color: 'rgba(253,246,237,0.4)' }}>✕</Text></TouchableOpacity>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#FDF6ED', marginBottom: 3 }}>{user.name}</Text>
          <Text style={{ fontSize: 14, color: '#C9830A', marginBottom: 3 }}>{ROLE[user.role]?.[isEn ? 'en' : 'hi'] || user.role}</Text>
          <Text style={{ fontSize: 13, color: 'rgba(253,246,237,0.45)', marginBottom: 16 }}>{user.rashi} Rashi · {user.deity}</Text>

          <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(240,165,0,0.1)' }}>
            {[{ n: pts, l: isEn ? 'Points' : 'Points' }, { n: streak, l: isEn ? 'Streak' : 'Streak' }, { n: savedCount, l: isEn ? 'Saved' : 'Saved' }].map((s, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '800', color: '#E8620A' }}>{s.n}</Text>
                <Text style={{ fontSize: 11, color: 'rgba(253,246,237,0.4)', marginTop: 2 }}>{s.l}</Text>
                {i < 2 && <View style={{ position: 'absolute', right: 0, height: '80%', width: 1, backgroundColor: 'rgba(240,165,0,0.15)', top: '10%' }} />}
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(240,165,0,0.1)' }}>
            <Text style={{ fontSize: 11, color: 'rgba(253,246,237,0.4)' }}>{isEn ? 'Current Badge:' : 'Current Badge:'}</Text>
            <Text style={{ fontSize: 22 }}>{current.i}</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#F4A261' }}>{current.n}</Text>
          </View>

          <TouchableOpacity
            style={{ paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(231,76,60,0.1)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(231,76,60,0.25)' }}
            onPress={() => Alert.alert(t('logout', lang), t('logoutConfirm', lang), [
              { text: t('cancel', lang), style: 'cancel' },
              { text: t('logout', lang), style: 'destructive', onPress: async () => { await AsyncStorage.removeItem('dharmasetu_user'); onClose(); router.replace('/login'); } }
            ])}
          >
            <Text style={{ fontSize: 14, color: '#E74C3C', fontWeight: '600' }}>{t('logout', lang)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════
// MAIN HOME SCREEN
// ════════════════════════════════════════════════════════
export default function HomeScreen() {
  const [lang, setLang]           = useState('english');
  const [user, setUser]           = useState(null);
  const [pts, setPts]             = useState(0);
  const [streak, setStreak]       = useState(0);
  const [savedCount, setSaved]    = useState(0);
  const [notifCount, setNotif]    = useState(2);

  const [showKundli, setShowKundli]   = useState(false);
  const [showMantra, setShowMantra]   = useState(false);
  const [showSaved, setShowSaved]     = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;
  const omSc = useRef(new Animated.Value(1)).current;
  const omOp = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('dharmasetu_user');
      const p   = parseInt(await AsyncStorage.getItem('dharmasetu_pts') || '0', 10);
      const sv  = JSON.parse(await AsyncStorage.getItem('dharmasetu_saved') || '[]').length;
      setPts(p); setSaved(sv);

      if (raw) {
        const u = JSON.parse(raw);
        setUser(u);
        setLang(u.language || 'english');
        // Streak
        const today = new Date().toDateString();
        const last  = await AsyncStorage.getItem('dharmasetu_streak_date');
        const count = parseInt(await AsyncStorage.getItem('dharmasetu_streak_count') || '0', 10);
        if (last === today) { setStreak(count); }
        else {
          const yesterday = new Date(Date.now() - 86400000).toDateString();
          const newStreak = last === yesterday ? count + 1 : 1;
          setStreak(newStreak);
          await AsyncStorage.setItem('dharmasetu_streak_date', today);
          await AsyncStorage.setItem('dharmasetu_streak_count', String(newStreak));
          // Daily points
          const lastCheckin = await AsyncStorage.getItem('dharmasetu_checkin');
          if (lastCheckin !== today) {
            await AsyncStorage.setItem('dharmasetu_checkin', today);
            const nPts = p + 3;
            await AsyncStorage.setItem('dharmasetu_pts', String(nPts));
            setPts(nPts);
          }
        }
      }
    })();

    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 65, useNativeDriver: true }),
    ]).start();

    Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(omSc, { toValue: 1.07, duration: 2100, useNativeDriver: true }),
        Animated.timing(omOp, { toValue: 1, duration: 2100, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(omSc, { toValue: 1, duration: 2100, useNativeDriver: true }),
        Animated.timing(omOp, { toValue: 0.85, duration: 2100, useNativeDriver: true }),
      ]),
    ])).start();
  }, []);

  const isEn = lang !== 'hindi';
  const verses   = isEn ? VERSES_EN   : VERSES_HI;
  const trending = isEn ? TRENDING_EN : TRENDING_HI;
  const verse    = verses[new Date().getDay() % verses.length];

  const BADGE_DATA = [
    { i: '🔱', n: 'Bronze Trishul', pReq: 0,    dReq: 7   },
    { i: '🕉', n: 'Silver Om',      pReq: 100,  dReq: 15  },
    { i: '🪷', n: 'Gold Lotus',     pReq: 300,  dReq: 30  },
    { i: '⚔️', n: 'Dharma Warrior', pReq: 1000, dReq: 100 },
  ];
  const nextBadge = BADGE_DATA.find(b => pts < b.pReq || streak < b.dReq) || BADGE_DATA[3];

  const goChat = () => { Vibration.vibrate(18); router.push('/(tabs)/explore'); };

  const showPtsInfo = () => {
    Alert.alert(
      t('ptsSystem', lang),
      isEn ? T.ptsBody_en : T.ptsBody_hi,
      [{ text: t('gotIt', lang) }]
    );
  };

  const showNotif = () => {
    setNotif(0);
    const isH = !isEn;
    const msg = isH
      ? `• आज का श्लोक: "कर्म करो, फल की चिंता मत करो।" — गीता 2.47\n\n• आपका streak: ${streak} दिन! 🔥 Silver Om badge के लिए ${Math.max(0, 15 - streak)} दिन और!\n\n• नया misinformation viral हो रहा है — DharmaChat में check करें!`
      : `• Today's verse: "Do your duty without attachment..." — Gita 2.47\n\n• Your streak: ${streak} days! 🔥 ${Math.max(0, 15 - streak)} more days for Silver Om!\n\n• New misinformation going viral — check in DharmaChat!`;
    Alert.alert(t('notifTitle', lang), msg, [{ text: t('ok', lang) }]);
  };

  const onAction = (action) => {
    Vibration.vibrate(16);
    if (action === 'factcheck') {
      AsyncStorage.setItem('dharmasetu_mode', 'factcheck').then(() => router.push('/(tabs)/explore'));
    } else if (action === 'kundli') {
      if (!user) { Alert.alert('', isEn ? 'Please complete your profile first.' : 'पहले अपनी profile complete करें।'); return; }
      setShowKundli(true);
    } else if (action === 'mantra') {
      setShowMantra(true);
    } else if (action === 'saved') {
      setShowSaved(true);
    }
    else if (action === 'katha') {
     router.push('/katha');
    }
  };

  const ACTIONS = [
    { key: 'factcheck', icon: '🛡️', title: t('factCheck', lang),    sub: t('factCheckSub', lang),    color: '#B04000' },
    { key: 'kundli',   icon: '✨', title: t('myKundli', lang),      sub: t('myKundliSub', lang),      color: '#8B6914' },
    { key: 'mantra',   icon: '📿', title: t('mantraVerify', lang),  sub: t('mantraVerifySub', lang),  color: '#1A5C1A' },
    { key: 'saved',    icon: '🔖', title: t('savedAnswers', lang),  sub: t('savedAnswersSub', lang),  color: '#14386E' },
    { 
    key: 'katha', 
    icon: '📚', 
    title: isEn ? 'Katha Vault' : 'कथा वॉल्ट', 
    sub: isEn ? 'Read sacred scriptures' : 'पवित्र ग्रंथ पढ़ें', 
    color: '#3D1470' 
  }
  ];

  return (
    <View style={s.root}>
      <StatusBar style="light" backgroundColor="#0D0500" translucent={false} />
      <View style={{ height: SB_H, backgroundColor: '#0D0500' }} />

      <ScrollView style={s.flex} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── HEADER ── */}
        <Animated.View style={[s.hdr, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={s.flex}>
            <Text style={s.greet}>{t('greeting', lang)}</Text>
            <Text style={s.name}>{t('namaste', lang)} {user?.name || 'Dharma Rakshak'}</Text>
            <Text style={s.sub}>{user?.rashi || 'Mesh'} Rashi · {user?.deity || 'Hanuman'}</Text>
          </View>
          <View style={s.hBtns}>
            <TouchableOpacity style={s.hBtn} onPress={showNotif}>
              <Text style={{ fontSize: 18 }}>🔔</Text>
              {notifCount > 0 && <View style={s.nBadge}><Text style={s.nBadgeTxt}>{notifCount}</Text></View>}
            </TouchableOpacity>
            <TouchableOpacity style={s.hBtn} onPress={() => setShowProfile(true)}>
              <Text style={{ fontSize: 18 }}>👤</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── HERO ── */}
        <Animated.View style={[s.hero, { opacity: fadeAnim }]}>
          <Animated.View style={[s.omBox, { transform: [{ scale: omSc }], opacity: omOp }]}>
            <Text style={{ fontSize: 33 }}>🕉</Text>
          </Animated.View>
          <Text style={s.heroTitle}>DharmaSetu</Text>
          <Text style={s.heroHindi}>धर्मसेतु — Bridge to Sanatan Dharma</Text>
          <Text style={s.heroDesc}>{isEn ? 'Shastras, history, science — all in one place.\nAsk anything. Get truth with shastriya proof.' : 'शास्त्र, इतिहास, विज्ञान — सब एक जगह।\nकोई भी सवाल — सच जवाब, पक्के सूत के साथ।'}</Text>
          <TouchableOpacity style={s.heroBtn} onPress={goChat} activeOpacity={0.88}>
            <Text style={s.heroBtnTxt}>{t('startChat', lang)}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── STREAK ── */}
        <Animated.View style={[s.streak, { opacity: fadeAnim }]}>
          <Flame />
          <View style={s.flex}>
            <Text style={s.strTitle}>{streak} {t('streak', lang)}</Text>
            <Text style={s.strSub}>{isEn ? `${Math.max(0, nextBadge.dReq - streak)} ${t('daysMore', lang)} ${nextBadge.n}` : `${nextBadge.n} के लिए ${Math.max(0, nextBadge.dReq - streak)} ${t('daysMore', lang)}`}</Text>
            <View style={s.barTrack}>
              <View style={[s.barFill, { width: `${Math.min(100, (streak / nextBadge.dReq) * 100)}%` }]} />
            </View>
          </View>
          <View>
            <Text style={s.pts}>{pts}</Text>
            <Text style={s.ptsSub}>{t('pts', lang)}</Text>
          </View>
        </Animated.View>

        {/* ── POINTS INFO ── */}
        <TouchableOpacity style={s.ptsInfo} onPress={showPtsInfo} activeOpacity={0.8}>
          <Text style={s.ptsInfoTxt}>{t('howPoints', lang)}</Text>
        </TouchableOpacity>

        {/* ── QUICK ACTIONS ── */}
        <Text style={s.sec}>{t('quickActions', lang)}</Text>
        <View style={s.grid}>
          {ACTIONS.map((a) => (
            <TouchableOpacity key={a.key} style={[s.card, { borderColor: a.color + '30' }]} onPress={() => onAction(a.key)} activeOpacity={0.85}>
              <View style={[s.cardIcon, { backgroundColor: a.color + '18' }]}><Text style={{ fontSize: 22 }}>{a.icon}</Text></View>
              <Text style={s.cardTitle}>{a.title}</Text>
              <Text style={s.cardSub}>{a.sub}</Text>
              {a.key === 'saved' && savedCount > 0 && (
                <View style={s.savedBadge}><Text style={s.savedBadgeTxt}>{savedCount}</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── DAILY VERSE ── */}
        <View style={s.verseCard}>
          <Text style={s.verseLabel}>{t('todayShloka', lang)}</Text>
          <Text style={s.verseTxt}>{verse.t}</Text>
          <Text style={s.verseSrc}>{verse.s}</Text>
          <TouchableOpacity style={s.verseBtn} onPress={goChat} activeOpacity={0.8}>
            <Text style={s.verseBtnTxt}>{t('understandChat', lang)}</Text>
          </TouchableOpacity>
        </View>

        {/* ── TRENDING ── */}
        <Text style={s.sec}>{t('viralLies', lang)}</Text>
        {trending.map((item, i) => (
          <TouchableOpacity key={i} style={s.trendCard} onPress={goChat} activeOpacity={0.8}>
            <View style={s.flex}><Text style={s.trendQ} numberOfLines={2}>{item.q}</Text><Text style={s.trendTap}>{t('knowTruth', lang)}</Text></View>
            <View style={[s.vBadge, { backgroundColor: item.c + '16', borderColor: item.c + '50' }]}><Text style={[s.vTxt, { color: item.c }]}>{item.v}</Text></View>
          </TouchableOpacity>
        ))}

        {/* ── BADGES ── */}
        <Text style={s.sec}>{t('myBadges', lang)}</Text>
        <View style={s.badgeRow}>
          {BADGE_DATA.map((b, i) => {
            const earned = pts >= b.pReq && streak >= b.dReq;
            return (
              <TouchableOpacity key={i} style={[s.badge, !earned && s.badgeLocked]} activeOpacity={0.8}
                onPress={() => Alert.alert(b.i + ' ' + b.n,
                  earned
                    ? (isEn ? '🎉 You have earned this badge!' : '🎉 यह badge आपने earn कर लिया है!')
                    : (isEn ? `Earn: ${b.pReq} pts + ${b.dReq}-day streak\nYou have: ${pts} pts + ${streak} days` : `चाहिए: ${b.pReq} pts + ${b.dReq} दिन\nआपके पास: ${pts} pts + ${streak} दिन`),
                  [{ text: earned ? '🕉 Jai Shri Ram!' : (isEn ? 'Keep going 🙏' : 'जारी रखें 🙏') }]
                )}>
                <Text style={{ fontSize: 24, opacity: earned ? 1 : 0.2 }}>{b.i}</Text>
                <Text style={[s.badgeName, !earned && { opacity: 0.2 }]}>{b.n}</Text>
                {earned && <View style={s.earnedDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── MODALS ── */}
      <KundliModal visible={showKundli} onClose={() => setShowKundli(false)} user={user} lang={lang} />
      <MantraModal visible={showMantra} onClose={() => setShowMantra(false)} lang={lang} />
      <SavedModal  visible={showSaved}  onClose={() => setShowSaved(false)}  lang={lang} onCountChange={setSaved} />
      <ProfileModal visible={showProfile} onClose={() => setShowProfile(false)} user={user} pts={pts} streak={streak} savedCount={savedCount} lang={lang} />
    </View>
  );
}

// ════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0500' },
  flex: { flex: 1 },
  content: { padding: 18, paddingTop: 6 },

  hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  greet: { fontSize: 11, color: '#F4A261', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 4 },
  name:  { fontSize: 22, fontWeight: '800', color: '#FDF6ED', marginBottom: 3 },
  sub:   { fontSize: 13, color: '#C9830A' },
  hBtns: { flexDirection: 'row', gap: 8, marginTop: 2 },
  hBtn:  { width: 40, height: 40, borderRadius: 12, backgroundColor: '#180800', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(240,165,0,0.15)' },
  nBadge:    { position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#E74C3C', alignItems: 'center', justifyContent: 'center' },
  nBadgeTxt: { fontSize: 9, color: '#fff', fontWeight: '700' },

  hero: { backgroundColor: '#130700', borderRadius: 22, padding: 22, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(232,98,10,0.16)', alignItems: 'center' },
  omBox: { width: 66, height: 66, borderRadius: 18, backgroundColor: '#6B21A8', alignItems: 'center', justifyContent: 'center', marginBottom: 12, elevation: 6, shadowColor: '#6B21A8', shadowOpacity: 0.45, shadowRadius: 10 },
  heroTitle: { fontSize: 27, fontWeight: '800', color: '#E8620A', marginBottom: 4 },
  heroHindi: { fontSize: 13, color: '#F4A261', marginBottom: 10 },
  heroDesc:  { fontSize: 13, color: 'rgba(253,246,237,0.5)', textAlign: 'center', lineHeight: 21, marginBottom: 18 },
  heroBtn:   { backgroundColor: '#E8620A', paddingHorizontal: 22, paddingVertical: 14, borderRadius: 16, width: '100%', alignItems: 'center', elevation: 5, shadowColor: '#E8620A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.45, shadowRadius: 6 },
  heroBtnTxt:{ color: '#fff', fontSize: 15, fontWeight: '700' },

  streak: { backgroundColor: '#130700', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(240,165,0,0.15)' },
  strTitle:  { fontSize: 15, fontWeight: '700', color: '#F4A261', marginBottom: 2 },
  strSub:    { fontSize: 11, color: 'rgba(253,246,237,0.4)', marginBottom: 8 },
  barTrack:  { height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' },
  barFill:   { height: 5, backgroundColor: '#E8620A', borderRadius: 3 },
  pts:    { fontSize: 22, fontWeight: '800', color: '#C9830A', textAlign: 'center' },
  ptsSub: { fontSize: 10, color: 'rgba(253,246,237,0.35)', textAlign: 'center' },

  ptsInfo: { backgroundColor: 'rgba(232,98,10,0.08)', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(232,98,10,0.15)', alignItems: 'center' },
  ptsInfoTxt: { fontSize: 12, color: '#F4A261', fontWeight: '600' },

  sec: { fontSize: 15, fontWeight: '700', color: '#FDF6ED', marginBottom: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  card: { width: (SW - 46) / 2, backgroundColor: '#130700', borderRadius: 16, borderWidth: 1, padding: 15, position: 'relative' },
  cardIcon:  { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#FDF6ED', marginBottom: 2 },
  cardSub:   { fontSize: 11, color: 'rgba(253,246,237,0.38)', lineHeight: 15 },
  savedBadge:    { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: '#E8620A', alignItems: 'center', justifyContent: 'center' },
  savedBadgeTxt: { fontSize: 10, color: '#fff', fontWeight: '700' },

  verseCard: { backgroundColor: '#130700', borderRadius: 18, padding: 18, marginBottom: 22, borderWidth: 1, borderColor: 'rgba(240,165,0,0.13)' },
  verseLabel: { fontSize: 12, fontWeight: '700', color: '#C9830A', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  verseTxt:   { fontSize: 14, color: '#FDF6ED', fontStyle: 'italic', lineHeight: 23, marginBottom: 8 },
  verseSrc:   { fontSize: 12, color: '#C9830A', marginBottom: 14 },
  verseBtn:   { backgroundColor: 'rgba(232,98,10,0.1)', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(232,98,10,0.18)' },
  verseBtnTxt:{ fontSize: 12, color: '#F4A261', fontWeight: '600' },

  trendCard: { backgroundColor: '#130700', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(200,130,40,0.1)' },
  trendQ:    { fontSize: 13, color: '#FDF6ED', lineHeight: 19, marginBottom: 4 },
  trendTap:  { fontSize: 11, color: 'rgba(253,246,237,0.3)' },
  vBadge:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, flexShrink: 0 },
  vTxt:      { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  badgeRow:    { flexDirection: 'row', gap: 10 },
  badge:       { flex: 1, backgroundColor: '#130700', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(240,165,0,0.22)' },
  badgeLocked: { borderColor: 'rgba(200,130,40,0.07)', backgroundColor: '#0F0500' },
  badgeName:   { fontSize: 10, color: '#C9830A', textAlign: 'center', fontWeight: '600', lineHeight: 14, marginTop: 6 },
  earnedDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: '#27AE60', marginTop: 4 },
});