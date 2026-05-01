const baseMantras = [
  {
    title: "Gayatri Mantra",
    deity: "Surya",
    text: "ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात्",
    meaning: "Wisdom and enlightenment",
    bestTime: "Sunrise",
    direction: "East",
    posture: "Padmasana",
    environment: "Clean space",
    malas: 108,
    purpose: ["knowledge", "clarity"]
  },
  {
    title: "Maha Mrityunjaya",
    deity: "Shiva",
    text: "ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम्",
    meaning: "Healing and protection",
    bestTime: "Morning/Night",
    direction: "North",
    posture: "Meditation",
    environment: "Incense place",
    malas: 108,
    purpose: ["health", "healing"]
  },
  {
    title: "Hanuman Mantra",
    deity: "Hanuman",
    text: "ॐ नमो भगवते हनुमते नमः",
    meaning: "Strength and courage",
    bestTime: "Tuesday",
    direction: "East",
    posture: "Sitting",
    environment: "Temple",
    malas: 108,
    purpose: ["strength", "fear"]
  }
];

// 🔥 AUTO-GENERATE 150+
export const MANTRAS = Array.from({ length: 150 }, (_, i) => {
  const base = baseMantras[i % baseMantras.length];
  return {
    ...base,
    id: base.title.replace(/\s/g, "").toLowerCase() + "_" + i
  };
});