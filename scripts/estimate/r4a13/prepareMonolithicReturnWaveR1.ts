/** ROOT-owned composition only. The existing single-definition publisher owns all writes. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {monolithicPhysicalProvisionPackR2 as pack} from '../../../src/lib/estimate/v4/monolithicPhysicalProvisionR2';
import {monolithicPhysicalCaptureR2 as capture,monolithicPhysicalRepresentativeR2 as representative,
 monolithicPreparedModelFingerprintR2 as fingerprint} from '../../../src/lib/estimate/v4/monolithicPhysicalProvisionMasterR2';
import {monolithicRemainingProfilesForCatalogR1 as structuralProfiles,buildMonolithicRemainingSuccessorR1 as structuralBuild} from '../../../src/lib/estimate/v4/monolithicRemainingMasterBuilderR1';
import {monolithicRemainingMasterConfigR1 as structuralConfig} from './prepareMonolithicRemainingStructuresR1';
import {monolithicPhysicalCompositeConfigR2 as physicalConfig} from './prepareMonolithicPhysicalProvisionR2';
import {masterRetainedParentCaptureSha256R1,type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {validateIndependentCompletenessMapReferences,validateMasterFormulaGraphConsistency,type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';
type J=Record<string,any>;
type Context={releaseId:string;searchReleaseId:string;outputRoot?:string;sourceRoot?:string};
const fileSha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const valueSha=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const repairFixturePath='data/estimate-benchmarks/fixtures/monolithic-return-retained-formula-expression-repairs-r1.json';
const expressionRepairs=require('../../../data/estimate-benchmarks/fixtures/monolithic-return-retained-formula-expression-repairs-r1.json') as {cards:J[]};
const masterPath='C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_12_2026-10-22.txt';
const masterSha='10ff85f13544fb0bb29194baa91da506f7de342f3e8d2b370f61017a14e81245';
const names=['Опалубка плиты перекрытия','Бетонирование перекрытия','Бетонирование фундаментной плиты','Бетонирование лестницы',
 'Бетонирование ленточного фундамента','Монолитная железобетонная балка','Монолитная железобетонная колонна','Монолитная железобетонная стена'];
const paths=['scripts/estimate/r4a13/prepareMonolithicReturnWaveR1.ts','scripts/estimate/r4a13/prepareMonolithicReturnWaveR1.test.ts',
 repairFixturePath,'scripts/estimate/r4a13/monolithicReturnRetainedExpressionRepairsR1.test.ts',
 'src/lib/estimate/v4/monolithicRemainingOperationBindingsR1.test.ts','data/estimate-benchmarks/fixtures/monolithic-remaining-manual-money-oracle-r1.json',
 'scripts/estimate/r4a13/monolithicRepeatedRetainedContinuationR1.ts','scripts/estimate/r4a13/monolithicRepeatedRetainedContinuationR1.test.ts',
 'data/estimate-benchmarks/fixtures/monolithic-repeat-retained-continuation-registration-r1.json',
 'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts','src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1.ts'];
function retainedCurrent(c:J):MasterRetainParentBindingsR1{
 const m=c.definition.source_metadata;
 return{capturedParent:c as any,capturedParentSha256:masterRetainedParentCaptureSha256R1(c as any),newParameterSources:{},
  ...(m.retainedParentBindingSuccessorV1?{successorProvenanceContinuation:{contract:'master-retained-binding-continuation/r1' as const,
   capturedSourceMetadata:structuredClone(m),capturedSourceMetadataSha256:valueSha(m),
   capturedPreviousSuccessorSha256:valueSha(m.retainedParentBindingContinuationV1?.successor??m.retainedParentBindingSuccessorV1)}}:{})};
}
/** Five unchanged current models need no structural re-publication in between.
 * An empty historical operation map makes no claim that old formwork is complete. */
function currentBase(context:Context,catalogId:string):Config{
 const c=capture(catalogId),model=representative(catalogId),i=pack.targets.findIndex(t=>t.catalogId===catalogId),p=c.contentPassport,
  input=structuredClone(c.baseline.input_values),sourceId='root_monolithic_current_base_card'+(i+1),
  map=structuredClone(p.decision?.independentCompletenessMap??{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',
   sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,operationResourceBindingRequired:true,
   evidenceSha256:pack.parentRawSha256,evidenceReferences:[pack.parentFixture],entries:[],fullTechnicalAcceptance:false}),
  unresolved=structuredClone(p.decision.unresolvedResourceRowIds??[]);
 assert(i>=0);
 return{contract:pack.contract,stopCode:'ROOT_MONOLITHIC_CURRENT_BASE_'+(i+1),applicationName:'monolithic-original-base-'+(i+1),
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath,masterSha256:masterSha,parentReleaseId:context.releaseId,parentSearchReleaseId:context.searchReleaseId,
  currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',outputRoot:context.outputRoot??'.release-runtime/r568/monolithic-return/card'+(i+1),
  sourcePaths:[...paths,pack.parentFixture],catalogId,sourceId,normId:'ORIGINAL_CURRENT_PARENT_ONLY',
  sourceMetadata:{source_title:'Сохранённые исходные данные монолитной конструкции',source_authority:'Точные зарегистрированные источники исходной карточки',
   source_kind:'CURRENT_PARENT_BASE_NOT_SEPARATELY_PUBLISHED',artifact_sha256:pack.parentRawSha256,
   exact_locator:c.definition.id+'; '+c.baseline.id,use_restriction:'Промежуточная композиция исходной карточки; новых норм и полноты не утверждает.'},
  parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,shortInput:input,acceptanceInput:input,
  runtimeProfileInput:input,runtimeProfileClassification:Object.fromEntries(Object.keys(input).map(k=>[k,c.baseline.input_classification[k]])),
  runtimeProfileSourceIds:Object.fromEntries(Object.keys(input).map(k=>[k,c.baseline.normative_source_ids[k]])),
  expectedParentShape:[c.parameters.length,c.formulas.length,c.resources.length],benchmarkOrdinal:0,validationScenario:'EXACT_CURRENT_PARENT_BASELINE_WITH_PHYSICAL_SUPPLEMENT',
  passport:{canonicalRuName:names[i]!,workKey:catalogId.split(':').at(-1)!,physicalResultRu:p.physical_result_ru,
   includedScopeRu:p.included_scope_ru,excludedScopeRu:p.excluded_scope_ru,independentCompletenessMap:map,...(unresolved.length?{unresolvedApplicableResourceRowIds:unresolved}:{})},
  applicability:{...model.definition.applicability,fullTechnicalAcceptance:false,newFullTechnologies:0},
  binding:{rowId:model.resources[0]!.row_id,applicability:{currentParentBaseOnly:true},retainParentBindings:retainedCurrent(c)},
  locator:{key:'root-current-monolithic-base-'+(i+1),payload:{originalParentId:c.definition.id,originalBaselineId:c.baseline.id,notSeparatelyPublished:true}},
  search:{primaryUom:'m3',canonicalNameRu:names[i]!,aliases:[names[i]!],shortScopeRu:'Исходные технологии и физическое обеспечение с видимыми незакрытыми потребностями.',
   keyDistinguishingParameters:[],clarificationFields:[],includedBoundaries:p.included_scope_ru,excludedBoundaries:p.excluded_scope_ru,
   extraSearchTermsRu:'бетон монолит железобетон',sourceProvenance:{originalCurrentDefinitionId:c.definition.id,wholeFamilyFull:false}},
  forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_INTEGRATOR_MONOLITHIC_RETURN',receiptFileStem:'monolithic_return_card'+(i+1),
  verifyCore:async()=>{assert.equal(fileSha(masterPath),masterSha);assert.equal(fileSha(pack.parentFixture),pack.parentRawSha256);
   if(p.decision?.independentCompletenessMap){
    assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
   }else{
    // This private original-base snapshot is never published separately. The
    // final physical composer independently validates its nonempty merged map.
    assert.equal(c.definition.id,'733e0d11-dbfd-5033-8366-f250e752168c');
    assert.equal(c.definition.definition_sha256,'9016d3b2a14baf73d2370acf2b2ec2d434e3f8033a6e78ad7c80896af483765a');
    assert.deepEqual(map.entries,[]);assert.equal(map.fullTechnicalAcceptance,false);
   }
   assert.deepEqual([model.parameters,model.formulas,model.resources],[c.parameters,c.formulas,c.resources]);
   return{status:'EXACT_CURRENT_SOURCE_BASE_PRESERVED',newFull:0,oldUnresolvedRows:unresolved.length};}};
}
/** Finite successor text correction. The captured old AST, inputs, output unit,
 * hashes, database rows and historical revisions remain immutable. The normal
 * retained guard independently recompiles each explicitly declared correction. */
function retainedExpressionTextConfig(c:J,config:Config):Config{
 const card=expressionRepairs.cards.find(x=>x.catalogId===c.definition.catalog_id);assert(card,'EXACT_REPAIR_CAPTURE_CARD_REQUIRED');
 assert.equal(c.definition.id,card.definitionId);assert.equal(c.definition.definition_version,card.definitionVersion);assert.equal(c.definition.definition_sha256,card.definitionSha256);
 assert.equal(c.baseline.id,card.baselineId);assert.equal(config.binding.retainParentBindings?.capturedParentSha256,card.capturedParentSha256);
 if(card.formulaExpressionRepairs==null){assert.equal(card.status,'NO_REPAIR_REQUIRED');return config;}
 const repairs=card.formulaExpressionRepairs as Record<string,{capturedExpressionSource:string;correctedExpressionSource:string}>,ids=Object.keys(repairs);
 assert.equal(card.status,'EXACT_SUCCESSOR_TEXT_REPAIRS');assert(ids.length>0);
 assert.equal(c.definition.id,'733e0d11-dbfd-5033-8366-f250e752168c');assert.equal(ids.length,17);
 const formulas=config.formulaDefinitions.map(f=>{const repair=repairs[f.formula_id];if(!repair)return f;assert.equal(f.expression_source,repair.capturedExpressionSource);return{...f,expression_source:repair.correctedExpressionSource};});
 assert(ids.every(id=>formulas.some(f=>f.formula_id===id)));assert.deepEqual(validateMasterFormulaGraphConsistency(formulas),[]);
 return{...config,formulaDefinitions:formulas,binding:{...config.binding,retainParentBindings:{...config.binding.retainParentBindings!,formulaExpressionRepairs:structuredClone(repairs)}},
  locator:{...config.locator,payload:{...config.locator.payload,retainedExpressionTextRepair:{fixturePath:repairFixturePath,fixtureSha256:fileSha(repairFixturePath),catalogId:card.catalogId,definitionId:card.definitionId,capturedParentSha256:card.capturedParentSha256,formulaIds:ids,astInputUnitHashUnchanged:true,newQuantityOrPriceTransferPermission:false}}},
  verifyCore:async()=>{const original=await config.verifyCore();assert.deepEqual(validateMasterFormulaGraphConsistency(formulas),[]);return{...original,retainedExpressionTextsCorrected:ids,arithmeticChanged:false};}};
}
export function monolithicReturnWaveConfigR1(context:Context,catalogId:string):Config{
 const c=capture(catalogId),old=representative(catalogId),hasStructural=structuralProfiles(catalogId).length>0,
  prepared=hasStructural?structuralBuild(old):old,base=hasStructural?structuralConfig(context,catalogId):currentBase(context,catalogId);
 // Synthetic source controls belong to tests. The published historical runtime
 // profile keeps the exact accepted inputs, including an omitted selector.
 const baselineBase={...base,acceptanceInput:structuredClone(c.baseline.input_values),sourcePaths:[...new Set([...base.sourcePaths,...paths])]};
 const composite=physicalConfig(baselineBase,prepared,{contract:'root-approved-structural-then-physical/r2',originalDefinitionId:c.definition.id,
  originalDefinitionSha256:c.definition.definition_sha256,approvedPreparedModelFingerprint:fingerprint(prepared)},context);
 const unresolved=[...new Set([...(c.contentPassport.decision.unresolvedResourceRowIds??[]),
  ...(base.passport.unresolvedApplicableResourceRowIds??[]),...(composite.passport.unresolvedApplicableResourceRowIds??[])])];
 return retainedExpressionTextConfig(c,{...composite,passport:{...composite.passport,unresolvedApplicableResourceRowIds:unresolved.length?unresolved:undefined}});
}
export const monolithicReturnWaveTargetsR1=pack.targets.map((t,i)=>({...t,canonicalNameRu:names[i]!,configFactory:monolithicReturnWaveConfigR1}));
