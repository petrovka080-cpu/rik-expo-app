// WORK-only focused scenarios, NOT_RUN. Uses accepted actual parent, no DB connection.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {assertMasterSingleDefinitionCapturedSourcePreimageR1} from './masterSingleDefinitionAppendGuardsR1';
import {masterRetainedParentCaptureSha256R1,masterRetainParentBindingsOptInR1,
 assertMasterRetainedBindingSnapshotR1,assertMasterRetainedBindingPreflightUnchangedR1,
 readMasterRetainedBindingPreconditionsR1} from './masterSingleDefinitionRetainParentBindingsR1';
type J=Record<string,any>;
const fixtureBytes=readFileSync(resolve(process.cwd(),'data/estimate-benchmarks/fixtures/elecor-mechanical-fixings-current-parent-r2.json'));
const fixture=JSON.parse(fixtureBytes.toString('utf8'));
const copy=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
function setup(strict=true){
 const p=copy(fixture.parent),capture={definition:p.definition,baseline:p.baseline,parameters:p.parameters,formulas:p.formulas,resources:p.resources,bindings:p.bindings,normativeSources:copy(fixture.normativeSources),normativeLocators:copy(fixture.normativeLocators)};
 const sourceKey='CONTROL_ONLY_DISTINCT_REGISTRY_PREIMAGE_SOURCE',sourceId='10000000-0000-5000-8000-000000000001',locatorId='10000000-0000-5000-8000-000000000002';
 const opt:J={capturedParent:capture,capturedParentSha256:masterRetainedParentCaptureSha256R1(capture),newParameterSources:{}};
 if(strict)opt.capturedSourcePreimage={sourceKey,expected:null};
 const input:J={config:{stopCode:'REGISTRY_PREIMAGE_TEST',catalogId:p.definition.catalog_id,parentReleaseId:fixture.context.definitionReleaseId,binding:{retainParentBindings:opt}},newSource:{id:sourceId,source_key:sourceKey,title_ru:'CONTROL_ONLY: no physical norm claim',authority:'CONTROL_ONLY',official_url:null,artifact_sha256:'a'.repeat(64),effective_from:null,effective_to:null,metadata:{contract:'CONTROL_ONLY',noPriceNorm:true}},newLocators:[{id:locatorId,source_id:sourceId,locator_key:'CONTROL_ONLY_LOCATOR',locator:{scope:'CONTROL_ONLY_NO_PHYSICAL_NORM'},excerpt_sha256:'b'.repeat(64)}]};
 const snapshot:J={membership:[{release_id:input.config.parentReleaseId,catalog_id:input.config.catalogId,definition_version_id:p.definition.id,approved_template_baseline_id:p.baseline.id,definition_hash:p.definition.definition_sha256}],capture:copy(capture),newSources:[],newLocators:[]};
 return {input:input as any,opt,snapshot:snapshot as any};
}
function registered(s:ReturnType<typeof setup>){s.snapshot.newSources=[{...copy(s.input.newSource),created_at:'2026-10-19T10:00:00.123456+05:00'}];s.snapshot.newLocators=copy(s.input.newLocators);return s;}
function mockRead(s:ReturnType<typeof setup>){
 const observed:string[]=[];
 const client={query:async(sql:string,values:unknown[])=>{observed.push(sql);expect(sql.trim().startsWith('select ')).toBe(true);
  let rows:any[];
  if(sql.includes('estimate_cumulative_manifest_entry'))rows=s.snapshot.membership;
  else if(sql.includes('from public.estimate_normative_source')&&values[0]===s.input.newSource.id)rows=s.snapshot.newSources;
  else if(sql.includes('from public.estimate_normative_locator')&&values[1]===s.input.newSource.id)rows=s.snapshot.newLocators;
  else {const table=sql.match(/from public\.(estimate_[a-z_]+)/)?.[1];const c=s.snapshot.capture;const byTable:J={estimate_definition_version:[c.definition],estimate_approved_template_baseline:[c.baseline],estimate_parameter_definition:c.parameters,estimate_formula_graph:c.formulas,estimate_resource_spec:c.resources,estimate_work_normative_binding:c.bindings,estimate_normative_locator:c.normativeLocators,estimate_normative_source:c.normativeSources};expect(table&&Object.hasOwn(byTable,table)).toBeTruthy();rows=byTable[table!];}
  return {rows:rows.map(row=>({raw:JSON.stringify(row)}))};}};
 return {client:client as any,observed};
}
describe('retained captured-source0 opt-in and existing full snapshot invariants',()=>{
 test('accepted real parent fixture is pinned',()=>{expect(createHash('sha256').update(fixtureBytes).digest('hex')).toBe('3097e5f9497ccde7749f961f3b4a602cfb4d61c1e160c90439b30c3143e8b587');expect(fixture.parent.bindings).toHaveLength(18);});
 test('omission keeps legacy absent preflight without adding metadata',()=>{const s=setup(false),before=copy(s);assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot);expect(s).toEqual(before);});
 test('omission keeps legacy managed-exact existing source+locator acceptance',()=>{const s=registered(setup(false)),before=copy(s);assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot);expect(s).toEqual(before);});
 test('omission keeps legacy registered phase behavior',()=>{const s=registered(setup(false));expect(()=>assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot,'REGISTERED')).not.toThrow();});
 test('strict absent normal preflight preserves full captured bytes',()=>{const s=setup(),before=copy(s);assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot);expect(s).toEqual(before);});
 test('strict same absent locked reread passes existing full equality guard',()=>{const s=setup();expect(()=>assertMasterRetainedBindingPreflightUnchangedR1(s.input,s.snapshot,copy(s.snapshot))).not.toThrow();});
 test('managed-exact source before normal preflight is rejected only when opted in',()=>{const s=registered(setup());expect(()=>assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot)).toThrow('RETAIN_CAPTURED_SOURCE_PREIMAGE_CHANGED');});
 test('managed-exact phantom after absent normal snapshot already rejects in legacy',()=>{const s=setup(false),locked=registered(setup(false));expect(()=>assertMasterRetainedBindingPreflightUnchangedR1(s.input,s.snapshot,locked.snapshot)).toThrow('RETAIN_PREFLIGHT_CHANGED_BEFORE_DML');});
 test('same race rejects in strict locked preflight',()=>{const s=setup(),locked=registered(setup());expect(()=>assertMasterRetainedBindingPreflightUnchangedR1(s.input,s.snapshot,locked.snapshot)).toThrow('RETAIN_CAPTURED_SOURCE_PREIMAGE_CHANGED');});
 test('strict REGISTERED permits exact1 source and complete locators without rewriting',()=>{const s=registered(setup()),before=copy(s);expect(()=>assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot,'REGISTERED')).not.toThrow();expect(s).toEqual(before);});
 test('strict REGISTERED rejects missing source',()=>{const s=setup();expect(()=>assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot,'REGISTERED')).toThrow('RETAIN_CAPTURED_SOURCE_PREIMAGE_PERSISTENCE');});
 test('strict REGISTERED rejects incomplete locator closure',()=>{const s=registered(setup());s.snapshot.newLocators=[];expect(()=>assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot,'REGISTERED')).toThrow('RETAIN_CAPTURED_SOURCE_PREIMAGE_REGISTERED_LOCATOR_CLOSURE');});
 test('strict REGISTERED still rejects source metadata drift',()=>{const s=registered(setup());s.snapshot.newSources[0].metadata.injected=true;expect(()=>assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot,'REGISTERED')).toThrow('RETAIN_NEW_SOURCE_NOT_EXACT');});
 test('strict REGISTERED still rejects locator payload drift',()=>{const s=registered(setup());s.snapshot.newLocators[0].locator.injected=true;expect(()=>assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot,'REGISTERED')).toThrow('RETAIN_NEW_LOCATOR_NOT_EXACT');});
 test('strict REGISTERED still rejects old binding applicability change',()=>{const s=registered(setup());s.snapshot.capture.bindings[0].applicability.injected=true;expect(()=>assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot,'REGISTERED')).toThrow('RETAIN_PARENT_FULL_CAPTURE_DRIFT');});
 test('strict REGISTERED still preserves old source timestamp microseconds',()=>{const s=registered(setup());s.snapshot.capture.normativeSources[0].created_at='2026-10-19T00:00:00.000000+05:00';expect(()=>assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot,'REGISTERED')).toThrow('RETAIN_PARENT_FULL_CAPTURE_DRIFT');});
 test('strict source count2 collision cannot be a source0 escape',()=>{const s=registered(setup());s.snapshot.newSources.push(copy(s.snapshot.newSources[0]));expect(()=>assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot,'REGISTERED')).toThrow('RETAIN_NEW_SOURCE_ID_OR_KEY_COLLISION');});
 test('strict absence conflicts with explicit existing registry reuse',()=>{const s=setup();s.input.config.binding.reuseExistingNormativeRegistry={contract:'CONTROL_ONLY'};expect(()=>masterRetainParentBindingsOptInR1(s.input)).toThrow('RETAIN_CAPTURED_SOURCE_PREIMAGE_REUSE_CONFLICT');});
 const malformed:[string,unknown][]=[['present undefined',undefined],['null',null],['array',[]],['false',false],['missing expected',{sourceKey:'CONTROL_ONLY_DISTINCT_REGISTRY_PREIMAGE_SOURCE'}],['wrong expected',{sourceKey:'CONTROL_ONLY_DISTINCT_REGISTRY_PREIMAGE_SOURCE',expected:0}],['wrong key',{sourceKey:'foreign',expected:null}],['extra key',{sourceKey:'CONTROL_ONLY_DISTINCT_REGISTRY_PREIMAGE_SOURCE',expected:null,extra:true}]];
 test.each(malformed)('reject malformed strict opt-in %s',(_label,value)=>{const s=setup();s.opt.capturedSourcePreimage=value;expect(()=>masterRetainParentBindingsOptInR1(s.input)).toThrow('RETAIN_CAPTURED_SOURCE_PREIMAGE_INVALID');});
 test('strict opt-in is REPLACE-only',()=>{const s=setup();s.input.config.catalogAppend={};expect(()=>masterRetainParentBindingsOptInR1(s.input)).toThrow('RETAIN_REPLACE_ONLY');});
 test('unknown phase cannot turn strict before into registered',()=>{const s=registered(setup());expect(()=>assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot,'AFTER' as any)).toThrow('RETAIN_CAPTURED_SOURCE_PREIMAGE_PHASE_INVALID');});
 test('same existing raw reader explicitly dispatches BEFORE by default',async()=>{const s=registered(setup()),m=mockRead(s);await expect(readMasterRetainedBindingPreconditionsR1(m.client,s.input)).rejects.toThrow('RETAIN_CAPTURED_SOURCE_PREIMAGE_CHANGED');expect(m.observed).toHaveLength(11);});
 test('same existing raw reader supports strict REGISTERED full snapshot',async()=>{const s=registered(setup()),m=mockRead(s);expect(await readMasterRetainedBindingPreconditionsR1(m.client,s.input,'REGISTERED')).toEqual(s.snapshot);expect(m.observed).toHaveLength(11);});
 test('legacy raw reader still accepts existing exact rows without opt-in',async()=>{const s=registered(setup(false)),m=mockRead(s);expect(await readMasterRetainedBindingPreconditionsR1(m.client,s.input)).toEqual(s.snapshot);expect(m.observed.every(q=>q.startsWith('select '))).toBe(true);});
});
describe('reuse extracted existing append preimage predicate',()=>{
 const c={stopCode:'CONTROL_APPEND',sourceId:'CONTROL_ONLY_SOURCE'},p={sourceKey:'CONTROL_ONLY_SOURCE',expected:null};
 test('same BEFORE null accepted',()=>expect(()=>assertMasterSingleDefinitionCapturedSourcePreimageR1(c,p,null,'BEFORE')).not.toThrow());
 test('same BEFORE managed-exact object refused',()=>expect(()=>assertMasterSingleDefinitionCapturedSourcePreimageR1(c,p,{source_key:c.sourceId},'BEFORE')).toThrow('STOP_CONTROL_APPEND_CAPTURED_SOURCE_PREIMAGE_CHANGED'));
 test('same BEFORE undefined actual refused',()=>expect(()=>assertMasterSingleDefinitionCapturedSourcePreimageR1(c,p,undefined,'BEFORE')).toThrow('CAPTURED_SOURCE_PREIMAGE_CHANGED'));
 test('same original append structural extra field remains accepted',()=>expect(()=>assertMasterSingleDefinitionCapturedSourcePreimageR1(c,{...p,legacyExtra:true},null,'BEFORE')).not.toThrow());
 test('same original source-key mismatch refused',()=>expect(()=>assertMasterSingleDefinitionCapturedSourcePreimageR1(c,{...p,sourceKey:'foreign'},null,'BEFORE')).toThrow('CAPTURED_SOURCE_PREIMAGE_INVALID'));
 test('REGISTERED exact row presence only; full validators remain responsible for fields',()=>expect(()=>assertMasterSingleDefinitionCapturedSourcePreimageR1(c,p,{source_key:c.sourceId},'REGISTERED')).not.toThrow());
});
