'use strict';

const VERIFICATION_STATUSES = new Set(['VERIFIED', 'REVIEW_REQUIRED', 'RESTRICTED']);
const PRACTICE_LEVELS = new Set(['GENERAL_DEVOTIONAL', 'SOURCE_SPECIFIC', 'TRADITION_SPECIFIC', 'INITIATION_GUIDANCE', 'RESTRICTED']);
const catalogById = new Map();
const PAGE_SIZE = 100; const MAX_CATALOG_PAGES = 100;
let fullRequestSequence = 0; let installedFullRequest = 0; let catalogGeneration = 0;

function array(value) { return Array.isArray(value) ? value.filter(Boolean) : []; }
function strings(value) { return array(value).filter(item => typeof item === 'string' && item.trim()); }
function text(value) { return typeof value === 'string' ? value.trim() : ''; }
const { hasReplacementCorruption } = require('./mantraQuality');
const normalizeSearch = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en-IN');
function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function status(value) { return VERIFICATION_STATUSES.has(value) ? value : 'UNVERIFIED'; }
function sources(value) { return array(value).filter(source => source && typeof source === 'object' && !Array.isArray(source)); }
function normalizeMantraRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = text(raw.id); const canonicalName = text(raw.canonical_name || raw.title);
  const sanskritText = text(raw.sanskrit_text);
  if (!id || !canonicalName || !sanskritText || raw.is_active === false) return null;
  const verificationStatus = status(raw.verification_status);
  const deityIds = strings(raw.deity_ids).length ? strings(raw.deity_ids) : [text(raw.deity)].filter(Boolean);
  const purposeIds = strings(raw.purpose_ids).length ? strings(raw.purpose_ids) : [text(raw.purpose)].filter(Boolean);
  const categoryIds = strings(raw.category_ids);
  const meanings = object(raw.meanings); const practice = object(raw.practice);
  const preparation = object(raw.preparation); const audioMetadata = object(raw.audio_metadata);
  const verification = object(raw.verification_dimensions);
  const value = {
    id, canonical_name: hasReplacementCorruption(canonicalName) ? 'Name under review' : canonicalName, alternate_names: strings(raw.alternate_names), names: object(raw.names),
    taxonomy_nodes: array(raw.taxonomy_nodes), reviewed_purpose_mappings: array(raw.reviewed_purpose_mappings),
    audio_artifacts: array(raw.audio_artifacts), artwork: object(raw.artwork), completion_recitation: object(raw.completion_recitation),
    language: text(raw.language) || null, primary_classification: text(raw.primary_classification) || null,
    classifications: array(raw.classifications),
    content_type: text(raw.mantra_content_type || raw.content_type) || 'MANTRA', deity_ids: deityIds,
    purpose_ids: purposeIds, category_ids: categoryIds, sanskrit_text: sanskritText,
    sanskrit_text_corrupted: hasReplacementCorruption(sanskritText),
    transliteration_iast: text(raw.transliteration_iast) || null,
    transliteration_simple: text(raw.transliteration_simple || raw.transliteration) || null,
    meanings: { hi: text(meanings.hi || raw.meaning_hi) || null, en: text(meanings.en || raw.meaning_en) || null },
    tradition: text(raw.tradition) || null, sampradaya: text(raw.sampradaya) || null,
    traditional_context: text(raw.traditional_context) || null,
    practice_level: PRACTICE_LEVELS.has(raw.practice_level) ? raw.practice_level : 'GENERAL_DEVOTIONAL', instructions_scope: text(raw.instructions_scope) || null,
    requires_initiation: typeof raw.requires_initiation === 'boolean' ? raw.requires_initiation : null,
    requires_guru_guidance: typeof raw.requires_guru_guidance === 'boolean' ? raw.requires_guru_guidance : null,
    advanced_practice_available: raw.advanced_practice_available === true,
    restriction_note: text(raw.restriction_note) || null, preparation, practice, posture: object(raw.posture),
    source_references: sources(raw.source_references),
    provenance: { text: sources(raw.text_sources), meaning: sources(raw.meaning_sources), practice: sources(raw.practice_sources),
      pronunciation: sources(raw.pronunciation_sources), audio: sources(raw.audio_sources) },
    verification_status: verificationStatus, audio: { ...audioMetadata,
      learning_slow_url: text(audioMetadata.learning_slow_url) || null,
      normal_recitation_url: text(audioMetadata.normal_recitation_url || audioMetadata.normal_url || raw.audio_url) || null,
      normal_url: text(audioMetadata.normal_recitation_url || audioMetadata.normal_url || raw.audio_url) || null,
      word_by_word_url: text(audioMetadata.word_by_word_url) || null, voice_identity: text(audioMetadata.voice_identity) || null,
      synthetic: typeof audioMetadata.synthetic === 'boolean' ? audioMetadata.synthetic : null,
      human_reviewed: audioMetadata.human_reviewed === true, pronunciation_verified: audioMetadata.pronunciation_verified === true,
      version: text(audioMetadata.version) || null, downloadable: raw.audio_downloadable === true || audioMetadata.downloadable === true },
    verification: { text: status(raw.text_verification || verification.text), meaning: status(raw.meaning_verification || verification.meaning),
      practice: status(raw.practice_verification || verification.practice), pronunciation: status(raw.pronunciation_verification || verification.pronunciation),
      audio: status(raw.audio_verification || verification.audio) },
    tags: array(raw.tags_v2 || raw.tags), is_active: true,
  };
  value.search_text = normalizeSearch([canonicalName, sanskritText, value.transliteration_simple, value.transliteration_iast, ...value.alternate_names, value.meanings.hi, value.meanings.en,
    ...deityIds, ...purposeIds, ...categoryIds, ...value.tags].filter(Boolean).join(' '));
  return value;
}

function normalizeMantraList(rows, { cache = true } = {}) {
  const seen = new Set(); const values = [];
  for (const row of array(rows)) {
    const value = normalizeMantraRecord(row);
    if (!value || seen.has(value.id)) continue;
    seen.add(value.id); values.push(value); if (cache) catalogById.set(value.id, value);
  }
  const corruptedIds = values.filter(value => value.sanskrit_text_corrupted).map(value => value.id);
  if (corruptedIds.length) console.warn('[MantraCatalog] Sacred text corruption requires review:', corruptedIds.join(', '));
  return values;
}

function filterMantras(rows, { query = '', deity = 'All', purpose = 'All', contentType = 'All' } = {}) {
  const needle = normalizeSearch(query);
  return array(rows).filter(item => deity === 'All' || item.deity_ids.includes(deity))
    .filter(item => purpose === 'All' || item.purpose_ids.includes(purpose))
    .filter(item => contentType === 'All' || item.content_type === contentType)
    .filter(item => !needle || item.search_text.includes(needle));
}

function filtersFor(rows) {
  const uniq = values => [...new Set(values.filter(Boolean))].sort();
  return { deity: ['All', ...uniq(array(rows).flatMap(item => item.deity_ids))],
    purpose: ['All', ...uniq(array(rows).flatMap(item => item.purpose_ids))],
    contentType: ['All', ...uniq(array(rows).map(item => item.content_type))] };
}

async function requestCatalog(backendFetch, path) {
  const response = await backendFetch(path, { timeout: 20000 });
  const json = await response.json();
  if (!response.ok || json?.success !== true || !Array.isArray(json.mantras)) {
    const error = new Error(json?.error || 'MANTRA_CATALOG_UNAVAILABLE'); error.code = error.message; throw error;
  }
  return { rows: json.mantras, hasMore: json.has_more === true };
}

async function fetchMantraCatalog(backendFetch) {
  const requestId = ++fullRequestSequence; const raw = [];
  try {
    for (let page = 1; page <= MAX_CATALOG_PAGES; page += 1) {
      const result = await requestCatalog(backendFetch, `/mantras?page=${page}&limit=${PAGE_SIZE}`);
      raw.push(...result.rows);
      if (!result.hasMore) break;
      if (page === MAX_CATALOG_PAGES) {
        const error = new Error('MANTRA_CATALOG_PAGE_LIMIT'); error.code = error.message; throw error;
      }
    }
  } catch (error) {
    if (requestId < installedFullRequest) return [...catalogById.values()];
    throw error;
  }
  const rows = normalizeMantraList(raw, { cache: false });
  if (requestId > installedFullRequest) {
    catalogById.clear(); rows.forEach(row => catalogById.set(row.id, row));
    installedFullRequest = requestId; catalogGeneration += 1;
    return rows;
  }
  return [...catalogById.values()];
}
async function fetchMantraById(backendFetch, id) {
  const key = text(id); if (!key) return null;
  if (catalogById.has(key)) return catalogById.get(key);
  const generationAtStart = catalogGeneration;
  const result = await requestCatalog(backendFetch, `/mantras?id=${encodeURIComponent(key)}&limit=1`);
  const rows = normalizeMantraList(result.rows, { cache: false }); const record = rows.find(row => row.id === key) || null;
  if (generationAtStart !== catalogGeneration) return null;
  if (record) catalogById.set(record.id, record);
  return record;
}

function verificationLabel(status) {
  return status === 'VERIFIED' ? 'Verified' : status === 'RESTRICTED' ? 'Restricted'
    : status === 'REVIEW_REQUIRED' ? 'Content review pending' : 'Verification pending';
}

module.exports = { normalizeMantraRecord, normalizeMantraList, filterMantras, filtersFor, fetchMantraCatalog,
  fetchMantraById, verificationLabel, _catalogById: catalogById, _test: { PAGE_SIZE, MAX_CATALOG_PAGES } };
