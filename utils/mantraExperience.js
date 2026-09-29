'use strict';

const TARGETS = [11, 21, 51, 108];
const validTarget = value => Number.isSafeInteger(value) && value > 0 && value <= 100000;
const natural = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function yesterday(date) { const d = new Date(date); d.setDate(d.getDate()-1); return localDate(d); }
function freshPractice(id, date = new Date()) {
  return { version:3, mantra_id:id, date:localDate(date), goal_type:'REPETITIONS', goal_value:108,
    repetitions_today:0, completed_malas_today:0, completed_sessions_today:0, current_mala_repetition:0, last_practice_date:null,
    streak:0, total_repetitions:0, total_malas:0, sessions:[], session:{count:0,target:108,finished:false,started_at:date.toISOString()} };
}
function restorePractice(raw, id, date = new Date()) {
  const base = freshPractice(id,date);
  if (!raw || raw.mantra_id !== id || raw.version !== 3) return base;
  const value = {...base,...raw,session:{...base.session,...raw.session}};
  ['repetitions_today','completed_malas_today','completed_sessions_today','current_mala_repetition','streak','total_repetitions','total_malas'].forEach(key => {value[key]=natural(value[key]);});
  value.session.target = validTarget(value.session.target) ? value.session.target : 108;
  value.session.count = Math.min(natural(value.session.count),value.session.target);
  value.goal_type = ['REPETITIONS','MALAS','SESSIONS'].includes(value.goal_type) ? value.goal_type : 'REPETITIONS';
  value.goal_value = validTarget(value.goal_value) ? value.goal_value : 108;
  value.sessions = Array.isArray(value.sessions) ? value.sessions.slice(-100) : [];
  return rollover(value,date);
}
function rollover(value, date = new Date()) {
  const day = localDate(date);
  return {...value, date:day, ...(value.date !== day ? {repetitions_today:0,completed_malas_today:0,completed_sessions_today:0} : {}),
    streak:value.last_practice_date === day || value.last_practice_date === yesterday(date) ? value.streak : 0};
}
function finishSession(value, date = new Date()) {
  if (value.session.finished || !value.session.count) return value;
  const session = {...value.session,finished:true,ended_at:date.toISOString(),date:localDate(date),complete:value.session.count >= value.session.target};
  const rolled=rollover(value,date);
  return {...rolled,session,completed_sessions_today:rolled.completed_sessions_today+(session.complete?1:0),sessions:[...value.sessions,session].slice(-100)};
}
function advance(value, date = new Date()) {
  let state = rollover(value,date);
  if (state.session.finished || state.session.count >= state.session.target) return state;
  const day = localDate(date), count = state.session.count+1, total = state.total_repetitions+1;
  const completeMala = (state.current_mala_repetition+1) === 108;
  state = {...state, session:{...state.session,count}, repetitions_today:state.repetitions_today+1,
    current_mala_repetition:(state.current_mala_repetition+1)%108,
    // Daily mala goals require 108 repetitions TODAY, not a carry-over boundary.
    completed_malas_today:Math.floor((state.repetitions_today+1)/108),
    total_repetitions:total, total_malas:state.total_malas+(completeMala?1:0),
    streak:state.last_practice_date===day ? state.streak : state.last_practice_date===yesterday(date) ? state.streak+1 : 1,
    last_practice_date:day};
  return count===state.session.target ? finishSession(state,date) : state;
}
function newSession(value, target = value.session.target, date = new Date()) {
  if (!validTarget(target)) return value;
  const saved = finishSession(rollover(value,date),date);
  return {...saved,session:{count:0,target,finished:false,started_at:date.toISOString()}};
}
function malaProgress(count) { return {completedMalas:Math.floor(natural(count)/108),bead:natural(count)%108}; }
function goalProgress(value) {
  const units = value.goal_type==='MALAS' ? value.completed_malas_today : value.goal_type==='SESSIONS'
    ? value.completed_sessions_today : value.repetitions_today;
  return { units, fraction:Math.max(0,Math.min(1,units/value.goal_value || 0)) };
}
const approved = item => item?.review_status==='APPROVED' && typeof item.reviewed_by==='string' && !!item.reviewed_by.trim() && !!item.reviewed_at;
function approvedArtwork(item, mantraId) {
  return approved(item) && item.artwork_id && item.version && /^https:\/\//.test(item.image_url || '') && (!item.mantra_id || item.mantra_id===mantraId) ? item : null;
}
function completionMessage(item) {
  return item?.source && item.text_verification==='VERIFIED' && item.pronunciation_verification==='VERIFIED' && item.practice_verification==='VERIFIED'
    && approved(item) && typeof item.text==='string' && !require('./mantraQuality').hasReplacementCorruption(item.text) ? item.text : 'Your practice for this session is complete.';
}
module.exports = { TARGETS, validTarget, localDate, freshPractice, restorePractice, rollover, advance, finishSession, newSession, malaProgress, goalProgress, approvedArtwork, completionMessage };
