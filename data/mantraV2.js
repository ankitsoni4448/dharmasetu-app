import { MANTRAS } from './mantras';

export const MANTRA_SCHEMA_VERSION = 2;
export const MANTRA_CONTENT_VERSION = 'dharmasetu-mantra-content-v2-review';
export const CONTENT_TYPES = ['MANTRA', 'NAMA_JAPA', 'VEDIC_MANTRA', 'SHLOKA', 'PRAYER', 'STOTRA'];
export const VERIFICATION_STATUSES = ['VERIFIED', 'REVIEW_REQUIRED', 'RESTRICTED'];
export const PRACTICE_LEVELS = ['GENERAL_DEVOTIONAL', 'TRADITION_SPECIFIC', 'INITIATION_GUIDANCE'];

const TYPE_OVERRIDES = { gayatri: 'VEDIC_MANTRA', mahamrityunjaya: 'VEDIC_MANTRA', om_namah_shivay: 'NAMA_JAPA', shiva_panchakshara: 'NAMA_JAPA', hare_krishna: 'NAMA_JAPA', vakratunda: 'SHLOKA', asato_ma: 'PRAYER', shanti_mantra: 'PRAYER' };
const NAME_OVERRIDES = { vishnu_sahasranama_seed: 'Om Vishnave Namah', bajrang_baan_seed: 'Om Hanumate Namah' };
const TRADITION_REVIEW_IDS = new Set(['krishna_beej','hanuman_beej','ganesh_beej','saraswati_beej','lakshmi_beej','durga_moola','kali_mantra','ram_moola','shiv_beej','baglamukhi_seed']);

export function migrateLegacyMantra(mantra) {
  const traditionSpecific = TRADITION_REVIEW_IDS.has(mantra.id);
  return {
    id: mantra.id, schema_version: MANTRA_SCHEMA_VERSION, content_version: MANTRA_CONTENT_VERSION,
    canonical_name: NAME_OVERRIDES[mantra.id] || mantra.title,
    names: { sa: null, hi: null, en: NAME_OVERRIDES[mantra.id] || mantra.title },
    content_type: TYPE_OVERRIDES[mantra.id] || 'MANTRA', deity_ids: mantra.deity ? [mantra.deity] : [],
    category_ids: mantra.category ? [mantra.category] : [], purpose_ids: ['UNSPECIFIED'], sanskrit_text: mantra.text,
    transliteration_iast: null, transliteration_simple: mantra.transliteration || null, word_segments: [],
    meanings: { hi: mantra.meaningHi || null, en: mantra.meaningEn || null }, source_references: [],
    tradition: null, sampradaya: null,
    practice_level: traditionSpecific ? 'TRADITION_SPECIFIC' : 'GENERAL_DEVOTIONAL',
    instructions_scope: traditionSpecific ? 'Varies by tradition; qualified review required.' : null,
    requires_initiation: null,
    restriction_note: traditionSpecific ? 'Practice guidance is withheld pending tradition-specific review.' : null,
    verification_status: 'REVIEW_REQUIRED', reviewed_by: null, reviewed_at: null,
    practice: { recommended_counts:null, mala:null, time:null, direction:null, asana:null, clothing:null, place:null, cleanliness:null, preparation:null, sankalpa:null, dhyana:null, viniyoga:null, nyasa:null, opening:null, japa:null, completion:null, precautions:null },
    audio: { normal_url:null, slow_url:null, duration:null, reciter:null, pronunciation_reviewed_by:null, downloadable:false },
    tags: [mantra.deity, mantra.category].filter(Boolean),
    search_text: [mantra.title, mantra.deity, mantra.category, mantra.text, mantra.transliteration, mantra.meaningHi, mantra.meaningEn].filter(Boolean).join(' ').toLowerCase(),
    is_active: true,
    legacy_review: { benefits:mantra.benefits || [], recommended_repetitions:mantra.malas ?? null, time:mantra.bestTime || null, direction:mantra.direction || null, asana:mantra.posture || null },
  };
}

export const MANTRAS_V2 = MANTRAS.map(migrateLegacyMantra);
export function getMantraById(id) { return MANTRAS_V2.find(item => item.id === id) || null; }
