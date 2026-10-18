// Config authoring only: exact immutable full-readset proof; no pg/publisher runtime import or on-import CLI.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {compileCanonicalEstimateCore} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalMachineHourPriceRequirementV1,assertCanonicalMachineHourDefinitionV1,canonicalManualMachineHourPriceCoverageV1} from '../../../src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1';
import {floorSandUnderlayerDefinitionR1,floorSandUnderlayerPackR1 as data,floorSandUnderlayerCatalogIdR1 as catalogId} from '../../../src/lib/estimate/v4/floorSandUnderlayerKrer11Column01R1';
import proofFixture from '../../../data/estimate-benchmarks/fixtures/floor-sand-underlayer11-append-absence-r1.json';
import type {MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';

type Json=Record<string,any>;
const hash=(v:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(v)).digest('hex');
const EXPECTED_PROOF_SHA256:string='987e7d688ee6292ef30a7aa01f3f3a5f95633790a7361ff81d9dd873d2a36bd0';
const EXPECTED_PREIMAGE_SHA256:string='8f050e2fec2b9383c3b34942349a047a669adde95a87d5ee54df2283a45facfe';
const EXPECTED_SCOPE_DECISION:string='SOURCE_SPECIFIC_FLOOR_SAND_APPEND';
function need(v:unknown,code:string):asserts v{if(!v)throw Error('FLOOR_SAND_APPEND:'+code);}
export const floorSandUnderlayerAcceptanceInputR1={floor_sand_net_volume_m3:10,
 floor_sand_project_conditions:data.projectConditionsValueRu,floor_sand_accepted_base:data.acceptedBaseValueRu,floor_sand_net_volume_basis:data.netVolumeValueRu,
 floor_sand_machine_fulfillment:data.machineFulfillmentValues[1],
 floor_sand_material_specification:'VALIDATION_FIXTURE_ONLY:middle natural construction sand01-6208-0005;not supplier offer',
 floor_sand_material_stock:0,floor_sand_material_reserve:0,floor_sand_material_quantum:1,
 floor_sand_water_specification:'VALIDATION_FIXTURE_ONLY:water01-0601-0001;not actual site fact',
 floor_sand_water_stock:0,floor_sand_water_reserve:0,floor_sand_water_quantum:0.1};

/** Append is only one conditional route. Compatible existing target => prepare exact preserved successor instead. */
export function prepareFloorSandUnderlayerColumn01AppendR1(proof:Json=proofFixture):MasterSingleDefinitionSuccessorConfig {
 // This immutable proof pins every bounded snapshot set, not only the six absence counts.
 need(/^[0-9a-f]{64}$/.test(EXPECTED_PROOF_SHA256)&&/^[0-9a-f]{64}$/.test(EXPECTED_PREIMAGE_SHA256),'ACTUAL_SCOPE_PROOF_PIN_REQUIRED');
 need(data.expectedAbsenceProofStableSha256===EXPECTED_PROOF_SHA256&&data.sourcePreimageSha256===EXPECTED_PREIMAGE_SHA256,'EXACT_PACK_PROOF_BINDING_REQUIRED');
 need(hash(proof)===EXPECTED_PROOF_SHA256&&proof.sourcePreimageSha256===EXPECTED_PREIMAGE_SHA256,'EXACT_SCOPE_AND_ABSENCE_PROOF_REQUIRED');
 need(proof.scopeDecision===EXPECTED_SCOPE_DECISION&&proof.scopeDecision==='SOURCE_SPECIFIC_FLOOR_SAND_APPEND','EXPLICIT_COMPATIBILITY_DECISION_REQUIRED');
 need(proof.completeReadSet&&proof.transactionRolledBack&&proof.connectionClosed&&proof.noOwnedProcessStillRunning,'CLOSED_READ_ONLY_PROOF_REQUIRED');
 need(proof.capturedSourceHead==='1574f8ec2c5da122e9d314a70e6c3b408e2f08ea'&&proof.pair.definitionReleaseId===data.parentPair.definitionReleaseId&&proof.pair.searchReleaseId===data.parentPair.searchReleaseId,'EXACT_CAPTURED_PARENT_PAIR_REQUIRED');
 need(Object.keys(proof.allCurrentReadSets).length===26,'FULL_BOUNDED_READSET_REQUIRED');
 const absenceNames=['proposedAppendIdentityCollisions','proposedAppendCurrentMembership','proposedAppendCurrentSearch','proposedAppendGroupCollision','proposedAppendSourceKeyCollision','proposedAppendLocatorCollision'];
 need(Object.keys(proof.absenceSets).length===absenceNames.length&&absenceNames.every(k=>proof.absenceSets[k]?.rowCount===0),'APPEND_COLLISION_NO_REPLAY');
 need(hash(proof.proposedAppend)===hash(data.expectedAppend),'EXACT_PROPOSED_IDENTITY_REQUIRED');
 const workKey=data.expectedAppend.workKey,definition=floorSandUnderlayerDefinitionR1();
 const normativeRows=definition.resources.filter(r=>r.source_metadata?.sourceNormQuantityAccepted===true).map(r=>r.row_id);
 const unresolvedRows=definition.resources.filter(r=>r.row_id.startsWith(data.prefix+':open:')).map(r=>r.row_id);
 need(normativeRows.length===11&&unresolvedRows.length===5,'EXACT_NORMATIVE_AND_OPEN_SCOPE_REQUIRED');
 const included=['Планировка основания и устройство песчаного подстилающего слоя под полы с разравниванием и уплотнением по исходной схеме',
  'На1м³ чистого слоя: рабочие2.3чел.-ч; автопогрузчик5т0.08, компрессор0.22, пневмотрамбовка0.44маш.-ч; средний песок1.2м³ и вода0.15м³',
  'Два независимых материальных баланса: расход, совместимое наличие, резерв, кратность, заказ и остаток',
  'Машинисты0.30чел.-ч справочно в автопогрузчике0.08 и компрессоре0.22; у пневмотрамбовки нет дополнительной нормы машиниста; ставка33-0741 исключает рабочего2.3 и компрессор/воздух05-0005 отдельного владельца'];
 const excluded=[...data.excluded,'Назначение плотности/толщины/частоты испытаний, логистики, защиты и отходов из одного м³'];
 const completeness={contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,
  evidenceSha256:data.source.sha256,evidenceReferences:[data.source.officialPdf,'КРЕР11 стр6 §2.1; стр7 состав01–04; стр8 колонка11-01-002-01'],
  entries:[...data.resources.map(r=>{const rowId=data.prefix+':'+(r.unitId==='machine_hour'?'equipment:'+r.id:r.unitId==='m3'?'material:'+r.id+':consumed':r.id);
   return {operationId:'floor-sand-underlayer',expectedResourceId:data.normId+':'+r.id,condition:'EXACT_FLOOR_SAND_UNDERLAYER_ORIGINAL_METHOD_NET_M3',sourceId:data.sourceId,
    unitId:r.unitId,quantityRule:'NET_FLOOR_UNDERLAYER_M3_TIMES_PRINTED_RATE',formulaId:data.prefix+':formula:'+rowId.slice(data.prefix.length+1),resolution:{kind:'ROW',rowId}};}),
   ...data.includedOperations.map(op=>({operationId:'floor-sand-underlayer',expectedResourceId:'printed-operation:'+op.id,condition:'EXACT_COLUMN01_METHOD',sourceId:data.sourceId,
    formulaId:data.prefix+':formula:included:'+op.id,resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:data.prefix+':included:'+op.id,parentRowId:data.prefix+':worker'}})),
   ...data.unresolvedNeeds.map(g=>({operationId:'floor-sand-underlayer-completion',expectedResourceId:g.id,condition:'ACTUAL_SCOPE_QUANTITY_AND_SINGLE_COST_OWNER_REQUIRED',sourceId:data.sourceId,
    formulaId:data.prefix+':formula:open:'+g.id,quantityAccepted:false,resolution:{kind:'ROW',rowId:data.prefix+':open:'+g.id}}))]};
 return {contract:data.contract,stopCode:'FLOOR_SAND_UNDERLAYER01',applicationName:'floor-sand-underlayer-krer11-column01',expectedBranch:'codex/r4-a5-clean-08b18902',
  masterPath:'C:/Users/User/Downloads/MASTER_TZ_GOX_BUILD_PRODUCTION (10).md',masterSha256:'90e84fbfbf17321f1dd935f5e56a090f31619a3336e582bfabe1e66fcdfa48d7',
  parentReleaseId:proof.pair.definitionReleaseId,parentSearchReleaseId:proof.pair.searchReleaseId,
  currentReleasePath:resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),outputRoot:resolve('.release-runtime/next-wave-floor-sand-underlayer/publication'),
  sourcePaths:['scripts/estimate/r4a13/prepareFloorSandUnderlayerColumn01AppendR1.ts','src/lib/estimate/v4/floorSandUnderlayerKrer11Column01R1.ts',
   'data/estimate-benchmarks/source-packs/floor-sand-underlayer-krer11-002-01-r1.json','data/estimate-benchmarks/fixtures/floor-sand-underlayer11-append-absence-r1.json',
   'tests/estimateNorms/floorSandUnderlayerKrer11Column01R1.contract.test.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
   'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts','scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1.ts',
   'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
   'src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1.ts','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',data.source.path],
  catalogId,sourceId:data.sourceId,normId:data.normId,
  sourceMetadata:{source_title:'КРЕР11-2015,11-01-002-01: песчаный подстилающий слой под полы',source_authority:'Министерство строительства Кыргызской Республики',
   source_kind:'OFFICIAL_NORM_EXACT_SINGLE_COLUMN',official_url:data.source.officialPdf,artifact_sha256:data.source.sha256,
   exact_locator:'Стр6 §2.1, стр7 состав01–04, стр8 колонка11-01-002-01; измеритель1м³ чистого подстилающего слоя под полы',
   use_restriction:data.projectConditionsValueRu+' '+data.acceptedBaseValueRu+' '+data.netVolumeValueRu},
  parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
  shortInput:{floor_sand_net_volume_m3:10},acceptanceInput:floorSandUnderlayerAcceptanceInputR1,runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
  expectedParentShape:[0,0,0],benchmarkOrdinal:0,validationScenario:'FLOOR_SAND_COLUMN01_NET_M3_SOURCE7_ROWS_THREE_MACHINES_TWO_BALANCES_FIVE_OPEN_NEEDS',
  passport:{canonicalRuName:data.titleRu,workKey,physicalResultRu:'Отдельно измеренный песчаный подстилающий слой под полы; исходная схема планировки, укладки, разравнивания и пневматического уплотнения.',
   includedScopeRu:included,excludedScopeRu:excluded,independentCompletenessMap:completeness,unresolvedApplicableResourceRowIds:unresolvedRows},
  applicability:{primaryMeasureParameterId:data.primaryMeasureParameterId,exactNorm:'KRER11-01-002-01',underfloorNetVolumeRule:'KRER11_2_1',originalPlantAccessRequired:true,
   quantityScope:'PARTIAL',fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0,hiddenDefaultProfile:false,oldGenericRowsOrPricesImported:false,sourceScopeAbsenceProofSha256:EXPECTED_PREIMAGE_SHA256},
  binding:{rowId:normativeRows[0],additionalRowIds:normativeRows.slice(1),applicability:{exactColumn:'11-01-002-01',quantityBasis:'NET_M3_UNDERFLOOR_LAYER',sourceArtifactSha256:data.source.sha256}},
  locator:{key:data.expectedAppend.locatorKey,payload:{kind:'EXACT_OFFICIAL_FLOOR_SAND_UNDERLAYER_SOURCE',sourceArtifact:data.source.path,sourceArtifactSha256:data.source.sha256,
   physicalPrintedPages:[6,7,8],column:'11-01-002-01',sourceRows:data.resources,sourceNormativeBindingRowIds:normativeRows,
   independentScopeAbsenceProofSha256:EXPECTED_PREIMAGE_SHA256,quantityScope:'PARTIAL',fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0}},
  search:{primaryUom:'m3',canonicalNameRu:data.titleRu,aliases:['песчаный подстилающий слой под полы КРЕР11-01-002-01','устройство песчаной подготовки под пол пневматическими трамбовками'],
   shortScopeRu:'Чистый объём под полы; средний природный песок, автопогрузчик5т, компрессор и пневмотрамбовки. Проект/доступ/поставки/цены и отдельные обязанности требуют фактов.',
   keyDistinguishingParameters:[data.primaryMeasureParameterId,'floor_sand_project_conditions','floor_sand_net_volume_basis','floor_sand_accepted_base'],
   clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),includedBoundaries:included,excludedBoundaries:excluded,
   extraSearchTermsRu:'полы песчаный подстилающий слой пневматическая трамбовка чистый объём м3 КРЕР11-01-002-01',
   sourceProvenance:{sourcePack:'data/estimate-benchmarks/source-packs/floor-sand-underlayer-krer11-002-01-r1.json',sourcePreimageSha256:EXPECTED_PREIMAGE_SHA256,
    noExistingGenericRatesOrSavedPricesTransferred:true,fullTechnicalAcceptance:false}},
  catalogAppend:{requireUniqueWorkKey:true,identity:{namespace:'global',domain:'flooring',sourceIdentity:'master-work:'+workKey,workKey,titleRu:data.titleRu,denominatorEligible:true},
   searchPlacement:{groupMode:'create',groupId:data.expectedAppend.groupId,groupNameRu:'Подготовка полов: песчаный подстилающий слой',domainId:'flooring',systemId:'floor_underlayers',
    subsystemId:data.expectedAppend.groupId,assemblyId:data.expectedAppend.groupId,workFamilyId:'floor_sand_underlayer_krer11_002_01',breadcrumb:['Полы','Подстилающие слои','Песчаный слой'],
    groupOracleDisposition:{contract:data.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP',exactRateFamily:'KRER11_01_002_01_FLOOR_SAND'},membershipOrdinal:0,
    independentDisposition:{contract:data.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,appendedWithoutReplacingExistingIdentity:true,fullTechnicalAcceptance:false},
    elementType:'WORK',operationKind:'NEW_INSTALLATION',technologyVariant:'KRER11_01_002_01_SAND_UNDERFLOOR_PNEUMATIC_COMPACTION',constructionState:'NEW',normativeClassifiers:['КРЕР11-01-002-01'],
    applicabilityTags:['FLOOR_UNDERLAYER','MEDIUM_NATURAL_SAND','NET_M3','ORIGINAL_METHOD_ACCESS','PARTIAL_COMPOSITION'],
    publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true}},
  forbiddenAdjacentMatchers:[/road-upper|road-base:|gravel-base:|trench:|professional_.*_set|materials_0[1-6]/iu],owner:'NEXT_WAVE_FLOOR_SAND_SINGLE_INTEGRATOR',receiptFileStem:'floor_sand_underlayer_column01',
  verifyCore:async()=>{
   need(createHash('sha256').update(readFileSync(resolve(data.source.path))).digest('hex')===data.source.sha256,'PRIMARY_PDF_PIN_REQUIRED');
   need(definition.parameters.every(p=>p.default_value==null)&&Object.keys(definition.runtimeInput).length===0,'HIDDEN_SITE_DEFAULT_FORBIDDEN');
   for(const expected of data.machineCoverageAdmissionRequired.resourceRows){
    const requirement=canonicalMachineHourPriceRequirementV1(expected.rowId,'machine_hour'),row=definition.resources.find(r=>r.row_id===expected.rowId)!;
    const admitted=assertCanonicalMachineHourDefinitionV1({catalogId,rowId:row.row_id,unitId:row.unit_id,sourceMetadata:row.source_metadata});
    need(requirement?.resourceCode===expected.resourceCode&&requirement.operator===expected.operator&&admitted?.resourceCode===expected.resourceCode,'ROOT_EXISTING_MACHINE_COVERAGE_MAP_ADMISSION_REQUIRED');
    need(row.source_metadata?.machinePriceOperationScope===expected.operationScope
      &&canonicalManualMachineHourPriceCoverageV1({rowId:expected.rowId,unitPrice:'77',currencyCode:'KGS'}).operationScope===expected.operationScope,'ROOT_EXACT_MACHINE_OPERATION_SCOPE_REQUIRED');
   }
   const result=await compileCanonicalEstimateCore({operation:'compile',compilerVersion:data.contract,catalogId,primaryMeasureParameterId:data.primaryMeasureParameterId,
    parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],submittedParameters:floorSandUnderlayerAcceptanceInputR1,
    confirmedParameters:{},currencyCode:'KGS',priceItems:[],maximumResourceRows:definition.resources.length,hashJson:hash});
   for(const [id,q] of [['worker','23'],['operators','3'],['equipment:forklift5t','0.8'],['equipment:compressor','2.2'],['equipment:pneumaticRammer','4.4'],['material:sand:consumed','12'],['material:water:consumed','1.5']])
    need(result.rows.find(r=>r.row_id===data.prefix+':'+id)?.quantity===q,'EXACT_SOURCE_QUANTITY_REQUIRED:'+id);
   need(result.rows.find(r=>r.row_id===data.prefix+':operators')?.included_in_estimate===false,'SECOND_OPERATOR_PAYMENT_FORBIDDEN');
   need(result.preliminaryNeeds.length===5,'FIVE_SOURCE_GAPS_REQUIRED');
   return {status:'PASS_EXACT_FLOOR_SAND_COLUMN01_QUANTITY_CORE_ONLY',publicationPerformed:false,oldGenericRatesImported:false,fullTechnicalAcceptance:false,
    acceptedNewCompleteTypes:0,sourceRows:7,normativeBindingRows:11,unresolvedNeeds:5,coverageOwners:3,rammerOperationScope:'MACHINE_ONLY_WORKER_AND_COMPRESSED_AIR_SEPARATE'};
  }};
}
