'use strict';
/* global __dirname */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const babel=require('@babel/core'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const experience=require('../utils/mantraExperience');
const root=path.join(__dirname,'..');
function compiled(file){return babel.transformSync(fs.readFileSync(path.join(root,file),'utf8'),{filename:file,babelrc:false,configFile:false,plugins:['@babel/plugin-transform-react-jsx','@babel/plugin-transform-modules-commonjs']}).code;}
const element=tag=>function Host({children,style,accessibilityLabel,disabled}){return React.createElement(tag,{'aria-label':accessibilityLabel,'data-disabled':String(!!disabled),'data-style':JSON.stringify(style)},children);};
const native={View:element('div'),Text:element('span'),TouchableOpacity:element('button'),Image:element('figure'),StyleSheet:{create:s=>s},Animated:{View:element('div'),Value:function(value){this.value=value;}}};
function load(file,overrides={}){const module={exports:{}};vm.runInNewContext(compiled(file),{module,exports:module.exports,require:name=>overrides[name]||(name==='react'?React:name==='react-native'?native:require(path.resolve(path.dirname(path.join(root,file)),name)))});return module.exports;}
test('all changed consumer components and screens compile as JSX offline',()=>{
  for(const file of ['app/mantra_library.js','app/mantra_detail.js','app/mantra_japa.js','components/mantra/DigitalMala.js','components/mantra/PracticeReveal.js'])assert.ok(compiled(file).length,file);
});
test('actual mala renders 108 beads and advances only one completed bead',()=>{
  const Mala=load('components/mantra/DigitalMala.js').default;
  const render=count=>renderToStaticMarkup(React.createElement(Mala,{count,disabled:false,onPress:()=>{}}));
  const first=render(0),second=render(1),full=render(108),next=render(109);
  assert.equal((first.match(/position[^<>]*absolute[^<>]*width[^<>]*6/g)||[]).length,108);
  assert.equal((second.match(/#F4B76D/g)||[]).length-(first.match(/#F4B76D/g)||[]).length,1);
  assert.match(full,/0 of 108 beads/);assert.match(next,/1 of 108 beads/);
});
test('actual reveal renders neutral light without approved artwork and full progress at goal',()=>{
  const Reveal=load('components/mantra/PracticeReveal.js').default;
  const state={...experience.freshPractice('m'),repetitions_today:11,goal_value:11};
  const html=renderToStaticMarkup(React.createElement(Reveal,{practice:state,artwork:{image_url:'https://example.org/unreviewed'}}));
  assert.match(html,/A moment of light/);assert.match(html,/progress 100 percent/);assert.doesNotMatch(html,/<figure/);
  const artwork={artwork_id:'fixture',review_status:'APPROVED',reviewed_by:'fixture',reviewed_at:'2026-09-28',version:'1',image_url:'https://example.org/approved'};
  assert.match(renderToStaticMarkup(React.createElement(Reveal,{practice:state,artwork})),/<figure/);
});
test('real progress storage serializes immutable snapshots and reloads target/count after restart',async()=>{
  let stored=null;const releases=[],started=[];
  const storage={getItem:async()=>stored,setItem:(_key,value)=>new Promise(resolve=>{started.push(value);releases.push(()=>{stored=value;resolve();});})};
  const adapter=()=>load('utils/mantraProgressStorage.js',{'@react-native-async-storage/async-storage':storage});
  const first=adapter(),state=experience.newSession(experience.freshPractice('m'),51);
  const one=first.persistPractice(experience.advance(state)),two=first.persistPractice(experience.advance(experience.advance(state)));
  await new Promise(r=>setTimeout(r,0));assert.equal(started.length,1);releases.shift()();await one;
  await new Promise(r=>setTimeout(r,0));assert.equal(started.length,2);releases.shift()();await two;
  const restored=await adapter().loadPractice('m');assert.equal(restored.session.count,2);assert.equal(restored.session.target,51);
});
test('failed storage reads and malformed saved JSON never silently overwrite progress',async()=>{
  let writes=0;const storage={getItem:async()=>'{bad',setItem:async()=>writes++};
  const module=load('utils/mantraProgressStorage.js',{'@react-native-async-storage/async-storage':storage});
  await assert.rejects(module.loadPractice('m'));assert.equal(writes,0);
  storage.getItem=async()=>{throw new Error('offline storage failure');};await assert.rejects(module.loadPractice('m'));assert.equal(writes,0);
});
test('actual pronunciation hook cannot send corrupt sacred text to device speech',async()=>{
  const calls=[];const speech={stop:async()=>{},speak:text=>calls.push(text)};
  const hooks={useState:initial=>[initial,()=>{}],useRef:value=>({current:value}),useCallback:fn=>fn,useEffect:()=>{}};
  const module=load('utils/useMantraPronunciation.js',{react:hooks,'expo-speech':speech});
  for(const text of ['unsafe\uFFFD','à¤¸à¤¾','ï¿½'])await module.useMantraPronunciation(text).play();
  assert.equal(calls.length,0);await module.useMantraPronunciation('fixture text').play();assert.deepEqual(calls,['fixture text']);
});
