import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { backendFetch, BACKEND_CONFIG } from '../utils/backend-config';

const TABS = ['today', 'month', 'year'];
const pad = value => String(value).padStart(2, '0');
const iso = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const shiftDay = (value, amount) => { const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + amount); return iso(date); };
const shiftMonth = (year, month, amount) => { const date = new Date(year, month - 1 + amount, 1); return { year: date.getFullYear(), month: date.getMonth() + 1 }; };
const periodText = value => value?.periods?.map(row => `${time(row.start)}–${time(row.end)}`).join(', ') || (value?.start ? `${time(value.start)}–${time(value.end)}` : '—');
const time = value => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

// PANCHANG_CONTRACT_HELPERS_START
const MAX_DAY_CACHE_SIZE = 24;
function safeArray(value) { return Array.isArray(value) ? value : []; }
function roundedCoordinate(value) { return Number(value).toFixed(4); }
function dayCacheKey(date, location) {
  const calculationVersion = location?.calculationVersion || 'backend-current';
  return [date, roundedCoordinate(location?.latitude), roundedCoordinate(location?.longitude), location?.timezone || '', calculationVersion].join('|');
}
function getCachedDay(cache, key) {
  if (!cache.has(key)) return null;
  const value = cache.get(key); cache.delete(key); cache.set(key, value); return value;
}
function setCachedDay(cache, key, value, maxSize = MAX_DAY_CACHE_SIZE) {
  cache.delete(key); cache.set(key, value);
  while (cache.size > maxSize) cache.delete(cache.keys().next().value);
}
function cachedDaysForLocation(cache, location) {
  const result = {};
  for (const value of cache.values()) if (value?.date && value?.locationKey === dayCacheKey(value.date, location)) result[value.date] = value.data;
  return result;
}
function daysInMonth(year, month) { return new Date(year, month, 0).getDate(); }
function monthIsoDate(year, month, day) { const two = value => String(value).padStart(2, '0'); return `${year}-${two(month)}-${two(day)}`; }
function normalizeMonthData(value, requestedYear, requestedMonth, cachedDays = {}) {
  const year = Number.isInteger(requestedYear) ? requestedYear : value?.year;
  const month = Number.isInteger(requestedMonth) ? requestedMonth : value?.month;
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return { ...value, year, month, days: [], events: safeArray(value?.events), partial: true };
  const returned = new Map(safeArray(value?.days).filter(day => day && typeof day.date === 'string' && day.available !== false).map(day => [day.date, day]));
  const days = Array.from({ length: daysInMonth(year, month) }, (_, index) => {
    const dayNumber = index + 1; const isoDate = monthIsoDate(year, month, dayNumber);
    const source = cachedDays[isoDate] || returned.get(isoDate) || null;
    const summary = source ? { tithi: source.tithi || source.panchang?.tithi?.name || null, paksha: source.paksha || source.traditionalDate?.paksha || null,
      nakshatra: source.nakshatra || source.panchang?.nakshatra?.name || null, events: safeArray(source.events) } : null;
    return { isoDate, date: isoDate, dayNumber, weekday: new Date(`${isoDate}T12:00:00`).getDay(), status: summary ? 'LOADED' : 'NOT_LOADED', summary };
  });
  return { ...value, year, month, days, events: safeArray(value?.events), partial: days.some(day => day.status !== 'LOADED') };
}
function normalizeYearData(value) {
  const returnedMonths = safeArray(value?.months).filter(row => row && Number.isInteger(row.month) && row.month >= 1 && row.month <= 12);
  const byMonth = new Map(returnedMonths.map(row => [row.month, row]));
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1; const row = byMonth.get(month);
    return { month, events: safeArray(row?.events) };
  });
  return { ...value, year: Number.isInteger(value?.year) ? value.year : new Date().getFullYear(), months,
    events: safeArray(value?.events), partial: returnedMonths.length < 12 };
}
function isValidDailyData(value) {
  return Boolean(value?.modernDate?.formattedLocalDate && value?.traditionalDate && value?.panchang?.tithi?.name && value?.panchang?.nakshatra?.name &&
    value?.panchang?.yoga?.name && value?.panchang?.karana?.name && value?.sunMoon && value?.muhurta && value?.avoidPeriods &&
    Array.isArray(value?.events) && value?.metadata?.provider && value?.metadata?.ayanamsa?.name);
}
// PANCHANG_CONTRACT_HELPERS_END

async function resolveLocation() {
  const saved = await AsyncStorage.getItem('today_panchang').catch(() => null);
  const parsed = saved ? JSON.parse(saved) : null;
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status === 'granted') {
      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { latitude: result.coords.latitude, longitude: result.coords.longitude,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata', label: 'Current location' };
    }
  } catch {}
  if (parsed?.location?.latitude != null && parsed?.location?.longitude != null) return { ...parsed.location, timezone: parsed.timezone };
  throw new Error('PANCHANG_LOCATION_REQUIRED');
}

function query(location) {
  return `lat=${encodeURIComponent(location.latitude)}&lng=${encodeURIComponent(location.longitude)}&timezone=${encodeURIComponent(location.timezone)}&label=${encodeURIComponent(location.label || '')}`;
}

function Section({ title, children }) { return <View style={s.card}><Text style={s.sectionTitle}>{title}</Text>{children}</View>; }
function Row({ label, value, note }) { return <View style={s.row}><View style={{ flex: 1 }}><Text style={s.label}>{label}</Text>{note ? <Text style={s.note}>{note}</Text> : null}</View><Text style={s.value}>{value || '—'}</Text></View>; }

export default function PanchangScreen() {
  const [tab, setTab] = useState('today'); const [date, setDate] = useState(iso(new Date()));
  const [monthState, setMonthState] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [year, setYear] = useState(new Date().getFullYear()); const [location, setLocation] = useState(null);
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
  const [language, setLanguage] = useState('english');
  const dayCache = useRef(new Map());
  const [cacheRevision, setCacheRevision] = useState(0);
  const [dayStates, setDayStates] = useState({});
  const requestId = useRef(0);
  const selectDate = value => { requestId.current += 1; setDate(value); setTab('today'); };

  useEffect(() => {
    AsyncStorage.getItem('user_language').then(value => value && setLanguage(value)).catch(() => {});
    resolveLocation().then(setLocation).catch(errorValue => { setError(errorValue.message); setLoading(false); });
  }, []);
  const load = useCallback(async () => {
    if (!location) return;
    const activeRequest = ++requestId.current;
    const cacheKey = dayCacheKey(date, location);
    const cached = tab === 'today' ? getCachedDay(dayCache.current, cacheKey) : null;
    if (cached) { setData(cached.data); setError(null); setLoading(false); setDayStates(current => ({ ...current, [date]: 'LOADED' })); return; }
    setLoading(true); setError(null); setData(null);
    if (tab === 'today') setDayStates(current => ({ ...current, [date]: 'LOADING' }));
    const path = tab === 'today' ? `${BACKEND_CONFIG.ENDPOINTS.PANCHANG_DAY}?date=${date}&${query(location)}`
      : tab === 'month' ? `${BACKEND_CONFIG.ENDPOINTS.PANCHANG_MONTH}?year=${monthState.year}&month=${monthState.month}&${query(location)}`
      : `${BACKEND_CONFIG.ENDPOINTS.PANCHANG_YEAR}?year=${year}&${query(location)}`;
    try { const response = await backendFetch(path, { timeout: tab === 'month' ? 90000 : 20000 }); const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'PANCHANG_TEMPORARILY_UNAVAILABLE');
      if (tab === 'today' && !isValidDailyData(json.data)) throw new Error('INVALID_PANCHANG_RESPONSE');
      if (activeRequest !== requestId.current) return;
      setData(json.data);
      if (tab === 'today') {
        setCachedDay(dayCache.current, cacheKey, { date, locationKey: cacheKey, data: json.data });
        setCacheRevision(current => current + 1);
        setDayStates(current => ({ ...current, [date]: 'LOADED' }));
        await AsyncStorage.setItem('today_panchang', JSON.stringify(json.data));
      }
    } catch (errorValue) {
      if (activeRequest !== requestId.current) return;
      setError(errorValue.message); setData(null);
      if (tab === 'today') setDayStates(current => ({ ...current, [date]: 'ERROR' }));
    } finally { if (activeRequest === requestId.current) setLoading(false); }
  }, [date, location, monthState, tab, year]);
  useEffect(() => { load(); }, [load]);

  const title = useMemo(() => tab === 'today' ? new Date(`${date}T12:00:00`).toLocaleDateString(language === 'hindi' ? 'hi-IN' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : tab === 'month' ? new Date(monthState.year, monthState.month - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : String(year), [date, language, monthState, tab, year]);

  return <View style={s.screen}>
    <View style={s.header}><TouchableOpacity onPress={() => router.back()}><Text style={s.back}>‹</Text></TouchableOpacity><View><Text style={s.title}>Panchang · पंचांग</Text><Text style={s.location}>{location?.label || 'Location required'} · {location?.timezone || ''}</Text></View></View>
    <View style={s.tabs}>{TABS.map(item => <TouchableOpacity key={item} onPress={() => { requestId.current += 1; setTab(item); }} style={[s.tab, tab === item && s.tabActive]}><Text style={[s.tabText, tab === item && s.tabTextActive]}>{item.toUpperCase()}</Text></TouchableOpacity>)}</View>
    <View style={s.controls}><TouchableOpacity onPress={() => { requestId.current += 1; if (tab === 'today') setDate(shiftDay(date, -1)); else if (tab === 'month') setMonthState(shiftMonth(monthState.year, monthState.month, -1)); else setYear(value => value - 1); }}><Text style={s.control}>‹</Text></TouchableOpacity><Text style={s.controlTitle}>{title}</Text><TouchableOpacity onPress={() => { requestId.current += 1; if (tab === 'today') setDate(shiftDay(date, 1)); else if (tab === 'month') setMonthState(shiftMonth(monthState.year, monthState.month, 1)); else setYear(value => value + 1); }}><Text style={s.control}>›</Text></TouchableOpacity></View>
    <TouchableOpacity style={s.todayButton} onPress={() => { const now = new Date(); requestId.current += 1; setDate(iso(now)); setMonthState({ year: now.getFullYear(), month: now.getMonth() + 1 }); setYear(now.getFullYear()); setTab('today'); }}><Text style={s.todayText}>{language === 'hindi' ? 'आज पर जाएँ' : 'Go to Today'}</Text></TouchableOpacity>
    {loading ? <View style={s.loading}><ActivityIndicator color="#F4A261" /><Text style={s.loadingText}>{language === 'hindi' ? 'पंचांग लोड हो रहा है…' : 'Loading Panchang…'}</Text></View> : error ? <View style={s.message}><Text style={s.error}>{tab === 'today' ? (language === 'hindi' ? 'पंचांग लोड नहीं हुआ — पुनः प्रयास करें' : 'Could not load Panchang — tap to retry') : 'Panchang could not be loaded.'}</Text>{tab === 'today' ? <><Text style={s.note}>{date}</Text><Text style={s.note}>{location?.label} · {location?.timezone}</Text></> : null}<Text style={s.note}>No approximate values are substituted.</Text><TouchableOpacity onPress={load} style={s.retry}><Text style={s.retryText}>Retry</Text></TouchableOpacity></View> :
      <ScrollView contentContainerStyle={s.content}>{tab === 'today' ? <Daily data={data} /> : tab === 'month' ? <Month data={data} year={monthState.year} month={monthState.month} cachedDays={cachedDaysForLocation(dayCache.current, location)} dayStates={dayStates} cacheRevision={cacheRevision} language={language} onDay={selectDate} /> : <Year data={data} displayedYear={year} language={language} onMonth={month => { requestId.current += 1; setMonthState({ year, month }); setTab('month'); }} />}</ScrollView>}
  </View>;
}

function Daily({ data }) { if (!isValidDailyData(data)) return null; const p = data.panchang; return <>
  <Section title="आज की तारीख · Today's date"><Text style={s.gregorian}>{data.modernDate.formattedLocalDate}</Text><Text style={s.traditional}>{[data.traditionalDate.samvat, data.traditionalDate.masa, data.traditionalDate.paksha, data.traditionalDate.tithi].filter(Boolean).join(' · ') || 'Provider does not supply a regional calendar date in this response.'}</Text><Text style={s.education}>The Gregorian calendar identifies the civil date. Panchang describes the same day using Tithi, Nakshatra, Yoga and Karana.</Text></Section>
  <Section title="पंचांग के पाँच अंग · Five elements"><Row label="तिथि · Tithi" value={p.tithi.name} note="Lunar day based on the relative position of Sun and Moon."/><Row label="वार · Vara" value={p.vara}/><Row label="नक्षत्र · Nakshatra" value={p.nakshatra.name} note="The lunar mansion occupied by the Moon."/><Row label="योग · Yoga" value={p.yoga.name}/><Row label="करण · Karana" value={p.karana.name}/></Section>
  <Section title="सूर्य और चन्द्र · Sun & Moon"><Row label="Sunrise" value={time(data.sunMoon.sunrise)}/><Row label="Sunset" value={time(data.sunMoon.sunset)}/><Row label="Moonrise" value={time(data.sunMoon.moonrise)}/><Row label="Moonset" value={time(data.sunMoon.moonset)}/></Section>
  <Section title="शुभ समय · Auspicious periods"><Row label="Abhijit Muhurta" value={periodText(data.muhurta.abhijit)}/><Row label="Brahma Muhurta" value={periodText(data.muhurta.brahma)}/></Section>
  <Section title="सावधानी के समय · Caution periods"><Row label="Rahu Kalam" value={periodText(data.avoidPeriods.rahuKalam)}/><Row label="Yamaganda" value={periodText(data.avoidPeriods.yamaganda)}/><Row label="Gulika" value={periodText(data.avoidPeriods.gulika)}/><Text style={s.note}>Traditional timing guidance only; outcomes are not guaranteed.</Text></Section>
  <Section title="Festivals & Vrata">{data.events.length ? data.events.map((event, index) => <Text key={`${event.name}-${index}`} style={s.event}>• {event.name}</Text>) : <Text style={s.note}>No provider-supported event was returned for this date.</Text>}</Section>
  <Text style={s.meta}>Source: {data.metadata.provider} · {data.metadata.ayanamsa.name} · {data.metadata.cached ? 'cached' : 'live'}</Text>
  </>; }

function Month({ data, year, month, cachedDays, dayStates, cacheRevision, language, onDay }) { const calendar = normalizeMonthData(data, year, month, cachedDays); return <><Text style={s.note}>{language === 'hindi' ? 'किसी भी तारीख पर टैप करके उस दिन का पूरा पंचांग देखें।' : 'Tap any date to view the complete Panchang.'}</Text><View style={s.grid}>{calendar.days.map(day => { const state = day.summary ? 'LOADED' : dayStates[day.isoDate] || 'NOT_LOADED'; return <TouchableOpacity key={`${day.isoDate}-${cacheRevision}`} style={s.day} onPress={() => onDay(day.isoDate)}><Text style={s.dayNumber}>{day.dayNumber}</Text>{day.summary?.tithi ? <Text numberOfLines={1} style={s.dayValue}>{day.summary.tithi}</Text> : <Text numberOfLines={2} style={s.dayValue}>{state === 'ERROR' ? (language === 'hindi' ? 'पुनः प्रयास करें' : 'Tap to retry') : language === 'hindi' ? 'देखें' : 'View'}</Text>}{safeArray(day.summary?.events).length ? <Text style={s.marker}>●</Text> : null}</TouchableOpacity>; })}</View></>; }
function Year({ data, displayedYear, language, onMonth }) { const overview = normalizeYearData({ ...data, year: displayedYear }); return <><Text style={s.note}>{language === 'hindi' ? 'महीना चुनें और विस्तृत पंचांग देखें।' : 'Choose a month to view its detailed Panchang.'}</Text>{overview.months.map(row => <TouchableOpacity key={row.month} style={s.month} onPress={() => onMonth(row.month)}><View style={s.monthRow}><Text style={s.monthName}>{new Date(displayedYear, row.month - 1).toLocaleDateString(language === 'hindi' ? 'hi-IN' : 'en-IN', { month: 'long' })}</Text><Text style={s.chevron}>›</Text></View>{row.events.slice(0, 3).map((event, index) => <Text key={`${event.name}-${index}`} style={s.note}>• {event.name}</Text>)}</TouchableOpacity>)}</>; }

const s = StyleSheet.create({ screen:{flex:1,backgroundColor:'#140800',paddingTop:45},header:{flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:18},back:{fontSize:40,color:'#F4A261'},title:{fontSize:22,fontWeight:'800',color:'#FDF6ED'},location:{fontSize:11,color:'#D6B89A',marginTop:3},tabs:{flexDirection:'row',margin:18,backgroundColor:'#251006',borderRadius:14,padding:4},tab:{flex:1,padding:10,alignItems:'center',borderRadius:10},tabActive:{backgroundColor:'#E8620A'},tabText:{color:'#C7A78A',fontWeight:'700'},tabTextActive:{color:'#fff'},controls:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:22},control:{fontSize:34,color:'#F4A261'},controlTitle:{color:'#FDF6ED',fontSize:16,fontWeight:'700'},todayButton:{alignSelf:'center',padding:8},todayText:{color:'#F4A261',fontWeight:'700'},content:{padding:16,paddingBottom:50},card:{backgroundColor:'#211006',borderWidth:1,borderColor:'#4A2A16',borderRadius:16,padding:15,marginBottom:12},sectionTitle:{color:'#F4A261',fontWeight:'800',fontSize:15,marginBottom:10},gregorian:{fontSize:19,fontWeight:'800',color:'#FDF6ED'},traditional:{color:'#FFD18F',marginTop:7},education:{color:'#C7B5A3',lineHeight:19,marginTop:10},row:{flexDirection:'row',justifyContent:'space-between',gap:12,paddingVertical:9,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#4A2A16'},label:{color:'#FDF6ED',fontWeight:'700'},value:{color:'#F4A261',fontWeight:'700',textAlign:'right',maxWidth:'48%'},note:{fontSize:11,color:'#BDA791',lineHeight:16,marginTop:3},event:{color:'#FDF6ED',paddingVertical:4},meta:{color:'#8F7663',fontSize:10,textAlign:'center'},loading:{marginTop:60,alignItems:'center',gap:12},loadingText:{color:'#D6B89A',fontWeight:'700'},message:{margin:20,padding:20,backgroundColor:'#211006',borderRadius:16},error:{color:'#FDF6ED',fontWeight:'700'},retry:{marginTop:14,backgroundColor:'#E8620A',padding:11,borderRadius:10,alignItems:'center'},retryText:{color:'#fff',fontWeight:'800'},grid:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:12},day:{width:'22.8%',minHeight:76,backgroundColor:'#211006',borderRadius:10,padding:8,borderWidth:1,borderColor:'#4A2A16'},dayNumber:{color:'#FDF6ED',fontWeight:'800'},dayValue:{color:'#D6B89A',fontSize:9,marginTop:7},marker:{color:'#F4A261',fontSize:9,marginTop:4},month:{backgroundColor:'#211006',borderRadius:14,padding:15,marginBottom:10,borderWidth:1,borderColor:'#4A2A16'},monthRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},monthName:{color:'#FDF6ED',fontSize:16,fontWeight:'800'},chevron:{color:'#F4A261',fontSize:24} });
