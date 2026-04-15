// DharmaSetu — Katha Vault — LAUNCH VERSION
// Bhagavad Gita: LIVE (Groq powered, full 700 shlokas)
// Other scriptures: "Coming Soon" — no broken API calls
// Admin PDF upload → Gita content displayed beautifully
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Modal, ScrollView,
  Share, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GROQ_KEY = 'gsk_JjJQoO3cIvW.........fIBEdhVj4eTp3I0gw6BoW2';

const SCRIPTURES = [
  {
    id:'bhagavad_gita', icon:'📖', name:'Bhagavad Gita', nameHi:'भगवद्गीता',
    desc:'700 shlokas · 18 Chapters · Spoken by Sri Krishna to Arjuna',
    descHi:'700 श्लोक · 18 अध्याय · भगवान श्रीकृष्ण द्वारा अर्जुन को',
    color:'#E8620A', live:true, unitLabel:'Chapter', unitLabelHi:'अध्याय',
    units:[
      {n:1,t:'Arjuna Vishada Yoga',tH:'अर्जुन विषाद योग',s:47},
      {n:2,t:'Sankhya Yoga',tH:'सांख्य योग',s:72},
      {n:3,t:'Karma Yoga',tH:'कर्म योग',s:43},
      {n:4,t:'Jnana Karma Sanyasa Yoga',tH:'ज्ञान कर्म संन्यास योग',s:42},
      {n:5,t:'Karma Sanyasa Yoga',tH:'कर्म संन्यास योग',s:29},
      {n:6,t:'Atmasanyama Yoga',tH:'आत्मसंयम योग',s:47},
      {n:7,t:'Jnana Vijnana Yoga',tH:'ज्ञान विज्ञान योग',s:30},
      {n:8,t:'Aksara Brahma Yoga',tH:'अक्षर ब्रह्म योग',s:28},
      {n:9,t:'Raja Vidya Raja Guhya Yoga',tH:'राज विद्या राज गुह्य योग',s:34},
      {n:10,t:'Vibhuti Yoga',tH:'विभूति योग',s:42},
      {n:11,t:'Vishwarupa Darshana Yoga',tH:'विश्वरूप दर्शन योग',s:55},
      {n:12,t:'Bhakti Yoga',tH:'भक्ति योग',s:20},
      {n:13,t:'Kshetra Kshetragnya Vibhaga Yoga',tH:'क्षेत्र क्षेत्रज्ञ विभाग योग',s:34},
      {n:14,t:'Gunatraya Vibhaga Yoga',tH:'गुणत्रय विभाग योग',s:27},
      {n:15,t:'Purushottama Yoga',tH:'पुरुषोत्तम योग',s:20},
      {n:16,t:'Daivasura Sampad Vibhaga Yoga',tH:'दैवासुर संपद विभाग योग',s:24},
      {n:17,t:'Sraddhatraya Vibhaga Yoga',tH:'श्रद्धात्रय विभाग योग',s:28},
      {n:18,t:'Moksha Sanyasa Yoga',tH:'मोक्ष संन्यास योग',s:78},
    ],
  },
  {
    id:'valmiki_ramayana', icon:'🏹', name:'Valmiki Ramayana', nameHi:'वाल्मीकि रामायण',
    desc:'24,000 verses · 7 Kandas · By Maharishi Valmiki',
    descHi:'24,000 श्लोक · 7 काण्ड · महर्षि वाल्मीकि द्वारा',
    color:'#C9830A', live:false,
  },
  {
    id:'mahabharata', icon:'⚔️', name:'Mahabharata', nameHi:'महाभारत',
    desc:'100,000+ verses · 18 Parvas · By Maharishi Vyasa',
    descHi:'1,00,000+ श्लोक · 18 पर्व · महर्षि व्यास द्वारा',
    color:'#6B21A8', live:false,
  },
  {
    id:'puranas', icon:'🌸', name:'Select Puranas', nameHi:'चुनिंदा पुराण',
    desc:'18 Mahapuranas — cosmology, history, spiritual science',
    descHi:'18 महापुराण — सृष्टि, इतिहास और आध्यात्म',
    color:'#27AE60', live:false,
  },
  {
    id:'upanishads', icon:'🕉️', name:'Key Upanishads', nameHi:'प्रमुख उपनिषद्',
    desc:'10 principal Upanishads — source of Vedanta philosophy',
    descHi:'10 मुख्य उपनिषद् — वेदांत का मूल',
    color:'#1A5C8B', live:false,
  },
];

// ── CACHE ─────────────────────────────────────────────
const CV='kv6_';
async function getCached(sid,n,lang){
  try{
    const r=await AsyncStorage.getItem(`${CV}${sid}_${n}_${lang}`);
    if(!r)return null;
    const{c,ts}=JSON.parse(r);
    if((Date.now()-ts)/86400000>365)return null;
    return c;
  }catch{return null;}
}
async function saveCache(sid,n,lang,c){
  try{await AsyncStorage.setItem(`${CV}${sid}_${n}_${lang}`,JSON.stringify({c,ts:Date.now()}));}catch{}
}
async function getProgress(sid){
  try{const r=await AsyncStorage.getItem(`kp6_${sid}`);return r?JSON.parse(r):{};}catch{return{};}
}
async function markRead(sid,n){
  try{const p=await getProgress(sid);p[n]=Date.now();await AsyncStorage.setItem(`kp6_${sid}`,JSON.stringify(p));}catch{}
}

// ── GROQ CALLER with 3 retries ──────────────────────
async function callGroq(sys, user){
  for(let i=1;i<=3;i++){
    try{
      const res=await fetch('https://api.groq.com/openai/v1/chat/completions',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${GROQ_KEY}`},
        body:JSON.stringify({
          model:'llama-3.3-70b-versatile',
          messages:[{role:'system',content:sys},{role:'user',content:user}],
          temperature:0.15,
          max_tokens:7000,
        }),
      });
      const d=await res.json();
      if(d.error){
        if(d.error.message?.includes('rate')&&i<3){
          await new Promise(r=>setTimeout(r,30000*i)); continue;
        }
        throw new Error(d.error.message);
      }
      const txt=d.choices?.[0]?.message?.content;
      if(!txt)throw new Error('Empty response');
      return txt;
    }catch(e){
      if(i===3)throw e;
      await new Promise(r=>setTimeout(r,5000));
    }
  }
}

// ── GITA PROMPT ──────────────────────────────────────
function gitaPrompt(unitN, unitTitle, lang, shlokaCount){
  const isH=lang==='hindi';
  const langRule=isH
    ?'Write ALL explanations in HINDI (Devanagari). Sanskrit stays in Devanagari. Zero English in explanations.'
    :'Write ALL explanations in ENGLISH. Sanskrit in Devanagari with Roman transliteration.';

  const sys=`You are a Vedic scholar. Bhagavad Gita per Gita Press Gorakhpur.
${langRule}

CRITICAL SHLOKA RULE:
Each Gita shloka = EXACTLY 2 lines. NEVER show only 1 line as a shloka.
Example of shloka 1.1 (correct — BOTH lines):
धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः।
मामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय॥
Both lines = ONE shloka. Never split into two.`;

  const user=`Generate COMPLETE Bhagavad Gita Chapter ${unitN} — ${unitTitle}.
There are exactly ${shlokaCount} shlokas. Cover ALL of them.

For EACH shloka use this exact format:

SHLOKA ${unitN}.[number]
Sanskrit: [BOTH lines of shloka in Devanagari — complete, never truncate]
Transliteration: [Both lines in Roman]
Word meaning: [Every Sanskrit word explained]
Meaning: [3-4 sentences complete explanation]
Teaching: [What Sri Krishna reveals — spiritual insight 2-3 sentences]

After shloka ${unitN}.${shlokaCount}:
CHAPTER ESSENCE
[3 paragraphs: core teaching, significance, practical application today]`;

  return{sys,user};
}

// ── CHAPTER READER ───────────────────────────────────
function ChapterReader({visible,onClose,sc,unit,lang}){
  const[content,setContent]=useState('');
  const[loading,setLoading]=useState(true);
  const[err,setErr]=useState('');
  const[fontSize,setFontSize]=useState(14);
  const insets=useSafeAreaInsets();
  const isH=lang==='hindi';

  useEffect(()=>{
    if(!visible||!sc||!unit)return;
    setContent('');setErr('');setLoading(true);load();
  },[visible,sc?.id,unit?.n,lang]);

  const load=async()=>{
    const cached=await getCached(sc.id,unit.n,lang);
    if(cached){setContent(cached);setLoading(false);await markRead(sc.id,unit.n);return;}
    try{
      const{sys,user}=gitaPrompt(unit.n,unit.t,lang,unit.s||40);
      const txt=await callGroq(sys,user);
      setContent(txt);
      await saveCache(sc.id,unit.n,lang,txt);
      await markRead(sc.id,unit.n);
    }catch(e){setErr(e.message);}
    setLoading(false);
  };

  const title=isH?unit?.tH:unit?.t;
  const sTitle=isH?sc?.nameHi:sc?.name;
  const lines=content?content.split('\n').filter(l=>l.trim()):[];

  return(
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[cr.root,{paddingTop:insets.top}]}>
        <StatusBar style="light" backgroundColor="#0A0300"/>
        <View style={cr.hdr}>
          <TouchableOpacity onPress={onClose} style={cr.back} hitSlop={{top:14,bottom:14,left:14,right:14}}>
            <Text style={cr.backTxt}>←</Text>
          </TouchableOpacity>
          <View style={{flex:1}}>
            <Text style={cr.hdrSc} numberOfLines={1}>{sTitle}</Text>
            <Text style={cr.hdrTitle} numberOfLines={1}>{title}</Text>
          </View>
          <TouchableOpacity style={cr.fBtn} onPress={()=>setFontSize(f=>Math.min(f+2,22))}><Text style={cr.fTxt}>A+</Text></TouchableOpacity>
          <TouchableOpacity style={cr.fBtn} onPress={()=>setFontSize(f=>Math.max(f-2,11))}><Text style={cr.fTxt}>A-</Text></TouchableOpacity>
          <TouchableOpacity style={cr.shareBtn} onPress={async()=>{
            if(!content)return;
            await Share.share({message:`🕉 ${sTitle} — ${title}\n\n${content.slice(0,400)}...\n\n━━━━━━━━━━\n🕉 DharmaSetu App — Play Store`,title:'DharmaSetu'});
          }}><Text style={{fontSize:16}}>📤</Text></TouchableOpacity>
        </View>

        {loading?(
          <View style={cr.center}>
            <ActivityIndicator size="large" color="#E8620A"/>
            <Text style={cr.loadTxt}>{isH?'शास्त्र लोड हो रहे हैं...':'Loading scripture...'}</Text>
            <Text style={cr.loadSub}>{isH?'पहली बार 20-30 सेकंड लगते हैं':'First load: 20–30 seconds. Cached after that.'}</Text>
          </View>
        ):err?(
          <View style={cr.center}>
            <Text style={{fontSize:44,marginBottom:16}}>⚠️</Text>
            <Text style={cr.errTxt}>{err}</Text>
            <TouchableOpacity style={cr.retryBtn} onPress={()=>{setLoading(true);setErr('');load();}}>
              <Text style={cr.retryTxt}>{isH?'फिर से कोशिश करें':'Try Again'}</Text>
            </TouchableOpacity>
          </View>
        ):(
          <ScrollView style={{flex:1}} contentContainerStyle={{padding:18}} showsVerticalScrollIndicator={false}>
            <View style={{alignItems:'center',marginBottom:24,paddingBottom:20}}>
              <Text style={{fontSize:22,fontWeight:'800',color:'#F4A261',textAlign:'center',marginBottom:6}}>{title}</Text>
              {unit?.s&&<Text style={{fontSize:12,color:'rgba(253,246,237,0.35)',marginTop:4}}>{unit.s} {isH?'श्लोक':'shlokas'}</Text>}
              <View style={{width:50,height:2,backgroundColor:'rgba(232,98,10,0.4)',borderRadius:1,marginTop:14}}/>
            </View>
            {lines.map((line,i)=>{
              const isSlokaHdr=/^SHLOKA\s+\d+\.\d+/i.test(line);
              const isSecHdr=/^CHAPTER ESSENCE/i.test(line);
              const isSanskrit=/^Sanskrit:/i.test(line);
              const isTranslit=/^Transliteration:/i.test(line);
              const isWord=/^Word meaning:/i.test(line);
              const isMeaning=/^Meaning:/i.test(line)&&!/^Word/.test(line);
              const isTeaching=/^Teaching:/i.test(line);
              const isDevanagari=/^[\u0900-\u097F]/.test(line)&&/[\u0900-\u097F]{6,}/.test(line)&&!isSanskrit;

              if(isSlokaHdr)return(
                <View key={i} style={cr.slokaHdr}><Text style={cr.slokaHdrTxt}>{line}</Text></View>
              );
              if(isSecHdr)return(
                <Text key={i} style={[cr.secHdr,{fontSize:fontSize+3}]}>{line}</Text>
              );
              if(isSanskrit)return(
                <View key={i} style={cr.sanBlock}>
                  <Text style={cr.fieldLbl}>Sanskrit</Text>
                  <Text style={[cr.sanTxt,{fontSize:fontSize+3}]}>{line.replace(/^Sanskrit:\s*/i,'')}</Text>
                </View>
              );
              if(isDevanagari)return(
                <View key={i} style={cr.sanBlock}>
                  <Text style={[cr.sanTxt,{fontSize:fontSize+3}]}>{line}</Text>
                </View>
              );
              if(isTranslit)return(
                <View key={i} style={cr.transBlock}>
                  <Text style={cr.fieldLbl}>Transliteration</Text>
                  <Text style={[cr.transTxt,{fontSize:fontSize+1}]}>{line.replace(/^Transliteration:\s*/i,'')}</Text>
                </View>
              );
              if(isWord)return(
                <View key={i} style={cr.wordBlock}>
                  <Text style={cr.fieldLbl}>Word Meaning</Text>
                  <Text style={[cr.wordTxt,{fontSize}]}>{line.replace(/^Word meaning:\s*/i,'')}</Text>
                </View>
              );
              if(isMeaning)return(
                <View key={i} style={{marginBottom:8}}>
                  <Text style={cr.fieldLbl}>Meaning</Text>
                  <Text style={[cr.bodyTxt,{fontSize,lineHeight:fontSize*1.85}]}>{line.replace(/^Meaning:\s*/i,'')}</Text>
                </View>
              );
              if(isTeaching)return(
                <View key={i} style={cr.teachBlock}>
                  <Text style={cr.teachLbl}>🕉 Teaching</Text>
                  <Text style={[cr.teachTxt,{fontSize}]}>{line.replace(/^Teaching:\s*/i,'')}</Text>
                </View>
              );
              return <Text key={i} style={[cr.bodyTxt,{fontSize,lineHeight:fontSize*1.85}]}>{line}</Text>;
            })}
            <View style={{alignItems:'center',marginTop:36,paddingVertical:24,borderTopWidth:1,borderTopColor:'rgba(240,165,0,0.1)'}}>
              <Text style={{fontSize:40,marginBottom:10}}>🕉</Text>
              <Text style={{fontSize:16,fontWeight:'700',color:'#F4A261',marginBottom:4}}>{title} — {isH?'पाठ पूर्ण':'Complete'}</Text>
              <Text style={{fontSize:13,color:'#C9830A'}}>जय सनातन धर्म · Jai Sanatan Dharma</Text>
            </View>
            <View style={{height:insets.bottom+24}}/>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
const cr=StyleSheet.create({
  root:{flex:1,backgroundColor:'#0A0300'},
  hdr:{flexDirection:'row',alignItems:'center',paddingHorizontal:14,paddingVertical:12,borderBottomWidth:1,borderBottomColor:'rgba(240,165,0,0.12)',gap:8},
  back:{width:38,height:38,borderRadius:19,backgroundColor:'rgba(255,255,255,0.08)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(240,165,0,0.2)'},
  backTxt:{fontSize:20,color:'#F4A261',fontWeight:'600',marginTop:-1},
  hdrSc:{fontSize:10,color:'#C9830A',fontWeight:'600',marginBottom:1},
  hdrTitle:{fontSize:13,fontWeight:'800',color:'#F4A261'},
  fBtn:{paddingHorizontal:9,paddingVertical:6,borderRadius:8,backgroundColor:'rgba(255,255,255,0.06)',borderWidth:1,borderColor:'rgba(200,130,40,0.2)'},
  fTxt:{fontSize:11,color:'#C9830A',fontWeight:'700'},
  shareBtn:{paddingHorizontal:9,paddingVertical:6,borderRadius:8,backgroundColor:'rgba(232,98,10,0.1)',borderWidth:1,borderColor:'rgba(232,98,10,0.25)'},
  center:{flex:1,alignItems:'center',justifyContent:'center',padding:28},
  loadTxt:{fontSize:15,color:'#F4A261',textAlign:'center',marginTop:18},
  loadSub:{fontSize:12,color:'rgba(253,246,237,0.35)',marginTop:8,textAlign:'center'},
  errTxt:{fontSize:13,color:'rgba(231,76,60,0.9)',textAlign:'center',lineHeight:22,marginBottom:22},
  retryBtn:{backgroundColor:'#E8620A',paddingHorizontal:28,paddingVertical:13,borderRadius:12},
  retryTxt:{fontSize:14,color:'#fff',fontWeight:'700'},
  slokaHdr:{backgroundColor:'rgba(232,98,10,0.12)',borderRadius:10,paddingVertical:10,paddingHorizontal:16,marginTop:22,marginBottom:10,borderLeftWidth:4,borderLeftColor:'#E8620A'},
  slokaHdrTxt:{fontSize:13,fontWeight:'800',color:'#E8620A',letterSpacing:0.5},
  secHdr:{fontWeight:'800',color:'#F4A261',marginTop:28,marginBottom:10,borderBottomWidth:1,borderBottomColor:'rgba(240,165,0,0.15)',paddingBottom:8},
  fieldLbl:{fontSize:10,color:'rgba(253,246,237,0.4)',fontWeight:'700',textTransform:'uppercase',letterSpacing:0.5,marginBottom:5},
  sanBlock:{backgroundColor:'rgba(107,33,168,0.15)',borderRadius:12,padding:16,marginBottom:10,borderWidth:1,borderColor:'rgba(107,33,168,0.35)'},
  sanTxt:{color:'#D4A8FF',lineHeight:38,fontWeight:'600'},
  transBlock:{backgroundColor:'rgba(107,33,168,0.07)',borderRadius:10,padding:12,marginBottom:8,borderWidth:1,borderColor:'rgba(107,33,168,0.15)'},
  transTxt:{color:'rgba(212,168,255,0.75)',fontStyle:'italic',lineHeight:24},
  wordBlock:{backgroundColor:'rgba(201,131,10,0.08)',borderRadius:10,padding:12,marginBottom:8,borderWidth:1,borderColor:'rgba(201,131,10,0.2)'},
  wordTxt:{color:'#F4A261',lineHeight:24},
  teachBlock:{backgroundColor:'rgba(232,98,10,0.1)',borderRadius:12,padding:14,marginVertical:8,borderWidth:1,borderColor:'rgba(232,98,10,0.3)',borderLeftWidth:3,borderLeftColor:'#E8620A'},
  teachLbl:{fontSize:11,color:'#E8620A',fontWeight:'800',textTransform:'uppercase',letterSpacing:0.5,marginBottom:6},
  teachTxt:{color:'rgba(244,162,97,0.9)',lineHeight:26,fontWeight:'600'},
  bodyTxt:{color:'rgba(253,246,237,0.82)',marginBottom:10},
});

// ── UNIT LIST ─────────────────────────────────────────
function UnitList({visible,onClose,sc,lang,onSelect}){
  const[prog,setProg]=useState({});
  const insets=useSafeAreaInsets();
  const isH=lang==='hindi';
  useEffect(()=>{if(visible&&sc)getProgress(sc.id).then(setProg);},[visible,sc?.id]);
  if(!sc)return null;
  const rc=Object.keys(prog).length,tot=sc.units?.length||0;
  return(
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[ul.root,{paddingTop:insets.top}]}>
        <StatusBar style="light" backgroundColor="#0D0500"/>
        <View style={ul.hdr}>
          <TouchableOpacity onPress={onClose} style={ul.back} hitSlop={{top:14,bottom:14,left:14,right:14}}>
            <Text style={ul.backTxt}>←</Text>
          </TouchableOpacity>
          <View style={{flex:1}}>
            <Text style={ul.hTitle}>{isH?sc.nameHi:sc.name}</Text>
            <Text style={ul.hSub}>{isH?sc.descHi:sc.desc}</Text>
          </View>
        </View>
        <View style={ul.progBox}>
          <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:7}}>
            <Text style={ul.progLbl}>{isH?`${rc}/${tot} ${sc.unitLabelHi||'अध्याय'} पढ़े`:`${rc}/${tot} ${sc.unitLabel||'Chapters'} read`}</Text>
            <Text style={[ul.progPct,{color:sc.color}]}>{Math.round((rc/Math.max(tot,1))*100)}%</Text>
          </View>
          <View style={ul.progTrack}><View style={[ul.progFill,{width:`${Math.round((rc/Math.max(tot,1))*100)}%`,backgroundColor:sc.color}]}/></View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{padding:14,gap:8,paddingBottom:insets.bottom+24}}>
          {(sc.units||[]).map(unit=>{
            const done=!!prog[unit.n];
            return(
              <TouchableOpacity key={unit.n}
                style={[ul.card,{borderColor:done?sc.color+'45':'rgba(200,130,40,0.12)',backgroundColor:done?sc.color+'08':'#130700'}]}
                onPress={()=>onSelect(unit)} activeOpacity={0.85}>
                <View style={[ul.num,{backgroundColor:sc.color+'1A',borderColor:sc.color+'45'}]}>
                  <Text style={[ul.numTxt,{color:sc.color}]}>{unit.n}</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={ul.uTitle}>{isH?unit.tH:unit.t}</Text>
                  {unit.s&&<Text style={ul.uMeta}>{unit.s} {isH?'श्लोक':'shlokas'}</Text>}
                </View>
                <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                  {done&&<Text style={{fontSize:13,color:'#27AE60',fontWeight:'800'}}>✓</Text>}
                  <Text style={{fontSize:20,color:'rgba(253,246,237,0.2)'}}>›</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
const ul=StyleSheet.create({
  root:{flex:1,backgroundColor:'#0D0500'},
  hdr:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'rgba(240,165,0,0.1)',gap:12},
  back:{width:38,height:38,borderRadius:19,backgroundColor:'rgba(255,255,255,0.08)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(240,165,0,0.2)'},
  backTxt:{fontSize:20,color:'#F4A261',fontWeight:'600',marginTop:-1},
  hTitle:{fontSize:17,fontWeight:'800',color:'#F4A261',marginBottom:2},
  hSub:{fontSize:10,color:'rgba(253,246,237,0.38)',lineHeight:15},
  progBox:{marginHorizontal:16,marginVertical:10,backgroundColor:'rgba(255,255,255,0.04)',borderRadius:12,padding:14,borderWidth:1,borderColor:'rgba(240,165,0,0.08)'},
  progLbl:{fontSize:11,color:'rgba(253,246,237,0.42)',fontWeight:'600'},
  progPct:{fontSize:11,fontWeight:'800'},
  progTrack:{height:5,backgroundColor:'rgba(255,255,255,0.06)',borderRadius:2.5,overflow:'hidden'},
  progFill:{height:5,borderRadius:2.5},
  card:{borderRadius:14,padding:14,flexDirection:'row',alignItems:'center',gap:12,borderWidth:1},
  num:{width:38,height:38,borderRadius:10,alignItems:'center',justifyContent:'center',borderWidth:1,flexShrink:0},
  numTxt:{fontSize:14,fontWeight:'800'},
  uTitle:{fontSize:13,fontWeight:'700',color:'#FDF6ED',marginBottom:2},
  uMeta:{fontSize:10,color:'rgba(253,246,237,0.22)',marginTop:1},
});

// ── MAIN SCREEN ───────────────────────────────────────
export default function KathaVault(){
  const insets=useSafeAreaInsets();
  const[lang,setLang]=useState('hindi');
  const[allProg,setAllProg]=useState({});
  const[selSc,setSelSc]=useState(null);
  const[selUnit,setSelUnit]=useState(null);
  const[showUnits,setShowUnits]=useState(false);
  const[showReader,setShowReader]=useState(false);
  const fade=useRef(new Animated.Value(0)).current;

  useEffect(()=>{
    (async()=>{
      const raw=await AsyncStorage.getItem('dharmasetu_user');
      if(raw){const u=JSON.parse(raw);setLang(u.language||'hindi');}
      refreshProg();
    })();
    Animated.timing(fade,{toValue:1,duration:500,useNativeDriver:true}).start();
  },[]);

  const refreshProg=useCallback(async()=>{
    const p={};
    for(const sc of SCRIPTURES){p[sc.id]=await getProgress(sc.id);}
    setAllProg(p);
  },[]);

  const isH=lang==='hindi';

  return(
    <View style={[ms.root,{paddingTop:insets.top}]}>
      <StatusBar style="light" backgroundColor="#0D0500"/>
      <View style={ms.hdr}>
        <TouchableOpacity onPress={()=>router.back()} style={ms.back} hitSlop={{top:14,bottom:14,left:14,right:14}}>
          <Text style={ms.backTxt}>←</Text>
        </TouchableOpacity>
        <View style={{flex:1,marginLeft:10}}>
          <Text style={ms.hTitle}>{isH?'कथा वॉल्ट':'Katha Vault'}</Text>
          <Text style={ms.hSub}>{isH?'पवित्र सनातन ग्रंथ':'Sacred Sanatan Scriptures'}</Text>
        </View>
        <View style={{flexDirection:'row',gap:5}}>
          {(lang==='english'?[{id:'english',l:'EN'}]:[{id:lang,l:isH?'हिं':'Lang'},{id:'english',l:'EN'}]).map(({id,l})=>(
            <TouchableOpacity key={id} style={[ms.lBtn,lang===id&&ms.lBtnOn]} onPress={()=>setLang(id)}>
              <Text style={[ms.lTxt,lang===id&&ms.lTxtOn]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{padding:14,paddingBottom:insets.bottom+24}}>
        <Animated.View style={{opacity:fade,gap:12}}>
          {SCRIPTURES.map(sc=>{
            const p=allProg[sc.id]||{};
            const rc=Object.keys(p).length,tot=sc.units?.length||1;
            const pct=Math.round((rc/tot)*100);
            return(
              <TouchableOpacity key={sc.id}
                style={[ms.card,{borderColor:sc.color+'28',opacity:sc.live?1:0.75}]}
                onPress={()=>{
                  if(!sc.live)return; // Coming Soon — no action
                  setSelSc(sc);setShowUnits(true);
                }}
                activeOpacity={sc.live?0.88:1}>
                <View style={ms.cardTop}>
                  <View style={[ms.iconBox,{backgroundColor:sc.color+'18'}]}>
                    <Text style={{fontSize:30}}>{sc.icon}</Text>
                  </View>
                  <View style={{flex:1,marginLeft:14}}>
                    <Text style={ms.scName}>{isH?sc.nameHi:sc.name}</Text>
                    <Text style={ms.scDesc} numberOfLines={2}>{isH?sc.descHi:sc.desc}</Text>
                  </View>
                  {sc.live
                    ?<Text style={{fontSize:20,color:'rgba(253,246,237,0.2)'}}>›</Text>
                    :<View style={ms.soonBadge}><Text style={ms.soonTxt}>{isH?'जल्द आएगा':'Coming Soon'}</Text></View>
                  }
                </View>
                {sc.live&&(
                  <View style={{marginTop:13}}>
                    <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:6}}>
                      <Text style={ms.progLbl}>{isH?`${rc}/${tot} अध्याय पढ़े`:`${rc}/${tot} Chapters read`}</Text>
                      <Text style={[ms.progPct,{color:sc.color}]}>{pct}%</Text>
                    </View>
                    <View style={ms.progTrack}><View style={[ms.progFill,{width:`${pct}%`,backgroundColor:sc.color}]}/></View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:10}}>
                      <View style={{flexDirection:'row',gap:6}}>
                        {(sc.units||[]).slice(0,5).map(u=>{
                          const done=!!p[u.n];
                          return(
                            <View key={u.n} style={[ms.pill,{borderColor:done?sc.color+'60':'rgba(200,130,40,0.15)',backgroundColor:done?sc.color+'14':'transparent'}]}>
                              <Text style={[ms.pillTxt,{color:done?sc.color:'rgba(253,246,237,0.32)'}]} numberOfLines={1}>
                                {isH?(u.tH?.split(' ')[0]||`${u.n}`):u.t.split(' ')[0]}
                              </Text>
                              {done&&<Text style={{fontSize:9,color:sc.color}}>✓</Text>}
                            </View>
                          );
                        })}
                        {(sc.units||[]).length>5&&(
                          <View style={[ms.pill,{borderColor:'rgba(200,130,40,0.15)'}]}>
                            <Text style={ms.pillTxt}>+{sc.units.length-5}</Text>
                          </View>
                        )}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </ScrollView>

      <UnitList
        visible={showUnits}
        onClose={()=>{setShowUnits(false);refreshProg();}}
        sc={selSc}
        lang={lang}
        onSelect={unit=>{setSelUnit(unit);setShowReader(true);}}
      />
      <ChapterReader
        visible={showReader}
        onClose={()=>{setShowReader(false);refreshProg();}}
        sc={selSc}
        unit={selUnit}
        lang={lang}
      />
    </View>
  );
}
const ms=StyleSheet.create({
  root:{flex:1,backgroundColor:'#0D0500'},
  hdr:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'rgba(240,165,0,0.1)'},
  back:{width:38,height:38,borderRadius:19,backgroundColor:'rgba(255,255,255,0.08)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(240,165,0,0.2)'},
  backTxt:{fontSize:20,color:'#F4A261',fontWeight:'600',marginTop:-1},
  hTitle:{fontSize:19,fontWeight:'800',color:'#F4A261'},
  hSub:{fontSize:11,color:'rgba(253,246,237,0.38)',marginTop:2},
  lBtn:{paddingHorizontal:10,paddingVertical:7,borderRadius:8,borderWidth:1,borderColor:'rgba(200,130,40,0.2)'},
  lBtnOn:{backgroundColor:'rgba(232,98,10,0.15)',borderColor:'#E8620A'},
  lTxt:{fontSize:12,color:'rgba(253,246,237,0.4)',fontWeight:'700'},
  lTxtOn:{color:'#F4A261'},
  card:{backgroundColor:'#130700',borderRadius:18,padding:16,borderWidth:1,marginBottom:2},
  cardTop:{flexDirection:'row',alignItems:'center'},
  iconBox:{width:60,height:60,borderRadius:15,alignItems:'center',justifyContent:'center',flexShrink:0},
  scName:{fontSize:17,fontWeight:'800',color:'#FDF6ED',marginBottom:3},
  scDesc:{fontSize:11,color:'rgba(253,246,237,0.38)',lineHeight:16},
  soonBadge:{backgroundColor:'rgba(255,255,255,0.08)',borderRadius:8,paddingHorizontal:10,paddingVertical:5,borderWidth:1,borderColor:'rgba(255,255,255,0.12)'},
  soonTxt:{fontSize:11,color:'rgba(253,246,237,0.4)',fontWeight:'700'},
  progLbl:{fontSize:10,color:'rgba(253,246,237,0.38)'},
  progPct:{fontSize:10,fontWeight:'800'},
  progTrack:{height:4,backgroundColor:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden'},
  progFill:{height:4,borderRadius:2},
  pill:{paddingHorizontal:10,paddingVertical:5,borderRadius:9,borderWidth:1,flexDirection:'row',alignItems:'center',gap:3},
  pillTxt:{fontSize:10,fontWeight:'600'},
});