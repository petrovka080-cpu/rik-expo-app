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
type Ct126ForwardAnchorR1=Readonly<{catalogId:string;path:string;fileSha256:string;captureSha256:string;ids:readonly string[]}>;
/** Four exact already-published operation-only successors; no arbitrary ancestry. */
const CT126_CURRENT_FORWARD_ANCHORS_R1:Readonly<Record<string,Ct126ForwardAnchorR1>> = {
  "a4a71495-4922-5129-b09a-83cf4f5c3754": {
    "catalogId": "canonical-work:base:plaster_paint_interior_wall_putty_level_high_load",
    "path": "data/estimate-benchmarks/fixtures/ct126-current-high_load-retained-forward-lineage-r1.json",
    "fileSha256": "4794e81ff05d7320c2adf3e365debd81a24be294e192164f43aa2e6f15b65795",
    "captureSha256": "ca56ee6767594f8474db360da8fa6a8863cef643f463ef1a5b14b3c43f82b1fc",
    "ids": [
      "a4a71495-4922-5129-b09a-83cf4f5c3754",
      "761c8fc8-998d-5be5-9178-8611faaacd25",
      "4a3c7e87-dccb-5701-84cd-1d291b9887ed"
    ]
  },
  "1816865b-f987-5b65-9d74-98f291e30ba3": {
    "catalogId": "canonical-work:base:plaster_paint_interior_wall_putty_level_repair",
    "path": "data/estimate-benchmarks/fixtures/ct126-current-repair-retained-forward-lineage-r1.json",
    "fileSha256": "615c6922bcbbe9e19c44abf8423215bf9d7b793e3544d54452eb8cff9c0be3f7",
    "captureSha256": "cc7537091b0201e0796eee45379cc2a605a54184b4ecc3886a9334ebd7455092",
    "ids": [
      "1816865b-f987-5b65-9d74-98f291e30ba3",
      "2ede60c5-ddc9-5f2f-9b18-e2fe9de3e07b",
      "51cdf287-a7f8-59af-815d-fd934f8b0393"
    ]
  },
  "68a7c3dc-49ee-5974-81ef-3df6f23060e0": {
    "catalogId": "canonical-work:base:plaster_paint_interior_wall_putty_level_standard",
    "path": "data/estimate-benchmarks/fixtures/ct126-current-standard-retained-forward-lineage-r1.json",
    "fileSha256": "784834596a479d15cc3345831492996a952e3e8077e40e18be52dbcf683c4b29",
    "captureSha256": "d0376fc8d772e2fd8a83f1fc89771099a2a86fe7a774096af17de85ecdcea556",
    "ids": [
      "68a7c3dc-49ee-5974-81ef-3df6f23060e0",
      "68818363-fad0-5cd6-bbea-9c7941e977f9",
      "7ff78f8c-2873-53b8-859a-db8eb23f510a"
    ]
  },
  "5f8950ad-fbb7-54be-a73d-340487c4388f": {
    "catalogId": "canonical-work:base:plaster_paint_interior_wall_putty_level_technical_room",
    "path": "data/estimate-benchmarks/fixtures/ct126-current-technical_room-retained-forward-lineage-r1.json",
    "fileSha256": "3e2fd950ca45eb86b6b4532eb7a72f1969f08b450a6d4d8e0267812ec42c0067",
    "captureSha256": "e7d3f7a4142727042590fe154fa072029da65801894273b710ff977b1e86fafa",
    "ids": [
      "5f8950ad-fbb7-54be-a73d-340487c4388f",
      "822463d9-5b4f-5067-857c-048b96334ce1",
      "27c1fcfb-6baa-5e48-8fba-99299c9da0e8"
    ]
  }
};
export const isMasterRegisteredRetainedForwardDefinitionR1=(definition:Json):boolean=>definition.id===currentId||Object.hasOwn(CT126_CURRENT_FORWARD_ANCHORS_R1,String(definition.id));
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
 const ct126=CT126_CURRENT_FORWARD_ANCHORS_R1[String(capture.definition.id)];
 if(ct126)return ct126RegisteredForwardLineageR1(capture,capturedParentSha256,same,ct126);
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

/** Exact current headers, original singular provenance and both historical nodes
 * remain pinned. The existing normal/locked preflight reads these returned nodes. */
function ct126RegisteredForwardLineageR1(capture:Capture,capturedParentSha256:string,same:Same,anchor:Ct126ForwardAnchorR1):readonly Json[]|null{
 if(capture.definition.catalog_id!==anchor.catalogId||capturedParentSha256!==anchor.captureSha256)return null;
 const raw=readFileSync(resolve(process.cwd(),anchor.path));
 if(raw.length>1024*1024||createHash('sha256').update(raw).digest('hex')!==anchor.fileSha256)
  throw Error('MASTER_RETAINED_CT126_FORWARD_REGISTRATION_PREIMAGE_DRIFT');
 const r=JSON.parse(raw.toString('utf8'))as Json,nodes=r.chain as Json[];
 if(r.contract!=='master-exact-ct126-retained-operation-forward-lineage-registration/r1'
  ||r.catalogId!==anchor.catalogId||r.currentId!==capture.definition.id||r.captureSha256!==anchor.captureSha256
  ||!Array.isArray(nodes)||nodes.length!==3||!same(capture.definition,nodes[0]?.definition)||!same(capture.baseline,nodes[0]?.baseline))return null;
 const rows=(v:readonly Json[])=>[...v].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 if(!Array.isArray(r.normativeSources)||!Array.isArray(r.normativeLocators)
  ||!same(rows(capture.normativeSources),rows(r.normativeSources))||!same(rows(capture.normativeLocators),rows(r.normativeLocators)))return null;
 for(let i=0;i<3;i++){
  const d=nodes[i]?.definition,b=nodes[i]?.baseline,m=d?.source_metadata;
  if(d?.id!==anchor.ids[i]||d.catalog_id!==anchor.catalogId||d.definition_version!==6-i
   ||b?.definition_version_id!==d.id||b.catalog_id!==anchor.catalogId||m==null||Object.hasOwn(m,'retainedParentBindingContinuationV1'))return null;
  if(i<2&&(b.source_definition_version_id!==nodes[i+1].definition.id||b.supersedes_baseline_id!==nodes[i+1].baseline.id))return null;
 }
 const op=nodes[0].definition.source_metadata.operationCompositionSuccessorV1,original=nodes[1].definition.source_metadata.retainedParentBindingSuccessorV1;
 if(op?.contract!=='master-operation-composition-only/r1'||op.parentDefinitionId!==nodes[1].definition.id
  ||op.parentBaselineId!==nodes[1].baseline.id||op.quantitySourcesChanged!==false||op.capturedParentSha256!==r.operationForwardCaptureSha256
  ||original?.parentDefinitionId!==nodes[2].definition.id||original.parentBaselineId!==nodes[2].baseline.id
  ||original.capturedParentSha256!==r.originalRetainedCapture?.captureSha256
  ||!same(nodes[0].definition.source_metadata.retainedParentBindingSuccessorV1,original)
  ||Object.hasOwn(nodes[2].definition.source_metadata,'retainedParentBindingSuccessorV1'))return null;
 return nodes.slice(1).map(n=>JSON.parse(JSON.stringify(n))as Json);
}
