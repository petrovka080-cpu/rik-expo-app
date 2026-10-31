import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {facadeGlassWholeFamilyMasterConfigR4 as configure} from './prepareFacadeGlassWholeFamilyR4';
import {facadeGlassFamilyParameterIdR4 as parameterId,facadeGlassFamilyChoiceR4 as choice,facadeGlassFamilySourceIdR4 as sourceId} from '../../../src/lib/estimate/v4/masterFacadeGlassWholeFamilyR4';
import {facadeGlassWholeDefinitionR4 as methodDefinition,type FacadeGlassWholeMethodKeyR4 as MethodKey} from '../../../src/lib/estimate/v4/facadeGlassWholeMethodsR4';
import {masterRetainParentBindingsOptInR1 as guard,masterRetainedParentCaptureSha256R1 as captureHash,
  masterRetainedLineageValueSha256V1 as hash,prepareMasterRetainedBindingRepresentativeR1 as prepare,
  assertMasterRetainedBindingSnapshotR1 as snapshot,assertMasterRetainedBindingPreflightUnchangedR1 as locked,
  assertMasterRetainedContinuationMetadataRoundTripR1 as roundTrip,
  type MasterRetainedBindingGuardInputR1,type MasterRetainedBindingSnapshotR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {buildMasterPublicationResourceRowsR1,resolveMasterSingleDefinitionBindingRowIds,
  resolveMasterSingleDefinitionBindingApplicabilityByRowId,resolveMasterSingleDefinitionLocatorExcerptSha256R1} from './prepareMasterSingleDefinitionSuccessorR1';
import {buildMasterParameterCalculationConsumers as consumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
type Json=Record<string,unknown>;
const isObject=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function obj(v:unknown):Json{assert(isObject(v));return v;}
function copy<T>(v:T):T{return JSON.parse(JSON.stringify(v)) as T;}
const release=obj(JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8')) as unknown);
const uuid=(seed:string)=>{const bytes=Buffer.from(createHash('sha256').update(seed).digest('hex').slice(0,32),'hex');bytes[6]=(bytes[6]!&15)|80;bytes[8]=(bytes[8]!&63)|128;const h=bytes.toString('hex');return`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
function setup(){
 const config=configure({releaseId:String(release.definitionReleaseId),searchReleaseId:String(release.searchReleaseId),sourceRoot:resolve(__dirname,'../../..')});
 const sourceId=uuid(`${config.contract}:${config.sourceId}:source`),locatorId=uuid(`${config.contract}:${config.sourceId}:${config.locator.key}:locator`),m=config.sourceMetadata;
 const input:MasterRetainedBindingGuardInputR1={config,newSource:{id:sourceId,source_key:config.sourceId,title_ru:m.source_title,authority:m.source_authority,
   official_url:m.official_url??null,artifact_sha256:m.artifact_sha256??null,effective_from:m.effective_from??null,effective_to:null,
   metadata:{contract:config.contract,sourceKind:m.source_kind??'PROJECT_DOCUMENTATION_REQUIRED',useRestriction:m.use_restriction,universalProductivityClaimed:false,universalConsumptionClaimed:false,activationAllowed:false}},
   newLocators:[{id:locatorId,source_id:sourceId,locator_key:config.locator.key,locator:config.locator.payload,excerpt_sha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1(config)}]};
 const retained=config.binding.retainParentBindings!;
 const resources=buildMasterPublicationResourceRowsR1(config.resourceDefinitions),ids=resolveMasterSingleDefinitionBindingRowIds(config,resources,[locatorId]),applicability=resolveMasterSingleDefinitionBindingApplicabilityByRowId(config,resources,[locatorId]);
 const next={parameters:config.parameterDefinitions,formulas:config.formulaDefinitions,resources,
   newBindings:ids.map(row_id=>({row_id,locator_id:locatorId,applicability:applicability[row_id]})),
   successorProvenance:{contract:config.contract,sourceId:config.sourceId,normId:config.normId,parentDefinitionId:retained.capturedParent.definition.id,parentBaselineId:retained.capturedParent.baseline.id,capturedParentSha256:retained.capturedParentSha256,sourceFingerprint:'a'.repeat(64)},
   lifecycleMetadata:{contract:config.contract,masterSha256:config.masterSha256,sourceFingerprint:'a'.repeat(64)}};
 const readback:MasterRetainedBindingSnapshotR1={membership:[{release_id:config.parentReleaseId,catalog_id:config.catalogId,definition_version_id:retained.capturedParent.definition.id,approved_template_baseline_id:retained.capturedParent.baseline.id,definition_hash:retained.capturedParent.definition.definition_sha256}],capture:copy(retained.capturedParent),newSources:[],newLocators:[],legacyApprovedSourceDefinition:copy(retained.legacyTemplateAssumptionSources!.approvedSourceEvidence!.capturedSourceDefinition)};
 return{config,input,next,readback};
}
type Setup=ReturnType<typeof setup>;
function rehash(s:Setup){const r=s.input.config.binding.retainParentBindings!;
 s.input={...s.input,config:{...s.input.config,binding:{...s.input.config.binding,retainParentBindings:{...r,capturedParentSha256:captureHash(r.capturedParent)}}}};}
function evidence(s:Setup){return s.input.config.binding.retainParentBindings!.legacyTemplateAssumptionSources!.approvedSourceEvidence!;}
function withEvidenceRow(s:Setup,row:Json){const r=s.input.config.binding.retainParentBindings!,legacy=r.legacyTemplateAssumptionSources!;
 s.input={...s.input,config:{...s.input.config,binding:{...s.input.config.binding,retainParentBindings:{...r,legacyTemplateAssumptionSources:{...legacy,approvedSourceEvidence:{...evidence(s),capturedSourceDefinition:row,capturedSourceDefinitionSha256:hash(row)}}}}}};}
describe('general approved input source fingerprint and exact current ordinary glass Config',()=>{
 test('ordinary publisher acceptance includes exact trusted legacy readback while short input remains geometric',()=>{
   const {config}=setup(),profile=config.runtimeProfileInput??{},capture=config.binding.retainParentBindings!.capturedParent;
   const assumptionIds=Object.keys(profile).filter(id=>config.runtimeProfileClassification?.[id]==='ASSUMPTION');
   assert.deepEqual(assumptionIds,['source_prompt']);assert(!Object.hasOwn(config.shortInput,'source_prompt'));
   for(const [id,value]of Object.entries(profile))assert.deepEqual(config.acceptanceInput[id],value);
   for(const id of assumptionIds){
     assert.deepEqual(capture.baseline.input_values[id],profile[id]);
     assert.deepEqual(config.runtimeProfileSourceIds?.[id],capture.baseline.normative_source_ids[id]);
   }
 });

 test('five fixed source method names use the existing normative profile without project or equipment facts',()=>{
   const {config}=setup(),profile=config.runtimeProfileInput??{},keys:readonly MethodKey[]=['stick','structural','semi-structural','unitized','point-fixed'];
   const normativeIds=Object.keys(profile).filter(id=>config.runtimeProfileClassification?.[id]==='NORMATIVE');
   assert.deepEqual(normativeIds,keys.map(key=>parameterId(key,'glass_exact_method')));
   for(const key of keys){
     const id=parameterId(key,'glass_exact_method');assert.equal(profile[id],choice(key));
     assert.equal(config.acceptanceInput[id],choice(key));assert.deepEqual(config.runtimeProfileSourceIds?.[id],[sourceId]);
     const raw=methodDefinition(key),scope=raw.parameters.find(p=>p.parameter_id==='glass_scope_conditions');assert(scope);
     assert.equal(scope.truth_metadata.value_source_role,'ENGINEERING_DESIGN');
     for(const parameter of raw.parameters.filter(p=>p.parameter_id!=='glass_exact_method')){
       assert(!Object.hasOwn(profile,parameterId(key,parameter.parameter_id)));
     }
     assert(!Object.hasOwn(config.shortInput,id));
   }
   assert(!Object.keys(profile).some(id=>id.startsWith('glass_vacuum_')));
 });

 test('standard guard accepts exact approved source reference without changing stored binding or baseline',()=>{
   const s=setup(),before=JSON.stringify(s);assert(guard(s.input));const r=s.input.config.binding.retainParentBindings!;
   const baseline=r.capturedParent.baseline;assert.equal(Object.keys(baseline.input_values).length,3);assert.equal(r.capturedParent.parameters.length,5);
   const p=r.capturedParent.parameters.find(p=>p.parameter_id==='source_prompt')!;assert.equal(consumers(r.capturedParent).resourceConsumers.source_prompt!.length,45);
   assert.notEqual(p.truth_metadata.provenance.approvedTemplateBinding.sourceTree,r.capturedParent.definition.source_metadata.sourceTree);
   assert.equal(JSON.stringify(s),before);
 });
 test('same existing publisher representative retains all45 old resource specs and source arrays',()=>{
   const s=setup(),old=s.input.config.binding.retainParentBindings!.capturedParent,result=prepare(s.input,s.next);
   for(const p of Object.keys(old.baseline.normative_source_ids))assert.deepEqual(result.normativeSourceIds[p],old.baseline.normative_source_ids[p]);
   assert.equal(old.resources.length,45);assert.equal(old.formulas.length,45);assert(result.expectedNormativeBindingCount>0);
 });
 test('without explicit historical evidence the original source-key guard still refuses',()=>{
   const s=setup(),r=s.input.config.binding.retainParentBindings!,{approvedSourceEvidence:_omitted,...legacy}=r.legacyTemplateAssumptionSources!;
   const input={...s.input,config:{...s.input.config,binding:{retainParentBindings:{...r,legacyTemplateAssumptionSources:legacy}}}};
   assert.throws(()=>guard(input),/CAPTURE_BASELINE_SOURCE_KEYS/u);
 });
 test('foreign package fingerprint cannot masquerade as a current Git tree',()=>{
   const s=setup(),c=s.input.config.binding.retainParentBindings!.capturedParent;
   c.parameters.find(p=>p.parameter_id==='floors')!.truth_metadata.provenance.approvedTemplateBinding.sourceTree=c.definition.source_metadata.sourceTree;rehash(s);
   assert.throws(()=>guard(s.input),/LEGACY_TEMPLATE_ASSUMPTION_EXACT_APPROVED_INPUT/u);
 });
 test.each(['id','catalog_id','definition_sha256'])('self-hashed foreign historical definition %s is refused',field=>{
   const s=setup(),row=copy(evidence(s).capturedSourceDefinition);row[field]=field==='definition_sha256'?'0'.repeat(64):'FOREIGN';withEvidenceRow(s,row);
   assert.throws(()=>guard(s.input),/APPROVED_SOURCE_DEFINITION_ANCHOR|LEGACY_TEMPLATE_ASSUMPTION_EXACT_APPROVED_INPUT/u);
 });
 test.each(['sourceDefinitionVersionId','sourceDefinitionSha256','sourceFingerprint'])('changed immutable proposal source reference %s is refused',field=>{
   const s=setup(),c=s.input.config.binding.retainParentBindings!.capturedParent;
   c.baseline.proposal_source_refs[0][field]='0'.repeat(64);rehash(s);
   assert.throws(()=>guard(s.input),/LEGACY_TEMPLATE_ASSUMPTION_EXACT_APPROVED_INPUT/u);
 });
 test.each(['id','parameter_schema_sha256','acceptance_evidence_sha256','source_definition_version_id'])('changed current approved baseline %s is refused',field=>{
   const s=setup(),c=s.input.config.binding.retainParentBindings!.capturedParent;c.baseline[field]='FOREIGN';rehash(s);
   assert.throws(()=>guard(s.input),/APPROVED_SOURCE_DEFINITION_ANCHOR|LEGACY_TEMPLATE_ASSUMPTION_EXACT_APPROVED_INPUT/u);
 });
 test('lost declared context consumer is not replaced with only quantity formulas',()=>{
   const s=setup(),c=s.input.config.binding.retainParentBindings!.capturedParent,p=c.parameters.find(p=>p.parameter_id==='source_prompt')!;
   p.truth_metadata.resource_branch_consumers=p.truth_metadata.resource_branch_consumers.slice(1);rehash(s);
   assert.throws(()=>guard(s.input),/LEGACY_TEMPLATE_ASSUMPTION_EXACT_APPROVED_INPUT/u);
 });
 test.each(['required','default_value','value_type'])('an unclassified old null context cannot become an unapproved quantity via %s',field=>{
   const s=setup(),c=s.input.config.binding.retainParentBindings!.capturedParent,p=c.parameters.find(p=>p.parameter_id==='project_location')!;
   p[field]=field==='required'?true:field==='default_value'?'1':'decimal';rehash(s);assert.throws(()=>guard(s.input),/CAPTURE_BASELINE_SOURCE_KEYS/u);
 });
 test('normal and locked snapshots require the whole pinned historical definition row',()=>{
   const s=setup();snapshot(s.input,s.readback);const changed=copy(s.readback);obj(changed.legacyApprovedSourceDefinition).definition_sha256='0'.repeat(64);
   assert.throws(()=>locked(s.input,s.readback,changed),/APPROVED_SOURCE_DEFINITION_DRIFT/u);
 });
 test('old formula and payment guards remain active after historical input admission',()=>{
   const s=setup(),formulas=s.next.formulas.map((f,i)=>i?f:{...f,expression_source:'77'});
   assert.throws(()=>prepare(s.input,{...s.next,formulas}),/OLD_FORMULA_SEMANTICS_DRIFT/u);
 });
 test('ordinary Config invokes the real retained representative with exact sources and all45 original rows',async()=>{
   const s=setup(),captured=s.config.binding.retainParentBindings!.capturedParent,before=JSON.stringify(captured);
   const result=obj(await s.config.verifyCore()),retained=obj(result.standardRetainedRepresentative);
   assert.equal(result.original45Preserved,true);assert.equal(result.wholeMethods,5);assert.equal(result.newFull,0);
   assert.equal(retained.oldResources,45);assert.equal(retained.sourceWitnessKind,'PURE_CONFIG_NOT_PUBLICATION_IDENTITY');
   assert(typeof retained.newBindings==='number'&&retained.newBindings>0);
   assert.equal(retained.expectedNormativeBindingCount,captured.bindings.length+retained.newBindings);
   assert(typeof retained.sourceWitnessSha256==='string'&&/^[0-9a-f]{64}$/u.test(retained.sourceWitnessSha256));
   assert.equal(retained.sourceFiles,s.config.sourcePaths.length);assert.equal(JSON.stringify(captured),before);
   assert.equal(result.normalLockedDbPreflight,'STILL_REQUIRED');
 });
 test('the real existing Config core acceptance independently replays legacy and five new methods',async()=>{
   const s=setup(),result=await s.config.verifyCore();assert.equal(result.original45Preserved,true);assert.equal(result.wholeMethods,5);
 });
 test.each([true,false])('historical metadata requires an additional exact PG verdict: %s',async verdict=>{
   const s=setup(),calls:{sql:string;args:readonly unknown[]|undefined}[]=[];
   const client={query:async(sql:string,args?:readonly unknown[])=>{calls.push({sql,args});return{rows:[{matches:calls.length===1?true:verdict}]};}} as unknown as Parameters<typeof roundTrip>[0];
   if(verdict)await roundTrip(client,s.input);else await assert.rejects(()=>roundTrip(client,s.input),/APPROVED_SOURCE_METADATA_LOSSLESS_ROUND_TRIP_REQUIRED/u);
   assert.equal(calls.length,2);assert.equal(calls[1]!.args?.[1],evidence(s).capturedSourceDefinition.id);
 });
});
