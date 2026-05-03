import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function PremiumScreen() {
  return (
    <View style={s.container}>
      <Text style={s.title}>💎 Dharma Premium</Text>

      <Text style={s.subtitle}>
        Unlock full Dharma AI power
      </Text>

      <View style={s.box}>
        <Text>✔ Unlimited AI Questions</Text>
        <Text>✔ Personalized Guidance</Text>
        <Text>✔ Advanced Jyotish Insights</Text>
      </View>

      <TouchableOpacity style={s.btn}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>
          Upgrade Now ₹99/month
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={{ marginTop: 20 }}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0500',
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 22,
    color: '#F4A261',
    fontWeight: '800'
  },
  subtitle: {
    color: '#aaa',
    marginBottom: 20
  },
  box: {
    marginVertical: 20
  },
  btn: {
    backgroundColor: '#E8620A',
    padding: 14,
    borderRadius: 10
  }
});