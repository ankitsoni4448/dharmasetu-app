# Mantra practice architecture

This contract keeps app-level preparation separate from canonical, mantra-specific claims.

## General preparation

`createGeneralPreparation()` provides nullable slots for cleanliness, place, mental preparation, respectful environment, and general posture guidance. Product-owned guidance may be supplied separately from a Mantra record. Empty slots do not produce consumer copy.

## Canonical record

A record can carry identity and classification metadata, exact content and transliterations, meanings, nullable `preparation` and `practice` objects, initiation controls, posture metadata, independent provenance arrays, independent verification dimensions, and audio metadata. The client preserves absence and never derives classifications or practice rules.

Purpose IDs support future situation discovery. Associations must be reviewed catalog metadata; the client does not infer benefits or outcomes.

## Practice safety

Advanced instructions are hidden when initiation or guru guidance is required, or when the practice level is `INITIATION_GUIDANCE` or `RESTRICTED`. User-selected counter targets are interface settings and remain separate from sourced `practice.recommended_counts`.

Guided Japa is represented by an inert state contract: `guidedVoiceEnabled`, `autoAdvance`, `playbackSpeed`, `currentRepetition`, `target`, and `paused`. Playback is not implemented in M2. A future player must increment only after one complete verified recording emits its completion event.

## Audio and founder voice

Device TTS remains a synthetic pronunciation aid and is never treated as verified recitation. Future audio metadata can represent slow learning, normal recitation, word-by-word URLs, voice identity, synthetic origin, human review, pronunciation verification, and version.

A founder-voice pipeline requires explicit founder consent, reference recordings, an approved voice model, candidate generation, Sanskrit and pronunciation review, human approval, and only then publication. Generated audio must never automatically set pronunciation or audio verification to `VERIFIED`.
