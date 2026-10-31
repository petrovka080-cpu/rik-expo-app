import {createHash} from 'node:crypto';
import type {Client} from 'pg';
import standard from '../../../data/estimate-benchmarks/fixtures/asphalt-level-existing-standard-r566-parent.json';
import historical from '../../../data/estimate-benchmarks/fixtures/asphalt-level-r566-historical-recipe-evidence.json';
import {asphaltLevelExistingStandardR566 as level,type AsphaltLevelCapturedParentR566} from '../../../src/lib/estimate/v4/asphaltLevelExistingStandardR566';
import {canonicalApprovedBaselineRuntimeParameters} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline';
import {compileFormulaGraph} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import {prepareAsphaltLevelExistingStandardDraftR566} from './prepareAsphaltLevelExistingStandardR566';
import {prepareStandardAsphaltCompactionMasterDraftR567} from './prepareStandardAsphaltCompactionMasterDraftR567';
import {buildMasterCapabilityMatrix,buildMasterScopeReadiness,validateMasterTypedPartialQuantityPreparationR1} from './prepareMasterSingleDefinitionSuccessorR1';
import {canonicalPublisherQuantityScopeIsConsistent,preflightCanonicalDefinitionPublishPlans,type CanonicalDefinitionPublishPlan} from './canonicalDefinitionPublisherR1';
import {validateMasterTypedPartialQuantityBasisR1,masterTypedPartialQuantityDependentRowsR1,
 assertMasterTypedPartialQuantityRegistryR1,type MasterTypedQuantityPayloadR1,type MasterTypedPartialQuantityBasisR1} from './masterTypedPartialQuantityBasisR1';

type Json=Record<string,any>;
const clone=<T>(x:T):T=>JSON.parse(JSON.stringify(x));
const levelId=(x:string)=>level.namespace+x;
function levelView(){
 const d=prepareAsphaltLevelExistingStandardDraftR566({capturedParent:standard.capturedParent as unknown as AsphaltLevelCapturedParentR566,
  capturedParentSha256:standard.capturedParentSha256,recipeParent:historical.capturedParent as unknown as AsphaltLevelCapturedParentR566,
  recipeParentSha256:historical.capturedParentSha256,parentReleaseId:standard.membership.release_id});
 return {passport:{partialQuantityBasis:d.partialQuantityBasis},binding:d.binding,parameterDefinitions:d.next.parameters,
  formulaDefinitions:d.next.formulas,resourceDefinitions:d.next.resources,
  acceptanceInput:{...d.parent.baseline.input_values,...d.facts,...d.next.runtimeProfileInput},runtimeProfileInput:d.next.runtimeProfileInput,
  runtimeProfileClassification:d.next.runtimeProfileClassification,runtimeProfileSourceIds:d.next.runtimeProfileSourceIds};
}
type View=ReturnType<typeof levelView>;
function payload(view:View|ReturnType<typeof prepareStandardAsphaltCompactionMasterDraftR567>['knownConfigFields']):MasterTypedQuantityPayloadR1{
 const b=view.passport.partialQuantityBasis!,r=view.binding.retainParentBindings!,classification=view.runtimeProfileClassification as Record<string,string>|undefined;
 return {parameters:clone(view.parameterDefinitions),formulas:clone(view.formulaDefinitions),resources:clone(view.resourceDefinitions),
  baseline:{input_values:{...view.acceptanceInput,...view.runtimeProfileInput},input_classification:Object.fromEntries(view.parameterDefinitions.map(p=>[
   p.parameter_id,classification?.[p.parameter_id]??'VALIDATION_FIXTURE'])),
   normative_source_ids:Object.fromEntries(view.parameterDefinitions.map(p=>[p.parameter_id,
    r.newParameterSources[p.parameter_id]?.sourceIds??r.capturedParent.baseline.normative_source_ids[p.parameter_id]??[]]))},
  passport:{decision:buildMasterScopeReadiness(undefined,view.resourceDefinitions,b),capability_matrix:buildMasterCapabilityMatrix(undefined,view.resourceDefinitions,b)}};
}
const basis=(p:MasterTypedQuantityPayloadR1):Json=>p.passport.decision.partialQuantityBasis;
function syncCapability(p:MasterTypedQuantityPayloadR1){p.passport.capability_matrix[2].partialQuantityBasis=clone(basis(p));}
const parameter=(p:MasterTypedQuantityPayloadR1,id:string)=>p.parameters.find(q=>q.parameter_id===id)!;
const asPlan=(p:MasterTypedQuantityPayloadR1,id='TEST_ONLY_TYPED_QUANTITY')=>({...p,definition:{catalog_id:id}} as unknown as CanonicalDefinitionPublishPlan);

test('real leveling metadata distinguishes seven unknown project quantities and their exact sixteen resource rows from absent norms',()=>{
 const view=levelView(),p=payload(view),b=basis(p);
 expect(b.kind).toBe('DEFERRED_PROJECT_QUANTITIES');expect(b.parameters.map((f:Json)=>f.parameterId)).toEqual(level.projectFactParameterIds.map(levelId));
 expect(b.parameters).toHaveLength(7);expect(b.resourceRowIds).toHaveLength(16);
 expect([...b.resourceRowIds].sort()).toEqual([
  'asphalt:delivery:ton-km','asphalt:delivery:truck-machine-hours','asphalt:quality:bitumen-application','asphalt:quality:layer-thickness',
  'asphalt:quality:density','asphalt:quality:smoothness','asphalt:quality:grade-slope','asphalt:document:work-journal',
  'asphalt:quality:material-passports','asphalt:document:delivery-register','asphalt:document:execution-set',
  'asphalt:organization:traffic-control','asphalt:mobilization:paver','asphalt:mobilization:roller','asphalt:mobilization:tar-sprayer',
  'asphalt:mobilization:tractor-brush'].map(levelId).sort());
 expect(b.source.sourceKey).toBe('kg_krer_27_06_019_02_2015');
 expect(b.source.artifactSha256).toBe('cd3d6735d1bbdda5957945b7682f032785c76624b54a435edfe5d2ef5e107161');
 expect(p.parameters.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM')).toEqual([]);
 expect(validateMasterTypedPartialQuantityPreparationR1(view)).toEqual([]);expect(validateMasterTypedPartialQuantityBasisR1(p)).toEqual([]);
 expect(canonicalPublisherQuantityScopeIsConsistent(p)).toBe(true);
 for(const proof of b.parameters){expect(parameter(p,proof.parameterId).default_value).toBeNull();
  expect(p.baseline.input_values).not.toHaveProperty(proof.parameterId);expect(canonicalApprovedBaselineRuntimeParameters(p.baseline)).not.toHaveProperty(proof.parameterId);}
 expect(p.passport.decision).toMatchObject({quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_PROJECT_QUANTITIES',engineeringAcceptance:false});
});

test('real compaction descriptor proves seven source-backed assumptions, twenty-five profile rows and two actual facts for ten separate service rows',()=>{
 const cfg=prepareStandardAsphaltCompactionMasterDraftR567().knownConfigFields,p=payload(cfg),b=basis(p);
 expect(validateMasterTypedPartialQuantityPreparationR1(cfg)).toEqual([]);expect(validateMasterTypedPartialQuantityBasisR1(p)).toEqual([]);
 expect(b.profileId).toBe('THREE_ROLLER_PRELIMINARY_R2');expect(b.sourceSchemaVersion).toBe('rik-expo-app.s26-4.asphalt-compaction-source-pack.v2');
 expect(createHash('sha256').update(b.sourceArtifactUtf8,'utf8').digest('hex')).toBe('6afe7ab524d6f77db97a0ee6a01fc6779c9db6b7373621f97403afa89c976711');
 expect(b.assumptions.map((a:Json)=>[a.sourceParameterId,a.value])).toEqual([
  ['roller_speed_km_h',4.8],['breakdown_coverages',4],['intermediate_coverages',2],['finish_coverages',2],
  ['utilization_factor',0.8],['crew_person_count',4],['acceptance_lot_m2',1000]]);
 const profileRows=masterTypedPartialQuantityDependentRowsR1(p,b.assumptions.map((a:Json)=>a.parameterId));
 expect(profileRows).toHaveLength(25);expect(b.projectQuantities.resourceRowIds).toHaveLength(10);expect(b.resourceRowIds).toHaveLength(35);
 expect(profileRows.filter(id=>b.projectQuantities.resourceRowIds.includes(id))).toEqual([]);
 expect([...profileRows].sort()).toEqual([
  'rc09:asphalt_compaction_breakdown_roller','rc09:asphalt_compaction_intermediate_roller','rc09:asphalt_compaction_finish_roller','rc09:asphalt_compaction_crew',
  'asphalt-compaction:included:operator:breakdown','asphalt-compaction:included:operator:intermediate','asphalt-compaction:included:operator:finish',
  'asphalt-compaction:included:labor:road-worker','asphalt-compaction:included:fuel-fluids:breakdown','asphalt-compaction:included:wetting-water:breakdown',
  'asphalt-compaction:included:scrapers:breakdown','asphalt-compaction:included:fuel-fluids:intermediate','asphalt-compaction:included:tire-wetting:intermediate',
  'asphalt-compaction:included:fuel-fluids:finish','asphalt-compaction:included:wetting-water:finish','asphalt-compaction:included:scrapers:finish',
  'asphalt-compaction:quality:temperature-window','asphalt-compaction:quality:rolling-pattern','asphalt-compaction:quality:main-mat-density',
  'asphalt-compaction:quality:joint-edge-density','asphalt-compaction:quality:smoothness-marks','asphalt-compaction:quality:visual-defects',
  'asphalt-compaction:quality:full-coverage','asphalt-compaction:quality:instrument-readiness','asphalt-compaction:document:quality-protocols'].sort());
 expect([...b.projectQuantities.resourceRowIds].sort()).toEqual([
  'asphalt-compaction:organization:work-zone-control','asphalt-compaction:included:traffic-cones','asphalt-compaction:included:traffic-barriers',
  'asphalt-compaction:included:temporary-signs','asphalt-compaction:included:flagger','asphalt-compaction:included:ppe','asphalt-compaction:included:safety-briefing',
  'asphalt-compaction:mobilization:breakdown-roller','asphalt-compaction:mobilization:intermediate-roller','asphalt-compaction:mobilization:finish-roller'].sort());
 expect(b.projectQuantities.parameters.map((f:Json)=>f.parameterId)).toEqual(['r567_compaction_traffic_control_setup_count','r567_compaction_mobilization_count_per_unique_machine']);
 for(const id of [b.primaryMeasureParameterId,...b.projectQuantities.parameters.map((f:Json)=>f.parameterId)]){
  expect(parameter(p,id).default_value).toBeNull();expect(canonicalApprovedBaselineRuntimeParameters(p.baseline)).not.toHaveProperty(id);
 }
 // This is the actual publisher transformation, not permission to trust bare defaults.
 for(const q of p.parameters)q.default_value=null;
 expect(canonicalPublisherQuantityScopeIsConsistent(p)).toBe(true);expect(p.passport.decision.engineeringAcceptance).toBe(false);
});

test.each([
 ['role',(p:MasterTypedQuantityPayloadR1)=>{parameter(p,basis(p).parameters[0].parameterId).truth_metadata.value_source_role='UNRESOLVED_APPLICATION_NORM';}],
 ['consumer role',(p:MasterTypedQuantityPayloadR1)=>{parameter(p,basis(p).parameters[0].parameterId).truth_metadata.provenance.consumer_input_role_v1='APPLICATION_TECHNICAL';}],
 ['default',(p:MasterTypedQuantityPayloadR1)=>{parameter(p,basis(p).parameters[0].parameterId).default_value=1;}],
 ['runtime value',(p:MasterTypedQuantityPayloadR1)=>{const id=basis(p).parameters[0].parameterId;p.baseline.input_values[id]=1;p.baseline.input_classification[id]='ASSUMPTION';}],
 ['QA fixture as norm',(p:MasterTypedQuantityPayloadR1)=>{const id=basis(p).parameters[1].parameterId;p.baseline.input_values[id]=1000;p.baseline.input_classification[id]='NORMATIVE';}],
 ['QA fixture as completed project fact',(p:MasterTypedQuantityPayloadR1)=>{const id=basis(p).parameters[1].parameterId;p.baseline.input_values[id]=1000;p.baseline.input_classification[id]='VALIDATION_FIXTURE';}],
 ['guide hash',(p:MasterTypedQuantityPayloadR1)=>{parameter(p,basis(p).parameters[0].parameterId).truth_metadata.guide.source_snapshot_hash='0'.repeat(64);}],
 ['source key',(p:MasterTypedQuantityPayloadR1)=>{p.baseline.normative_source_ids[basis(p).parameters[0].parameterId]=['invented-source'];}],
 ['missing row',(p:MasterTypedQuantityPayloadR1)=>{basis(p).resourceRowIds.pop();syncCapability(p);}],
 ['omitted fact and matching reduced rows',(p:MasterTypedQuantityPayloadR1)=>{basis(p).parameters.pop();basis(p).resourceRowIds=masterTypedPartialQuantityDependentRowsR1(p,basis(p).parameters.map((f:Json)=>f.parameterId));syncCapability(p);}],
 ['extra row',(p:MasterTypedQuantityPayloadR1)=>{basis(p).resourceRowIds.push(p.resources[0].row_id);syncCapability(p);}],
 ['formula witness',(p:MasterTypedQuantityPayloadR1)=>{p.formulas[p.formulas.length-1].input_parameter_ids=[];}],
 ['FULL erasure',(p:MasterTypedQuantityPayloadR1)=>{p.passport.decision.quantityScope='FULL';p.passport.capability_matrix[2].status='GREEN';}],
 ['capability erasure',(p:MasterTypedQuantityPayloadR1)=>{delete p.passport.capability_matrix[2].partialQuantityBasis;}],
 ['old branch mixing',(p:MasterTypedQuantityPayloadR1)=>{p.passport.decision.unresolvedResourceRowIds=basis(p).resourceRowIds;}],
] as const)('rejects deferred project %s without reclassifying it as a norm',(_name,mutate)=>{
 const p=payload(levelView());mutate(p);expect(canonicalPublisherQuantityScopeIsConsistent(p)).toBe(false);
 expect(validateMasterTypedPartialQuantityBasisR1(p).length).toBeGreaterThan(0);
});

test.each([
 ['artifact bytes',(p:MasterTypedQuantityPayloadR1)=>{basis(p).sourceArtifactUtf8+='\n';}],
 ['artifact hash',(p:MasterTypedQuantityPayloadR1)=>{basis(p).source.artifactSha256='0'.repeat(64);}],
 ['profile version',(p:MasterTypedQuantityPayloadR1)=>{basis(p).profileId='THREE_ROLLER_UNREVIEWED';}],
 ['schema version',(p:MasterTypedQuantityPayloadR1)=>{basis(p).sourceSchemaVersion='unreviewed-v3';}],
 ['method version',(p:MasterTypedQuantityPayloadR1)=>{basis(p).method.version='unreviewed-method';}],
 ['source value',(p:MasterTypedQuantityPayloadR1)=>{basis(p).assumptions[0].value=4.9;}],
 ['guide snapshot',(p:MasterTypedQuantityPayloadR1)=>{parameter(p,basis(p).assumptions[0].parameterId).truth_metadata.guide.source_snapshot_hash='0'.repeat(64);}],
 ['guide version',(p:MasterTypedQuantityPayloadR1)=>{parameter(p,basis(p).assumptions[0].parameterId).truth_metadata.guide.guide_version='unreviewed';}],
 ['parameter classification',(p:MasterTypedQuantityPayloadR1)=>{parameter(p,basis(p).assumptions[0].parameterId).truth_metadata.runtime_profile_classification='NORMATIVE';}],
 ['baseline fixture',(p:MasterTypedQuantityPayloadR1)=>{p.baseline.input_classification[basis(p).assumptions[0].parameterId]='VALIDATION_FIXTURE';}],
 ['baseline normative',(p:MasterTypedQuantityPayloadR1)=>{p.baseline.input_classification[basis(p).assumptions[0].parameterId]='NORMATIVE';}],
 ['protected value',(p:MasterTypedQuantityPayloadR1)=>{parameter(p,basis(p).assumptions[0].parameterId).default_value=77;}],
 ['missing assumption',(p:MasterTypedQuantityPayloadR1)=>{basis(p).assumptions.pop();}],
 ['extra assumption',(p:MasterTypedQuantityPayloadR1)=>{basis(p).assumptions.push({...basis(p).assumptions[0],parameterId:'r567_compaction_work_journal_count',sourceParameterId:'work_journal_count'});}],
 ['missing project fact',(p:MasterTypedQuantityPayloadR1)=>{basis(p).projectQuantities.parameters.pop();}],
 ['missing service row',(p:MasterTypedQuantityPayloadR1)=>{basis(p).projectQuantities.resourceRowIds.pop();}],
 ['extra service row',(p:MasterTypedQuantityPayloadR1)=>{basis(p).projectQuantities.resourceRowIds.push(p.resources[0].row_id);}],
 ['missing profile dependency',(p:MasterTypedQuantityPayloadR1)=>{basis(p).resourceRowIds.pop();}],
 ['extra profile dependency',(p:MasterTypedQuantityPayloadR1)=>{basis(p).resourceRowIds.push(p.resources[0].row_id);}],
 ['method override',(p:MasterTypedQuantityPayloadR1)=>{p.baseline.input_values[basis(p).method.parameterId]='UNREVIEWED_PROFILE';}],
 ['service fixture leak',(p:MasterTypedQuantityPayloadR1)=>{p.baseline.input_classification[basis(p).projectQuantities.parameters[0].parameterId]='ASSUMPTION';}],
 ['primary measured fixture leak',(p:MasterTypedQuantityPayloadR1)=>{p.baseline.input_classification[basis(p).primaryMeasureParameterId]='ASSUMPTION';}],
 ['FULL erasure',(p:MasterTypedQuantityPayloadR1)=>{p.passport.decision.quantityScope='FULL';p.passport.capability_matrix[2].status='GREEN';}],
] as const)('rejects preliminary profile %s',(_name,mutate)=>{
 const p=payload(prepareStandardAsphaltCompactionMasterDraftR567().knownConfigFields);mutate(p);syncCapability(p);
 expect(canonicalPublisherQuantityScopeIsConsistent(p)).toBe(false);
});

test('collects independent field failures and rejects the same real config before preparation or publisher DB work',async()=>{
 const view=levelView(),p=payload(view),[first,second]=basis(p).parameters;
 parameter(p,first.parameterId).default_value=81.6;parameter(p,second.parameterId).truth_metadata.provenance.consumer_input_role_v1='APPLICATION_TECHNICAL';
 p.baseline.input_values[second.parameterId]=1000;p.baseline.input_classification[second.parameterId]='NORMATIVE';
 const errors=validateMasterTypedPartialQuantityBasisR1(p);
 expect(errors).toContain('TYPED_PARTIAL_QUANTITY_FACT_DEFAULT:'+first.parameterId);
 expect(errors).toContain('TYPED_PARTIAL_QUANTITY_FACT_ROLE:'+second.parameterId);
 expect(errors).toContain('TYPED_PARTIAL_QUANTITY_FACT_RUNTIME_DEFAULT:'+second.parameterId);
 expect(errors).toContain('TYPED_PARTIAL_QUANTITY_FACT_FIXTURE_CLASSIFICATION:'+second.parameterId);
 const query=jest.fn(()=>{throw Error('NO_DB_ALLOWED_IN_PURE_TEST');});
 await expect(preflightCanonicalDefinitionPublishPlans({query} as unknown as Client,[asPlan(p)])).rejects.toThrow('TYPED_PARTIAL_QUANTITY_FACT_DEFAULT');
 expect(query).not.toHaveBeenCalled();
 const bad=clone(view);bad.parameterDefinitions.find(q=>q.parameter_id===first.parameterId)!.default_value=81.6;
 expect(validateMasterTypedPartialQuantityPreparationR1(bad)).toContain('TYPED_PARTIAL_QUANTITY_FACT_DEFAULT:'+first.parameterId);
});

test('requires the existing registered-source guard input even for a pure-valid descriptor',async()=>{
 const query=jest.fn(()=>{throw Error('NO_DB_ALLOWED_IN_PURE_TEST');});
 await expect(preflightCanonicalDefinitionPublishPlans({query} as unknown as Client,[asPlan(payload(levelView()))])).rejects.toThrow('TYPED_QUANTITY_REGISTERED_SOURCE_REQUIRED');
 expect(query).not.toHaveBeenCalled();
});

test.each(['source hash','locator hash','locator payload','source key','profile ownership'] as const)('rejects registry %s drift against actual captured full rows',kind=>{
 const cfg=prepareStandardAsphaltCompactionMasterDraftR567().knownConfigFields,b=cfg.passport.partialQuantityBasis!,registry=cfg.binding.reuseExistingNormativeRegistry!;
 const snapshot:{newSources:Json[];newLocators:Json[]}={newSources:[clone(registry.source)],newLocators:clone(registry.locators) as Json[]};
 expect(()=>assertMasterTypedPartialQuantityRegistryR1(b,snapshot)).not.toThrow();
 if(kind==='source hash')snapshot.newSources[0]!.artifact_sha256='0'.repeat(64);
 if(kind==='locator hash')snapshot.newLocators[0]!.excerpt_sha256='0'.repeat(64);
 if(kind==='locator payload')snapshot.newLocators[0]!.locator={...snapshot.newLocators[0]!.locator,sourcePackSha256:'0'.repeat(64)};
 if(kind==='source key')snapshot.newSources[0]!.source_key='invented-source';
 if(kind==='profile ownership')snapshot.newSources[0]!.metadata={...snapshot.newSources[0]!.metadata,universalConsumptionClaimed:true};
 expect(()=>assertMasterTypedPartialQuantityRegistryR1(b,snapshot)).toThrow('TYPED_PARTIAL_QUANTITY_REGISTERED');
});

test('preserves old missing-application-norm and FULL quantity semantics independently of engineering acceptance',()=>{
 const ast=compileFormulaGraph('missing_norm'),model={parameters:[{parameter_id:'missing_norm',default_value:null,required:true,
  truth_metadata:{visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'}}}],
  formulas:[{formula_id:'f',ast:ast.ast,input_parameter_ids:ast.inputParameterIds}],resources:[{row_id:'r',formula_id:'f',resource_graph:{},inclusion_ast:{kind:'literal',value:true}}]};
 const p:MasterTypedQuantityPayloadR1={...model,baseline:{input_values:{}},passport:{decision:buildMasterScopeReadiness(['r'],model.resources),capability_matrix:buildMasterCapabilityMatrix(['r'],model.resources)}};
 expect(canonicalPublisherQuantityScopeIsConsistent(p)).toBe(true);
 expect(()=>buildMasterCapabilityMatrix([],model.resources)).toThrow('MASTER_LIMITED_SCOPE_REQUIRES_EXISTING_UNRESOLVED_RESOURCES');
 expect(()=>buildMasterCapabilityMatrix(['r'],model.resources,levelView().passport.partialQuantityBasis as MasterTypedPartialQuantityBasisR1)).toThrow('MASTER_TYPED_QUANTITY_CANNOT_MASK_MISSING_APPLICATION_NORMS');
 const measured=compileFormulaGraph('measured_area_m2');
 const complete:MasterTypedQuantityPayloadR1={parameters:[{parameter_id:'measured_area_m2',default_value:null,
  truth_metadata:{visibility_role:'USER_INPUT',value_source_role:'PROJECT_SPECIFIC_INPUT',provenance:{consumer_input_role_v1:'OBJECT_FACT'}}}],
  formulas:[{formula_id:'f',ast:measured.ast,input_parameter_ids:measured.inputParameterIds}],resources:model.resources,
  baseline:{input_values:{measured_area_m2:100},input_classification:{measured_area_m2:'VALIDATION_FIXTURE'}},
  passport:{decision:{...buildMasterScopeReadiness(undefined,model.resources),engineeringAcceptance:false},capability_matrix:buildMasterCapabilityMatrix(undefined,model.resources)}};
 expect(canonicalPublisherQuantityScopeIsConsistent(complete)).toBe(true);
});


import {prepareCt54ReferencePublicationR613} from './prepareCt54ReferencePublicationR613';
import {assembleMasterSingleDefinitionManagedRegistryCandidateR1,validateIndependentCompletenessMapReferences,validateMasterFormulaGraphConsistency} from './prepareMasterSingleDefinitionSuccessorR1';
import {makeMasterScopedNormativeRegistryCaptureR1} from './masterScopedNormativeRegistryPreimageR1';
function ordinaryCt54TypedView(){
 const config=prepareCt54ReferencePublicationR613({parentReleaseId:'TEST_ONLY_CURRENT_RELEASE',parentSearchReleaseId:'TEST_ONLY_SEARCH_RELEASE',
  currentReleasePath:'TEST_ONLY_REFERENCE_POINTER_COPY',selectedCurrentReleasePath:'TEST_ONLY_SELECTED_POINTER',referencePointerMode:'PREPARED_NOT_ACTIVE_COPY',outputRoot:'TEST_ONLY',expectedBranch:'TEST_ONLY',masterPath:'TEST_ONLY',masterSha256:'a'.repeat(64),
  currentDefinitionVersionId:'TEST_ONLY_DEFINITION',currentDefinitionSha256:'b'.repeat(64),approvedTemplateBaselineId:'TEST_ONLY_BASELINE',
  capturedParentPath:'TEST_ONLY_CAPTURE',capturedParentByteSha256:'c'.repeat(64),expectedParentShape:[19,91,91],
  verifyTargetPrecondition:async()=>{throw Error('TEST_ONLY_DO_NOT_WRITE');},verifyCore:async()=>({status:'TEST_ONLY_NOT_RUN'})});
 const candidate=assembleMasterSingleDefinitionManagedRegistryCandidateR1(config,{projectSourcePackage:null,projectSourcePackageSet:null}).retentionCandidate;
 const scope={artifactSha256:String(candidate.newSource.artifact_sha256),normId:config.normId,sourceKey:config.sourceId,
  generatedSourceId:candidate.newSource.id,generatedLocatorIds:candidate.newLocators.map(l=>l.id),generatedLocatorKeys:candidate.newLocators.map(l=>l.locator_key)};
 return {...config,capturedScopedNormativeRegistry:makeMasterScopedNormativeRegistryCaptureR1(scope,{sourceRows:[],locatorRows:[]})};
}
test('ordinary whole reference admits exact deferred project facts without fake retain and rejects missing raw evidence or missing-norm substitution',()=>{
 const v=ordinaryCt54TypedView();expect(validateMasterTypedPartialQuantityPreparationR1(v)).toEqual([]);
 // Exercise the exact first Master guard, not only the looser public composition audit.
 const referenceErrors=(map:unknown)=>validateIndependentCompletenessMapReferences({completenessMap:map,
  formulaDefinitions:v.formulaDefinitions,resourceDefinitions:v.resourceDefinitions,requireOperationBindings:true});
 expect(validateMasterFormulaGraphConsistency(v.formulaDefinitions)).toEqual([]);
 expect(referenceErrors(v.passport.independentCompletenessMap)).toEqual([]);
 const missingFormula=clone(v.passport.independentCompletenessMap) as Json;
 delete missingFormula.entries[0].formulaId;
 expect(referenceErrors(missingFormula)).toContain('ENTRY_0_FORMULA_REFERENCE');
 const wrongFormula=clone(v.passport.independentCompletenessMap) as Json;
 wrongFormula.entries[0].formulaId=v.formulaDefinitions[1]!.formula_id;
 expect(referenceErrors(wrongFormula)).toContain('ENTRY_0_ROW_FORMULA_MISMATCH');
 expect(Object.keys(v.runtimeProfileSourceIds??{}).every(id=>Object.hasOwn(v.runtimeProfileInput??{},id))).toBe(true);
 expect(Object.keys(v.runtimeProfileSourceIds??{})).toEqual(['ct54_reference_method']);
 expect(v.sourcePaths).toContain('scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.ts');
 for(const p of v.parameterDefinitions){
  const guide=p.truth_metadata.guide as Json;
  expect(guide.verified_at).toBe('2026-10-27T08:19:33Z');
  expect(guide.source_snapshot_hash).toBe('31f6a6651795aa722d845c3bff84255a8a34ce3170edf30356cd30c45eaa8640');
  expect(guide.guide_version).toBe('ct54-manual-reference-project-system/s2735-r608-v1');
  expect(guide.applicability).toContain('не подтверждение условий объекта');
 }
 expect(v.parameterDefinitions.filter(p=>p.truth_metadata.provenance?.consumer_input_role_v1==='OBJECT_FACT')).toHaveLength(7);

 expect(v.binding.retainParentBindings).toBeUndefined();expect(v.binding.reuseExistingNormativeRegistry).toBeUndefined();
 expect(v.passport.partialQuantityBasis?.kind).toBe('DEFERRED_PROJECT_QUANTITIES');
 const ids=(v.passport.partialQuantityBasis as Extract<MasterTypedPartialQuantityBasisR1,{kind:'DEFERRED_PROJECT_QUANTITIES'}>).parameters.map(p=>p.parameterId);
 expect(ids).toHaveLength(30);expect(ids.every(id=>!Object.hasOwn(v.acceptanceInput,id))).toBe(true);
 const missing={...v};delete (missing as Json).capturedScopedNormativeRegistry;
 expect(validateMasterTypedPartialQuantityPreparationR1(missing).join(',')).toContain('ORDINARY_SOURCE_CAPTURE_REQUIRED');
 const forged=clone(v);(forged.passport.partialQuantityBasis as Json).source.artifactSha256='f'.repeat(64);
 expect(validateMasterTypedPartialQuantityPreparationR1(forged).join(',')).toContain('REGISTERED_SOURCE_LOCATOR_ARTIFACT');
 const norm=clone(v);norm.parameterDefinitions[0]!.truth_metadata.value_source_role='UNRESOLVED_APPLICATION_NORM';
 expect(validateMasterTypedPartialQuantityPreparationR1(norm).join(',')).toContain('APPLICATION_NORM_CONFLICT');
});
