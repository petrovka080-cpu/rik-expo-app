/** Exact composition-forward registration and unchanged direct continuation guards. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {masterRetainParentBindingsOptInR1 as admit,masterRetainedParentCaptureSha256R1 as captureSha,
 prepareMasterRetainedBindingRepresentativeR1 as prepare,assertMasterRetainedBindingSnapshotR1 as snapshot,
 assertMasterRetainedBindingPreflightUnchangedR1 as unchanged,readMasterRetainedBindingPreconditionsR1 as read} from './masterSingleDefinitionRetainParentBindingsR1';
type Json=Record<string,any>;
const copy=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(copy(v)))).digest('hex');
const file=(p:string)=>readFileSync(resolve(process.cwd(),p));
const load=(p:string):Json=>JSON.parse(file(p).toString('utf8'))as Json;
const registrationPath='data/estimate-benchmarks/fixtures/master37-facade-retained-forward-lineage-utc-r5.json';
const registration=load(registrationPath);
// Parse existing large frozen snapshots through a bounded generic type boundary.
const facade=load('data/estimate-benchmarks/fixtures/facade-mw120-current-parent-utc-r5.json').capture;
const floor=load('data/estimate-benchmarks/fixtures/floor-sand-retained-continuation-parent-r1.json').capture;
function setup(c:Json=facade){
 const captured=copy(c),meta=captured.definition.source_metadata;
 const opt:any={capturedParent:captured,capturedParentSha256:captureSha(captured as Parameters<typeof captureSha>[0]),newParameterSources:{},
  successorProvenanceContinuation:{contract:'master-retained-binding-continuation/r1',capturedSourceMetadata:copy(meta),
   capturedSourceMetadataSha256:hash(meta),capturedPreviousSuccessorSha256:hash(meta.retainedParentBindingSuccessorV1)},
  capturedSourcePreimage:{sourceKey:'TEST_ONLY_FINITE_FORWARD_SOURCE',expected:null}};
 const input:any={config:{stopCode:'FINITE_FORWARD_TEST',catalogId:captured.definition.catalog_id,parentReleaseId:captured.definition.release_id,
  binding:{retainParentBindings:opt}},newSource:{id:'10000000-0000-5000-8000-000000000001',source_key:'TEST_ONLY_FINITE_FORWARD_SOURCE',
  title_ru:'TEST ONLY source',authority:'TEST ONLY',official_url:'https://minstroy.gov.kg/',artifact_sha256:'e'.repeat(64),effective_from:null,effective_to:null,metadata:{testOnly:true}},
  newLocators:[{id:'10000000-0000-5000-8000-000000000002',source_id:'10000000-0000-5000-8000-000000000001',locator_key:'TEST_ONLY_FORWARD_LOCATOR',locator:{testOnly:true},excerpt_sha256:'a'.repeat(64)}]};
 const observed:any={membership:[{release_id:input.config.parentReleaseId,catalog_id:input.config.catalogId,definition_version_id:captured.definition.id,
  approved_template_baseline_id:captured.baseline.id,definition_hash:captured.definition.definition_sha256}],capture:copy(captured),newSources:[],newLocators:[],
  ...(captured.definition.id===registration.chain[0].definition.id?{retainedForwardLineage:copy(registration.chain.slice(1))}:{})};
 return{input,opt,observed};
}
function refresh(s:ReturnType<typeof setup>){const m=s.opt.capturedParent.definition.source_metadata;
 s.opt.capturedParentSha256=captureSha(s.opt.capturedParent);
 s.opt.successorProvenanceContinuation={contract:'master-retained-binding-continuation/r1',capturedSourceMetadata:copy(m),
  capturedSourceMetadataSha256:hash(m),capturedPreviousSuccessorSha256:hash(m.retainedParentBindingSuccessorV1)};
}
function reader(s:ReturnType<typeof setup>,change?:(table:string,id:unknown,rows:Json[])=>Json[]){
 const calls:Array<{sql:string;values:unknown[]}>=[];
 const client:any={query:async(sql:string,values:unknown[])=>{
  calls.push({sql,values});if(sql.includes('octet_length(source_metadata::text)'))return{rows:[{matches:true}]};
  const c=s.opt.capturedParent;let rows:Json[]=[];const table=sql.match(/from public\.(\w+)/)?.[1]??'';
  if(table==='estimate_cumulative_manifest_entry')rows=copy(s.observed.membership);
  else if(table==='estimate_definition_version')rows=values[0]===c.definition.id?[copy(c.definition)]:copy(registration.chain.filter((n:Json)=>n.definition.id===values[0]).map((n:Json)=>n.definition));
  else if(table==='estimate_approved_template_baseline')rows=values[0]===c.baseline.id?[copy(c.baseline)]:copy(registration.chain.filter((n:Json)=>n.baseline.id===values[0]).map((n:Json)=>n.baseline));
  else if(table==='estimate_parameter_definition')rows=copy(c.parameters);
  else if(table==='estimate_formula_graph')rows=copy(c.formulas);
  else if(table==='estimate_resource_spec')rows=copy(c.resources);
  else if(table==='estimate_work_normative_binding')rows=copy(c.bindings);
  else if(table==='estimate_normative_locator')rows=sql.includes('source_id=$2')?[]:copy(c.normativeLocators);
  else if(table==='estimate_normative_source')rows=sql.includes('id=$1 or source_key=$2')?[]:copy(c.normativeSources);
  else throw Error('UNEXPECTED_TEST_QUERY:'+sql);
  if(change)rows=change(table,values[0],rows);
  return{rows:rows.map(row=>({raw:JSON.stringify(row)}))};
 }};return{client,calls};
}
test('independent fresh/current/source/preimage pins bind the literal four-node registration',()=>{
 expect(createHash('sha256').update(file(registrationPath)).digest('hex')).toBe('83e4270b78eb542cc302680c4275a8f3799cd2531a64132503fe91ed4c64b75d');
 expect(captureSha(facade)).toBe('1d7e958478ae13bf91e2c0a2e2f9a94caf9b5026ea730f3b07d6495992cda6b4');
 const oldRegistration=load('data/estimate-benchmarks/fixtures/master37-facade-retained-forward-lineage-r1.json'),oldFacade=load('data/estimate-benchmarks/fixtures/facade-mw120-current-parent-r1.json').capture;
 expect(createHash('sha256').update(file('data/estimate-benchmarks/fixtures/master37-facade-retained-forward-lineage-r1.json')).digest('hex')).toBe('263d6d804000cfb47ba8b580fc0d06e6102996417c6ce260b76013c30a89d763');
 expect(captureSha(oldFacade)).toBe('30c23f293304ac4c13034413b6897de3bbfd81531596cc1dd9b5202191f70edc');
 expect(registration.originalRetainedCapture).toEqual(oldRegistration.originalRetainedCapture);
 expect(registration.chain.map((n:Json)=>n.definition.source_metadata)).toEqual(oldRegistration.chain.map((n:Json)=>n.definition.source_metadata));
 expect(registration.chain.map((n:Json)=>n.definition.definition_version)).toEqual([7,6,5,4]);
 expect(registration.chain[0]).toEqual({definition:facade.definition,baseline:facade.baseline});
 const original=load(registration.originalRetainedCapture.path);
 expect(createHash('sha256').update(file(registration.originalRetainedCapture.path)).digest('hex')).toBe(registration.originalRetainedCapture.fileSha256);
 expect(captureSha(original.capturedParent)).toBe('28f9158004df154f8f545ed4719b82159e8fff58e968d8f94787906c389b9fb7');
 expect(original.capturedParent.definition.id).toBe(registration.chain[3].definition.id);
 expect(original.capturedParent.baseline.id).toBe(registration.chain[3].baseline.id);
});
test('exact v7 continuation admits forwarding without mutating old singular provenance',()=>{
 const s=setup(),before=copy(s);expect(s.opt.capturedParent.baseline.source_definition_version_id).not.toBe(s.opt.capturedParent.definition.source_metadata.retainedParentBindingSuccessorV1.parentDefinitionId);
 expect(()=>admit(s.input)).not.toThrow();snapshot(s.input,s.observed);unchanged(s.input,s.observed,copy(s.observed));expect(s).toEqual(before);
});
test('ordinary representative adds the standard continuation slot and preserves original v5→v4 slot and quantities',()=>{
 const s=setup(),c=s.opt.capturedParent,info=c.resources.find((r:Json)=>r.resource_graph?.costTreatment==='INFORMATIONAL_SCOPE');expect(info).toBeDefined();
 const next:any={parameters:copy(c.parameters),formulas:copy(c.formulas),resources:[...copy(c.resources),{...copy(info),id:'TEST_ONLY_NEW_RESOURCE',row_id:'TEST_ONLY_NEW_INFO_ROW',ordinal:1000}],
  newBindings:[{row_id:'TEST_ONLY_NEW_INFO_ROW',locator_id:s.input.newLocators[0].id,applicability:{testOnly:true}}],
  successorProvenance:{contract:'TEST_ONLY_FINITE_FORWARD_CHILD',parentDefinitionId:c.definition.id,parentBaselineId:c.baseline.id,capturedParentSha256:s.opt.capturedParentSha256},
  lifecycleMetadata:{contract:'TEST_ONLY_CHILD',masterSha256:'b'.repeat(64),sourceFingerprint:'c'.repeat(64)}};
 const before=copy({s,next}),r=prepare(s.input,next);expect({s,next}).toEqual(before);
 expect(r.sourceMetadata.retainedParentBindingSuccessorV1).toEqual(c.definition.source_metadata.retainedParentBindingSuccessorV1);
 expect(r.sourceMetadata.retainedParentBindingContinuationV1.previousSourceMetadata).toEqual(c.definition.source_metadata);
 expect(r.normativeSourceIds).toEqual(c.baseline.normative_source_ids);expect(r.bindings).toHaveLength(c.bindings.length+1);
 expect(r.sourceMetadata).not.toHaveProperty('manualQuantityMigration');expect(r.sourceMetadata).not.toHaveProperty('roofStageRestorationV6');
});
test('full capture and historical row comparison remain independent of query ordering',()=>{
 const s=setup();for(const key of ['parameters','formulas','resources','bindings','normativeSources','normativeLocators'])s.opt.capturedParent[key].reverse();
 s.observed.retainedForwardLineage.reverse();expect(()=>admit(s.input)).not.toThrow();snapshot(s.input,s.observed);
});
const captureMutations:Array<[string,(c:Json)=>void]>=[
 ['current version',c=>c.definition.definition_version=8],['current definition SHA',c=>c.definition.definition_sha256='0'.repeat(64)],
 ['baseline previous definition',c=>c.baseline.source_definition_version_id=registration.chain[2].definition.id],
 ['baseline previous baseline',c=>c.baseline.supersedes_baseline_id=registration.chain[2].baseline.id],
 ['forged direct shortcut',c=>{c.baseline.source_definition_version_id=registration.chain[3].definition.id;c.baseline.supersedes_baseline_id=registration.chain[3].baseline.id;}],
 ['composition predecessor metadata',c=>c.definition.source_metadata.predecessorDefinitionId=registration.chain[3].definition.id],
 ['old singular source slot',c=>c.definition.source_metadata.retainedParentBindingSuccessorV1.parentDefinitionId=registration.chain[1].definition.id],
 ['old original preimage',c=>c.definition.source_metadata.retainedParentBindingSuccessorV1.capturedParentSha256='0'.repeat(64)],
 ['old source artifact',c=>c.normativeSources[0].artifact_sha256='0'.repeat(64)],
 ['old source URL',c=>c.normativeSources[0].official_url='https://invalid.example/'],
 ['old locator',c=>c.normativeLocators[0].excerpt_sha256='0'.repeat(64)],
 ['old formula',c=>c.formulas[0].expression_source='999'],['old resource unit',c=>c.resources[0].unit_id='t'],
 ['old baseline input',c=>c.baseline.input_values.area_m2=999],
 ['foreign catalog',c=>{c.definition.catalog_id+=':foreign';c.baseline.catalog_id=c.definition.catalog_id;}],
 ['unregistered descendant',c=>{c.definition.id='10000000-0000-5000-8000-000000000009';c.baseline.definition_version_id=c.definition.id;for(const k of ['parameters','formulas','resources','bindings'])for(const row of c[k])row.definition_version_id=c.definition.id;}],
];
test.each(captureMutations)('self-rehashed %s cannot create a registered forwarding edge',(_name,change)=>{
 const s=setup();change(s.opt.capturedParent);refresh(s);if(_name==='foreign catalog')s.input.config.catalogId=s.opt.capturedParent.definition.catalog_id;
 expect(()=>admit(s.input)).toThrow('RETAIN_');
});
test.each(['missing','empty','duplicate','foreign','definition hash','definition version','source metadata','baseline payload','baseline source','baseline predecessor','timestamp'])('historical snapshot %s fails before writes',kind=>{
 const s=setup(),a=copy(s.observed),nodes=a.retainedForwardLineage;
 if(kind==='missing')delete a.retainedForwardLineage;if(kind==='empty')a.retainedForwardLineage=[];
 if(kind==='duplicate')nodes[1]=copy(nodes[0]);if(kind==='foreign')nodes[1].definition.id='10000000-0000-5000-8000-000000000099';
 if(kind==='definition hash')nodes[0].definition.definition_sha256='0'.repeat(64);if(kind==='definition version')nodes[0].definition.definition_version=99;
 if(kind==='source metadata')nodes[1].definition.source_metadata.retainedParentBindingSuccessorV1.sourceId+=':foreign';
 if(kind==='baseline payload')nodes[0].baseline.input_values.area_m2=999;
 if(kind==='baseline source')nodes[0].baseline.source_definition_version_id=nodes[2].definition.id;
 if(kind==='baseline predecessor')nodes[0].baseline.supersedes_baseline_id=nodes[2].baseline.id;
 if(kind==='timestamp')nodes[0].definition.created_at='2026-10-20T00:00:00.000001+05:00';
 expect(()=>snapshot(s.input,a)).toThrow('CONTINUATION_REGISTERED_FORWARD_LINEAGE_DRIFT');
});
test('normal and locked raw reads query exactly three fixed historical definition/baseline pairs',async()=>{
 const s=setup(),r=reader(s),a=await read(r.client,s.input),b=await read(r.client,s.input);unchanged(s.input,a,b);
 const ids=registration.chain.slice(1).map((n:Json)=>n.definition.id);
 const reads=r.calls.filter(q=>q.sql.includes('from public.estimate_definition_version')&&!q.sql.includes('octet_length')&&ids.includes(q.values[0]));
 expect(reads.map(q=>q.values[0])).toEqual([...ids,...ids]);expect(r.calls.every(q=>!/^\s*(insert|update|delete|alter|create)\b/i.test(q.sql))).toBe(true);
});
test('a missing fixed historical DB row cannot pass normal read',async()=>{
 const s=setup(),r=reader(s,(table,id,rows)=>table==='estimate_definition_version'&&id===registration.chain[2].definition.id?[]:rows);
 await expect(read(r.client,s.input)).rejects.toThrow('CONTINUATION_REGISTERED_FORWARD_NODE_MISSING');
});
test('a foreign historical DB row cannot pass normal read',async()=>{
 const s=setup(),r=reader(s,(table,id,rows)=>table==='estimate_approved_template_baseline'&&id===registration.chain[1].baseline.id?[{...rows[0],catalog_id:'FOREIGN'}]:rows);
 await expect(read(r.client,s.input)).rejects.toThrow('CONTINUATION_REGISTERED_FORWARD_LINEAGE_DRIFT');
});
test('old direct FLOOR chain keeps original opt-in, snapshot and read path without historical queries',async()=>{
 const s=setup(floor),r=reader(s);expect(()=>admit(s.input)).not.toThrow();expect(s.observed).not.toHaveProperty('retainedForwardLineage');
 snapshot(s.input,s.observed);const result=await read(r.client,s.input);expect(result).not.toHaveProperty('retainedForwardLineage');
 expect(r.calls.filter(q=>q.sql.includes('from public.estimate_definition_version')&&!q.sql.includes('octet_length')).map(q=>q.values[0])).toEqual([floor.definition.id]);
});
test('old direct drift, malformed continuation, existing continuation and new-source collision still fail',()=>{
 const s=setup(floor);s.opt.capturedParent.baseline.source_definition_version_id='FOREIGN';refresh(s);expect(()=>admit(s.input)).toThrow('CONTINUATION_OLD_SOURCE_LINEAGE_DRIFT');
 const a=setup();a.opt.successorProvenanceContinuation.capturedPreviousSuccessorSha256='0'.repeat(64);expect(()=>admit(a.input)).toThrow('CONTINUATION_PREVIOUS_SUCCESSOR_DRIFT');
 const b=setup();b.opt.capturedParent.definition.source_metadata.retainedParentBindingContinuationV1={};refresh(b);expect(()=>admit(b.input)).toThrow('CONTINUATION_SLOT_COLLISION');
 const c=setup();c.observed.newSources=[{...copy(c.input.newSource),created_at:'2026-10-23T00:00:00+05:00'}];expect(()=>snapshot(c.input,c.observed)).toThrow('CAPTURED_SOURCE_PREIMAGE');
});

describe('CT126 exact registered current forward R1006',()=>{
 const currentCaptures=load('data/estimate-benchmarks/fixtures/ct126-current-four-registered-full-captures-r1.json').captures;
 const profiles=['high_load','repair','standard','technical_room'];
 const current=(profile:string):Json=>copy(currentCaptures['canonical-work:base:plaster_paint_interior_wall_putty_level_'+profile]);
 const exact=(profile:string):Json=>load('data/estimate-benchmarks/fixtures/ct126-current-'+profile+'-retained-forward-lineage-r1.json');
 const configured=(profile:string)=>{const s=setup(current(profile));s.observed.retainedForwardLineage=copy(exact(profile).chain.slice(1));return s;};
 test.each(profiles)('admits exact already published current %s while preserving original slots',profile=>{
  const s=configured(profile),before=copy(s),r=exact(profile);
  expect(captureSha(s.opt.capturedParent)).toBe(r.captureSha256);
  expect(()=>admit(s.input)).not.toThrow();
  expect(s.opt.capturedParent.definition.source_metadata.retainedParentBindingSuccessorV1).toEqual(r.chain[1].definition.source_metadata.retainedParentBindingSuccessorV1);
  expect(s).toEqual(before);
 });
 test.each(profiles)('retains exact current %s normal and locked snapshot contract',profile=>{
  const s=configured(profile),before=copy(s);
  expect(()=>snapshot(s.input,s.observed)).not.toThrow();
  expect(()=>unchanged(s.input,s.observed,copy(s.observed))).not.toThrow();
  expect(s).toEqual(before);
 });
 test.each(['formula body','resource owner','old retained slot','source metadata'])('rejects recomputed capture after changed %s',kind=>{
  for(const profile of profiles){const c=current(profile);
   if(kind==='formula body')c.formulas[0].expression_source='q*999';
   else if(kind==='resource owner')c.resources[0].cost_owner_id='TEST_ONLY_REPLACEMENT_OWNER';
   else if(kind==='old retained slot')c.definition.source_metadata.retainedParentBindingSuccessorV1.parentDefinitionId='10000000-0000-5000-8000-000000000099';
   else c.normativeSources[0].metadata={...c.normativeSources[0].metadata,testOnlyUnreviewedMutation:true};
   const s=setup(c);expect(()=>admit(s.input)).toThrow(/CONTINUATION_OLD_SOURCE_LINEAGE_DRIFT/);
  }
 });
 test('refuses an unregistered catalog while keeping the published current identity',()=>{
  for(const profile of profiles){const c=current(profile);c.definition.catalog_id+=':TEST_ONLY_ALIAS';c.baseline.catalog_id=c.definition.catalog_id;
   const s=setup(c);expect(()=>admit(s.input)).toThrow(/CONTINUATION_OLD_SOURCE_LINEAGE_DRIFT/);}
 });
 test('rejects missing or modified historical nodes at ordinary and locked snapshots',()=>{
  for(const profile of profiles){const s=configured(profile),missing=copy(s.observed);delete missing.retainedForwardLineage;
   expect(()=>snapshot(s.input,missing)).toThrow(/CONTINUATION_REGISTERED_FORWARD_LINEAGE_DRIFT/);
   const altered=copy(s.observed);altered.retainedForwardLineage[0].baseline.id='TEST_ONLY_CHANGED_HISTORICAL_BASELINE';
   expect(()=>snapshot(s.input,altered)).toThrow(/CONTINUATION_REGISTERED_FORWARD_LINEAGE_DRIFT/);
   expect(()=>unchanged(s.input,s.observed,altered)).toThrow();
  }
 });
});
