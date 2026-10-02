'use strict';
/* global __dirname */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const exp=require('../utils/mantraExperience'),guided=require('../utils/mantraGuided'),quality=require('../utils/mantraQuality'),discovery=require('../utils/mantraDiscovery'),catalog=require('../utils/mantraCatalog');
const practice=require('../utils/mantraPractice');
const date=new Date(2026,8,28,12),next=new Date(2026,8,29,12);
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
function counted(n,target=n){let s=exp.newSession(exp.freshPractice('m',date),target,date);for(let i=0;i<n;i++)s=exp.advance(s,date);return s;}
test('manual advance is one bead; 11 repetitions is not a mala; completed target cannot overcount',()=>{
  const one=counted(1,11);assert.equal(one.session.count,1);assert.equal(one.current_mala_repetition,1);
  const eleven=counted(11);assert.equal(eleven.total_malas,0);assert.equal(eleven.session.finished,true);assert.equal(exp.advance(eleven,date).session.count,11);
  const mala=counted(108);assert.equal(mala.total_malas,1);assert.equal(mala.current_mala_repetition,0);assert.equal(mala.completed_malas_today,1);
});
test('108-bead cycle continues across sessions, reset preserves earned progress, finish is idempotent',()=>{
  const s=counted(107,200),reset=exp.newSession(s,11,date);assert.equal(reset.total_repetitions,107);assert.equal(reset.session.count,0);
  const advanced=exp.advance(reset,date);assert.equal(advanced.total_malas,1);assert.equal(advanced.current_mala_repetition,0);
  const end=exp.finishSession(advanced,date);assert.deepEqual(exp.finishSession(end,date),end);assert.equal(end.sessions.length,2);
});
test('date rollover retains lifetime/mala/session and recomputes streak',()=>{
  const s=counted(11,21),r=exp.rollover(s,next);assert.equal(r.repetitions_today,0);assert.equal(r.session.count,11);assert.equal(r.current_mala_repetition,11);
  const a=exp.advance(r,next);assert.equal(a.streak,2);assert.equal(a.repetitions_today,1);
  const missed=exp.rollover(a,new Date(2026,9,1,12));assert.equal(missed.streak,0);
  assert.equal(exp.advance(missed,new Date(2026,9,1,12)).streak,1);
});
test('daily mala goal requires 108 repetitions today even with yesterday carry-over',()=>{
  const s=counted(107,200),a=exp.advance(s,next);assert.equal(a.total_malas,1);assert.equal(a.completed_malas_today,0);assert.equal(a.repetitions_today,1);
});
test('persistence round-trip retains mode, target and count; another Mantra cannot inherit them',()=>{
  const state=exp.newSession(counted(7,51),{mode:'MALA_ROUNDS',targetValue:11},date);
  assert.deepEqual(exp.restorePractice(JSON.parse(JSON.stringify(state)),'m',date),state);
  assert.equal(exp.restorePractice(state,'other',date).session.count,0);
  assert.equal(exp.restorePractice(state,'m',date).session.mode,'MALA_ROUNDS');assert.equal(exp.validTarget(1.5),false);
});
test('daily goal reveal is deterministic, clamped and distinguishes repetitions, sessions and malas',()=>{
  const s=counted(11);assert.equal(exp.goalProgress({...s,goal_value:11}).fraction,1);
  assert.equal(exp.goalProgress({...s,goal_type:'MALAS',goal_value:11}).fraction,0);
  assert.equal(exp.goalProgress({...s,goal_type:'SESSIONS',goal_value:11}).fraction,1/11);
  assert.equal(exp.goalProgress({...s,repetitions_today:999,goal_value:11}).fraction,1);
  assert.equal(exp.goalProgress({...s,repetitions_today:-1,goal_value:11}).fraction,0);
  assert.equal(exp.approvedArtwork({image_url:'https://example.org/a.png'},'m'),null);
  assert.equal(exp.completionMessage({text:'unreviewed'}),'Your practice for this session is complete.');
});
test('session goal totals survive bounded recent history',()=>{
  let s=exp.freshPractice('m',date);for(let i=0;i<110;i++){s=exp.newSession(s,1,date);s=exp.advance(s,date);}
  assert.equal(s.sessions.length,100);assert.equal(s.completed_sessions_today,110);
});
test('11-mala plan equals 1188 repetitions and continues automatically after every 108 boundary',()=>{
  let state=exp.newSession(exp.freshPractice('m',date),{mode:'MALA_ROUNDS',targetValue:11},date);
  assert.equal(exp.sessionTargetRepetitions(state.session),1188);
  for(let i=0;i<108;i++)state=exp.advance(state,date);
  assert.equal(state.session.finished,false);assert.equal(state.session.count,108);assert.equal(exp.sessionProgress(state).currentMala,2);assert.equal(exp.sessionProgress(state).currentBead,0);
  for(let i=108;i<1188;i++)state=exp.advance(state,date);
  assert.equal(state.session.finished,true);assert.equal(state.session.count,1188);assert.equal(exp.sessionProgress(state).completedMalas,11);
});
test('stored M3 repetition sessions migrate without changing count or target',()=>{
  const legacy={...exp.freshPractice('m',date),version:3,session:{count:7,target:51,finished:false,started_at:date.toISOString()}};
  const restored=exp.restorePractice(legacy,'m',date);assert.equal(restored.version,4);assert.equal(restored.session.mode,'REPETITIONS');assert.equal(restored.session.targetValue,51);assert.equal(restored.session.count,7);
});
function harness(target=11){
  let count=0,active=0,maxActive=0;const events=[];
  const adapter={async play(callbacks){active++;maxActive=Math.max(maxActive,active);events.push(callbacks);},async stop(){active=0;}};
  const player=guided.createGuidedController({adapter,getCount:()=>count,getTarget:()=>target,onComplete:()=>count++});
  return {player,events,get count(){return count;},get maxActive(){return maxActive;}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('guided target 11 advances only on full completion and stops exactly at target without overlap',async()=>{
  const h=harness();await h.player.start();await h.player.start();assert.equal(h.events.length,1);assert.equal(h.count,0);
  for(let i=0;i<11;i++){h.events[i].onComplete();h.events[i].onComplete();await tick();assert.equal(h.count,i+1);}
  assert.equal(h.events.length,11);assert.equal(h.player.getState(),'complete');assert.equal(h.maxActive,1);
});
for(const target of [21,51,108])test(`guided target ${target} stops exactly`,async()=>{
  const h=harness(target);await h.player.start();for(let i=0;i<target;i++){h.events[i].onComplete();await tick();}assert.equal(h.count,target);assert.equal(h.events.length,target);
});
test('pause/resume/replay/stop/error/dispose invalidate late audio completions',async()=>{
  const h=harness();await h.player.start();const first=h.events[0];await h.player.pause();first.onComplete();assert.equal(h.count,0);
  await h.player.start();const second=h.events[1];await h.player.replay();second.onComplete();assert.equal(h.count,0);
  h.events[2].onError();h.events[2].onComplete();await tick();assert.equal(h.count,0);assert.equal(h.player.getState(),'error');
  await h.player.start();await h.player.stop();h.events[3].onComplete();assert.equal(h.count,0);
  await h.player.start();await h.player.dispose();h.events[4].onComplete();assert.equal(h.count,0);assert.equal(h.maxActive,1);
});
test('pause while loading cancels pending audio before playback',async()=>{
  let release,played=0;
  const player=guided.createGuidedController({adapter:{play:async({isCurrent})=>{await new Promise(r=>{release=r;});if(isCurrent())played++;},stop:async()=>{}},getCount:()=>0,getTarget:()=>11,onComplete:()=>{}});
  player.start();await tick();const paused=player.pause();release();await paused;assert.equal(played,0);
});
test('audio hierarchy admits only independently verified guided sources',()=>{
  const base={mantra_id:'m',publication_status:'APPROVED',pronunciation_review_status:'VERIFIED',audio_verification:'VERIFIED',reviewed_by:'fixture',reviewed_at:'2026-09-28',audio_version:'1',duration:2,normal_url:'https://example.org/fixture.mp3',voice_identity:'fixture',generation_method:'recording',synthetic:false};
  const human={...base,source_type:'VERIFIED_HUMAN_RECITATION'},founder={...base,source_type:'FOUNDER_RECORDED'};
  const founderAi={...base,source_type:'FOUNDER_AI_GENERATED',synthetic:true,provider:'fixture',model:'fixture',consent_id:'consent',voice_model_approval_id:'approval'};
  assert.equal(guided.selectGuidedAudio([human,founderAi,founder],'m'),founder);
  assert.equal(guided.selectGuidedAudio([{...base,source_type:'SYNTHETIC_PREVIEW',synthetic:true}],'m'),null);
  assert.equal(guided.selectGuidedAudio([{...base,source_type:'UNVERIFIED'}],'m'),null);
  assert.equal(guided.selectGuidedAudio([{...founderAi,consent_id:null}],'m'),null);
  assert.equal(guided.selectGuidedAudio([human],'different'),null);
});
test('Unicode detection withholds but never rewrites sacred or explanatory fields',()=>{
  for(const value of ['bad\uFFFD','ï¿½','Ã¯Â¿Â½','à¤¸à¤¾','Ã©','\uD800'])assert.ok(quality.corruptionTypes(value).length,value);
  for(const value of ['ॐ नमः','śāntiḥ','हिन्दी','ध्यान','Ātman'])assert.equal(quality.corruptionTypes(value).length,0,value);
  const raw='broken\uFFFD';const row=catalog.normalizeMantraRecord({id:'q',canonical_name:'Fixture',sanskrit_text:raw});assert.equal(row.sanskrit_text,raw);assert.equal(row.sanskrit_text_corrupted,true);
  const findings=quality.qualityFindings([{id:'q',sanskrit_text:raw,meanings:{hi:raw}}]);assert.equal(findings.length,2);assert.equal(findings[0].original_value,raw);assert.match(findings[0].safe_action,/NO_AUTO_REPAIR/);
});
test('share payload excludes corrupt sacred text even with a missing corruption flag',()=>{
  const message=require('../utils/mantraPractice').shareMessage({canonical_name:'Fixture',sanskrit_text:'unsafe\uFFFD',transliteration_simple:'bad\uFFFD'});
  assert.doesNotMatch(message,/unsafe|bad|\uFFFD/);assert.match(message,/Content under review/);
});
test('search supports alternate names and normalized IAST',()=>{
  const row=catalog.normalizeMantraRecord({id:'search',canonical_name:'Fixture',sanskrit_text:'ॐ',alternate_names:['Other title'],transliteration_iast:'śāntiḥ'});
  assert.equal(catalog.filterMantras([row],{query:'santih'}).length,1);assert.equal(catalog.filterMantras([row],{query:'other title'}).length,1);
});
test('hierarchical metadata is dynamic, cycle safe and discovery requires reviewed purpose mapping',()=>{
  const reviewed={review_status:'APPROVED',reviewed_by:'fixture',reviewed_at:'2026-09-28',source:'fixture'};
  const row={deity_ids:['child'],purpose_ids:['calm'],taxonomy_nodes:[{...reviewed,kind:'DEITY',id:'parent',label:'Parent'},{...reviewed,kind:'DEITY',id:'child',parent_id:'parent',label:'Child'}],reviewed_purpose_mappings:[]};
  const nodes=discovery.taxonomyFor([row],'DEITY');assert.equal(nodes.length,2);assert.equal(discovery.byDeity([row],'parent',nodes).length,1);
  assert.equal(discovery.descendants([{id:'a',parent_id:'b'},{id:'b',parent_id:'a'}],'a').size,2);
  assert.equal(discovery.forIntention([row],'Peace / calm').length,0);
  row.reviewed_purpose_mappings=[{...reviewed,intention:'Peace / calm',purpose_id:'calm'}];assert.equal(discovery.forIntention([row],'Peace / calm').length,1);
  assert.doesNotMatch(discovery.INTENTIONS.join(' '),/cure|treat|guarantee|depression/i);
});
test('1000 records preserve pagination and search',async()=>{
  let calls=0;const result=await catalog.fetchMantraCatalog(async()=>{const page=calls++;return {ok:true,json:async()=>({success:true,mantras:page<10?Array.from({length:100},(_,i)=>({id:`large-${page*100+i}`,canonical_name:`Name ${page*100+i}`,sanskrit_text:'fixture'})):[],has_more:page<10})};});
  assert.equal(result.length,1000);assert.equal(calls,11);assert.equal(catalog.filterMantras(result,{query:'Name 999'}).length,1);
});
test('consumer screen contracts: compact filters, footer, preparation only in Detail, reset confirmation',()=>{
  const library=read('app/mantra_library.js'),detail=read('app/mantra_detail.js'),japa=read('app/mantra_japa.js');
  assert.doesNotMatch(library,/catalog content|catalog entries/);assert.match(library,/<Modal/);assert.match(library,/Math.max\(64, insets.bottom \+ 48\)/);assert.match(library,/mantra-library-footer/);
  assert.match(detail,/<GeneralJapaPreparation \/>/);assert.doesNotMatch(japa,/GeneralJapaPreparation|PracticeReveal|Movement of Light/);assert.match(japa,/View preparation/);assert.match(japa,/createTapGuard\(350\)/);assert.match(japa,/Alert.alert\('Change practice setup/);assert.doesNotMatch(japa,/Begin another session/);
  assert.doesNotMatch(read('components/mantra/PracticeReveal.js'),/fetch\(|imagegen|openai/i);
});
test('Japa eligibility excludes long-form works and ordinary verse or prayer',()=>{
  for(const content_type of ['STOTRA','ASHTAKAM','KAVACHA','CHALISA','NAMAVALI','SAHASRANAMA','SHLOKA','PRAYER','PRARTHANA'])assert.equal(practice.japaEligibility({content_type}).eligible,false);
  for(const content_type of ['MANTRA','NAMA_JAPA','VEDIC_MANTRA','BIJA_MANTRA','GAYATRI_MANTRA','DHYANA_MANTRA','SHANTI_MANTRA'])assert.equal(practice.japaEligibility({content_type}).eligible,true);
  assert.match(read('app/mantra_detail.js'),/japa\.eligible/);assert.match(read('app/mantra_japa.js'),/japaEligibility\(value\)/);
});
