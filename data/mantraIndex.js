import { MANTRAS_V2 } from './mantraV2';

export const MANTRA_PAGE_SIZE = 24;
const uniq = values => [...new Set(values.filter(Boolean))].sort();
export const MANTRA_FILTERS = {
  deity: ['All', ...uniq(MANTRAS_V2.flatMap(item => item.deity_ids))],
  purpose: ['All', ...uniq(MANTRAS_V2.flatMap(item => item.purpose_ids))],
  contentType: ['All', ...uniq(MANTRAS_V2.map(item => item.content_type))],
};
export function searchMantras({ query = '', deity = 'All', purpose = 'All', contentType = 'All' } = {}) {
  const needle = query.trim().toLowerCase();
  return MANTRAS_V2.filter(item => item.is_active)
    .filter(item => deity === 'All' || item.deity_ids.includes(deity))
    .filter(item => purpose === 'All' || item.purpose_ids.includes(purpose))
    .filter(item => contentType === 'All' || item.content_type === contentType)
    .filter(item => !needle || item.search_text.includes(needle));
}
export const MANTRA_LIBRARY_STATUS = {
  migratedCount: MANTRAS_V2.length,
  verifiedCount: MANTRAS_V2.filter(item => item.verification_status === 'VERIFIED').length,
  targetCount: 108, source: 'local_v2_review_foundation', readyForVerifiedManifest: true,
};
