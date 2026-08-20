import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getUnreadNotificationCount } from '../../utils/notificationInbox';

export default function NotificationBell({ language = 'hindi' }) {
  const [count, setCount] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    getUnreadNotificationCount({ refresh: true }).then(value => { if (active) setCount(value); }).catch(() => {});
    return () => { active = false; };
  }, []));
  return <TouchableOpacity style={s.button} onPress={() => router.push('/notifications')} accessibilityRole="button" accessibilityLabel={language === 'hindi' ? 'सूचनाएँ खोलें' : 'Open notifications'}>
    <Text style={s.bell}>🔔</Text>
    {count > 0 ? <View style={s.badge}><Text style={s.badgeText}>{count > 9 ? '9+' : count}</Text></View> : null}
  </TouchableOpacity>;
}

const s = StyleSheet.create({
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(200,130,40,0.2)', backgroundColor: 'rgba(255,255,255,0.035)' },
  bell: { fontSize: 20 },
  badge: { position: 'absolute', right: 2, top: 2, minWidth: 17, height: 17, paddingHorizontal: 3, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E74C3C' },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
