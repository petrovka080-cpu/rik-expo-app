import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {canonicalProfessionalPdfReviewAcknowledgmentV1,canonicalProfessionalPdfReportOriginalAuditV1} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import source from '../../../data/estimate-benchmarks/source-packs/facade-current-family-whole-systems-r3.json';
import oracle from '../../../data/estimate-benchmarks/fixtures/facade-porcelain-independent-oracles-r3.json';
import current from '../../../data/estimate-benchmarks/source-packs/facade-porcelain-current-whole-r59.json';
import independent from '../../../data/estimate-benchmarks/fixtures/facade-porcelain-whole-independent-r59.json';
import expected from '../../../data/estimate-benchmarks/fixtures/facade-porcelain-existing-owner-independent-r214.json';
import {facadePorcelainProfileR59 as profile,facadePorcelainGeometryR59 as geometryIds,
  facadePorcelainPrimaryR59 as primary,facadePorcelainDefinitionR59 as childDefinition,
  facadePorcelainCompletenessR59 as childCompleteness,facadePorcelainNeedsR59 as needs,
  facadePorcelainControlR59 as control,facadePorcelainRowIdR59 as rid,facadePorcelainSourceFactsR59 as sourceFacts,
} from '../../../src/lib/estimate/v4/facadePorcelainWholeR59';
import {facadeVentilatedPorcelainDefinitionR3 as originalDefinition} from '../../../src/lib/estimate/v4/facadeVentilatedPorcelainR3';
import {facadeVentilatedThermowoodRetainedOptionsR5} from './prepareFacadeVentilatedThermowoodR5';
import {facadeVentilatedPorcelainCapturedParentR214 as captured,facadeVentilatedPorcelainDefinitionR214 as definition,
  facadeVentilatedPorcelainCompletenessR214 as completeness,facadeVentilatedPorcelainPrimarySelectionR214 as selection,
  facadeVentilatedPorcelainCatalogR214 as catalogId,facadeVentilatedPorcelainSelectorR214 as selector,
  facadeVentilatedPorcelainChoiceR214 as choice,facadeVentilatedPorcelainCompileInputR214 as compileInput,
  type FacadeVentilatedPorcelainReadbackR214,
} from '../../../src/lib/estimate/v4/facadeVentilatedPorcelainExistingOwnerR214';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput,type CanonicalEstimateCompileCoreResult} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {buildCanonicalProfessionalPdfProjection,assertCanonicalProfessionalPdfMoneyCells} from '../../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf';
import {canonicalArtifactVisibleRowTitle,canonicalArtifactPreliminaryNeeds,canonicalArtifactMoney,escapeCanonicalArtifactHtml} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {compareFormulaGraphDecimals as cmp} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import {masterRetainedParentCaptureSha256R1,masterRetainedLineageValueSha256V1 as valueSha,
  prepareMasterRetainedBindingRepresentativeR1,type MasterRetainParentBindingsR1,type MasterRetainedBindingGuardInputR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {buildMasterPublicationResourceRowsR1,resolveMasterSingleDefinitionBindingRowIds,
  resolveMasterSingleDefinitionBindingApplicabilityByRowId,resolveMasterSingleDefinitionLocatorExcerptSha256R1,
  hashMasterSingleDefinitionSuccessorReceiptR1,validateIndependentCompletenessMapReferences,
  type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';
const contract='gox.facade.ventilated.porcelain-existing-owner/r214',sourceId='gox_facade_ventilated_porcelain_whole_r3';
const normId=current.normId,p={...profile,catalogId};
const packPath='data/estimate-benchmarks/source-packs/facade-current-family-whole-systems-r3.json';
const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const textList=(value:unknown,message:string):string[]=>{assert(Array.isArray(value)&&value.every(item=>typeof item==='string'),message);return[...value];};
const ownPaths=[
 'src/lib/estimate/v4/facadeVentilatedPorcelainExistingOwnerR214.ts',
 'scripts/estimate/r4a13/prepareFacadeVentilatedPorcelainExistingOwnerR214.ts',
 'scripts/estimate/r4a13/facadeVentilatedPorcelainExistingOwnerR214.test.ts',
 'data/estimate-benchmarks/fixtures/facade-porcelain-existing-owner-independent-r214.json',
 'data/estimate-benchmarks/fixtures/facade-ventilated-current-v6-parent-source-r5.json',
 'src/lib/estimate/v4/facadePorcelainWholeR59.ts',
 'data/estimate-benchmarks/source-packs/facade-porcelain-current-whole-r59.json',
 'data/estimate-benchmarks/fixtures/facade-porcelain-whole-independent-r59.json',
 'data/estimate-benchmarks/fixtures/facade-porcelain-independent-oracles-r3.json',
 'src/lib/estimate/v4/facadeVentilatedPorcelainR3.ts',
 'src/lib/estimate/v4/automaticConstructionOwnerR1.ts',
 'src/lib/estimate/v4/optionalAutomaticOwnerCompositionR1.ts',
 'src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
 'scripts/estimate/r4a13/prepareFacadeVentilatedThermowoodR5.ts',
 'data/estimate-benchmarks/source-packs/facade-ventilated-thermowood-existing-owner-r5.json',
 'data/estimate-benchmarks/source-packs/facade-ventilated-hpl-existing-owner-r5.json',
 'data/estimate-benchmarks/fixtures/facade-ventilated-current-parent-source-r5.json',
 'data/estimate-benchmarks/fixtures/facade-ventilated-approved-template-source-r5.json',
 'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
 'src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1.ts',
 'src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1.ts',
 'src/lib/estimate/backendPlatform/canonicalProfessionalPdf.ts',
 'src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts',
 'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
 'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
];
type Callbacks=Readonly<{onEntry?:(count:number,phase:string)=>void;onCoreCall?:(count:number,phase:string)=>void;
  onCoreResult?:(phase:string,result:unknown)=>void}>;

export function facadeVentilatedPorcelainRetainedOptionsR214(sourceRoot?:string):MasterRetainParentBindingsR1{
  const packet=captured(),c=packet.capture,model=definition(),old=facadeVentilatedThermowoodRetainedOptionsR5(sourceRoot);
  const legacy=old.legacyTemplateAssumptionSources;assert(legacy?.approvedSourceEvidence);
  assert.deepEqual(stable(packet.approvedSourceDefinition),stable(old.capturedParent.definition));
  assert.equal(legacy.approvedSourceEvidence.capturedSourceDefinition.id,old.capturedParent.baseline.source_definition_version_id);
  const metadata=c.definition.source_metadata,previous=metadata.retainedParentBindingSuccessorV1;
  assert(record(previous));assert.equal(previous.parentDefinitionId,old.capturedParent.definition.id);
  assert.equal(previous.parentBaselineId,old.capturedParent.baseline.id);assert.equal(previous.capturedParentSha256,old.capturedParentSha256);
  const oldIds=new Set(c.parameters.map(p=>p.parameter_id));
  return{capturedParent:c,capturedParentSha256:masterRetainedParentCaptureSha256R1(c),
    capturedSourcePreimage:{sourceKey:sourceId,expected:null},
    legacyTemplateAssumptionSources:{...legacy,approvedTemplatePredecessor:{capturedParent:old.capturedParent,capturedParentSha256:old.capturedParentSha256}},
    successorProvenanceAppendV1:{contract:'master-retained-binding-append/v1',capturedSourceMetadata:structuredClone(metadata),
      capturedSourceMetadataSha256:valueSha(metadata),capturedPreviousSuccessorSha256:valueSha(previous)},
    newParameterSources:Object.fromEntries(model.parameters.filter(p=>!oldIds.has(p.parameter_id)).map(p=>[p.parameter_id,
      p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?{kind:'UNRESOLVED' as const,sourceIds:[]}:
        p.truth_metadata.value_source_role==='COMPILER_DERIVED_RESOURCE_QUANTITY'?{kind:'DERIVED' as const,sourceIds:[]}:
          {kind:'KNOWN' as const,sourceIds:[sourceId]}]))};
}



/** Ordinary retained Config for the same physical owner. There is deliberately
 * no catalogAppend and no READY recipe. The new source-key absence is only an
 * expected normal/LOCKED precondition, not an invented captured registry fact. */
export function facadeVentilatedPorcelainMasterConfigR214(context:Readonly<{
  releaseId:string;searchReleaseId:string;sourceRoot?:string;outputRoot?:string;
}>&Callbacks):Config{
 const own=(path:string)=>resolve(context.sourceRoot??'.',path),packet=captured(),c=packet.capture,
  model=definition(),map=completeness(),retained=facadeVentilatedPorcelainRetainedOptionsR214(context.sourceRoot);
 const passport=packet.contentPassport,decision=passport.decision;assert(record(decision));
 const oldNeeds=textList(decision.unresolvedResourceRowIds,'PORCELAIN_VENT_CAPTURED_NEEDS_REQUIRED');
 const included=textList(passport.included_scope_ru,'PORCELAIN_VENT_CAPTURED_SCOPE_REQUIRED');
 const excluded=textList(passport.excluded_scope_ru,'PORCELAIN_VENT_CAPTURED_EXCLUSIONS_REQUIRED');
 assert.equal(profile.sourceId,sourceId);assert.equal(current.sourceId,sourceId);
 const primarySource=source.sources.find(s=>s.key==='TN-VHF');assert(primarySource);
 for(const s of source.sources)assert.equal(sha(own(s.path)),s.sha256);
 const sourcePaths=[...new Set([...ownPaths,packPath,...source.sources.map(s=>s.path)])];for(const path of sourcePaths)sha(own(path));
 const masterPath='C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_16_2026-10-24.txt';
 const masterSha256='541bc82df10231ca885288a7937283729b08484bd8301a22cd57a7b5c221eb40';assert.equal(sha(masterPath),masterSha256);
 const oldRows=new Set(c.resources.map(row=>row.row_id)),bindingRows=model.resources.filter(row=>!oldRows.has(row.row_id)
  &&row.source_metadata?.sourceRole!=='UNRESOLVED_APPLICATION_NORM').map(row=>row.row_id);
 assert.equal(bindingRows.length,115,'FIVE_LABOUR_PLUS_46_MATERIAL_PLUS_64_STOCK_MODE_SOURCE_BINDINGS');
 const runtimeProfileInput=sourceFacts(),runtimeProfileClassification:NonNullable<Config['runtimeProfileClassification']>=Object.fromEntries(
  Object.keys(runtimeProfileInput).map(id=>[id,'NORMATIVE' as const]));
 const config:Config={contract,stopCode:'FACADE_VENTILATED_PORCELAIN_R214',applicationName:'facade-ventilated-porcelain-existing-owner-r214',
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath,masterSha256,parentReleaseId:context.releaseId,parentSearchReleaseId:context.searchReleaseId,
  currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',
  outputRoot:context.outputRoot??'.release-runtime/r568/facade-ventilated-porcelain-existing-owner-r214',sourcePaths,catalogId,sourceId,normId,
  sourceMetadata:{source_title:'Вентилируемый фасад с керамогранитными плитами: точный исходный целый метод',
   source_authority:'Изготовитель; исходная технологическая карта и СТО выбранной системы',source_kind:'EXACT_MANUFACTURER_WHOLE_METHOD_IN_CURRENT_EXISTING_NVF_OWNER',
   official_url:primarySource.url,artifact_sha256:primarySource.sha256,
   exact_locator:'ST-KG-V-T;видимые кляммеры;керамогранит600x600x10;минеральная плита100мм;TCtables15–16/PDF15–16;STOtable5.3/PDF19–20',
   use_restriction:'Только выбранный полный метод и его фактический проект;не расширяет международный источник до местного универсального допуска;реальные BOM/PPR/основание/pullout/раскладка и пять внутренних норм отдельно;FULL0.'},
  parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,
  shortInput:structuredClone(c.baseline.input_values),acceptanceInput:structuredClone(c.baseline.input_values),
  runtimeProfileInput,runtimeProfileClassification,runtimeProfileSourceIds:Object.fromEntries(Object.keys(runtimeProfileInput).map(id=>[id,[sourceId]])),
  expectedParentShape:[52,76,76],benchmarkOrdinal:0,validationScenario:'CURRENT_EXISTING_NVF_WHOLE_PORCELAIN_22_ENTRIES_NOT_PUBLICATION',
  passport:{canonicalRuName:'Монтаж вентилируемого фасада',workKey:'ventilated_facade',
   physicalResultRu:'Вентилируемый фасад по явно выбранному исходному методу;полное обеспечение отдельно не принято.',
   includedScopeRu:[...included,'Точный исходный целый метод керамогранитной облицовки с видимыми кляммерами, проектной ведомостью и оснащением по ППР.'],
   excludedScopeRu:excluded,independentCompletenessMap:map,unresolvedApplicableResourceRowIds:[...oldNeeds,...needs().map((n:{needId:string})=>n.needId)]},
  applicability:{...structuredClone(c.definition.applicability),primaryMeasureSelectionV1:selection(),
   sourceProfilesByExplicitChoice:{...c.definition.applicability.sourceProfilesByExplicitChoice,[choice]:{
    exactSourceProfile:'vertical_T_visible_clamps_porcelain10_singleMW100',internationalManufacturerScope:true,
    sourceSha256:primarySource.sha256,sourceNormId:normId,sourceCatalogLabelIsNotNewPublicOwner:profile.catalogId,
    sameExistingPublicOwner:catalogId,actualApprovedProjectBOMRequired:true,normalLockedActualParentCheckRequired:true,
    newSourceKeyActualGlobalAbsenceOrReuseNotVerified:true,noLegacyQuantityOrPriceTransfer:true,fullTechnicalAcceptance:false}},
   retainedParentCaptureSha256:retained.capturedParentSha256,normalLockedPreflightRequired:true,fullTechnicalAcceptance:false},
  binding:{rowId:bindingRows[0]!,additionalRowIds:bindingRows.slice(1),retainParentBindings:retained,
   applicability:{contract,oneExistingCatalogOwner:true,originalParentDefinitionId:c.definition.id,fullTechnicalAcceptance:false},
   applicabilityByRowId:Object.fromEntries(bindingRows.map(row=>[row,{contract,source_artifact_sha256:primarySource.sha256,
    exactSourceProfile:'vertical_T_visible_clamps_porcelain10_singleMW100',automaticLegacyQuantityOrPriceTransferAllowed:false}]))},
  locator:{key:'facade-ventilated-porcelain-existing-owner-r214',payload:{contract,originalWholeProfile:profile,
   wholePublicSupplyOwnerPack:current,independentCompletenessMap:map,registeredSourceKey:sourceId,originalOwnerCatalogId:catalogId,
   exactParentDefinitionId:c.definition.id,noNewPublicCard:true,fullTechnicalAcceptance:false}},
  search:{primaryUom:'m2',canonicalNameRu:'Монтаж вентилируемого фасада',
   aliases:['Облицовка фасада термодревесной доской','Облицовка фасада компактными плитами','Облицовка фасада керамогранитными плитами'],
   shortScopeRu:'Сохранённый расчёт либо точный исходный способ облицовки с отдельной принятой ведомостью и незакрытыми потребностями.',
   keyDistinguishingParameters:[selector],clarificationFields:[selector],includedBoundaries:selection().selections.map(s=>s.selectorValue),
   excludedBoundaries:['Скрытое крепление и иная подсистема не признаны выбранным способом.','Ведомость и оснащение не определяются площадью.','Полное обеспечение фасада не принято.'],
   extraSearchTermsRu:'вентилируемый фасад термодерево компактная плита керамогранит видимые кляммеры',
   sourceProvenance:{contract,exactParentDefinitionId:c.definition.id,sourceId,normId,newCatalogIds:0,newFullTechnologies:0}},
  forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_INTEGRATOR_FACADE_EXISTING_VENT_OWNER',receiptFileStem:'facade_ventilated_porcelain_existing_owner_r214',
  verifyCore:async()=>{verifyFacadeVentilatedPorcelainRetainedR214(config,own);return verifyWhole(model,map,context);}};
 return config;
}

/** Pure existing guard, before ANY new core call. No SQL/registration/writer. */
export function verifyFacadeVentilatedPorcelainRetainedR214(config:Config,own:(path:string)=>string):void{
  const retained=config.binding.retainParentBindings;assert(retained);
  const uuid=(seed:string)=>{const b=Buffer.from(hashMasterSingleDefinitionSuccessorReceiptR1(seed).slice(0,32),'hex');b[6]=(b[6]!&15)|80;b[8]=(b[8]!&63)|128;
    const h=b.toString('hex');return`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
  const id=uuid(`${contract}:${sourceId}:source`),locator=uuid(`${contract}:${sourceId}:${config.locator.key}:locator`),m=config.sourceMetadata;
  const input:MasterRetainedBindingGuardInputR1={config,newSource:{id,source_key:sourceId,title_ru:m.source_title,authority:m.source_authority,
    official_url:m.official_url??null,artifact_sha256:m.artifact_sha256??null,effective_from:m.effective_from??null,effective_to:null,
    metadata:{contract,sourceKind:m.source_kind,useRestriction:m.use_restriction,universalProductivityClaimed:false,
      universalConsumptionClaimed:false,activationAllowed:false}},
    newLocators:[{id:locator,source_id:id,locator_key:config.locator.key,locator:config.locator.payload,
      excerpt_sha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1(config)}]};
  const resources=buildMasterPublicationResourceRowsR1(config.resourceDefinitions),oldFormulaIds=new Set(retained.capturedParent.formulas.map(f=>f.formula_id));
  const formulas=config.formulaDefinitions.map(f=>({...f,ast_sha256:oldFormulaIds.has(f.formula_id)?f.ast_sha256:hashMasterSingleDefinitionSuccessorReceiptR1(f.ast)}));
  const applicable=resolveMasterSingleDefinitionBindingApplicabilityByRowId(config,resources,[locator]);
  const bindings=resolveMasterSingleDefinitionBindingRowIds(config,resources,[locator]).map(row_id=>({row_id,locator_id:locator,applicability:applicable[row_id]}));
  const fingerprint=hashMasterSingleDefinitionSuccessorReceiptR1({purpose:'PURE_PORCELAIN_EXISTING_VENT_CONFIG_STANDARD_RETAINED_REPRESENTATIVE_NOT_PUBLICATION',
    capturedParentSha256:retained.capturedParentSha256,sourceHashes:config.sourcePaths.map(path=>({path,sha256:sha(own(path))})),source:input.newSource,locators:input.newLocators});
  const result=prepareMasterRetainedBindingRepresentativeR1(input,{parameters:config.parameterDefinitions,formulas,resources,newBindings:bindings,
    successorProvenance:{contract,sourceId,normId:config.normId,parentDefinitionId:retained.capturedParent.definition.id,
      parentBaselineId:retained.capturedParent.baseline.id,capturedParentSha256:retained.capturedParentSha256,sourceFingerprint:fingerprint},
    lifecycleMetadata:{contract,masterSha256:config.masterSha256,sourceFingerprint:fingerprint}});
  for(const[id,sources]of Object.entries(retained.capturedParent.baseline.normative_source_ids))assert.deepEqual(stable(result.normativeSourceIds[id]),stable(sources));
  assert.equal(result.expectedNormativeBindingCount,119);
}


async function verifyWhole(definition:AutomaticOwnerDefinition,map:ReturnType<typeof completeness>,
 callbacks:Callbacks,pdfIssuancePurpose:'STANDARD'|'PRELIMINARY_REVIEW'='STANDARD'){
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
 const c=captured().capture,child=childDefinition(),ownMap=childCompleteness();
 assert.deepEqual([child.parameters.length,child.formulas.length,child.resources.length],[80,120,120]);
 assert.deepEqual([definition.parameters.length,definition.formulas.length,definition.resources.length],[132,196,196]);
 assert.equal(ownMap.entries.length,120);assert.equal(map.entries.length,151);
 assert.deepEqual(definition.resources.slice(0,76),c.resources,'EVERY_CURRENT_PARENT_ROW_PRESERVED');
 assert.deepEqual(definition.formulas.slice(0,76),c.formulas,'EVERY_CURRENT_PARENT_FORMULA_PRESERVED');
 assert.deepEqual(child.resources.map(row=>row.row_id),originalDefinition().resources.map(row=>row.row_id));
 assert.deepEqual(child.formulas,originalDefinition().formulas,'NO_NEW_SOURCE_FORMULAS');
 assert.equal(new Set(definition.parameters.map(p=>p.parameter_id)).size,132);
 assert.equal(new Set(definition.resources.map(row=>row.row_id)).size,196);
 assert.equal(oracle.generatedFromImplementation,false);assert.equal(independent.generatedFromImplementation,false);
 assert.deepEqual(oracle,independent.sourceOracleReusedWithoutProductExecution,'SAME_INDEPENDENT_ORIGINAL_SOURCE_ORACLE');
 const fixture=control(),geometry=Object.fromEntries(Object.entries(fixture).filter(([id])=>geometryIds.some(geometry=>geometry===id))),
  confirmed=Object.fromEntries(Object.entries(fixture).filter(([id])=>!geometryIds.some(geometry=>geometry===id)));
 let coreCalls=0,entryCalls=0,canonicalResults=0,strictRejects=0,preCoreRejects=0;
 const observedPhases:string[]=[];let pdfReviewNegativeCases=0;
 const call=async(phase:string,options:Readonly<{model?:AutomaticOwnerDefinition;submitted?:Record<string,unknown>;
  confirmed?:CanonicalEstimateCompileCoreInput['confirmedParameters'];overrides?:CanonicalEstimateCompileCoreInput['rowOverrides'];
  parentPrimaryMeasure?:unknown;sourceArtifactSha256?:string}>={})=>{
  observedPhases.push(phase);callbacks.onEntry?.(++entryCalls,phase);let enteredCore=false;
  try{
   const submitted:Parameters<typeof compileInput>[0]={...(options.submitted??geometry),[selector]:choice};
   const primarySource=source.sources.find(s=>s.key==='TN-VHF');assert(primarySource);
   const readback:FacadeVentilatedPorcelainReadbackR214={sourceKey:'gox_facade_ventilated_porcelain_whole_r3',
    sourceArtifactSha256:options.sourceArtifactSha256??primarySource.sha256,netFacadeAreaM2:String(submitted[primary]),
    documentSha256:'a'.repeat(64),documentReference:'TEST_ONLY held independent fixture;not an approved actual object',
    values:options.confirmed??confirmed};
   const input=compileInput(submitted,{readback,rowOverrides:options.overrides,parentPrimaryMeasure:options.parentPrimaryMeasure,
    hashJson:value=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value))});
   if(options.model){
    assert.deepEqual(options.model.parameters.map(p=>p.parameter_id),input.parameterDefinitions.map(p=>p.parameter_id));
    assert.deepEqual(options.model.formulas,input.formulaDefinitions);
    input.resourceDefinitions=[...options.model.resources];
   }
   enteredCore=true;callbacks.onCoreCall?.(++coreCalls,phase);
   const result=await compileCanonicalEstimateCore(input);canonicalResults++;
   callbacks.onCoreResult?.(phase,result);return result;
  }catch(error){
   strictRejects++;if(!enteredCore)preCoreRejects++;
   callbacks.onCoreResult?.(phase,{expectedReject:phase.includes('-reject-'),stage:enteredCore?'CORE':'PRE_CORE',
    name:error instanceof Error?error.name:null,message:error instanceof Error?error.message:null,
    code:error!==null&&typeof error==='object'&&'code'in error?error.code:null});throw error;
  }
 };
 const row=(result:CanonicalEstimateCompileCoreResult,key:string)=>{const value=result.rows.find(row=>row.row_id===rid(key));assert(value,key);return value;};
 const money=(value:string|null)=>{assert(value!==null,'EXPECTED_EXPLICIT_TEST_PRICE_OR_AMOUNT');return value;};
 const quantity=(result:CanonicalEstimateCompileCoreResult,key:string,value:string)=>assert.equal(cmp(row(result,key).quantity,value),0,'INDEPENDENT_QUANTITY:'+key);
 const fiveNeeds=(result:CanonicalEstimateCompileCoreResult)=>{
  assert.equal(result.preliminaryNeeds.length,5,'EXACT_FIVE_SOURCE_PROVISION_NEEDS_REMAIN');
  for(const key of independent.protectedNeedKeys)assert(result.preliminaryNeeds.some(need=>need.row_id===rid('need:'+key)&&need.quantity===null));
 };
 const sourceOracle=(result:CanonicalEstimateCompileCoreResult,area:'100'|'50'='100',links:1|2=1)=>{
  for(const[key,value]of Object.entries(area==='100'?independent.laborQuantities100:independent.laborQuantities50))quantity(result,'labor:'+key,value);
  for(const item of independent.materialOwners){const expected=item.key==='stone-wool'&&area==='50'?'5.5':item.quantity;
   quantity(result,item.consumed,expected);quantity(result,item.owner,expected);}
  for(const item of independent.stockResources)quantity(result,'stock:'+item.key,links===1?item.quantity:(item.quantity==='2'?'4':'2'));
  fiveNeeds(result);assert.equal(result.rows.length,83);
  assert(!result.rows.some(row=>row.row_id.includes('metal-shears')||row.row_id===rid('labor:scaffold')));
  assert.equal(row(result,'stock:drill-and-driver-attachments').unit_id,'set');
 };
 // Same source formulas/owners and the same retained gate; reverse only the
 // R59 public-name presentation for the independent native-before comparison.
 const native=originalDefinition(),sourceBefore:AutomaticOwnerDefinition={...definition,resources:definition.resources.map(row=>{
  const prior=native.resources.find(item=>item.row_id===row.row_id);if(!prior)return row;
  const{row_sha256:_hash,...body}=row,{publicResourcePresentationV1:_presentation,...graph}=row.resource_graph;
  const next={...body,title_ru:prior.title_ru,resource_graph:graph};return{...next,row_sha256:hash(next)};
 })};
 const before=await call('01-existing-before',{model:sourceBefore});sourceOracle(before);
 const after=await call('02-current-after');sourceOracle(after);
 const semantics=(result:CanonicalEstimateCompileCoreResult)=>({rows:result.rows.map(row=>[row.row_id,row.unit_id,row.quantity,
  row.unit_price,row.amount,row.included_in_estimate,row.included_in_procurement]),needs:result.preliminaryNeeds,totals:result.totals});
 assert.deepEqual(semantics(after),semantics(before),'SAME_QUANTITIES_COST_PROCUREMENT_PUBLIC_NAMES_ONLY');
 for(const[key,name]of Object.entries(independent.publicResourceNames)){const actual=after.rows.find(row=>row.row_id===rid(key));if(actual)assert.equal(canonicalArtifactVisibleRowTitle(actual,after.parameters),name);}
 const half=await call('03-same-BOM-area50',{submitted:{...geometry,[primary]:'50'}});sourceOracle(half,'50');
 assert(after.rows.every(row=>row.unit_price===null));assert(half.rows.every(row=>row.unit_price===null));
 const prices=independent.testOnlyPrices;
 const overrides=(mode:'own'|'hired'|'buy'):NonNullable<CanonicalEstimateCompileCoreInput['rowOverrides']>=>{
  const output:NonNullable<CanonicalEstimateCompileCoreInput['rowOverrides']>={};
  for(const key of Object.keys(independent.laborQuantities100))output[rid('labor:'+key)]={unitPrice:prices.labor,provenance:{kind:'manual',reason:'TEST_ONLY independent whole labor price'}};
  for(const item of independent.materialOwners)output[rid(item.owner)]={unitPrice:prices.material,provenance:{kind:'manual',reason:'TEST_ONLY independent source material order price'}};
  for(const item of independent.stockResources)output[rid('tool:'+item.key+':'+mode)]={unitPrice:prices.toolMode[mode],
   provenance:{kind:'manual',reason:'TEST_ONLY explicit selected provision mode price for actual PPR period; not retail inheritance'}};
  output[rid('stock:facade-platform')]={unitPrice:prices.stockReference,includedInEstimate:true,includedInProcurement:true,
   provenance:{kind:'manual',reason:'TEST_ONLY informational stock reference stays nonpayable'}};
  return output;
 };
 const own=await call('04-own-priced',{confirmed:{...confirmed,porcelain_tools_mode:independent.provisionModes.own},overrides:overrides('own')});
 const hired=await call('05-hired-priced',{confirmed:{...confirmed,porcelain_tools_mode:independent.provisionModes.hired},overrides:overrides('hired')});
 const buy=await call('06-buy-priced',{confirmed:{...confirmed,porcelain_tools_mode:independent.provisionModes.buy},overrides:overrides('buy')});
 for(const[result,mode]of[[own,'own'],[hired,'hired'],[buy,'buy']] as const){
  sourceOracle(result);assert.equal(cmp(result.totals.amount,independent.expectedMoney.total[mode]),0);
  assert.equal(result.rows.filter(row=>row.included_in_estimate).length,44);
  assert.equal(result.rows.filter(row=>row.included_in_procurement).length,mode==='own'?23:39);
  for(const item of independent.materialOwners){const consumed=row(result,item.consumed),owner=row(result,item.owner);
   assert.equal(consumed.included_in_estimate,false);assert.equal(consumed.included_in_procurement,false);
   assert.equal(owner.included_in_estimate,true);assert.equal(owner.included_in_procurement,true);assert.equal(cmp(owner.quantity,consumed.quantity),0);}
  for(const item of independent.stockResources){const raw=row(result,'stock:'+item.key),owner=row(result,'tool:'+item.key+':'+mode);
   assert.equal(raw.included_in_estimate,false);assert.equal(raw.included_in_procurement,false);
   assert.equal(owner.included_in_estimate,true);assert.equal(owner.included_in_procurement,mode!=='own');
   assert.equal(cmp(owner.quantity,raw.quantity),0);assert.equal(cmp(money(owner.unit_price),prices.toolMode[mode]),0);
   assert.equal(result.rows.filter(row=>row.row_id.startsWith(rid('tool:'+item.key+':'))).length,1,'ONE_PROVISION_OWNER_PER_STOCK_TYPE');}
  const reference=row(result,'stock:facade-platform');
  assert.equal(reference.unit_price,'200');assert.equal(reference.amount,'200');
  assert.equal(reference.included_in_estimate,false);assert.equal(reference.included_in_procurement,false);
  const rawBefore=JSON.stringify(result),revision={id:'TEST_ONLY_PORCELAIN_PUBLIC_MONEY_'+mode,release_id:'TEST_ONLY_NOT_SAVED',
   catalog_id:p.catalogId,checksum_sha256:'0'.repeat(64),row_count:result.rows.length,currency_code:'KGS',input_parameters:result.parameters,
   amendment_contract:{parameterSources:{preliminaryNeeds:result.preliminaryNeeds}}};
  // This is an unsaved source-fragment fixture, never saved source authority.
  const reportRevision=pdfIssuancePurpose==='PRELIMINARY_REVIEW'?{...revision,
   definition_version_id:"TEST_ONLY_UNPUBLISHED_PORCELAIN_SOURCE_FRAGMENT",
   checksum_sha256:canonicalEstimateSha256HexText(canonicalEstimateStableJson({contract:'TEST_ONLY_UNSAVED_SOURCE_FRAGMENT_SNAPSHOT/r1',
    parameters:result.parameters,rows:result.rows,preliminaryNeeds:result.preliminaryNeeds}))}:revision;
  const reportNeeds=canonicalArtifactPreliminaryNeeds(reportRevision,{issuancePurpose:pdfIssuancePurpose});
  const reportResources=[...result.rows,...reportNeeds];
  const reportInput={revision:reportRevision,rows:result.rows,preliminaryNeeds:reportNeeds,
   workTitleRu:"Монтаж навесного фасада с керамогранитной облицовкой",issuancePurpose:pdfIssuancePurpose};
  const reviewAck=pdfIssuancePurpose==='PRELIMINARY_REVIEW'?canonicalProfessionalPdfReviewAcknowledgmentV1({
   revision:reportRevision,resources:reportResources,
   request:{acknowledgedPreliminaryReview:true,revisionId:reportRevision.id,releaseId:reportRevision.release_id,
    definitionVersionId:"TEST_ONLY_UNPUBLISHED_PORCELAIN_SOURCE_FRAGMENT",checksumSha256:reportRevision.checksum_sha256},
   actorUserId:'TEST_ONLY_SOURCE_FRAGMENT_UNIT_ACTOR',acknowledgedAt:'2026-10-30T00:00:00.000Z'}):undefined;
  if(pdfIssuancePurpose==='PRELIMINARY_REVIEW'){
   assert(reviewAck);
   const originalAudit=canonicalProfessionalPdfReportOriginalAuditV1({revision:reportRevision,resources:reportResources});
   assert.equal(originalAudit.pdfAllowed,false);assert.equal(originalAudit.definitionAdmissionAllowed,false);
   assert.equal(originalAudit.completeClaimAllowed,false);
   assert.equal(originalAudit.issues.filter(issue=>issue.code==='RESOURCE_UNIT_UNRESOLVED').length,5);
   assert(originalAudit.issues.some(issue=>issue.code==='INDEPENDENT_OPERATION_COMPOSITION_UNVERIFIED'));
   assert.throws(()=>buildCanonicalProfessionalPdfProjection(reportInput),{code:'ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID'});
   pdfReviewNegativeCases++;
   assert.throws(()=>buildCanonicalProfessionalPdfProjection({...reportInput,
    reviewAcknowledgmentV1:{...reviewAck,checksumSha256:'0'.repeat(64)}}),{code:'ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID'});
   pdfReviewNegativeCases++;
  }
  const projection=buildCanonicalProfessionalPdfProjection({...reportInput,reviewAcknowledgmentV1:reviewAck});
  if(pdfIssuancePurpose==='PRELIMINARY_REVIEW'){
   assert(projection.html.includes('saved-report-warnings'));assert(projection.html.includes('composition-acceptance'));
  }
  assertCanonicalProfessionalPdfMoneyCells(projection.html);
  const name=escapeCanonicalArtifactHtml(independent.publicResourceNames['stock:facade-platform']);
  const displayRows=[...projection.html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gu)].filter(match=>match[1]?.includes('<strong>'+name+'</strong>'))
   .map(match=>({number:match[1]!.match(/<td class="number">(.*?)<\/td>/u)?.[1],
    cells:[...match[1]!.matchAll(/<td class="money">(.*?)<\/td>/gu)].map(cell=>cell[1])}));
  const referenceRows=displayRows.filter(row=>row.cells[0]===canonicalArtifactMoney('200','KGS'));
  const ownerRows=displayRows.filter(row=>row.cells[0]===canonicalArtifactMoney(prices.toolMode[mode],'KGS'));
  const expectedUses=independent.stockResources.find(item=>item.key==='facade-platform')!.operationKeys.length;
  assert.equal(referenceRows.length,expectedUses);assert(referenceRows.every(row=>row.cells[1]===''));
  assert.equal(new Set(referenceRows.map(row=>row.number)).size,1,'SAME_SOURCE_RESOURCE_NUMBER_EVERY_REFERENCE');
  assert.equal(ownerRows.length,expectedUses);assert.equal(new Set(ownerRows.map(row=>row.number)).size,1);
  const paidAppearances=ownerRows.filter(row=>row.cells[1]!=='');assert.equal(paidAppearances.length,1,'ONE_AMOUNT_FOR_ALL_SHARED_CONSUMERS');
  assert.deepEqual(paidAppearances[0]!.cells,[canonicalArtifactMoney(prices.toolMode[mode],'KGS'),canonicalArtifactMoney(prices.toolMode[mode],'KGS')]);
  assert.equal(projection.pricedRowCount,44);assert.equal(projection.preliminaryNeedCount,5);assert.equal(projection.grandTotalStatus,'PARTIAL_NEEDS_PRICE');
  assert.equal(cmp(String(projection.categoryTotals.work),independent.expectedMoney.labor),0);
  assert.equal(cmp(String(projection.categoryTotals.material),independent.expectedMoney.material),0);
  assert.equal(cmp(String(projection.categoryTotals.equipment),independent.expectedMoney.equipment[mode]),0);
  assert.equal(JSON.stringify(result),rawBefore,'COMMON_PROJECTION_MUST_NOT_MUTATE_RAW_REFERENCE_PRICES_OR_NEEDS');
 }
 const twoLinks=await call('07-two-source-links',{confirmed:{...confirmed,porcelain_published_stock_links:'2'}});sourceOracle(twoLinks,'100',2);
 const missing=await call('08-missing-readback',{confirmed:sourceFacts()});
 for(const key of independent.protectedNeedKeys)assert(missing.preliminaryNeeds.some(need=>need.row_id===rid('need:'+key)&&need.quantity===null));
 assert(!missing.rows.some(row=>row.included_in_estimate||row.included_in_procurement),'NO_PROJECT_BOM_OR_LINKS_FROM_NORMATIVE_PROFILE');
 const partial={...confirmed};delete partial.porcelain_bom_bracket;
 const missingBracket=await call('09-missing-project-bracket',{confirmed:partial});
 assert.equal(missingBracket.preliminaryNeeds.length,8,'FIVE_SOURCE_NEEDS_PLUS_THREE_DEPENDENCIES_OF_ONE_OBJECT_QUANTITY');
 for(const key of['labor:brackets','consumed:bracket','supply:bracket']){
  assert(!missingBracket.rows.some(row=>row.row_id===rid(key)));
  assert(missingBracket.preliminaryNeeds.some(need=>need.row_id===rid(key)&&need.quantity===null));}
 quantity(missingBracket,'supply:base-anchor','200');quantity(missingBracket,'supply:stone-wool','11');
 const zero=await call('10-zero-scope',{submitted:{[primary]:'0',porcelain_work_top_height_m:'0'},confirmed:sourceFacts()});
 assert.equal(zero.rows.length,0);assert.equal(zero.preliminaryNeeds.length,0);assert.equal(zero.totals.amount,'0');
 await assert.rejects(()=>call('11-reject-exact-method',{confirmed:{...confirmed,porcelain_exact_whole_method:'СКРЫТОЕ_КРЕПЛЕНИЕ_ИЛИ_ДРУГОЙ_МАТЕРИАЛ'}}),{code:'PARAMETER_VALIDATION_FAILED'});
 await assert.rejects(()=>call('12-reject-protected-zero-norms',{confirmed:{...confirmed,
  ...Object.fromEntries(independent.protectedNeedKeys.map(key=>['porcelain_internal_'+key.replaceAll('-','_'),'0']))}}),{code:'PARAMETER_VALIDATION_FAILED'});
 await assert.rejects(()=>call('13-reject-raw-project-echo',{submitted:{...geometry,porcelain_approved_structural_project:fixture.porcelain_approved_structural_project}}),{code:'PARAMETER_VALIDATION_FAILED'});
 await assert.rejects(()=>call('14-reject-height',{submitted:{...geometry,porcelain_work_top_height_m:'50.001'}}),{code:'PARAMETER_VALIDATION_FAILED'});
 await assert.rejects(()=>call('15-reject-panel-thickness',{confirmed:{...confirmed,porcelain_panel_thickness_mm:'8'}}),{code:'PARAMETER_VALIDATION_FAILED'});
 await assert.rejects(()=>call('16-reject-fractional-anchor',{confirmed:{...confirmed,porcelain_bom_base_anchor:'200.5'}}),{code:'PARAMETER_VALIDATION_FAILED'});
 await assert.rejects(()=>call('17-reject-insulation-thickness',{confirmed:{...confirmed,porcelain_insulation_thickness_mm:'120'}}),{code:'PARAMETER_VALIDATION_FAILED'});
 await assert.rejects(()=>call('18-reject-fractional-links',{confirmed:{...confirmed,porcelain_published_stock_links:'1.5'}}),{code:'PARAMETER_VALIDATION_FAILED'});
 await assert.rejects(()=>call('19-reject-insufficient-layout',{confirmed:{...confirmed,porcelain_approved_layout_surface_m2:'99'}}),{code:'PARAMETER_VALIDATION_FAILED'});
 await assert.rejects(()=>call('20-reject-weak-base',{confirmed:{...confirmed,porcelain_base_density_kg_m3:'599'}}),{code:'PARAMETER_VALIDATION_FAILED'});
 await assert.rejects(()=>call('21-reject-old-primary',{parentPrimaryMeasure:{parameterId:'facade_area_m2',unitId:'m2'}}),
  {code:'PRIMARY_MEASURE_NEW_ROOT_REQUIRED'});
 await assert.rejects(()=>call('22-reject-wrong-source-sha',{sourceArtifactSha256:'f'.repeat(64)}),{code:'PARAMETER_VALIDATION_FAILED'});
 assert.deepEqual(observedPhases,expected.expectedEntryPhases);
 assert.equal(entryCalls,22);assert.equal(canonicalResults,10);assert.equal(strictRejects,12);
 assert.equal(coreCalls,13);assert.equal(preCoreRejects,9);
 return{status:'FINITE_EXISTING_NVF_WHOLE_PORCELAIN_GATE_NOT_PUBLICATION',entryCalls,coreCalls,canonicalResults,strictRejects,preCoreRejects,
  existingUnpricedBeforeAfter:'SAME_QUANTITIES_COST_PROCUREMENT',newNorms:0,independentMapEntries:151,
  materialSupplyOwners:23,literalStockTypes:16,toolProvisionModes:3,paidOwnersPerMode:44,
  activeProtectedNeeds:5,definitionWideProtectedNeeds:30,actualNeedClosures:0,approvedActualProjectObjects:0,
  sourceBOMAndStockNotAreaRates:true,stockLinkCrewSizeUnknown:true,sharedPublicProjectionCases:3,
  pdfIssuancePurpose,pdfReviewNegativeCases,
  publicStockReferenceAmountsBlank:true,rawStockReferenceAmount:'200',onePaidAmountAcrossSharedConsumers:true,
  normalLockedDbPreflight:'UNRUN_ROOT_ONLY',normalPublisherExecuted:false,DBWrites:0,fullTechnicalAcceptance:false,newFULL:0};
}
export{verifyWhole as verifyFacadeVentilatedPorcelainWholeR214};
