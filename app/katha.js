// app/katha.js — Route screen for Katha Vault
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KathaVaultScreen from './katha_vault';

export default function KathaRoute() {
  const [lang, setLang] = useState('hindi');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    AsyncStorage.getItem('dharmasetu_user').then(raw => {
      if (raw) { const u = JSON.parse(raw); setLang(u.language || 'hindi'); }
    });
  }, []);

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: '#0D0500' }}>
      <KathaVaultScreen onClose={() => router.back()} lang={lang} />
    </View>
  );
}