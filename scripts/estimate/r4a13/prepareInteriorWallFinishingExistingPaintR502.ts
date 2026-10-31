// Staged config only. No process, DB connection, writer or publisher runs on import.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import bundle from '../../../data/estimate-benchmarks/source-packs/interior-wall-finishing-existing-paint-composite-r502.json';
import {interiorWallFinishingGroupDefinitionR502,interiorWallFinishingGroupPackR502 as subject,
 interiorWallCementParameterR502 as p,interiorWallCementRowR502 as r} from '../../../src/lib/estimate/v4/interiorWallFinishingGroupR502';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {masterRetainedParentCaptureSha256R1,type MasterRetainedParentCaptureR1,type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {validateIndependentCompletenessMapReferences,resolveMasterSingleDefinitionBindingRowIds,resolveMasterSingleDefinitionBindingApplicabilityByRowId,
 type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';

type Json=Record<string,any>;
const copy=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const sha=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
const stop=(code:string):never=>{throw Error('WALL_FINISH_EXISTING_PAINT_R502:'+code);};
const same=(a:unknown,b:unknown)=>estimateDeterministicHash(a)===estimateDeterministicHash(b);
export const interiorWallFinishBundlePathR502='data/estimate-benchmarks/source-packs/interior-wall-finishing-existing-paint-composite-r502.json';
export const interiorWallFinishBundleShaR502='8439b37ecd177d26565b40e4be753e20c9fe0cc3bca93399b6652bf7b72e8035';
export const interiorWallFinishStagedBundleR502=bundle;
const stopCode='INTERIOR_WALL_FINISH_EXISTING_PAINT_R502';
const selected={kind:'equals',parameterId:bundle.selectorId,value:bundle.selectedTechnology};
const off={kind:'literal',value:false};

/** Build only exact source declarations understood by the existing retained guard.
 * Missing unregistered inputs never receive an invented source or fixture opt-in. */
function legacyDeclaration(c:MasterRetainedParentCaptureR1):MasterRetainParentBindingsR1['legacyTemplateAssumptionSources']|undefined{
 const keys=new Set(c.normativeSources.map(s=>s.source_key));
 const missing=Object.fromEntries(Object.entries(c.baseline.normative_source_ids as Record<string,string[]>).flatMap(([id,sources])=>{
  const absent=sources.filter(key=>!keys.has(key));return absent.length?[[id,absent]]:[];}));
 if(!Object.keys(missing).length)return undefined;
 const templateId=c.definition.source_metadata?.templateId;
 for(const [id,sources]of Object.entries(missing)){
  const param=c.parameters.find(v=>v.parameter_id===id),binding=param?.truth_metadata?.provenance?.approvedTemplateBinding;
  if(typeof templateId!=='string'||!same(sources,['r555-source:'+templateId])||c.baseline.input_classification[id]!=='ASSUMPTION'
   ||param?.truth_metadata?.value_source_role!=='VISIBLE_BASELINE_ASSUMPTION'||!binding
   ||binding.baselineId!==c.baseline.id||binding.parameterId!==id||!same(binding.value,c.baseline.input_values[id]))
   stop('UNREGISTERED_CAPTURED_SOURCE_NOT_AN_APPROVED_LEGACY_TEMPLATE:'+id);
 }
 return{contract:'master-retained-legacy-template-assumptions/r1',templateId,parameterSources:missing};
}

/** Uses the accepted subject factory unchanged; all new arithmetic remains in
 * that factory and the one canonical core/effective purchase balance. */
export function prepareInteriorWallFinishingExistingPaintDraftR502(captured:MasterRetainedParentCaptureR1){
 const c=copy(captured);
 assert.equal(masterRetainedParentCaptureSha256R1(c),bundle.capturedParentSha256,'R502_EXACT_R623_PARENT_SHA');
 assert.equal(c.definition.catalog_id,bundle.catalogId);
 assert.deepEqual([c.parameters.length,c.formulas.length,c.resources.length],bundle.expectedParentShape);
 if(c.definition.source_metadata.retainedParentBindingSuccessorV1||c.definition.source_metadata.retainedParentBindingContinuationV1)
  stop('EXISTING_SUCCESSOR_SLOT_REQUIRES_SEPARATE_EXACT_REVIEW');
 const raw=interiorWallFinishingGroupDefinitionR502();
 assert.equal(raw.parameters.length,bundle.rawBranchParameters);assert.equal(raw.resources.length,bundle.rawBranchRows);
 assert.equal(raw.ordinaryParameterIds.length,4);assert.deepEqual(raw.runtimeInput,{});
 const primaryByKey=new Map(bundle.primaryEvidence.map(e=>[e.id,e]));
 const rules=new Map(bundle.independentRowRules.map(rule=>[r(rule[0]!),rule]));
 assert.equal(rules.size,35);assert.deepEqual([...rules.keys()].sort(),raw.resources.map(row=>row.row_id).sort());
 for(const rule of bundle.independentRowRules)assert(primaryByKey.has(rule[4]!),'R502_PRIMARY_EVIDENCE_KEY');
 const selector={parameter_id:bundle.selectorId,ordinal:c.parameters.length,value_type:'enum',unit_id:null,
  title_ru:'Выбранная технология отделки',required:false,default_value:null,constraints_json:{values:[bundle.selectedTechnology]},
  truth_metadata:{contract:bundle.contract,semantic_parameter_key:bundle.contract+':selected-technology',visibility_role:'INTERNAL_ONLY',
   value_source_role:'BACKEND_DERIVED',runtime_profile_value:true,runtime_profile_classification:'RUNTIME_STRUCTURAL_DEFAULT',
   source_confirmation_required:false,provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL',physicalMethodFixedByPublicWork:true,
    publicSelectedWorkTitleRu:subject.titleRu,noLegacyPublicChoice:true},guide:{guide_kind:'PROJECT_DEFINED',guide_validation_policy:'MANDATORY_BLOCK',
    guide_short_ru:'Технология закреплена выбранной работой: финишная отделка уже ровной цементной штукатурки.',
    source_role:'BACKEND_DERIVED',source_document:bundle.sourceKey,source_snapshot_hash:interiorWallFinishBundleShaR502,
    source_locator:bundle.locatorKey,guide_version:bundle.contract,verified_at:subject.verifiedAt,applicability:subject.physicalScopeRu}}};
 const newParameters:Json[]=[selector,...raw.parameters.map(parameter=>({...copy(parameter),truth_metadata:{...copy(parameter.truth_metadata),
  source_confirmation_required:false,guide:{...copy(parameter.truth_metadata.guide as Json),source_document:bundle.sourceKey,
   source_snapshot_hash:interiorWallFinishBundleShaR502,source_locator:bundle.locatorKey,guide_version:bundle.contract}}}))];
 const oldIds=new Set(c.parameters.map(v=>v.parameter_id));
 assert(newParameters.every(v=>!oldIds.has(v.parameter_id)),'R502_NEW_PARAMETER_ID_COLLISION');
 const nextParameterOrdinal=Math.max(...c.parameters.map(v=>Number(v.ordinal)))+1;
 const parameters:Json[]=[...c.parameters.map(parameter=>({...parameter,required:false,constraints_json:{...parameter.constraints_json,requiredWhen:off},
  truth_metadata:{...parameter.truth_metadata,visible_when:off}})),...newParameters.map((parameter,index)=>({...parameter,ordinal:nextParameterOrdinal+index}))]
  .sort((left:Json,right:Json)=>left.ordinal-right.ordinal);
 const newResources:Json[]=raw.resources.map(row=>{const rule=rules.get(row.row_id)!,e=primaryByKey.get(rule[4]!)!;
  const{row_sha256:_hash,...body}=copy(row);
  const changed={...body,inclusion_ast:{kind:'and',operands:[selected,row.inclusion_ast]},source_metadata:{...row.source_metadata,
   sourceId:bundle.sourceKey,normId:bundle.normId,source_title:subject.titleRu+' — составная карта первоисточников',
   source_document_version:bundle.contract,artifact_sha256:interiorWallFinishBundleShaR502,official_url:null,
   exact_locator:bundle.locatorKey+':'+rule[0],primaryEvidenceKey:e.id,primaryArtifactSha256:e.sha256,primaryEvidenceUrl:e.url,
   normativeTrace:[{sourceId:bundle.sourceKey,normId:bundle.normId+':'+rule[0],sourceDocument:'Составная карта первоисточников R502',
    sourceLocator:bundle.locatorKey+':'+rule[0],sourceSnapshotHash:interiorWallFinishBundleShaR502,primaryEvidenceKey:e.id,
    primaryArtifactSha256:e.sha256,primaryDocument:e.title,primaryLocator:e.locatorRu,primaryEvidenceUrl:e.url}],
   registeredPrimarySourceUuidClaimed:false,automaticGenericPriceInheritanceAllowed:false,engineeringAcceptance:false,
   sourceBundleOperationMap:true,selectedScopeQuantitiesComplete:true}};
  return{...changed,row_sha256:estimateDeterministicHash(changed)};
 });
 const resources:Json[]=[...c.resources.map(row=>{const{row_sha256:_hash,...body}=row;
  const changed={...body,inclusion_ast:{kind:'and',operands:[off,row.inclusion_ast]}};
  return{...changed,row_sha256:estimateDeterministicHash(changed)};}),...newResources].map((row:Json,index)=>{
   const{row_sha256:_hash,...body}=row,changed={...body,ordinal:index<c.resources.length?row.ordinal:index};
   return{...changed,row_sha256:estimateDeterministicHash(changed)};});
 const formulas=[...c.formulas,...raw.formulas.map(f=>({...copy(f),ast_sha256:estimateDeterministicHash(f.ast)}))];
 assert.equal(parameters.length,185);assert.equal(formulas.length,151);assert.equal(resources.length,151);
 assert.equal(new Set(parameters.map(v=>v.parameter_id)).size,185);assert.equal(new Set(formulas.map(v=>v.formula_id)).size,151);
 assert.equal(new Set(resources.map(v=>v.row_id)).size,151);
 const newParameterSources:MasterRetainParentBindingsR1['newParameterSources']=Object.fromEntries(newParameters.map(parameter=>{
  const role=String(parameter.truth_metadata.value_source_role),effective=parameter.truth_metadata.effective_resource_quantity_v1;
  return[parameter.parameter_id,{kind:role.includes('DERIVED')?'DERIVED':'KNOWN',sourceIds:effective?[]:[bundle.sourceKey]}];}));
 const legacy=legacyDeclaration(c);
 const retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256:bundle.capturedParentSha256,newParameterSources,
  ...(legacy?{legacyTemplateAssumptionSources:legacy}:{})};
 const boundRowIds=bundle.paidOwnerKeys.map(key=>r(key));
 assert.deepEqual(newResources.filter(row=>row.resource_graph.costTreatment==='OWN_COST').map(row=>row.row_id).sort(),[...boundRowIds].sort());
 const applicability={scope_class:'SELECTED_EXISTING_CEMENT_PLASTER_FINISH',selectedTechnology:bundle.selectedTechnology,
  sourceBundleSha256:interiorWallFinishBundleShaR502,primaryEvidenceKeys:bundle.primaryEvidence.map(e=>e.id),
  retainedParentCaptureSha256:bundle.capturedParentSha256,ordinaryObjectFactBudget:4,engineeringAcceptance:false,selectedScopeQuantitiesComplete:true};
 const applicabilityByRowId=Object.fromEntries(boundRowIds.map(rowId=>{const rule=rules.get(rowId)!;return[rowId,{...applicability,
  operationId:rule[1],quantityRule:rule[3],primaryEvidenceKey:rule[4],unitId:rule[2],formulaId:r('formula:'+rule[0]),
  costOwnerRowId:rowId,automaticLegacyQuantityOrPriceTransfer:false}];}));
 const binding={rowId:boundRowIds[0]!,additionalRowIds:boundRowIds.slice(1),applicability,applicabilityByRowId,retainParentBindings:retained};
 const completenessMap={contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',
  generatedFromCurrentRows:false,evidenceSha256:interiorWallFinishBundleShaR502,evidenceReferences:[interiorWallFinishBundlePathR502,...bundle.primaryEvidence.map(e=>e.path)],
  retainedParentRowsAreNotNewNorms:c.resources.map(row=>row.row_id),entries:bundle.independentRowRules.map(rule=>({operationId:rule[1],expectedResourceId:rule[0],
   condition:'SELECTED_FINISH_ON_LEVEL_SOUND_CEMENT_PLASTER_WITH_MEASURED_LAYER',sourceId:bundle.sourceKey,primaryEvidenceKey:rule[4],unitId:rule[2],quantityRule:rule[3],
   formulaId:r('formula:'+rule[0]),resolution:{kind:rule[5],rowId:r(rule[0]!),...(rule[5]==='INCLUDED_COMPONENT_ROW'?{parentRowId:r('whole-work')}:{})}}))};
 const oldRuntime:Json={},oldClasses:Record<string,'NORMATIVE'|'ASSUMPTION'|'DERIVED'|'RUNTIME_STRUCTURAL_DEFAULT'>={},oldSources:Record<string,string[]>={};
 for(const [id,classification]of Object.entries(c.baseline.input_classification)){
  if(classification==='VALIDATION_FIXTURE')continue;
  if(!Object.hasOwn(c.baseline.input_values,id))stop('OLD_NONFIXTURE_CLASS_HAS_NO_BASELINE_VALUE:'+id);
  if(!['NORMATIVE','ASSUMPTION','DERIVED','RUNTIME_STRUCTURAL_DEFAULT'].includes(String(classification)))stop('OLD_CLASS_UNSUPPORTED:'+id);
  oldRuntime[id]=copy(c.baseline.input_values[id]);oldClasses[id]=classification as typeof oldClasses[string];oldSources[id]=copy(c.baseline.normative_source_ids[id]);
 }
 return{capture:c,parameters,formulas,resources,newParameters,newResources:resources.slice(c.resources.length),binding,completenessMap,ordinaryParameterIds:[...raw.ordinaryParameterIds],
  runtimeProfileInput:{...oldRuntime,[bundle.selectorId]:bundle.selectedTechnology},runtimeProfileClassification:{...oldClasses,[bundle.selectorId]:'RUNTIME_STRUCTURAL_DEFAULT' as const},
  runtimeProfileSourceIds:{...oldSources,[bundle.selectorId]:[bundle.sourceKey]},oldBaselineInputValues:copy(c.baseline.input_values),
  oldBaselineClassification:copy(c.baseline.input_classification),oldBaselineSourceArrays:copy(c.baseline.normative_source_ids)};
}

export function readInteriorWallFinishPinnedParentR502(){
 const bytes=readFileSync(bundle.parentFixturePath);assert.equal(sha(bytes),bundle.parentFixtureSha256,'R502_PARENT_FIXTURE_BYTES');
 const fixture=JSON.parse(bytes.toString('utf8')) as Json;
 assert.equal(fixture.producerCaptureSha256,bundle.producerCaptureSha256);assert.equal(fixture.protectedSnapshotCopied,false);
 assert.equal(fixture.parent.capturedParentSha256,bundle.capturedParentSha256);
 return fixture;
}

/** Descriptor for the existing sole publisher. ROOT supplies/rechecks the actual
 * prepared pair; current DB rows/source absence/UUIDs/locks remain publisher work. */
export function prepareInteriorWallFinishingExistingPaintR502(input:Readonly<{parentReleaseId?:string;parentSearchReleaseId?:string;outputRoot?:string;currentReleasePath?:string}>={}):MasterSingleDefinitionSuccessorConfig{
 assert.equal(sha(readFileSync(interiorWallFinishBundlePathR502)),interiorWallFinishBundleShaR502,'R502_BUNDLE_BYTES');
 assert.equal(sha(readFileSync(bundle.subjectPackPath)),bundle.subjectPackSha256,'R502_ACCEPTED_SUBJECT_PACK');
 assert.equal(sha(readFileSync(bundle.subjectFactoryPath)),bundle.subjectFactorySha256,'R502_ACCEPTED_SUBJECT_FACTORY');
 for(const e of bundle.primaryEvidence)assert.equal(sha(readFileSync(e.path)),e.sha256,'R502_PRIMARY_ARTIFACT:'+e.id);
 const masterPath='C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_30_PRODUCTION_GRADE_2026-10-30.txt';
 const masterSha256='f75540ef09597a4d167e58f6c9cefa07e0e9e864fa5d3b4eb47cadaaaaa3f955';
 assert.equal(sha(readFileSync(masterPath)),masterSha256,'R502_MASTER_2_30');
 const fixture=readInteriorWallFinishPinnedParentR502(),d=prepareInteriorWallFinishingExistingPaintDraftR502(fixture.parent.capturedParent),c=d.capture;
 const facts=(area:number,puttyMm:number)=>({[p(subject.areaId)]:area,[p(subject.baseId)]:subject.baseReadyRu,
  [p(subject.siteId)]:subject.siteReadyRu,[p(subject.puttyThicknessId)]:puttyMm});
 const control=facts(20.1,2);
 const compile=(values:Json)=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:bundle.catalogId,compilerVersion:bundle.contract,
  primaryMeasureParameterId:p(subject.areaId),parameterDefinitions:d.parameters as CanonicalEstimateCompileCoreInput['parameterDefinitions'],
  formulaDefinitions:d.formulas as CanonicalEstimateCompileCoreInput['formulaDefinitions'],resourceDefinitions:d.resources as CanonicalEstimateCompileCoreInput['resourceDefinitions'],
  submittedParameters:values,confirmedParameters:d.runtimeProfileInput,priceItems:[],currencyCode:'KGS',maximumResourceRows:200,hashJson:async value=>estimateDeterministicHash(value)});
 const verifyCore=async()=>{
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:d.completenessMap,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
  // No fake DB locator/source UUID is allocated here: these helpers only need
  // the cardinality of the one locator; real rows are generated by the publisher.
  const locatorCardinality=['ONE_COMPOSITE_LOCATOR_CARDINALITY_ONLY'];
  assert.equal(resolveMasterSingleDefinitionBindingRowIds({binding:d.binding},d.resources,locatorCardinality).length,4);
  assert.equal(Object.keys(resolveMasterSingleDefinitionBindingApplicabilityByRowId({binding:d.binding},d.resources,locatorCardinality)).length,4);
  const passiveKeys=['included-water','included-tools','included-protection','included-ppe','included-local-supply-cleanup','check-base','check-site'] as const;
  type Result=Awaited<ReturnType<typeof compile>>;
  const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const assertSelectedQuantities=(needs:Result['preliminaryNeeds'])=>
   assert(!needs.some(need=>need.selected&&(need.need_state==='QUANTITY_REQUIRED'||need.quantity===null)),'R502_SELECTED_QUANTITY_REQUIRED');
  const assertPassiveHolds=(result:Result)=>{
   assert.deepEqual(result.preliminaryNeeds.map(need=>need.row_id).sort(),passiveKeys.map(key=>r(key)).sort(),'R502_EXACT_PASSIVE_SOURCE_HOLDS');
   for(const key of passiveKeys){
    const need=result.preliminaryNeeds.find(need=>need.row_id===r(key));assert(need);
    assert.equal(need.selected,false);assert.equal(need.need_state,'CONDITION_REQUIRED','R502_PASSIVE_SEMANTIC_SCOPE_NOT_QUANTITY_QUESTION');
    assert.equal(need.quantity,null,'R502_PASSIVE_QUANTITY_MUST_REMAIN_UNKNOWN');assert.equal(need.unit_id,'');assert.equal(need.unit_price,null);
    assert.equal(need.procurement_eligible,false);assert.deepEqual(need.missing_parameter_ids,[],'R502_PASSIVE_INTERNAL_PARAMETER_NOT_USER_QUESTION');
    assert.equal(result.parameters[p(key.replaceAll('-','_'))]??null,null);
    assert(!result.rows.some(row=>row.row_id===need.row_id),'R502_PASSIVE_SCOPE_MUST_NOT_BECOME_PAID_RESOURCE');
    const trace=need.calculation_trace;assert(record(trace));assert.equal(trace.preliminaryNeed,true);
    assert.notEqual(trace.manualQuantityOverride,true);const graph=trace.resourceGraph;assert(record(graph));
    assert.equal(graph.costTreatment,'INFORMATIONAL_SCOPE');
    const presentation=graph.publicResourcePresentationV1;assert(record(presentation));assert.equal(presentation.rowKind,'PROCESS_NOTE');
    const scope=graph.scopeRequirementV1,decision=graph.scopeRequirementDecisionV1;assert(record(scope));assert(record(decision));
    assert.deepEqual(decision.missingObjectFactParameterIds,[],'R502_PASSIVE_NO_MISSING_OBJECT_FACT');
    assert.equal(decision.numericNormAccepted,false);assert.equal(decision.separatePaymentAccepted,false);
    const parameter=d.parameters.find(parameter=>parameter.parameter_id===p(key.replaceAll('-','_')));assert(parameter);
    assert.equal(parameter.truth_metadata.visibility_role,'INTERNAL_ONLY');
    assert.equal(parameter.truth_metadata.value_source_role,'COMPILER_DERIVED_RESOURCE_QUANTITY');
    const authored=d.newResources.find(row=>row.row_id===need.row_id),rule=bundle.independentRowRules.find(rule=>rule[0]===key);assert(authored);assert(rule);
    assert.equal(authored.unit_id,'');assert.equal(authored.procurement_eligible,false);assert.equal(authored.source_metadata.engineeringAcceptance,false);
    assert.equal(rule[2],'');assert.equal(rule[5],'ROW');
    if(key.startsWith('included-')){
     assert.equal(authored.cost_owner_id,r('whole-work'));assert.equal(graph.parentCostOwnerId,r('whole-work'));
     assert.equal(graph.includedInResourceOwnerRowId,r('whole-work'));assert.equal(scope.kind,'INCLUDED');
     assert.deepEqual(scope.coveringRowIds,[r('whole-work')]);assert.equal(scope.costExclusionBreaksScopeV1,true);assert.equal(decision.status,'INCLUDED');
    }else{
     assert.equal(authored.cost_owner_id,need.row_id);assert.equal(graph.parentCostOwnerId,undefined);assert.equal(graph.includedInResourceOwnerRowId,undefined);
     assert.equal(scope.kind,'OBJECT_SCOPE');assert.deepEqual(scope.coveringRowIds,[]);assert.equal(scope.objectFactMode,'PROJECT_APPLICABILITY_ONLY');
     assert.equal(scope.objectFactParameterId,p(key==='check-base'?subject.baseId:subject.siteId));assert.equal(decision.status,'COMPLETED');
    }
   }
  };
  for(const expected of bundle.independentExpected){const result=await compile(facts(expected.area,expected.puttyMm));
   for(const material of subject.materials)for(const [index,suffix]of ['consumed','order','packages','remaining'].entries())
    assert.equal(Number(result.rows.find(row=>row.row_id===r(material.id+'-'+suffix))?.quantity),(expected as Json)[material.id][index]);
   assert.equal(Number(result.rows.find(row=>row.row_id===r('paint-putty-primer-workers'))?.quantity),expected.paintWorkersManH);
   assert.equal(result.rows.filter(row=>row.included_in_estimate).length,4);assert(result.rows.filter(row=>row.included_in_estimate).every(row=>row.unit_price===null));
   assert(!result.rows.some(row=>c.resources.some(old=>old.row_id===row.row_id)));
   assertSelectedQuantities(result.preliminaryNeeds);assertPassiveHolds(result);
   assert.equal(result.rows.length,28);
   assert.deepEqual(result.rows.filter(row=>row.included_in_estimate).map(row=>row.row_id).sort(),bundle.paidOwnerKeys.map(key=>r(key)).sort());
   for(const row of result.rows.filter(row=>row.included_in_estimate)){
    assert(row.quantity!==null&&Number.isFinite(Number(row.quantity)));assert(typeof row.unit_id==='string'&&row.unit_id.trim());assert.equal(row.unit_price,null);assert.equal(row.amount,null);
   }
   // Fault copies exercise the same guards, never Core or a saved/source value.
   assert.throws(()=>assertSelectedQuantities([{...result.preliminaryNeeds[0]!,selected:true}]),/R502_SELECTED_QUANTITY_REQUIRED/);
   assert.throws(()=>assertPassiveHolds({...result,preliminaryNeeds:result.preliminaryNeeds.map((need,index)=>index===0?{...need,quantity:'0'}:need)}),
    /R502_PASSIVE_QUANTITY_MUST_REMAIN_UNKNOWN/);
   assert.throws(()=>assertPassiveHolds({...result,preliminaryNeeds:result.preliminaryNeeds.map((need,index)=>index===0?{...need,need_state:'QUANTITY_REQUIRED' as const}:need)}),
    /R502_PASSIVE_SEMANTIC_SCOPE_NOT_QUANTITY_QUESTION/);
   assert.throws(()=>assertPassiveHolds({...result,preliminaryNeeds:result.preliminaryNeeds.map((need,index)=>index===0?{...need,missing_parameter_ids:[p('included_water')]}:need)}),
    /R502_PASSIVE_INTERNAL_PARAMETER_NOT_USER_QUESTION/);
  }
  const zero=await compile(facts(0,2));assert.equal(zero.rows.length,0);assert.equal(zero.preliminaryNeeds.length,0);
  return{status:'PASS_STAGED_EXISTING_PAINT_FINISH_SELECTED_CORE',shape:[185,151,151],retainedRows:116,newRows:35,newBoundOwners:4,
   ordinaryObjectFacts:4,technicalUserQuestions:0,pricesUnknownAreNull:true,engineeringAcceptance:false,published:false};
 };
 const{primaryMeasureSelectionV1:_oldSelection,...existingApplicability}=copy(c.definition.applicability??{});
 return{contract:bundle.contract,stopCode,applicationName:'interior-wall-finish-existing-paint-r502',expectedBranch:'codex/r4-a5-clean-08b18902',masterPath,masterSha256,
  parentReleaseId:input.parentReleaseId??fixture.pointer.definitionReleaseId,parentSearchReleaseId:input.parentSearchReleaseId??fixture.pointer.searchReleaseId,
  currentReleasePath:input.currentReleasePath??'data/estimate-benchmarks/r568-local-developer-canonical-release.json',
  outputRoot:input.outputRoot??'.release-runtime/r568/next-wave/interior-wall-ready-finish-r502/publication',
  sourcePaths:[bundle.subjectFactoryPath,'src/lib/estimate/v4/interiorWallFinishingGroupR502.test.ts',bundle.subjectPackPath,interiorWallFinishBundlePathR502,
   bundle.parentFixturePath,...bundle.primaryEvidence.map(e=>e.path),'scripts/estimate/r4a13/prepareInteriorWallFinishingExistingPaintR502.ts',
   'scripts/estimate/r4a13/prepareInteriorWallFinishingExistingPaintR502.test.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
   'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
   'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
   'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts','src/lib/estimate/backendPlatform/canonicalEstimateSha256.ts',
   'src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1.ts','src/lib/estimate/backendPlatform/canonicalEffectiveResourceQuantityV1.ts',
   'src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1.ts','src/lib/estimate/backendPlatform/formulaGraph.ts','src/lib/estimate/estimateDeterministicHash.ts'],
  catalogId:bundle.catalogId,sourceId:bundle.sourceKey,normId:bundle.normId,
  sourceMetadata:{source_title:subject.titleRu+' — составная карта первоисточников',source_authority:'Составитель GOX BUILD; паспорта изготовителей и нормы Кыргызстана перечислены отдельно. Это не новая официальная норма.',
   source_kind:bundle.sourceKind,official_url:null,artifact_sha256:interiorWallFinishBundleShaR502,
   exact_locator:bundle.locatorKey,use_restriction:subject.physicalScopeRu+' '+subject.wholeWorkScopeRu},
  parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,shortInput:control,
  acceptanceInput:{...d.oldBaselineInputValues,...control,...d.runtimeProfileInput},runtimeProfileInput:d.runtimeProfileInput,
  runtimeProfileClassification:d.runtimeProfileClassification,runtimeProfileSourceIds:d.runtimeProfileSourceIds,verifyCore,
  expectedParentShape:[170,116,116],benchmarkOrdinal:0,validationScenario:'EXISTING_PAINT_RETAINED_116_PLUS_READY_35_FOUR_FACT_FINISH',
  passport:{canonicalRuName:subject.titleRu,workKey:'plaster_paint_interior_paint_wall_paint_standard',physicalResultRu:subject.physicalScopeRu,
   includedScopeRu:[subject.wholeWorkScopeRu],excludedScopeRu:subject.excludedRu,independentCompletenessMap:d.completenessMap},
  applicability:{...existingApplicability,primaryMeasureParameterId:p(subject.areaId),selectedTechnology:bundle.selectedTechnology,
   ordinaryObjectFactBudget:4,retainedParentCaptureSha256:bundle.capturedParentSha256,engineeringAcceptance:false,selectedScopeQuantitiesComplete:true},
  binding:d.binding,locator:{key:bundle.locatorKey,payload:{kind:'PRIMARY_SOURCE_COMPOSITE_OPERATION_MAP_R502',artifactPath:interiorWallFinishBundlePathR502,
   artifactSha256:interiorWallFinishBundleShaR502,primaryEvidence:bundle.primaryEvidence,quantitativeRules:bundle.quantitativeRules,
   independentRowRules:bundle.independentRowRules,paidOwnerKeys:bundle.paidOwnerKeys,engineeringAcceptance:false,officialCompositeNormClaimed:false}},
  search:{primaryUom:'m2',canonicalNameRu:subject.titleRu,aliases:['финишная отделка цементных стен','цементная шпаклёвка и акриловая окраска стен'],
   shortScopeRu:subject.physicalScopeRu,keyDistinguishingParameters:d.ordinaryParameterIds,clarificationFields:d.ordinaryParameterIds,
   includedBoundaries:[subject.wholeWorkScopeRu],excludedBoundaries:subject.excludedRu,extraSearchTermsRu:'финишная отделка стены цементная шпаклевка грунтовка акриловая краска два слоя',
   sourceProvenance:{sourceBundle:bundle.sourceKey,artifactSha256:interiorWallFinishBundleShaR502,engineeringAcceptance:false,oldPhysicalAndPriceDataNotTransferred:true}},
  forbiddenAdjacentMatchers:[/canonical-work:[^:]+:.*_(?:small|medium|large)_area$/u],owner:'ROOT_SINGLE_INTEGRATOR',receiptFileStem:'interior_wall_finish_existing_paint_r502'};
}
