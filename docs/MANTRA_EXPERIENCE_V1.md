# Mantra experience M3

Implementation and offline verification only. **PHYSICAL ANDROID QA REQUIRED.**

## Library and discovery

`app/mantra_library.js` reads the backend catalog through `mantraCatalog`. It keeps the existing complete, paginated, atomic snapshot and direct-ID race protections. Failed refreshes preserve the last successful snapshot. No static candidates are merged into the consumer library.

The screen has Library/Favorites/Recent, search, one horizontal strip of compact filter controls, and a virtualized vertical FlatList. Detailed choices use a scrollable modal; the purpose-discovery section is inside the list header and scrolls away. The vertical list has `flex:1`, SafeArea-aware bottom padding `max(64, bottomInset + 48)`, and a 24-unit footer. It is a root-stack screen, not nested inside the tab list. Android clipping is disabled while FlatList windowing remains enabled. Confirm the final card and its favorite button on real phones with both navigation modes and large text.

Search indexes canonical names, stored alternate names, Sanskrit/Devanagari, simple transliteration, IAST, deity, purpose, categories and existing tags. Latin diacritics are normalized only in the search index, never in stored or displayed sacred text. Metadata arrays reject object-valued IDs. Favorites and Recent reload on focus; opening Detail/Japa adds a real recent ID. These remain local device data, with no fabricated server history.

`mantraDiscovery` supports reviewed taxonomy nodes with `id`, `kind`, `label`, `parent_id`, source, review status, reviewer and timestamp. Parent filtering traverses descendants with cycle protection. Existing legacy deity labels remain browseable with their existing pending-review status; no new assignments are inferred. Adding reviewed child nodes does not require changing a fixed eight-chip list.

Content types support Mantra, Nama Japa, Vedic Mantra, Shloka, Stotra, Gayatri Mantra, Dhyana Mantra, Shanti Mantra and Prayer. There is no classifier that derives sacred type or deity from a title/text. The backend's old deity-name inference was removed.

Intention navigation contains calm, focus, study, courage, confidence, devotion, gratitude, discipline, protection, strength, morning/evening practice, before study/work, support in a difficult moment, and rest. `reviewed_purpose_mappings` must match a stored purpose ID and have an approved review/source. Deity names never imply a recommendation. Missing reviewed mappings produce a clear empty state. No treatment, cure or guaranteed-outcome copy is introduced.

## Detail and preparation

Detail retains full General Japa Preparation, independently of mantra-specific practice. It presents identity, Sanskrit, transliteration, pronunciation, Start Japa, meaning, preparation, practice and source/tradition information. `View preparation` on Japa opens Detail with preparation expanded. Japa itself contains only a short readiness reminder.

Mantra-specific instructions still require verified practice plus provenance; initiation/restriction gates remain intact. Source-specific and tradition-specific levels remain distinct. Advanced/esoteric procedure is not populated. Future completion recitation requires a source, approved review and independent text, pronunciation and practice verification; otherwise neutral product copy is used.

Corrupted explanatory text is withheld using a content-review message. Corrupted sacred text is preserved in the model for review but is not displayed, shared or sent to speech. The one-shot pronunciation hook checks again before speaking. It stops on blur/background/unmount and reports speech failures. TTS is explicitly labelled “Synthetic pronunciation aid · not verified recitation.” It never contributes repetitions or writes practice history.

## Manual Japa, targets and the digital mala

The session target choices are **11, 21, 51, 108 and Custom**. Custom accepts whole numbers 1–100,000. These are personal counting targets, never religious prescriptions. Reviewed mantra-specific counts, if available, belong in Detail's practice section.

A deliberate accepted tap adds one repetition and advances one bead. The 350 ms tap guard remains. No side effects run inside React functional state updaters for Japa. The visual is 108 lightweight native bead views with one transform animation. A mala boundary has a slower, slightly larger pulse and calm completion copy; no points, coins or competitive rewards.

Three scopes are explicit:

- Session: count/target, stops at target; 11/11 is zero complete session malas.
- Lifetime mala: completed malas = floor(total repetitions/108); current bead = total repetitions modulo 108. This carries across sessions and midnight.
- Daily goal: completed malas today = floor(repetitions today/108). Yesterday's partial mala cannot satisfy today's full-mala goal after one tap.

At repetition 108 of an uninterrupted fresh count, one traditional mala is complete and the next bead cycle begins at zero. Repetition 109 highlights bead one. A session that ends early remains in history as finished early. Reset/target change with progress requires confirmation; it starts a new session while preserving earned daily/lifetime repetitions and history. Finish is idempotent.

## Guided playback

`mantraGuided` is a pure controller; `mantraPlayback` adapts the installed Expo AV Sound API. One complete audio artifact is played at a time. Only a successful `didJustFinish` callback credits a repetition. Epoch and settled-callback guards reject stale, repeated, paused, stopped, failed and disposed callbacks. Playback starts/stops are serialized; pending audio loads check cancellation before starting.

Pause cancels the unfinished repetition. Resume restarts that repetition from its beginning, with no partial credit. Repeat current repetition also cancels/restarts without crediting the cancelled playback. Stop keeps earned progress. Targets stop exactly at their chosen count. Blur/background/unmount stop advancement. Manual taps are disabled in Guided mode, and speech is stopped before switching to Guided.

Source preference:

1. VERIFIED_HUMAN_RECITATION
2. REVIEWED_FOUNDER_VOICE
3. REVIEWED_SYNTHETIC_VOICE
4. DEVICE_TTS_FALLBACK — pronunciation only, never counted guided practice

Guided sources require matching mantra ID, explicit publication approval, independent audio/pronunciation verification, reviewer/date, version, positive duration, HTTPS URL, voice identity, generation method and truthful synthetic metadata. Founder synthesis additionally needs consent and approved voice-model references. No qualifying artifact exists in the inspected production snapshot, so Guided Japa is truthfully unavailable until reviewed audio is supplied. Mock adapters exercise the complete controller offline.

## Daily goals, history and persistence

`mantraExperience` is a pure state model. `mantraProgressStorage` stores one versioned JSON snapshot per mantra at `ds_mantra_practice_v3:<id>`, using a module-scoped serialized writer and immutable serialized values. A load waits for outstanding writes. Read/parse failures show Retry rather than overwrite existing progress with zero. Write failures pause guided playback, disable manual increments and show Retry saving. As with any local storage, force-killing before the OS completes an outstanding write cannot be guaranteed durable; test restart after the save has completed.

Snapshots retain mantra ID, goal type/value, session count/target, today's repetitions/malas/completed sessions, current mala bead, last practice date, streak, lifetime repetitions/malas and up to 100 recent sessions. Session-goal totals have a separate counter so truncating recent history does not reduce today's goal progress. Local calendar dates drive rollover, not UTC day boundaries. Check on focus, app foreground, each repetition and a 30-second timer. Repeated activity on one day increases streak only once; gaps reset it.

Goals are REPETITIONS, MALAS or SESSIONS. MALAS means full groups of 108 repetitions today. SESSIONS counts only sessions reaching their target. There is no server sync or account-schema change. Existing legacy global Japa keys and old history are left intact; they are not silently assigned to a specific mantra because the legacy global count lacks reliable mantra ownership.

## Completion, artwork and founder voice

The default is “Japa complete” and “Your practice for this session is complete.” No Sanskrit phrase or traditional claim was invented. Completion recitation is optional and gated as described above.

Reveal progress is `clamp(completedGoalUnits / totalGoalUnits, 0, 1)`. A reviewed, versioned, matching static artwork may use opacity reveal. Otherwise a neutral geometric light is shown; it is not labelled as deity iconography. There is no image-generation call per tap, per session or in the component. Artwork is not downloaded/generated by the implementation task.

The backend's `manifest_schemas/mantra_experience_m3.schema.json` describes taxonomy, purpose mappings, artwork, completion recitation and versioned audio metadata. Audio includes voice identity, generation method, provider/model, synthetic flag, mantra ID, version, review statuses, reviewer/time, duration, normal/slow URLs and download/publication flags. Artwork includes identity, deity/mantra relationship, image/thumbnail URLs, artist/generation source, generation method, version and review attribution.

Future founder workflow: explicit recorded consent → clean reference recordings → approved model → candidate audio → Sanskrit pronunciation review → human approval → versioned artifact → controlled publication. Generating audio never sets verification. This task creates no voice model, no candidate voice audio and no paid-service calls.

Metadata contracts and frontend consumption are ready; additional production storage/delivery for taxonomy/artwork/audio artifacts requires a separately reviewed rollout. These new top-level metadata arrays are not columns in the captured production schema, and the current importer does not silently add columns. No migration was applied.

## Content pipeline and publication

Backend `scripts/prepare_mantra_m3_review.js` consumes the saved read-only production snapshot and existing discovery, legacy-review and approved-content files. It does not fetch religious text, generate content or write to Supabase. It preserves originals and writes separate M3 artifacts: canonical candidates, quality findings, review queues, summary and an eligible manifest. Exact ID/text/source duplicate relationships are reported for human resolution without deleting original records. Existing editorial merge dispositions remain attached separately; exact deduplication is not a claim of religious equivalence.

Snapshot findings: 29 active production records, all REVIEW_REQUIRED. 89 additional discovery candidates make 118 exact-distinct candidates. No usable text sources; no text-source-ready records; all 118 need text, meaning, practice, pronunciation and audio review. Zero detected corrupt records in the snapshot. **Zero eligible for safe publication now.** The numerical gap from 29 legacy rows is 79, but reaching 108 genuinely reviewed/eligible records requires 108 eligible records, not 79 unreviewed inserts.

The CLI importer and admin manifest route call the same publication gate before any write. An item requires explicit active=true, APPROVED publication, VERIFIED text, real text-source metadata and review attribution. Discovery-only evidence, absent text, malformed/corrupt sacred text and unsupported attribution are rejected. Other VERIFIED dimensions require their own sources; text approval does not promote them. Normalization preserves those independent dimensions. Legacy active production rows remain visible with their existing review labels; this task neither promotes nor deactivates them. The new gate controls imports; JSON files alone never make candidates visible.

Reports are detection/review aids, not source verification. The 29-row snapshot and parsed frontend display strings have zero detected encoding defects; Android font/rendering and stale-build issues are not excluded. No sacred text or meanings were repaired. Refer to the delivery report for exact tests, inventory, diff statistics and physical QA checklist.
