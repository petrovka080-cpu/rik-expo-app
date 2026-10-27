/** Finite registration of an already published composition-only forwarding chain. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
type Json=Record<string,any>;
type Capture=Readonly<{definition:Json;baseline:Json;normativeSources:readonly Json[];normativeLocators:readonly Json[]}>;
type Same=(a:unknown,b:unknown)=>boolean;
const currentId='55fd4875-3f69-5abe-8c41-9af42c921fc3';
const catalogId='canonical-work:base:insulation_interior_facade_install_standard';
const path='data/estimate-benchmarks/fixtures/master37-facade-retained-forward-lineage-utc-r5.json';
const fileSha256='83e4270b78eb542cc302680c4275a8f3799cd2531a64132503fe91ed4c64b75d';
const ids=[currentId,'cc7371f4-85d2-502d-8537-369b9cbe2ee4','033f7836-f090-5a35-9b77-1c4e39c80b30','b81c1af8-53a6-5be6-86b9-3d2396734e99'];
export const isMasterRegisteredRetainedForwardDefinitionR1=(definition:Json):boolean=>definition.id===currentId;
function registration():Json{
 // A bounded parse keeps large frozen baseline JSON out of inferred TS types.
 const raw=readFileSync(resolve(process.cwd(),path));
 if(raw.length>1024*1024||createHash('sha256').update(raw).digest('hex')!==fileSha256)
  throw Error('MASTER_RETAINED_FORWARD_REGISTRATION_PREIMAGE_DRIFT');
 return JSON.parse(raw.toString('utf8'))as Json;
}
/** No caller-defined nodes, aliases, trust flags or arbitrary ancestry traversal. */
export function masterRegisteredRetainedForwardLineageR1(
 capture:Capture,capturedParentSha256:string,same:Same,
):readonly Json[]|null{
 if(capture.definition.id!==currentId||capture.definition.catalog_id!==catalogId)return null;
 const r=registration(),nodes=r.chain as Json[];
 if(r.contract!=='master-exact-retained-forward-lineage-registration/r1'||r.catalogId!==catalogId
  ||capturedParentSha256!==r.captureSha256||!Array.isArray(nodes)||nodes.length!==4)return null;
 if(!same(capture.definition,nodes[0].definition)||!same(capture.baseline,nodes[0].baseline))return null;
 const rows=(v:readonly Json[])=>[...v].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 if(!same(rows(capture.normativeSources),rows(r.normativeSources))||!same(rows(capture.normativeLocators),rows(r.normativeLocators)))return null;
 for(let i=0;i<4;i++){
  const d=nodes[i]?.definition,b=nodes[i]?.baseline,m=d?.source_metadata;
  if(d?.id!==ids[i]||d.catalog_id!==catalogId||d.definition_version!==7-i||b?.definition_version_id!==d.id
   ||b.catalog_id!==catalogId||m==null||Object.hasOwn(m,'retainedParentBindingContinuationV1'))return null;
  if(i<3){
   const parent=nodes[i+1];
   if(b.source_definition_version_id!==parent.definition.id||b.supersedes_baseline_id!==parent.baseline.id)return null;
  }
  if(i<2&&(m.compositionOnlySuccessor!==true||m.newNumericalNormRegistered!==false
   ||m.predecessorDefinitionId!==nodes[i+1].definition.id||m.predecessorBaselineLeafId!==nodes[i+1].baseline.id))return null;
 }
 const original=nodes[2].definition.source_metadata.retainedParentBindingSuccessorV1;
 if(original?.parentDefinitionId!==nodes[3].definition.id||original.parentBaselineId!==nodes[3].baseline.id
  ||original.capturedParentSha256!==r.originalRetainedCapture.captureSha256
  ||Object.hasOwn(nodes[3].definition.source_metadata,'retainedParentBindingSuccessorV1'))return null;
 if(!nodes.slice(0,3).every(n=>same(n.definition.source_metadata.retainedParentBindingSuccessorV1,original)))return null;
 // The full current capture hash binds all formula/resource/source/binding rows.
 // Historical rows are separately required at normal and locked preflight.
 return nodes.slice(1).map(n=>JSON.parse(JSON.stringify(n))as Json);
}
