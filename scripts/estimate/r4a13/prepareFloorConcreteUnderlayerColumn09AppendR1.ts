// Config authoring only. Reuses the sole governed publisher; no PG/CLI invocation on import.
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import type {MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import type {MasterCapturedScopedNormativeRegistryR1,MasterScopedNormativeRegistryInputR1} from './masterScopedNormativeRegistryPreimageR1';
import {floorConcreteUnderlayerPackR1 as pack,floorConcreteUnderlayerDefinitionR1,
 floorConcreteUnderlayerCompletenessMapR1,floorConcreteUnderlayerScenarioFactsR1} from '../../../src/lib/estimate/v4/floorConcreteUnderlayerKrer11Column09R1';
import {floorConcrete00209AdmittedDefinitionR1,floorConcrete00209AppendIdentityR1 as identity,
 floorConcrete00209ExplicitParameterSourcesR1,type FloorConcrete00209RootScopeR1} from '../../../src/lib/estimate/v4/floorConcreteUnderlayer00209AdmittedR1';
import {compileCanonicalEstimateCore} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalMachineHourPriceRequirementV1} from '../../../src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1';

type Json=Record<string,any>;
type Pin=Readonly<{path:string;sha256:string}>;
export type FloorConcrete00209AppendEvidenceR1=Readonly<{rootDecision:Pin;scopedRegistryCapture?:Pin}>;
const F='data/estimate-benchmarks/fixtures/floor-concrete00209-r65b/';
// Byte-exact copies of ROOT's actual WORK receipts; no re-serialized or synthetic replacements.
const intakePin={path:F+'current-intake-result-r65b.json',sha256:'97da664fd5b9c444dfb1feb37f531700459c20ad5c13ac773367bf5cd72e17fe'};
const guardPin={path:F+'floor-current-read-r65b-receipt.json',sha256:'e36510e4609214c4220674c0f823e36627bdcb42bb10858767d5ed77c964c73c'};
const sqlPin={path:F+'current-floor-underlayer-intake-headers-r65b.sql',sha256:'ca5f3628082a919b924d787c7a22646007a8e9be927d8130079161b54ec8fb26'};
const sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const hash=(value:unknown)=>sha(canonicalEstimateStableJson(value));
const expectedPair={definitionReleaseId:'f36fa786-6634-518c-853d-b9ae54ab3ccf',searchReleaseId:'304b7f3f-1618-5e0e-91ea-da062e4f287e'};
const packPath='data/estimate-benchmarks/source-packs/floor-concrete-underlayer-krer11-002-09-r1.json';
const factoryPath='src/lib/estimate/v4/floorConcreteUnderlayerKrer11Column09R1.ts';
function load(pin:Pin):Json {
 const path=pin.path.replaceAll('\\','/');
 assert(path.startsWith(F)
  &&!path.split('/').includes('..'),'FLOOR00209_ROOT_EVIDENCE_PATH');
 assert(/^[a-f0-9]{64}$/u.test(pin.sha256),'FLOOR00209_ROOT_EVIDENCE_SHA');
 const bytes=readFileSync(resolve(pin.path));assert.equal(sha(bytes),pin.sha256,'FLOOR00209_EXACT_EVIDENCE:'+pin.path);
 return JSON.parse(bytes.toString('utf8'));
}
/** Evidence classifier only. Source registry diagnostics do not become captured publication preconditions. */
export function assertFloorConcrete00209CurrentIntakeR1(read:Json,guard:Json):Json {
 assert.equal(read.status,'PASS_READ_ONLY_CURRENT_CONCRETE_UNDERLAYER_INTAKE_R65B');
 assert.equal(read.databaseWrites,false);assert.equal(read.completeReadSet,true);assert.equal(read.error,null);
 assert.equal(read.allTransactionsRolledBack,true);assert.equal(read.allConnectionsClosed,true);
 assert.equal(read.publicationAdmitted,false);assert.equal(read.rawDiagnosticIsNotScopedRegistryCapture,true);
 assert.equal(guard.status,'PASS_BOUNDED_READ_ONLY_CURRENT_FLOOR_UNDERLAYER_INTAKE_R65B');
 assert.equal(guard.error,null);assert.deepEqual(guard.cleanupErrors,[]);
 assert.equal(guard.noOwnedProcessStillRunning,true);assert.deepEqual(guard.remainingOwnedProcesses,[]);
 assert.deepEqual(read.session,{db:'rik_r4_runtime_b5_v2',host:'127.0.0.1',port:55432,
  readOnly:'on',snapshot:'538059:538059:',isolation:'repeatable read'});
 assert.deepEqual(read.wireBounds,{rowCount:28,maxRowBytes:33430,maxWireRowBytes:33519,wireBytes:84014});
 assert.equal(read.rows.length,28);
 const sets=(kind:string)=>read.rows.filter((r:Json)=>r.kind===kind);
 for(const [kind,count] of [['base',1],['comparison',8],['header',15],['sourceDiagnostic',2],['locatorDiagnostic',2]] as const)
  assert.equal(sets(kind).length,count,'FLOOR00209_EXACT_READSET:'+kind);
 assert.deepEqual([...new Set(read.rows.map((r:Json)=>r.kind))].sort(),['base','comparison','header','locatorDiagnostic','sourceDiagnostic']);
 const base=sets('base')[0].payload;
 assert.equal(base.parent.id,expectedPair.definitionReleaseId);assert.equal(base.parent.status,'prepared');
 assert.equal(base.parent.activated_at,null);assert.equal(base.parent.source_commit,'377d8c295d1b146c7941ace1c60f1900ef6f73c5');
 assert.equal(base.parent.source_tree,'2ace8684ea59bf6a68da635fc86ba2deea560da7');
 assert.equal(base.parentSearch.id,expectedPair.searchReleaseId);assert.equal(base.parentSearch.status,'draft');
 assert.equal(base.parentSearch.definition_release_id,expectedPair.definitionReleaseId);
 assert.equal(base.parentSearch.activated_at,null);assert.equal(base.parentSearch.sealed_at,null);
 assert.deepEqual(base.counts,{authoredDefinitions:1,searchDocuments:10462,cumulativeMembership:10471,activeCompileJobs:0});
 assert.deepEqual(Object.keys(base.collisionCounts).sort(),['definitions','exactLocators','groups','identities','membership','ordinal','search','sourceKeys']);
 assert(Object.values(base.collisionCounts).every(v=>v===0),'FLOOR00209_COLLISION_REQUIRES_OTHER_ROUTE');
 assert(sets('comparison').every((r:Json)=>r.payload.unchanged===true),'FLOOR00209_OLD_PASSPORT_CHANGED');
 assert.equal(base.proposed.catalog_id,identity.catalogId);assert.equal(base.proposed.work_key,identity.workKey);
 assert.equal(base.proposed.group_id,identity.groupId);assert.equal(base.proposed.source_identity,identity.sourceIdentity);
 assert.equal(base.proposed.source_key,pack.sourceId);assert.equal(base.proposed.locator_key,identity.locatorKey);
 assert.equal(base.proposed.artifact_sha256,pack.source.sha256);assert.equal(base.proposed.norm_id,pack.normId);
 return base;
}

/** ROOT supplies two exact reviewed files. Neither exists by implication of the R65b read.
 * scopedRegistryCapture must come from captureMasterScopedNormativeRegistryPreimageR1,
 * in ROOT's existing owned read-only slot, with THIS config's generated source/locator.
 */
export function prepareFloorConcreteUnderlayerColumn09AppendR1(evidence:FloorConcrete00209AppendEvidenceR1):MasterSingleDefinitionSuccessorConfig {
 const read=load(intakePin),guard=load(guardPin);assertFloorConcrete00209CurrentIntakeR1(read,guard);
 const decision=load(evidence.rootDecision),capture=evidence.scopedRegistryCapture
  ?load(evidence.scopedRegistryCapture) as MasterCapturedScopedNormativeRegistryR1:null;
 assert.equal(decision.status,'ROOT_REVIEWED_FLOOR_CONCRETE00209_PARTIAL_APPEND');
 assert.equal(decision.currentIntakeSha256,intakePin.sha256);assert.deepEqual(decision.pair,expectedPair);
 assert.deepEqual(decision.identity,{catalogId:identity.catalogId,workKey:identity.workKey,groupId:identity.groupId,
  sourceIdentity:identity.sourceIdentity,locatorKey:identity.locatorKey});
 assert.equal(decision.boundedSemanticComparison,'EIGHT_CURRENT_HASHES_UNCHANGED_DIFFERENT_STANDALONE_SCOPE');
 assert.equal(decision.quantityScope,'PARTIAL');assert.equal(decision.fullTechnicalAcceptance,false);
 assert.equal(decision.machineFinancialAdmission,false);assert.equal(decision.acceptedNewCompleteTypes,0);
 if(capture){
  assert.equal(capture.contract,'master-scoped-normative-registry-preimage/r1');
  assert.equal(capture.projection,'pg-jsonb-text-utc-microseconds/r1');
  assert.equal(capture.scope.artifactSha256,pack.source.sha256);assert.equal(capture.scope.normId,pack.normId);
  assert.equal(capture.scope.sourceKey,pack.sourceId);assert.deepEqual(capture.scope.generatedLocatorKeys,[identity.locatorKey]);
 }
 const scope:FloorConcrete00209RootScopeR1={contractVersion:'floor-concrete00209-root-scope/r1',
  rootDecisionSha256:evidence.rootDecision.sha256,currentIntakeSha256:intakePin.sha256,
  parentReleaseId:expectedPair.definitionReleaseId,parentSearchReleaseId:expectedPair.searchReleaseId,
  sourceArtifactSha256:pack.source.sha256,quantityPackSha256:'d6c43122d3020d595e556f39b97a6efc9ef6ace0b900c82b5bef513144c2bffd',
  disposition:'SOURCE_SPECIFIC_PARTIAL_APPEND',quantityScope:'PARTIAL'};
 const d=floorConcrete00209AdmittedDefinitionR1(scope),id=(suffix:string)=>pack.prefix+':'+suffix;
 assert.deepEqual([d.parameters.length,d.formulas.length,d.resources.length],[32,53,53]);
 const normativeRows=d.resources.filter(r=>r.source_metadata?.sourceNormQuantityAccepted===true).map(r=>r.row_id);
 const openRows=d.resources.filter(r=>r.source_metadata?.sourceRole==='UNRESOLVED_APPLICATION_NORM').map(r=>r.row_id);
 assert.equal(normativeRows.length,10);assert.equal(openRows.length,5);
 const included=['Планировка основания, укладка, разравнивание и поверхностное уплотнение бетонного подстилающего слоя B12,5, деформационные швы и уход.',
  'На 1 м³ чистого слоя: цельный труд рабочих 1,8 чел.-ч; физическая работа вибратора 0,48 маш.-ч; бетон 1,02 м³, мастика 0,002 т, вода 0,35 м³, доски 0,001 м³.',
  'Четыре материальных баланса используют раздельные расход, пригодное наличие, резерв, кратность, заказ и остаток. Труд стадий и общий расход воды не начисляются повторно.'];
 const excluded=[...pack.exclusionsRu,'Оплата вибратора и возможного отдельного оператора не допущена; стоимость и весь состав сметы пока неполны.'];
 const completeness=floorConcreteUnderlayerCompletenessMapR1();
 // Replace only the historical misleading human-readable price promise in the independent map.
 const machineBoundary=d.resources.find(r=>r.row_id===id('open-machine-price-scope'))!.resource_graph.publicResourcePresentationV1 as Json;
 const map={...completeness,entries:completeness.entries.map(e=>
  ['surface-vibrator-own','surface-vibrator-hired','open-machine-price-scope'].some(k=>e.resolution.rowId===id(k))
   ?{...e,specification:machineBoundary.detailsRu[2]}:e)};
 return {contract:pack.contract,stopCode:'FLOOR_CONCRETE_UNDERLAYER09',applicationName:'floor-concrete-underlayer-krer11-column09',
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/GOX_BUILD_TZ_Single_Platform_Core_Sol61_2026-10-19 (2).txt',
  masterSha256:'cc24bf998bb71d71ecbe38646a20a404e4b700483c69fee769dd9e695a037bab',
  parentReleaseId:expectedPair.definitionReleaseId,parentSearchReleaseId:expectedPair.searchReleaseId,
  currentReleasePath:resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),
  outputRoot:resolve('.release-runtime/floor-concrete-underlayer00209-r65/publication'),
  sourcePaths:[packPath,factoryPath,'src/lib/estimate/v4/floorConcreteUnderlayer00209AdmittedR1.ts',
   'scripts/estimate/r4a13/prepareFloorConcreteUnderlayerColumn09AppendR1.ts',
   'scripts/estimate/r4a13/floorConcreteUnderlayerColumn09AppendR1.test.ts',
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
   'scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1.ts','scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.ts',
   'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts','src/lib/estimate/v4/automaticConstructionOwnerR1.ts',
   'src/lib/estimate/v4/effectivePurchaseBalanceR1.ts','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
   'src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1.ts',pack.source.path,
   intakePin.path,guardPin.path,sqlPin.path,evidence.rootDecision.path,...(evidence.scopedRegistryCapture?[evidence.scopedRegistryCapture.path]:[])],
  catalogId:identity.catalogId,sourceId:pack.sourceId,normId:pack.normId,...(capture?{capturedScopedNormativeRegistry:capture}:{}),
  sourceMetadata:{source_title:'КРЕР 11-2015, 11-01-002-09: бетонный подстилающий слой под полы',
   source_authority:'Министерство строительства Кыргызской Республики',source_kind:'OFFICIAL_NORM_EXACT_SINGLE_COLUMN',
   official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu,use_restriction:pack.selectionRestrictionRu},
  parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,
  shortInput:{[pack.measurement.parameterId]:'12.5'},acceptanceInput:floorConcreteUnderlayerScenarioFactsR1('12.5'),
  runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[0,0,0],benchmarkOrdinal:0,
  validationScenario:'FLOOR_CONCRETE00209_NET_M3_SIX_RATES_FOUR_BALANCES_MACHINE_PRICE_PENDING_FIVE_OPEN_NEEDS',
  passport:{canonicalRuName:pack.titleRu,workKey:identity.workKey,
   physicalResultRu:'Бетонный подстилающий слой B12,5 под полы с поверхностным виброуплотнением, швами и уходом; самостоятельный чистый объём по плану полов.',
   includedScopeRu:included,excludedScopeRu:excluded,independentCompletenessMap:map,unresolvedApplicableResourceRowIds:openRows},
  applicability:{primaryMeasureParameterId:pack.measurement.parameterId,exactNorm:pack.normId,underfloorNetVolumeRule:'KRER11_2_1',
   sourceSpecificScope:scope,quantityScope:'PARTIAL',fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0,
   machineFinancialAdmission:false,hiddenDefaultProfile:false,oldGenericRowsOrPricesImported:false},
  binding:{rowId:normativeRows[0],additionalRowIds:normativeRows.slice(1),
   applicability:{exactColumn:pack.normId,quantityBasis:'NET_M3_UNDERFLOOR_LAYER',sourceArtifactSha256:pack.source.sha256}},
  locator:{key:identity.locatorKey,payload:{kind:'EXACT_OFFICIAL_FLOOR_CONCRETE_UNDERLAYER_SOURCE',exactColumn:pack.normId,
   sourceArtifact:pack.source.path,sourceArtifactSha256:pack.source.sha256,physicalPrintedPages:[5,6,7,8,9],
   sourceNormativeBindingRowIds:normativeRows,sourceResourceRates:{worker:pack.worker,
    machine:{code:pack.machine.code,unitId:pack.machine.unitId,ratePerM3:pack.machine.ratePerM3,machineFinancialAdmission:false},materials:pack.materials},
   wholeLaborNotPartitioned:true,machineFinancialAdmission:false,fullTechnicalAcceptance:false,
   currentIntakeSha256:intakePin.sha256,rootDecisionSha256:evidence.rootDecision.sha256}},
  search:{primaryUom:'m3',canonicalNameRu:pack.titleRu,aliases:['бетонная подстилка пола B12,5','бетонная подготовка под пол поверхностным вибратором'],
   shortScopeRu:pack.selectionRestrictionRu+' Расходы и цельный труд рассчитаны по объёму; оплата вибратора и отдельные проектные услуги ещё требуют подтверждения.',
   keyDistinguishingParameters:[pack.measurement.parameterId,pack.scopeFact.id,pack.machine.fulfillmentParameterId],
   clarificationFields:d.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),
   includedBoundaries:included,excludedBoundaries:excluded,extraSearchTermsRu:'полы бетонная подстилка бетонный подстилающий слой B12,5 М150 поверхностный вибратор 11-01-002-09 м3',
   sourceProvenance:{sourcePack:packPath,...scope,noExistingGenericPricesTransferred:true,fullTechnicalAcceptance:false,machineFinancialAdmission:false}},
  catalogAppend:{requireUniqueWorkKey:true,capturedSourcePreimage:{sourceKey:pack.sourceId,expected:null},
   explicitParameterSources:floorConcrete00209ExplicitParameterSourcesR1(),
   identity:{namespace:'global',domain:'flooring',sourceIdentity:identity.sourceIdentity,workKey:identity.workKey,titleRu:pack.titleRu,denominatorEligible:true},
   searchPlacement:{groupMode:'create',groupId:identity.groupId,groupNameRu:'Подготовка полов: бетонный подстилающий слой',domainId:'flooring',systemId:'floor_underlayers',
    subsystemId:identity.groupId,assemblyId:identity.groupId,workFamilyId:identity.workKey,breadcrumb:['Полы','Подстилающие слои','Бетонный слой'],
    groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP',rootDecisionSha256:evidence.rootDecision.sha256},
    independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,globalPhysicalAbsenceProved:false,
     fullTechnicalAcceptance:false,appendedWithoutReplacingExistingIdentity:true},membershipOrdinal:0,
    elementType:'WORK',operationKind:'NEW_INSTALLATION',technologyVariant:'KRER11_01_002_09_B125_UNDERFLOOR_SURFACE_VIBRATION',constructionState:'NEW',
    normativeClassifiers:['КРЕР 11-01-002-09'],applicabilityTags:['FLOOR_UNDERLAYER','B125','SURFACE_VIBRATOR','NET_M3','PARTIAL_COMPOSITION','MACHINE_PRICE_PENDING'],
    publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true}},
  forbiddenAdjacentMatchers:[/slab-full:|monolithic-stair:|floor-underlayer:sand:|trench:|road-upper-base:/u],
  owner:'ROOT_FLOOR_CONCRETE00209_SINGLE_INTEGRATOR',receiptFileStem:'floor_concrete_underlayer_column09',
  verifyCore:async()=>{
   // Recheck exact files in the sole existing publication lifecycle, before any write.
   assert(capture&&evidence.scopedRegistryCapture,'FLOOR00209_CAPTURE_ONLY_CONFIG_CANNOT_PUBLISH');
   load(intakePin);load(guardPin);load(evidence.rootDecision);load(evidence.scopedRegistryCapture);
   assert.equal(sha(readFileSync(resolve(sqlPin.path))),sqlPin.sha256);
   assert.equal(sha(readFileSync(resolve(packPath))),scope.quantityPackSha256);
   assert.equal(sha(readFileSync(resolve(factoryPath))),'d74429276ce8ea8256049c096e0efcc89463b53fa5c8775e909e209bed3f3cb6');
   assert.equal(sha(readFileSync(resolve(pack.source.path))),pack.source.sha256);
   assert.deepEqual(d.parameters,floorConcreteUnderlayerDefinitionR1().parameters);assert.deepEqual(d.formulas,floorConcreteUnderlayerDefinitionR1().formulas);
   assert(d.parameters.every(p=>p.default_value===null));assert.deepEqual(d.runtimeInput,{});
   const compiled=await compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,catalogId:identity.catalogId,
    primaryMeasureParameterId:pack.measurement.parameterId,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],
    resourceDefinitions:[...d.resources],submittedParameters:floorConcreteUnderlayerScenarioFactsR1('12.5'),confirmedParameters:{},currencyCode:'KGS',
    priceItems:[],rowOverrides:{[id('surface-vibrator-own')]:{unitPrice:'77',provenance:{kind:'manual',reason:'VERIFICATION_FIXTURE_ONLY'}}},
    maximumResourceRows:53,hashJson:hash});
   for(const [suffix,q] of [['whole-labor','22.5'],['surface-vibrator-consumed','6'],['concrete-b125-consumed','12.75'],
    ['bitumen-latex-mastic-consumed','0.025'],['water-consumed','4.375'],['softwood-board-consumed','0.0125']])
    assert.equal(compiled.rows.find(r=>r.row_id===id(suffix))?.quantity,q,'FLOOR00209_EXACT_CONTROL:'+suffix);
   assert.equal(compiled.preliminaryNeeds.length,5);assert.equal(compiled.totals.amount,'0');
   assert.equal(compiled.rows.filter(r=>r.included_in_procurement).length,4);
   for(const suffix of ['surface-vibrator-consumed','surface-vibrator-own','surface-vibrator-hired']){
    assert.equal(canonicalMachineHourPriceRequirementV1(id(suffix),'machine_hour'),null,'FLOOR00209_NO_UNPROVEN_MACHINE_OWNER');
    const row=compiled.rows.find(r=>r.row_id===id(suffix));if(row){assert.equal(row.included_in_estimate,false);assert.equal(row.included_in_procurement,false);}
   }
   return {status:'PASS_EXACT00209_QUANTITY_CORE_PARTIAL_MACHINE_PRICE_PENDING',publicationPerformed:false,
    shape:[32,53,53],normativeBindingRows:10,unresolvedNeeds:5,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0,newMonetaryOwners:0};
  }};
}

/** Data-only capture candidate for the EXISTING captureMasterScopedNormativeRegistryPreimageR1.
 * UUID literals are this profile's publisher-derived proposed registry identities, not a UUID engine.
 * The sole publisher recomputes them and validates the capture scope before writing.
 * Its verifyCore intentionally refuses the capture-only config: no unguarded publication route.
 */
export function prepareFloorConcrete00209RegistryCaptureInputR1(rootDecision:Pin):MasterScopedNormativeRegistryInputR1 {
 const config=prepareFloorConcreteUnderlayerColumn09AppendR1({rootDecision});
 const sourceId='44702d44-e96f-52b6-a64b-307a3995c59b';
 return {config,newSource:{id:sourceId,source_key:config.sourceId,title_ru:config.sourceMetadata.source_title,
  authority:config.sourceMetadata.source_authority,official_url:config.sourceMetadata.official_url,
  artifact_sha256:config.sourceMetadata.artifact_sha256,effective_from:null,effective_to:null,
  metadata:{contract:config.contract,sourceKind:config.sourceMetadata.source_kind,useRestriction:config.sourceMetadata.use_restriction,
   universalProductivityClaimed:false,universalConsumptionClaimed:false,activationAllowed:false}},
  newLocators:[{id:'29a0e02a-64a8-50a9-90b3-bc53aebae967',source_id:sourceId,
   locator_key:config.locator.key,locator:config.locator.payload,excerpt_sha256:sha(config.sourceMetadata.exact_locator)}]};
}
