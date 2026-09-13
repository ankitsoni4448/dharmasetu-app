import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMantraById } from '../data/mantraV2';
import { MANTRA_FILTERS, searchMantras } from '../data/mantraIndex';
import { addRecentId, getFavoriteIds, getRecentIds, setFavoriteIds } from '../utils/mantraLibraryStorage';

const MODES = ['Library', 'Favorites', 'Recent'];
const pretty = value => value.replaceAll('_', ' ').toLowerCase().replace(/^./, char => char.toUpperCase());

const FilterRow = memo(function FilterRow({ label, values, selected, onSelect }) {
  return <View style={s.filterBlock}><Text style={s.filterLabel}>{label}</Text><FlatList horizontal data={values} keyExtractor={item => item}
    showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterContent}
    renderItem={({ item }) => <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: item === selected }}
      style={[s.chip, item === selected && s.chipOn]} onPress={() => onSelect(item)}><Text numberOfLines={1} style={[s.chipText, item === selected && s.chipTextOn]}>{pretty(item)}</Text></TouchableOpacity>} /></View>;
});

const MantraCard = memo(function MantraCard({ item, favorite, onFavorite, onOpen }) {
  const practiceBadge = item.practice_level === 'TRADITION_SPECIFIC' ? 'Tradition-specific review' : 'General practice review';
  const verificationBadge = item.verification_status === 'VERIFIED' ? 'Verified' : item.verification_status === 'RESTRICTED' ? 'Restricted' : 'Review required';
  return <Pressable accessibilityRole="button" onPress={() => onOpen(item)} style={s.card}>
    <View style={s.cardHeader}><View style={s.cardIdentity}><Text style={s.cardTitle}>{item.canonical_name}</Text>
      <Text style={s.cardMeta}>{item.deity_ids[0] || 'Universal'} · {pretty(item.content_type)}</Text></View>
      <TouchableOpacity accessibilityLabel={favorite ? 'Remove favorite' : 'Save favorite'} hitSlop={10} style={s.favorite}
        onPress={() => onFavorite(item.id)}><Text style={s.favoriteText}>{favorite ? '♥' : '♡'}</Text></TouchableOpacity></View>
    <Text numberOfLines={2} ellipsizeMode="tail" style={s.sanskrit}>{item.sanskrit_text}</Text>
    <View style={s.badgeRow}><Text style={s.reviewBadge}>{verificationBadge}</Text><Text style={s.practiceBadge}>{practiceBadge}</Text></View>
    <Text style={s.openText}>View details ›</Text>
  </Pressable>;
});

export default function MantraLibraryScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState(''); const [deity, setDeity] = useState('All');
  const [purpose, setPurpose] = useState('All'); const [contentType, setContentType] = useState('All');
  const [mode, setMode] = useState('Library'); const [favorites, setFavorites] = useState([]); const [recent, setRecent] = useState([]);
  useEffect(() => { Promise.all([getFavoriteIds(), getRecentIds()]).then(([f, r]) => { setFavorites(f); setRecent(r); }); }, []);
  const filtered = useMemo(() => searchMantras({ query, deity, purpose, contentType }), [query, deity, purpose, contentType]);
  const data = useMemo(() => mode === 'Favorites' ? filtered.filter(item => favorites.includes(item.id))
    : mode === 'Recent' ? recent.map(getMantraById).filter(Boolean).filter(item => filtered.some(row => row.id === item.id)) : filtered,
  [mode, filtered, favorites, recent]);
  const toggleFavorite = useCallback(id => setFavorites(current => { const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id]; setFavoriteIds(next); return next; }), []);
  const open = useCallback(item => { addRecentId(item.id).then(setRecent); router.push({ pathname: '/mantra_detail', params: { id: item.id } }); }, []);
  return <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}> <StatusBar style="light" />
    <View style={s.header}><TouchableOpacity onPress={() => router.back()} style={s.headerButton}><Text style={s.back}>‹</Text></TouchableOpacity>
      <View style={s.headerCopy}><Text style={s.title}>Mantra Library</Text><Text style={s.subtitle}>मंत्र · verified-content foundation</Text></View></View>
    <View style={s.modeRow}>{MODES.map(value => <TouchableOpacity key={value} style={[s.mode, mode === value && s.modeOn]} onPress={() => setMode(value)}><Text style={[s.modeText, mode === value && s.modeTextOn]}>{value}</Text></TouchableOpacity>)}</View>
    <View style={s.search}><Text style={s.searchIcon}>⌕</Text><TextInput value={query} onChangeText={setQuery} returnKeyType="search"
      onSubmitEditing={Keyboard.dismiss} placeholder="Search name, deity, Sanskrit, meaning…" placeholderTextColor="#927D70" style={s.searchInput} />
      {query ? <TouchableOpacity onPress={() => setQuery('')} style={s.clear}><Text style={s.clearText}>×</Text></TouchableOpacity> : null}</View>
    <FilterRow label="Deity" values={MANTRA_FILTERS.deity} selected={deity} onSelect={setDeity} />
    <FilterRow label="Purpose" values={MANTRA_FILTERS.purpose} selected={purpose} onSelect={setPurpose} />
    <FilterRow label="Content type" values={MANTRA_FILTERS.contentType} selected={contentType} onSelect={setContentType} />
    <FlatList testID="mantra-library-list" data={data} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      contentContainerStyle={[s.list, { paddingBottom: Math.max(20, insets.bottom + 12) }]} removeClippedSubviews initialNumToRender={8} windowSize={7}
      ListHeaderComponent={<Text style={s.resultCount}>{data.length} entries · unverified guidance is withheld</Text>}
      ListEmptyComponent={<Text style={s.empty}>No matching mantra entries.</Text>}
      renderItem={({ item }) => <MantraCard item={item} favorite={favorites.includes(item.id)} onFavorite={toggleFavorite} onOpen={open} />} />
  </View>;
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#100702'},header:{minHeight:58,flexDirection:'row',alignItems:'center',paddingHorizontal:12,borderBottomWidth:1,borderBottomColor:'#3D2417'},headerButton:{minWidth:44,minHeight:44,justifyContent:'center'},back:{fontSize:34,color:'#F4A261'},headerCopy:{flex:1,flexShrink:1},title:{fontSize:20,fontWeight:'800',color:'#FFF4E8',flexShrink:1},subtitle:{fontSize:11,color:'#C6AA96',marginTop:2,flexShrink:1},modeRow:{flexDirection:'row',flexWrap:'wrap',gap:8,padding:12,paddingBottom:6},mode:{minHeight:44,flexGrow:1,minWidth:88,alignItems:'center',justifyContent:'center',borderRadius:12,borderWidth:1,borderColor:'#4A2A18'},modeOn:{backgroundColor:'#E8620A',borderColor:'#E8620A'},modeText:{fontSize:12,fontWeight:'700',color:'#D4BEAE',flexShrink:1},modeTextOn:{color:'#fff'},search:{marginHorizontal:12,marginVertical:6,minHeight:48,flexDirection:'row',alignItems:'center',borderRadius:14,borderWidth:1,borderColor:'#56331E',backgroundColor:'#1D0E07',paddingHorizontal:12},searchIcon:{fontSize:22,color:'#F4A261',marginRight:8},searchInput:{flex:1,minWidth:0,fontSize:14,color:'#FFF4E8',paddingVertical:10},clear:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},clearText:{fontSize:24,color:'#BFA99A'},filterBlock:{marginTop:5},filterLabel:{marginHorizontal:14,marginBottom:5,fontSize:10,fontWeight:'800',textTransform:'uppercase',letterSpacing:.8,color:'#A98C77'},filterContent:{paddingHorizontal:12,gap:7,paddingBottom:4},chip:{minHeight:40,maxWidth:180,paddingHorizontal:13,justifyContent:'center',borderRadius:20,borderWidth:1,borderColor:'#4A2A18',backgroundColor:'#180B05'},chipOn:{borderColor:'#F4A261',backgroundColor:'#42200E'},chipText:{fontSize:11,color:'#D4BEAE',flexShrink:1},chipTextOn:{color:'#FFD7A2',fontWeight:'800'},list:{padding:12,gap:11},resultCount:{fontSize:11,color:'#A98C77',marginBottom:2},card:{padding:15,borderRadius:17,borderWidth:1,borderColor:'#4A2A18',backgroundColor:'#1A0C06'},cardHeader:{flexDirection:'row',alignItems:'flex-start',gap:8},cardIdentity:{flex:1,minWidth:0},cardTitle:{fontSize:16,fontWeight:'800',color:'#FFF4E8',flexShrink:1},cardMeta:{fontSize:11,color:'#C6AA96',marginTop:3,textTransform:'capitalize',flexShrink:1},favorite:{width:44,height:44,alignItems:'center',justifyContent:'center'},favoriteText:{fontSize:24,color:'#F4A261'},sanskrit:{fontSize:17,lineHeight:27,color:'#E8C9FF',marginTop:9},badgeRow:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:10},reviewBadge:{fontSize:10,color:'#FFE0A3',backgroundColor:'#49300B',paddingHorizontal:8,paddingVertical:5,borderRadius:12,overflow:'hidden'},practiceBadge:{fontSize:10,color:'#DCC8BA',backgroundColor:'#2B180D',paddingHorizontal:8,paddingVertical:5,borderRadius:12,overflow:'hidden',flexShrink:1},openText:{fontSize:12,fontWeight:'700',color:'#F4A261',marginTop:11},empty:{padding:30,textAlign:'center',color:'#BFA99A'}
});
