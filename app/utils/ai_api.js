import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = "https://dharmasetu-backend-2c65.onrender.com";

export async function getAIRecommendation(mood) {
  try {
    const cacheKey = `AI_${mood}`;

    // 🔥 Check cache
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return cached;
    }

    // 🔥 Call backend
    const res = await fetch(`${BACKEND_URL}/ai/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood })
    });

    const data = await res.json();

    const result = data.mantra || "Gayatri Mantra";

    // 🔥 Save cache
    await AsyncStorage.setItem(cacheKey, result);

    return result;

  } catch (e) {
    console.log("AI API error:", e);
    return "Gayatri Mantra";
  }
}