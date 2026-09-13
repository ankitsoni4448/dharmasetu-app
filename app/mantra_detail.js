import React, { useEffect, useState } from 'react';
import { Share, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMantraById } from '../data/mantraV2';
import { useMantraAudio } from '../utils/mantraAudio';
import { addRecentId, getFavoriteIds, setFavoriteIds } from '../utils/mantraLibraryStorage';

function Section({ title, children, initiallyOpen = false }) {
  const [open, setOpen] = useState(initiallyOpen);
  return <View style={s.section}><TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: open }} style={s.sectionHeader} onPress={() => setOpen(value => !value)}>
    <Text style={s.sectionTitle}>{title}</Text><Text style={s.chevron}>{open ? '−' : '+'}</Text></TouchableOpacity>{open ? <View style={s.sectionBody}>{children}</View> : null}</View>;
}
const Field = ({ label, value }) => value ? <View style={s.field}><Text style={s.fieldLabel}>{label}</Text><Text style={s.fieldValue}>{Array.isArray(value) ? value.join(', ') : value}</Text></View> : null;

export default function MantraDetailScreen() {
  const { id } = useLocalSearchParams(); const insets = useSafeAreaInsets(); const mantra = getMantraById(String(id || ''));
  const [favorite, setFavorite] = useState(false);
  const audio = useMantraAudio(mantra ? { id:mantra.id, name:mantra.canonical_name, text:mantra.sanskrit_text, lang:'sanskrit' } : null, { target:1, autoSave:false });
  useEffect(() => { if (mantra) { addRecentId(mantra.id); getFavoriteIds().then(ids => setFavorite(ids.includes(mantra.id))); } }, [mantra]);
  if (!mantra) return <View style={[s.root,s.center,{paddingTop:insets.top,paddingBottom:insets.bottom}]}><Text style={s.empty}>Mantra entry not found.</Text><TouchableOpacity onPress={() => router.back()}><Text style={s.link}>Go back</Text></TouchableOpacity></View>;
  const practiceRows = Object.entries(mantra.practice).filter(([, value]) => value != null && (!Array.isArray(value) || value.length));
  const toggleFavorite = async () => { const ids = await getFavoriteIds(); const next = favorite ? ids.filter(value => value !== mantra.id) : [...ids, mantra.id]; await setFavoriteIds(next); setFavorite(!favorite); };
  const share = () => Share.share({ message:[mantra.canonical_name,mantra.sanskrit_text,mantra.transliteration_simple,'Shared from DharmaSetu'].filter(Boolean).join('\n\n') });
  return <View style={[s.root,{paddingTop:insets.top,paddingBottom:insets.bottom}]}><StatusBar style="light" />
    <View style={s.header}><TouchableOpacity style={s.headerButton} onPress={() => router.back()}><Text style={s.back}>‹</Text></TouchableOpacity><Text numberOfLines={2} style={s.headerTitle}>{mantra.canonical_name}</Text></View>
    <ScrollView contentContainerStyle={[s.content,{paddingBottom:Math.max(24,insets.bottom+16)}]}>
      <Text style={s.eyebrow}>{mantra.deity_ids[0] || 'Universal'} · {mantra.content_type.replaceAll('_',' ')}</Text>
      <Text style={s.name}>{mantra.canonical_name}</Text><Text selectable style={s.sanskrit}>{mantra.sanskrit_text}</Text>
      {mantra.transliteration_simple ? <Text selectable style={s.transliteration}>{mantra.transliteration_simple}</Text> : null}
      <View style={s.statusRow}><Text style={s.review}>{mantra.verification_status === 'VERIFIED' ? 'Verified' : mantra.verification_status === 'RESTRICTED' ? 'Restricted' : 'Review required'}</Text>{mantra.practice_level !== 'GENERAL_DEVOTIONAL' ? <Text style={s.restricted}>{mantra.practice_level === 'INITIATION_GUIDANCE' ? 'Initiation guidance' : 'Tradition-specific'}</Text> : null}</View>
      <View style={s.actions}>
        <TouchableOpacity style={s.action} onPress={audio.isPlaying ? audio.pause : audio.play}><Text style={s.actionText}>{audio.isPlaying ? 'Stop' : 'Listen'}</Text><Text style={s.actionHint}>Synthetic aid</Text></TouchableOpacity>
        <TouchableOpacity style={[s.action,s.primary]} onPress={() => router.push({pathname:'/mantra_japa',params:{id:mantra.id}})}><Text style={[s.actionText,s.primaryText]}>Start Japa</Text></TouchableOpacity>
        <TouchableOpacity style={s.action} onPress={toggleFavorite}><Text style={s.actionText}>{favorite ? 'Saved' : 'Save'}</Text></TouchableOpacity>
        <TouchableOpacity style={s.action} onPress={share}><Text style={s.actionText}>Share</Text></TouchableOpacity>
      </View>
      <Section title="About" initiallyOpen><Field label="Meaning · Hindi" value={mantra.meanings.hi}/><Field label="Meaning · English" value={mantra.meanings.en}/><Field label="Content type" value={mantra.content_type.replaceAll('_',' ')}/></Section>
      <Section title="Before You Begin"><Text style={s.body}>{practiceRows.length ? 'Only sourced fields are shown below.' : 'Not specifically prescribed in the verified record.'}</Text>{practiceRows.map(([key,value])=><Field key={key} label={key.replaceAll('_',' ')} value={value}/>)}</Section>
      <Section title="Japa Vidhi"><Text style={s.body}>{mantra.practice.japa || 'Varies by tradition. No procedure is shown until verified.'}</Text></Section>
      <Section title="Pronunciation"><Field label="Learning transliteration" value={mantra.transliteration_simple}/><Text style={s.note}>Device speech is synthetic assistance, not authenticated Sanskrit recitation.</Text></Section>
      <Section title="Source & Tradition"><Field label="Tradition" value={mantra.tradition || 'Not specified'}/><Text style={s.body}>{mantra.source_references.length ? mantra.source_references.map(source=>source.title).join(', ') : 'Source review pending. This record is not marked verified.'}</Text></Section>
      <Section title="Practice / restriction note"><Text style={s.body}>{mantra.restriction_note || mantra.instructions_scope || 'General presentation only; prescriptive guidance has not been verified.'}</Text></Section>
    </ScrollView></View>;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:'#100702'},center:{alignItems:'center',justifyContent:'center'},header:{minHeight:58,flexDirection:'row',alignItems:'center',paddingHorizontal:10,borderBottomWidth:1,borderBottomColor:'#3D2417'},headerButton:{width:44,height:44,justifyContent:'center'},back:{fontSize:34,color:'#F4A261'},headerTitle:{flex:1,flexShrink:1,fontSize:16,fontWeight:'800',color:'#FFF4E8'},content:{padding:16},eyebrow:{fontSize:11,textTransform:'uppercase',letterSpacing:1,color:'#C7A88F'},name:{fontSize:25,fontWeight:'900',color:'#FFF4E8',marginTop:7,flexShrink:1},sanskrit:{fontSize:24,lineHeight:38,textAlign:'center',color:'#E9C9FF',backgroundColor:'#21100A',padding:18,borderRadius:18,marginTop:16},transliteration:{fontSize:14,lineHeight:22,textAlign:'center',fontStyle:'italic',color:'#D7C3B5',marginTop:11},statusRow:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:13},review:{fontSize:10,color:'#FFE0A3',backgroundColor:'#49300B',padding:7,borderRadius:12,overflow:'hidden'},restricted:{fontSize:10,color:'#F1C6C6',backgroundColor:'#442020',padding:7,borderRadius:12,overflow:'hidden'},actions:{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:18},action:{minHeight:52,minWidth:'47%',flexGrow:1,justifyContent:'center',alignItems:'center',paddingHorizontal:12,borderRadius:13,borderWidth:1,borderColor:'#5B3620',backgroundColor:'#1D0E07'},primary:{backgroundColor:'#E8620A',borderColor:'#E8620A'},actionText:{fontSize:13,fontWeight:'800',color:'#FFD5AE'},primaryText:{color:'#fff'},actionHint:{fontSize:9,color:'#A98C77',marginTop:2},section:{borderRadius:15,borderWidth:1,borderColor:'#422719',backgroundColor:'#190C06',marginBottom:10,overflow:'hidden'},sectionHeader:{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:14},sectionTitle:{fontSize:14,fontWeight:'800',color:'#F4A261',flexShrink:1},chevron:{fontSize:22,color:'#D5B299'},sectionBody:{padding:14,paddingTop:2,borderTopWidth:1,borderTopColor:'#332015'},field:{marginTop:10},fieldLabel:{fontSize:10,textTransform:'uppercase',color:'#9F8370'},fieldValue:{fontSize:14,lineHeight:22,color:'#F7E7D9',marginTop:3},body:{fontSize:14,lineHeight:22,color:'#E4D0C1'},note:{fontSize:11,lineHeight:17,color:'#A98C77',marginTop:10},empty:{color:'#FFF4E8'},link:{color:'#F4A261',marginTop:12}});
