'use strict';

const AUDIO_HIERARCHY = ['VERIFIED_HUMAN_RECITATION','REVIEWED_FOUNDER_VOICE','REVIEWED_SYNTHETIC_VOICE','DEVICE_TTS_FALLBACK'];
function selectGuidedAudio(artifacts, mantraId) {
  return (Array.isArray(artifacts)?artifacts:[]).filter(a=>a && a.mantra_id===mantraId && AUDIO_HIERARCHY.slice(0,3).includes(a.source_type)
    && a.publication_status==='APPROVED' && a.pronunciation_review_status==='VERIFIED' && a.audio_verification==='VERIFIED'
    && typeof a.reviewed_by==='string' && a.reviewed_by.trim() && Number.isFinite(Date.parse(a.reviewed_at)) && a.audio_version && a.duration>0 && /^https:\/\//.test(a.normal_url || '')
    && a.voice_identity && a.generation_method && typeof a.synthetic==='boolean'
    && (a.source_type==='VERIFIED_HUMAN_RECITATION' ? !a.synthetic : a.synthetic && a.provider && a.model)
    && (a.source_type!=='REVIEWED_FOUNDER_VOICE' || (a.consent_id && a.voice_model_approval_id)))
    .sort((a,b)=>AUDIO_HIERARCHY.indexOf(a.source_type)-AUDIO_HIERARCHY.indexOf(b.source_type))[0] || null;
}
// Adapter contract: play({onComplete,onError}) starts ONE complete repetition;
// stop() resolves only once the previous playback has released audio resources.
// Pausing restarts the unfinished repetition on resume; it never credits partial audio.
function createGuidedController({adapter,getCount,getTarget,onComplete,onState=()=>{}}) {
  let state='idle', epoch=0, disposed=false, queue=Promise.resolve();
  const emit=(next,error)=>{state=next;if(!disposed)onState(next,error);};
  const enqueue=fn=>{queue=queue.catch(()=>{}).then(fn).catch(()=>{emit('error','Audio could not be played. No repetition was counted.');});return queue;};
  const invalidate=()=>{epoch+=1;return epoch;};
  function startOne(token) {
    if(disposed || token!==epoch || state!=='playing')return;
    if(getCount()>=getTarget()){emit('complete');return;}
    let settled=false;
    return adapter.play({isCurrent:()=>!disposed && token===epoch && state==='playing',onComplete:()=>{
      if(settled || disposed || token!==epoch || state!=='playing')return;
      settled=true;
      // Invalidate before notifying consumers; duplicate and late callbacks are inert.
      const next=invalidate();
      onComplete();
      if(getCount()>=getTarget()){emit('complete');enqueue(()=>adapter.stop());return;}
      enqueue(async()=>{await adapter.stop();return startOne(next);});
    },onError:()=>{
      if(settled || token!==epoch || disposed)return;
      settled=true;invalidate();emit('error','Audio stopped before completion. No repetition was counted.');enqueue(()=>adapter.stop());
    }});
  }
  const halt=next=>{invalidate();emit(next);return enqueue(()=>adapter.stop());};
  return {
    start(){if(disposed || state==='playing')return queue;const token=invalidate();emit('playing');return enqueue(async()=>{await adapter.stop();return startOne(token);});},
    pause(){return halt('paused');}, stop(){return halt('stopped');},
    replay(){if(disposed)return queue;const token=invalidate();emit('playing');return enqueue(async()=>{await adapter.stop();return startOne(token);});},
    dispose(){disposed=true;invalidate();state='stopped';return enqueue(()=>adapter.stop());},
    getState:()=>state, flush:()=>queue,
  };
}
module.exports={AUDIO_HIERARCHY,selectGuidedAudio,createGuidedController};
