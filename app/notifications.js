import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getNotifications, markAllNotificationsRead, markNotificationRead, safeNotificationRoute } from '../utils/notificationInbox';

const ICONS = { system:'⚙️',account:'👤',payment:'💳',subscription:'⭐',festival:'🪔',panchang:'📅',kundli:'🔯',mantra:'🕉',content:'📚',announcement:'📣',security:'🔒' };

export default function NotificationCenter() {
  const insets = useSafeAreaInsets();
  const [language, setLanguage] = useState('hindi');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try { setItems(await getNotifications()); }
    catch { Alert.alert('', language === 'hindi' ? 'सूचनाएँ अभी उपलब्ध नहीं हैं।' : 'Notifications are unavailable right now.'); }
    finally { setLoading(false); }
  }, [language]);
  useEffect(() => { AsyncStorage.getItem('user_language').then(value => value && setLanguage(value)); load(); }, [load]);
  const todayKey = new Date().toDateString();
  const groups = useMemo(() => ({
    today: items.filter(item => new Date(item.created_at).toDateString() === todayKey),
    earlier: items.filter(item => new Date(item.created_at).toDateString() !== todayKey),
  }), [items, todayKey]);
  const openItem = async item => {
    if (!item.read_at) { await markNotificationRead(item.id); setItems(current => current.map(value => value.id === item.id ? { ...value, read_at: new Date().toISOString() } : value)); }
    const route = safeNotificationRoute(item.action_route);
    if (route) router.push(route);
  };
  const markAll = async () => { await markAllNotificationsRead(); setItems(current => current.map(item => ({ ...item, read_at: item.read_at || new Date().toISOString() }))); };
  const isH = language === 'hindi';
  const renderGroup = (title, values) => values.length ? <View><Text style={s.section}>{title}</Text>{values.map(item => <TouchableOpacity key={item.id} style={[s.card, !item.read_at && s.unread]} onPress={() => openItem(item)}>
    <Text style={s.icon}>{ICONS[item.type] || '🔔'}</Text><View style={s.copy}><Text style={s.title}>{item.title}</Text><Text style={s.body} numberOfLines={3}>{item.body}</Text><Text style={s.time}>{new Date(item.created_at).toLocaleString()}</Text></View>{!item.read_at ? <View style={s.dot} /> : null}
  </TouchableOpacity>)}</View> : null;
  return <View style={[s.root,{paddingTop:insets.top}]}><View style={s.header}><TouchableOpacity style={s.back} onPress={() => router.back()}><Text style={s.backText}>‹</Text></TouchableOpacity><Text style={s.headerTitle}>{isH?'सूचनाएँ':'Notifications'}</Text><TouchableOpacity style={s.markAll} onPress={markAll}><Text style={s.markAllText}>{isH?'सभी पढ़ें':'Mark all read'}</Text></TouchableOpacity></View>
    {loading ? <ActivityIndicator style={{marginTop:40}} color="#E8620A" /> : <ScrollView contentContainerStyle={s.list}>{!items.length?<Text style={s.empty}>{isH?'अभी कोई नई सूचना नहीं है।':'No new notifications yet.'}</Text>:<>{renderGroup(isH?'आज':'Today',groups.today)}{renderGroup(isH?'पहले':'Earlier',groups.earlier)}</>}</ScrollView>}
  </View>;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:'#0D0500'},header:{height:58,flexDirection:'row',alignItems:'center',paddingHorizontal:12,borderBottomWidth:1,borderBottomColor:'rgba(240,165,0,.12)'},back:{width:44,height:44,alignItems:'center',justifyContent:'center'},backText:{fontSize:34,color:'#F4A261'},headerTitle:{flex:1,fontSize:18,fontWeight:'800',color:'#FDF6ED'},markAll:{minHeight:44,justifyContent:'center'},markAllText:{fontSize:11,color:'#F4A261',fontWeight:'700'},list:{padding:14,paddingBottom:40},section:{fontSize:12,color:'#C9830A',fontWeight:'800',marginTop:10,marginBottom:8,textTransform:'uppercase'},card:{minHeight:82,flexDirection:'row',padding:13,marginBottom:9,borderRadius:14,borderWidth:1,borderColor:'rgba(200,130,40,.13)',backgroundColor:'#160800'},unread:{borderColor:'rgba(232,98,10,.45)',backgroundColor:'rgba(232,98,10,.08)'},icon:{fontSize:22,marginRight:11},copy:{flex:1},title:{fontSize:14,fontWeight:'800',color:'#FDF6ED'},body:{fontSize:12,lineHeight:18,color:'rgba(253,246,237,.65)',marginTop:3},time:{fontSize:9,color:'rgba(253,246,237,.3)',marginTop:5},dot:{width:8,height:8,borderRadius:4,backgroundColor:'#E8620A',marginLeft:8,marginTop:5},empty:{textAlign:'center',color:'rgba(253,246,237,.45)',marginTop:70,fontSize:14}});
