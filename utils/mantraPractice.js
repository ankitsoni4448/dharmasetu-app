'use strict';

const ADVANCED_LEVELS = new Set(['INITIATION_GUIDANCE', 'RESTRICTED']);

function populatedEntries(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value).filter(([, item]) => item != null && item !== '' && (!Array.isArray(item) || item.length));
}

function presentationValue(value) {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    const values = value.map(presentationValue).filter(Boolean);
    return values.length ? values.join(', ') : null;
  }
  return null;
}

function practiceLevelLabel(level) {
  return ({ GENERAL_DEVOTIONAL:'General devotional', SOURCE_SPECIFIC:'Source-specific', TRADITION_SPECIFIC:'Tradition-specific',
    INITIATION_GUIDANCE:'Initiation guidance', RESTRICTED:'Restricted practice' })[level] || 'Practice level unavailable';
}

function advancedPracticeState(mantra) {
  const guarded = mantra?.requires_initiation === true || mantra?.requires_guru_guidance === true || ADVANCED_LEVELS.has(mantra?.practice_level);
  const sourced = Array.isArray(mantra?.provenance?.practice) && mantra.provenance.practice.length > 0;
  const verified = mantra?.verification?.practice === 'VERIFIED';
  return { guarded, mayDisplayInstructions: !guarded && sourced && verified && mantra?.advanced_practice_available === true };
}

function createTapGuard(lockMs = 350, now = () => Date.now()) {
  let lastAcceptedAt = -Infinity;
  return () => { const time = now(); if (time - lastAcceptedAt < lockMs) return false; lastAcceptedAt = time; return true; };
}

function createGuidedJapaState(overrides = {}) {
  return { guidedVoiceEnabled: false, autoAdvance: false, playbackSpeed: 1, currentRepetition: 0,
    target: null, paused: true, ...overrides };
}

function createGeneralPreparation(overrides = {}) {
  return { cleanliness: null, place: null, mental_preparation: null, respectful_environment: null,
    general_posture_guidance: null, ...overrides };
}

function createSerializedWriter(write) {
  let pending = Promise.resolve();
  return value => { pending = pending.catch(() => {}).then(() => write(value)); return pending; };
}

module.exports = { populatedEntries, presentationValue, practiceLevelLabel, advancedPracticeState, createTapGuard,
  createGuidedJapaState, createGeneralPreparation, createSerializedWriter };
