import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Alert,AppState,ScrollView,StyleSheet,Text,TextInput,TouchableOpacity,Vibration,View} from 'react-native';
import {router,useLocalSearchParams,useFocusEffect} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {backendFetch} from '../utils/backend-config';
import mantraCatalog from '../utils/mantraCatalog';
import mantraPractice from '../utils/mantraPractice';
import experience from '../utils/mantraExperience';
import guided from '../utils/mantraGuided';
import {createPlaybackAdapter} from '../utils/mantraPlayback';
import {loadPractice,persistPractice} from '../utils/mantraProgressStorage';
import {useMantraPronunciation} from '../utils/useMantraPronunciation';
import {addRecentId} from '../utils/mantraLibraryStorage';
import DigitalMala from '../components/mantra/DigitalMala';
import PracticeReveal from '../components/mantra/PracticeReveal';

const {TARGETS,advance,newSession,finishSession,rollover,validTarget,completionMessage}=experience;
const Button=({children,onPress,disabled=false})=><TouchableOpacity accessibilityRole="button" disabled={disabled} accessibilityState={{disabled}} onPress={onPress} style={[s.button,disabled&&s.disabled]}><Text style={s.buttonText}>{children}</Text></TouchableOpacity>;
export default function MantraJapaScreen(){
  const {id}=useLocalSearchParams(),insets=useSafeAreaInsets();
  const [mantra,setMantra]=useState(null),[practice,setPractice]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  const [mode,setMode]=useState('manual'),[audioState,setAudioState]=useState('idle'),[audioError,setAudioError]=useState(''),[storageError,setStorageError]=useState(false);
  const [custom,setCustom]=useState(''),[goal,setGoal]=useState(''),[goalType,setGoalType]=useState('REPETITIONS');
  const current=useRef(null),controller=useRef(null),alive=useRef(true),acceptTap=useRef(mantraPractice.createTapGuard(350)).current;
  const tts=useMantraPronunciation(mantra&&!mantra.sanskrit_text_corrupted?mantra.sanskrit_text:null);
  const pausePronunciation=tts.pause;
  const source=useMemo(()=>mantra&&!mantra.sanskrit_text_corrupted?guided.selectGuidedAudio(mantra.audio_artifacts,mantra.id):null,[mantra]);
  const save=useCallback(value=>{current.current=value;setPractice(value);persistPractice(value).then(()=>{if(alive.current)setStorageError(false);}).catch(()=>{if(alive.current){setStorageError(true);controller.current?.pause();}});},[]);
  const increment=useCallback(()=>{if(!current.current)return;const next=advance(current.current);if(next.total_malas>current.current.total_malas)Vibration.vibrate(70);save(next);},[save]);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useFocusEffect(useCallback(()=>{let active=true;current.current=null;setPractice(null);setMantra(null);setError('');setMode('manual');
    Promise.all([mantraCatalog.fetchMantraById(backendFetch,String(id||'')),loadPractice(String(id||''))]).then(([value,saved])=>{
      if(!active)return;if(!value){setError('This Mantra is unavailable.');return;}setMantra(value);addRecentId(value.id);current.current=saved;setPractice(saved);setGoal(String(saved.goal_value));setGoalType(saved.goal_type);
    }).catch(()=>{if(active)setError('Your practice could not be loaded. Please retry.');});return()=>{active=false;controller.current?.pause();pausePronunciation();current.current=null;};
  // Retry intentionally reruns this focused load even though it is not request data.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[id,retry,pausePronunciation]));
  useEffect(()=>{if(!source)return;const player=guided.createGuidedController({adapter:createPlaybackAdapter(source),getCount:()=>current.current?.session.count||0,getTarget:()=>current.current?.session.target||0,onComplete:increment,onState:(state,message)=>{setAudioState(state);setAudioError(message||'');}});controller.current=player;
    return()=>{controller.current=null;player.dispose();};
  },[source,increment]);
  useEffect(()=>{const subscription=AppState.addEventListener('change',state=>{if(state!=='active'){controller.current?.pause();pausePronunciation();}else if(current.current)save(rollover(current.current));});
    const timer=setInterval(()=>{if(current.current&&current.current.date!==experience.localDate())save(rollover(current.current));},30000);
    return()=>{subscription.remove();clearInterval(timer);};
  },[save,pausePronunciation]);
  const stop=()=>Promise.all([controller.current?.stop(),tts.pause()]);
  const reset=target=>Alert.alert('Start a new session?','Your completed repetitions remain in your personal history.',[{text:'Cancel',style:'cancel'},{text:'Start new',onPress:()=>{stop();save(newSession(current.current,target));}}]);
  const choose=target=>{if(!validTarget(target)){Alert.alert('Choose a target','Enter a whole number from 1 to 100,000.');return;}if(current.current.session.count)reset(target);else{stop();save(newSession(current.current,target));}};
  if(error)return <View style={[s.root,s.center]}><Text style={s.text}>{error}</Text><Button onPress={()=>setRetry(v=>v+1)}>Retry</Button><Button onPress={()=>router.back()}>Go back</Button></View>;
  if(!mantra||!practice)return <View style={[s.root,s.center]}><ActivityIndicator color="#F4B76D"/><Text style={s.text}>Loading your practice…</Text></View>;
  const session=practice.session,finished=session.finished,malas=Math.floor(session.count/108);
  return <View style={[s.root,{paddingTop:insets.top}]}><View style={s.header}><Button onPress={()=>router.back()}>‹ Back</Button><Text style={s.heading}>{mantra.canonical_name}</Text></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content,{paddingBottom:insets.bottom+48}]}>
      <Text style={s.sanskrit}>{mantra.sanskrit_text_corrupted?'Sacred text under review':mantra.sanskrit_text}</Text>
      <Text style={s.note}>Ready for Japa? Sit comfortably, settle your attention, and begin when ready.</Text>
      <Button onPress={()=>router.push({pathname:'/mantra_detail',params:{id:mantra.id,preparation:'1'}})}>View preparation</Button>
      <View style={s.row}><Button onPress={()=>{stop();setMode('manual');}}>Manual Japa</Button><Button disabled={!source} onPress={async()=>{await tts.pause();setMode('guided');}}>Guided Japa</Button></View>
      {!source?<Text style={s.note}>Reviewed recitation is not yet available for guided practice.</Text>:<Text style={s.note}>{source.synthetic?'Reviewed synthetic recitation':'Reviewed human recitation'}</Text>}
      {mode==='manual'&&!mantra.sanskrit_text_corrupted?<><Button onPress={tts.isPlaying?tts.pause:async()=>{await controller.current?.stop();tts.play();}}>{tts.isPlaying?'Stop pronunciation aid':'Learn pronunciation'}</Button><Text style={s.note}>Synthetic pronunciation aid · not verified recitation</Text></>:null}
      {tts.error?<Text accessibilityRole="alert" style={s.warning}>{tts.error}</Text>:null}
      <Text style={s.label}>Your session target</Text><View style={s.row}>{TARGETS.map(n=><Button key={n} onPress={()=>choose(n)}>{n===session.target?`${n} ✓`:n}</Button>)}</View>
      <View style={s.row}><TextInput accessibilityLabel="Custom session target" style={s.input} value={custom} onChangeText={setCustom} keyboardType="number-pad" placeholder="Custom" placeholderTextColor="#BBA18A"/><Button onPress={()=>choose(Number(custom))}>Set target</Button></View>
      <Text style={s.note}>Your counting target is not a mantra-specific prescription.</Text>
      <DigitalMala count={practice.total_repetitions} disabled={mode!=='manual'||finished||storageError} onPress={()=>{if(mode==='manual'&&!current.current.session.finished&&acceptTap()){Vibration.vibrate(8);increment();}}}/>
      <Text style={s.progress}>{session.count} / {session.target} repetitions</Text><Text style={s.note}>Current mala: {practice.current_mala_repetition} / 108 beads</Text>
      <Text style={s.note}>Completed malas in this session: {malas}</Text><Text style={s.note}>Completed malas today: {practice.completed_malas_today}</Text>
      <View accessibilityRole="progressbar" accessibilityValue={{min:0,max:session.target,now:session.count}} style={s.track}><View style={[s.fill,{width:`${Math.min(100,session.count/session.target*100)}%`}]}/></View>
      {mode==='guided'?<><Text style={s.note}>{audioState==='paused'?'Paused. Resume restarts the unfinished repetition.':audioState==='playing'?'Listening to one full repetition…':'Begin when ready.'}</Text><View style={s.row}>
        <Button disabled={finished||storageError} onPress={()=>controller.current?.start()}>{audioState==='paused'?'Resume':'Start guided'}</Button><Button onPress={()=>controller.current?.pause()}>Pause</Button><Button onPress={()=>controller.current?.stop()}>Stop</Button><Button disabled={finished||storageError} onPress={()=>controller.current?.replay()}>Repeat current repetition</Button>
      </View>{audioError?<Text accessibilityRole="alert" style={s.warning}>{audioError}</Text>:null}</>:null}
      {finished?<View style={s.completion}><Text style={s.heading}>{session.count>=session.target?'Japa complete':'Session finished'}</Text><Text style={s.text}>{session.count>=session.target?completionMessage(mantra.completion_recitation):'Your practice has been saved.'}</Text><Text style={s.note}>{session.count} repetitions · {malas} complete 108-bead malas</Text><Button onPress={()=>{stop();save(newSession(current.current));}}>Begin another session</Button></View>:<View style={s.row}><Button onPress={()=>reset(session.target)}>Reset</Button><Button onPress={()=>{stop();save(finishSession(current.current));}}>Finish Session</Button></View>}
      {storageError?<View><Text accessibilityRole="alert" style={s.warning}>Progress could not be saved. Keep this screen open and retry.</Text><Button onPress={()=>save(current.current)}>Retry saving</Button></View>:null}
      <Text style={s.label}>Your daily practice goal</Text><View style={s.row}>{['REPETITIONS','MALAS','SESSIONS'].map(type=><Button key={type} onPress={()=>setGoalType(type)}>{type==='MALAS'?'108-bead malas':type==='SESSIONS'?'Sessions':'Repetitions'}{goalType===type?' ✓':''}</Button>)}</View>
      <View style={s.row}><TextInput accessibilityLabel="Daily goal amount" style={s.input} keyboardType="number-pad" value={goal} onChangeText={setGoal}/><Button onPress={()=>{const n=Number(goal);if(validTarget(n))save({...current.current,goal_type:goalType,goal_value:n});else Alert.alert('Choose a goal','Enter a whole number from 1 to 100,000.');}}>Save daily goal</Button></View>
      <PracticeReveal practice={practice} artwork={mantra.artwork}/>
      <Text style={s.label}>Your practice history</Text><Text style={s.text}>Today: {practice.repetitions_today} repetitions · {practice.streak} day streak</Text><Text style={s.note}>Lifetime: {practice.total_repetitions} repetitions · {practice.total_malas} completed malas</Text><Text style={s.note}>Last practiced: {practice.last_practice_date||'Begin when ready'}</Text>
      {practice.sessions.slice(-5).reverse().map((item,index)=><Text key={`${item.ended_at}-${index}`} style={s.note}>{item.date} · {item.count}/{item.target} repetitions · {item.complete?'Complete':'Finished early'}</Text>)}
      <Text style={s.note}>Progress is saved on this device.</Text>
    </ScrollView></View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#100A06'},center:{alignItems:'center',justifyContent:'center',padding:24},header:{paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:12},heading:{fontSize:20,color:'#FFF0DE',fontWeight:'700',flexShrink:1},content:{padding:18},text:{color:'#EAD8C4',fontSize:15,lineHeight:24},sanskrit:{color:'#F4D6A5',fontSize:24,lineHeight:38,textAlign:'center',paddingVertical:18},note:{color:'#BEA58E',fontSize:13,lineHeight:21,marginVertical:5},label:{color:'#F4B76D',fontSize:17,fontWeight:'600',marginTop:22,marginBottom:10},row:{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:6},button:{minHeight:48,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:'#63462D',borderRadius:14,paddingHorizontal:15,paddingVertical:10},buttonText:{color:'#F4D6A5',fontSize:14,textAlign:'center'},disabled:{opacity:.4},input:{minHeight:48,minWidth:100,flexGrow:1,color:'#FFF0DE',borderWidth:1,borderColor:'#63462D',borderRadius:14,paddingHorizontal:14},progress:{fontSize:22,fontWeight:'600',color:'#F4B76D',textAlign:'center'},track:{height:6,backgroundColor:'#46301F',borderRadius:4,overflow:'hidden',marginVertical:14},fill:{height:6,backgroundColor:'#F4B76D'},completion:{padding:20,backgroundColor:'#2C1D0E',borderRadius:20,marginVertical:16,gap:10},warning:{color:'#FFC8B7',lineHeight:22,marginVertical:12}});
