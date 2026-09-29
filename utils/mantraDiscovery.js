'use strict';
const {hasReplacementCorruption} = require('./mantraQuality');
const reviewed = value => value?.review_status==='APPROVED' && value.reviewed_by && value.reviewed_at && value.source;
// These are navigation intentions, not religious recommendations or promised outcomes.
const INTENTIONS = ['Peace / calm','Focus / concentration','Study / learning','Courage','Confidence','Devotion','Gratitude','Spiritual discipline','Protection','Strength','Morning practice','Evening practice','Before study','Before important work','Spiritual support for a difficult moment','Rest / settling the mind'];
function taxonomyFor(records, kind) {
  const nodes=new Map();
  records.forEach(record=>(record.taxonomy_nodes || []).filter(n=>n && n.kind===kind && reviewed(n) && typeof n.id==='string' && typeof n.label==='string' && (n.parent_id==null||typeof n.parent_id==='string') && !hasReplacementCorruption(n.label)).forEach(n=>nodes.set(n.id,n)));
  return [...nodes.values()].sort((a,b)=>a.label.localeCompare(b.label));
}
function descendants(nodes, id) {
  const found=new Set([id]);let changed=true;
  while(changed){changed=false;nodes.forEach(n=>{if(found.has(n.parent_id)&&!found.has(n.id)){found.add(n.id);changed=true;}});}
  return found;
}
function byDeity(records,id,nodes) {const ids=descendants(nodes,id);return records.filter(r=>r.deity_ids.some(d=>ids.has(d)));}
function forIntention(records,intention) {
  return records.filter(r=>(r.reviewed_purpose_mappings || []).some(m=>m && m.intention===intention && reviewed(m) && r.purpose_ids.includes(m.purpose_id)));
}
module.exports={INTENTIONS,taxonomyFor,descendants,byDeity,forIntention};
