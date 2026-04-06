import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabIcon({ emoji, focused }) {
  return (
    <View style={[ic.wrap, focused && ic.wrapOn]}>
      <Text style={[ic.emoji, focused && ic.emojiOn]}>{emoji}</Text>
    </View>
  );
}

const ic = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  wrapOn: {},
  emoji: { fontSize: 22, opacity: 0.4 },
  emojiOn: { opacity: 1 },
});

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0D0500',
          borderTopColor: 'rgba(240,165,0,0.1)',
          borderTopWidth: 1,
          height: 62 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 4,
        },
        tabBarActiveTintColor: '#E8620A',
        tabBarInactiveTintColor: 'rgba(253,246,237,0.3)',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'DharmaChat',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} />,
        }}
      />
    </Tabs>
  );
}