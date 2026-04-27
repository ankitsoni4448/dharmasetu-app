import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { fetchAndCacheConfig } from '../app_config';
import { useEffect } from 'react';

export default function RootLayout() {

  useEffect(() => {
    fetchAndCacheConfig();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="payment" />
      </Stack>
    </SafeAreaProvider>
  );
}