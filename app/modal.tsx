// app/modal.tsx
// Replaced Expo template stubs (ThemedText / ThemedView) with plain
// React Native components to avoid @/ alias resolution failures during
// EAS Android build with Hermes bundler.
import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>DharmaSetu</Text>
      <Link href="/" style={styles.link}>
        <Text style={styles.linkText}>Go to home screen</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#0D0500',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F4A261',
    marginBottom: 16,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    color: '#E8620A',
    fontSize: 14,
  },
});
