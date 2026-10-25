// Staged config only. No process, DB connection, writer or publisher runs on import.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import bundle from '../../../data/estimate-benchmarks/source-packs/interior-wall-finishing-existing-paint-composite-r502.json';
import originalProof from '../../../data/estimate-benchmarks/fixtures/interior-wall-finishing-original35-proof-r240.json';
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
export const interiorWallFinishBundleShaR502='c17eb80a6e08528dec3524d330b263cfead54bd0bbdc8cf3dea65f9de9a03e4e';
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
 assert.equal(rules.size,52);assert.deepEqual([...rules.keys()].sort(),raw.resources.map(row=>row.row_id).sort());
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
  source_confirmation_required:parameter.truth_metadata.value_source_role==='PROJECT_DOCUMENTATION',guide:{...copy(parameter.truth_metadata.guide as Json),source_document:bundle.sourceKey,
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
   sourceBundleOperationMap:true,selectedScopeQuantitiesComplete:false,physicalResourceCoverageComplete:false,sourceOnlyCandidateR240:true}};
  return{...changed,row_sha256:estimateDeterministicHash(changed)};
 });
 const resources:Json[]=[...c.resources.map(row=>{const{row_sha256:_hash,...body}=row;
  const changed={...body,inclusion_ast:{kind:'and',operands:[off,row.inclusion_ast]}};
  return{...changed,row_sha256:estimateDeterministicHash(changed)};}),...newResources].map((row:Json,index)=>{
   const{row_sha256:_hash,...body}=row,changed={...body,ordinal:index<c.resources.length?row.ordinal:index};
   return{...changed,row_sha256:estimateDeterministicHash(changed)};});
 const formulas=[...c.formulas,...raw.formulas.map(f=>({...copy(f),ast_sha256:estimateDeterministicHash(f.ast)}))];
 assert.equal(parameters.length,200);assert.equal(formulas.length,168);assert.equal(resources.length,168);
 assert.equal(new Set(parameters.map(v=>v.parameter_id)).size,200);assert.equal(new Set(formulas.map(v=>v.formula_id)).size,168);
 assert.equal(new Set(resources.map(v=>v.row_id)).size,168);
 const newParameterSources:MasterRetainParentBindingsR1['newParameterSources']=Object.fromEntries(newParameters.map(parameter=>{
  const role=String(parameter.truth_metadata.value_source_role),effective=parameter.truth_metadata.effective_resource_quantity_v1;
  return[parameter.parameter_id,{kind:role==='UNRESOLVED_APPLICATION_NORM'?'UNRESOLVED':role.includes('DERIVED')?'DERIVED':'KNOWN',sourceIds:role==='UNRESOLVED_APPLICATION_NORM'||effective?[]:[bundle.sourceKey]}];}));
 const legacy=legacyDeclaration(c);
 const retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256:bundle.capturedParentSha256,newParameterSources,
  ...(legacy?{legacyTemplateAssumptionSources:legacy}:{})};
 const boundRowIds=bundle.paidOwnerKeys.map(key=>r(key));
 assert.deepEqual(newResources.filter(row=>row.resource_graph.costTreatment==='OWN_COST').map(row=>row.row_id).sort(),[...boundRowIds].sort());
 const applicability={scope_class:'SELECTED_EXISTING_CEMENT_PLASTER_FINISH',selectedTechnology:bundle.selectedTechnology,
  sourceBundleSha256:interiorWallFinishBundleShaR502,primaryEvidenceKeys:bundle.primaryEvidence.map(e=>e.id),
  retainedParentCaptureSha256:bundle.capturedParentSha256,ordinaryObjectFactBudget:4,engineeringAcceptance:false,selectedScopeQuantitiesComplete:false};
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
 const masterPath='C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_16_2026-10-24.txt';
 const masterSha256='541bc82df10231ca885288a7937283729b08484bd8301a22cd57a7b5c221eb40';
 assert.equal(sha(readFileSync(masterPath)),masterSha256,'R502_MASTER_2_2');
 const fixture=readInteriorWallFinishPinnedParentR502(),d=prepareInteriorWallFinishingExistingPaintDraftR502(fixture.parent.capturedParent),c=d.capture;
 const facts=(area:number,puttyMm:number)=>({[p(subject.areaId)]:area,[p(subject.baseId)]:subject.baseReadyRu,
  [p(subject.siteId)]:subject.siteReadyRu,[p(subject.puttyThicknessId)]:puttyMm});
 const control=facts(20.1,2);
 const compileRaw=(values:Json,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={})=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:bundle.catalogId,compilerVersion:bundle.contract,
  primaryMeasureParameterId:p(subject.areaId),parameterDefinitions:d.parameters as CanonicalEstimateCompileCoreInput['parameterDefinitions'],
  formulaDefinitions:d.formulas as CanonicalEstimateCompileCoreInput['formulaDefinitions'],resourceDefinitions:d.resources as CanonicalEstimateCompileCoreInput['resourceDefinitions'],
  submittedParameters:values,confirmedParameters:d.runtimeProfileInput,rowOverrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:200,hashJson:async value=>estimateDeterministicHash(value)});
 let actualCoreCalls=0;
 const compile=async(values:Json,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={})=>{
  const number=++actualCoreCalls,dir=resolve(process.env.FINISH_R240_OUTCOMES??'.release-runtime/r240-source-only-outcomes');mkdirSync(dir,{recursive:true});
  writeFileSync(resolve(dir,`CORE_ENTRY_${number}.json`),JSON.stringify({number,submitted:values,rowOverrideIds:Object.keys(rowOverrides),testOnly:true},null,2));
  try{const result=await compileRaw(values,rowOverrides);writeFileSync(resolve(dir,`CORE_OUTCOME_${number}.json`),JSON.stringify({number,result},null,2));return result;}
  catch(error){writeFileSync(resolve(dir,`CORE_OUTCOME_${number}.json`),JSON.stringify({number,error:error instanceof Error?{name:error.name,message:error.message}:String(error)},null,2));throw error;}
 };
 const verifyCore=async()=>{
  assert.equal(bundle.catalogId,originalProof.catalogId);assert.equal(bundle.sourceKey,originalProof.sourceKey);
  assert.deepEqual(bundle.independentRowRules.slice(0,35),originalProof.independentRowRules,'R240_ORIGINAL_35_RULES_EXACT');
  assert.deepEqual(bundle.paidOwnerKeys,originalProof.paidOwnerKeys,'R240_ORIGINAL_FOUR_PAID_OWNERS_EXACT');
  assert.deepEqual(subject.materials,originalProof.materials,'R240_ORIGINAL_MATERIAL_RECORDS_EXACT');
  assert.deepEqual(subject.labour,originalProof.labour,'R240_ORIGINAL_LABOUR_RECORD_EXACT');
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:d.completenessMap,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
  // No fake DB locator/source UUID is allocated here: these helpers only need
  // the cardinality of the one locator; real rows are generated by the publisher.
  const locatorCardinality=['ONE_COMPOSITE_LOCATOR_CARDINALITY_ONLY'];
  assert.equal(resolveMasterSingleDefinitionBindingRowIds({binding:d.binding},d.resources,locatorCardinality).length,4);
  assert.equal(Object.keys(resolveMasterSingleDefinitionBindingApplicabilityByRowId({binding:d.binding},d.resources,locatorCardinality)).length,4);
  for(const expected of bundle.independentExpected){const result=await compile(facts(expected.area,expected.puttyMm));
   for(const material of subject.materials)for(const [index,suffix]of ['consumed','order','packages','remaining'].entries())
    assert.equal(Number(result.rows.find(row=>row.row_id===r(material.id+'-'+suffix))?.quantity),(expected as Json)[material.id][index]);
   assert.equal(Number(result.rows.find(row=>row.row_id===r('paint-putty-primer-workers'))?.quantity),expected.paintWorkersManH);
   for(const[key,quantity]of Object.entries(expected.normIncluded))
    assert.equal(Number(result.rows.find(row=>row.row_id===r(key))?.quantity),quantity,'R240_INCLUDED_SOURCE_QUANTITY:'+key);
   assert.equal(result.rows.filter(row=>row.included_in_estimate).length,4);assert(result.rows.filter(row=>row.included_in_estimate).every(row=>row.unit_price===null));
   assert(!result.rows.some(row=>c.resources.some(old=>old.row_id===row.row_id)));assert.deepEqual(result.preliminaryNeeds.filter(need=>need.need_state==='QUANTITY_REQUIRED').map(need=>need.row_id).sort(),subject.physicalKitR240.filter(item=>!['LOWER_BOUND','UPPER_BOUND'].includes(item.kind)).map(item=>r(item.id)).sort());
   assert.equal(Number(result.rows.find(row=>row.row_id===r('mixing-water-min'))?.quantity),expected.mixingWaterRangeL[0]);
   assert.equal(Number(result.rows.find(row=>row.row_id===r('mixing-water-max'))?.quantity),expected.mixingWaterRangeL[1]);
  }
  const priceFixture=bundle.finitePriceFixtureR240;
  const independentPrice=originalProof.finitePriceExpected;
  assert.equal(priceFixture.areaM2,independentPrice.areaM2);assert.equal(priceFixture.puttyMm,independentPrice.puttyMm);
  assert.deepEqual(priceFixture.pricesByResourceKey,independentPrice.pricesByResourceKey);
  assert.deepEqual(priceFixture.expectedAmounts,independentPrice.expectedAmounts);
  assert.equal(priceFixture.expectedTotalKgs,independentPrice.expectedTotalKgs);
  const priceOverrides:NonNullable<CanonicalEstimateCompileCoreInput['rowOverrides']>=Object.fromEntries(Object.entries(priceFixture.pricesByResourceKey).map(([key,unitPrice])=>[r(key),{unitPrice:String(unitPrice),provenance:{kind:'manual',reason:'TEST_ONLY synthetic KGS; not a real tariff, project or stock approval'}}]));
  const priced=await compile(facts(priceFixture.areaM2,priceFixture.puttyMm),priceOverrides);
  assert.equal(priced.totals.amount,String(independentPrice.expectedTotalKgs));
  for(const [key,amount]of Object.entries(independentPrice.expectedAmounts))assert.equal(priced.rows.find(row=>row.row_id===r(key))?.amount,String(amount));
  assert.equal(priced.rows.filter(row=>row.included_in_estimate).length,4);
  for(const item of subject.physicalKitR240){
   const row=priced.rows.find(value=>value.row_id===r(item.id));
   if(row){assert.equal(row.procurement_eligible,false);assert.equal(row.included_in_procurement,false);
    assert.equal(row.included_in_estimate,false);assert.equal(row.amount,null);
   }else{const need=priced.preliminaryNeeds.find(value=>value.row_id===r(item.id));assert(need,'R240_PHYSICAL_NEED_MUST_REMAIN:'+item.id);
    assert.equal(need.procurement_eligible,false);assert.equal(need.selected,false);assert.equal(need.quantity,null);
   }
  }
  assert.equal(priced.preliminaryNeeds.filter(need=>need.need_state==='QUANTITY_REQUIRED').length,15);
  const zero=await compile(facts(0,2));assert.equal(zero.rows.length,0);
  assert.equal(actualCoreCalls,4);
  return{status:'PASS_STAGED_EXISTING_PAINT_PHYSICAL_REQUIREMENTS_R240',actualCoreCalls,unknownPhysicalQuantities:15,actualApprovedProjectPackages:0,physicalResourceCoverageComplete:false,fullMasterAcceptance:false,shape:[200,168,168],retainedRows:116,newRows:52,newBoundOwners:4,
   ordinaryObjectFacts:4,technicalUserQuestions:0,pricesUnknownAreNull:true,engineeringAcceptance:false,published:false};
 };
 const{primaryMeasureSelectionV1:_oldSelection,...existingApplicability}=copy(c.definition.applicability??{});
 return{contract:bundle.contract,stopCode,applicationName:'interior-wall-finish-existing-paint-r502-physical-r240',expectedBranch:'codex/r4-a5-clean-08b18902',masterPath,masterSha256,
  parentReleaseId:input.parentReleaseId??fixture.pointer.definitionReleaseId,parentSearchReleaseId:input.parentSearchReleaseId??fixture.pointer.searchReleaseId,
  currentReleasePath:input.currentReleasePath??'data/estimate-benchmarks/r568-local-developer-canonical-release.json',
  outputRoot:input.outputRoot??'.release-runtime/r568/next-wave/interior-wall-ready-finish-r502/publication',
  sourcePaths:[bundle.subjectFactoryPath,'src/lib/estimate/v4/interiorWallFinishingGroupR502.test.ts',bundle.subjectPackPath,interiorWallFinishBundlePathR502,
   'data/estimate-benchmarks/fixtures/interior-wall-finishing-original35-proof-r240.json',
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
  expectedParentShape:[170,116,116],benchmarkOrdinal:0,validationScenario:'EXISTING_PAINT_RETAINED_116_PLUS_52_WITH_HONEST_PHYSICAL_NEEDS_R240',
  passport:{canonicalRuName:subject.titleRu,workKey:'plaster_paint_interior_paint_wall_paint_standard',physicalResultRu:subject.physicalScopeRu,
   includedScopeRu:[subject.wholeWorkScopeRu],excludedScopeRu:subject.excludedRu,independentCompletenessMap:d.completenessMap},
  applicability:{...existingApplicability,primaryMeasureParameterId:p(subject.areaId),selectedTechnology:bundle.selectedTechnology,
   ordinaryObjectFactBudget:4,retainedParentCaptureSha256:bundle.capturedParentSha256,engineeringAcceptance:false,selectedScopeQuantitiesComplete:false},
  binding:d.binding,locator:{key:bundle.locatorKey,payload:{kind:'PRIMARY_SOURCE_COMPOSITE_OPERATION_MAP_R502',artifactPath:interiorWallFinishBundlePathR502,
   artifactSha256:interiorWallFinishBundleShaR502,primaryEvidence:bundle.primaryEvidence,quantitativeRules:bundle.quantitativeRules,
   independentRowRules:bundle.independentRowRules,paidOwnerKeys:bundle.paidOwnerKeys,engineeringAcceptance:false,officialCompositeNormClaimed:false}},
  search:{primaryUom:'m2',canonicalNameRu:subject.titleRu,aliases:['финишная отделка цементных стен','цементная шпаклёвка и акриловая окраска стен'],
   shortScopeRu:subject.physicalScopeRu,keyDistinguishingParameters:d.ordinaryParameterIds,clarificationFields:d.ordinaryParameterIds,
   includedBoundaries:[subject.wholeWorkScopeRu],excludedBoundaries:subject.excludedRu,extraSearchTermsRu:'финишная отделка стены цементная шпаклевка грунтовка акриловая краска два слоя',
   sourceProvenance:{sourceBundle:bundle.sourceKey,artifactSha256:interiorWallFinishBundleShaR502,engineeringAcceptance:false,oldPhysicalAndPriceDataNotTransferred:true}},
  forbiddenAdjacentMatchers:[/canonical-work:[^:]+:.*_(?:small|medium|large)_area$/u],owner:'ROOT_SINGLE_INTEGRATOR',receiptFileStem:'interior_wall_finish_existing_paint_r502'};
}
