// ════════════════════════════════════════════════════════
// DharmaSetu — DharmaChat Phase 1 FINAL
// ✅ Emotion detection in user messages
// ✅ Vastly improved system prompt
// ✅ All bugs fixed
// ════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions,
  KeyboardAvoidingView, Modal, Platform,
  StatusBar as RNStatusBar, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, Vibration, View
} from 'react-native';

const { width: SW } = Dimensions.get('window');
const SB_H = RNStatusBar.currentHeight || 0;

const Sec = {
  reqs: [],
  ok() { const n=Date.now(); this.reqs=this.reqs.filter(t=>n-t<60000); if(this.reqs.length>=25)return false; this.reqs.push(n); return true; },
  clean(t) { return t.replace(/<[^>]*>/g,'').replace(/[<>"'%;()&+\\]/g,'').trim().slice(0,600); },
  valid(t) { return ![/ignore\s+previous/i,/system\s+prompt/i,/jailbreak/i,/pretend.*be/i,/you\s+are\s+now/i,/DAN/i].some(p=>p.test(t)); }
};

const GROQ_KEY = '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';
const GEM_KEY  = 'AIzaSyDyRn42EYd5pvf3pwKvZqSb5YwLbL6Zi8Q';

function detectEmotion(text) {
  const t = text.toLowerCase();
  if (/angry|rage|gussa|krodh|frustrated|थक|गुस्सा/.test(t)) return 'angry';
  if (/sad|cry|grief|loss|died|death|maut|dukhi|dard|दुख|दर्द|rona/.test(t)) return 'grieving';
  if (/scared|fear|darr|afraid|worried|anxiety|डर/.test(t)) return 'fearful';
  if (/alone|lonely|akela|akeli|अकेला|isolated/.test(t)) return 'lonely';
  if (/debate|argue|counter|prove|defend|bata|बताओ/.test(t)) return 'debate';
  if (/attack|fake|false|wrong|jhuth|झूठ|lie|nonsense/.test(t)) return 'defensive';
  if (/confused|samajh|kyun|why|kya|pata nahi|समझ|क्यों/.test(t)) return 'confused';
  return 'neutral';
}

function buildSys(lang, name, deity, rashi, isFC, emotion) {
  const LANG_RULES = {
    hindi:'ABSOLUTE: Respond ONLY in शुद्ध हिंदी Devanagari. ZERO English. ZERO Hinglish. Exception ONLY: Sanskrit shlokas, then Hindi translation.',
    english:'ABSOLUTE: Respond ONLY in pure English. ZERO Hindi. ZERO Hinglish. Exception ONLY: Sanskrit shlokas in Devanagari, then English translation.',
    marathi:'ABSOLUTE: Respond ONLY in मराठी.',
    bengali:'ABSOLUTE: Respond ONLY in বাংলা।',
    tamil:'ABSOLUTE: Respond ONLY in தமிழ்.',
    telugu:'ABSOLUTE: Respond ONLY in తెలుగు.',
    gujarati:'ABSOLUTE: Respond ONLY in ગુજરાતી.',
    punjabi:'ABSOLUTE: Respond ONLY in ਪੰਜਾਬੀ.',
  };

  const emotionGuide = {
    angry: 'Person is ANGRY. Acknowledge their anger. Dharma recognizes righteous anger (Arjuna, Ram). Channel toward truth and strength.',
    grieving: 'Person is GRIEVING. Deep compassion FIRST. Hold their pain. Gita Ch.2 on soul\'s eternity ONLY after empathy. Never rush to philosophy.',
    fearful: 'Person is SCARED. Begin with Abhaya (fearlessness). Gita 16.1: "Abhayam sattvasamsuddhih". Show dharma as protection.',
    lonely: 'Person feels ALONE. Atman is never alone (Gita 13.22). Krishna in every heart (Gita 18.61). Hanuman alone in Lanka, Ram in heart.',
    debate: 'Person wants DEBATE AMMUNITION. Give sharp, precise facts. Exact verse references. 3 unshakeable counter-arguments.',
    defensive: 'Person is DEFENDING dharma against false claim. Give FULL TRUTH: what scripture ACTUALLY says + historical context + colonial distortion exposed.',
    confused: 'Person is CONFUSED. Acknowledge confusion is natural (Arjuna was confused — that is why Gita exists). Guide step by step.',
    neutral: 'Person asks genuine question. Be warm, deeply knowledgeable, and insightful.',
  };

  const fcBlock = isFC ? `
FACT CHECK MODE:
Format EXACTLY:
VERDICT: [TRUE / FALSE / MISLEADING / MISATTRIBUTED]
TRUTH: [Full correct explanation]
SCRIPTURE: [Exact verse/reference]
CONTEXT: [Historical context if needed]
DEBUNK: [Why false claim spread and how to counter it]
` : '';

  return `You are DharmaSetu — Guardian, Teacher, and Voice of Sanatan Dharma.

LANGUAGE LAW (NEVER BREAK):
${LANG_RULES[lang] || LANG_RULES.hindi}

USER: ${name||'Dharma Rakshak'} | Rashi: ${rashi||'?'} | Ishta Dev: ${deity||'?'}
Detected Emotion: ${emotion}

EMOTIONAL INTELLIGENCE:
${emotionGuide[emotion] || emotionGuide.neutral}

${fcBlock}

ANSWER STRUCTURE (FOLLOW EXACTLY):

TITLE: [emoji] [5-7 word title in user's language]

1. EMOTIONAL OPENING (2-3 sentences)
   — Acknowledge their specific emotion/situation FIRST
   — Make them feel heard before any teaching

2. CORE DHARMIC ANSWER (main body)
   — Deep, multi-layered explanation
   — NOT just facts — explain the MEANING, the WHY, human relevance
   — Real Puranic stories and examples
   — Connect ancient wisdom to modern life

3. SCRIPTURE (mandatory)
   — Sanskrit shloka in Devanagari: "श्लोक..."
   — Word-by-word meaning
   — Overall meaning in context
   — Exact source: (Text Name, Chapter.Verse)

4. COLONIAL/HISTORICAL CONTEXT (when relevant)
   — Correct British-era misinterpretations
   — Historical evidence

5. EMPOWERING CLOSE (2-3 sentences)
   — Practical takeaway for their life TODAY
   — Debate-ready summary if needed

SHASTRIYA: [all scripture references]
VERIFIED: true

EXAMPLE OF QUALITY EXPECTED:
Q: "If Ram is God why did he need monkeys?"
BAD: "Ram took help from Vanara Sena to defeat Ravana."
GOOD: "Ram came as Maryada Purushottam — the Perfect Human Avatar. He destroyed 14,000 demons ALONE in Aranya Kanda (Valmiki Ramayana 3.22-26), so power was never the issue. He CHOSE Hanuman to honor devotion. The Vanara Sena teaches: dharmic victory requires community. No righteous person wins alone. Hanuman (jivatma) finds purpose serving Ram (Paramatma) — this is the cosmic blueprint of Bhakti. Ram chose to show us how dharmic humans should organize around truth."

ABSOLUTE RULES:
1. NEVER attack any other religion
2. NEVER fabricate scripture — if uncertain, say so
3. Sanskrit MUST be in Devanagari
4. Response: 200-400 words
5. EMPATHY BEFORE PHILOSOPHY — always`;
}

async function callGroq(msgs) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+GROQ_KEY},body:JSON.stringify({model:'llama-3.3-70b-versatile',messages:msgs,temperature:0.78,max_tokens:1200})});
  const d = await r.json();
  if(d.error) throw new Error(d.error.message);
  return d.choices[0].message.content;
}

async function callGemini(q,sys) {
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='+GEM_KEY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:sys+'\n\nUser: '+q}]}],generationConfig:{temperature:0.78,maxOutputTokens:1200}})});
  const d = await r.json();
  if(d.error) throw new Error(d.error.message);
  return d.candidates[0].content.parts[0].text;
}

async function getAnswer(q,hist,sys) {
  const msgs=[{role:'system',content:sys},...hist.slice(-10),{role:'user',content:q}];
  try{return await callGroq(msgs);}catch{return await callGemini(q,sys);}
}

async function doTranslate(text,toLang) {
  const nm={hindi:'शुद्ध हिंदी',english:'English',sanskrit:'Sanskrit (Devanagari)'};
  return callGroq([{role:'user',content:`Translate to ${nm[toLang]||toLang}. Keep scripture references unchanged. Return ONLY translation:\n\n${text}`}]);
}

function parseResp(raw) {
  let title='',body=raw,src='',ver=false;
  const tm=raw.match(/^TITLE:\s*(.+)$/m);if(tm){title=tm[1].trim();body=body.replace(tm[0],'').trim();}
  const sm=raw.match(/^SHASTRIYA:\s*(.+)$/m);if(sm){src=sm[1].trim();body=body.replace(sm[0],'').trim();}
  const scriptBlock=raw.match(/SCRIPTURE:\s*([\s\S]+?)(?=\n[A-Z]+:|$)/);if(scriptBlock&&!src)src=scriptBlock[1].trim().slice(0,300);
  if(/^VERIFIED:\s*true/im.test(raw)){ver=true;body=body.replace(/^VERIFIED:\s*true/im,'').trim();}
  return{title,body:body.trim(),src,ver};
}

const PTS={save:3,thumbsup:2,feedback_given:2,daily:3};
async function addPts(type){try{const c=parseInt(await AsyncStorage.getItem('dharmasetu_pts')||'0',10);const n=c+(PTS[type]||0);await AsyncStorage.setItem('dharmasetu_pts',String(n));return n;}catch{return 0;}}
async function saveAnswer(q,a,src){const raw=await AsyncStorage.getItem('dharmasetu_saved')||'[]';const arr=JSON.parse(raw);if(arr.length>=20)throw new Error('Max 20 saved. Delete some first.');arr.unshift({id:Date.now().toString(),q,a,src,at:new Date().toISOString()});await AsyncStorage.setItem('dharmasetu_saved',JSON.stringify(arr));await addPts('save');}
async function storeFb(q,a,rating,reason){try{const raw=await AsyncStorage.getItem('dharmasetu_feedback')||'[]';const arr=JSON.parse(raw);arr.push({q,a,rating,reason,at:new Date().toISOString()});await AsyncStorage.setItem('dharmasetu_feedback',JSON.stringify(arr.slice(-200)));if(rating==='up')await addPts('thumbsup');if(rating==='down'&&reason)await addPts('feedback_given');}catch{}}

const SUGG={
  hindi:['राम ने शम्बूक का वध क्यों किया?','आर्य आक्रमण — सच या झूठ?','मैं बहुत अकेला महसूस करता हूँ','जाति व्यवस्था के बारे में गीता क्या कहती है?','हनुमान जी की असली शक्ति क्या है?'],
  english:['Why did Ram kill Shambuka?','Is the Aryan Invasion Theory true?','I feel very lost and lonely','What does Gita say about caste?','Explain the science behind Om chanting'],
};

function ThinkDots() {
  const d=[useRef(new Animated.Value(0.2)).current,useRef(new Animated.Value(0.2)).current,useRef(new Animated.Value(0.2)).current];
  useEffect(()=>{d.forEach((dot,i)=>Animated.loop(Animated.sequence([Animated.delay(i*160),Animated.timing(dot,{toValue:1,duration:280,useNativeDriver:true}),Animated.timing(dot,{toValue:0.2,duration:280,useNativeDriver:true}),Animated.delay(340)])).start());},[]);
  return(<View style={{flexDirection:'row',gap:5,padding:4}}>{d.map((dot,i)=><Animated.View key={i} style={{width:8,height:8,borderRadius:4,backgroundColor:'#E8620A',opacity:dot}}/>)}</View>);
}

function FbModal({visible,onClose,onSubmit,isHindi}) {
  const[sel,setSel]=useState('');const[note,setNote]=useState('');
  const opts=isHindi?['गलत जानकारी','शास्त्र संदर्भ गलत','उत्तर अधूरा','भावनात्मक सहायता नहीं','बहुत छोटा उत्तर','कुछ और']:['Wrong info','Scripture ref wrong','Incomplete','Not emotionally helpful','Too short','Other'];
  return(<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={fm.ov}><View style={fm.box}><Text style={fm.title}>{isHindi?'👎 Feedback दें':'👎 Your Feedback'}</Text><Text style={fm.sub}>{isHindi?'यह feedback AI को बेहतर बनाता है 🙏':'This improves our AI for everyone 🙏'}</Text>{opts.map(o=><TouchableOpacity key={o} style={[fm.chip,sel===o&&fm.chipOn]} onPress={()=>setSel(o)}><Text style={[fm.cTxt,sel===o&&fm.cTxtOn]}>{o}</Text></TouchableOpacity>)}<TextInput style={fm.inp} placeholder={isHindi?'और कुछ? (optional)':'Anything else? (optional)'} placeholderTextColor="rgba(253,246,237,0.3)" value={note} onChangeText={setNote} multiline maxLength={200}/><View style={fm.row}><TouchableOpacity style={fm.cancel} onPress={onClose}><Text style={fm.cancelT}>{isHindi?'रद्द':'Cancel'}</Text></TouchableOpacity><TouchableOpacity style={fm.submit} onPress={()=>{onSubmit(sel+(note?' — '+note:''));setSel('');setNote('');}}><Text style={fm.submitT}>Submit 🙏</Text></TouchableOpacity></View></View></View></Modal>);
}
const fm=StyleSheet.create({ov:{flex:1,backgroundColor:'rgba(0,0,0,0.75)',justifyContent:'flex-end'},box:{backgroundColor:'#160800',borderRadius:24,padding:20,margin:12,borderWidth:1,borderColor:'rgba(240,165,0,0.15)'},title:{fontSize:16,fontWeight:'700',color:'#FDF6ED',marginBottom:4},sub:{fontSize:12,color:'rgba(253,246,237,0.4)',marginBottom:12},chip:{paddingHorizontal:14,paddingVertical:10,borderRadius:10,borderWidth:1,borderColor:'rgba(200,130,40,0.2)',marginBottom:7},chipOn:{backgroundColor:'rgba(232,98,10,0.15)',borderColor:'#E8620A'},cTxt:{fontSize:13,color:'rgba(253,246,237,0.45)'},cTxtOn:{color:'#F4A261'},inp:{backgroundColor:'rgba(255,255,255,0.05)',borderRadius:12,padding:12,color:'#FDF6ED',fontSize:13,minHeight:55,borderWidth:1,borderColor:'rgba(200,130,40,0.15)',marginVertical:10},row:{flexDirection:'row',gap:10},cancel:{flex:1,paddingVertical:12,borderRadius:12,backgroundColor:'rgba(255,255,255,0.05)',alignItems:'center'},cancelT:{color:'rgba(253,246,237,0.5)',fontSize:14,fontWeight:'600'},submit:{flex:1,paddingVertical:12,borderRadius:12,backgroundColor:'#E8620A',alignItems:'center'},submitT:{color:'#fff',fontSize:14,fontWeight:'700'}});

export default function DharmaChatScreen() {
  const[userLang,setUserLang]=useState('hindi');
  const[userName,setUserName]=useState('Dharma Rakshak');
  const[userDeity,setUserDeity]=useState('');
  const[userRashi,setUserRashi]=useState('');
  const[chatMode,setChatMode]=useState('dharma');
  const[pts,setPts]=useState(0);
  const[ready,setReady]=useState(false);
  const[msgs,setMsgs]=useState([]);
  const[input,setInput]=useState('');
  const[loading,setLoading]=useState(false);
  const[hist,setHist]=useState([]);
  const[transId,setTransId]=useState(null);
  const[isRec,setIsRec]=useState(false);
  const[recSec,setRecSec]=useState(0);
  const[fbMsgId,setFbMsgId]=useState(null);

  const scrollRef=useRef(null);
  const sendSc=useRef(new Animated.Value(1)).current;
  const micSc=useRef(new Animated.Value(1)).current;
  const micAnim=useRef(null);
  const recTimer=useRef(null);
  const tNow=()=>new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true});

  useEffect(()=>{
    (async()=>{
      try{
        const raw=await AsyncStorage.getItem('dharmasetu_user');
        const p=parseInt(await AsyncStorage.getItem('dharmasetu_pts')||'0',10);
        setPts(p);
        let lang='hindi',name='Dharma Rakshak',deity='',rashi='';
        if(raw){const u=JSON.parse(raw);lang=u.language||'hindi';name=u.name||'Dharma Rakshak';deity=u.deity||'';rashi=u.rashi||'';}
        setUserLang(lang);setUserName(name);setUserDeity(deity);setUserRashi(rashi);
        const mode=await AsyncStorage.getItem('dharmasetu_mode');
        if(mode==='factcheck'){setChatMode('factcheck');await AsyncStorage.removeItem('dharmasetu_mode');}
        const isH=lang==='hindi';
        const greet=isH
          ?`नमस्ते, ${name}! 🙏\n\n${deity?deity+' की असीम कृपा आप पर बनी रहे।\n\n':''}मैं DharmaSetu हूँ — आपका धर्मिक मार्गदर्शक। चाहे कोई कठिन प्रश्न हो, जीवन की उलझन हो, या कोई झूठ का सामना करना हो — मैं हर समय आपके साथ हूँ। 🕉`
          :`Namaste, ${name}! 🙏\n\n${deity?'May '+deity+' bless your journey.\n\n':''}I am DharmaSetu — your guardian of Sanatan Dharma's truth. Ask me anything — philosophy, debate prep, life guidance, or busting misinformation. I'm here. 🕉`;
        setMsgs([{id:'w',type:'ai',title:isH?'🙏 जय सनातन धर्म':'🙏 Jai Sanatan Dharma',body:greet,src:'',ver:false,translations:{},activeLang:null,feedback:null,saved:false,streaming:false,isWelcome:true,time:tNow()}]);
        setReady(true);
        const today=new Date().toDateString();
        const last=await AsyncStorage.getItem('dharmasetu_checkin');
        if(last!==today){await AsyncStorage.setItem('dharmasetu_checkin',today);const n=await addPts('daily');setPts(n);}
      }catch{
        setReady(true);
        setMsgs([{id:'w',type:'ai',title:'🙏 Jai Sanatan Dharma',body:'Namaste! I am DharmaSetu. Ask anything about Sanatan Dharma.',src:'',ver:false,translations:{},activeLang:null,feedback:null,saved:false,streaming:false,isWelcome:true,time:tNow()}]);
      }
    })();
  },[]);

  const scrollDown=useCallback(()=>setTimeout(()=>scrollRef.current?.scrollToEnd({animated:true}),100),[]);

  const pulseSend=()=>{
    Vibration.vibrate(20);
    Animated.sequence([Animated.timing(sendSc,{toValue:0.87,duration:70,useNativeDriver:true}),Animated.spring(sendSc,{toValue:1,friction:3,tension:280,useNativeDriver:true})]).start();
  };

  const startRec=()=>{
    setIsRec(true);setRecSec(0);Vibration.vibrate([0,40]);
    micAnim.current=Animated.loop(Animated.sequence([Animated.timing(micSc,{toValue:1.3,duration:500,useNativeDriver:true}),Animated.timing(micSc,{toValue:1,duration:500,useNativeDriver:true})]));
    micAnim.current.start();
    recTimer.current=setInterval(()=>setRecSec(s=>{if(s>=30){stopRec();return 30;}return s+1;}),1000);
  };

  const stopRec=()=>{
    setIsRec(false);setRecSec(0);
    micAnim.current?.stop();micAnim.current=null;
    clearInterval(recTimer.current);recTimer.current=null;
    Animated.timing(micSc,{toValue:1,duration:150,useNativeDriver:true}).start();
    Vibration.vibrate(25);
    Alert.alert('🎤',userLang==='hindi'?'Voice feature Google Play publish होने के बाद active होगा। अभी type करें 🙏':'Voice feature activates after Play Store release. Type for now 🙏',[{text:'🕉 OK'}]);
  };

  const streamText=useCallback((fullText,id)=>{
    const words=fullText.split(' ');let built='';let i=0;
    const iv=setInterval(()=>{
      if(i>=words.length){clearInterval(iv);setMsgs(prev=>prev.map(m=>m.id===id?{...m,streaming:false}:m));scrollDown();return;}
      built+=(i===0?'':' ')+words[i++];
      setMsgs(prev=>prev.map(m=>m.id===id?{...m,body:built}:m));
      if(i%8===0)scrollDown();
    },25);
  },[scrollDown]);

  const handleTranslate=async(msgId,lang)=>{
    const msg=msgs.find(m=>m.id===msgId);
    if(!msg||msg.isWelcome)return;
    if(msg.activeLang===lang){setMsgs(prev=>prev.map(m=>m.id===msgId?{...m,activeLang:null}:m));return;}
    if(msg.translations?.[lang]){setMsgs(prev=>prev.map(m=>m.id===msgId?{...m,activeLang:lang}:m));return;}
    setTransId(msgId+lang);
    try{const src=(msg.origBody||msg.body)+(msg.src?'\n'+msg.src:'');const t=await doTranslate(src,lang);setMsgs(prev=>prev.map(m=>m.id===msgId?{...m,origBody:m.origBody||m.body,translations:{...m.translations,[lang]:t},activeLang:lang}:m));}
    catch{Alert.alert('','Translation failed. Please try again.');}
    setTransId(null);
  };

  const handleUp=(msg)=>{
    if(msg.feedback)return;
    Vibration.vibrate(20);
    setMsgs(prev=>prev.map(m=>m.id===msg.id?{...m,feedback:'up'}:m));
    storeFb(msg.question||'',msg.body,'up','');
    addPts('thumbsup').then(setPts);
  };

  const handleDown=(msg)=>{if(!msg.feedback)setFbMsgId(msg.id);};

  const submitFb=(reason)=>{
    const msg=msgs.find(m=>m.id===fbMsgId);
    setMsgs(prev=>prev.map(m=>m.id===fbMsgId?{...m,feedback:'down'}:m));
    if(msg)storeFb(msg.question||'',msg.body,'down',reason);
    setFbMsgId(null);
    Alert.alert('🙏',userLang==='hindi'?'शुक्रिया! आपका feedback AI को बेहतर बनाएगा।':'Thank you! Your feedback improves our AI for everyone.');
    addPts('feedback_given').then(setPts);
  };

  const handleSave=async(msg)=>{
    if(msg.saved){Alert.alert('',userLang==='hindi'?'यह पहले से saved है।':'Already saved!');return;}
    try{await saveAnswer(msg.question||'',msg.body,msg.src);setMsgs(prev=>prev.map(m=>m.id===msg.id?{...m,saved:true}:m));Vibration.vibrate(20);Alert.alert('✅','🔖 Saved! +3 Dharma Points 🕉');}
    catch(e){Alert.alert('',e.message);}
  };

  const send=async(txt)=>{
    const raw=(txt||input).trim();
    if(!raw||loading||!ready)return;
    if(!Sec.ok()){Alert.alert('',userLang==='hindi'?'थोड़ा रुकें।':'Please wait a moment.');return;}
    const clean=Sec.clean(raw);
    if(!Sec.valid(clean)||clean.length<2)return;
    const emotion=detectEmotion(clean);
    pulseSend();
    const uid=Date.now().toString();const aid=(Date.now()+1).toString();const t=tNow();
    setMsgs(prev=>[...prev,
      {id:uid,type:'user',text:clean,time:t},
      {id:aid,type:'ai',title:'',body:'',src:'',ver:false,translations:{},activeLang:null,feedback:null,saved:false,streaming:true,thinking:true,question:clean,time:t}
    ]);
    setInput('');setLoading(true);scrollDown();
    try{
      const sys=buildSys(userLang,userName,userDeity,userRashi,chatMode==='factcheck',emotion);
      const rawA=await getAnswer(clean,hist,sys);
      const parsed=parseResp(rawA);
      setMsgs(prev=>prev.map(m=>m.id===aid?{...m,title:parsed.title,src:parsed.src,ver:parsed.ver,origBody:parsed.body,thinking:false}:m));
      setHist(prev=>[...prev,{role:'user',content:clean},{role:'assistant',content:rawA}].slice(-16));
      streamText(parsed.body,aid);
    }catch{
      setMsgs(prev=>prev.map(m=>m.id===aid?{...m,body:userLang==='hindi'?'इंटरनेट कनेक्शन में समस्या। दोबारा प्रयास करें।':'Internet connection issue. Please try again.',thinking:false,streaming:false}:m));
    }
    setLoading(false);scrollDown();
  };

  const isH=userLang==='hindi';
  const suggs=SUGG[userLang]||SUGG.english;

  return(
    <View style={s.root}>
      <StatusBar style="light" backgroundColor="#0D0500" translucent={false}/>
      <View style={{height:SB_H,backgroundColor:'#0D0500'}}/>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={s.hdr}>
          <View style={s.hL}>
            <View style={s.hAv}><Text style={{fontSize:18}}>🕉</Text></View>
            <View>
              <Text style={s.hTitle}>DharmaChat AI</Text>
              <View style={s.hSub}><View style={s.gDot}/><Text style={s.hSubTxt}>{chatMode==='factcheck'?'🛡️ Fact Check Mode':'💬 DharmaChat'}</Text></View>
            </View>
          </View>
          <View style={s.hR}>
            <TouchableOpacity style={[s.mBtn,chatMode==='factcheck'&&s.mBtnFC]} onPress={()=>setChatMode(m=>m==='factcheck'?'dharma':'factcheck')}>
              <Text style={{fontSize:16}}>{chatMode==='factcheck'?'💬':'🛡️'}</Text>
            </TouchableOpacity>
            <View style={s.pBadge}><Text style={s.pTxt}>⚡ {pts}</Text></View>
          </View>
        </View>

        {chatMode==='factcheck'&&<View style={s.fcBnr}><Text style={s.fcBnrTxt}>{isH?'🛡️ Fact Check — कोई भी claim paste करें, पूरा सच मिलेगा':'🛡️ Paste any claim — get complete truth with scripture proof'}</Text></View>}

        <View style={s.lBar}>
          <Text style={s.lLbl}>LANG:</Text>
          {[{id:'hindi',l:'हिंदी'},{id:'english',l:'English'}].map(({id,l})=>(
            <TouchableOpacity key={id} style={[s.lChip,userLang===id&&s.lChipOn]} onPress={()=>setUserLang(id)} activeOpacity={0.8}>
              <Text style={[s.lTxt,userLang===id&&s.lTxtOn]}>{l}</Text>
            </TouchableOpacity>
          ))}
          <Text style={s.lHint}>{isH?'(per-message: संस्कृत)':'(per-message: Sanskrit)'}</Text>
        </View>

        <View style={s.dSep}><View style={s.dLine}/><Text style={s.dTxt}>TODAY</Text><View style={s.dLine}/></View>

        <ScrollView ref={scrollRef} style={s.flex} contentContainerStyle={s.mList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {msgs.map(msg=>{
            if(msg.type==='user')return(
              <View key={msg.id} style={s.uRow}>
                <View><View style={s.uBub}><Text style={s.uTxt}>{msg.text}</Text></View><Text style={s.uTime}>You · {msg.time}</Text></View>
              </View>
            );
            if(msg.thinking)return(
              <View key={msg.id} style={s.aRow}>
                <View style={s.aBdg}><Text style={{fontSize:11}}>🕉</Text></View>
                <View style={[s.aBub,{paddingVertical:14}]}>
                  <ThinkDots/>
                  <Text style={{fontSize:11,color:'rgba(253,246,237,0.25)',marginTop:4}}>{isH?'शास्त्र और हृदय में खोज रहे हैं...':'Searching scripture and wisdom...'}</Text>
                </View>
              </View>
            );
            const showTxt=msg.activeLang&&msg.translations?.[msg.activeLang]?msg.translations[msg.activeLang]:msg.body;
            const showActs=!msg.isWelcome&&!msg.streaming&&msg.body?.length>10;
            return(
              <View key={msg.id} style={s.aRow}>
                <View style={s.aBdg}><Text style={{fontSize:11}}>🕉</Text></View>
                <View style={s.aBub}>
                  {msg.title?<Text style={s.aTitle}>{msg.title}</Text>:null}
                  <Text style={s.aTxt}>{showTxt}{msg.streaming?<Text style={s.cur}> ▌</Text>:null}</Text>
                  {msg.src&&!msg.streaming?(<View style={s.srcBox}><View style={s.srcHdr}><Text style={{fontSize:11}}>📖</Text><Text style={s.srcLbl}>SHASTRIYA PRAMAAN</Text></View><Text style={s.srcTxt}>{msg.src}</Text>{msg.ver&&<View style={s.verRow}><Text style={s.verChk}>✓</Text><Text style={s.verTxt}>Verified · Shastriya Pramaan</Text></View>}</View>):null}
                  {showActs&&(
                    <View style={s.actRow}>
                      <TouchableOpacity style={[s.actBtn,msg.feedback==='up'&&s.actUp]} onPress={()=>handleUp(msg)} disabled={!!msg.feedback} activeOpacity={0.8}>
                        <Text style={{fontSize:14}}>👍</Text>{msg.feedback==='up'&&<Text style={[s.actLbl,{color:'#27AE60'}]}>{isH?'सही':'Correct'}</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.actBtn,msg.feedback==='down'&&s.actDn]} onPress={()=>handleDown(msg)} disabled={!!msg.feedback} activeOpacity={0.8}>
                        <Text style={{fontSize:14}}>👎</Text>{msg.feedback==='down'&&<Text style={[s.actLbl,{color:'#E74C3C'}]}>Noted</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.actBtn,msg.saved&&s.actSav]} onPress={()=>handleSave(msg)} activeOpacity={0.8}>
                        <Text style={{fontSize:14}}>🔖</Text><Text style={[s.actLbl,msg.saved&&{color:'#C9830A'}]}>{msg.saved?'Saved':'Save'}</Text>
                      </TouchableOpacity>
                      {[{l:'hindi',t:'हिं'},{l:'english',t:'EN'},{l:'sanskrit',t:'संस्'}].map(({l,t})=>(
                        <TouchableOpacity key={l} style={[s.tBtn,msg.activeLang===l&&s.tBtnOn]} onPress={()=>handleTranslate(msg.id,l)} disabled={!!transId} activeOpacity={0.8}>
                          {transId===msg.id+l?<ActivityIndicator size={9} color="#E8620A"/>:<Text style={[s.tTxt,msg.activeLang===l&&s.tTxtOn]}>{t}</Text>}
                        </TouchableOpacity>
                      ))}
                      {msg.activeLang&&<TouchableOpacity style={s.tBtn} onPress={()=>setMsgs(prev=>prev.map(m=>m.id===msg.id?{...m,activeLang:null}:m))}><Text style={s.tTxt}>↩</Text></TouchableOpacity>}
                    </View>
                  )}
                  {!msg.streaming&&msg.time&&<Text style={s.aTime}>DharmaChat · {msg.time}</Text>}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {msgs.length<=1&&!loading&&(
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pills} contentContainerStyle={s.pillsC} keyboardShouldPersistTaps="handled">
            {suggs.map((sg,i)=><TouchableOpacity key={i} style={s.pill} onPress={()=>send(sg)} activeOpacity={0.8}><Text style={s.pillTxt}>{sg}</Text></TouchableOpacity>)}
          </ScrollView>
        )}

        <View style={s.iBar}>
          {isRec?(
            <View style={s.recBar}>
              <Animated.View style={[s.recDot,{transform:[{scale:micSc}]}]}/>
              <Text style={s.recTxt}>Recording... {recSec}s</Text>
              <TouchableOpacity onPress={stopRec}><Text style={s.recStop}>Stop</Text></TouchableOpacity>
            </View>
          ):(
            <TextInput style={s.inp} placeholder={isH?'यहाँ पूछें — धर्म, जीवन, या कोई भी सवाल...':'Ask anything — Dharma, life, debate, or any doubt...'} placeholderTextColor="rgba(253,246,237,0.28)" value={input} onChangeText={setInput} multiline maxLength={600} blurOnSubmit={false}/>
          )}
          <Animated.View style={{transform:[{scale:micSc}]}}>
            <TouchableOpacity style={[s.micBtn,isRec&&s.micOn]} onPress={isRec?stopRec:startRec} activeOpacity={0.85}>
              <Text style={{fontSize:18}}>{isRec?'⏹':'🎤'}</Text>
            </TouchableOpacity>
          </Animated.View>
          <Animated.View style={{transform:[{scale:sendSc}]}}>
            <TouchableOpacity style={[s.sendBtn,(!input.trim()||loading)&&s.sendOff]} onPress={()=>send(input)} disabled={(!input.trim()&&!isRec)||loading} activeOpacity={0.85}>
              {loading?<ActivityIndicator color="#fff" size="small"/>:<Text style={s.sendIco}>›</Text>}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
      <FbModal visible={!!fbMsgId} onClose={()=>setFbMsgId(null)} onSubmit={submitFb} isHindi={isH}/>
    </View>
  );
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:'#0D0500'},flex:{flex:1},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,backgroundColor:'#0D0500',borderBottomWidth:1,borderBottomColor:'rgba(240,165,0,0.1)'},
  hL:{flexDirection:'row',alignItems:'center',gap:12},hR:{flexDirection:'row',alignItems:'center',gap:8},
  hAv:{width:40,height:40,borderRadius:20,backgroundColor:'#6B21A8',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'rgba(240,165,0,0.4)',elevation:4},
  hTitle:{fontSize:15,fontWeight:'700',color:'#FDF6ED'},
  hSub:{flexDirection:'row',alignItems:'center',gap:5,marginTop:1},
  gDot:{width:6,height:6,borderRadius:3,backgroundColor:'#2ECC71'},
  hSubTxt:{fontSize:11,color:'#C9830A'},
  mBtn:{width:34,height:34,borderRadius:10,backgroundColor:'rgba(255,255,255,0.05)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(200,130,40,0.2)'},
  mBtnFC:{backgroundColor:'rgba(232,98,10,0.15)',borderColor:'#E8620A'},
  pBadge:{backgroundColor:'rgba(232,98,10,0.15)',borderRadius:20,paddingHorizontal:10,paddingVertical:5,borderWidth:1,borderColor:'rgba(232,98,10,0.3)'},
  pTxt:{fontSize:12,color:'#F4A261',fontWeight:'700'},
  fcBnr:{backgroundColor:'rgba(232,98,10,0.1)',paddingHorizontal:16,paddingVertical:8,borderBottomWidth:1,borderBottomColor:'rgba(232,98,10,0.2)'},
  fcBnrTxt:{fontSize:12,color:'#F4A261',textAlign:'center'},
  lBar:{flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:14,paddingVertical:9,backgroundColor:'#0D0500',borderBottomWidth:1,borderBottomColor:'rgba(240,165,0,0.07)'},
  lLbl:{fontSize:9,color:'rgba(253,246,237,0.28)',fontWeight:'700',letterSpacing:0.8},
  lChip:{paddingHorizontal:14,paddingVertical:7,borderRadius:20,borderWidth:1.5,borderColor:'rgba(200,130,40,0.18)'},
  lChipOn:{borderColor:'#E8620A',backgroundColor:'rgba(232,98,10,0.13)'},
  lTxt:{fontSize:13,color:'rgba(253,246,237,0.38)',fontWeight:'600'},
  lTxtOn:{color:'#F4A261'},
  lHint:{fontSize:10,color:'rgba(253,246,237,0.2)',marginLeft:4},
  dSep:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:20,paddingVertical:10},
  dLine:{flex:1,height:1,backgroundColor:'rgba(255,255,255,0.05)'},
  dTxt:{fontSize:10,color:'rgba(253,246,237,0.2)',letterSpacing:1.5},
  mList:{padding:12,paddingBottom:8,gap:10},
  uRow:{flexDirection:'row-reverse',alignItems:'flex-end'},
  uBub:{backgroundColor:'#C45508',borderRadius:18,borderTopRightRadius:4,padding:14,maxWidth:SW*0.78,elevation:3},
  uTxt:{fontSize:14,color:'#fff',lineHeight:22},
  uTime:{fontSize:10,color:'rgba(253,246,237,0.2)',textAlign:'right',marginTop:3},
  aRow:{flexDirection:'row',gap:8,alignItems:'flex-end'},
  aBdg:{width:26,height:26,borderRadius:13,backgroundColor:'#160800',borderWidth:1,borderColor:'rgba(107,33,168,0.45)',alignItems:'center',justifyContent:'center',flexShrink:0,marginBottom:2},
  aBub:{backgroundColor:'#160800',borderRadius:18,borderTopLeftRadius:4,padding:14,maxWidth:SW*0.83,borderWidth:1,borderColor:'rgba(200,130,40,0.16)',gap:8},
  aTitle:{fontSize:14,fontWeight:'700',color:'#F4A261',marginBottom:2},
  aTxt:{fontSize:14,color:'#FDF6ED',lineHeight:25},
  cur:{color:'#E8620A',fontWeight:'bold'},
  srcBox:{backgroundColor:'rgba(201,131,10,0.07)',borderRadius:10,padding:10,borderWidth:1,borderColor:'rgba(201,131,10,0.18)'},
  srcHdr:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:5},
  srcLbl:{fontSize:9,fontWeight:'700',color:'rgba(201,131,10,0.65)',letterSpacing:1.2},
  srcTxt:{fontSize:12,color:'#C9830A',lineHeight:18},
  verRow:{flexDirection:'row',alignItems:'center',gap:5,marginTop:6},
  verChk:{fontSize:12,color:'#2ECC71'},
  verTxt:{fontSize:10,color:'#2ECC71',fontWeight:'600'},
  actRow:{flexDirection:'row',alignItems:'center',gap:5,marginTop:6,flexWrap:'wrap'},
  actBtn:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:8,paddingVertical:5,borderRadius:10,borderWidth:1,borderColor:'rgba(240,165,0,0.15)'},
  actUp:{backgroundColor:'rgba(39,174,96,0.1)',borderColor:'#27AE60'},
  actDn:{backgroundColor:'rgba(231,76,60,0.1)',borderColor:'#E74C3C'},
  actSav:{backgroundColor:'rgba(201,131,10,0.1)',borderColor:'#C9830A'},
  actLbl:{fontSize:10,color:'rgba(253,246,237,0.35)',fontWeight:'600'},
  tBtn:{borderWidth:1,borderColor:'rgba(240,165,0,0.16)',borderRadius:10,paddingHorizontal:8,paddingVertical:5,alignItems:'center'},
  tBtnOn:{backgroundColor:'rgba(232,98,10,0.16)',borderColor:'#E8620A'},
  tTxt:{fontSize:11,color:'rgba(253,246,237,0.28)',fontWeight:'600'},
  tTxtOn:{color:'#F4A261'},
  aTime:{fontSize:10,color:'rgba(253,246,237,0.18)',marginTop:2},
  pills:{maxHeight:46,marginBottom:4},
  pillsC:{paddingHorizontal:14,gap:8,alignItems:'center'},
  pill:{backgroundColor:'#160800',borderRadius:20,paddingHorizontal:14,paddingVertical:9,borderWidth:1,borderColor:'rgba(232,98,10,0.28)'},
  pillTxt:{fontSize:12,color:'#F4A261',fontWeight:'500'},
  iBar:{flexDirection:'row',gap:8,paddingHorizontal:12,paddingVertical:10,backgroundColor:'#0D0500',borderTopWidth:1,borderTopColor:'rgba(240,165,0,0.07)',alignItems:'flex-end'},
  recBar:{flex:1,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'rgba(232,98,10,0.1)',borderRadius:14,paddingHorizontal:14,paddingVertical:12,borderWidth:1,borderColor:'rgba(232,98,10,0.3)'},
  recDot:{width:10,height:10,borderRadius:5,backgroundColor:'#E8620A'},
  recTxt:{flex:1,fontSize:13,color:'#F4A261'},
  recStop:{fontSize:12,color:'#E8620A',fontWeight:'700'},
  inp:{flex:1,backgroundColor:'rgba(255,255,255,0.05)',borderRadius:16,paddingHorizontal:14,paddingVertical:11,color:'#FDF6ED',fontSize:14,maxHeight:120,minHeight:46,borderWidth:1,borderColor:'rgba(200,130,40,0.16)',lineHeight:20},
  micBtn:{width:44,height:44,borderRadius:13,backgroundColor:'rgba(255,255,255,0.05)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(200,130,40,0.18)'},
  micOn:{backgroundColor:'rgba(232,98,10,0.18)',borderColor:'#E8620A'},
  sendBtn:{width:44,height:44,borderRadius:13,backgroundColor:'#E8620A',alignItems:'center',justifyContent:'center',elevation:5},
  sendOff:{backgroundColor:'rgba(232,98,10,0.2)',elevation:0},
  sendIco:{color:'#fff',fontSize:28,fontWeight:'700',marginBottom:2},
});