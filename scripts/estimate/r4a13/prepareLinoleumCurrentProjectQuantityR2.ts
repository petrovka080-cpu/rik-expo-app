import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import fixture from '../../../data/estimate-benchmarks/fixtures/linoleum-current-parent-r1115.json';
import quantity from '../../../data/estimate-benchmarks/source-packs/linoleum-current-project-quantity-cycle-r2.json';
import original from '../../../data/estimate-benchmarks/source-packs/linoleum-current-oem-physical-cycle-r1.json';
import {buildLinoleumCurrentProjectQuantityR2,linoleumCurrentProjectQuantityExpectationsR2,assertLinoleumCurrentProjectQuantityScopeR2}
 from '../../../src/lib/estimate/v4/domains/interiorFinishesComplete/productionBinding';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {assembleMasterSingleDefinitionManagedRegistryCandidateR1,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {masterRetainedParentCaptureSha256R1,type MasterRetainedParentCaptureR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {makeMasterDeferredProjectQuantityBasisR1} from './masterTypedPartialQuantityBasisR1';

export type LinoleumCurrentProjectQuantityContextR2=Readonly<{
 expectedBranch:string;masterPath:string;masterSha256:string;parentReleaseId:string;parentSearchReleaseId:string;
 currentReleasePath:string;outputRoot:string;actualParent:MasterRetainedParentCaptureR1;actualParentCaptureSha256:string;
 verifyCore:MasterSingleDefinitionSuccessorConfig['verifyCore'];
 verifyTargetPrecondition:NonNullable<MasterSingleDefinitionSuccessorConfig['verifyTargetPrecondition']>;
 capturedScopedNormativeRegistry?:MasterSingleDefinitionSuccessorConfig['capturedScopedNormativeRegistry'];
}>;
/** Exact parsed actual rows for the caller's finite source-only contract. This
 * is expressly NOT a scoped registry capture, SQL reader or publication lease. */
export function observedLinoleumParentR1115R2():MasterRetainedParentCaptureR1{
 const b=fixture.body;return{definition:b.definition[0]!,baseline:b.baseline[0]!,parameters:b.parameters,formulas:b.formulas,
  resources:b.resources,bindings:b.bindings,normativeSources:b.sources,normativeLocators:b.locators};
}
const sourcePaths=[
 'src/lib/estimate/v4/domains/interiorFinishesComplete/productionBinding.ts',
 'scripts/estimate/r4a13/prepareLinoleumCurrentProjectQuantityR2.ts',
 'data/estimate-benchmarks/fixtures/linoleum-current-parent-r1115.json',
 'data/estimate-benchmarks/fixtures/linoleum-current-parent-r1065.json',
 'data/estimate-benchmarks/source-packs/linoleum-current-project-quantity-cycle-r2.json',
 'data/estimate-benchmarks/source-packs/linoleum-project-quantity-records-r2.txt',
 'data/estimate-benchmarks/source-packs/linoleum-current-oem-physical-cycle-r1.json',
 'data/estimate-benchmarks/source-packs/linoleum-whole-quantity-basis-r1.txt',
 ...quantity.existingPrimaryPins.map(p=>p.sourcePath),...quantity.primaryPins.map(p=>p.sourcePath),
 'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
 'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
 'scripts/estimate/r4a13/masterTypedPartialQuantityBasisR1.ts',
 'scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.ts',
 'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts'];
export const linoleumCurrentProjectQuantitySourcePathsR2=sourcePaths;
export function verifyLinoleumCurrentQuantityEvidenceR2(repoRoot=resolve(__dirname,'../../..')){
 const pins=[{sourcePath:quantity.quantityEvidence.path,sha256:quantity.quantityEvidence.sha256},
  ...quantity.existingPrimaryPins,...quantity.primaryPins];
 return pins.map(pin=>{const bytes=readFileSync(resolve(repoRoot,pin.sourcePath)),sha256=createHash('sha256').update(bytes).digest('hex');
  if(sha256!==pin.sha256)throw Error('STOP_LINOLEUM_R2_SOURCE_BYTE_PIN:'+pin.sourcePath);
  return{path:pin.sourcePath,sha256,bytes:bytes.length};});
}
/** Pure existing Master recipe, not main()/writer/CLI. No caller can promote
 * an observed absent key into an existing registry row or a scoped capture. */
export function prepareLinoleumCurrentProjectQuantityR2(ctx:LinoleumCurrentProjectQuantityContextR2|null):MasterSingleDefinitionSuccessorConfig{
 if(!ctx||!ctx.parentReleaseId||!ctx.parentSearchReleaseId||!ctx.currentReleasePath||!ctx.masterSha256
  ||!ctx.actualParent||typeof ctx.verifyTargetPrecondition!=='function'||typeof ctx.verifyCore!=='function')throw Error('STOP_LINOLEUM_R2_ACTUAL_ROOT_CONTEXT_REQUIRED');
 const observed=observedLinoleumParentR1115R2();
 if(masterRetainedParentCaptureSha256R1(ctx.actualParent)!==ctx.actualParentCaptureSha256
  ||canonicalEstimateStableJson(ctx.actualParent)!==canonicalEstimateStableJson(observed))throw Error('STOP_LINOLEUM_R2_ACTUAL_PARENT_DRIFT');
 const model=buildLinoleumCurrentProjectQuantityR2();assertLinoleumCurrentProjectQuantityScopeR2(model);
 const nativeIds=new Set(observed.resources.map(r=>r.row_id)),newRows=model.resources.filter(r=>!nativeIds.has(r.row_id));
 if(newRows.length!==65||canonicalEstimateStableJson(newRows.map(r=>r.row_id))!==canonicalEstimateStableJson(quantity.newBindingRowIds))throw Error('STOP_LINOLEUM_R2_65_NEW_BINDINGS_ONLY');
 const structural=model.runtimeInput,newParameters=model.parameters.filter(p=>!observed.parameters.some(old=>old.parameter_id===p.parameter_id));
 const config:MasterSingleDefinitionSuccessorConfig={contract:quantity.contract,stopCode:'LINOLEUM_CURRENT_PROJECT_QUANTITY_R2',applicationName:'Укладка рулонного покрытия — фактические измерители',
  expectedBranch:ctx.expectedBranch,masterPath:ctx.masterPath,masterSha256:ctx.masterSha256,parentReleaseId:ctx.parentReleaseId,parentSearchReleaseId:ctx.parentSearchReleaseId,
  currentReleasePath:ctx.currentReleasePath,outputRoot:ctx.outputRoot,sourcePaths,catalogId:quantity.catalogId,sourceId:quantity.sourceId,normId:'PROJECT_QUANTITY:LINOLEUM_NET_FIT_NO_SEAL_R2',
  sourceMetadata:{source_title:quantity.titleRu,source_authority:'Авторская карта физических измерений/учёта и точные первичные инструкции; не норма производительности и не факт объекта',
   source_kind:'PROJECT_SYSTEM',artifact_sha256:quantity.quantityEvidence.sha256,official_url:null,exact_locator:quantity.quantityEvidence.path,
   use_restriction:'Только натуральный джутовый2.5мм/611ENBG132567V17,NET_FIT,ROLLER,подтверждённыйNONE; готовое совместимое сухое основание без подогрева; неPVC/HOT_WELD/герметизация/лестница.'},
  ...(ctx.capturedScopedNormativeRegistry===undefined?{}:{capturedScopedNormativeRegistry:ctx.capturedScopedNormativeRegistry}),
  parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,
  shortInput:{},acceptanceInput:{...observed.baseline.input_values,...structural},runtimeProfileInput:{...observed.baseline.input_values,...structural},
  runtimeProfileClassification:{q:'ASSUMPTION',...Object.fromEntries(Object.keys(structural).map(id=>[id,'RUNTIME_STRUCTURAL_DEFAULT' as const]))},
  runtimeProfileSourceIds:{q:observed.baseline.normative_source_ids.q,...Object.fromEntries(Object.keys(structural).map(id=>[id,[quantity.sourceId]]))},
  verifyCore:async()=>{const before=verifyLinoleumCurrentQuantityEvidenceR2();const result=await ctx.verifyCore();const after=verifyLinoleumCurrentQuantityEvidenceR2();
   if(canonicalEstimateStableJson(before)!==canonicalEstimateStableJson(after))throw Error('STOP_LINOLEUM_R2_SOURCE_DRIFT');return{...result,linoleumProjectRecordPins:after};},
  verifyTargetPrecondition:ctx.verifyTargetPrecondition,expectedParentShape:[1,59,59],benchmarkOrdinal:1,
  validationScenario:'SOURCE_ONLY_PURE_NET_FIT_ROLLER_NONE_DEFERRED_ACTUAL_PROJECT_QUANTITIES_NOT_OBJECT_ACCEPTANCE',
  passport:{canonicalRuName:'Укладка рулонного покрытия пола',workKey:'flooring_interior_linoleum_lay_standard',physicalResultRu:'Совместимое рулонное покрытие приклеено с принятыми стыками без сварки и без узла герметизации.',
   includedScopeRu:['Приёмка/хранение/подготовка готового основания/раскладка/клей/укладка/стыки/защита/контроль/очистка/отходы.',
    'Фактические единицы оснащения,выдача/возврат,события и измеряемый расход; неизвестные остаютсяUNKNOWN.'],
   excludedScopeRu:['HOT_WELD/LeisterBOM/SEAL_REQUIRED/HAMMER/лестницы/подогрев/PVC/другой клей.','Норма износа/производительности/достаточности оснащения,цена,активация и факты реального объекта.'],
   independentCompletenessMap:linoleumCurrentProjectQuantityExpectationsR2()},
  applicability:{projectSystem:quantity.contract,method:quantity.method,activationAllowed:false,productionEligible:false,fullTechnicalAcceptance:false,
   actualParentObservation:{definitionId:fixture.header.definition_version_id,definitionSha256:fixture.header.definition_sha256,baselineId:fixture.header.approved_template_baseline_id,
    proofSha256:fixture.proofSha256,notFormalRegistryCapture:true},oldFamilyHoldsRetained:true},
  binding:{rowId:newRows[0]!.row_id,additionalRowIds:newRows.slice(1).map(r=>r.row_id),applicability:{projectSystem:quantity.contract,countsAreActualProjectRecordsNotNorms:true},
   applicabilityByRowId:Object.fromEntries(newRows.map(r=>[r.row_id,{sourceRole:'PROJECT_RECORD_QUANTITY_NOT_MANUFACTURER_NORM',permanentNotApplicable:r.row_id===original.namespace+'perimeter-seal',fullTechnicalAcceptance:false}])),
   retainParentBindings:{capturedParent:ctx.actualParent,capturedParentSha256:ctx.actualParentCaptureSha256,
    newParameterSources:Object.fromEntries(newParameters.map(p=>[p.parameter_id,{kind:String(p.truth_metadata.value_source_role).includes('DERIVED')?'DERIVED' as const:'KNOWN' as const,sourceIds:[quantity.sourceId]}])),
    legacyTemplateAssumptionSources:{contract:'master-retained-legacy-template-assumptions/r1',templateId:'flooring_interior_linoleum_lay_standard_professional_expanded_v1',
     parameterSources:{q:['r555-source:flooring_interior_linoleum_lay_standard_professional_expanded_v1']}},
    capturedSourcePreimage:{sourceKey:quantity.sourceId,expected:null}}},
  locator:{key:'linoleum-project-quantity-r2:netfit-roller-none:65new-only',payload:{contract:quantity.contract,sourcePack:quantity,
   independentCompletenessMap:linoleumCurrentProjectQuantityExpectationsR2(),oldNative59NotBound:true,originalSourceHoldArchive:original.sourceHolds,
   physicalEvidence:quantity.primaryPins,actualFactsAsserted:false,preliminaryCompositionOnly:true,engineeringAcceptance:false}},
  search:{primaryUom:'m2',canonicalNameRu:'Укладка рулонного покрытия пола',aliases:['Укладка линолеума'],shortScopeRu:'Приклейка совместимого натурального покрытия на подготовленный сухой пол без подогрева; принятые стыки без сварки.',
   keyDistinguishingParameters:[original.selector.parameterId],clarificationFields:[original.parameterPrefix+'net_area_m2'],
   includedBoundaries:['NET_FIT/ROLLER/защищённыйNONE_CONFIRMED'],excludedBoundaries:['Автоматическая замена любогоgeneric59/OEM/SDS/объектного условия'],extraSearchTermsRu:'рулонное покрытие пола приклейка натуральный линолеум',
   sourceProvenance:{sourceId:quantity.sourceId,oldNativeSourceUnchanged:true,sourceQuantityNotProductivityNorm:true}},
  forbiddenAdjacentMatchers:[/CE40/iu,/CM11/iu,/CT54/iu,/CN87/iu],owner:'finishing-linoleum-project-quantity-r2',receiptFileStem:'linoleum_project_quantity_r2'};
 const candidate=assembleMasterSingleDefinitionManagedRegistryCandidateR1(config,{projectSourcePackage:null,projectSourcePackageSet:null}).retentionCandidate;
 const source=candidate.newSource,locator=candidate.newLocators[0]!;
 const projectIds=model.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT'
  &&['PROJECT_SPECIFIC_INPUT','CONDITIONAL_PROJECT_FACT'].includes(String(p.truth_metadata.value_source_role))).map(p=>p.parameter_id);
 const basis=makeMasterDeferredProjectQuantityBasisR1({parameters:model.parameters,formulas:model.formulas,resources:model.resources,parameterIds:projectIds,
  source:{sourceId:source.id,sourceKey:source.source_key,artifactSha256:String(source.artifact_sha256),locatorId:locator.id,locatorExcerptSha256:locator.excerpt_sha256,locatorPayload:locator.locator},
  method:{parameterId:quantity.method.parameterId,value:quantity.method.value,version:quantity.method.version}});
 return {...config,passport:{...config.passport,partialQuantityBasis:basis}};
}
