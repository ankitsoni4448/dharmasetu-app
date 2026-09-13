// ════════════════════════════════════════════════════════════════
// DharmaSetu — Kundli Tab Screen
// FILE: app/(tabs)/kundli.js
// Main kundli screen with profile management
// ════════════════════════════════════════════════════════════════

import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getKundliProfiles, getActiveKundli, deleteKundliProfile, setActiveKundli } from '../../utils/kundli_storage';
import { initializeAccountKundli, isPrimaryKundli } from '../../utils/kundli_account';

const READINESS_COPY = {
  hindi: {
    title: 'अपनी कुंडली बनाने के लिए जन्म विवरण पूरा करें',
    description: 'सटीक जन्म कुंडली के लिए अपनी जन्म तिथि, जन्म समय और जन्म स्थान की जानकारी पूरी करें।',
    action: 'जन्म विवरण पूरा करें',
  },
  english: {
    title: 'Complete your birth details',
    description: 'Your date, time and place of birth are required to prepare your birth chart.',
    action: 'Complete Birth Details',
  },
};

export default function KundliScreen() {
  const insets = useSafeAreaInsets();
  const [profiles, setProfiles] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [readiness, setReadiness] = useState('LOADING');
  const [language, setLanguage] = useState('hindi');

  useFocusEffect(
    useCallback(() => {
      loadProfiles();
    }, [])
  );

  const loadProfiles = async () => {
    try {
      setRefreshing(true);
      setReadiness('LOADING');

      // Canonical account readiness is resolved before any generation request.
      const result = await initializeAccountKundli();
      setLanguage(result.account?.profile?.language === 'english' ? 'english' : 'hindi');
      if (result.status === 'NEEDS_BIRTH_PROFILE') {
        setProfiles([]);
        setActiveId(null);
        setReadiness('NEEDS_BIRTH_PROFILE');
        return;
      }
      if (result.status === 'SIGNED_OUT' || result.status === 'ERROR') {
        setReadiness(result.status);
        return;
      }

      // Get all profiles
      const ownerId = result.account?.authUserId;
      const profs = (await getKundliProfiles()).filter(profile => ownerId && profile.ownerId === ownerId);
      const active = await getActiveKundli();

      // Separate primary and secondary
      let sortedProfs = [];
      const primary = profs.find(p => isPrimaryKundli(p.id));
      if (primary) {
        sortedProfs.push(primary);
      }
      // Add secondary profiles
      const secondary = profs.filter(p => !isPrimaryKundli(p.id));
      sortedProfs = [...sortedProfs, ...secondary];

      setProfiles(sortedProfs);
      setActiveId(active?.id || primary?.id || null); // Default to primary if no active set
      setReadiness('READY');
    } catch (e) {
      console.error('[kundli] Load error:', e);
      setReadiness('ERROR');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateNew = () => {
    router.push('/kundli_input');
  };

  const handleCompleteBirthDetails = () => router.push('/birth_details');

  const copy = READINESS_COPY[language];

  const handleViewProfile = (id) => {
    if (isPrimaryKundli(id)) {
      router.push('/my_kundli');
      return;
    }
    router.push({
      pathname: '/kundli_result',
      params: { profileId: id },
    });
  };

  const handleDeleteProfile = (id, name) => {
    Alert.alert(
      '🗑️ Delete Kundli',
      `Are you sure you want to delete ${name}'s kundli?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteKundliProfile(id);
              await loadProfiles();
              Alert.alert('✅ Deleted', 'Kundli removed successfully');
            } catch (e) {
              Alert.alert('❌ Error', e.message);
            }
          },
        },
      ]
    );
  };

  const handleSetActive = async (id) => {
    try {
      await setActiveKundli(id);
      setActiveId(id);
    } catch (e) {
      Alert.alert('❌ Error', e.message);
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#0D0500" />

      {/* Header */}
      <View style={s.hdr}>
        <Text style={s.hdrT}>🔯 Kundli</Text>
        {readiness === 'READY' ? (
          <TouchableOpacity
            style={s.createBtn}
            onPress={handleCreateNew}
            activeOpacity={0.85}
          >
            <Text style={s.createBtnTxt}>+ New</Text>
          </TouchableOpacity>
        ) : <View style={s.headerSpacer} />}
      </View>

      {/* Profiles List */}
      {readiness === 'LOADING' ? (
        <View style={s.emptyContainer}>
          <ActivityIndicator color="#F4A261" size="large" />
        </View>
      ) : readiness === 'NEEDS_BIRTH_PROFILE' ? (
        <View style={s.emptyContainer}>
          <Text style={s.emptyIcon}>🔯</Text>
          <Text style={s.emptyTitle}>{copy.title}</Text>
          <Text style={s.emptyText}>{copy.description}</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={handleCompleteBirthDetails} activeOpacity={0.85}>
            <Text style={s.emptyBtnTxt}>{copy.action}</Text>
          </TouchableOpacity>
        </View>
      ) : profiles.length === 0 ? (
        <View style={s.emptyContainer}>
          <Text style={s.emptyIcon}>🔯</Text>
          <Text style={s.emptyTitle}>Complete Your Profile</Text>
          <Text style={s.emptyText}>
            Add your birth date and place to your account to generate your primary Vedic chart
          </Text>
          <TouchableOpacity
            style={s.emptyBtn}
            onPress={handleCreateNew}
            activeOpacity={0.85}
          >
            <Text style={s.emptyBtnTxt}>📝 Create Kundli Manually</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={p => p.id}
          renderItem={({ item }) => (
            <ProfileCard
              profile={item}
              isActive={item.id === activeId}
              isPrimary={isPrimaryKundli(item.id)}
              onView={() => handleViewProfile(item.id)}
              onSetActive={() => handleSetActive(item.id)}
              onDelete={() => handleDeleteProfile(item.id, item.name)}
            />
          )}
          contentContainerStyle={s.list}
          onRefresh={loadProfiles}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function ProfileCard({ profile, isActive, isPrimary, onView, onSetActive, onDelete }) {
  const birth = profile.birthData;
  const calc = profile.calculation;

  const handleDelete = () => {
    if (isPrimary) {
      Alert.alert(
        '🔒 Primary Kundli',
        'Your primary Kundli is linked to your account and cannot be deleted. You can create secondary Kundlis for family members or friends using the + New button.'
      );
      return;
    }
    onDelete();
  };

  return (
    <TouchableOpacity
      style={[s.card, isActive && s.cardActive, isPrimary && s.cardPrimary]}
      onPress={onView}
      activeOpacity={0.85}
    >
      {isActive && <View style={s.activeBadge} />}
      {isPrimary && <View style={s.primaryBadge}><Text style={s.primaryBadgeText}>👤 Primary</Text></View>}

      <View style={s.cardTop}>
        <View style={s.cardInfo}>
          <Text style={s.cardName}>{profile.name}</Text>
          <Text style={s.cardDate}>{birth?.dateOfBirth || '—'}</Text>
        </View>
        <Text style={s.cardEmoji}>{isPrimary ? '👁️' : '🔯'}</Text>
      </View>

      <View style={s.cardDetails}>
        <View style={s.detailItem}>
          <Text style={s.detailLabel}>Lagna</Text>
          <Text style={s.detailValue}>{calc?.lagna?.sign || calc?.lagna?.rashiEn || calc?.lagna?.rashi?.nameEn || 'Not available'}</Text>
        </View>
        <View style={s.detailItem}>
          <Text style={s.detailLabel}>Rashi</Text>
          <Text style={s.detailValue}>{calc?.moon_sign?.sign || calc?.moonRashi?.rashiEn || calc?.moonRashi?.nameEn || 'Not available'}</Text>
        </View>
        <View style={s.detailItem}>
          <Text style={s.detailLabel}>Nakshatra</Text>
          <Text style={s.detailValue}>{calc?.nakshatra?.name || 'Not available'}</Text>
        </View>
      </View>

      <View style={s.cardActions}>
        {!isActive && (
          <TouchableOpacity
            style={s.actionIcon}
            onPress={onSetActive}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={s.actionIconTxt}>⭐</Text>
          </TouchableOpacity>
        )}
        {!isPrimary && (
          <TouchableOpacity
            style={s.actionIcon}
            onPress={handleDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={s.actionIconTxt}>🗑️</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0500' },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(240,165,0,0.1)',
  },
  hdrT: { fontSize: 20, fontWeight: '800', color: '#F4A261' },
  createBtn: {
    backgroundColor: '#6B21A8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  headerSpacer: { width: 62 },
  list: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 20 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#F4A261', marginBottom: 12, textAlign: 'center' },
  emptyText: { fontSize: 14, color: 'rgba(253,246,237,0.6)', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  emptyBtn: {
    backgroundColor: '#6B21A8',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: '#6B21A8',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  emptyBtnTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
  card: {
    backgroundColor: '#130700',
    borderWidth: 1,
    borderColor: 'rgba(240,165,0,0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardActive: { borderColor: '#6B21A8', borderWidth: 2, backgroundColor: 'rgba(107,33,168,0.05)' },
  cardPrimary: { borderColor: '#5FE589', borderWidth: 1.5, backgroundColor: 'rgba(95,229,137,0.03)' },
  activeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6B21A8',
  },
  primaryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#5FE589',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0D0500',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardInfo: { flex: 1, marginTop: 4 },
  cardName: { fontSize: 16, fontWeight: '800', color: '#FFE5CC', marginBottom: 4 },
  cardDate: { fontSize: 12, color: 'rgba(253,246,237,0.5)' },
  cardEmoji: { fontSize: 24, marginLeft: 12 },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(240,165,0,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(240,165,0,0.1)',
  },
  detailItem: { alignItems: 'center' },
  detailLabel: { fontSize: 11, color: 'rgba(253,246,237,0.5)', fontWeight: '600', marginBottom: 4 },
  detailValue: { fontSize: 12, color: '#5FE589', fontWeight: '700' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  actionIcon: { padding: 8 },
  actionIconTxt: { fontSize: 18 },
});
