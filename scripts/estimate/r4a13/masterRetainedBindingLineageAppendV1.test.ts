import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {
  validateMasterRetainedBindingAppendV1 as validate,appendMasterRetainedBindingLineageV1 as append,
  masterRetainedLineageValueSha256V1 as hash,MASTER_RETAINED_APPEND_LIMITS_V1 as limits,
  masterRetainParentBindingsOptInR1,masterRetainedParentCaptureSha256R1,
  prepareMasterRetainedBindingRepresentativeR1,assertMasterRetainedBindingSnapshotR1,
  assertMasterRetainedBindingPreflightUnchangedR1,assertMasterRetainedContinuationMetadataRoundTripR1 as roundTrip,
  type MasterRetainedBindingGuardInputR1,type MasterRetainParentBindingsR1,
} from './masterSingleDefinitionRetainParentBindingsR1';
type Json=Record<string,unknown>;
type Context=Parameters<typeof validate>[0];
const isRecord=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function object(v:unknown):Json{assert(isRecord(v));return v;}
function rows(v:unknown):Json[]{assert(Array.isArray(v));return v.map((x:unknown)=>object(x));}
function text(v:unknown):string{assert.equal(typeof v,'string');assert(typeof v==='string');return v;}
function clone(v:Json):Json{const copied:unknown=JSON.parse(JSON.stringify(v));return object(copied);}
function parsed(path:string):Json{const value:unknown=JSON.parse(readFileSync(resolve(process.cwd(),path),'utf8'));return object(value);}
const evidence=parsed('data/estimate-benchmarks/fixtures/master-retained-lineage-append-real-headers-r1.json');
const headers=rows(evidence.records);
const key='retainedParentBindingLineageV1';
function context(index=2):Context{
  const h=clone(headers[index]!);
  // Header-only architecture evidence does not claim a full-capture hash.
  // The full existing FLOOR capture is exercised separately below.
  return{capture:{definition:object(h.definition),baseline:object(h.baseline)},capturedParentSha256:'f'.repeat(64),
    catalogId:text(h.catalogId),stopCode:'APPEND_TEST'};
}
function latest(metadata:Json):Json{
  if(Object.hasOwn(metadata,key))return object(rows(object(metadata[key]).entries).at(-1)!.successor);
  for(const name of ['retainedParentBindingContinuationV2','retainedParentBindingContinuationV1']){
    if(Object.hasOwn(metadata,name))return object(object(metadata[name]).successor);
  }
  return object(metadata.retainedParentBindingSuccessorV1);
}
function opt(c:Context){const m=object(c.capture.definition.source_metadata);return{
  contract:'master-retained-binding-append/v1' as const,capturedSourceMetadata:clone(m),
  capturedSourceMetadataSha256:hash(m),capturedPreviousSuccessorSha256:hash(latest(m))};}
function next(c:Context):Json{return{contract:'TEST_ONLY_APPEND',sourceId:'TEST_ONLY_INFO_SOURCE',normId:'TEST_ONLY_NOT_A_NEW_NORM',
  sourceFingerprint:'a'.repeat(64),parentDefinitionId:c.capture.definition.id,parentBaselineId:c.capture.baseline.id,capturedParentSha256:c.capturedParentSha256};}
const life={contract:'TEST_ONLY_CHILD',masterSha256:'b'.repeat(64),sourceFingerprint:'c'.repeat(64)};
function build(c:Context,value=next(c)):Json{return append(c,validate(c,opt(c)),value,life);}
function child(c:Context,metadata:Json,n:number):Context{return{...c,
  capture:{definition:{...c.capture.definition,id:'TEST_ONLY_CHILD_DEFINITION_'+n,definition_sha256:'d'.repeat(64),source_metadata:metadata},
    baseline:{...c.capture.baseline,id:'TEST_ONLY_CHILD_BASELINE_'+n,definition_version_id:'TEST_ONLY_CHILD_DEFINITION_'+n,
      source_definition_version_id:c.capture.definition.id,supersedes_baseline_id:c.capture.baseline.id}}};}

describe('bounded general append on real current publisher header graphs, not DB admission',()=>{
  test('eight byte-pinned read-only header sources include two V2 foundations and direct V1 parents',()=>{
    assert.equal(evidence.status,'PINNED_REAL_HEADER_GRAPH_EVIDENCE_NOT_FULL_CAPTURE_OR_DB_PREFLIGHT');
    assert.equal(headers.length,8);assert(headers.every(h=>h.sourceMetadataLosslessRoundtrip===true));
    assert.equal(headers.filter(h=>Object.hasOwn(object(object(h.definition).source_metadata),'retainedParentBindingContinuationV2')).length,2);
  });
  for(let index=0;index<8;index++)test('real current header '+index+' preserves all historical prefixes and uses latest actual edge',()=>{
    const c=context(index),before=JSON.stringify(c),m=object(c.capture.definition.source_metadata),result=build(c);
    assert.equal(JSON.stringify(c),before);
    for(const name of ['retainedParentBindingSuccessorV1','retainedParentBindingContinuationV1','retainedParentBindingContinuationV2']){
      assert.deepEqual(result[name],m[name]);
    }
    const entries=rows(object(result[key]).entries);assert.equal(entries.length,1);
    assert.equal(entries[0]!.previousSuccessorSha256,hash(latest(m)));
    assert.equal(entries[0]!.parentSourceDefinitionId,c.capture.baseline.source_definition_version_id);
    assert.equal(entries[0]!.parentSupersedesBaselineId,c.capture.baseline.supersedes_baseline_id);
    assert(!JSON.stringify(entries).includes('previousSourceMetadata"'));
    assert(!JSON.stringify(entries).includes('capturedSourceMetadata"'));
    assert.notEqual(result.retainedParentBindingSuccessorV1,m.retainedParentBindingSuccessorV1,'no mutable output alias into capture');
  });
  test('sequential appends preserve prior entries and resolve the array tail as predecessor',()=>{
    const first=context(5),m1=build(first),second=child(first,m1,1),m2=build(second),third=child(second,m2,2),m3=build(third);
    assert.deepEqual(rows(object(m3[key]).entries).slice(0,2),rows(object(m2[key]).entries));
    assert.equal(rows(object(m3[key]).entries).length,3);
    assert.doesNotThrow(()=>validate(child(third,m3,3),opt(child(third,m3,3))));
  });
  test.each([null,undefined,[],false,{}, {contract:'other'}])('malformed explicit append refuses %p',value=>{
    assert.throws(()=>validate(context(),value),/APPEND_OPT_IN_OBJECT/u);
  });
  test('undeclared opt-in key refuses instead of becoming silent authority',()=>{
    const c=context();assert.throws(()=>validate(c,{...opt(c),extra:true}),/APPEND_OPT_IN_OBJECT/u);
  });
  test.each(['capturedSourceMetadataSha256','capturedPreviousSuccessorSha256'])('wrong explicit hash refuses %s',field=>{
    const c=context();assert.throws(()=>validate(c,{...opt(c),[field]:'0'.repeat(64)}),/APPEND_(?:SOURCE_METADATA|PREVIOUS_SUCCESSOR)_DRIFT/u);
  });
  test('V2 predecessor means its successor hash, never the whole V2 envelope',()=>{
    const c=context(),m=object(c.capture.definition.source_metadata);
    assert.throws(()=>validate(c,{...opt(c),capturedPreviousSuccessorSha256:hash(m.retainedParentBindingContinuationV2)}),/APPEND_PREVIOUS_SUCCESSOR_DRIFT/u);
  });
  test.each(['source_definition_version_id','supersedes_baseline_id'])('current baseline cannot skip or substitute %s',field=>{
    const c=context();c.capture.baseline[field]='FOREIGN_PREDECESSOR';assert.throws(()=>validate(c,opt(c)),/APPEND_CURRENT_BASELINE_PREDECESSOR/u);
  });
  test.each(['parentDefinitionId','parentBaselineId','capturedParentSha256'])('new successor must anchor exact current %s',field=>{
    const c=context();assert.throws(()=>build(c,{...next(c),[field]:field==='capturedParentSha256'?'0'.repeat(64):'FOREIGN'}),/APPEND_CURRENT_PARENT_ANCHOR/u);
  });
  test('cross-catalog successor refuses',()=>{const c=context();assert.throws(()=>build(c,{...next(c),catalogId:'FOREIGN'}),/APPEND_SUCCESSOR_SHAPE/u);});
  test('historical prefix mutation is detected even if caller refreshes outer metadata hash',()=>{
    const c=context(),m=object(c.capture.definition.source_metadata);object(m.retainedParentBindingSuccessorV1).sourceId='TAMPERED';
    assert.throws(()=>validate(c,opt(c)),/APPEND_PREFIX_/u);
  });
  test.each(['previousSourceMetadataSha256','parentSourceDefinitionId','parentSupersedesBaselineId'])('old append entry cannot rewrite %s',field=>{
    const c=context(5),result=build(c),entry=rows(object(result[key]).entries)[0]!;entry[field]='0'.repeat(64);
    const current=child(c,result,1);assert.throws(()=>validate(current,opt(current)),/APPEND_ENTRY_/u);
  });
  test('lifecycle snapshot is checked by reconstructing the old compact prefix hash',()=>{
    const c=context(5),result=build(c);object(rows(object(result[key]).entries)[0]!.parentLifecycle).contract='TAMPERED';
    const current=child(c,result,1);assert.throws(()=>validate(current,opt(current)),/APPEND_ENTRY_SOURCE_METADATA_HASH/u);
  });
  test('successor cannot recursively embed entire provenance history',()=>{
    const c=context();assert.throws(()=>build(c,{...next(c),previousSourceMetadata:c.capture.definition.source_metadata}),/APPEND_SUCCESSOR_BOUNDS/u);
  });
  test('successor byte cap is checked before publication',()=>{
    const c=context();assert.throws(()=>build(c,{...next(c),oversized:'x'.repeat(limits.successorBytes)}),/APPEND_SUCCESSOR_BOUNDS/u);
  });
  test('entry count is bounded without recursive metadata copying',()=>{
    let c=context(5);
    for(let n=0;n<limits.entries;n++)c=child(c,build(c),n+1);
    assert.equal(rows(object(object(c.capture.definition.source_metadata)[key]).entries).length,limits.entries);
    assert.throws(()=>validate(c,opt(c)),/APPEND_LINEAGE_ENTRY_CAP/u);
  });
});

type Capture={definition:Json;baseline:Json;parameters:Json[];formulas:Json[];resources:Json[];
  bindings:Json[];normativeSources:Json[];normativeLocators:Json[]};
function fullCapture(value:unknown):Capture{const c=object(value);return{definition:object(c.definition),baseline:object(c.baseline),
  parameters:rows(c.parameters),formulas:rows(c.formulas),resources:rows(c.resources),bindings:rows(c.bindings),normativeSources:rows(c.normativeSources),normativeLocators:rows(c.normativeLocators)};}
function guardSetup(){
  const fixture=parsed('data/estimate-benchmarks/fixtures/floor-sand-retained-continuation-parent-r1.json'),c=fullCapture(fixture.capture);
  const capturedParentSha256=masterRetainedParentCaptureSha256R1(c);
  const ctx:Context={capture:c,capturedParentSha256,catalogId:text(c.definition.catalog_id),stopCode:'APPEND_FULL_TEST'};
  const sourceKey='TEST_ONLY_APPEND_DISTINCT_SOURCE',sourceId='10000000-0000-5000-8000-000000000001',locatorId='10000000-0000-5000-8000-000000000002';
  const retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256,newParameterSources:{},successorProvenanceAppendV1:opt(ctx),capturedSourcePreimage:{sourceKey,expected:null}};
  const input:MasterRetainedBindingGuardInputR1={config:{stopCode:ctx.stopCode,catalogId:ctx.catalogId,parentReleaseId:text(c.definition.release_id),binding:{retainParentBindings:retained}},
    newSource:{id:sourceId,source_key:sourceKey,title_ru:'TEST ONLY scoped INFO source',authority:'TEST ONLY',official_url:'https://example.invalid/',artifact_sha256:'a'.repeat(64),effective_from:null,effective_to:null,metadata:{testOnly:true}},
    newLocators:[{id:locatorId,source_id:sourceId,locator_key:'TEST_ONLY_APPEND_INFO',locator:{testOnly:true},excerpt_sha256:'b'.repeat(64)}]};
  const oldInfo=c.resources.find(r=>object(r.resource_graph).costTreatment==='INFORMATIONAL_SCOPE');assert(oldInfo);
  const added={...clone(oldInfo),id:'TEST_ONLY_NEW_INFO_RESOURCE',row_id:'TEST_ONLY_NEW_INFO_ROW',ordinal:c.resources.length,source_metadata:{testOnly:true,automaticGenericPriceInheritanceAllowed:false}};
  const next={parameters:c.parameters,formulas:c.formulas,resources:[...c.resources,added],
    newBindings:[{row_id:added.row_id,locator_id:locatorId,applicability:{testOnly:true}}],successorProvenance:nextFor(ctx),lifecycleMetadata:life};
  const snapshot={membership:[{release_id:input.config.parentReleaseId,catalog_id:ctx.catalogId,definition_version_id:c.definition.id,approved_template_baseline_id:c.baseline.id,definition_hash:c.definition.definition_sha256}],capture:c,newSources:[],newLocators:[]};
  return{c,ctx,retained,input,next,snapshot};
}
const nextFor=(c:Context)=>next(c);
describe('same existing retainer representative and full preflight, real full FLOOR capture',()=>{
  test('append uses the ordinary representative without changing sources, formulas or payment guards',()=>{
    const s=guardSetup(),before=JSON.stringify(s),result=prepareMasterRetainedBindingRepresentativeR1(s.input,s.next);
    assert.equal(JSON.stringify(s),before);assert.equal(result.bindings.length,s.c.bindings.length+1);
    assert.deepEqual(result.normativeSourceIds,s.c.baseline.normative_source_ids);
    assert.deepEqual(result.sourceMetadata.retainedParentBindingSuccessorV1,object(s.c.definition.source_metadata).retainedParentBindingSuccessorV1);
    assert.equal(rows(object(result.sourceMetadata[key]).entries).length,1);
  });
  test('omitted new opt-in preserves the old singular-slot collision',()=>{
    const s=guardSetup();const {successorProvenanceAppendV1:_omitted,...legacy}=s.retained;
    const input={...s.input,config:{...s.input.config,binding:{retainParentBindings:legacy}}};
    assert.throws(()=>prepareMasterRetainedBindingRepresentativeR1(input,s.next),/SUCCESSOR_PROVENANCE_SLOT_COLLISION/u);
  });
  test('explicit append and old continuation cannot mix',()=>{
    const s=guardSetup(),m=object(s.c.definition.source_metadata);
    const input={...s.input,config:{...s.input.config,binding:{retainParentBindings:{...s.retained,
      successorProvenanceContinuation:{contract:'master-retained-binding-continuation/r1' as const,capturedSourceMetadata:m,capturedSourceMetadataSha256:hash(m),capturedPreviousSuccessorSha256:hash(m.retainedParentBindingSuccessorV1)}}}}};
    assert.throws(()=>masterRetainParentBindingsOptInR1(input),/APPEND_OPTIONS_EXCLUSIVE/u);
  });
  test('normal and locked full-parent checks are still mandatory',()=>{
    const s=guardSetup();assert.doesNotThrow(()=>assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot));
    const changed=fullCapture(JSON.parse(JSON.stringify(s.c)) as unknown);object(changed.definition.source_metadata).tampered=true;
    assert.throws(()=>assertMasterRetainedBindingPreflightUnchangedR1(s.input,s.snapshot,{...s.snapshot,capture:changed}),/PARENT_FULL_CAPTURE_DRIFT/u);
  });
  test('append does not admit zero new bindings or an old-source alias',()=>{
    const s=guardSetup();assert.throws(()=>prepareMasterRetainedBindingRepresentativeR1(s.input,{...s.next,newBindings:[]}),/NEW_BINDING_MUST_USE_NEW_ROW_AND_SOURCE/u);
    assert.throws(()=>masterRetainParentBindingsOptInR1({...s.input,newSource:{...s.input.newSource,id:s.c.normativeSources[0]!.id}}),/NEW_SOURCE_MUST_BE_DISTINCT_COMPLETE_ROW/u);
  });
  test('old bound resource payment owner remains protected',()=>{
    const s=guardSetup(),bound=s.c.bindings[0]!.resource_spec_id;
    const resources=s.next.resources.map(r=>r.id===bound?{...r,cost_owner_id:'FOREIGN'}:r);
    assert.throws(()=>prepareMasterRetainedBindingRepresentativeR1(s.input,{...s.next,resources}),/OLD_BOUND_RESOURCE_PHYSICAL_PAYMENT_DRIFT/u);
  });
  for(const verdict of [true,false])test('existing exact PG TEXT roundtrip remains required: '+verdict,async()=>{
    const s=guardSetup(),calls:{sql:string;args:readonly unknown[]|undefined}[]=[];
    // This test double implements only the two-argument query consumed here.
    const client={query:async(sql:string,args?:readonly unknown[])=>{calls.push({sql,args});return{rows:[{matches:verdict}]};}} as unknown as Parameters<typeof roundTrip>[0];
    if(verdict)await roundTrip(client,s.input);else await assert.rejects(()=>roundTrip(client,s.input),/CONTINUATION_SOURCE_METADATA_LOSSLESS_ROUND_TRIP_REQUIRED/u);
    assert.equal(calls.length,1);assert(calls[0]!.sql.includes('source_metadata::text=($1::jsonb)::text'));
    assert.deepEqual(calls[0]!.args,[JSON.stringify(s.c.definition.source_metadata),s.c.definition.id,s.input.config.catalogId]);
  });
});
