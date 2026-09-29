import {useCallback,useEffect,useRef,useState} from 'react';
import * as Speech from 'expo-speech';
import {AppState} from 'react-native';
import quality from './mantraQuality';

// A one-shot pronunciation aid. It has no Japa counter or history side effects.
export function useMantraPronunciation(text) {
  const [isPlaying,setPlaying]=useState(false),[error,setError]=useState('');
  const epoch=useRef(0),mounted=useRef(true);
  const pause=useCallback(async()=>{
    epoch.current++;
    if(mounted.current)setPlaying(false);
    try{await Speech.stop();}catch{if(mounted.current)setError('The pronunciation aid could not be stopped.');}
  },[]);
  const play=useCallback(async()=>{
    if(typeof text!=='string'||!text||quality.hasReplacementCorruption(text))return;
    const token=++epoch.current;
    setError('');setPlaying(true);
    const valid=()=>mounted.current&&token===epoch.current;
    try{
      await Speech.stop();if(!valid())return;
      Speech.speak(text,{language:'hi-IN',rate:.65,pitch:.8,
        onDone:()=>{if(valid())setPlaying(false);},onStopped:()=>{if(valid())setPlaying(false);},
        onError:()=>{if(valid()){setPlaying(false);setError('The pronunciation aid is unavailable. Please try again.');}}});
    }catch{if(valid()){setPlaying(false);setError('The pronunciation aid is unavailable. Please try again.');}}
  },[text]);
  useEffect(()=>{const lifetime=epoch;mounted.current=true;return()=>{mounted.current=false;lifetime.current++;Speech.stop().catch(()=>{});};},[]);
  useEffect(()=>{pause();},[text,pause]);
  useEffect(()=>{const subscription=AppState.addEventListener('change',state=>{if(state!=='active')pause();});return()=>subscription.remove();},[pause]);
  return {isPlaying,error,play,pause};
}
