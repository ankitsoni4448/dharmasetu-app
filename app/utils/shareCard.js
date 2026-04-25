// DharmaSetu — Shareable Card Generator
// Creates beautiful text cards for WhatsApp sharing

export function generateShlokCard(shlok, meaning, source, lang) {
  const isH = lang === 'hindi';
  const divider = '━━━━━━━━━━━━━━━━━━━━━━━━';
  
  return `
🕉 *DharmaSetu — Daily Wisdom*
${divider}

*${source}*

${shlok}

${isH ? '📖 अर्थ:' : '📖 Meaning:'}
${meaning}

${divider}
🙏 *DharmaSetu App* — सनातन धर्म का डिजिटल गुरुकुल
📲 Play Store पर डाउनलोड करें: DharmaSetu
*जय सनातन धर्म* 🔱
`.trim();
}

export function generatePanchangCard(panchang, lang) {
  const isH = lang === 'hindi';
  return `
🕉 *आज का पंचांग — DharmaSetu*
📅 ${new Date().toLocaleDateString('hi-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
━━━━━━━━━━━━━━━━━━━━━━━━
🌙 तिथि: *${panchang.tithi}* (${panchang.paksha})
⭐ नक्षत्र: *${panchang.nakshatra}*
🕉 योग: *${panchang.yoga}*
📆 वार: *${panchang.vaar}*
━━━━━━━━━━━━━━━━━━━━━━━━
🌅 सूर्योदय: ${panchang.sunrise} | 🌄 सूर्यास्त: ${panchang.sunset}
⚠️ राहु काल: ${panchang.rahuKaal}
✨ अभिजित: ${panchang.abhijit}
━━━━━━━━━━━━━━━━━━━━━━━━
🙏 DharmaSetu — जय सनातन धर्म 🔱
`.trim();
}

export function generateStreakCard(name, streak, pts, badge, lang) {
  const isH = lang === 'hindi';
  return `
${badge.i} *${name}* का आध्यात्मिक सफर!
━━━━━━━━━━━━━━━━━━━━━━━━
🔥 ${streak} ${isH ? 'दिन की Streak' : 'Day Streak'}
⚡ ${pts} Dharma Points
🏅 Badge: ${badge.n}
━━━━━━━━━━━━━━━━━━━━━━━━
🕉 DharmaSetu App पर join करें!
*जय सनातन धर्म* 🔱
`.trim();
}