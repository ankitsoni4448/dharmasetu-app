import React, { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, Animated, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../utils/supabase';
import { getUserFromBackend } from '../utils/register_backend';

export default function Index() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true })
    ]).start();

    // Check auth with a brief visual padding delay (1500ms) to ensure premium onboarding experience
    const timer = setTimeout(() => {
      checkAuth();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const checkAuth = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const session = data.session;
      if (!session) {
        router.replace('/login');
        return;
      }

      const authPhone = session.user?.phone || '';
      const localPhone = authPhone.startsWith('+91') ? authPhone.slice(3) : authPhone;
      if (localPhone) {
        const backendUser = await getUserFromBackend(localPhone);
        if (backendUser) {
          await AsyncStorage.setItem('dharmasetu_user', JSON.stringify(backendUser));
          router.replace('/(tabs)');
          return;
        }
      }

      const raw = await AsyncStorage.getItem('dharmasetu_user');
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
      if (user && user.phone && user.name && (!localPhone || user.phone === localPhone)) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    } catch (e) {
      router.replace('/login');
    }
  };

  return (
    <View style={s.root}>
      <StatusBar style="light" backgroundColor="#0D0500" />
      <Animated.View style={[s.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Text style={s.sacredSymbol}>🕉</Text>
        <Text style={s.title}>DharmaSetu</Text>
        <Text style={s.subtitle}>सनातन धर्म का मार्गदर्शक</Text>
        <ActivityIndicator color="#E8620A" size="small" style={{ marginTop: 24 }} />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0500',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sacredSymbol: {
    fontSize: 72,
    color: '#D4AF37', // Golden Metallic color
    textShadowColor: 'rgba(232,98,10,0.5)',
    textShadowRadius: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#E8620A', // Saffron highlight
    letterSpacing: 1.5,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(253,246,237,0.5)',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 6,
  },
});
