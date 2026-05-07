// ════════════════════════════════════════════════════════════════
// DharmaSetu — P4 Skeleton Loader Components
// FILE: app/components/SkeletonLoader.js
//
// Provides premium shimmer loading states for all major screens.
// Zero external deps — pure RN Animated API.
// ════════════════════════════════════════════════════════════════
import { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, Dimensions } from 'react-native';

const { width: SW } = Dimensions.get('window');
const BASE  = 'rgba(255,255,255,0.04)';
const SHINE = 'rgba(255,255,255,0.10)';

// ── Core shimmer animation ───────────────────────────────────────
function useShimmer(duration = 1200) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return anim;
}

function SkeletonBox({ width = '100%', height = 16, radius = 8, style }) {
  const anim = useShimmer();
  const bg   = anim.interpolate({ inputRange: [0, 1], outputRange: [BASE, SHINE] });
  return (
    <Animated.View
      style={[{
        width, height,
        borderRadius:      radius,
        backgroundColor:   bg,
        marginBottom:      8,
      }, style]}
    />
  );
}

// ── Book Card Skeleton ───────────────────────────────────────────
export function BookCardSkeleton() {
  return (
    <View style={s.bookCard}>
      <SkeletonBox width={80} height={110} radius={10} style={{ marginRight: 12, flexShrink: 0 }} />
      <View style={{ flex: 1 }}>
        <SkeletonBox width="80%" height={14} />
        <SkeletonBox width="50%" height={11} />
        <SkeletonBox width="60%" height={11} style={{ marginTop: 4 }} />
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
          <SkeletonBox width={50} height={22} radius={11} />
          <SkeletonBox width={50} height={22} radius={11} />
        </View>
      </View>
    </View>
  );
}

export function BookListSkeleton({ count = 5 }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => <BookCardSkeleton key={i} />)}
    </View>
  );
}

// ── Panchang Skeleton ────────────────────────────────────────────
export function PanchangSkeleton() {
  return (
    <View style={s.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <SkeletonBox width={120} height={16} />
        <SkeletonBox width={80}  height={22} radius={11} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={{ width: (SW - 80) / 2 }}>
            <SkeletonBox width="60%" height={10} />
            <SkeletonBox width="90%" height={14} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ── DharmaChat Message Skeleton ──────────────────────────────────
export function ChatMessageSkeleton({ isUser = false }) {
  return (
    <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      <View style={{ width: SW * 0.65 }}>
        <SkeletonBox width="100%" height={14} />
        <SkeletonBox width="80%"  height={14} />
        <SkeletonBox width="60%"  height={14} />
      </View>
    </View>
  );
}

// ── Mantra Card Skeleton ─────────────────────────────────────────
export function MantraCardSkeleton() {
  return (
    <View style={[s.card, { marginBottom: 12 }]}>
      <SkeletonBox width="30%" height={10} style={{ marginBottom: 12 }} />
      <SkeletonBox width="90%" height={22} />
      <SkeletonBox width="80%" height={14} style={{ marginTop: 8 }} />
      <SkeletonBox width="60%" height={12} style={{ marginTop: 4 }} />
    </View>
  );
}

// ── Profile/Stats Skeleton ───────────────────────────────────────
export function ProfileSkeleton() {
  return (
    <View style={s.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <SkeletonBox width={64} height={64} radius={32} style={{ marginRight: 16, flexShrink: 0 }} />
        <View style={{ flex: 1 }}>
          <SkeletonBox width="70%" height={18} />
          <SkeletonBox width="50%" height={13} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <SkeletonBox width="60%" height={22} radius={4} />
            <SkeletonBox width="80%" height={11} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Spiritual Journey / Stats Bar ────────────────────────────────
export function StatsBarSkeleton({ bars = 7 }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 80 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const h = 30 + Math.random() * 40;
        return <SkeletonBox key={i} width={(SW - 80) / bars} height={h} radius={4} style={{ marginBottom: 0 }} />;
      })}
    </View>
  );
}

// ── Generic List Skeleton ────────────────────────────────────────
export function ListSkeleton({ rows = 4, hasIcon = false }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          {hasIcon && <SkeletonBox width={40} height={40} radius={20} style={{ marginRight: 12, flexShrink: 0 }} />}
          <View style={{ flex: 1 }}>
            <SkeletonBox width="70%" height={14} />
            <SkeletonBox width="50%" height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Full Screen Loading ──────────────────────────────────────────
export function FullScreenSkeleton() {
  return (
    <View style={s.screen}>
      <SkeletonBox width="50%" height={24} style={{ alignSelf: 'center', marginBottom: 24 }} />
      <PanchangSkeleton />
      <View style={{ height: 16 }} />
      <ListSkeleton rows={3} hasIcon />
      <View style={{ height: 16 }} />
      <BookListSkeleton count={2} />
    </View>
  );
}

const s = StyleSheet.create({
  card:     { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, marginBottom: 12 },
  bookCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, marginBottom: 10 },
  screen:   { flex: 1, padding: 16, backgroundColor: '#0D0500' },
});
