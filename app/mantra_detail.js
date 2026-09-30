import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Share, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { backendFetch } from '../utils/backend-config';
import mantraCatalog from '../utils/mantraCatalog';
import mantraPractice from '../utils/mantraPractice';
import GeneralJapaPreparation from '../components/mantra/GeneralJapaPreparation';
import { addRecentId, getFavoriteIds, setFavoriteIds } from '../utils/mantraLibraryStorage';
const { fetchMantraById } = mantraCatalog;
const { populatedEntries, presentationValue, explanatoryText, shareMessage, practiceLevelLabel, advancedPracticeState } = mantraPractice;

function Section({ title, children, initiallyOpen = false }) {
  const [open, setOpen] = useState(initiallyOpen);
  return <View style={s.section}><TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: open }} style={s.sectionHeader} onPress={() => setOpen(value => !value)}>
    <Text style={s.sectionTitle}>{title}</Text><Text style={s.chevron}>{open ? '−' : '+'}</Text></TouchableOpacity>{open ? <View style={s.sectionBody}>{children}</View> : null}</View>;
}
const Field = ({ label, value }) => { const display = presentationValue(value, label.includes('Hindi') ? 'सामग्री की समीक्षा जारी है।' : 'Content under review'); return display ? <View style={s.field}><Text style={s.fieldLabel}>{label}</Text><Text style={s.fieldValue}>{display}</Text></View> : null; };

export default function MantraDetailScreen() {
  const { id, preparation } = useLocalSearchParams(); const insets = useSafeAreaInsets();
  const [mantra, setMantra] = useState(null); const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState(false);
  const [retry,setRetry]=useState(0);
  const [favorite, setFavorite] = useState(false);
  useEffect(() => { let active = true; setLoading(true); setLoadError(false);
    fetchMantraById(backendFetch, String(id || '')).then(value => { if (active) { setMantra(value); setLoadError(false); } })
      .catch(() => { if (active) { setMantra(null); setLoadError(true); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id,retry]);
  useEffect(() => { if (mantra) { addRecentId(mantra.id); getFavoriteIds().then(ids => setFavorite(ids.includes(mantra.id))); } }, [mantra]);
  if (loading) return <View style={[s.root,s.center,{paddingTop:insets.top,paddingBottom:insets.bottom}]}><ActivityIndicator color="#F4A261"/><Text style={s.empty}>Loading Mantra…</Text></View>;
  if (loadError) return <View style={[s.root,s.center,{paddingTop:insets.top,paddingBottom:insets.bottom}]}><Text style={s.empty}>Mantra details are temporarily unavailable.</Text><TouchableOpacity style={s.action} onPress={()=>setRetry(n=>n+1)}><Text style={s.link}>Retry</Text></TouchableOpacity><TouchableOpacity onPress={() => router.back()}><Text style={s.link}>Go back</Text></TouchableOpacity></View>;
  if (!mantra) return <View style={[s.root,s.center,{paddingTop:insets.top,paddingBottom:insets.bottom}]}><Text style={s.empty}>Mantra not found.</Text><TouchableOpacity onPress={() => router.back()}><Text style={s.link}>Go back</Text></TouchableOpacity></View>;
  const preparationRows = populatedEntries(mantra.preparation); const practiceRows = populatedEntries(mantra.practice);
  const practiceSourced = mantra.provenance.practice.length > 0; const practiceDisplayable = practiceSourced && mantra.verification.practice === 'VERIFIED';
  const meaningDisplayable = mantra.provenance.meaning.length > 0 && mantra.verification.meaning === 'VERIFIED';
  const advanced = advancedPracticeState(mantra);
  const sourceTitles = Object.values(mantra.provenance).flat().map(source => source.title || source.work || source.reference).filter(Boolean);
  const toggleFavorite = async () => { const ids = await getFavoriteIds(); const next = favorite ? ids.filter(value => value !== mantra.id) : [...ids, mantra.id]; await setFavoriteIds(next); setFavorite(!favorite); };
  const share = () => Share.share({ message:shareMessage(mantra) });
  return <View style={[s.root,{paddingTop:insets.top,paddingBottom:insets.bottom}]}><StatusBar style="light" />
    <View style={s.header}><TouchableOpacity style={s.headerButton} onPress={() => router.back()}><Text style={s.back}>‹</Text></TouchableOpacity><Text numberOfLines={2} style={s.headerTitle}>{mantra.canonical_name}</Text></View>
    <ScrollView contentContainerStyle={[s.content,{paddingBottom:Math.max(24,insets.bottom+16)}]}>
      <Text style={s.eyebrow}>{explanatoryText(mantra.deity_ids?.[0]) || 'Classification pending'} · {(mantra.content_type || 'MANTRA').replaceAll('_',' ')}</Text>
      <Text style={s.name}>{mantra.canonical_name}</Text><Text selectable={!mantra.sanskrit_text_corrupted} style={s.sanskrit}>{mantra.sanskrit_text_corrupted ? 'Sacred text under review' : mantra.sanskrit_text}</Text>
      {mantra.transliteration_simple ? <Text selectable style={s.transliteration}>{explanatoryText(mantra.transliteration_simple)}</Text> : null}
      {advanced.guarded?<View style={s.statusRow}><Text style={s.restricted}>{practiceLevelLabel(mantra.practice_level)}</Text></View>:null}
      <View style={s.actions}>
        <TouchableOpacity style={s.action} onPress={toggleFavorite}><Text style={s.actionText}>{favorite ? 'Saved' : 'Save'}</Text></TouchableOpacity>
        <TouchableOpacity style={s.action} onPress={share}><Text style={s.actionText}>Share</Text></TouchableOpacity>
      </View>
      {(meaningDisplayable || mantra.content_type) ? <Section title="About / Meaning" initiallyOpen>{meaningDisplayable?<><Field label="Meaning · Hindi" value={mantra.meanings?.hi}/><Field label="Meaning · English" value={mantra.meanings?.en}/></>:null}<Field label="Content type" value={(mantra.content_type || '').replaceAll('_',' ')}/></Section> : null}
      {meaningDisplayable && mantra.traditional_context ? <Section title="Why / traditional context"><Text style={s.body}>{explanatoryText(mantra.traditional_context)}</Text></Section> : null}
      <Section title="Before You Begin" initiallyOpen={preparation==='1'}><GeneralJapaPreparation /></Section>
      {practiceDisplayable && !advanced.guarded && (preparationRows.length || practiceRows.length) ? <Section title="Mantra-specific Practice">{preparationRows.map(([key,value])=><Field key={`preparation-${key}`} label={key.replaceAll('_',' ')} value={value}/>) }{practiceRows.map(([key,value])=><Field key={`practice-${key}`} label={key.replaceAll('_',' ')} value={value}/>)}</Section> : null}
      {(mantra.tradition || mantra.sampradaya || sourceTitles.length || mantra.source_references.length) ? <Section title="Source & Tradition"><Field label="Tradition" value={mantra.tradition}/><Field label="Sampradaya" value={mantra.sampradaya}/><Text style={s.body}>{[...sourceTitles,...mantra.source_references.map(source=>source.title || source.name).filter(Boolean)].map(value=>explanatoryText(value)).filter(Boolean).join(', ')}</Text></Section> : null}
      {advanced.guarded ? <Section title="Advanced Practice / guidance"><Text style={s.body}>{explanatoryText(mantra.restriction_note) || `${practiceLevelLabel(mantra.practice_level)} may require qualified guidance. Unsourced advanced instructions are not displayed.`}</Text></Section> : mantra.restriction_note ? <Section title="Practice / restriction note"><Text style={s.body}>{explanatoryText(mantra.restriction_note)}</Text></Section> : null}
      <TouchableOpacity style={[s.startJapa,s.primary]} onPress={() => router.push({pathname:'/mantra_japa',params:{id:mantra.id}})}><Text style={[s.actionText,s.primaryText]}>Start Japa</Text></TouchableOpacity>
    </ScrollView></View>;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:'#100702'},center:{alignItems:'center',justifyContent:'center'},header:{minHeight:58,flexDirection:'row',alignItems:'center',paddingHorizontal:10,borderBottomWidth:1,borderBottomColor:'#3D2417'},headerButton:{width:44,height:44,justifyContent:'center'},back:{fontSize:34,color:'#F4A261'},headerTitle:{flex:1,flexShrink:1,fontSize:16,fontWeight:'800',color:'#FFF4E8'},content:{padding:16},eyebrow:{fontSize:11,textTransform:'uppercase',letterSpacing:1,color:'#C7A88F'},name:{fontSize:25,fontWeight:'900',color:'#FFF4E8',marginTop:7,flexShrink:1},sanskrit:{fontSize:24,lineHeight:38,textAlign:'center',color:'#E9C9FF',backgroundColor:'#21100A',padding:18,borderRadius:18,marginTop:16},transliteration:{fontSize:14,lineHeight:22,textAlign:'center',fontStyle:'italic',color:'#D7C3B5',marginTop:11},statusRow:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:13},review:{fontSize:10,color:'#FFE0A3',backgroundColor:'#49300B',padding:7,borderRadius:12,overflow:'hidden'},restricted:{fontSize:10,color:'#F1C6C6',backgroundColor:'#442020',padding:7,borderRadius:12,overflow:'hidden'},actions:{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:18},action:{minHeight:52,minWidth:'47%',flexGrow:1,justifyContent:'center',alignItems:'center',paddingHorizontal:12,borderRadius:13,borderWidth:1,borderColor:'#5B3620',backgroundColor:'#1D0E07'},startJapa:{minHeight:56,justifyContent:'center',alignItems:'center',borderRadius:14,marginTop:8},primary:{backgroundColor:'#E8620A',borderColor:'#E8620A'},actionText:{fontSize:13,fontWeight:'800',color:'#FFD5AE'},primaryText:{color:'#fff'},section:{borderRadius:15,borderWidth:1,borderColor:'#422719',backgroundColor:'#190C06',marginBottom:10,overflow:'hidden'},sectionHeader:{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:14},sectionTitle:{fontSize:14,fontWeight:'800',color:'#F4A261',flexShrink:1},chevron:{fontSize:22,color:'#D5B299'},sectionBody:{padding:14,paddingTop:2,borderTopWidth:1,borderTopColor:'#332015'},field:{marginTop:10},fieldLabel:{fontSize:10,textTransform:'uppercase',color:'#9F8370'},fieldValue:{fontSize:14,lineHeight:22,color:'#F7E7D9',marginTop:3},body:{fontSize:14,lineHeight:22,color:'#E4D0C1'},note:{fontSize:11,lineHeight:17,color:'#A98C77',marginTop:10},empty:{color:'#FFF4E8'},link:{color:'#F4A261',marginTop:12}});
