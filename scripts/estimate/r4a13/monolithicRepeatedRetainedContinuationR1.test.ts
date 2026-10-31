import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import registration from '../../../data/estimate-benchmarks/fixtures/monolithic-repeat-retained-continuation-registration-r1.json';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {masterRetainParentBindingsOptInR1,masterRetainedParentCaptureSha256R1,
 prepareMasterRetainedBindingRepresentativeR1,assertMasterRetainedBindingSnapshotR1,
 assertMasterRetainedBindingPreflightUnchangedR1} from './masterSingleDefinitionRetainParentBindingsR1';
type J=Record<string,any>;
const raw=readFileSync('data/estimate-benchmarks/fixtures/monolithic-physical-current-parents-r2.json');
const fixture=JSON.parse(raw.toString('utf8')) as J;
const copy=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));
const valueSha=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
function setup(catalogId:string){
 const parent=copy(fixture.captures.find((c:J)=>c.definition.catalog_id===catalogId));
 const capture=Object.fromEntries(['definition','baseline','parameters','formulas','resources','bindings','normativeSources','normativeLocators'].map(k=>[k,parent[k]]));
 const metadata=capture.definition.source_metadata;
 const opt:J={capturedParent:capture,capturedParentSha256:masterRetainedParentCaptureSha256R1(capture as any),newParameterSources:{},
  successorProvenanceContinuation:{contract:'master-retained-binding-continuation/r1',capturedSourceMetadata:copy(metadata),
   capturedSourceMetadataSha256:valueSha(metadata),capturedPreviousSuccessorSha256:valueSha(metadata.retainedParentBindingContinuationV1.successor)}};
 const newSource={id:'10000000-0000-5000-8000-000000000001',source_key:'CONTROL_ONLY_MONOLITHIC_HISTORY',title_ru:'Контроль сохранения истории',authority:'CONTROL_ONLY',official_url:null,
  artifact_sha256:'a'.repeat(64),effective_from:null,effective_to:null,metadata:{controlOnly:true}};
 const newLocators=[{id:'10000000-0000-5000-8000-000000000002',source_id:newSource.id,locator_key:'CONTROL_ONLY_HISTORY',locator:{controlOnly:true},excerpt_sha256:'b'.repeat(64)}];
 const input:any={config:{stopCode:'MONOLITHIC_HISTORY_TEST',catalogId,parentReleaseId:capture.definition.release_id,binding:{retainParentBindings:opt}},newSource,newLocators};
 const next:any={parameters:copy(capture.parameters),formulas:copy(capture.formulas),resources:[...copy(capture.resources),
  {...copy(capture.resources[0]),id:'10000000-0000-5000-8000-000000000003',row_id:'control-only:history-info',ordinal:9999,
   source_metadata:{controlOnly:true},resource_graph:{...copy(capture.resources[0].resource_graph),costTreatment:'INFORMATIONAL_SCOPE'},procurement_eligible:false}],
  newBindings:[{row_id:'control-only:history-info',locator_id:newLocators[0].id,applicability:{controlOnly:true}}],
  successorProvenance:{featureContract:'CONTROL_ONLY_HISTORY',catalogId,parentDefinitionId:capture.definition.id,parentBaselineId:capture.baseline.id,capturedParentSha256:opt.capturedParentSha256},
  lifecycleMetadata:{contract:'CONTROL_ONLY_HISTORY'}};
 const snapshot:any={membership:[{release_id:input.config.parentReleaseId,catalog_id:catalogId,definition_version_id:capture.definition.id,
  approved_template_baseline_id:capture.baseline.id,definition_hash:capture.definition.definition_sha256}],capture:copy(capture),newSources:[],newLocators:[]};
 return{input,opt,next,snapshot};
}
function rehash(s:ReturnType<typeof setup>){s.opt.capturedParentSha256=masterRetainedParentCaptureSha256R1(s.opt.capturedParent as any);}
describe.each(registration.anchors)('finite current concrete history: $definitionId',a=>{
 test('literal current capture is reviewed and old history slots survive byte for byte',()=>{
  const s=setup(a.catalogId),before=copy(s.opt.capturedParent),e=prepareMasterRetainedBindingRepresentativeR1(s.input,s.next);
  expect(s.opt.capturedParentSha256).toBe(a.capturedParentSha256);
  expect(e.sourceMetadata.retainedParentBindingSuccessorV1).toEqual(before.definition.source_metadata.retainedParentBindingSuccessorV1);
  expect(e.sourceMetadata.retainedParentBindingContinuationV1).toEqual(before.definition.source_metadata.retainedParentBindingContinuationV1);
  const slot=e.sourceMetadata.retainedParentBindingContinuationV2;
  expect(slot.previousSourceMetadata).toEqual(before.definition.source_metadata);
  expect(slot.previousSuccessorSha256).toBe(a.latestPreviousSuccessorSha256);
  expect(slot.successor.parentDefinitionId).toBe(a.definitionId);
  expect(slot.successor.parentBaselineId).toBe(a.baselineId);
  expect(slot.successor.capturedParentSha256).toBe(a.capturedParentSha256);
  expect(e.normativeSourceIds).toEqual(before.baseline.normative_source_ids);
  expect(e.bindings).toHaveLength(before.bindings.length+1);
  expect(s.opt.capturedParent).toEqual(before);
 });
 test('normal preflight and locked reread preserve the same complete source capture',()=>{
  const s=setup(a.catalogId),before=copy(s.snapshot);
  assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot);
  assertMasterRetainedBindingPreflightUnchangedR1(s.input,s.snapshot,copy(s.snapshot));
  expect(s.snapshot).toEqual(before);
 });
 test('wrong previous hash cannot select the older root successor',()=>{
  const s=setup(a.catalogId);s.opt.successorProvenanceContinuation.capturedPreviousSuccessorSha256=a.originalSuccessorSha256;
  expect(()=>masterRetainParentBindingsOptInR1(s.input)).toThrow('MONOLITHIC_REPEAT_OPT_IN_ANCHOR_DRIFT');
 });
 test.each(['contract','capturedSourceMetadata','capturedSourceMetadataSha256','capturedPreviousSuccessorSha256'])('omitted continuation %s is refused',key=>{
  const s=setup(a.catalogId);delete s.opt.successorProvenanceContinuation[key];
  expect(()=>masterRetainParentBindingsOptInR1(s.input)).toThrow('CONTINUATION_OPT_IN_OBJECT');
 });
 const mutations:Array<[string,(c:J)=>void]>=[
  ['version',c=>c.definition.definition_version++],
  ['definition SHA',c=>c.definition.definition_sha256='0'.repeat(64)],
  ['baseline id',c=>c.baseline.id='foreign-baseline'],
  ['predecessor definition',c=>c.baseline.source_definition_version_id='foreign-definition'],
  ['predecessor baseline',c=>c.baseline.supersedes_baseline_id='foreign-baseline'],
  ['old resource price ownership',c=>c.resources[0].resource_graph.costTreatment='FOREIGN'],
  ['old source artifact',c=>c.normativeSources[0].artifact_sha256='0'.repeat(64)],
  ['root source prefix',c=>c.definition.source_metadata.retainedParentBindingSuccessorV1.injected=true],
  ['inner continuation prefix',c=>c.definition.source_metadata.retainedParentBindingContinuationV1.previousSourceMetadata.injected=true],
  ['already used next slot',c=>c.definition.source_metadata.retainedParentBindingContinuationV2={injected:true}],
 ];
 test.each(mutations)('self-rehashed %s does not confer admission',(_label,change)=>{
  const s=setup(a.catalogId);change(s.opt.capturedParent);rehash(s);
  expect(()=>masterRetainParentBindingsOptInR1(s.input)).toThrow('RETAIN_MONOLITHIC_REPEAT_');
 });
 test('unregistered current definition retains the old collision guard',()=>{
  const s=setup(a.catalogId),c=s.opt.capturedParent;c.definition.id='10000000-0000-5000-8000-000000000099';
  c.baseline.definition_version_id=c.definition.id;
  for(const k of ['parameters','formulas','resources','bindings'])for(const row of c[k])row.definition_version_id=c.definition.id;
  rehash(s);expect(()=>masterRetainParentBindingsOptInR1(s.input)).toThrow('CONTINUATION_SLOT_COLLISION');
 });
 test('omitting the option keeps the existing legacy caller path',()=>{
  const s=setup(a.catalogId);delete s.input.config.binding.retainParentBindings;
  expect(masterRetainParentBindingsOptInR1(s.input)).toBeNull();
 });
 test.each(['normal','locked'])('%s read refuses resource or source drift before any writer',phase=>{
  const s=setup(a.catalogId),changed=copy(s.snapshot);changed.capture.normativeLocators[0].locator.injected=true;
  expect(()=>phase==='normal'?assertMasterRetainedBindingSnapshotR1(s.input,changed):assertMasterRetainedBindingPreflightUnchangedR1(s.input,s.snapshot,changed)).toThrow('RETAIN_PARENT_FULL_CAPTURE_DRIFT');
 });
 test('history admission does not permit changing an old paid row or formula',()=>{
  const s=setup(a.catalogId),bound=s.opt.capturedParent.bindings[0];
  s.next.resources.find((r:J)=>r.id===bound.resource_spec_id).resource_graph.costTreatment='FOREIGN';
  expect(()=>prepareMasterRetainedBindingRepresentativeR1(s.input,s.next)).toThrow('OLD_BOUND_RESOURCE_PHYSICAL_PAYMENT_DRIFT');
  const other=setup(a.catalogId);other.next.formulas[0].expression_source='77';
  expect(()=>prepareMasterRetainedBindingRepresentativeR1(other.input,other.next)).toThrow('OLD_FORMULA_SEMANTICS_DRIFT');
 });
});
test('only two independently reviewed current parents are registered',()=>{
 expect(registration.anchors).toHaveLength(2);
 expect(createHash('sha256').update(raw).digest('hex')).toBe('a9b8c587189c2b6147592dddcca2f84a1fc9743376abd5122bea0ec42f9f098d');
});
