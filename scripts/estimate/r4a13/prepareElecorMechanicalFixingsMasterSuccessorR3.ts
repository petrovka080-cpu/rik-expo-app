import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import fixture from '../../../data/estimate-benchmarks/fixtures/elecor-mechanical-fixings-current-parent-r2.json';
import pack from '../../../data/estimate-benchmarks/source-packs/elecor-project-mechanical-fixings-completion-r1.json';
import {prepareElecorMechanicalFixingsCurrentPublicationR2} from './prepareElecorMechanicalFixingsCurrentPublicationR2';
import {masterRetainedParentCaptureSha256R1,prepareMasterRetainedBindingRepresentativeR1,
 type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import type {MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';

type Json=Record<string,any>;
const decisionPath='data/estimate-benchmarks/fixtures/elecor-root-completion-decision-r1.json';
const decisionSha='b2058ac7d67a41761aa4f5535d3906a60ad87bc2e19b75db53f53e8dc268c9dd';
const contract='rik-expo-app.elecor-ppr-fixings-master-successor.r3';

/** Configuration only. The existing governed Master publisher owns all SQL,
 * source absence/exactness, locked recheck, release/search and pointer writes. */
export function prepareElecorMechanicalFixingsMasterSuccessorR3(input:Readonly<{
 sourceHead:string;sourceTree:string;evidenceSha256:string;outputRoot?:string;
}>):MasterSingleDefinitionSuccessorConfig{
 const decision=readFileSync(decisionPath);
 assert.equal(createHash('sha256').update(decision).digest('hex'),decisionSha);
 const candidate=prepareElecorMechanicalFixingsCurrentPublicationR2(fixture.parent as unknown as PurchaseGroupRepresentative,fixture.context,{
  releaseId:'11111111-1111-5111-8111-111111111111',sourceHead:input.sourceHead,sourceTree:input.sourceTree,
  masterSha256:'dfbb757a1562962636259c1c4cffd9127d15882b00cdd49baa8fcd4831bcacf2',
  evidenceSha256:input.evidenceSha256,rootDecisionPin:{path:decisionPath,sha256:decisionSha},
 });
 const r=candidate.previewRepresentative;
 const capture={definition:fixture.parent.definition,baseline:fixture.parent.baseline,
  parameters:fixture.parent.parameters,formulas:fixture.parent.formulas,resources:fixture.parent.resources,
  bindings:fixture.parent.bindings,normativeSources:fixture.normativeSources,normativeLocators:fixture.normativeLocators};
 const oldIds=new Set(capture.parameters.map(p=>p.parameter_id));
 const newParameterSources:Record<string,MasterRetainParentBindingsR1['newParameterSources'][string]>={};
 for(const p of r.parameters.filter(p=>!oldIds.has(p.parameter_id))){
  const role=String(p.truth_metadata.value_source_role);
  newParameterSources[p.parameter_id]=role==='UNRESOLVED_APPLICATION_NORM'?{kind:'UNRESOLVED',sourceIds:[]}
   :role.includes('DERIVED')?{kind:'DERIVED',sourceIds:p.truth_metadata.effective_resource_quantity_v1?[]:[pack.sourceId]}
   :{kind:'KNOWN',sourceIds:[pack.sourceId]};
 }
 const rowIds=['electrical:elecor-60x40-single-route:fixings-consumed',pack.priceOwnerRowId];
 const locator=candidate.registryRequirements.locator;
 const applicabilityByRowId=locator.locator.explicitBindingApplicabilityByRowId as Record<string,Json>;
 const retained:MasterRetainParentBindingsR1={capturedParent:capture,
  capturedParentSha256:masterRetainedParentCaptureSha256R1(capture),newParameterSources};
 const control=r.baseline.input_values;
 const cfg:MasterSingleDefinitionSuccessorConfig={
  contract,stopCode:'ELECOR_PPR_FIXINGS_CURRENT_R3',applicationName:'elecor-ppr-fixings-current-r3',
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/MASTER_TZ_GOX_BUILD_PRODUCTION (11).md',
  masterSha256:'dfbb757a1562962636259c1c4cffd9127d15882b00cdd49baa8fcd4831bcacf2',
  parentReleaseId:fixture.context.definitionReleaseId,parentSearchReleaseId:fixture.context.searchReleaseId,
  currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',
  outputRoot:input.outputRoot??'.release-runtime/r568/elecor-ppr-fixings-current-r3',
  sourcePaths:[
   'scripts/estimate/r4a13/prepareElecorMechanicalFixingsMasterSuccessorR3.ts',
   'scripts/estimate/r4a13/prepareElecorMechanicalFixingsCurrentPublicationR2.ts',
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
   'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
   'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
   'src/lib/estimate/v4/elecorMechanicalProjectFixingsCompletionR1.ts',
   'src/lib/estimate/v4/elecorSingleRouteMaterialR1.ts','src/lib/estimate/v4/automaticConstructionOwnerR1.ts',
   'src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
   'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
   'src/lib/estimate/backendPlatform/canonicalEffectiveResourceQuantityV1.ts',
   'src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1.ts',
   'scripts/estimate/backendMigration/canonicalImmutableCalculationContinuityR1.ts',
   'src/lib/estimate/backendPlatform/canonicalImmutableCalculationContinuityV1.ts',
   'scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts',
   'data/estimate-benchmarks/fixtures/elecor-mechanical-fixings-current-parent-r2.json',
   'data/estimate-benchmarks/fixtures/elecor-mechanical-fixings-current-read-r1.json',decisionPath,
   'data/estimate-benchmarks/source-packs/elecor-project-mechanical-fixings-completion-r1.json',
   'data/estimate-benchmarks/source-packs/public-estimate-language-s27-50.json',
   pack.officialPassport.path,pack.fixedProduct.source.path,pack.exactElecorProductPage.path,
  ],
  catalogId:pack.catalogId,sourceId:pack.sourceId,normId:'PROJECT_FIXING_SCHEDULE_NOT_MANUFACTURER_OR_LABOUR_NORM',
  sourceMetadata:{source_title:'IEK ELECOR: крепёж fischer 535463 по проекту производства работ',
   source_authority:'IEK GROUP; fischerwerke; проект производства работ и ведомость точек пользователя',
   exact_locator:pack.officialPassport.locatorRu+'; fischer 535463: 50 комплектных пар в коробке; количество точек и узел — по принятому ППР.',
   use_restriction:'Только точный комплект, подтверждённый узел и точки по ППР. Рекомендация шага не задаёт число точек. Труд и полный цикл не приняты.',
   source_kind:'MANUFACTURER_METHOD_AND_EXACT_PRODUCT_WITH_PROJECT_QUANTITY_NOT_LABOUR_NORM',
   official_url:pack.officialPassport.url,artifact_sha256:'4ff75bc9f8374afc6cd268fbf91574b556625a0cb324ee048faa00a4f7388928'},
  parameterDefinitions:r.parameters,formulaDefinitions:r.formulas,resourceDefinitions:r.resources,
  shortInput:{elecor_route_m:25},acceptanceInput:control,runtimeProfileInput:{},
  expectedParentShape:[22,26,26],benchmarkOrdinal:84,
  validationScenario:'ELECOR_PPR_38_COMPLETE_PAIRS_ORDER_50_CONTROL_ONLY_NOT_REAL_PROJECT',
  passport:{canonicalRuName:'Материалы IEK ELECOR 60×40: прямой участок и крепёж по ППР — частичный состав',
   workKey:fixture.parent.definition.passport.workKey,physicalResultRu:r.passport.physical_result_ru,
   includedScopeRu:[...fixture.parent.passport.included_scope_ru,
    'Отдельный материал крепления fischer 535463 по принятому узлу и числу точек ППР; одна штука — комплект дюбель и винт.'],
   excludedScopeRu:fixture.parent.passport.excluded_scope_ru,
   independentCompletenessMap:r.passport.decision.independentCompletenessMap,
   unresolvedApplicableResourceRowIds:r.passport.decision.unresolvedResourceRowIds},
  applicability:{...fixture.parent.definition.applicability,mechanicalFixingsPprContract:pack.contract,
   projectSkuSystemCertificationClaimed:false,installationLabourNormAccepted:false,fullTechnicalAcceptance:false},
  binding:{rowId:rowIds[0]!,additionalRowIds:[rowIds[1]!],applicability:{projectQuantityOnly:true},
   applicabilityByRowId,retainParentBindings:retained},
  locator:{key:locator.locator_key,payload:locator.locator},
  search:{primaryUom:'m',canonicalNameRu:'Материалы IEK ELECOR 60×40: прямой участок и крепёж по ППР — частичный состав',
   aliases:[...fixture.searchDocument.aliases,'ELECOR 60×40: крепёж по ППР','fischer 535463 DuoPower 6×30 с винтом Panhead 4,5×40'],
   shortScopeRu:'Секции и соединители прямого участка; крепёж — только для принятого узла и точек ППР. Монтажный труд и остальные открытые части не нормированы.',
   keyDistinguishingParameters:['elecor_route_m','elecor_route_scope','elecor_fixing_method','elecor_fixing_ppr_point_count'],
   clarificationFields:r.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),
   includedBoundaries:[pack.scopeRu],excludedBoundaries:fixture.parent.passport.excluded_scope_ru,
   extraSearchTermsRu:'кабель-канал ELECOR 60x40 крепление бетонная стена DuoPower 535463 коробка 50 комплектов проект производства работ',
   sourceProvenance:{contract,sourceReadSha256:fixture.sourceReadPin.sha256,rootDecisionSha256:decisionSha,
    materialOnly:true,staticAcrossMethodsNeeds:8,activeMechanicalNeeds:7,fullTechnicalAcceptance:false}},
  forbiddenAdjacentMatchers:[/hep2o|knauf|tarkett|heating_hvac/iu],owner:'ROOT_SINGLE_INTEGRATOR',
  receiptFileStem:'elecor_ppr_fixings_current_r3',
  verifyCore:async()=>{
   const proof=await candidate.verifyCore();
   const source=candidate.registryRequirements.source;
   const assembled=prepareMasterRetainedBindingRepresentativeR1({config:cfg,
    newSource:{...source,effective_from:null,effective_to:null},newLocators:[locator]},
    {parameters:r.parameters,formulas:r.formulas,resources:r.resources,
     newBindings:rowIds.map(row_id=>({row_id,locator_id:locator.id,applicability:applicabilityByRowId[row_id]})),
     successorProvenance:{contract,sourceReadSha256:fixture.sourceReadPin.sha256},lifecycleMetadata:{contract}});
   assert.equal(assembled.expectedNormativeBindingCount,20);
   for(const[id,sources]of Object.entries(capture.baseline.normative_source_ids))assert.deepEqual(assembled.normativeSourceIds[id],sources);
   return {...proof,status:'PASS_PARTIAL_ELECOR_FIXINGS_MASTER_CONFIG_AND_RETAINED_SOURCE_CORE_ONLY',
    serializedSha256:createHash('sha256').update(JSON.stringify(proof)).digest('hex'),newCatalogs:0,newCompleteTypes:0};
  },
 };
 return cfg;
}
