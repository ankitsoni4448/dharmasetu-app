'use strict';
const STORAGE_VERSION=4;
const STANDARD_MALA=Object.freeze({id:'JAPA_108',beadCount:108,hasMeru:true,meruCounted:false,reviewStatus:'PRODUCT_STANDARD'});
const MALA_CONFIGURATIONS=Object.freeze([STANDARD_MALA]);
const PRACTICE_MODES=Object.freeze(['REPETITIONS','MALA_ROUNDS']);
const REPETITION_TARGETS=Object.freeze([11,21,51,108]);
const MALA_TARGETS=Object.freeze([1,3,5,11]);
const validTarget=value=>Number.isSafeInteger(value)&&value>0&&value<=100000;
const natural=value=>Number.isSafeInteger(value)&&value>=0?value:0;
function localDate(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function yesterday(date){const d=new Date(date);d.setDate(d.getDate()-1);return localDate(d);}
function sessionTargetRepetitions(session){const value=validTarget(session?.targetValue)?session.targetValue:108;return session?.mode==='MALA_ROUNDS'?value*STANDARD_MALA.beadCount:value;}
function freshSession(date=new Date(),mode='REPETITIONS',targetValue=108){return {mode:PRACTICE_MODES.includes(mode)?mode:'REPETITIONS',targetValue:validTarget(targetValue)?targetValue:108,count:0,finished:false,started_at:date.toISOString()};}
function freshPractice(id,date=new Date()){return {version:STORAGE_VERSION,mantra_id:id,date:localDate(date),repetitions_today:0,completed_malas_today:0,completed_sessions_today:0,current_mala_repetition:0,last_practice_date:null,streak:0,total_repetitions:0,total_malas:0,sessions:[],session:freshSession(date)};}
function migrateV3(raw,date){if(raw?.version!==3)return raw;const target=validTarget(raw.session?.target)?raw.session.target:108;return {...raw,version:STORAGE_VERSION,session:{...raw.session,mode:'REPETITIONS',targetValue:target,finished:raw.session?.finished===true,started_at:raw.session?.started_at||date.toISOString()}};}
function restorePractice(raw,id,date=new Date()){
  const base=freshPractice(id,date),migrated=migrateV3(raw,date);if(!migrated||migrated.mantra_id!==id||migrated.version!==STORAGE_VERSION)return base;
  const value={...base,...migrated,session:{...base.session,...migrated.session}};
  ['repetitions_today','completed_malas_today','completed_sessions_today','current_mala_repetition','streak','total_repetitions','total_malas'].forEach(key=>{value[key]=natural(value[key]);});
  value.session.mode=PRACTICE_MODES.includes(value.session.mode)?value.session.mode:'REPETITIONS';value.session.targetValue=validTarget(value.session.targetValue)?value.session.targetValue:108;
  value.session.count=Math.min(natural(value.session.count),sessionTargetRepetitions(value.session));value.sessions=Array.isArray(value.sessions)?value.sessions.slice(-100):[];return rollover(value,date);
}
function rollover(value,date=new Date()){const day=localDate(date);return {...value,date:day,...(value.date!==day?{repetitions_today:0,completed_malas_today:0,completed_sessions_today:0}:{}),streak:value.last_practice_date===day||value.last_practice_date===yesterday(date)?value.streak:0};}
function finishSession(value,date=new Date()){
  if(value.session.finished||!value.session.count)return value;const target=sessionTargetRepetitions(value.session),session={...value.session,finished:true,ended_at:date.toISOString(),date:localDate(date),complete:value.session.count>=target};
  const rolled=rollover(value,date);return {...rolled,session,completed_sessions_today:rolled.completed_sessions_today+(session.complete?1:0),sessions:[...value.sessions,session].slice(-100)};
}
function advance(value,date=new Date()){
  let state=rollover(value,date);const target=sessionTargetRepetitions(state.session);if(state.session.finished||state.session.count>=target)return state;
  const day=localDate(date),count=state.session.count+1,total=state.total_repetitions+1,completeMala=(state.current_mala_repetition+1)===STANDARD_MALA.beadCount;
  state={...state,session:{...state.session,count},repetitions_today:state.repetitions_today+1,current_mala_repetition:(state.current_mala_repetition+1)%STANDARD_MALA.beadCount,completed_malas_today:Math.floor((state.repetitions_today+1)/STANDARD_MALA.beadCount),total_repetitions:total,total_malas:state.total_malas+(completeMala?1:0),streak:state.last_practice_date===day?state.streak:state.last_practice_date===yesterday(date)?state.streak+1:1,last_practice_date:day};
  return count===target?finishSession(state,date):state;
}
function normalizeSetup(setup,current){if(typeof setup==='number')return {mode:'REPETITIONS',targetValue:setup};return {mode:PRACTICE_MODES.includes(setup?.mode)?setup.mode:(current?.mode||'REPETITIONS'),targetValue:setup?.targetValue};}
function newSession(value,setup={mode:value.session.mode,targetValue:value.session.targetValue},date=new Date()){const normalized=normalizeSetup(setup,value.session);if(!validTarget(normalized.targetValue))return value;const saved=finishSession(rollover(value,date),date);return {...saved,session:freshSession(date,normalized.mode,normalized.targetValue)};}
function malaProgress(count,session=null){const value=natural(count),target=session?sessionTargetRepetitions(session):null;return {completedMalas:Math.floor(value/108),currentBead:value%108,currentMala:Math.floor(value/108)+1,totalMalas:target==null?null:Math.ceil(target/108),targetRepetitions:target};}
function sessionProgress(value){const target=sessionTargetRepetitions(value.session),count=value.session.count,completedMalas=Math.floor(count/108);return {count,target,completedMalas,currentBead:count%108,currentMala:Math.min(completedMalas+1,Math.max(1,Math.ceil(target/108))),intendedMalas:value.session.mode==='MALA_ROUNDS'?value.session.targetValue:Math.ceil(target/108),fraction:Math.max(0,Math.min(1,count/target||0))};}
// Optional visual-extension contract. It is not used by the core Japa flow.
function goalProgress(value){const goal=validTarget(value.goal_value)?value.goal_value:1,units=value.goal_type==='MALAS'?natural(value.completed_malas_today):value.goal_type==='SESSIONS'?natural(value.completed_sessions_today):natural(value.repetitions_today);return {units,fraction:Math.max(0,Math.min(1,units/goal))};}
const approved=item=>item?.review_status==='APPROVED'&&typeof item.reviewed_by==='string'&&!!item.reviewed_by.trim()&&!!item.reviewed_at;
function approvedArtwork(item,mantraId){return approved(item)&&item.artwork_id&&item.version&&/^https:\/\//.test(item.image_url||'')&&(!item.mantra_id||item.mantra_id===mantraId)?item:null;}
function completionMessage(item){return item?.source&&item.text_verification==='VERIFIED'&&item.pronunciation_verification==='VERIFIED'&&item.practice_verification==='VERIFIED'&&approved(item)&&typeof item.text==='string'&&!require('./mantraQuality').hasReplacementCorruption(item.text)?item.text:'Your practice for this session is complete.';}
module.exports={STORAGE_VERSION,STANDARD_MALA,MALA_CONFIGURATIONS,PRACTICE_MODES,REPETITION_TARGETS,MALA_TARGETS,validTarget,localDate,freshPractice,restorePractice,rollover,advance,finishSession,newSession,sessionTargetRepetitions,malaProgress,sessionProgress,goalProgress,approvedArtwork,completionMessage};
