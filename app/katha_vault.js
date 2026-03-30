// ════════════════════════════════════════════════════════
// DharmaSetu — Katha Vault (Phase 1)
// Sacred scripture reading system
// Gita (18 chapters) · Ramayana (7 Kandas) · Mahabharata · Puranas
// Daily reading goals · Progress tracking
// ════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
    StatusBar as RNStatusBar,
    ScrollView,
    StyleSheet, Text,
    TouchableOpacity,
    Vibration,
    View
} from 'react-native';

const SB_H = RNStatusBar.currentHeight || 0;

// ════════════════════════════════════════════════════════
// SCRIPTURE LIBRARY
// ════════════════════════════════════════════════════════
const SCRIPTURES = [
  {
    id: 'gita',
    name: 'Bhagavad Gita',
    nameHi: 'भगवद्गीता',
    icon: '📖',
    color: '#E8620A',
    desc: '700 verses, 18 chapters — The song of God spoken by Sri Krishna to Arjuna on the battlefield of Kurukshetra.',
    descHi: '700 श्लोक, 18 अध्याय — कुरुक्षेत्र के रणभूमि पर श्री कृष्ण ने अर्जुन को दिया ज्ञान।',
    dailyGoal: 5,
    totalUnits: 18,
    unitName: 'Chapters',
    unitNameHi: 'अध्याय',
    sections: [
      { id: 'ch1', title: 'Chapter 1 — Arjuna Vishada Yoga', titleHi: 'अध्याय 1 — अर्जुन विषाद योग', verses: 47, summary: 'Arjuna sees his relatives on the opposite side and is overcome by grief. He refuses to fight, lays down his bow, and sits in despair.', summaryHi: 'अर्जुन विपक्ष में अपने सगे-संबंधियों को देखकर शोक से विभोर हो जाते हैं। वे युद्ध करने से मना कर धनुष रख देते हैं।', keyVerse: '"धृतराष्ट्र उवाच धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः"', keyVerseRef: 'Gita 1.1', lesson: 'Even the greatest warriors face moments of doubt. The path begins with acknowledging our confusion.' },
      { id: 'ch2', title: 'Chapter 2 — Sankhya Yoga', titleHi: 'अध्याय 2 — सांख्य योग', verses: 72, summary: 'Krishna begins his teaching. The soul is eternal and cannot be killed. Do your duty without attachment to results — this is Karma Yoga.', summaryHi: 'कृष्ण अपना उपदेश शुरू करते हैं। आत्मा अमर है, उसे कोई मार नहीं सकता। फल की चिंता किए बिना कर्म करो।', keyVerse: '"नैनं छिन्दन्ति शस्त्राणि नैनं दहति पावकः"', keyVerseRef: 'Gita 2.23', lesson: 'The soul is indestructible. Perform your duty without attachment to results.' },
      { id: 'ch3', title: 'Chapter 3 — Karma Yoga', titleHi: 'अध्याय 3 — कर्म योग', verses: 43, summary: 'One cannot remain without action even for a moment. Act without selfish desire. The world is sustained by sacrifice.', summaryHi: 'कोई भी एक क्षण भी बिना कर्म किए नहीं रह सकता। निःस्वार्थ भाव से कर्म करो। संसार यज्ञ से चलता है।', keyVerse: '"नियतं कुरु कर्म त्वं कर्म ज्यायो ह्यकर्मणः"', keyVerseRef: 'Gita 3.8', lesson: 'Action is obligatory. Perform prescribed duties without selfish desire.' },
      { id: 'ch4', title: 'Chapter 4 — Jnana Karma Sanyasa Yoga', titleHi: 'अध्याय 4 — ज्ञान कर्म संन्यास योग', verses: 42, summary: 'Krishna reveals the ancient knowledge of Yoga. Whenever dharma declines, He descends. The fire of knowledge destroys all karma.', summaryHi: 'कृष्ण योग की प्राचीन विद्या प्रकट करते हैं। जब धर्म की हानि होती है, वे अवतार लेते हैं। ज्ञान की अग्नि सब कर्म जला देती है।', keyVerse: '"यदा यदा हि धर्मस्य ग्लानिर्भवति भारत"', keyVerseRef: 'Gita 4.7', lesson: 'Divine wisdom has been passed through ages. Knowledge destroys all karma.' },
      { id: 'ch5', title: 'Chapter 5 — Karma Sanyasa Yoga', titleHi: 'अध्याय 5 — कर्म संन्यास योग', verses: 29, summary: 'Both renunciation of action and yoga of action lead to liberation. The wise see a learned brahmin, a cow, an elephant, and a dog as equal.', summaryHi: 'कर्म संन्यास और कर्म योग दोनों मुक्तिदायक हैं। ज्ञानी सब प्राणियों को समान भाव से देखते हैं।', keyVerse: '"विद्याविनयसम्पन्ने ब्राह्मणे गवि हस्तिनि"', keyVerseRef: 'Gita 5.18', lesson: 'The wise see all beings with equal vision — the hallmark of true knowledge.' },
      { id: 'ch6', title: 'Chapter 6 — Dhyana Yoga', titleHi: 'अध्याय 6 — ध्यान योग', verses: 47, summary: 'The yoga of meditation. Elevate yourself through your own mind. The mind is both friend and enemy. Practice yoga with patience.', summaryHi: 'ध्यान योग। अपने मन से ही अपना उद्धार करो। मन ही मित्र और शत्रु दोनों है। धैर्य से योग का अभ्यास करो।', keyVerse: '"उद्धरेदात्मनात्मानं नात्मानमवसादयेत्"', keyVerseRef: 'Gita 6.5', lesson: 'Lift yourself up through your own mind — be your own best friend.' },
      { id: 'ch7', title: 'Chapter 7 — Jnana Vijnana Yoga', titleHi: 'अध्याय 7 — ज्ञान विज्ञान योग', verses: 30, summary: 'Krishna explains his divine nature — the entire creation is a manifestation of his energy. Four types of devotees come to him.', summaryHi: 'कृष्ण अपनी दिव्य प्रकृति बताते हैं। सारी सृष्टि उनकी शक्ति का प्रकटीकरण है। चार प्रकार के भक्त उनके पास आते हैं।', keyVerse: '"मनुष्याणां सहस्रेषु कश्चिद्यतति सिद्धये"', keyVerseRef: 'Gita 7.3', lesson: 'Among thousands, one seeks perfection; among those, one truly knows Me.' },
      { id: 'ch8', title: 'Chapter 8 — Aksara Brahma Yoga', titleHi: 'अध्याय 8 — अक्षर ब्रह्म योग', verses: 28, summary: 'What one thinks at the time of death determines the next birth. Those who remember God at the moment of death attain God.', summaryHi: 'मृत्यु के समय जो विचार होता है, वही अगला जन्म निर्धारित करता है। जो मृत्यु समय ईश्वर को याद करते हैं, वे ईश्वर को प्राप्त होते हैं।', keyVerse: '"अन्तकाले च मामेव स्मरन्मुक्त्वा कलेवरम्"', keyVerseRef: 'Gita 8.5', lesson: 'Whatever you think at the moment of death, you attain that.' },
      { id: 'ch9', title: 'Chapter 9 — Raja Vidya Raja Guhya Yoga', titleHi: 'अध्याय 9 — राज विद्या राज गुह्य योग', verses: 34, summary: 'The royal knowledge and royal secret. Krishna pervades all creation. Offer everything to Him with devotion — even a leaf or water.', summaryHi: 'राज विद्या और राज रहस्य। कृष्ण सारी सृष्टि में व्याप्त हैं। भक्तिपूर्वक पत्ते, फूल, फल या जल भी अर्पित करो।', keyVerse: '"पत्रं पुष्पं फलं तोयं यो मे भक्त्या प्रयच्छति"', keyVerseRef: 'Gita 9.26', lesson: 'Offer whatever you have with love and devotion — God accepts the heart, not the gift.' },
      { id: 'ch10', title: 'Chapter 10 — Vibhuti Yoga', titleHi: 'अध्याय 10 — विभूति योग', verses: 42, summary: 'Krishna explains his divine glories and manifestations. He is the beginning, middle, and end of all existence.', summaryHi: 'कृष्ण अपनी दिव्य विभूतियों का वर्णन करते हैं। वे सभी अस्तित्व के आदि, मध्य और अंत हैं।', keyVerse: '"अहमात्मा गुडाकेश सर्वभूताशयस्थितः"', keyVerseRef: 'Gita 10.20', lesson: 'I am the Self seated in the hearts of all beings.' },
      { id: 'ch11', title: 'Chapter 11 — Vishwaroopa Darshana Yoga', titleHi: 'अध्याय 11 — विश्वरूप दर्शन योग', verses: 55, summary: 'Arjuna sees the Universal Form of Krishna — the infinite cosmic vision containing all of creation.', summaryHi: 'अर्जुन को कृष्ण का विश्वरूप दर्शन होता है — सम्पूर्ण सृष्टि को धारण करने वाला अनंत ब्रह्माण्डीय रूप।', keyVerse: '"अनेकबाहूदरवक्त्रनेत्रं पश्यामि त्वां सर्वतोऽनन्तरूपम्"', keyVerseRef: 'Gita 11.16', lesson: 'The entire universe exists within the Divine — every form is His form.' },
      { id: 'ch12', title: 'Chapter 12 — Bhakti Yoga', titleHi: 'अध्याय 12 — भक्ति योग', verses: 20, summary: 'The yoga of devotion. Those who worship with faith and devotion are dearest to Krishna. Qualities of the ideal devotee.', summaryHi: 'भक्ति योग। जो श्रद्धा और भक्ति से पूजा करते हैं, वे कृष्ण को सबसे प्रिय हैं। आदर्श भक्त के गुण।', keyVerse: '"ये तु धर्म्यामृतमिदं यथोक्तं पर्युपासते"', keyVerseRef: 'Gita 12.20', lesson: 'Devotion with faith, love, and surrender is the highest spiritual path.' },
      { id: 'ch13', title: 'Chapter 13 — Kshetra Kshetrajna Vibhaga Yoga', titleHi: 'अध्याय 13 — क्षेत्र क्षेत्रज्ञ विभाग योग', verses: 35, summary: 'The field (body) and the knower of the field (soul). Understand the difference between matter and consciousness.', summaryHi: 'क्षेत्र (शरीर) और क्षेत्रज्ञ (आत्मा)। पदार्थ और चेतना का अंतर समझो।', keyVerse: '"इदं शरीरं कौन्तेय क्षेत्रमित्यभिधीयते"', keyVerseRef: 'Gita 13.1', lesson: 'The body is the field; the soul is the knower of the field — understand their difference.' },
      { id: 'ch14', title: 'Chapter 14 — Gunatraya Vibhaga Yoga', titleHi: 'अध्याय 14 — गुणत्रय विभाग योग', verses: 27, summary: 'The three gunas: Sattva (goodness), Rajas (passion), Tamas (ignorance) bind the soul to the body. The wise transcend all three.', summaryHi: 'तीन गुण: सत्व, रजस, तमस आत्मा को शरीर से बांधते हैं। ज्ञानी तीनों गुणों से परे होते हैं।', keyVerse: '"सत्त्वं रजस्तम इति गुणाः प्रकृतिसम्भवाः"', keyVerseRef: 'Gita 14.5', lesson: 'The three gunas bind the soul. Transcend them through devotion and wisdom.' },
      { id: 'ch15', title: 'Chapter 15 — Purushottama Yoga', titleHi: 'अध्याय 15 — पुरुषोत्तम योग', verses: 20, summary: 'The cosmic tree of existence. The Supreme Person (Purushottama) transcends both perishable matter and the imperishable soul.', summaryHi: 'अस्तित्व का ब्रह्मांडीय वृक्ष। परम पुरुष (पुरुषोत्तम) नश्वर पदार्थ और अविनाशी आत्मा दोनों से परे है।', keyVerse: '"द्वाविमौ पुरुषौ लोके क्षरश्चाक्षर एव च"', keyVerseRef: 'Gita 15.16', lesson: 'Beyond the perishable and imperishable is the Supreme Person — Purushottama.' },
      { id: 'ch16', title: 'Chapter 16 — Daivasura Sampad Vibhaga Yoga', titleHi: 'अध्याय 16 — दैवासुर सम्पद् विभाग योग', verses: 24, summary: 'Divine and demonic qualities in human beings. Fear, purity, compassion are divine. Pride, arrogance, and cruelty are demonic.', summaryHi: 'मनुष्यों में दैवीय और आसुरी गुण। निडरता, पवित्रता, करुणा दैवीय हैं। अहंकार, क्रूरता आसुरी हैं।', keyVerse: '"अभयं सत्त्वसंशुद्धिर्ज्ञानयोगव्यवस्थितिः"', keyVerseRef: 'Gita 16.1', lesson: 'Fearlessness, purity of heart, and devotion to knowledge — these are divine qualities.' },
      { id: 'ch17', title: 'Chapter 17 — Shraddha Traya Vibhaga Yoga', titleHi: 'अध्याय 17 — श्रद्धात्रय विभाग योग', verses: 28, summary: 'Three types of faith based on the three gunas. Food, sacrifice, charity, and austerity also have three qualities.', summaryHi: 'तीन गुणों पर आधारित तीन प्रकार की श्रद्धा। भोजन, यज्ञ, दान और तपस्या के भी तीन प्रकार हैं।', keyVerse: '"ॐ तत्सदिति निर्देशो ब्रह्मणस्त्रिविधः स्मृतः"', keyVerseRef: 'Gita 17.23', lesson: 'Om Tat Sat — the three-word declaration of Brahman, the Supreme Reality.' },
      { id: 'ch18', title: 'Chapter 18 — Moksha Sanyasa Yoga', titleHi: 'अध्याय 18 — मोक्ष संन्यास योग', verses: 78, summary: 'The conclusion. Surrender everything to God. Abandon all dharmas and take refuge in Krishna alone. This is the highest secret.', summaryHi: 'अंतिम उपदेश। सब कुछ ईश्वर को अर्पित करो। सभी धर्मों को छोड़कर केवल कृष्ण की शरण लो। यही परम रहस्य है।', keyVerse: '"सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज"', keyVerseRef: 'Gita 18.66', lesson: 'Surrender all duties to Me. Take refuge in Me alone. I will free you from all sins.' },
    ],
  },
  {
    id: 'ramayana',
    name: 'Valmiki Ramayana',
    nameHi: 'वाल्मीकि रामायण',
    icon: '🏹',
    color: '#C9830A',
    desc: '24,000 verses, 7 Kandas — The eternal story of Dharma, written by Maharishi Valmiki. The first poem (Adi Kavya) of Sanskrit literature.',
    descHi: '24,000 श्लोक, 7 काण्ड — धर्म की अमर कथा, महर्षि वाल्मीकि रचित। संस्कृत साहित्य का आदि काव्य।',
    dailyGoal: 3,
    totalUnits: 7,
    unitName: 'Kandas',
    unitNameHi: 'काण्ड',
    sections: [
      { id: 'bala', title: 'Bala Kanda — Childhood of Ram', titleHi: 'बाल काण्ड — राम का बचपन', verses: 2412, summary: 'The birth of Ram in Ayodhya, his childhood, education with Vishwamitra, destruction of demons Tataka and Subahu, freeing Ahalya, and Ram\'s marriage to Sita after breaking Shiva\'s bow at Janakpur.', summaryHi: 'अयोध्या में राम का जन्म, बचपन, विश्वामित्र के साथ शिक्षा, ताड़का और सुबाहु का वध, अहल्या का उद्धार, और जनकपुर में शिव धनुष तोड़कर सीता से विवाह।', keyVerse: '"तपःस्वाध्यायनिरतां तपस्वी वाग्विदां वरम्"', keyVerseRef: 'Valmiki Ramayana 1.1.1', lesson: 'Ram is born to restore dharma — every great soul has a divine purpose.' },
      { id: 'ayodhya', title: 'Ayodhya Kanda — Exile of Ram', titleHi: 'अयोध्या काण्ड — राम का वनवास', verses: 4119, summary: 'Kaikeyi demands Ram\'s exile. Ram accepts joyfully to honor his father\'s word. Sita and Lakshman accompany him. King Dasharatha dies of grief. Ram befriends Guha the Bhil King — his closest friend in the forest.', summaryHi: 'कैकेयी 14 वर्ष के वनवास की माँग करती है। राम पिता के वचन के लिए हँसते हुए स्वीकार करते हैं। सीता और लक्ष्मण साथ जाते हैं। राजा दशरथ दुःख से मर जाते हैं। भील राजा गुह से राम की मित्रता।', keyVerse: '"रामो विग्रहवान् धर्मः"', keyVerseRef: 'Valmiki Ramayana 3.37.13', lesson: 'Ram chose dharma over comfort — the mark of a true king and son.' },
      { id: 'aranya', title: 'Aranya Kanda — Forest Life', titleHi: 'अरण्य काण्ड — वन की लीला', verses: 2975, summary: 'Ram, Sita, and Lakshman spend their forest years helping sages. Ram destroys 14,000 demons. Ravana abducts Sita. Jatayu (the eagle king) sacrifices his life trying to save Sita.', summaryHi: 'राम, सीता और लक्ष्मण ऋषियों की सहायता करते हुए वन में रहते हैं। राम 14,000 राक्षसों का वध करते हैं। रावण सीता हरण करता है। जटायु सीता को बचाने में प्राण देता है।', keyVerse: '"न स्त्री दुःखतरं किंचित् जगत्यस्मिन् नराधिप"', keyVerseRef: 'Valmiki Ramayana 3.50.17', lesson: 'Even in dharma\'s darkest hour, divine protection is always near.' },
      { id: 'kishkindha', title: 'Kishkindha Kanda — Alliance with Vanaras', titleHi: 'किष्किन्धा काण्ड — वानरों से मित्रता', verses: 2665, summary: 'Ram meets Hanuman and forms an eternal bond. He helps Sugriva regain his kingdom from Vali. The great Vanara army prepares to search for Sita.', summaryHi: 'राम की हनुमान से मुलाकात और अटूट मित्रता। सुग्रीव को वाली से राज्य दिलाना। विशाल वानर सेना सीता की खोज के लिए तैयार होती है।', keyVerse: '"कौ युवां पुरुषव्याघ्रौ दिव्यरूपधरौ स्थितौ"', keyVerseRef: 'Valmiki Ramayana 4.3.3', lesson: 'True friendship transcends status — Ram and Hanuman\'s bond is eternal.' },
      { id: 'sundara', title: 'Sundara Kanda — Hanuman\'s Journey', titleHi: 'सुंदर काण्ड — हनुमान की लंका यात्रा', verses: 2885, summary: 'Hanuman\'s miraculous leap across the ocean to Lanka. He finds Sita in Ashoka Vatika, delivers Ram\'s message, burns Lanka, and returns. The most auspicious Kanda — reading it brings blessings.', summaryHi: 'हनुमान की समुद्र पार लंका यात्रा। अशोक वाटिका में सीता से मुलाकात, राम का संदेश देना, लंका दहन, और वापसी। सबसे शुभ काण्ड — इसे पढ़ने से आशीर्वाद मिलता है।', keyVerse: '"मनोजवं मारुततुल्यवेगं जितेन्द्रियं बुद्धिमतां वरिष्ठम्"', keyVerseRef: 'Sundara Kanda Stuti', lesson: 'Devotion gives supernatural strength — Hanuman\'s faith moved mountains.' },
      { id: 'yuddha', title: 'Yuddha Kanda — The Great Battle', titleHi: 'युद्ध काण्ड — महा संग्राम', verses: 5765, summary: 'The epic battle of Lanka. Ram\'s army crosses the ocean. Vibhishana joins Ram\'s side. Great battles are fought. Ravana is slain. Sita\'s Agni Pariksha. Ram\'s return to Ayodhya and coronation.', summaryHi: 'लंका का महा युद्ध। राम की सेना समुद्र पार करती है। विभीषण राम की शरण लेते हैं। महा युद्ध होते हैं। रावण का वध। सीता की अग्नि परीक्षा। राम की अयोध्या वापसी और राज्याभिषेक।', keyVerse: '"रामो राजमणिः सदा विजयते रामं रमेशं भजे"', keyVerseRef: 'Ramaraksha Stotra', lesson: 'Dharma always triumphs over adharma — truth is never permanently defeated.' },
      { id: 'uttara', title: 'Uttara Kanda — Ram\'s Reign', titleHi: 'उत्तर काण्ड — राम राज्य', verses: 3296, summary: 'Ram\'s glorious reign — Ramarajya, the golden age of dharma. The stories of Ravana\'s history, Luv-Kush\'s birth, and the final mahaprasthan of Ram and Sita.', summaryHi: 'राम का वैभवशाली शासन — रामराज्य, धर्म का स्वर्ण युग। रावण का इतिहास, लव-कुश का जन्म, और राम-सीता का अंतिम महाप्रस्थान।', keyVerse: '"नित्यं दृश्यत्यदृष्टं च रामराज्ये वराप्रयः"', keyVerseRef: 'Valmiki Ramayana 7.1.5', lesson: 'Ramarajya — when dharma rules, all of nature thrives in harmony.' },
    ],
  },
  {
    id: 'mahabharata',
    name: 'Mahabharata',
    nameHi: 'महाभारत',
    icon: '⚔️',
    color: '#8B6914',
    desc: '100,000+ verses, 18 Parvas — The longest epic ever written. Contains the Bhagavad Gita and the complete dharmic code for civilization.',
    descHi: '1 लाख+ श्लोक, 18 पर्व — अब तक लिखा सबसे लंबा महाकाव्य। भगवद्गीता और सभ्यता का सम्पूर्ण धर्मशास्त्र।',
    dailyGoal: 2,
    totalUnits: 18,
    unitName: 'Parvas',
    unitNameHi: 'पर्व',
    sections: [
      { id: 'adi', title: 'Adi Parva — The Beginning', titleHi: 'आदि पर्व — आरंभ', verses: 9984, summary: 'The origin of the Kuru dynasty. Birth of the Pandavas and Kauravas. The house of lac, Draupadi\'s swayamvar, and the Pandavas\' rise.', summaryHi: 'कुरु वंश का उद्गम। पांडवों और कौरवों का जन्म। लाक्षागृह, द्रौपदी स्वयंवर, और पांडवों का उत्थान।', keyVerse: '"धर्मे च अर्थे च काम च मोक्षे च"', keyVerseRef: 'Mahabharata 1.1.19', lesson: 'The four goals of human life — Dharma, Artha, Kama, Moksha — are all honored.' },
      { id: 'sabha', title: 'Sabha Parva — The Assembly', titleHi: 'सभा पर्व — सभा', verses: 2511, summary: 'The dice game. Draupadi\'s humiliation in the assembly. The Pandavas lose everything and are exiled for 13 years.', summaryHi: 'द्यूतक्रीड़ा। सभा में द्रौपदी का अपमान। पांडव सब कुछ हारकर 13 वर्ष के वनवास को जाते हैं।', keyVerse: '"यत्र योगेश्वरः कृष्णो यत्र पार्थो धनुर्धरः"', keyVerseRef: 'Mahabharata 6.42.78', lesson: 'Injustice in the assembly hall — adharma always plants the seeds of its own destruction.' },
      { id: 'vana', title: 'Vana Parva — The Forest', titleHi: 'वन पर्व — वन', verses: 11664, summary: 'The 12 years of forest exile. Stories of Nala-Damayanti, Bhima\'s encounter with Hanuman, Arjuna acquires divine weapons.', summaryHi: '12 वर्ष का वनवास। नल-दमयंती की कथा, भीम की हनुमान से भेंट, अर्जुन का दिव्यास्त्र प्राप्त करना।', keyVerse: '"नात्यन्तं गुणवान् कश्चित् नात्यन्तं निर्गुणोऽपि च"', keyVerseRef: 'Mahabharata 3.33.54', lesson: 'No one is entirely virtuous; no one entirely without virtue — understand human complexity.' },
      { id: 'udyoga', title: 'Udyoga Parva — Preparations', titleHi: 'उद्योग पर्व — युद्ध की तैयारी', verses: 6698, summary: 'Preparations for war. Krishna\'s peace mission to the Kauravas fails. Karna discovers his true identity. Both sides gather their armies.', summaryHi: 'युद्ध की तैयारी। कृष्ण की शांति वार्ता विफल। कर्ण को अपनी असली पहचान का पता चलता है। दोनों पक्ष अपनी सेनाएं जुटाते हैं।', keyVerse: '"न त्वेवाहं जातु नासं न त्वं नेमे जनाधिपाः"', keyVerseRef: 'Mahabharata Bhagavad Gita 2.12', lesson: 'Even before the great battle, peace was attempted — dharma seeks harmony first.' },
      { id: 'bhishma', title: 'Bhishma Parva — The First 10 Days', titleHi: 'भीष्म पर्व — पहले 10 दिन', verses: 5884, summary: 'The Bhagavad Gita is spoken here. Bhishma commands the Kaurava army for 10 days. The mighty Bhishma falls on a bed of arrows.', summaryHi: 'यहाँ भगवद्गीता का उपदेश होता है। भीष्म 10 दिन कौरव सेना का नेतृत्व करते हैं। महान भीष्म बाणों की शय्या पर गिरते हैं।', keyVerse: '"धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः"', keyVerseRef: 'Bhagavad Gita 1.1', lesson: 'The Gita was spoken on the battlefield — wisdom arises in moments of greatest crisis.' },
      { id: 'drona', title: 'Drona Parva — Days 11-15', titleHi: 'द्रोण पर्व — 11-15वाँ दिन', verses: 8909, summary: 'Dronacharya commands. Abhimanyu\'s heroic death in the Chakravyuha. Dronacharya is defeated and killed.', summaryHi: 'द्रोणाचार्य का सेनापतित्व। चक्रव्यूह में अभिमन्यु की वीरगति। द्रोणाचार्य का पतन।', keyVerse: '"आचार्यं मां विजानीहि"', keyVerseRef: 'Mahabharata Bhagavad Gita 4.34', lesson: 'Even the greatest teachers can be trapped by attachment — stay humble before dharma.' },
      { id: 'karna', title: 'Karna Parva — The Tragic Hero', titleHi: 'कर्ण पर्व — त्रासदी का नायक', verses: 4964, summary: 'Karna commands the army for 2 days. Arjuna and Karna\'s final battle. Karna\'s chariot wheel gets stuck — Arjuna kills him. Karna is revealed to be the eldest Pandava.', summaryHi: 'कर्ण 2 दिन सेना का नेतृत्व करते हैं। अर्जुन और कर्ण का अंतिम युद्ध। कर्ण के रथ का पहिया धँस जाता है — अर्जुन उन्हें मारते हैं। कर्ण सबसे बड़े पांडव निकलते हैं।', keyVerse: '"कर्ण उवाच न मे शोकः परं भवेत्"', keyVerseRef: 'Mahabharata 8.49.15', lesson: 'Karna\'s life teaches that loyalty to adharma — however noble — leads to tragedy.' },
      { id: 'shalya', title: 'Shalya Parva — The Final Day', titleHi: 'शल्य पर्व — अंतिम दिन', verses: 3220, summary: 'The last day of battle. Shalya commands the Kauravas. Duryodhana is defeated by Bhima. The Kaurava army is destroyed.', summaryHi: 'युद्ध का अंतिम दिन। शल्य का सेनापतित्व। दुर्योधन का पतन। कौरव सेना का विनाश।', keyVerse: '"अधर्मो धर्म इति यः भेदेन परिपश्यति"', keyVerseRef: 'Mahabharata 12.110.7', lesson: 'Those who mistake adharma for dharma — or dharma for adharma — are truly blind.' },
    ],
  },
  {
    id: 'puranas',
    name: 'Select Puranas',
    nameHi: 'मुख्य पुराण',
    icon: '🌺',
    color: '#1A5C1A',
    desc: '18 Mahapuranas contain the complete cosmology, history, and spiritual science of Sanatan Dharma.',
    descHi: '18 महापुराणों में सनातन धर्म का सम्पूर्ण ब्रह्मांड विज्ञान, इतिहास और आध्यात्मिक ज्ञान है।',
    dailyGoal: 1,
    totalUnits: 6,
    unitName: 'Puranas',
    unitNameHi: 'पुराण',
    sections: [
      { id: 'vishnu', title: 'Vishnu Purana', titleHi: 'विष्णु पुराण', verses: 23000, summary: 'The story of Vishnu and his avatars. Creation of the universe, Prahlad\'s devotion, and the descent of Vishnu\'s ten avatars (Dashavatar).', summaryHi: 'विष्णु और उनके अवतारों की कथा। ब्रह्मांड की रचना, प्रह्लाद की भक्ति, और विष्णु के दस अवतारों (दशावतार) का वर्णन।', keyVerse: '"विष्णोर्नामसहस्रं च स्मृत्वा पापात् प्रमुच्यते"', keyVerseRef: 'Vishnu Purana 3.7.11', lesson: 'Vishnu pervades all of creation — every atom of existence is His body.' },
      { id: 'shiva', title: 'Shiva Purana', titleHi: 'शिव पुराण', verses: 24000, summary: 'The nature and glory of Shiva. The story of Sati and Parvati, the birth of Kartikeya and Ganesha, and the significance of Shivlinga worship.', summaryHi: 'शिव की प्रकृति और महिमा। सती और पार्वती की कथा, कार्तिकेय और गणेश का जन्म, और शिवलिंग पूजा का महत्व।', keyVerse: '"ॐ नमः शिवाय च"', keyVerseRef: 'Shiva Purana, Sri Rudra 8.1.1', lesson: 'Shiva is both destroyer and creator — without endings, there are no new beginnings.' },
      { id: 'devi', title: 'Devi Bhagavatam', titleHi: 'देवी भागवतम्', verses: 18000, summary: 'The glory of the Divine Mother. The battles of Durga against demons, the Navadurga forms, and the liberation available through the worship of Shakti.', summaryHi: 'दिव्य माँ की महिमा। देवी के राक्षसों से युद्ध, नवदुर्गा के स्वरूप, और शक्ति उपासना से मुक्ति।', keyVerse: '"या देवी सर्वभूतेषु शक्तिरूपेण संस्थिता"', keyVerseRef: 'Devi Mahatmyam 5.12', lesson: 'The Divine Mother manifests as the power within all beings — her grace is protection.' },
      { id: 'bhagavata', title: 'Shrimad Bhagavatam', titleHi: 'श्रीमद् भागवतम्', verses: 18000, summary: 'The crown jewel of all Puranas. The complete story of Vishnu\'s avatars, especially Krishna\'s Vrindavana leelas, Prahlad, Dhruva, and the path of pure devotion (Bhakti).', summaryHi: 'सभी पुराणों का मुकुट मणि। विष्णु के अवतारों की पूर्ण कथा, विशेष रूप से कृष्ण की वृंदावन लीलाएं, प्रह्लाद, ध्रुव, और शुद्ध भक्ति का मार्ग।', keyVerse: '"धर्मः प्रोज्झितकैतवोऽत्र परमो निर्मत्सराणां सतां"', keyVerseRef: 'Shrimad Bhagavatam 1.1.2', lesson: 'The highest dharma is pure devotion — love for God that seeks nothing in return.' },
      { id: 'garuda', title: 'Garuda Purana', titleHi: 'गरुड़ पुराण', verses: 18000, summary: 'Spoken by Vishnu to Garuda. Contains knowledge about death, the journey of the soul, karma, and what awaits us after death. Read during funeral rites.', summaryHi: 'विष्णु द्वारा गरुड़ को दिया ज्ञान। मृत्यु, आत्मा की यात्रा, कर्म, और मृत्यु के बाद क्या होता है। अंतिम संस्कार में पठनीय।', keyVerse: '"यत् कृत्वा न पश्चाताप पापात् स नरकं व्रजेत्"', keyVerseRef: 'Garuda Purana 2.4.50', lesson: 'Our actions follow us beyond death — live with such integrity that you carry no regrets.' },
      { id: 'agni', title: 'Agni Purana', titleHi: 'अग्नि पुराण', verses: 15400, summary: 'The encyclopaedia of Sanatan Dharma. Contains temple architecture (Vastu), grammar, medicine, astronomy, military science, and ritual procedures.', summaryHi: 'सनातन धर्म का विश्वकोश। मंदिर वास्तुकला, व्याकरण, चिकित्सा, खगोल, सैन्य विज्ञान, और पूजा विधि।', keyVerse: '"सर्वज्ञानस्य मूलं वेदाः सर्वविद्यानां"', keyVerseRef: 'Agni Purana 1.1.2', lesson: 'The Vedas are the root of all knowledge — every science has its origin in dharma.' },
    ],
  },
];

// ════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════
export default function KathaVaultScreen({ onClose, lang }) {
  const [selected,  setSelected]  = useState(null); // selected scripture
  const [openSec,   setOpenSec]   = useState(null); // open section detail
  const [progress,  setProgress]  = useState({});   // { sectionId: true/false }
  const isEn = lang !== 'hindi';

  useEffect(() => {
    AsyncStorage.getItem('dharmasetu_katha_progress').then(raw => {
      if (raw) setProgress(JSON.parse(raw));
    });
  }, []);

  const markRead = async (sectionId) => {
    const updated = { ...progress, [sectionId]: true };
    setProgress(updated);
    await AsyncStorage.setItem('dharmasetu_katha_progress', JSON.stringify(updated));
    Vibration.vibrate(20);
  };

  const getProgress = (scripture) => {
    const done = scripture.sections.filter(s => progress[s.id]).length;
    return { done, total: scripture.sections.length, pct: Math.round((done / scripture.sections.length) * 100) };
  };

  // Section detail view
  if (openSec) {
    const sec = openSec;
    const isRead = progress[sec.id];
    return (
      <View style={s.secDetail}>
        <View style={s.secHdr}>
          <TouchableOpacity onPress={() => setOpenSec(null)} style={s.backBtn}>
            <Text style={s.backTxt}>← {isEn ? 'Back' : 'वापस'}</Text>
          </TouchableOpacity>
          {!isRead && (
            <TouchableOpacity style={s.markBtn} onPress={() => markRead(sec.id)}>
              <Text style={s.markTxt}>✓ {isEn ? 'Mark Read' : 'पढ़ा'}</Text>
            </TouchableOpacity>
          )}
          {isRead && <Text style={s.readDone}>✓ {isEn ? 'Completed' : 'पूर्ण'}</Text>}
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <Text style={s.secTitle}>{isEn ? sec.title : sec.titleHi}</Text>
          <Text style={s.secVerses}>{sec.verses.toLocaleString()} {isEn ? 'verses' : 'श्लोक'}</Text>

          <View style={s.infoBox}>
            <Text style={s.infoLabel}>{isEn ? 'Summary' : 'सारांश'}</Text>
            <Text style={s.infoTxt}>{isEn ? sec.summary : sec.summaryHi}</Text>
          </View>

          <View style={s.infoBox}>
            <Text style={s.infoLabel}>{isEn ? 'Key Verse' : 'मुख्य श्लोक'}</Text>
            <Text style={s.keyVerse}>{sec.keyVerse}</Text>
            <Text style={s.keyVerseRef}>{sec.keyVerseRef}</Text>
          </View>

          <View style={s.infoBox}>
            <Text style={s.infoLabel}>{isEn ? 'Today\'s Lesson' : 'आज का सन्देश'}</Text>
            <Text style={s.infoTxt}>{sec.lesson}</Text>
          </View>

          {!isRead && (
            <TouchableOpacity style={s.markBtnLg} onPress={() => { markRead(sec.id); setOpenSec(null); }}>
              <Text style={s.markBtnLgTxt}>{isEn ? '✓ Mark as Read — Earn +5 Points' : '✓ पढ़ा हुआ चिह्नित करें — +5 Points'}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  // Scripture detail view
  if (selected) {
    const prog = getProgress(selected);
    return (
      <View style={s.root2}>
        <View style={s.hdr2}>
          <TouchableOpacity onPress={() => setSelected(null)} style={s.backBtn}>
            <Text style={s.backTxt}>← {isEn ? 'Back' : 'वापस'}</Text>
          </TouchableOpacity>
          <View style={s.progInfo}>
            <Text style={s.progTxt}>{prog.done}/{prog.total} {isEn ? 'complete' : 'पूर्ण'}</Text>
            <View style={s.progBarWrap}>
              <View style={[s.progBarFill, { width: `${prog.pct}%`, backgroundColor: selected.color }]} />
            </View>
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Text style={[s.scriptTitle, { color: selected.color }]}>{isEn ? selected.name : selected.nameHi}</Text>
          <Text style={s.scriptDesc}>{isEn ? selected.desc : selected.descHi}</Text>
          <Text style={s.dailyGoalTxt}>{isEn ? `📅 Daily goal: ${selected.dailyGoal} ${selected.unitName}` : `📅 दैनिक लक्ष्य: ${selected.dailyGoal} ${selected.unitNameHi}`}</Text>

          {selected.sections.map((sec, i) => (
            <TouchableOpacity key={sec.id} style={[s.secCard, progress[sec.id] && s.secCardDone]} onPress={() => setOpenSec(sec)} activeOpacity={0.85}>
              <View style={[s.secNum, { backgroundColor: selected.color + '22' }]}>
                {progress[sec.id]
                  ? <Text style={{ fontSize: 16, color: '#27AE60' }}>✓</Text>
                  : <Text style={{ fontSize: 14, color: selected.color, fontWeight: '700' }}>{i+1}</Text>
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.secCardTitle, progress[sec.id] && { color: 'rgba(253,246,237,0.5)' }]}>{isEn ? sec.title : sec.titleHi}</Text>
                <Text style={s.secCardVerses}>{sec.verses.toLocaleString()} {isEn ? 'verses' : 'श्लोक'}</Text>
              </View>
              <Text style={{ color: 'rgba(253,246,237,0.3)', fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Main library view
  return (
    <View style={s.root2}>
      <View style={s.libHdr}>
        <Text style={s.libTitle}>{isEn ? '📚 Katha Vault' : '📚 कथा वॉल्ट'}</Text>
        <TouchableOpacity onPress={onClose}><Text style={s.closeBtn}>✕</Text></TouchableOpacity>
      </View>
      <Text style={s.libSub}>{isEn ? 'Sacred scriptures of Sanatan Dharma' : 'सनातन धर्म के पवित्र ग्रंथ'}</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {SCRIPTURES.map(sc => {
          const p = getProgress(sc);
          return (
            <TouchableOpacity key={sc.id} style={s.scriptCard} onPress={() => setSelected(sc)} activeOpacity={0.85}>
              <View style={[s.scriptIcon, { backgroundColor: sc.color + '18' }]}>
                <Text style={{ fontSize: 28 }}>{sc.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.scriptCardTitle, { color: sc.color }]}>{isEn ? sc.name : sc.nameHi}</Text>
                <Text style={s.scriptCardDesc} numberOfLines={2}>{isEn ? sc.desc : sc.descHi}</Text>
                <View style={s.scriptCardProg}>
                  <View style={s.progBarWrap2}>
                    <View style={[s.progBarFill2, { width: `${p.pct}%`, backgroundColor: sc.color }]} />
                  </View>
                  <Text style={s.progPct}>{p.done}/{p.total}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root2: { flex: 1, backgroundColor: '#0D0500' },
  secDetail: { flex: 1, backgroundColor: '#0D0500' },

  libHdr:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.1)' },
  libTitle:  { fontSize: 20, fontWeight: '800', color: '#F4A261' },
  closeBtn:  { fontSize: 20, color: 'rgba(253,246,237,0.4)', fontWeight: '600' },
  libSub:    { fontSize: 13, color: 'rgba(253,246,237,0.35)', paddingHorizontal: 20, paddingBottom: 10 },

  scriptCard:     { backgroundColor: '#130700', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', gap: 14, borderWidth: 1, borderColor: 'rgba(240,165,0,0.12)' },
  scriptIcon:     { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  scriptCardTitle:{ fontSize: 15, fontWeight: '700', marginBottom: 4 },
  scriptCardDesc: { fontSize: 12, color: 'rgba(253,246,237,0.4)', lineHeight: 18, marginBottom: 10 },
  scriptCardProg: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progBarWrap2:   { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  progBarFill2:   { height: 4, borderRadius: 2 },
  progPct:        { fontSize: 11, color: 'rgba(253,246,237,0.4)', fontWeight: '600' },

  hdr2:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.1)' },
  backBtn:      { paddingVertical: 6 },
  backTxt:      { fontSize: 14, color: '#E8620A', fontWeight: '600' },
  markBtn:      { backgroundColor: 'rgba(39,174,96,0.15)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#27AE60' },
  markTxt:      { fontSize: 12, color: '#27AE60', fontWeight: '700' },
  readDone:     { fontSize: 12, color: '#27AE60', fontWeight: '700' },
  progInfo:     { flex: 1, marginLeft: 12, gap: 4 },
  progTxt:      { fontSize: 11, color: 'rgba(253,246,237,0.4)' },
  progBarWrap:  { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  progBarFill:  { height: 4, borderRadius: 2 },

  scriptTitle:  { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  scriptDesc:   { fontSize: 13, color: 'rgba(253,246,237,0.5)', lineHeight: 20, marginBottom: 10 },
  dailyGoalTxt: { fontSize: 12, color: '#C9830A', marginBottom: 16 },

  secCard:     { backgroundColor: '#160800', borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(200,130,40,0.12)' },
  secCardDone: { opacity: 0.7, borderColor: 'rgba(39,174,96,0.2)' },
  secNum:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secCardTitle:{ fontSize: 13, fontWeight: '600', color: '#FDF6ED', marginBottom: 2 },
  secCardVerses:{ fontSize: 11, color: 'rgba(253,246,237,0.35)' },

  secHdr:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.1)' },
  secTitle:  { fontSize: 18, fontWeight: '800', color: '#FDF6ED', marginBottom: 6 },
  secVerses: { fontSize: 12, color: 'rgba(253,246,237,0.35)', marginBottom: 20 },
  infoBox:   { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(240,165,0,0.1)' },
  infoLabel: { fontSize: 11, fontWeight: '700', color: '#E8620A', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  infoTxt:   { fontSize: 14, color: 'rgba(253,246,237,0.85)', lineHeight: 23 },
  keyVerse:  { fontSize: 15, color: '#F4A261', fontWeight: '600', lineHeight: 26, marginBottom: 6 },
  keyVerseRef:{ fontSize: 12, color: '#C9830A' },
  markBtnLg: { backgroundColor: '#27AE60', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  markBtnLgTxt:{ color: '#fff', fontSize: 14, fontWeight: '700' },
});