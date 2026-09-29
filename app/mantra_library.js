import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Modal, ScrollView, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { backendFetch } from '../utils/backend-config';
import mantraCatalog from '../utils/mantraCatalog';
import mantraPractice from '../utils/mantraPractice';
import discovery from '../utils/mantraDiscovery';
import { addRecentId, getFavoriteIds, getRecentIds, setFavoriteIds } from '../utils/mantraLibraryStorage';

const MODES = ['Library', 'Favorites', 'Recent'];
const { fetchMantraCatalog, filterMantras, filtersFor, verificationLabel } = mantraCatalog;
const { practiceLevelLabel, explanatoryText } = mantraPractice;
const pretty = value => (explanatoryText(value)||'Under review').replaceAll('_', ' ').toLowerCase().replace(/^./, char => char.toUpperCase());

const MantraCard = memo(function MantraCard({ item, favorite, onFavorite, onOpen }) {
  const practiceBadge = practiceLevelLabel(item.practice_level);
  const verificationBadge = verificationLabel(item.verification_status);
  return <Pressable accessibilityRole="button" onPress={() => onOpen(item)} style={s.card}>
    <View style={s.cardHeader}><View style={s.cardIdentity}><Text style={s.cardTitle}>{item.canonical_name}</Text>
      <Text style={s.cardMeta}>{explanatoryText(item.deity_ids[0]) || 'Classification pending'} · {pretty(item.content_type)}</Text></View>
      <TouchableOpacity accessibilityLabel={favorite ? 'Remove favorite' : 'Save favorite'} hitSlop={10} style={s.favorite}
        onPress={() => onFavorite(item.id)}><Text style={s.favoriteText}>{favorite ? '♥' : '♡'}</Text></TouchableOpacity></View>
    <Text numberOfLines={2} ellipsizeMode="tail" style={s.sanskrit}>{item.sanskrit_text_corrupted?'Sacred text under review':item.sanskrit_text}</Text>
    <View style={s.badgeRow}><Text style={s.reviewBadge}>{verificationBadge}</Text><Text style={s.practiceBadge}>{practiceBadge}</Text></View>
    <Text style={s.openText}>View details ›</Text>
  </Pressable>;
});

export default function MantraLibraryScreen() {
  const insets = useSafeAreaInsets();
  const [filterPanel,setFilterPanel]=useState(null); const [intention,setIntention]=useState(null);
  const [query, setQuery] = useState(''); const [deity, setDeity] = useState('All');
  const [purpose, setPurpose] = useState('All'); const [contentType, setContentType] = useState('All');
  const [mode, setMode] = useState('Library'); const [favorites, setFavorites] = useState([]); const [recent, setRecent] = useState([]);
  const [catalog, setCatalog] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
  useFocusEffect(useCallback(() => { let active=true; Promise.all([getFavoriteIds(), getRecentIds()]).then(([f,r])=>{if(active){setFavorites(f);setRecent(r);}});return()=>{active=false;}; }, []));
  const load = useCallback(async () => { setLoading(true); setError(null);
    try { setCatalog(await fetchMantraCatalog(backendFetch)); }
    catch (value) { setError(value?.code || 'MANTRA_CATALOG_UNAVAILABLE'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const filters = useMemo(() => filtersFor(catalog), [catalog]);
  const deityNodes=useMemo(()=>discovery.taxonomyFor(catalog,'DEITY'),[catalog]);
  const filtered = useMemo(() => {
    let rows=filterMantras(catalog,{query,purpose,contentType});
    if(deity!=='All')rows=discovery.byDeity(rows,deity,deityNodes);
    return intention?discovery.forIntention(rows,intention):rows;
  }, [catalog,query,deity,purpose,contentType,intention,deityNodes]);
  const panels={Deity:{values:[...new Set([...filters.deity,...deityNodes.map(n=>n.id)])],selected:deity,select:setDeity},Purpose:{values:filters.purpose,selected:purpose,select:setPurpose},Type:{values:filters.contentType,selected:contentType,select:setContentType}};
  const data = useMemo(() => mode === 'Favorites' ? filtered.filter(item => favorites.includes(item.id))
    : mode === 'Recent' ? recent.map(id => filtered.find(item => item.id === id)).filter(Boolean) : filtered,
  [mode, filtered, favorites, recent]);
  const toggleFavorite = useCallback(id => setFavorites(current => { const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id]; setFavoriteIds(next); return next; }), []);
  const open = useCallback(item => { addRecentId(item.id).then(setRecent); router.push({ pathname: '/mantra_detail', params: { id: item.id } }); }, []);
  return <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}><StatusBar style="light" />
    <View style={s.header}><TouchableOpacity onPress={() => router.back()} style={s.headerButton}><Text style={s.back}>‹</Text></TouchableOpacity>
      <View style={s.headerCopy}><Text style={s.title}>Mantra Library</Text><Text style={s.subtitle}>Find a moment for your practice</Text></View></View>
    <View style={s.modeRow}>{MODES.map(value => <TouchableOpacity key={value} style={[s.mode, mode === value && s.modeOn]} onPress={() => setMode(value)}><Text style={[s.modeText, mode === value && s.modeTextOn]}>{value}</Text></TouchableOpacity>)}</View>
    <View style={s.search}><Text style={s.searchIcon}>⌕</Text><TextInput value={query} onChangeText={setQuery} returnKeyType="search"
      onSubmitEditing={Keyboard.dismiss} placeholder="Search name, deity, Sanskrit, meaning…" placeholderTextColor="#927D70" style={s.searchInput} />
      {query ? <TouchableOpacity onPress={() => setQuery('')} style={s.clear}><Text style={s.clearText}>×</Text></TouchableOpacity> : null}</View>
    <ScrollView horizontal style={{flexGrow:0}} contentContainerStyle={s.filterContent} showsHorizontalScrollIndicator={false}>
      {Object.entries(panels).map(([name,panel])=><TouchableOpacity key={name} accessibilityRole="button" accessibilityState={{expanded:filterPanel===name}} style={s.chip} onPress={()=>setFilterPanel(name)}><Text style={s.chipText}>{name}: {pretty(panel.selected)} ▾</Text></TouchableOpacity>)}
      <TouchableOpacity style={s.chip} onPress={()=>{setDeity('All');setPurpose('All');setContentType('All');setIntention(null);}}><Text style={s.chipText}>Clear filters</Text></TouchableOpacity>
    </ScrollView>
    <Modal visible={!!filterPanel} transparent animationType="slide" onRequestClose={()=>setFilterPanel(null)}>
      <View style={s.modalBackdrop}><View style={[s.filterSheet,{paddingBottom:insets.bottom+16}]}>
        <Text style={s.title}>Browse by {filterPanel?.toLowerCase()}</Text><TouchableOpacity accessibilityLabel="Close filters" style={s.retry} onPress={()=>setFilterPanel(null)}><Text style={s.retryText}>Done</Text></TouchableOpacity>
        <FlatList data={panels[filterPanel]?.values||[]} keyExtractor={value=>value} renderItem={({item})=><TouchableOpacity accessibilityRole="button" accessibilityState={{selected:panels[filterPanel]?.selected===item}} style={[s.filterOption,panels[filterPanel]?.selected===item&&s.chipOn]} onPress={()=>{panels[filterPanel].select(item);setFilterPanel(null);}}><Text style={s.chipText}>{explanatoryText(deityNodes.find(n=>n.id===item)?.label)||pretty(item)}</Text>{deityNodes.find(n=>n.id===item)?.parent_id?<Text style={s.subtitle}>{deityNodes.find(n=>n.id===item).parent_id}</Text>:null}</TouchableOpacity>}/>
      </View></View>
    </Modal>
    {loading ? <View style={s.state}><ActivityIndicator color="#F4A261"/><Text style={s.empty}>Loading Mantras…</Text></View>
      : error && !catalog.length ? <View style={s.state}><Text style={s.empty}>Mantra Library is temporarily unavailable.</Text><TouchableOpacity onPress={load} style={s.retry}><Text style={s.retryText}>Retry</Text></TouchableOpacity></View>
      : <FlatList testID="mantra-library-list" style={{flex:1}} data={data} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      contentContainerStyle={[s.list, { paddingBottom: Math.max(64, insets.bottom + 48) }]} removeClippedSubviews={false} initialNumToRender={8} windowSize={7}
      ListHeaderComponent={<View>{error?<TouchableOpacity onPress={load}><Text style={s.empty}>Refresh failed. Showing your last available Mantras. Tap to retry.</Text></TouchableOpacity>:null}<Text style={s.discoveryTitle}>Discover by purpose</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterContent}>{discovery.INTENTIONS.map(value=><TouchableOpacity key={value} style={[s.chip,intention===value&&s.chipOn]} onPress={()=>setIntention(intention===value?null:value)}><Text style={s.chipText}>{value}</Text></TouchableOpacity>)}</ScrollView><Text style={s.subtitle}>Explore practices with reviewed guidance.</Text><Text style={s.discoveryTitle}>Mantras</Text></View>}
      ListFooterComponent={<View testID="mantra-library-footer" style={{height:24}}/>}
      ListEmptyComponent={<Text style={s.empty}>{intention ? 'Reviewed guidance for this intention is not yet available. Try browsing all Mantras.' : catalog.length ? 'No matching Mantras.' : 'No Mantras are currently available.'}</Text>}
      renderItem={({ item }) => <MantraCard item={item} favorite={favorites.includes(item.id)} onFavorite={toggleFavorite} onOpen={open} />}/>}</View>;
}

const s = StyleSheet.create({
  modalBackdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'#0009'},filterSheet:{height:'75%',maxHeight:'85%',backgroundColor:'#211209',padding:20,borderTopLeftRadius:24,borderTopRightRadius:24},filterOption:{minHeight:48,padding:14,borderRadius:12,marginVertical:3},discoveryTitle:{fontSize:18,color:'#F4A261',fontWeight:'700',marginVertical:14},
  root:{flex:1,backgroundColor:'#100702'},state:{flex:1,alignItems:'center',justifyContent:'center',padding:24},retry:{minHeight:44,paddingHorizontal:22,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:'#E8620A'},retryText:{color:'#fff',fontWeight:'800'},header:{minHeight:58,flexDirection:'row',alignItems:'center',paddingHorizontal:12,borderBottomWidth:1,borderBottomColor:'#3D2417'},headerButton:{minWidth:44,minHeight:44,justifyContent:'center'},back:{fontSize:34,color:'#F4A261'},headerCopy:{flex:1,flexShrink:1},title:{fontSize:20,fontWeight:'800',color:'#FFF4E8',flexShrink:1},subtitle:{fontSize:11,color:'#C6AA96',marginTop:2,flexShrink:1},modeRow:{flexDirection:'row',flexWrap:'wrap',gap:8,padding:12,paddingBottom:6},mode:{minHeight:44,flexGrow:1,minWidth:88,alignItems:'center',justifyContent:'center',borderRadius:12,borderWidth:1,borderColor:'#4A2A18'},modeOn:{backgroundColor:'#E8620A',borderColor:'#E8620A'},modeText:{fontSize:12,fontWeight:'700',color:'#D4BEAE',flexShrink:1},modeTextOn:{color:'#fff'},search:{marginHorizontal:12,marginVertical:6,minHeight:48,flexDirection:'row',alignItems:'center',borderRadius:14,borderWidth:1,borderColor:'#56331E',backgroundColor:'#1D0E07',paddingHorizontal:12},searchIcon:{fontSize:22,color:'#F4A261',marginRight:8},searchInput:{flex:1,minWidth:0,fontSize:14,color:'#FFF4E8',paddingVertical:10},clear:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},clearText:{fontSize:24,color:'#BFA99A'},filterBlock:{marginTop:5},filterLabel:{marginHorizontal:14,marginBottom:5,fontSize:10,fontWeight:'800',textTransform:'uppercase',letterSpacing:.8,color:'#A98C77'},filterContent:{paddingHorizontal:12,gap:7,paddingBottom:4},chip:{minHeight:44,maxWidth:180,paddingHorizontal:13,justifyContent:'center',borderRadius:20,borderWidth:1,borderColor:'#4A2A18',backgroundColor:'#180B05'},chipOn:{borderColor:'#F4A261',backgroundColor:'#42200E'},chipText:{fontSize:11,color:'#D4BEAE',flexShrink:1},chipTextOn:{color:'#FFD7A2',fontWeight:'800'},list:{padding:12,gap:11},resultCount:{fontSize:11,color:'#A98C77',marginBottom:2},card:{padding:15,borderRadius:17,borderWidth:1,borderColor:'#4A2A18',backgroundColor:'#1A0C06'},cardHeader:{flexDirection:'row',alignItems:'flex-start',gap:8},cardIdentity:{flex:1,minWidth:0},cardTitle:{fontSize:16,fontWeight:'800',color:'#FFF4E8',flexShrink:1},cardMeta:{fontSize:11,color:'#C6AA96',marginTop:3,textTransform:'capitalize',flexShrink:1},favorite:{width:44,height:44,alignItems:'center',justifyContent:'center'},favoriteText:{fontSize:24,color:'#F4A261'},sanskrit:{fontSize:17,lineHeight:27,color:'#E8C9FF',marginTop:9},badgeRow:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:10},reviewBadge:{fontSize:10,color:'#FFE0A3',backgroundColor:'#49300B',paddingHorizontal:8,paddingVertical:5,borderRadius:12,overflow:'hidden'},practiceBadge:{fontSize:10,color:'#DCC8BA',backgroundColor:'#2B180D',paddingHorizontal:8,paddingVertical:5,borderRadius:12,overflow:'hidden',flexShrink:1},openText:{fontSize:12,fontWeight:'700',color:'#F4A261',marginTop:11},empty:{padding:30,textAlign:'center',color:'#BFA99A'}
});
