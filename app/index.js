import { useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {

      const raw = await AsyncStorage.getItem('dharmasetu_user');

      // No user → Login
      if (!raw) {
        router.replace('/login');
        return;
      }

      let user = null;

      try {
        user = JSON.parse(raw);
      } catch {
        await AsyncStorage.removeItem('dharmasetu_user');
        router.replace('/login');
        return;
      }

      // Valid user → Home
      if (
        user &&
        user.phone &&
        user.name
      ) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }

    } catch (e) {
      router.replace('/login');
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0D0500',
      }}
    >
      <ActivityIndicator color="#E8620A" size="large" />
    </View>
  );
}