import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getAIRecommendation(mood) {
  try {
    const cacheKey = `AI_REC_${mood}`;
    const cached = await AsyncStorage.getItem(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // 🔥 Replace with your backend later
    const fakeAI = {
      peace: "Gayatri Mantra",
      focus: "Saraswati Mantra",
      strength: "Hanuman Mantra",
      healing: "Maha Mrityunjaya"
    };

    const result = fakeAI[mood] || "Gayatri Mantra";

    await AsyncStorage.setItem(cacheKey, JSON.stringify(result));

    return result;

  } catch (e) {
    return "Gayatri Mantra";
  }
}