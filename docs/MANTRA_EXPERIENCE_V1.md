# Mantra experience M4

Implementation and automated verification only. Physical Android QA remains required.

## Consumer experience

The library reads the paginated backend catalog and supports search, favorites, recent items, deity, purpose, content type, and reviewed intention mappings. Consumer cards omit editorial pipeline labels. Detail shows sacred text unless corruption detection blocks presentation, shows meaning and traditional context only when independently verified with meaning provenance, and shows mantra-specific practice only when verified with practice provenance. General Japa preparation remains a short, natural list in Detail. Pronunciation learning lives in Japa.

## Japa and mala

Sessions offer either repetition targets (11, 21, 51, 108, or a custom whole number) or mala-round targets (1, 3, 5, or 11). A supported mala has 108 counted beads plus a separate, uncounted meru. Multi-mala practice continues automatically at each 108 boundary: 11 malas is 1,188 repetitions. The visual renders the current 108-bead round, its separate meru and tassel, the current bead, and overall session progress.

One accepted manual tap counts one repetition. Guided mode counts only a complete playback callback. Pause, stop, replay, error, disposal, app background, and stale callbacks cannot credit a repetition. Existing M3 sessions migrate to repetition mode without changing their target or count.

## Audio contract

The source hierarchy is FOUNDER_RECORDED, VERIFIED_HUMAN_RECITATION, FOUNDER_AI_GENERATED, SYNTHETIC_PREVIEW, and UNVERIFIED. Only the first three can power counted Guided Japa, and only after publication approval plus independent pronunciation/audio verification, reviewer identity, review time, version, duration, HTTPS delivery URL, and truthful voice metadata. Founder AI audio also requires consent and voice-model approval references. Preview and unverified audio never count practice.

No qualifying production audio artifact was found, so Guided Japa remains unavailable while manual Japa works.

## Content safety and scale

The backend publication gate requires approved text, edition-level sources, review attribution, explicit reusable rights, and uncorrupted sacred text. Verification for meaning, practice, pronunciation, and audio remains independent. The content taxonomy supports Mantra, Nama Japa, Vedic Mantra, Shloka, Prayer/Prarthana, Stotra, Ashtakam, Kavacha, Chalisa, Namavali, Sahasranama, Bija, Gayatri, Dhyana, and Shanti Mantra.

The read-only production snapshot contains 29 active records, all with REVIEW_REQUIRED status. The discovery set contains 89 reference-only links, for 118 distinct candidates total. It contains no project-owned source PDFs or edition-level candidate text, and establishes no reusable publication rights. Consequently zero candidates are eligible for import and no production write was attempted.

Generated review artifacts live under `data/mantra/m3` and `data/mantra/m4` in the backend. They are review aids and do not approve content.
