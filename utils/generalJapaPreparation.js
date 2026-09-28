'use strict';

const GENERAL_JAPA_PREPARATION = Object.freeze({
  titleHi: 'सामान्य जप की तैयारी',
  titleEn: 'General Japa Preparation',
  disclaimerHi: 'यह सामान्य शैक्षिक मार्गदर्शन है, हर मंत्र के लिए अनिवार्य या मंत्र-विशिष्ट विधि नहीं।',
  disclaimerEn: 'This is general educational guidance, not a mandatory or mantra-specific method for every Mantra.',
  items: Object.freeze([
    { id:'cleanliness', category:'RECOMMENDED', summary:true, hi:'यथासंभव स्नान करके अथवा स्वयं को स्वच्छ करके जप करें।', en:'Where practical, bathe or otherwise make yourself clean before Japa.' },
    { id:'place', category:'RECOMMENDED', summary:true, hi:'स्वच्छ वस्त्र पहनें और स्वच्छ, शांत स्थान चुनें।', en:'Wear clean clothing and choose a clean, quiet place.' },
    { id:'seat', category:'RECOMMENDED', summary:true, hi:'स्थिर और आरामदायक आसन पर बैठें।', en:'Sit in a stable and comfortable position.' },
    { id:'focus', category:'RECOMMENDED', summary:true, hi:'मन को शांत करके मंत्र या आराध्य पर ध्यान केंद्रित करें।', en:'Settle the mind and focus attention on the Mantra or the revered form.' },
    { id:'recitation', category:'RECOMMENDED', summary:true, hi:'मंत्र का उच्चारण सावधानी, श्रद्धा और एकाग्रता से करें।', en:'Recite carefully, respectfully, and with focused attention.' },
    { id:'breathing', category:'RECOMMENDED', summary:true, hi:'श्वास सामान्य और सहज रखें।', en:'Keep the breath natural and comfortable.' },
    { id:'direction', category:'TRADITION_DEPENDENT', hi:'कुछ परंपराओं में पूर्व या उत्तर दिशा की ओर बैठना अनुशंसित है; इसे हर मंत्र के लिए अनिवार्य नियम न मानें।', en:'Some traditions recommend facing east or north; do not treat this as a mandatory rule for every Mantra.' },
    { id:'eyes', category:'INFORMATIONAL', hi:'आँखें बंद करना अनिवार्य सार्वभौमिक नियम नहीं है। अपनी साधना और परंपरा के अनुसार मंत्र, आराध्य या ध्यान पर एकाग्र रहें।', en:'Closing the eyes is not a universal requirement. Follow your practice and tradition while keeping attention on the Mantra, revered form, or meditation.' },
    { id:'specific_rules', category:'TRADITION_DEPENDENT', hi:'विशेष माला, जप-संख्या, दिशा, समय, आसन, वस्त्र, संकल्प, न्यास, ध्यान, अर्पण या अन्य विधि मंत्र और परंपरा के अनुसार अलग हो सकती है। नीचे केवल उपलब्ध समीक्षा-आधारित मंत्र-विशिष्ट निर्देश दिखाए जाएँ।', en:'A specific mala, count, direction, time, seat, clothing, sankalpa, nyasa, meditation, offering, or other method may vary by Mantra and tradition. Only available reviewed mantra-specific guidance is shown separately.' },
  ]),
});

const PREPARATION_CATEGORY_LABELS = Object.freeze({
  RECOMMENDED: 'Recommended', TRADITION_DEPENDENT: 'Tradition-dependent', INFORMATIONAL: 'Informational',
});

module.exports = { GENERAL_JAPA_PREPARATION, PREPARATION_CATEGORY_LABELS };
