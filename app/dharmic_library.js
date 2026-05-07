// DharmaSetu — Dharmic Library Screen  P4
// FILE: app/dharmic_library.js
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, FlatList, Linking, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { safeGet, safeSet, safeGetString, KEYS } from './utils/storage';
import { BookListSkeleton } from './components/SkeletonLoader';
import {
  recordBookView, toggleFavScripture, isFavScripture,
  getReadingHistory, recordEngagement,
} from './utils/journey';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://dharmasetu-backend-2c65.onrender.com';

const CATEGORIES = [
  { id:'all',        label:'All',        labelHi:'सभी'        },
  { id:'vedas',      label:'Vedas',      labelHi:'वेद'        },
  { id:'upanishads', label:'Upanishads', labelHi:'उपनिषद'     },
  { id:'puranas',    label:'Puranas',    labelHi:'पुराण'      },
  { id:'gita',       label:'Gita',       labelHi:'गीता'       },
  { id:'ramayana',   label:'Ramayana',   labelHi:'रामायण'     },
  { id:'mahabharata',label:'Mahabharata',labelHi:'महाभारत'    },
  { id:'stotras',    label:'Stotras',    labelHi:'स्तोत्र'    },
  { id:'modern',     label:'Modern',     labelHi:'आधुनिक'     },
];

const LANGUAGES = [
  { id:'all',      label:'All',      labelHi:'सभी'     },
  { id:'hindi',    label:'Hindi',    labelHi:'हिंदी'   },
  { id:'english',  label:'English',  labelHi:'English' },
  { id:'sanskrit', label:'Sanskrit', labelHi:'संस्कृत' },
];

// ── Book Card ─────────────────────────────────────────────────
function BookCard({ book, lang, onPress }) {
  const isH = lang === 'hindi';
  const title = (isH && book.title_hindi) ? book.title_hindi : book.title;
  const desc  = (isH && book.description_hindi) ? book.description_hindi : book.description;
  const catColor = {
    vedas:'#E8620A', upanishads:'#9B59B6', puranas:'#27AE60',
    gita:'#F4A261', ramayana:'#3498DB', mahabharata:'#C0392B',
    stotras:'#C9830A', modern:'#2C3E50', other:'#7F8C8D',
  };
  const cc = catColor[book.category] || '#C9830A';
  return (
    <TouchableOpacity style={s.card} onPress={() => onPress(book)} activeOpacity={0.88}>
      <View style={s.cardHdr}>
        <View style={[s.catBadge, { backgroundColor: cc + '22', borderColor: cc }]}>
          <Text style={[s.catBadgeTxt, { color: cc }]}>{book.category}</Text>
        </View>
        {book.is_premium && (
          <View style={s.premBadge}><Text style={s.premBadgeTxt}>⭐ Premium</Text></View>
        )}
        <Text style={s.langTag}>{book.language}</Text>
      </View>
      <Text style={s.cardTitle} numberOfLines={2}>{title}</Text>
      {book.author ? <Text style={s.cardAuthor}>✍️ {book.author}</Text> : null}
      {desc ? <Text style={s.cardDesc} numberOfLines={3}>{desc}</Text> : null}
      <View style={s.cardFooter}>
        {book.page_count ? <Text style={s.cardMeta}>📄 {book.page_count} pages</Text> : null}
        <Text style={s.cardMeta}>👁️ {book.views || 0}</Text>
        {book.file_url ? (
          <View style={s.readBtn}><Text style={s.readBtnTxt}>{isH ? 'पढ़ें ›' : 'Read ›'}</Text></View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ── Book Detail Modal ─────────────────────────────────────────
function BookDetail({ book, lang, onClose, phone }) {
  const isH = lang === 'hindi';
  const title = (isH && book.title_hindi) ? book.title_hindi : book.title;
  const desc  = (isH && book.description_hindi) ? book.description_hindi : book.description;

  const handleRead = () => {
    if (!book.file_url) {
      Alert.alert('', isH ? 'PDF अभी उपलब्ध नहीं है' : 'PDF not yet available');
      return;
    }
    // Record view
    fetch(`${BACKEND}/library/books/${book.id}/view`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ phone: phone || '' }),
    }).catch(()=>{});
    Linking.openURL(book.file_url).catch(() =>
      Alert.alert('', isH ? 'लिंक नहीं खुला' : 'Could not open link')
    );
  };

  const handleAskAI = () => {
    const q = isH
      ? `"${title}" पुस्तक के बारे में बताएं और इसकी प्रमुख शिक्षाएं क्या हैं?`
      : `Tell me about the book "${title}" and its key teachings.`;
    safeSet(KEYS.PRESET_QUESTION, q).then(() => {
      onClose();
      router.push('/(tabs)/explore');
    });
  };

  return (
    <View style={s.detailOverlay}>
      <TouchableOpacity style={s.detailBackdrop} onPress={onClose} />
      <View style={s.detailSheet}>
        <View style={s.detailHandle} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={s.detailClose} onPress={onClose}>
            <Text style={{ color:'rgba(253,246,237,0.4)', fontSize:18 }}>✕</Text>
          </TouchableOpacity>
          <Text style={s.detailTitle}>{title}</Text>
          {book.title_sanskrit ? <Text style={s.detailSan}>{book.title_sanskrit}</Text> : null}
          <View style={s.detailMetaRow}>
            {book.author   ? <Text style={s.detailMeta}>✍️ {book.author}</Text>   : null}
            {book.source   ? <Text style={s.detailMeta}>📚 {book.source}</Text>   : null}
            {book.language ? <Text style={s.detailMeta}>🌐 {book.language}</Text> : null}
            {book.category ? <Text style={s.detailMeta}>🗂️ {book.category}</Text> : null}
            {book.page_count ? <Text style={s.detailMeta}>📄 {book.page_count} pages</Text> : null}
          </View>
          {desc ? <Text style={s.detailDesc}>{desc}</Text> : null}
          {book.tags ? (
            <View style={s.tagsRow}>
              {book.tags.split(',').filter(Boolean).map((t,i) => (
                <View key={i} style={s.tag}><Text style={s.tagTxt}>#{t.trim()}</Text></View>
              ))}
            </View>
          ) : null}
          <TouchableOpacity style={s.readBtnLg} onPress={handleRead} activeOpacity={0.88}>
            <Text style={s.readBtnLgTxt}>{isH ? '📖 पढ़ें / Download' : '📖 Read / Download'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.askBtn} onPress={handleAskAI} activeOpacity={0.88}>
            <Text style={s.askBtnTxt}>{isH ? '💬 DharmaChat से पूछें' : '💬 Ask DharmaChat'}</Text>
          </TouchableOpacity>
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
export default function DharmicLibraryScreen() {
  const insets   = useSafeAreaInsets();
  const [books,    setBooks]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [cat,      setCat]      = useState('all');
  const [lang,     setLang]     = useState('all');
  const [uiLang,   setUiLang]   = useState('hindi');
  const [search,   setSearch]   = useState('');
  const [page,     setPage]     = useState(1);
  const [hasMore,  setHasMore]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [phone,    setPhone]    = useState('');
  const [favIds,   setFavIds]   = useState([]);
  const [recentReads, setRecentReads] = useState([]);
  const isMounted  = useRef(true);

  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  useFocusEffect(useCallback(() => {
    (async () => {
      const u = await safeGet(KEYS.USER);
      if (!isMounted.current) return;
      setUiLang(u?.language || 'hindi');
      setPhone(u?.phone || '');
      // P4: load recent reading history
      const hist = await getReadingHistory(5);
      setRecentReads(hist);
    })();
  }, []));

  const fetchBooks = useCallback(async (catVal, langVal, searchVal, pageVal, append = false) => {
    if (loading) return;
    setLoading(true);
    try {
      let url = `${BACKEND}/library/books?page=${pageVal}&limit=20`;
      if (langVal && langVal !== 'all') url += `&lang=${langVal}`;
      if (catVal  && catVal  !== 'all') url += `&category=${catVal}`;
      if (searchVal) url += `&search=${encodeURIComponent(searchVal)}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (!isMounted.current) return;
      const list = data.books || [];
      setBooks(prev => append ? [...prev, ...list] : list);
      setHasMore(list.length === 20);
    } catch(e) {
      console.log('[Library] fetch error:', e.message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    setPage(1);
    fetchBooks(cat, lang, search, 1, false);
  }, [cat, lang]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchBooks(cat, lang, search, 1, false);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadMore = () => {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    fetchBooks(cat, lang, search, next, true);
  };

  const isH = uiLang === 'hindi';

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#0D0500" />

      {/* HEADER */}
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{top:12,bottom:12,left:12,right:12}}>
          <Text style={s.backIco}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={s.hdrTitle}>📚 {isH ? 'धार्मिक पुस्तकालय' : 'Dharmic Library'}</Text>
          <Text style={s.hdrSub}>{isH ? 'वेद · पुराण · शास्त्र · स्तोत्र' : 'Vedas · Puranas · Shastras · Stotras'}</Text>
        </View>
        <TouchableOpacity
          style={s.langToggle}
          onPress={() => setUiLang(l => l === 'hindi' ? 'english' : 'hindi')}>
          <Text style={s.langToggleTxt}>{isH ? 'EN' : 'हिं'}</Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <View style={s.searchBox}>
        <Text style={s.searchIco}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder={isH ? 'पुस्तक खोजें...' : 'Search books...'}
          placeholderTextColor="rgba(253,246,237,0.3)"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{color:'rgba(253,246,237,0.4)',fontSize:16}}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* LANGUAGE FILTER */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.filterScroll} contentContainerStyle={{paddingHorizontal:14,gap:7}}>
        {LANGUAGES.map(l => (
          <TouchableOpacity key={l.id}
            style={[s.filterChip, lang===l.id && s.filterChipOn]}
            onPress={() => setLang(l.id)}>
            <Text style={[s.filterTxt, lang===l.id && s.filterTxtOn]}>
              {isH ? l.labelHi : l.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* CATEGORY FILTER */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={[s.filterScroll,{marginBottom:6}]} contentContainerStyle={{paddingHorizontal:14,gap:7}}>
        {CATEGORIES.map(c => (
          <TouchableOpacity key={c.id}
            style={[s.catChip, cat===c.id && s.catChipOn]}
            onPress={() => setCat(c.id)}>
            <Text style={[s.catTxt, cat===c.id && s.catTxtOn]}>
              {isH ? c.labelHi : c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* BOOKS LIST — P4: skeleton + recently viewed */}
      {loading && books.length === 0 ? (
        <ScrollView contentContainerStyle={{padding:14,paddingBottom:40}}>
          <BookListSkeleton count={5} />
        </ScrollView>
      ) : books.length === 0 ? (
        <View style={s.emptyBox}>
          <Text style={s.emptyIco}>📚</Text>
          <Text style={s.emptyTxt}>
            {isH
              ? 'अभी कोई पुस्तक उपलब्ध नहीं।\nAdmin से संपर्क करें।'
              : 'No books available yet.\nCheck back soon.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={b => b.id}
          renderItem={({item}) => (
            <BookCard
              book={item}
              lang={uiLang}
              isFav={favIds.includes(item.id)}
              onPress={(b) => {
                setSelected(b);
                recordBookView({id:b.id,title:b.title,category:b.category,language:b.language}).catch(()=>{});
              }}
              onFavToggle={async (b) => {
                const added = await toggleFavScripture({id:b.id,title:b.title,category:b.category});
                setFavIds(prev => added ? [...prev,b.id] : prev.filter(id=>id!==b.id));
              }}
            />
          )}
          contentContainerStyle={{padding:14,gap:14,paddingBottom:40}}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            recentReads.length > 0 && cat === 'all' && !search ? (
              <View style={{marginBottom:16}}>
                <Text style={{color:'rgba(253,246,237,0.4)',fontSize:11,fontWeight:'700',letterSpacing:1,marginBottom:8}}>
                  {isH ? '🕐 हाल में देखा' : '🕐 Recently Viewed'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{flexDirection:'row',gap:8}}>
                    {recentReads.map(b => (
                      <TouchableOpacity key={b.id}
                        style={{backgroundColor:'rgba(232,98,10,0.08)',borderRadius:10,padding:10,borderWidth:1,borderColor:'rgba(232,98,10,0.2)',maxWidth:140}}
                        onPress={() => setSelected(b)}>
                        <Text style={{color:'#F4A261',fontSize:12,fontWeight:'700'}} numberOfLines={2}>{b.title}</Text>
                        <Text style={{color:'rgba(253,246,237,0.35)',fontSize:10,marginTop:3}}>{b.category}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            ) : null
          }
          ListFooterComponent={
            loading && books.length > 0
              ? <ActivityIndicator color="#E8620A" style={{marginVertical:16}} />
              : hasMore
                ? <TouchableOpacity style={s.loadMoreBtn} onPress={loadMore}>
                    <Text style={s.loadMoreTxt}>{isH ? 'और दिखाएं' : 'Load more'}</Text>
                  </TouchableOpacity>
                : null
          }
        />
      )}

      {/* BOOK DETAIL BOTTOM SHEET */}
      {selected && (
        <BookDetail
          book={selected}
          lang={uiLang}
          phone={phone}
          onClose={() => setSelected(null)}
        />
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root:  { flex:1, backgroundColor:'#0D0500' },
  hdr:   { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:13, borderBottomWidth:1, borderBottomColor:'rgba(240,165,0,0.1)' },
  backIco:  { fontSize:28, color:'#F4A261', lineHeight:28 },
  hdrTitle: { fontSize:16, fontWeight:'800', color:'#F4A261' },
  hdrSub:   { fontSize:10, color:'rgba(253,246,237,0.35)', marginTop:1 },
  langToggle:    { borderWidth:1, borderColor:'rgba(200,130,40,0.3)', borderRadius:8, paddingHorizontal:10, paddingVertical:6 },
  langToggleTxt: { color:'#F4A261', fontSize:12, fontWeight:'700' },

  searchBox:   { flexDirection:'row', alignItems:'center', margin:12, backgroundColor:'rgba(255,255,255,0.05)', borderRadius:12, paddingHorizontal:12, borderWidth:1, borderColor:'rgba(200,130,40,0.2)' },
  searchIco:   { fontSize:16, marginRight:8 },
  searchInput: { flex:1, color:'#FDF6ED', fontSize:14, paddingVertical:11 },

  filterScroll: { flexGrow:0, marginBottom:4 },
  filterChip:   { paddingHorizontal:14, paddingVertical:7, borderRadius:20, borderWidth:1, borderColor:'rgba(200,130,40,0.18)', backgroundColor:'rgba(255,255,255,0.03)' },
  filterChipOn: { backgroundColor:'rgba(52,152,219,0.15)', borderColor:'#3498DB' },
  filterTxt:    { fontSize:12, color:'rgba(253,246,237,0.4)', fontWeight:'600' },
  filterTxtOn:  { color:'#3498DB' },

  catChip:   { paddingHorizontal:14, paddingVertical:7, borderRadius:20, borderWidth:1, borderColor:'rgba(200,130,40,0.18)', backgroundColor:'rgba(255,255,255,0.03)' },
  catChipOn: { backgroundColor:'rgba(232,98,10,0.15)', borderColor:'#E8620A' },
  catTxt:    { fontSize:12, color:'rgba(253,246,237,0.4)', fontWeight:'600' },
  catTxtOn:  { color:'#F4A261' },

  // Book card
  card:     { backgroundColor:'#0F0600', borderRadius:18, padding:16, borderWidth:1, borderColor:'rgba(240,165,0,0.13)' },
  cardHdr:  { flexDirection:'row', alignItems:'center', gap:8, marginBottom:10, flexWrap:'wrap' },
  catBadge: { borderRadius:8, paddingHorizontal:8, paddingVertical:3, borderWidth:1 },
  catBadgeTxt: { fontSize:10, fontWeight:'700', textTransform:'capitalize' },
  premBadge:   { backgroundColor:'rgba(201,131,10,0.15)', borderRadius:8, paddingHorizontal:8, paddingVertical:3, borderWidth:1, borderColor:'rgba(201,131,10,0.3)' },
  premBadgeTxt:{ fontSize:10, color:'#C9830A', fontWeight:'700' },
  langTag:  { fontSize:10, color:'rgba(253,246,237,0.3)', marginLeft:'auto' },
  cardTitle:{ fontSize:15, fontWeight:'800', color:'#F4A261', marginBottom:4 },
  cardAuthor:{ fontSize:11, color:'rgba(253,246,237,0.4)', marginBottom:6 },
  cardDesc: { fontSize:12, color:'rgba(253,246,237,0.6)', lineHeight:19, marginBottom:10 },
  cardFooter:{ flexDirection:'row', alignItems:'center', gap:12 },
  cardMeta: { fontSize:11, color:'rgba(253,246,237,0.3)' },
  readBtn:  { marginLeft:'auto', backgroundColor:'rgba(232,98,10,0.15)', borderRadius:8, paddingHorizontal:12, paddingVertical:5, borderWidth:1, borderColor:'rgba(232,98,10,0.3)' },
  readBtnTxt:{ fontSize:11, color:'#F4A261', fontWeight:'700' },

  loadBox: { flex:1, alignItems:'center', justifyContent:'center', gap:12 },
  loadTxt: { color:'rgba(253,246,237,0.3)', fontSize:13 },
  emptyBox:{ flex:1, alignItems:'center', justifyContent:'center', paddingTop:60 },
  emptyIco:{ fontSize:48, marginBottom:16 },
  emptyTxt:{ color:'rgba(253,246,237,0.3)', fontSize:14, textAlign:'center', lineHeight:22 },
  loadMoreBtn:{ alignItems:'center', paddingVertical:14, marginTop:4 },
  loadMoreTxt:{ color:'#E8620A', fontSize:13, fontWeight:'700' },

  // Detail sheet
  detailOverlay:  { ...StyleSheet.absoluteFillObject, zIndex:99 },
  detailBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.7)' },
  detailSheet:    { position:'absolute', bottom:0, left:0, right:0, backgroundColor:'#160800', borderTopLeftRadius:24, borderTopRightRadius:24, padding:20, paddingBottom:36, maxHeight:'85%', borderTopWidth:1, borderColor:'rgba(240,165,0,0.15)' },
  detailHandle:   { width:36, height:4, borderRadius:2, backgroundColor:'rgba(255,255,255,0.15)', alignSelf:'center', marginBottom:16 },
  detailClose:    { alignSelf:'flex-end', padding:4, marginBottom:8 },
  detailTitle:    { fontSize:20, fontWeight:'800', color:'#F4A261', marginBottom:6 },
  detailSan:      { fontSize:14, color:'#D4A8FF', marginBottom:10, fontStyle:'italic' },
  detailMetaRow:  { flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:14 },
  detailMeta:     { fontSize:12, color:'rgba(253,246,237,0.45)' },
  detailDesc:     { fontSize:13, color:'rgba(253,246,237,0.7)', lineHeight:21, marginBottom:14 },
  tagsRow:        { flexDirection:'row', flexWrap:'wrap', gap:7, marginBottom:16 },
  tag:            { backgroundColor:'rgba(107,33,168,0.15)', borderRadius:8, paddingHorizontal:8, paddingVertical:4, borderWidth:1, borderColor:'rgba(107,33,168,0.25)' },
  tagTxt:         { fontSize:11, color:'#D4A8FF' },
  readBtnLg:      { backgroundColor:'#E8620A', borderRadius:14, paddingVertical:14, alignItems:'center', marginBottom:10, elevation:4, shadowColor:'#E8620A', shadowOffset:{width:0,height:3}, shadowOpacity:0.4, shadowRadius:6 },
  readBtnLgTxt:   { color:'#fff', fontSize:15, fontWeight:'800' },
  askBtn:         { borderRadius:14, paddingVertical:13, alignItems:'center', borderWidth:1, borderColor:'rgba(200,130,40,0.25)', backgroundColor:'rgba(255,255,255,0.04)' },
  askBtnTxt:      { color:'#F4A261', fontSize:14, fontWeight:'700' },
});
