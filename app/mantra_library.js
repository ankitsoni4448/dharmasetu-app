// ════════════════════════════════════════════════════════════════
// DharmaSetu — FINAL Mantra Library (AI + Filter + Cache Ready)
// FILE: app/mantra_library.js
// ════════════════════════════════════════════════════════════════

import { MANTRAS } from './data/mantras';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAIRecommendation } from './utils/ai_api';

export default function MantraLibraryScreen() {
  const insets = useSafeAreaInsets();

  // 🔥 STATES
  const [selectedDeity, setSelectedDeity] = useState(null);
  const [mood, setMood] = useState("peace");
  const [aiSuggestion, setAiSuggestion] = useState(null);

  // 🔥 FILTER
  const filteredMantras = selectedDeity
    ? MANTRAS.filter(m => m.deity === selectedDeity)
    : MANTRAS;

  // 🔥 AI CALL (CACHED)
  useEffect(() => {
    async function loadAI() {
      const result = await getAIRecommendation(mood);
      setAiSuggestion(result);
    }
    loadAI();
  }, [mood]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#0D0500" />

      {/* HEADER */}
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.hdrT}>Mantra Library</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ padding: 16 }}>

        {/* AI SECTION */}
        <Text style={s.sectionTitle}>🤖 AI Suggestion</Text>

        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
          {["peace", "focus", "strength", "healing"].map(m => (
            <TouchableOpacity key={m} onPress={() => setMood(m)}>
              <Text style={s.filterBtn}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {aiSuggestion && (
          <Text style={s.aiText}>
            Recommended: {aiSuggestion}
          </Text>
        )}

        {/* FILTER */}
        <Text style={s.sectionTitle}>🔍 Filter by Deity</Text>

        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          {["All", "Shiva", "Hanuman", "Surya"].map(d => (
            <TouchableOpacity
              key={d}
              onPress={() => setSelectedDeity(d === "All" ? null : d)}
            >
              <Text style={s.filterBtn}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* MANTRA LIST */}
        {filteredMantras.map((m) => (
          <View key={m.id} style={s.card}>
            <Text style={s.cardTitle}>{m.title}</Text>
            <Text style={s.cardDeity}>🕉 {m.deity}</Text>

            <Text style={s.cardText}>{m.text}</Text>
            <Text style={s.meaning}>{m.meaning}</Text>

            <Text style={s.meta}>🕒 {m.bestTime}</Text>
            <Text style={s.meta}>🧭 {m.direction}</Text>
            <Text style={s.meta}>🧘 {m.posture}</Text>
            <Text style={s.meta}>🌿 {m.environment}</Text>
            <Text style={s.meta}>📿 {m.malas}</Text>
          </View>
        ))}

      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0500',
  },

  hdr: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },

  hdrT: {
    color: '#F4A261',
    fontSize: 18,
    fontWeight: 'bold',
  },

  backIcon: {
    fontSize: 28,
    color: '#F4A261',
  },

  sectionTitle: {
    color: '#F4A261',
    fontSize: 14,
    marginBottom: 10,
    fontWeight: 'bold',
  },

  filterBtn: {
    color: '#fff',
    marginRight: 10,
    backgroundColor: '#222',
    padding: 8,
    borderRadius: 8,
  },

  aiText: {
    color: '#3498DB',
    marginBottom: 20,
    fontSize: 14,
  },

  card: {
    backgroundColor: '#130700',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },

  cardTitle: {
    color: '#F4A261',
    fontSize: 16,
    fontWeight: 'bold',
  },

  cardDeity: {
    color: '#fff',
    marginBottom: 5,
  },

  cardText: {
    color: '#fff',
    marginVertical: 8,
  },

  meaning: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 10,
  },

  meta: {
    color: '#aaa',
    fontSize: 12,
  },
});